"""Interpretación con búsqueda autorizada y proveedor simulado; sin SQL/escrituras."""
import unittest

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.candidates import get_provider
from api.objectives import router
from core.supabase import SupabaseGateway, get_supabase_gateway
from schemas.objectives import ObjectiveInterpretation
from services.candidate_generation import limiter
from tests.fixtures.objectives import objective_draft
from tests.fixtures.supabase_catalog import SupabaseFixture, PRIVATE_ID, FAHIDA


class FakeInterpreter:
    def __init__(self, database):
        self.database, self.requests = database, []
        self.result = {"decision": "define", "explanation": "Propuesta editable para revisar", "questions": [], "draft": objective_draft()}

    async def interpret(self, payload):
        assert any(request.url.path == "/rest/v1/capabilities" for request in self.database.requests), "Buscar catálogo antes de IA"
        self.requests.append(payload)
        return ObjectiveInterpretation(**self.result)


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

    def test_private_foreign_matches_are_filtered_and_catalog_is_not_sent_to_ai(self):
        self.database.rows[0]["owner_id"] = FAHIDA
        result = self.interpret().json()["data"]
        self.assertNotIn(PRIVATE_ID, [item["id"] for item in result["matches"]["items"]])
        request = self.provider.requests[0].model_dump()
        self.assertEqual(set(request), {"objective", "clarifications", "consent_to_provider"})
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

    def test_request_rejects_unknown_fields_and_unbounded_history(self):
        self.assertEqual(self.interpret(owner_id=FAHIDA).status_code, 422)
        self.assertEqual(self.interpret(objective="corto").status_code, 422)
        self.assertEqual(self.interpret(clarifications=[{"question": "q", "answer": "a"}] * 7).status_code, 422)
        self.assertEqual(self.provider.requests, [])
