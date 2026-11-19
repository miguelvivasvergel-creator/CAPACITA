"""Fase 5: crear asistentes recurrentes exige la misma revalidación que aprobar una solución."""
from copy import deepcopy
import unittest
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.assistants import router
from api.capabilities import get_repository
from api.workflows import get_workflow_repository
from connectors import REGISTRY
from tests.test_workflows import fixture


class AssistantAPITests(unittest.TestCase):
    def setUp(self):
        spec, versions = fixture()
        self.user = str(uuid4())
        self.version_id, self.version = next(iter(versions.items()))
        candidate = self.version["manifest"]
        self.row = {"id": str(uuid4()), "owner_id": self.user, "revision": 1, "definition_hash": "a" * 64,
                    "definition": deepcopy(spec), "archived": False}
        self.rpcs = []
        prueba = self

        class Gateway:
            async def request(self, method, path, token, **kwargs):
                if path.endswith("assistant_save"):
                    prueba.rpcs.append(kwargs["json"])
                    return {"id": "asistente", "active": True}
                if path.endswith("execution_versions"):
                    return {"items": [{"id": prueba.version_id, **prueba.version, "capability_id": candidate["capability_id"],
                                       "candidate_id": candidate["candidate_id"]}], "next_cursor": None}
                return [{"id": candidate["candidate_id"], "capability_id": candidate["capability_id"],
                         "owner_id": prueba.user, "manifest": candidate}]

        class Catalog:
            gateway = Gateway()
            token = "privado"
            user_id = self.user

            async def get(self, identity):
                return {"owner_id": prueba.user}

        class Storage:
            async def get(self, identity):
                if str(identity) != prueba.row["id"]:
                    raise HTTPException(404, "No encontrado")
                return prueba.row

        app = FastAPI()
        app.include_router(router, prefix="/api")
        app.dependency_overrides[get_repository] = lambda: Catalog()
        app.dependency_overrides[get_workflow_repository] = lambda: Storage()
        self.client = TestClient(app)
        self.body = {"workflow_id": self.row["id"], "revision": 1, "definition_hash": "a" * 64, "inputs": {"texto": "hola"},
                     "schedule": {"frequency": "weekly", "days": [1], "time": "07:00"}, "name": "Cada lunes"}

    def tearDown(self):
        self.client.close()

    def test_creates_with_exact_revision_and_schedule(self):
        respuesta = self.client.post("/api/assistants", json=self.body)
        self.assertEqual(respuesta.status_code, 201, respuesta.text)
        enviado = self.rpcs[0]
        self.assertEqual((enviado["p_revision"], enviado["p_hash"], enviado["p_inputs"]), (1, "a" * 64, {"texto": "hola"}))
        self.assertEqual(enviado["p_schedule"], {"frequency": "weekly", "days": [1], "time": "07:00", "timezone": "America/Bogota"})

    def test_rejects_bad_schedule_changed_solution_and_invalid_inputs(self):
        sin_dias = self.body | {"schedule": {"frequency": "weekly", "days": [], "time": "07:00"}}
        self.assertEqual(self.client.post("/api/assistants", json=sin_dias).status_code, 422)
        mala_hora = self.body | {"schedule": {"frequency": "daily", "time": "25:00"}}
        self.assertEqual(self.client.post("/api/assistants", json=mala_hora).status_code, 422)
        self.assertEqual(self.client.post("/api/assistants", json=self.body | {"revision": 2}).status_code, 409)
        self.assertEqual(self.client.post("/api/assistants", json=self.body | {"inputs": {"texto": 7}}).status_code, 422)
        self.assertEqual(self.rpcs, [])

    def test_ai_or_telegram_step_requires_consent(self):
        self.row["definition"]["nodes"][1]["version_id"] = str(REGISTRY["enviar_telegram@1"].version_id)
        respuesta = self.client.post("/api/assistants", json=self.body)
        self.assertEqual(respuesta.status_code, 422)
        self.assertIn("Telegram", respuesta.json()["detail"])
        self.assertEqual(self.rpcs, [])


if __name__ == "__main__":
    unittest.main()
