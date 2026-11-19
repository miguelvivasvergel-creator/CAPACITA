"""Interpretación con búsqueda autorizada y proveedor simulado; sin SQL/escrituras."""
import unittest

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.candidates import get_provider
from api.objectives import router
from core.supabase import SupabaseGateway, get_supabase_gateway
from schemas.objectives import AdjustProposal, ObjectiveInterpretation, ResearchResult
from services.objective_service import adjust_limiter, research_limiter
from services.candidate_generation import limiter
from tests.fixtures.objectives import objective_draft
from tests.fixtures.supabase_catalog import SupabaseFixture, PRIVATE_ID, FAHIDA


class FakeInterpreter:
    def __init__(self, database):
        self.database, self.requests = database, []
        self.result = {"decision": "define", "explanation": "Propuesta editable para revisar", "questions": [], "draft": objective_draft()}

    async def adjust(self, payload):
        self.requests.append(payload)
        return AdjustProposal(**self.ajuste)

    async def interpret(self, payload, research=None):
        assert any(request.url.path == "/rest/v1/capabilities" for request in self.database.requests), "Buscar catálogo antes de IA"
        self.requests.append(payload)
        self.research_used = research
        return ObjectiveInterpretation(**self.result)

    async def research(self, payload):
        self.searches = getattr(self, "searches", 0) + 1
        return ResearchResult(summary="1. Totales destacados", sources=[{"title": "ejemplo.com", "uri": "https://ejemplo.com"}])


class ObjectiveAPITests(unittest.TestCase):
    def setUp(self):
        limiter.attempts.clear()
        limiter.active.clear()
        self.database = SupabaseFixture()
        self.provider = FakeInterpreter(self.database)
        app = FastAPI()
        app.include_router(router, prefix="/api")

        async def gateway():
            async with httpx.AsyncClient(base_url="https://fixture.invalid", transport=httpx.MockTransport(self.database.handle)) as client:
                yield SupabaseGateway(client, "test-public-key")
        app.dependency_overrides[get_supabase_gateway] = gateway
        app.dependency_overrides[get_provider] = lambda: self.provider
        self.client = TestClient(app)
        self.headers = {"Authorization": "Bearer miguel-token"}
        self.payload = {"objective": "Quiero quitar espacios exteriores conservando los interiores y acentos.", "consent_to_provider": True}

    def tearDown(self):
        self.client.close()
        limiter.attempts.clear()
        limiter.active.clear()

    def interpret(self, **changes):
        return self.client.post("/api/objectives/interpret", headers=self.headers, json=self.payload | changes)

    def test_requires_auth_and_consent_before_ai(self):
        self.assertEqual(self.client.post("/api/objectives/interpret", json=self.payload).status_code, 401)
        self.assertEqual(self.interpret(consent_to_provider=False).status_code, 422)
        self.assertEqual(self.provider.requests, [])

    def test_returns_definition_without_saving_or_executing(self):
        before = len(self.database.rows)
        response = self.interpret()
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()["data"]
        self.assertEqual(result["interpretation"]["decision"], "define")
        self.assertEqual(result["definition"]["input_schema"]["required"], ["texto"])
        self.assertEqual(result["definition"]["examples"][0]["expected_output"], {"resultado": "Árbol  azul"})
        self.assertEqual(len(result["definition_hash"]), 64)
        self.assertFalse(result["implementation_verified"])
        self.assertEqual(len(self.database.rows), before)
        self.assertTrue(all(request.method == "GET" for request in self.database.requests))

    def test_installed_libraries_are_not_external_resources(self):
        self.provider.result["draft"] = objective_draft() | {
            "resources": ["Librería Pillow para manipular imágenes", "Biblioteca de procesamiento de imágenes",
                          "API externa de filtros de color"],
            "required_permissions": ["Uso de PIL", "Acceso a internet"]}
        response = self.interpret()
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()["data"]
        self.assertEqual(result["definition"]["resources"], ["API externa de filtros de color"])
        self.assertEqual(result["definition"]["required_permissions"], ["Acceso a internet"])
        self.assertEqual(result["interpretation"]["draft"]["resources"], ["API externa de filtros de color"])

    def adjust(self, **changes):
        body = {"request": "ponle solo un 30 %", "tool_name": "Filtro sepia",
                "parameter_schema": {"type": "object", "properties": {"intensidad": {"type": "number", "minimum": 0, "maximum": 100}},
                                     "required": ["intensidad"], "additionalProperties": False},
                "current": {"intensidad": 100}, "consent_to_provider": True}
        return self.client.post("/api/objectives/adjust", headers=self.headers, json=body | changes)

    def test_adjust_returns_values_valid_for_the_tool_options(self):
        adjust_limiter.attempts.clear(); adjust_limiter.active.clear()
        self.provider.ajuste = {"decision": "adjust", "explanation": "Bajé la intensidad al 30 %.", "parameters_json": '{"intensidad": 30}'}
        response = self.adjust()
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"], {"decision": "adjust", "explanation": "Bajé la intensidad al 30 %.", "parameters": {"intensidad": 30}})
        self.assertNotIn("consent_to_provider", self.provider.requests[-1].model_dump(exclude={"consent_to_provider"}))

    def test_adjust_rejects_values_outside_the_contract_and_missing_consent(self):
        adjust_limiter.attempts.clear(); adjust_limiter.active.clear()
        self.provider.ajuste = {"decision": "adjust", "explanation": "Listo.", "parameters_json": '{"intensidad": 300}'}
        self.assertEqual(self.adjust().status_code, 502)
        self.assertEqual(self.adjust(consent_to_provider=False).status_code, 422)
        archivo = {"type": "object", "properties": {"foto": {"type": "string", "contentEncoding": "base64"}}}
        self.assertEqual(self.adjust(parameter_schema=archivo).status_code, 422)

    def test_adjust_can_ask_to_improve_the_tool_without_values(self):
        adjust_limiter.attempts.clear(); adjust_limiter.active.clear()
        self.provider.ajuste = {"decision": "improve", "explanation": "Sus opciones no cambian el contraste."}
        response = self.adjust(request="súbele el contraste")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertIsNone(response.json()["data"]["parameters"])

    def test_private_foreign_matches_are_filtered_and_catalog_is_not_sent_to_ai(self):
        self.database.rows[0]["owner_id"] = FAHIDA
        result = self.interpret().json()["data"]
        self.assertNotIn(PRIVATE_ID, [item["id"] for item in result["matches"]["items"]])
        request = self.provider.requests[0].model_dump()
        # research_summary es lo investigado en Google por esta conversación, no datos del catálogo.
        self.assertEqual(set(request), {"objective", "clarifications", "consent_to_provider", "research_summary"})
        self.assertNotIn("PRIVATE", str(request))

    def test_clarification_keeps_definition_absent_and_accepts_user_answers(self):
        self.provider.result = {"decision": "clarify", "explanation": "Falta el formato", "questions": ["¿Qué datos recibe?"], "draft": None}
        response = self.interpret(clarifications=[{"question": "¿Qué datos recibe?", "answer": "Un texto"}])
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()["data"]
        self.assertIsNone(result["definition"])
        self.assertIsNone(result["definition_hash"])
        self.assertEqual(self.provider.requests[0].clarifications[0].answer, "Un texto")

    def test_blocked_request_never_invents_a_definition(self):
        self.provider.result = {"decision": "blocked", "explanation": "Se necesita un recurso no definido", "questions": [], "draft": None}
        result = self.interpret().json()["data"]
        self.assertEqual(result["interpretation"]["decision"], "blocked")
        self.assertIsNone(result["definition"])

    def test_invalid_examples_and_duplicate_fields_fail_without_writing(self):
        self.provider.result["draft"]["example_inputs_json"] = '{"texto":7}'
        self.assertEqual(self.interpret().status_code, 502)
        limiter.attempts.clear()
        self.provider.result["draft"] = objective_draft()
        self.provider.result["draft"]["inputs"] *= 2
        self.assertEqual(self.interpret().status_code, 502)
        self.assertTrue(all(request.method == "GET" for request in self.database.requests))

    def test_repeated_ai_calls_are_limited(self):
        self.assertEqual(self.interpret().status_code, 200)
        self.assertEqual(self.interpret().status_code, 429)
        self.assertEqual(len(self.provider.requests), 1)

    def test_research_first_then_design_reuses_it_without_searching_again(self):
        research_limiter.attempts.clear(); research_limiter.active.clear()
        self.assertEqual(self.client.post("/api/objectives/research", json=self.payload).status_code, 401)
        self.assertEqual(self.client.post("/api/objectives/research", headers=self.headers,
                                          json=self.payload | {"consent_to_provider": False}).status_code, 422)
        before = len(self.database.rows)
        found = self.client.post("/api/objectives/research", headers=self.headers, json=self.payload)
        self.assertEqual(found.status_code, 200, found.text)
        self.assertEqual(found.json()["data"]["summary"], "1. Totales destacados")
        self.assertEqual(len(self.database.rows), before)  # lo encontrado no se guarda
        designed = self.interpret(research_summary="1. Totales destacados")
        self.assertEqual(designed.status_code, 200, designed.text)
        self.assertEqual(self.provider.searches, 1)  # el diseño no buscó otra vez
        self.assertEqual(self.provider.research_used.summary, "1. Totales destacados")
        self.assertIsNone(designed.json()["data"]["research"])  # la tarjeta ya se mostró
        research_limiter.attempts.clear(); research_limiter.active.clear()

    def test_request_rejects_unknown_fields_and_unbounded_history(self):
        self.assertEqual(self.interpret(owner_id=FAHIDA).status_code, 422)
        self.assertEqual(self.interpret(objective="corto").status_code, 422)
        self.assertEqual(self.interpret(clarifications=[{"question": "q", "answer": "a"}] * 7).status_code, 422)
        self.assertEqual(self.provider.requests, [])
