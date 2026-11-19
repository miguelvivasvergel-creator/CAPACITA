"""Investigación web antes de diseñar: protocolo, respaldo sin bloqueo y uso en el diseño."""
import json
import unittest

import httpx

from core.config import Settings
from providers.gemini import GeminiProvider
from schemas.objectives import ObjectiveRequest, ResearchResult
from tests.fixtures.objectives import objective_draft

REQUEST = ObjectiveRequest(objective="Convierte mi Excel de ventas en un informe PDF bonito", consent_to_provider=True)


def grounded(text="1. Resumen ejecutivo\n2. Ventas por producto", finish="STOP"):
    return {"candidates": [{"finishReason": finish, "content": {"parts": [{"text": text}]}, "groundingMetadata": {
        "webSearchQueries": ["qué debe tener un reporte de ventas"],
        "groundingChunks": [
            {"web": {"uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc", "title": "smartsheet.com"}},
            {"web": {"uri": "https://vertexaisearch.cloud.google.com/grounding-api-redirect/def", "title": "smartsheet.com"}},
            {"web": {"uri": "javascript:alert(1)", "title": "malo"}},
        ],
        "searchEntryPoint": {"renderedContent": "<style>.x{}</style><div class='x'>sugerencias</div>"},
    }}]}


class ResearchTests(unittest.IsolatedAsyncioTestCase):
    def provider(self, handler, **cambios):
        async def no_wait(_):
            return None
        configuration = Settings(_env_file=None, GEMINI_API_KEY="test-only-secret", GEMINI_MODEL="gemini-3.1-flash-lite", **cambios)
        return GeminiProvider(configuration, httpx.MockTransport(handler), sleep=no_wait)

    async def test_searches_with_research_model_and_only_the_objective(self):
        def handle(request):
            payload = json.loads(request.content)
            self.assertIn("/models/gemini-2.5-flash:generateContent", request.url.path)
            self.assertEqual(payload["tools"], [{"google_search": {}}])
            self.assertEqual(payload["contents"][0]["parts"][0]["text"], REQUEST.objective)
            self.assertNotIn("responseMimeType", payload["generationConfig"])
            self.assertNotIn("test-only-secret", str(request.url))
            return httpx.Response(200, json=grounded())
        result = await self.provider(handle).research(REQUEST)
        self.assertIn("Resumen ejecutivo", result.summary)
        self.assertEqual(result.queries, ["qué debe tener un reporte de ventas"])
        # Fuentes repetidas se agrupan y los enlaces que no son https se descartan.
        self.assertEqual([source.title for source in result.sources], ["smartsheet.com"])
        self.assertIn("sugerencias", result.suggestions_html)

    async def test_never_blocks_the_design_when_search_fails(self):
        for status in (429, 404, 500, 503):
            with self.subTest(status=status):
                result = await self.provider(lambda _: httpx.Response(status, json={})).research(REQUEST)
                self.assertIsNone(result)
        self.assertIsNone(await self.provider(lambda _: httpx.Response(200, json=grounded(finish="SAFETY"))).research(REQUEST))
        self.assertIsNone(await self.provider(lambda _: httpx.Response(200, json=grounded(text="  "))).research(REQUEST))

        def caida(_):
            raise httpx.ConnectError("sin red")
        self.assertIsNone(await self.provider(caida).research(REQUEST))

    async def test_disabled_research_makes_no_request(self):
        def handle(_):
            raise AssertionError("No debía llamar a Google")
        self.assertIsNone(await self.provider(handle, RESEARCH_ENABLED=False).research(REQUEST))

    async def test_design_receives_the_checklist_as_data(self):
        research = ResearchResult(summary="1. Totales destacados", queries=[], sources=[])

        def handle(request):
            payload = json.loads(request.content)
            sent = json.loads(payload["contents"][0]["parts"][0]["text"])
            self.assertEqual(sent["quality_checklist"], "1. Totales destacados")
            self.assertNotIn("tools", payload)
            self.assertIn("/models/gemini-3.1-flash-lite:generateContent", request.url.path)
            result = {"decision": "define", "explanation": "Propuesta", "questions": [], "draft": objective_draft()}
            return httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(result)}]}}]})
        result = await self.provider(handle).interpret(REQUEST, research)
        self.assertEqual(result.decision, "define")


if __name__ == "__main__":
    unittest.main()
