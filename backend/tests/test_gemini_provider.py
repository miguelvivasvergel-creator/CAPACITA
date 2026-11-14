"""Proveedor simulado: protocolo, límites y fallos; no consume cuota real."""
import json
import unittest

import httpx
from fastapi import HTTPException

from core.config import Settings
from providers.gemini import GeminiProvider, MAX_RESPONSE_BYTES
from schemas.definitions import CapabilityDefinition
from tests.fixtures.definitions import definition
from schemas.objectives import ObjectiveRequest
from tests.fixtures.objectives import objective_draft


def response(source="def run(inputs, parameters):\n    return inputs", finish="STOP"):
    return {"candidates": [{"finishReason": finish, "content": {"parts": [{"text": json.dumps({"source": source, "dependencies": []})}]}}]}


class GeminiProviderTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.configuration = Settings(_env_file=None, GEMINI_API_KEY="test-only-secret")
        self.definition = CapabilityDefinition(**definition())

    def provider(self, handler):
        return GeminiProvider(self.configuration, httpx.MockTransport(handler))

    async def test_interpretation_sends_only_objective_and_answers(self):
        request = ObjectiveRequest(objective="Quitar espacios exteriores y conservar interiores", consent_to_provider=True)
        def handle(network_request):
            payload = json.loads(network_request.content)
            sent = json.loads(payload["contents"][0]["parts"][0]["text"])
            self.assertEqual(sent, {"objective": request.objective, "clarifications": []})
            self.assertNotIn("tools", payload)
            self.assertEqual(payload["generationConfig"]["responseMimeType"], "application/json")
            self.assertNotIn("responseJsonSchema", payload["generationConfig"])
            result = {"decision": "define", "explanation": "Propuesta para revisar", "questions": [], "draft": objective_draft()}
            return httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(result)}]}}]})
        result = await self.provider(handle).interpret(request)
        self.assertEqual(result.decision, "define")

    async def test_interpretation_rejects_inconsistent_decisions_and_unknown_code(self):
        request = ObjectiveRequest(objective="Necesito una herramienta para mis datos", consent_to_provider=True)
        for result in (
            {"decision": "define", "explanation": "Incompleto", "questions": [], "draft": None},
            {"decision": "clarify", "explanation": "Incompleto", "questions": [], "draft": None},
            {"decision": "blocked", "explanation": "Bloqueado", "questions": [], "source": "pass"},
        ):
            def handle(_):
                return httpx.Response(200, json={"candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(result)}]}}]})
            with self.subTest(result=result), self.assertRaises(HTTPException) as caught:
                await self.provider(handle).interpret(request)
            self.assertEqual(caught.exception.status_code, 502)

    async def test_json_protocol_keeps_secret_out_of_url_and_payload(self):
        def handle(request):
            self.assertEqual(request.headers["x-goog-api-key"], "test-only-secret")
            self.assertNotIn("test-only-secret", str(request.url))
            self.assertNotIn(b"test-only-secret", request.content)
            payload = json.loads(request.content)
            self.assertEqual(payload["generationConfig"]["candidateCount"], 1)
            self.assertNotIn("tools", payload)
            self.assertEqual(json.loads(payload["contents"][0]["parts"][0]["text"]), definition())
            return httpx.Response(200, json=response())
        proposal = await self.provider(handle).generate(self.definition)
        self.assertIn("def run", proposal.source)

    async def test_provider_failures_are_sanitized_and_never_sign_user_out(self):
        for status in (302, 400, 401, 403, 404, 429, 500):
            calls = []
            def handle(request):
                calls.append(request)
                return httpx.Response(status, text="test-only-secret PRIVATE BODY")
            with self.subTest(status=status), self.assertRaises(HTTPException) as caught:
                await self.provider(handle).generate(self.definition)
            self.assertEqual(caught.exception.status_code, 503)
            self.assertNotIn("test-only-secret", caught.exception.detail)
            self.assertEqual(len(calls), 1)

    async def test_malformed_blocked_truncated_and_oversized_responses_fail(self):
        for body in ({}, response(finish="MAX_TOKENS"), {"candidates": None}, response(source="")):
            with self.subTest(body=body), self.assertRaises(HTTPException) as caught:
                await self.provider(lambda _: httpx.Response(200, json=body)).generate(self.definition)
            self.assertEqual(caught.exception.status_code, 502)
        with self.assertRaises(HTTPException):
            await self.provider(lambda _: httpx.Response(200, content=b"x" * (MAX_RESPONSE_BYTES + 1))).generate(self.definition)

    async def test_timeout_does_not_leak_request_or_retry(self):
        def handle(request):
            raise httpx.ReadTimeout("test-only-secret", request=request)
        with self.assertRaises(HTTPException) as caught:
            await self.provider(handle).generate(self.definition)
        self.assertEqual(caught.exception.status_code, 503)
        self.assertNotIn("test-only-secret", caught.exception.detail)

    async def test_missing_key_and_external_resources_stop_before_network(self):
        def handle(request):
            self.fail("No debe consultar el proveedor")
        self.configuration.GEMINI_API_KEY = type(self.configuration.GEMINI_API_KEY)("")
        with self.assertRaises(HTTPException):
            await self.provider(handle).generate(self.definition)
        for field in ("required_permissions", "resources"):
            spec = definition()
            spec[field] = ["external"]
            with self.assertRaises(HTTPException) as caught:
                await self.provider(handle).generate(CapabilityDefinition(**spec))
            self.assertEqual(caught.exception.status_code, 409)
