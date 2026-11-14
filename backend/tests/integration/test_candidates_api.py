"""HTTP de candidatos con proveedores simulados; no certifica RLS remoto."""
import json
import unittest
from uuid import UUID

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.capabilities import router as catalog_router
from api.candidates import router, get_provider
from core.supabase import SupabaseGateway, get_supabase_gateway
from schemas.candidates import PythonSourceProposal
from services.candidate_generation import limiter
from services.candidate_generation import GenerationLimiter
from tests.fixtures.definitions import definition
from tests.fixtures.supabase_catalog import SupabaseFixture, MIGUEL, FAHIDA, PUBLIC_ID


class CandidateFixture(SupabaseFixture):
    def __init__(self):
        super().__init__()
        self.candidates, self.missing = [], False

    def handle(self, request):
        if request.url.path != "/rest/v1/capability_candidates":
            return super().handle(request)
        self.requests.append(request)
        if self.missing:
            return httpx.Response(404, json={"code": "PGRST205"})
        if request.method == "POST":
            row = json.loads(request.content) | {"created_at": "2026-11-14T12:00:00Z"}
            self.candidates.append(row)
            return httpx.Response(201, json=[row])
        rows = list(self.candidates)
        for key in ("id", "capability_id"):
            value = request.url.params.get(key)
            if value:
                op, target = value.split(".", 1)
                rows = [row for row in rows if (row[key] == target if op == "eq" else row[key] > target)]
        # Intencionalmente ignora filtro owner y RLS: comprobar defensa de aplicación.
        rows.sort(key=lambda row: row["id"])
        return httpx.Response(200, json=rows[:int(request.url.params.get("limit", 100))])


class FakeGenerator:
    def __init__(self):
        self.calls = 0
        self.source = "def run(inputs, parameters):\n    return {'resultado': inputs['texto'].strip()}\n"
        self.on_generate = None

    async def generate(self, definition):
        self.calls += 1
        if self.on_generate:
            self.on_generate()
        return PythonSourceProposal(source=self.source)


class CandidateAPITests(unittest.TestCase):
    def setUp(self):
        limiter.attempts.clear()
        limiter.active.clear()
        self.database, self.generator = CandidateFixture(), FakeGenerator()
        app = FastAPI()
        app.include_router(catalog_router, prefix="/api")
        app.include_router(router, prefix="/api")

        async def gateway():
            async with httpx.AsyncClient(base_url="https://fixture.invalid", transport=httpx.MockTransport(self.database.handle)) as client:
                yield SupabaseGateway(client, "test-public-key")
        app.dependency_overrides[get_supabase_gateway] = gateway
        app.dependency_overrides[get_provider] = lambda: self.generator
        self.client = TestClient(app)
        self.headers = {"Authorization": "Bearer miguel-token"}
        source = self.client.post("/api/capabilities/definitions", headers=self.headers, json={"definition": definition(), "acknowledge_similar": True})
        self.assertEqual(source.status_code, 201, source.text)
        self.source = source.json()["data"]
        self.path = f'/api/capabilities/{self.source["id"]}/candidates'
        self.payload = {"definition_hash": self.source["config"]["definition"]["definition_hash"], "acknowledge_similar": True, "consent_to_provider": True}

    def tearDown(self):
        self.client.close()
        limiter.attempts.clear()
        limiter.active.clear()

    def generate(self, **changes):
        return self.client.post(self.path, headers=self.headers, json=self.payload | changes)

    def test_review_does_not_call_ai_and_filters_private_matches(self):
        self.database.rows[0]["owner_id"] = FAHIDA
        result = self.client.post(self.path + "/check", headers=self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertNotIn(self.database.rows[0]["id"], [row["id"] for row in result.json()["data"]["matches"]["items"]])
        self.assertEqual(self.generator.calls, 0)

    def test_requires_auth_owner_consent_and_review_before_calling_ai(self):
        self.assertEqual(self.client.post(self.path, json=self.payload).status_code, 401)
        self.assertEqual(self.client.post(f"/api/capabilities/{PUBLIC_ID}/candidates", headers=self.headers, json=self.payload).status_code, 404)
        self.assertEqual(self.generate(consent_to_provider=False).status_code, 422)
        self.assertEqual(self.generate(acknowledge_similar=False).status_code, 409)
        self.assertEqual(self.generate(definition_hash="0" * 64).status_code, 409)
        self.assertEqual(self.generate(owner_id=MIGUEL).status_code, 422)
        self.assertEqual(self.generator.calls, 0)

    def test_missing_table_fails_before_consuming_ai_quota(self):
        self.database.missing = True
        self.assertEqual(self.generate().status_code, 503)
        self.assertEqual(self.generator.calls, 0)

    def test_save_and_reopen_private_candidate_without_execution(self):
        result = self.generate()
        self.assertEqual(result.status_code, 201, result.text)
        saved = result.json()["data"]
        self.assertEqual(saved["manifest"]["status"], "draft")
        self.assertFalse(saved["manifest"]["implementation_verified"])
        self.assertEqual(saved["id"], saved["manifest"]["candidate_id"])
        self.assertEqual(self.database.candidates[0]["owner_id"], MIGUEL)
        self.assertNotIn("owner_id", saved)
        fetched = self.client.get(f'/api/candidates/{saved["id"]}', headers=self.headers)
        self.assertEqual(fetched.json()["data"], saved)
        page = self.client.get(self.path, headers=self.headers).json()["data"]
        self.assertEqual(page["items"], [saved])
        self.assertIsNone(page["next_cursor"])

    def test_other_user_cannot_read_candidate_even_if_provider_ignores_rls(self):
        saved = self.generate().json()["data"]
        other = {"Authorization": "Bearer fahida-token"}
        self.assertEqual(self.client.get(f'/api/candidates/{saved["id"]}', headers=other).status_code, 404)
        self.assertEqual(self.client.get(self.path, headers=other).status_code, 404)

    def test_changed_definition_or_invalid_generated_signature_is_not_saved(self):
        self.generator.source = "def run(inputs): return {}"
        self.assertEqual(self.generate().status_code, 422)
        self.assertEqual(self.database.candidates, [])
        self.assertNotIn(MIGUEL, limiter.active)
        limiter.attempts.clear()
        self.generator.source = "def run(inputs, parameters): return {}"
        self.generator.on_generate = lambda: self.database.rows[-1].update(description="Definición modificada durante generación")
        self.assertEqual(self.generate().status_code, 409)
        self.assertEqual(self.database.candidates, [])

    def test_repeat_request_is_limited_without_second_ai_call(self):
        self.assertEqual(self.generate().status_code, 201)
        self.assertEqual(self.generate().status_code, 429)
        self.assertEqual(self.generator.calls, 1)

    def test_hourly_limit_and_inflight_guard_survive_failures_until_expiry(self):
        clock = [0]
        limits = GenerationLimiter(clock=lambda: clock[0])
        for index in range(10):
            clock[0] = index * 31
            limits.start(MIGUEL)
            with self.assertRaises(HTTPException) as error:
                limits.start(MIGUEL)
            self.assertEqual(error.exception.status_code, 429)
            limits.finish(MIGUEL)
        clock[0] += 31
        with self.assertRaises(HTTPException) as error:
            limits.start(MIGUEL)
        self.assertEqual(error.exception.status_code, 429)
        clock[0] = 4000
        limits.start(MIGUEL)
        limits.finish(MIGUEL)

    def test_candidate_list_paginates_without_repeating(self):
        self.generate()
        base = self.database.candidates[0]
        for number in (1, 2, 3):
            value = str(UUID(int=number))
            manifest = base["manifest"] | {"candidate_id": value}
            self.database.candidates.append(base | {"id": value, "manifest": manifest})
        page1 = self.client.get(self.path + "?limit=2", headers=self.headers).json()["data"]
        page2 = self.client.get(self.path + "?limit=2&cursor=" + page1["next_cursor"], headers=self.headers).json()["data"]
        self.assertFalse({row["id"] for row in page1["items"]} & {row["id"] for row in page2["items"]})
