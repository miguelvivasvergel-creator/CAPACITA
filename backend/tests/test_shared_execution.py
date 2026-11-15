"""B3: el motor usa datos nuevos, valida salida y no confía en evidencia del cliente."""
from copy import deepcopy
import json
import unittest
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
import httpx

from api.capabilities import get_repository
from api.durable_runs import router as runs_router
from api.versions import get_execution_repository, router as versions_router
from core.supabase import SupabaseGateway
from services.execution_engine import IMAGE, LIMITS, PROFILE, execute_job
from services.shared_worker import serve
from tests.test_builds import cases, manifest


def result(output='{"resultado":"nuevo"}', **changes):
    return {"runtime": "runsc", "image": IMAGE, "limits": deepcopy(LIMITS),
            "cleanup_verified": True, "termination": "exited", "exit_code": 0,
            "output": output, **changes}


def job(kind="run"):
    candidate = manifest()
    return {"id": str(uuid4()), "kind": kind, "candidate_id": str(candidate.candidate_id),
            "artifact_hash": candidate.artifact_hash,
            "payload": {"manifest": candidate.model_dump(mode="json"),
                        "inputs": {"texto": "  nuevo  "}, "parameters": {}, "profile": PROFILE,
                        "cases": [case.model_dump(mode="json") for case in cases()]}}


class EngineTests(unittest.TestCase):
    def test_new_inputs_output_retained_only_for_completed_run(self):
        requests = []
        def runner(payload):
            requests.append(payload)
            return result()
        status, report, output = execute_job(job(), runner)
        self.assertEqual((status, output), ("completed", {"resultado": "nuevo"}))
        self.assertEqual(requests[0]["inputs"], {"texto": "  nuevo  "})
        self.assertEqual(set(requests[0]), {"source", "inputs", "parameters"})
        self.assertNotIn("nuevo", json.dumps(report))

    def test_invalid_inputs_and_tampering_never_reach_runner(self):
        def forbidden(_):
            self.fail("no debe ejecutar")
        invalid = job()
        invalid["payload"]["inputs"] = {"texto": 7}
        self.assertEqual(execute_job(invalid, forbidden)[0], "failed")
        invalid = job()
        invalid["payload"]["manifest"]["proposal"]["source"] += "\n# changed"
        with self.assertRaises(HTTPException):
            execute_job(invalid, forbidden)

    def test_invalid_output_errors_and_runtime_profile_fail_closed(self):
        for response in (result('NaN'), result('{"resultado":7}'), result('secret traceback'),
                         result(termination="timeout", exit_code=137), result(oom_killed=True),
                         result(exit_code=1)):
            status, report, output = execute_job(job(), lambda _: response)
            self.assertEqual(status, "failed")
            self.assertIsNone(output)
            self.assertNotIn("secret traceback", json.dumps(report))
        for change in ({"runtime": "runc"}, {"image": "python:latest"},
                       {"cleanup_verified": False}, {"limits": {}}):
            with self.assertRaises(ValueError):
                execute_job(job(), lambda _: result(**change))

    def test_shared_build_requires_real_profile_and_keeps_no_values(self):
        status, report, output = execute_job(job("build"), lambda _: result('{"resultado":"Árbol  azul"}'))
        self.assertEqual(status, "passed")
        self.assertEqual(report["profile"], PROFILE)
        self.assertIsNone(output)
        self.assertNotIn("Árbol", json.dumps(report, ensure_ascii=False))


class ExecutionAPITests(unittest.TestCase):
    def setUp(self):
        self.job = job()
        self.manifest = self.job["payload"]["manifest"]
        self.version = {"id": str(uuid4()), "candidate_id": self.job["candidate_id"],
            "capability_id": self.manifest["capability_id"], "build_id": str(uuid4()),
            "artifact_hash": self.job["artifact_hash"], "definition_hash": self.manifest["definition_hash"],
            "status": "enabled", "profile": PROFILE, "created_at": "2026-11-15T00:00:00Z"}
        self.calls = []
        self.owner = "owner"
        fixture = self
        class Gateway:
            async def request(self, *args, **kwargs):
                return [{"id": fixture.job["candidate_id"], "capability_id": fixture.manifest["capability_id"],
                         "owner_id": "owner", "manifest": deepcopy(fixture.manifest)}]
        class Catalog:
            gateway = Gateway()
            token = "private-user-token"
            @property
            def user_id(self):
                return fixture.owner
            async def get(self, _):
                return {"owner_id": "owner"}
        class Shared:
            async def version_for_execution(self, _):
                if fixture.version["status"] != "enabled":
                    raise HTTPException(409, "disabled")
                return fixture.version
            async def rpc(self, name, **payload):
                fixture.calls.append((name, payload))
                if name == "enable":
                    return fixture.version
                return {"id": fixture.job["id"], "version_id": fixture.version["id"],
                        "artifact_hash": fixture.job["artifact_hash"], "status": "queued",
                        "created_at": "2026-11-15T00:00:00Z", "updated_at": "2026-11-15T00:00:00Z"}
        self.app = FastAPI()
        self.app.include_router(runs_router, prefix="/api")
        self.app.include_router(versions_router, prefix="/api")
        self.app.dependency_overrides[get_repository] = lambda: Catalog()
        self.app.dependency_overrides[get_execution_repository] = lambda: Shared()
        self.client = TestClient(self.app)
        self.body = {"version_id": self.version["id"], "inputs": {"texto": "  nuevo  "}, "parameters": {}}

    def tearDown(self):
        self.client.close()

    def create(self, body=None, headers=None):
        return self.client.post("/api/runs", json=body or self.body,
                                headers=headers if headers is not None else {"Idempotency-Key": "one"})

    def test_enqueue_fixed_version_without_accepting_code_or_owner(self):
        self.assertEqual(self.create().status_code, 202)
        name, payload = self.calls[-1]
        self.assertEqual(name, "enqueue")
        self.assertEqual(payload["p_request"], self.body)
        for extra in ({"owner_id": "other"}, {"source": "evil"}, {"status": "completed"}):
            self.assertEqual(self.create(self.body | extra).status_code, 422)
        self.assertEqual(self.create(headers={}).status_code, 422)

    def test_invalid_contract_disabled_version_and_other_owner_do_not_enqueue(self):
        self.assertEqual(self.create(self.body | {"inputs": {"texto": 7}}).status_code, 422)
        self.version["status"] = "disabled"
        self.assertEqual(self.create().status_code, 409)
        self.version["status"] = "enabled"
        self.owner = "other"
        self.assertEqual(self.create().status_code, 404)
        self.assertEqual(self.calls, [])

    def test_enable_never_accepts_client_report_and_passes_only_ids_to_database(self):
        body = {"candidate_id": self.version["candidate_id"], "build_id": self.version["build_id"]}
        self.assertEqual(self.client.post("/api/versions", json=body | {"passed": True}).status_code, 422)
        self.assertEqual(self.client.post("/api/versions", json=body).status_code, 201)
        self.assertEqual(self.calls[-1], ("enable", {"p_candidate_id": body["candidate_id"], "p_build_id": body["build_id"]}))

    def test_real_auth_dependency_still_required(self):
        self.app.dependency_overrides.clear()
        self.assertEqual(self.create().status_code, 401)
        self.assertEqual(self.client.get("/api/runs").status_code, 401)
        self.assertEqual(self.client.get("/api/versions").status_code, 401)


class TransportTests(unittest.IsolatedAsyncioTestCase):
    async def test_rpc_sql_errors_map_without_leaking_database_messages(self):
        for code, expected in (("P0002",404),("P0001",409),("42501",403),("53000",429)):
            async with httpx.AsyncClient(base_url="https://example.invalid", transport=httpx.MockTransport(
                    lambda _: httpx.Response(400,json={"code":code,"message":"private database values"}))) as client:
                gateway = SupabaseGateway(client,"public")
                with self.assertRaises(HTTPException) as caught:
                    await gateway.request("POST","/rest/v1/rpc/execution_get","token",json={})
                self.assertEqual(caught.exception.status_code,expected)
                self.assertNotIn("private database",str(caught.exception.detail))


class WorkerTests(unittest.IsolatedAsyncioTestCase):
    async def test_runtime_cleanup_failure_stops_worker_before_next_claim(self):
        calls = []
        class Session:
            async def rpc(self,name,**payload):
                calls.append((name,payload))
                return {"job":job()} if name=="claim" else {"ok":True}
        def runner(payload=None,recover=False):
            return {"recovery_verified":True} if recover else result(cleanup_verified=False)
        with self.assertRaises(RuntimeError):
            await serve(Session(),runner=runner)
        self.assertEqual(sum(name=="claim" for name,_ in calls),1)
        finish=next(payload for name,payload in calls if name=="finish")
        self.assertEqual(finish["p_report"],{"error":"sandbox_unavailable"})
        self.assertNotIn("release",[payload.get("p_action") for _,payload in calls])

    async def test_startup_cleanup_before_recovery_then_process_and_release(self):
        calls = []
        task = job()
        class Session:
            async def rpc(self, name, **payload):
                calls.append((name,payload))
                return {"job": task} if name=="claim" else {"ok":True}
        def runner(payload=None,recover=False):
            if recover:
                calls.append(("sandbox_recovery",{}))
                return {"recovery_verified":True}
            return result()
        await serve(Session(),once=True,runner=runner)
        names = [name for name,_ in calls]
        self.assertLess(names.index("sandbox_recovery"),names.index("recover"))
        self.assertLess(names.index("recover"),names.index("claim"))
        finish = next(payload for name,payload in calls if name=="finish")
        self.assertEqual(finish["p_status"],"completed")
        self.assertEqual(finish["p_output"],{"resultado":"nuevo"})
        self.assertEqual(calls[-1][1]["p_action"],"release")

    async def test_failed_cleanup_never_recovers_or_claims_or_releases(self):
        calls = []
        class Session:
            async def rpc(self,name,**payload):
                calls.append(name)
                return {"ok":True}
        with self.assertRaises(RuntimeError):
            await serve(Session(),once=True,runner=lambda *a,**k:{"recovery_verified":False})
        self.assertEqual(calls,["lease"])
