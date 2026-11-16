"""B6: no recuperar candidatos ajenos para publicar/ejecutar un descriptor."""
from copy import deepcopy
import unittest
from unittest.mock import patch
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from api.publications import router
from api.files import router as files_router
from core.auth import get_current_user
from api.capabilities import get_repository
from api.versions import get_execution_repository
from core.config import settings
from services.workflow_validation import compile_workflow
from tests.test_workflows import fixture


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.owner, self.user, self.cap, self.version, self.publication = [str(uuid4()) for _ in range(5)]
        schema = {'type': 'object', 'required': ['texto'], 'properties': {'texto': {'type': 'string'}}, 'additionalProperties': False}
        self.row = {'id': self.version, 'capability_id': self.cap, 'owner_id': self.owner,
                    'publication_id': self.publication, 'status': 'enabled', 'contracts': {
                        'input_schema': schema, 'parameter_schema': {'type': 'object', 'additionalProperties': False}}}
        self.calls, self.reads = [], []
        outer = self
        class Catalog:
            @property
            def user_id(self): return outer.user
            async def get(self, identity):
                outer.reads.append(str(identity))
                return {'id': outer.cap, 'owner_id': outer.owner, 'visibility': 'public'}
        class Shared:
            async def version_for_execution(self, identity): return outer.row
            async def rpc(self, name, **payload):
                outer.calls.append((name, payload))
                if name == 'publication_versions': return {'items': [outer.row], 'next_cursor': None}
                if name == 'public_enqueue': return {'id': str(uuid4()), 'version_id': outer.version,
                    'artifact_hash': 'a'*64, 'status': 'queued', 'created_at': '2026-11-16T00:00:00Z',
                    'updated_at': '2026-11-16T00:00:00Z'}
                return {'withdrawn': True}
        self.app = FastAPI(); self.app.include_router(router, prefix='/api')
        self.app.dependency_overrides[get_repository] = lambda: Catalog()
        self.app.dependency_overrides[get_execution_repository] = lambda: Shared()
        self.client = TestClient(self.app)
        self.flag = patch.object(settings, 'PUBLICATIONS_ENABLED', True); self.flag.start()

    def tearDown(self): self.client.close(); self.flag.stop()

    def test_invalid_contract_and_missing_key_never_enqueue(self):
        path = f'/api/publications/{self.publication}/runs'
        self.assertEqual(self.client.post(path, json={'inputs': {'texto': 'a'}}).status_code, 422)
        response = self.client.post(path, json={'inputs': {'texto': 7}}, headers={'Idempotency-Key': 'one'})
        self.assertEqual(response.status_code, 422)
        self.assertFalse(any(name == 'public_enqueue' for name, _ in self.calls))

    def test_public_execution_uses_descriptor_and_owner_result_queue(self):
        response = self.client.post(f'/api/publications/{self.publication}/runs', json={'inputs': {'texto': 'nuevo'}}, headers={'Idempotency-Key': 'one'})
        self.assertEqual(response.status_code, 202)
        self.assertIn(self.cap, self.reads)
        self.assertEqual(self.calls[-1], ('public_enqueue', {'p_id': self.publication, 'p_key': 'one', 'p_inputs': {'texto': 'nuevo'}, 'p_parameters': {}}))
        self.assertNotIn('source', response.text)

    def test_other_owner_cannot_publish(self):
        response = self.client.post('/api/publications', json={'version_id': self.version, 'license': 'MIT', 'consent': True})
        self.assertEqual(response.status_code, 404)
        self.assertFalse(any(name == 'publish' for name, _ in self.calls))

    def test_consent_and_license_required(self):
        self.user = self.owner
        for license_, consent in [('MIT', False), ('MIT', 1), ('invented', True)]:
            response = self.client.post('/api/publications', json={'version_id': self.version, 'license': license_, 'consent': consent})
            self.assertEqual(response.status_code, 422)

    def test_feature_disabled_fails_explicitly(self):
        with patch.object(settings, 'PUBLICATIONS_ENABLED', False):
            self.assertEqual(self.client.get('/api/publications').status_code, 503)
            self.assertEqual(self.client.get('/api/publications/availability').json()['data'], {'enabled': False})
        self.assertEqual(self.calls, [])

    def test_listing_rechecks_visible_catalog(self):
        self.assertEqual(self.client.get('/api/publications').status_code, 200)
        self.assertEqual(self.reads, [self.cap])

    def test_workflow_contract_validation_needs_no_private_source(self):
        spec, versions = fixture()
        for version in versions.values():
            manifest = version.pop('manifest')
            version.update(contract_only=True, contracts={key: manifest['definition'][key] for key in ('input_schema', 'parameter_schema', 'output_schema')})
        _, order = compile_workflow(spec, versions, {'texto': 'a'})
        self.assertEqual(order, ['limpiar', 'mayusculas'])
        bad = deepcopy(spec); bad['nodes'][0]['parameters'] = {'invalid': 1}
        with self.assertRaises(HTTPException): compile_workflow(bad, versions)

    def test_legacy_file_upload_never_claims_to_persist_discarded_content(self):
        app = FastAPI(); app.include_router(files_router, prefix='/api')
        with TestClient(app) as client:
            self.assertEqual(client.post('/api/files', files={'file': ('a.txt', b'abc')}).status_code, 401)
            app.dependency_overrides[get_current_user] = lambda: {'id': self.user}
            response = client.post('/api/files', files={'file': ('a.txt', b'abc')})
            self.assertEqual(response.status_code, 501)
            self.assertNotIn('file_id', response.text)
