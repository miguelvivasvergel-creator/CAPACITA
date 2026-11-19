"""B4: contratos de puertos, DAG, parámetros y pasos omitidos sin ejecución host."""
from copy import deepcopy
import json
import unittest
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.workflows import router
from api.workflows import get_workflow_repository
from api.capabilities import get_repository
from repositories.workflows import WorkflowRepository
from services.execution_engine import IMAGES, PROFILE_LIMITS, execute_job
from services.workflow_validation import compatible, compile_workflow
from tests.test_builds import manifest
from tests.test_shared_execution import result


def fixture():
    candidate = manifest()
    version_id = str(uuid4())
    versions = {version_id: {"status": "enabled", "artifact_hash": candidate.artifact_hash,
        "definition_hash": candidate.definition_hash, "profile": "gvisor-python-stdlib-v1",
        "manifest": candidate.model_dump(mode="json")}}
    spec = {"format_version": 1, "name": "Proceso de prueba", "description": "",
        "input_schema": candidate.definition.input_schema,
        "nodes": [
            {"id": "limpiar", "label": "Limpiar", "version_id": version_id, "parameters": {}, "values": {},
             "bindings": {"texto": {"source": "$input", "field": "texto"}}, "x": 300, "y": 0},
            {"id": "mayusculas", "label": "Mayúsculas", "version_id": version_id,
             "parameters": {"mayusculas": True}, "values": {},
             "bindings": {"texto": {"source": "limpiar", "field": "resultado"}}, "x": 600, "y": 0}],
        "outputs": {"final": {"source": "mayusculas", "field": "resultado"}}}
    return spec, versions


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.spec, self.versions = fixture()

    def test_topological_order_mapping_and_nondefault_parameters(self):
        definition, order = compile_workflow(self.spec, self.versions, {"texto": "  Árbol azul  "})
        self.assertEqual(order, ["limpiar", "mayusculas"])
        job = {"kind": "run", "workflow_revision": 2, "artifact_hash": "a" * 64,
               "payload": {"execution_type": "workflow", "workflow_hash": "a" * 64, "revision": 2,
                           "definition": definition.model_dump(mode="json"), "versions": self.versions,
                           "inputs": {"texto": "  Árbol azul  "}}}
        requests, progress = [], []
        def runner(payload):
            requests.append(payload)
            text = payload["inputs"]["texto"].strip()
            if payload["parameters"].get("mayusculas"):
                text = text.upper()
            # Versiones antiguas (stdlib) se ejecutan con la imagen de su propio perfil.
            return result(json.dumps({"resultado": text})) | {"image": IMAGES[payload["profile"]], "limits": PROFILE_LIMITS[payload["profile"]]}
        status, report, output = execute_job(job, runner, lambda state: progress.append(deepcopy(state)))
        self.assertEqual((status, output), ("completed", {"final": "ÁRBOL AZUL"}))
        self.assertEqual(requests[1]["inputs"], {"texto": "Árbol azul"})
        self.assertEqual(requests[1]["parameters"], {"mayusculas": True})
        self.assertEqual([step["status"] for step in report["steps"]], ["completed", "completed"])
        self.assertEqual(progress[0]["steps"][0]["status"], "running")
        self.assertEqual(set(requests[0]), {"source", "inputs", "parameters", "profile"})

    def test_cycles_duplicate_nodes_missing_steps_fields_and_bindings_rejected(self):
        for mutate in (
            lambda s: s["nodes"][0]["bindings"].update(texto={"source": "mayusculas", "field": "resultado"}),
            lambda s: s["nodes"].append(deepcopy(s["nodes"][0])),
            lambda s: s["nodes"][1]["bindings"].update(texto={"source": "missing", "field": "resultado"}),
            lambda s: s["nodes"][1]["bindings"].update(texto={"source": "limpiar", "field": "missing"}),
            lambda s: s["nodes"][1].update(bindings={}),
            lambda s: s["nodes"][0].update(values={"texto": "duplicate"}),
        ):
            raw = deepcopy(self.spec)
            mutate(raw)
            with self.assertRaises(HTTPException):
                compile_workflow(raw, self.versions)

    def test_incompatible_source_wrong_inputs_parameters_disabled_and_unknown_versions(self):
        raw = deepcopy(self.spec)
        raw["input_schema"]["properties"]["texto"] = {"type": "integer"}
        with self.assertRaises(HTTPException):
            compile_workflow(raw, self.versions)
        with self.assertRaises(HTTPException):
            compile_workflow(self.spec, self.versions, {"texto": 7})
        raw = deepcopy(self.spec)
        raw["nodes"][0]["parameters"] = {"mayusculas": "yes"}
        with self.assertRaises(HTTPException):
            compile_workflow(raw, self.versions)
        disabled = deepcopy(self.versions)
        next(iter(disabled.values()))["status"] = "disabled"
        with self.assertRaises(HTTPException) as caught:
            compile_workflow(self.spec, disabled)
        self.assertEqual(caught.exception.status_code, 409)
        with self.assertRaises(HTTPException) as caught:
            compile_workflow(self.spec, {})
        self.assertEqual(caught.exception.status_code, 404)

    def test_conservative_schema_compatibility(self):
        self.assertTrue(compatible({"type": "integer"}, {"type": "number"}))
        self.assertFalse(compatible({"type": "number"}, {"type": "integer"}))
        self.assertFalse(compatible({"type": "string"}, {"type": "string", "minLength": 3}))
        self.assertTrue(compatible({"type": "string", "maxLength": 5}, {"type": "string", "maxLength": 10}))
        self.assertFalse(compatible({"type": "string", "enum": ["x", "y"]}, {"type": "string", "enum": ["x"]}))
        self.assertFalse(compatible({"type": "array", "items": {"type": "integer"}}, {"type": "array", "items": {"type": "string"}}))
        self.assertFalse(compatible({"type": "object"}, {"type": "object", "additionalProperties": {"type": "string"}}))
        self.assertFalse(compatible({"type": "object", "properties": {"x": {"type": "number"}}, "additionalProperties": False},
                                    {"type": "object", "additionalProperties": {"type": "string"}}))

    def test_failure_stops_later_steps_and_preserves_completed_results(self):
        raw = deepcopy(self.spec)
        raw["nodes"].append({**deepcopy(raw["nodes"][1]), "id": "tercero",
                             "bindings": {"texto": {"source": "mayusculas", "field": "resultado"}}})
        job = {"kind": "run", "workflow_revision": 1, "artifact_hash": "a" * 64, "payload": {
            "execution_type": "workflow", "workflow_hash": "a" * 64, "revision": 1,
            "definition": raw, "versions": self.versions, "inputs": {"texto": " ejemplo "}}}
        calls = []
        def runner(payload):
            calls.append(payload)
            image = {"image": IMAGES[payload["profile"]], "limits": PROFILE_LIMITS[payload["profile"]]}
            return (result('{"resultado":"ejemplo"}') if len(calls) == 1 else result(exit_code=1)) | image
        status, report, output = execute_job(job, runner)
        self.assertEqual(status, "failed")
        self.assertIsNone(output)
        self.assertEqual(len(calls), 2)
        self.assertEqual([step["status"] for step in report["steps"]], ["completed", "failed", "skipped"])
        self.assertEqual(report["steps"][0]["output"], {"resultado": "ejemplo"})

    def test_auth_required_for_all_workflow_operations(self):
        app = FastAPI()
        app.include_router(router, prefix="/api")
        with TestClient(app) as client:
            for method, path in (("get", "/api/workflows"), ("get", f"/api/workflows/{uuid4()}"),
                                 ("post", "/api/workflows/validate"), ("post", "/api/workflows"),
                                 ("get", "/api/workflows/available-versions")):
                self.assertEqual(getattr(client, method)(path).status_code, 401)


class WorkflowAPITests(unittest.TestCase):
    def setUp(self):
        self.spec, self.versions = fixture()
        self.user = str(uuid4())
        self.version_id, self.version = next(iter(self.versions.items()))
        self.candidate = self.version["manifest"]
        self.row = {"id": str(uuid4()), "owner_id": self.user, "visibility": "private", "archived": False,
                    "revision": 1, "definition_hash": "a" * 64, "definition": deepcopy(self.spec)}
        fixture_ = self
        class Gateway:
            async def request(self, method, path, token, **kwargs):
                if path.endswith('execution_versions'):
                    return {"items": [{"id": fixture_.version_id, **fixture_.version,
                        "capability_id": fixture_.candidate["capability_id"], "candidate_id": fixture_.candidate["candidate_id"]}], "next_cursor": None}
                return [{"id": fixture_.candidate["candidate_id"], "capability_id": fixture_.candidate["capability_id"],
                         "owner_id": fixture_.row["owner_id"], "manifest": fixture_.candidate}]
        class Catalog:
            gateway = Gateway()
            token = "private-token"
            @property
            def user_id(self): return fixture_.user
            async def get(self, identity): return {"owner_id": fixture_.row["owner_id"]}
        class Storage:
            async def get(self, identity):
                if fixture_.user != fixture_.row["owner_id"]: raise HTTPException(404, "No encontrado")
                return fixture_.row
            async def rpc(self, name, **payload):
                if name == 'workflow_save':
                    fixture_.row['definition'] = payload['p_definition']
                return fixture_.row
        self.app=FastAPI()
        self.app.include_router(router,prefix='/api')
        self.app.dependency_overrides[get_repository]=lambda:Catalog()
        self.app.dependency_overrides[get_workflow_repository]=lambda:Storage()
        self.client=TestClient(self.app)

    def tearDown(self): self.client.close()

    def test_api_rejects_cycle_even_without_using_editor(self):
        broken=deepcopy(self.spec)
        broken['nodes'][0]['bindings']['texto']={'source':'mayusculas','field':'resultado'}
        self.assertEqual(self.client.post('/api/workflows/validate',json=broken).status_code,422)
        self.assertEqual(self.client.post('/api/workflows',json={'definition':broken}).status_code,422)
        self.assertEqual(self.client.post('/api/workflows',json={'definition':self.spec,'owner_id':'forged'}).status_code,422)
        self.assertEqual(self.client.post('/api/workflows',json={'definition':self.spec}).status_code,201)

    def test_approval_with_ai_step_requires_explicit_content_consent(self):
        from connectors import REGISTRY
        resumir = REGISTRY["resumir_texto@1"]
        self.row["definition"]["nodes"][1]["version_id"] = str(resumir.version_id)
        body = {'revision': 1, 'definition_hash': 'a' * 64, 'inputs': {'texto': 'hola'}}
        sin = self.client.post(f"/api/workflows/{self.row['id']}/approvals", json=body)
        self.assertEqual(sin.status_code, 422)
        self.assertIn("Google Gemini", sin.json()["detail"])
        # Con el «Acepto» ya no es ese rechazo (sigue la validación normal de versiones).
        con = self.client.post(f"/api/workflows/{self.row['id']}/approvals", json=body | {'content_consent': True})
        self.assertNotIn("acepta ese envío", con.text)

    def test_approval_rejects_edited_revision_invalid_inputs_and_other_owner(self):
        identity=self.row['id']
        body={'revision':1,'definition_hash':'a'*64,'inputs':{'texto':'hola'}}
        self.assertEqual(self.client.post(f'/api/workflows/{identity}/approvals',json=body|{'revision':2}).status_code,409)
        self.assertEqual(self.client.post(f'/api/workflows/{identity}/approvals',json=body|{'inputs':{'texto':7}}).status_code,422)
        self.user=str(uuid4())
        self.assertEqual(self.client.get(f'/api/workflows/{identity}').status_code,404)
        self.assertEqual(self.client.post(f'/api/workflows/{identity}/approvals',json=body).status_code,404)


class WorkflowVisibilityTests(unittest.IsolatedAsyncioTestCase):
    async def test_repository_reapplies_visible_to_even_if_gateway_ignores_owner(self):
        from types import SimpleNamespace
        mine, other = str(uuid4()), str(uuid4())
        row={'id':str(uuid4()),'owner_id':other,'visibility':'private','archived':False}
        class Gateway:
            async def request(self,*args,**kwargs):
                return {'items':[row],'next_cursor':None} if args[1].endswith('workflow_list') else row
        repository=WorkflowRepository(SimpleNamespace(gateway=Gateway(),token='private',user_id=mine))
        with self.assertRaises(HTTPException) as caught:
            await repository.get(row['id'])
        self.assertEqual(caught.exception.status_code,404)
        self.assertEqual((await repository.listing())['items'],[])
