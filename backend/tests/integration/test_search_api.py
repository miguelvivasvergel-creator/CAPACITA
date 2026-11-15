"""La búsqueda real se unifica en FastAPI, con sesión obligatoria."""
import unittest
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import UUID
import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from api.router import api_router
from api.search import get_encoder
from core.supabase import SupabaseGateway, get_supabase_gateway
from repositories.embedding_cache import EmbeddingCache
from tests.fixtures.supabase_catalog import SupabaseFixture, MIGUEL, FAHIDA, PRIVATE_ID, PUBLIC_ID, record


class EncoderFixture:
    dimension = 3
    model_id = 'test-model-v1'
    enabled = True

    def __init__(self):
        self.seen = []

    def available(self):
        return self.enabled

    def encode(self, texts, query=False):
        self.seen.extend((query, value) for value in texts)
        return [[1., 0., 0.] for _ in texts]


class SearchFixture(SupabaseFixture):
    revoke = False
    profiles = None

    def handle(self, request):
        if request.url.path == '/rest/v1/profiles' and self.profiles is not None:
            self.requests.append(request)
            rows = sorted(self.profiles, key=lambda row: row['id'])
            if request.url.params.get('id'):
                op, value = request.url.params['id'].split('.', 1)
                rows = [row for row in rows if row['id'] == value] if op == 'eq' else [row for row in rows if row['id'] > value]
            return httpx.Response(200, json=rows[:int(request.url.params.get('limit', '100'))])
        if request.url.path == '/rest/v1/capabilities' and request.url.params.get('id', '').startswith('in.'):
            self.requests.append(request)
            if self.revoke:
                self.rows = [{**row, 'visibility': 'private'} if row['id'] == PUBLIC_ID else row for row in self.rows]
            identities = request.url.params['id'][4:-1].split(',')
            return httpx.Response(200, json=[row for row in self.rows if row['id'] in identities])
        return super().handle(request)


class SearchAPITests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.cache = EmbeddingCache(Path(self.temp.name) / 'cache.sqlite3')
        self.provider = SearchFixture()
        self.encoder = EncoderFixture()
        self.provider.rows[0]['description'] = 'PRIVATE-OWNER: limpiar espacios de texto'
        self.app = FastAPI()
        self.app.include_router(api_router, prefix='/api')
        async def gateway():
            async with httpx.AsyncClient(base_url='https://fixture.invalid', transport=httpx.MockTransport(self.provider.handle)) as client:
                yield SupabaseGateway(client, 'public-key')
        self.app.dependency_overrides[get_supabase_gateway] = gateway
        self.app.dependency_overrides[get_encoder] = lambda: self.encoder
        self.cache_patch = patch('services.search_service.EmbeddingCache', return_value=self.cache)
        self.cache_patch.start()
        self.client = TestClient(self.app)
        self.headers = {'Authorization': 'Bearer miguel-token'}

    def tearDown(self):
        self.client.close()
        self.cache_patch.stop()
        self.temp.cleanup()

    def search(self, **changes):
        return self.client.post('/api/search', headers=self.headers, json={'query': 'Limpiar', **changes})

    def test_text_search_uses_visibility_and_preserves_user_token(self):
        self.headers = {'Authorization': 'Bearer fahida-token'}
        result = self.search()
        self.assertEqual(result.status_code, 200, result.text)
        data = result.json()['data']
        self.assertNotIn(PRIVATE_ID, result.text)
        self.assertEqual(data['capabilities']['items'][0]['id'], PUBLIC_ID)
        self.assertFalse(data['workflow_search_available'])
        reads = [request for request in self.provider.requests if request.url.path == '/rest/v1/capabilities']
        self.assertTrue(all('or' in request.url.params for request in reads))
        self.assertTrue(all(request.headers['authorization'] == 'Bearer fahida-token' for request in reads))
        self.assertEqual(self.encoder.seen, [])

    def test_semantic_never_embeds_private_foreign_rows(self):
        self.headers = {'Authorization': 'Bearer fahida-token'}
        result = self.search(mode='semantic')
        self.assertEqual(result.status_code, 200, result.text)
        self.assertNotIn(PRIVATE_ID, result.text)
        self.assertFalse(any('PRIVATE-OWNER' in value for _, value in self.encoder.seen))
        self.assertEqual(result.json()['data']['semantic_scanned'], 1)

    def test_semantic_cache_is_content_model_and_owner_scoped(self):
        self.assertEqual(self.search(mode='semantic').status_code, 200)
        self.encoder.seen.clear()
        self.assertEqual(self.search(mode='semantic').status_code, 200)
        self.assertTrue(all(query for query, _ in self.encoder.seen))
        self.provider.rows[0]['description'] += ' cambio'
        self.encoder.seen.clear()
        self.assertEqual(self.search(mode='semantic').status_code, 200)
        self.assertEqual(sum(not query for query, _ in self.encoder.seen), 1)
        self.assertIsNone(self.cache.get(FAHIDA, PRIVATE_ID, self.encoder.model_id, 'any-hash'))

    def test_semantic_cursor_paginates_and_rejects_changed_query(self):
        first = self.search(mode='semantic', limit=1).json()['data']['capabilities']
        second = self.search(mode='semantic', limit=1, capabilities_cursor=first['next_cursor'])
        self.assertEqual(second.status_code, 200, second.text)
        self.assertNotEqual(first['items'][0]['id'], second.json()['data']['capabilities']['items'][0]['id'])
        self.assertEqual(self.search(query='otra', mode='semantic', capabilities_cursor=first['next_cursor']).status_code, 409)

    def test_revocation_during_inference_returns_conflict(self):
        self.provider.revoke = True
        self.assertEqual(self.search(mode='semantic').status_code, 409)

    def test_semantic_unavailable_does_not_silently_use_text(self):
        self.encoder.enabled = False
        result = self.search(mode='semantic')
        self.assertEqual(result.status_code, 503)
        self.assertIn('textual', result.json()['detail'])
        self.assertEqual(self.search().status_code, 200)

    def test_profiles_project_only_public_fields_and_cursor(self):
        result = self.search(query='miguel', kind='profiles')
        self.assertEqual(result.status_code, 200, result.text)
        data = result.json()['data']
        self.assertEqual(data['capabilities']['items'], [])
        self.assertEqual(data['profiles']['items'][0]['username'], 'miguel')
        self.assertNotIn('email', data['profiles']['items'][0])
        self.assertIsNone(data['profiles']['items'][0]['stats']['runs'])

    def test_text_cursor_and_scopes(self):
        first = self.search(limit=1).json()['data']['capabilities']
        result = self.search(limit=1, capabilities_cursor=first['next_cursor'])
        self.assertEqual(result.status_code, 200)
        self.assertNotEqual(first['items'][0]['id'], result.json()['data']['capabilities']['items'][0]['id'])
        own = self.search(scope='mine').json()['data']['capabilities']['items']
        self.assertTrue(all(row['owner_id'] == MIGUEL for row in own))
        other = self.search(scope='community').json()['data']['capabilities']['items']
        self.assertTrue(all(row['owner_id'] != MIGUEL and row['visibility'] == 'public' for row in other))

    def test_invalid_payloads_and_cursors_are_rejected(self):
        for change in ({'query': ' '}, {'query': 'x' * 201}, {'limit': 51}, {'owner_id': FAHIDA}, {'kind': 'workflows'}, {'capabilities_cursor': 'bad'}, {'mode': 'semantic', 'capabilities_cursor': 's.not-json'}):
            with self.subTest(change=change):
                self.assertEqual(self.search(**change).status_code, 422)

    def test_semantic_pool_is_bounded_and_reports_truncation(self):
        self.provider.rows = [record(str(UUID(int=index + 1)), MIGUEL, 'private') for index in range(201)]
        result = self.search(mode='semantic')
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['data']['semantic_scanned'], 200)
        self.assertTrue(result.json()['data']['semantic_truncated'])
        self.assertEqual(sum(not query for query, _ in self.encoder.seen), 200)

    def test_profile_pagination_and_public_projection(self):
        self.provider.profiles = [{'id': identity, 'username': name, 'display_name': 'Limpiar ' + name, 'bio': '', 'email': 'private-not-for-response'} for identity, name in ((MIGUEL, 'miguel'), (FAHIDA, 'fahida'))]
        first = self.search(kind='profiles', limit=1).json()['data']['profiles']
        second = self.search(kind='profiles', limit=1, profiles_cursor=first['next_cursor'])
        self.assertEqual(second.status_code, 200)
        self.assertNotIn('private-not-for-response', second.text)
        self.assertNotEqual(first['items'][0]['id'], second.json()['data']['profiles']['items'][0]['id'])

    def test_inference_errors_are_sanitized_and_admission_is_released(self):
        with patch.object(self.encoder, 'encode', side_effect=RuntimeError('private-runtime-detail')):
            result = self.search(mode='semantic')
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('private-runtime-detail', result.text)
        self.assertEqual(self.search(mode='semantic').status_code, 200)

    def test_admission_rejects_parallel_semantic_work_without_blocking_text(self):
        from services.search_service import admission
        with admission:
            self.assertEqual(self.search(mode='semantic').status_code, 429)
            self.assertEqual(self.search().status_code, 200)


class SearchRouteTests(unittest.TestCase):
    def test_search_requires_session(self):
        app = FastAPI()
        app.include_router(api_router, prefix='/api')
        with TestClient(app) as client:
            self.assertEqual(client.post('/api/search', json={'query': 'texto'}).status_code, 401)


if __name__ == '__main__':
    unittest.main()
