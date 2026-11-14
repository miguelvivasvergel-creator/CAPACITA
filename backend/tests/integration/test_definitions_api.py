"""Definición manual y búsqueda previa con Supabase simulado; no ejecuta código."""
from copy import deepcopy
import unittest

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.capabilities import router
from core.supabase import SupabaseGateway, get_supabase_gateway
from tests.fixtures.supabase_catalog import SupabaseFixture, MIGUEL, PRIVATE_ID
from tests.fixtures.definitions import definition


class DefinitionAPITests(unittest.TestCase):
    def setUp(self):
        self.provider = SupabaseFixture()
        self.app = FastAPI()
        self.app.include_router(router, prefix="/api")

        async def gateway():
            async with httpx.AsyncClient(base_url="https://fixture.invalid", transport=httpx.MockTransport(self.provider.handle)) as client:
                yield SupabaseGateway(client, "public-test-key")

        self.app.dependency_overrides[get_supabase_gateway] = gateway
        self.client = TestClient(self.app)
        self.headers = {"Authorization": "Bearer miguel-token"}

    def tearDown(self):
        self.client.close()

    def test_check_requires_auth_and_does_not_write_or_execute(self):
        self.assertEqual(self.client.post("/api/capabilities/definitions/check", json=definition()).status_code, 401)
        response = self.client.post("/api/capabilities/definitions/check", headers=self.headers, json=definition())
        self.assertEqual(response.status_code, 200, response.text)
        result = response.json()["data"]
        self.assertEqual(result["search_kind"], "text")
        self.assertFalse(result["implementation_verified"])
        self.assertEqual(result["definition"]["parameter_schema"], definition()["parameter_schema"])
        self.assertEqual(len(result["definition_hash"]), 64)
        self.assertTrue(all(request.method == "GET" for request in self.provider.requests))
        reads = [request for request in self.provider.requests if request.url.path == "/rest/v1/capabilities"]
        self.assertIn("Limpiar", reads[-1].url.params["and"])

    def test_check_does_not_disclose_other_users_private_matches(self):
        response = self.client.post("/api/capabilities/definitions/check", headers={"Authorization": "Bearer fahida-token"}, json=definition())
        self.assertEqual(response.status_code, 200, response.text)
        self.assertNotIn(PRIVATE_ID, response.text)

    def test_invalid_contracts_or_examples_do_not_reach_catalog(self):
        invalid = []
        for schema in ({"type": "nonsense"}, {"type": "object", "$ref": "https://example.invalid/schema"}, {"type": "object", "properties": {"texto": {"type": "string", "pattern": "(a+)+$"}}}):
            invalid.append(definition() | {"input_schema": schema})
        for field, value in (("inputs", {}), ("parameters", {"mayusculas": "no"}), ("expected_output", {"resultado": 17})):
            item = definition()
            item["examples"][0][field] = value
            invalid.append(item)
        for item in invalid:
            with self.subTest(item=item):
                response = self.client.post("/api/capabilities/definitions/check", headers=self.headers, json=item)
                self.assertEqual(response.status_code, 422, response.text)
        self.assertFalse(any(request.url.path == "/rest/v1/capabilities" for request in self.provider.requests))

    def test_rechecking_changes_hash_and_bounds_complexity(self):
        first = self.client.post("/api/capabilities/definitions/check", headers=self.headers, json=definition()).json()["data"]
        changed = definition() | {"constraints": ["Otra restricción"]}
        second = self.client.post("/api/capabilities/definitions/check", headers=self.headers, json=changed).json()["data"]
        self.assertNotEqual(first["definition_hash"], second["definition_hash"])
        deep = {"type": "string"}
        for _ in range(25):
            deep = {"type": "object", "properties": {"child": deep}}
        response = self.client.post("/api/capabilities/definitions/check", headers=self.headers, json=definition() | {"input_schema": deep})
        self.assertEqual(response.status_code, 422)

    def test_save_checks_similarities_again_and_requires_acknowledgement(self):
        response = self.client.post("/api/capabilities/definitions", headers=self.headers, json={"definition": definition()})
        self.assertEqual(response.status_code, 409, response.text)
        self.assertFalse(any(request.method == "POST" for request in self.provider.requests))
        response = self.client.post("/api/capabilities/definitions", headers=self.headers, json={"definition": definition(), "acknowledge_similar": True})
        self.assertEqual(response.status_code, 201, response.text)
        posts = [request for request in self.provider.requests if request.method == "POST"]
        self.assertEqual(len(posts), 1)
        before_post = self.provider.requests.index(posts[0])
        self.assertTrue(any(request.url.path == "/rest/v1/capabilities" and request.method == "GET" for request in self.provider.requests[:before_post]))

    def test_save_persists_full_definition_privately_and_clone_preserves_it(self):
        self.provider.rows = []
        original = definition()
        response = self.client.post("/api/capabilities/definitions", headers=self.headers, json={"definition": original})
        self.assertEqual(response.status_code, 201, response.text)
        saved = response.json()["data"]
        self.assertEqual((saved["owner_id"], saved["visibility"], saved["status"], saved["adapter_key"]), (MIGUEL, "private", "draft", None))
        self.assertEqual(saved["input_schema"], original["input_schema"])
        self.assertEqual(saved["config"]["definition"]["parameter_schema"], original["parameter_schema"])
        self.assertEqual(saved["config"]["definition"]["examples"], original["examples"])
        with TestClient(self.app) as restarted:
            fetched = restarted.get(f'/api/capabilities/{saved["id"]}', headers=self.headers)
        self.assertEqual(fetched.json()["data"]["config"], saved["config"])
        self.assertEqual(self.client.get(f'/api/capabilities/{saved["id"]}', headers={"Authorization": "Bearer fahida-token"}).status_code, 404)
        cloned = self.client.post(f'/api/capabilities/{saved["id"]}/clone', headers=self.headers)
        self.assertEqual(cloned.status_code, 201, cloned.text)
        self.assertEqual(cloned.json()["data"]["config"], saved["config"])

    def test_save_revalidates_examples_and_refuses_client_owner_or_status(self):
        invalid = deepcopy(definition())
        invalid["examples"][0]["expected_output"] = {}
        for body in ({"definition": invalid}, {"definition": definition(), "owner_id": MIGUEL}, {"definition": definition() | {"status": "published"}}):
            response = self.client.post("/api/capabilities/definitions", headers=self.headers, json=body)
            self.assertEqual(response.status_code, 422, response.text)
        self.assertFalse(any(request.method == "POST" for request in self.provider.requests))
