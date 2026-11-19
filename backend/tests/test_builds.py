"""Laboratorio: integridad, privacidad, cola durable y validación del worker."""
from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.builds import router, get_build_repository
from api.capabilities import get_repository
from repositories.builds import BuildRepository
from schemas.builds import LaboratoryCase
from schemas.candidates import PythonSourceProposal
from schemas.definitions import CapabilityDefinition
from services.build_validation import validate_cases, validate_manifest
from services.build_worker import process_one, execute_build, worker_lock
from services.candidate_preparation import prepare_candidate
from tests.fixtures.definitions import definition


def manifest(source="def run(inputs, parameters):\n    return {'resultado': inputs['texto'].strip()}\n"):
    return prepare_candidate(uuid4(), CapabilityDefinition(**definition()), PythonSourceProposal(source=source))


def cases():
    return [LaboratoryCase(name="acentos e interiores", inputs={"texto": "  Árbol  azul  "},
                          parameters={}, expected_output={"resultado": "Árbol  azul"}),
            LaboratoryCase(name="sin campo", inputs={}, parameters={}, expect_rejection=True)]


class BuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.path = Path(self.temp.name) / "builds.sqlite3"
        self.storage = BuildRepository(self.path)
        self.manifest = manifest()

    def tearDown(self):
        self.temp.cleanup()

    def enqueue(self, owner="owner", key="key", digest="hash"):
        return self.storage.enqueue(owner, self.manifest, cases(), key, digest)

    def test_tampered_source_or_definition_is_rejected_without_execution(self):
        for path in ("proposal", "definition"):
            raw = self.manifest.model_dump(mode="json")
            if path == "proposal":
                raw[path]["source"] += "\nraise RuntimeError('private-secret')"
            else:
                raw[path]["constraints"].append("otra regla")
            with self.assertRaises(HTTPException) as caught:
                validate_manifest(raw)
            self.assertEqual(caught.exception.status_code, 409)

    def test_resources_and_permissions_block_initial_runtime(self):
        for field in ("resources", "required_permissions"):
            spec = definition()
            spec[field] = ["external"]
            candidate = prepare_candidate(uuid4(), CapabilityDefinition(**spec), PythonSourceProposal(source=self.manifest.proposal.source))
            with self.assertRaises(HTTPException):
                validate_manifest(candidate.model_dump(mode="json"))

    def test_case_contracts_reject_inconsistent_expectations(self):
        for case in (LaboratoryCase(name="invalid", inputs={}, parameters={}, expected_output={"resultado": "x"}),
                     LaboratoryCase(name="false rejection", inputs={"texto": "x"}, parameters={}, expect_rejection=True),
                     LaboratoryCase(name="wrong output", inputs={"texto": "x"}, parameters={}, expected_output={"resultado": 7})):
            with self.assertRaises(HTTPException):
                validate_cases(self.manifest, [case])
        validate_cases(self.manifest, cases())
        with self.assertRaises(HTTPException):
            validate_cases(self.manifest, cases()[1:])
        with self.assertRaises(HTTPException):
            validate_cases(self.manifest, cases() * 11)

    def test_idempotency_is_per_owner_and_conflicts_do_not_enqueue(self):
        first = self.enqueue()
        self.assertEqual(first["id"], self.enqueue()["id"])
        self.assertNotEqual(first["id"], self.enqueue(owner="other")["id"])
        with self.assertRaises(HTTPException) as caught:
            self.enqueue(digest="different")
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(len(self.storage.list("owner")["items"]), 1)

    def test_private_durable_reports_pagination_and_recovery(self):
        first = self.enqueue()
        self.enqueue(key="second")
        reopened = BuildRepository(self.path)
        with self.assertRaises(HTTPException) as caught:
            reopened.get("other", first["id"])
        self.assertEqual(caught.exception.status_code, 404)
        self.assertEqual(reopened.list("other"), {"items": [], "next_cursor": None})
        page = reopened.list("owner", limit=1)
        self.assertIsNotNone(page["next_cursor"])
        self.assertEqual(len(reopened.list("owner", page["next_cursor"])["items"]), 1)
        job = reopened.claim()
        reopened.recover_interrupted()
        self.assertEqual(reopened.get("owner", job["id"])["status"], "interrupted")
        self.assertNotIn("payload", reopened.get("owner", job["id"]))

    def test_queue_has_per_owner_limit_and_claims_once(self):
        for index in range(3):
            self.enqueue(key=str(index))
        with self.assertRaises(HTTPException) as caught:
            self.enqueue(key="fourth")
        self.assertEqual(caught.exception.status_code, 429)
        ids = {self.storage.claim()["id"] for _ in range(3)}
        self.assertEqual(len(ids), 3)
        self.assertIsNone(self.storage.claim())

    def test_worker_validates_actual_output_and_never_executes_invalid_input(self):
        created = self.enqueue()
        calls = []
        def runner(payload):
            calls.append(payload)
            return {"termination": "exited", "exit_code": 0, "cleanup_verified": True,
                    "output": '{"resultado":"Árbol  azul"}', "runtime": "runsc"}
        self.assertTrue(process_one(self.storage, runner))
        result = self.storage.get("owner", created["id"])
        self.assertEqual(result["status"], "passed")
        self.assertEqual(len(calls), 1)
        self.assertEqual(set(calls[0]), {"source", "inputs", "parameters"})
        self.assertFalse(result["report"]["cases"][1]["executed"])
        self.assertNotIn("Árbol", json.dumps(result))
        self.assertFalse(result["implementation_enabled"])

    def test_output_failures_never_pass_or_leak_candidate_output(self):
        self.enqueue()
        job = self.storage.claim()
        for result in (
            {"termination": "timeout", "exit_code": 137},
            {"termination": "output_limit", "exit_code": 137},
            {"termination": "exited", "exit_code": 137, "oom_killed": True},
            {"termination": "exited", "exit_code": 1, "output": "private-secret"},
            {"termination": "exited", "exit_code": 0, "output": '{"resultado":7}'},
            {"termination": "exited", "exit_code": 0, "output": '{"resultado":"wrong"}'},
            {"termination": "exited", "exit_code": 0, "output": 'NaN'},
            {"termination": "exited", "exit_code": 0, "output": '{"resultado":"Árbol  azul"}', "cleanup_verified": False},
        ):
            with self.subTest(result=result):
                status, report = execute_build(job, lambda _: {"cleanup_verified": True, **result})
                self.assertEqual(status, "failed")
                self.assertNotIn("private-secret", json.dumps(report))

    def test_failures_report_safe_repair_hints(self):
        self.enqueue()
        job = self.storage.claim()
        traceback = 'Traceback:\n  File "main.py"\nKeyError: private-secret'
        _, report = execute_build(job, lambda _: {"cleanup_verified": True, "termination": "exited",
                                                  "exit_code": 1, "output": traceback})
        self.assertEqual(report["cases"][0]["error_type"], "KeyError")
        self.assertNotIn("error_detail", report["cases"][0])
        # Un import inexistente sí trae el nombre (sin ruta) para poder corregirlo.
        importacion = "ImportError: cannot import name 'Drawing' from 'reportlab.platypus' (/usr/lib/x/__init__.py)"
        _, report = execute_build(job, lambda _: {"cleanup_verified": True, "termination": "exited",
                                                  "exit_code": 1, "output": importacion})
        self.assertEqual(report["cases"][0]["error_detail"], "cannot import name 'Drawing' from 'reportlab.platypus'")
        _, report = execute_build(job, lambda _: {"cleanup_verified": True, "termination": "exited",
                                                  "exit_code": 1, "output": "AttributeError: private-secret: 12, 3"})
        self.assertNotIn("error_detail", report["cases"][0])
        _, report = execute_build(job, lambda _: {"cleanup_verified": True, "termination": "exited",
                                                  "exit_code": 0, "output": '{"resultado":"private-secret"}'})
        self.assertEqual(report["cases"][0]["mismatched_fields"], ["resultado"])
        self.assertTrue(report["cases"][0]["schema_valid"])
        self.assertNotIn("private-secret", json.dumps(report))

    def test_worker_revalidates_persisted_hash_and_sanitizes_exceptions(self):
        created = self.enqueue()
        with self.storage.connection() as db:
            data = json.loads(db.execute("SELECT payload FROM builds").fetchone()[0])
            data["manifest"]["proposal"]["source"] += "\n# modified"
            db.execute("UPDATE builds SET payload=?", (json.dumps(data),))
        def forbidden(_):
            self.fail("Runner no debe recibir candidato con hash alterado")
        process_one(self.storage, forbidden)
        self.assertEqual(self.storage.get("owner", created["id"])["status"], "failed")

    def test_second_worker_cannot_take_lock(self):
        with worker_lock(self.path):
            with self.assertRaises(OSError):
                with worker_lock(self.path):
                    self.fail("Debe rechazar segundo trabajador")


class FileComparisonTests(unittest.TestCase):
    def test_generated_files_match_by_format_not_bytes(self):
        import base64, io, zipfile
        from services.build_worker import comparable, valid_file
        schema = {"type": "object", "properties": {
            "foto": {"type": "string", "contentEncoding": "base64", "contentMediaType": "image/png"},
            "hoja": {"type": "string", "contentEncoding": "base64",
                     "contentMediaType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
            "total": {"type": "integer"}}}
        png = base64.b64encode(bytes([0x89]) + b"PNG resto").decode()
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as archive:
            archive.writestr("xl/workbook.xml", "<x/>")
        xlsx = base64.b64encode(buffer.getvalue()).decode()
        expected = {"foto": "ARCHIVO", "hoja": "ARCHIVO", "total": 3}
        self.assertEqual(comparable({"foto": png, "hoja": xlsx, "total": 3}, expected, schema), expected)
        self.assertEqual(comparable({"foto": xlsx, "hoja": png, "total": 3}, expected, schema)["foto"], "archivo_invalido")
        self.assertFalse(valid_file("no es base64!", "image/png"))
        # Un campo sin marcador se sigue comparando exactamente.
        self.assertEqual(comparable({"foto": png}, {"foto": png}, schema), {"foto": png})


class BuildAPITests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.storage = BuildRepository(Path(self.temp.name) / "builds.sqlite3")
        self.manifest = manifest()
        self.owner = "owner"
        self.source_owner = "owner"
        self.row = {"id": str(self.manifest.candidate_id), "capability_id": str(self.manifest.capability_id),
                    "owner_id": "owner", "manifest": self.manifest.model_dump(mode="json")}
        fixture = self
        class Gateway:
            async def request(self, *args, **kwargs):
                # Ignora filtro de dueño deliberadamente: exige defensa en repositorio.
                return [deepcopy(fixture.row)]
        class Catalog:
            gateway = Gateway()
            token = "never-send-to-worker"
            @property
            def user_id(self):
                return fixture.owner
            async def get(self, identity):
                return {"owner_id": fixture.source_owner}
        self.app = FastAPI()
        self.app.include_router(router, prefix="/api")
        self.app.dependency_overrides[get_repository] = lambda: Catalog()
        self.app.dependency_overrides[get_build_repository] = lambda: self.storage
        self.client = TestClient(self.app)
        self.payload = {"candidate_id": self.row["id"], "artifact_hash": self.manifest.artifact_hash,
                        "cases": [case.model_dump(mode="json") for case in cases()]}

    def tearDown(self):
        self.client.close()
        self.temp.cleanup()

    def create(self, **changes):
        return self.client.post("/api/builds", headers={"Idempotency-Key": "request1"}, json=self.payload | changes)

    def test_create_list_detail_privacy_and_idempotency(self):
        result = self.create()
        self.assertEqual(result.status_code, 202, result.text)
        identity = result.json()["data"]["id"]
        self.assertEqual(self.create().json()["data"]["id"], identity)
        self.assertEqual(self.client.get("/api/builds").json()["data"]["items"][0]["status"], "queued")
        self.owner = "other"
        self.assertEqual(self.client.get(f"/api/builds/{identity}").status_code, 404)
        self.assertEqual(self.create().status_code, 404)
        self.assertEqual(self.client.get("/api/builds").json()["data"]["items"], [])

    def test_rejects_stale_hash_tampering_wrong_ids_missing_key_and_extra_owner(self):
        self.assertEqual(self.create(artifact_hash="0" * 64).status_code, 409)
        self.assertEqual(self.create(owner_id="forged").status_code, 422)
        self.assertEqual(self.client.post("/api/builds", json=self.payload).status_code, 422)
        self.row["manifest"]["proposal"]["source"] += "\n# changed"
        self.assertEqual(self.create().status_code, 409)
        self.row["manifest"] = self.manifest.model_dump(mode="json")
        self.row["manifest"]["candidate_id"] = str(uuid4())
        self.assertEqual(self.create().status_code, 409)

    def test_auth_is_required_with_real_dependency(self):
        del self.app.dependency_overrides[get_repository]
        for method, path in (("get", "/api/builds"), ("get", f"/api/builds/{uuid4()}"), ("post", "/api/builds")):
            response = getattr(self.client, method)(path)
            self.assertEqual(response.status_code, 401, response.text)


if __name__ == "__main__":
    unittest.main()
