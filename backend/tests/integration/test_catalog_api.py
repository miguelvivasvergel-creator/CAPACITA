"""Pruebas de integración HTTP con dos identidades y un proveedor simulado.

El transporte simulado NO certifica RLS ni persistencia del Supabase desplegado.
"""
import json
import unittest
from uuid import UUID

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.capabilities import router
from core.config import settings
from core.supabase import SupabaseGateway, get_supabase_gateway

from tests.fixtures.supabase_catalog import FAHIDA, MIGUEL, PAYLOAD, PRIVATE_ID, PUBLIC_ID, SupabaseFixture


class CatalogAPITests(unittest.TestCase):
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
        self.other = {"Authorization": "Bearer fahida-token"}

    def tearDown(self):
        self.client.close()

    def test_missing_or_malformed_token_is_401_without_provider_request(self):
        for headers in ({}, {"Authorization": "Basic bad"}, {"Authorization": "Bearer " + "x" * 8193}):
            response = self.client.get("/api/capabilities", headers=headers)
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.headers["www-authenticate"], "Bearer")
        self.assertEqual(self.provider.requests, [])

    def test_forged_or_expired_token_rejected_by_auth(self):
        response = self.client.get("/api/capabilities", headers={"Authorization": "Bearer forged"})
        self.assertEqual(response.status_code, 401)
        self.assertEqual(len(self.provider.requests), 1)
        self.assertEqual(self.provider.requests[0].url.path, "/auth/v1/user")

    def test_private_detail_is_404_for_other_account(self):
        response = self.client.get(f"/api/capabilities/{PRIVATE_ID}", headers=self.other)
        self.assertEqual(response.status_code, 404)
        self.assertNotIn("Limpiar", response.text)

    def test_list_and_similarity_do_not_leak_private_rows(self):
        for path in ("/api/capabilities", "/api/capabilities?scope=community", "/api/capabilities/similar?name=Limpiar"):
            response = self.client.get(path, headers=self.other)
            self.assertEqual(response.status_code, 200)
            self.assertNotIn(PRIVATE_ID, response.text)
            self.assertIn("next_cursor", response.json()["data"])
        reads = [request for request in self.provider.requests if request.url.path == "/rest/v1/capabilities"]
        self.assertTrue(all(request.url.params["or"] == f"(visibility.eq.public,owner_id.eq.{FAHIDA})" for request in reads))

    def test_every_request_preserves_user_token_and_public_key(self):
        self.client.get("/api/capabilities", headers=self.headers)
        for request in self.provider.requests:
            self.assertEqual(request.headers["authorization"], "Bearer miguel-token")
            self.assertEqual(request.headers["apikey"], "public-test-key")

    def test_auth_reads_deployed_profile_fields(self):
        from core.auth import get_current_user
        self.app.add_api_route("/identity", get_current_user)
        response = self.client.get("/identity", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["display_name"], "Nombre real")
        self.assertEqual(response.json()["bio"], "Biografía real")

    def test_catalog_joins_deployed_profiles_table(self):
        response = self.client.get("/api/capabilities", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        request = self.provider.requests[-1]
        self.assertIn("owner:profiles!capabilities_owner_id_fkey(username)", request.url.params["select"])

    def test_community_accepts_legacy_null_category(self):
        self.provider.rows[1]["category"] = None
        self.provider.rows[1]["status"] = "published"
        response = self.client.get("/api/capabilities?scope=community", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["items"][0]["category"], "Sin categoría")
        self.assertIsNone(self.provider.rows[1]["category"])

    def test_create_uses_authenticated_owner_and_full_uuid(self):
        response = self.client.post("/api/capabilities", headers=self.headers, json=PAYLOAD)
        self.assertEqual(response.status_code, 201, response.text)
        created = response.json()["data"]
        self.assertEqual(created["owner_id"], MIGUEL)
        self.assertEqual(str(UUID(created["id"])), created["id"])
        self.assertEqual(created["status"], "draft")
        # Una nueva instancia del cliente lee el proveedor, no memoria del router.
        with TestClient(self.app) as restarted:
            fetched = restarted.get(f'/api/capabilities/{created["id"]}', headers=self.headers)
        self.assertEqual(fetched.status_code, 200)
        self.assertEqual(fetched.json()["data"]["name"], PAYLOAD["name"])

    def test_cannot_spoof_owner_or_counters(self):
        for extra in ({"owner_id": FAHIDA}, {"uses_count": 999}, {"id": PUBLIC_ID}):
            response = self.client.post("/api/capabilities", headers=self.headers, json=PAYLOAD | extra)
            self.assertEqual(response.status_code, 422)

    def test_publishing_without_verified_implementation_rejected(self):
        response = self.client.post("/api/capabilities", headers=self.headers, json=PAYLOAD | {"status": "published"})
        self.assertEqual(response.status_code, 409)
        self.assertFalse(any(request.method == "POST" for request in self.provider.requests))

    def test_other_account_cannot_edit_delete_or_clone_private(self):
        for method, suffix, body in (("PUT", "", {"name": "Nuevo nombre"}), ("DELETE", "", None), ("POST", "/clone", None)):
            response = self.client.request(method, f"/api/capabilities/{PRIVATE_ID}{suffix}", headers=self.other, json=body)
            self.assertEqual(response.status_code, 404)
        self.assertFalse(any(request.method != "GET" for request in self.provider.requests))

    def test_public_foreign_capability_cannot_be_modified(self):
        for method in ("PUT", "DELETE"):
            response = self.client.request(method, f"/api/capabilities/{PUBLIC_ID}", headers=self.headers, json={"name": "Otro nombre"} if method == "PUT" else None)
            self.assertEqual(response.status_code, 404)

    def test_clone_is_private_draft_with_provenance(self):
        response = self.client.post(f"/api/capabilities/{PUBLIC_ID}/clone", headers=self.headers)
        self.assertEqual(response.status_code, 201, response.text)
        clone = response.json()["data"]
        self.assertEqual((clone["owner_id"], clone["visibility"], clone["status"], clone["cloned_from"]), (MIGUEL, "private", "draft", PUBLIC_ID))

    def test_clone_preserves_source_contracts_without_modifying_source(self):
        source = self.provider.rows[1]
        source["input_schema"] = {"type": "object", "properties": {"texto": {"type": "string"}}, "required": ["texto"]}
        source["output_schema"] = {"type": "object", "properties": {"resumen": {"type": "string"}}, "required": ["resumen"]}
        before = json.loads(json.dumps(source))
        response = self.client.post(f"/api/capabilities/{PUBLIC_ID}/clone", headers=self.headers)
        self.assertEqual(response.status_code, 201, response.text)
        clone = response.json()["data"]
        persisted = next(row for row in self.provider.rows if row["id"] == clone["id"])
        for field in ("input_schema", "output_schema"):
            self.assertEqual(clone[field], before[field])
            self.assertEqual(persisted[field], before[field])
        self.assertEqual(source, before)
        self.assertEqual((clone["visibility"], clone["status"]), ("private", "draft"))
        foreign = self.client.get(f'/api/capabilities/{clone["id"]}', headers=self.other)
        self.assertEqual(foreign.status_code, 404)
        self.assertNotIn("resumen", foreign.text)

    def test_create_roundtrips_contracts_and_rejects_nonobject_contracts(self):
        contracts = {"input_schema": {"type": "string"}, "output_schema": {"type": "array", "items": {"type": "string"}}}
        response = self.client.post("/api/capabilities", headers=self.headers, json=PAYLOAD | contracts)
        self.assertEqual(response.status_code, 201, response.text)
        created = response.json()["data"]
        fetched = self.client.get(f'/api/capabilities/{created["id"]}', headers=self.headers)
        for field, schema in contracts.items():
            self.assertEqual(fetched.json()["data"][field], schema)
            for invalid in (None, [], "invalid"):
                rejected = self.client.post("/api/capabilities", headers=self.headers, json=PAYLOAD | {field: invalid})
                self.assertEqual(rejected.status_code, 422)

    def test_owner_updates_then_deletes_own_capability(self):
        response = self.client.put(f"/api/capabilities/{PRIVATE_ID}", headers=self.headers, json={"name": "Datos limpios"})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["data"]["name"], "Datos limpios")
        self.assertEqual(self.client.delete(f"/api/capabilities/{PRIVATE_ID}", headers=self.headers).status_code, 200)
        self.assertEqual(self.client.get(f"/api/capabilities/{PRIVATE_ID}", headers=self.headers).status_code, 404)

    def test_invalid_input_returns_422_instead_of_database_error(self):
        for payload in ({"name": None}, {"config": None}, {"description": "   "}, {"category": "x" * 51}, {}):
            response = self.client.put(f"/api/capabilities/{PRIVATE_ID}", headers=self.headers, json=payload)
            self.assertEqual(response.status_code, 422)
        for query in ("scope=unknown", "limit=0", "limit=101", "cursor=bad", "type=bad"):
            self.assertEqual(self.client.get("/api/capabilities?" + query, headers=self.headers).status_code, 422)

    def test_keyset_pagination_does_not_repeat_rows(self):
        first = self.client.get("/api/capabilities?limit=1", headers=self.headers).json()["data"]
        self.assertEqual(first["next_cursor"], PRIVATE_ID)
        second = self.client.get(f'/api/capabilities?limit=1&cursor={first["next_cursor"]}', headers=self.headers).json()["data"]
        self.assertEqual([item["id"] for item in second["items"]], [PUBLIC_ID])
        self.assertIsNone(second["next_cursor"])

    def test_upstream_errors_are_sanitized(self):
        self.provider.fail = 500
        response = self.client.get("/api/capabilities", headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("PRIVATE SQL SECRET", response.text)

    def test_upstream_timeout_returns_503_without_token_leak(self):
        def timeout(request):
            raise httpx.ReadTimeout("miguel-token PRIVATE", request=request)
        self.provider.handle = timeout
        response = self.client.get("/api/capabilities", headers=self.headers)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("miguel-token", response.text)

    def test_upstream_redirect_is_not_followed(self):
        self.provider.handle = lambda request: httpx.Response(302, headers={"Location": "https://untrusted.invalid"})
        response = self.client.get("/api/capabilities", headers=self.headers)
        self.assertEqual(response.status_code, 503)

    def test_unexpected_upstream_shape_returns_503(self):
        self.provider.handle = lambda request: httpx.Response(200, json=[])
        response = self.client.get("/api/capabilities", headers=self.headers)
        self.assertEqual(response.status_code, 503)

    def test_query_punctuation_stays_inside_quoted_filter(self):
        self.client.get("/api/capabilities", params={"q": 'hola\",owner_id.neq.x', "type": "texto"}, headers=self.headers)
        request = self.provider.requests[-1]
        self.assertEqual(request.url.params["or"], f"(visibility.eq.public,owner_id.eq.{MIGUEL})")
        self.assertIn('hola\\\",owner\\_id.neq.x', request.url.params["and"])

    def test_unconfigured_backend_fails_closed(self):
        self.app.dependency_overrides.clear()
        previous = (settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
        settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY = "", ""
        try:
            response = self.client.get("/api/capabilities", headers=self.headers)
            self.assertEqual(response.status_code, 503)
            self.assertEqual(self.client.get("/api/capabilities").status_code, 401)
        finally:
            settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY = previous


if __name__ == "__main__":
    unittest.main()
