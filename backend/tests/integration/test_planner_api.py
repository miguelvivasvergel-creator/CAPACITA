"""Identidades y repositorios reales con transporte simulado; no certifica RLS remoto."""
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock
from uuid import UUID, uuid4

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.candidates import get_provider
from api.planner import router
from core.supabase import SupabaseGateway, get_supabase_gateway
from tests.fixtures.supabase_catalog import FAHIDA, MIGUEL, PRIVATE_ID, SupabaseFixture
from tests.test_builds import manifest


class PlannerAPITests(unittest.TestCase):
    def setUp(self):
        self.database = SupabaseFixture()
        self.candidate = manifest().model_copy(update={'capability_id': UUID(PRIVATE_ID)})
        self.version = {'id': str(uuid4()), 'status': 'enabled', 'capability_id': PRIVATE_ID,
                        'candidate_id': str(self.candidate.candidate_id),
                        'artifact_hash': self.candidate.artifact_hash,
                        'definition_hash': self.candidate.definition_hash}
        self.model = SimpleNamespace(plan=AsyncMock(return_value={
            'decision': 'blocked', 'explanation': 'Recurso no disponible en esta fixture'}))

        def handle(request):
            if request.url.path == '/rest/v1/rpc/execution_versions':
                self.database.requests.append(request)
                # Deliberadamente devuelve una versión ajena: el catálogo debe filtrarla.
                return httpx.Response(200, json={'items': [self.version], 'next_cursor': None})
            if request.url.path == '/rest/v1/capability_candidates':
                self.database.requests.append(request)
                return httpx.Response(200, json=[{'id': str(self.candidate.candidate_id),
                    'capability_id': PRIVATE_ID, 'owner_id': MIGUEL,
                    'manifest': self.candidate.model_dump(mode='json')}])
            return self.database.handle(request)

        async def gateway():
            async with httpx.AsyncClient(base_url='https://fixture.invalid',
                                         transport=httpx.MockTransport(handle)) as client:
                yield SupabaseGateway(client, 'public-test-key')

        app = FastAPI()
        app.include_router(router, prefix='/api')
        app.dependency_overrides[get_supabase_gateway] = gateway
        app.dependency_overrides[get_provider] = lambda: self.model
        self.client = TestClient(app)
        self.owner = {'Authorization': 'Bearer miguel-token'}
        self.other = {'Authorization': 'Bearer fahida-token'}
        self.objective = {'objective': 'Normalizar espacios de texto'}

    def tearDown(self):
        self.client.close()

    def options(self, headers):
        return self.client.post('/api/planner/options', headers=headers, json=self.objective)

    def test_own_options_are_sanitized_and_foreign_options_remain_hidden(self):
        own = self.options(self.owner)
        self.assertEqual(own.status_code, 200, own.text)
        row = own.json()['data']['items'][0]
        self.assertEqual(row['id'], self.version['id'])
        self.assertEqual(len(row['review_hash']), 64)
        self.assertNotIn('proposal', row)
        self.assertNotIn('source', row)
        foreign = self.options(self.other)
        self.assertEqual(foreign.status_code, 200, foreign.text)
        self.assertEqual(foreign.json()['data']['items'], [])
        self.assertNotIn(PRIVATE_ID, foreign.text)
        reads = [r for r in self.database.requests if r.url.path == '/rest/v1/capabilities']
        for request in reads:
            identity = MIGUEL if request.headers['authorization'] == 'Bearer miguel-token' else FAHIDA
            self.assertEqual(request.url.params['or'], f'(visibility.eq.public,owner_id.eq.{identity})')

    def test_another_identity_cannot_reuse_the_owners_review_hash(self):
        row = self.options(self.owner).json()['data']['items'][0]
        response = self.client.post('/api/planner/propose', headers=self.other,
            json=self.objective | {'version_ids': [row['id']], 'version_hashes': {row['id']: row['review_hash']},
                                   'consent_to_provider': True})
        self.assertEqual(response.status_code, 409, response.text)
        self.model.plan.assert_not_awaited()
        self.assertNotIn(self.candidate.definition.name, response.text)

    def test_repeated_selection_and_missing_review_are_rejected_before_model(self):
        for extra in [
            {'version_ids': [self.version['id']], 'version_hashes': {}},
            {'version_ids': [self.version['id']] * 2, 'version_hashes': {self.version['id']: 'a' * 64}},
        ]:
            response = self.client.post('/api/planner/propose', headers=self.owner,
                json=self.objective | extra | {'consent_to_provider': True})
            self.assertEqual(response.status_code, 422)
        self.model.plan.assert_not_awaited()
