"""Perfil HTTP con persistencia simulada; no certifica RLS remoto."""
import json
from io import BytesIO
import unittest

import httpx
from fastapi import FastAPI
from fastapi.testclient import TestClient
from PIL import Image, PngImagePlugin

from api.users import router
from core.supabase import SupabaseGateway, get_supabase_gateway
from tests.fixtures.supabase_catalog import MIGUEL, FAHIDA, record


class ProfileFixture:
    def __init__(self):
        self.rows = {
            MIGUEL: {"id": MIGUEL, "username": "miguel", "display_name": "Miguel", "bio": "Mi bio", "avatar_url": None, "created_at": "2026-11-13T12:00:00Z"},
            FAHIDA: {"id": FAHIDA, "username": "fahida", "display_name": "Fahida", "bio": "Otra bio", "avatar_url": None, "created_at": "2026-11-13T12:00:00Z"},
        }
        self.requests = []
        self.images = {}
        self.fail_storage = False
        self.fail_patch = False
        self.commit_then_fail = False

    def handle(self, request):
        self.requests.append(request)
        identity = {"Bearer miguel-token": MIGUEL, "Bearer fahida-token": FAHIDA}.get(request.headers.get("Authorization"))
        if not identity:
            return httpx.Response(401, json={})
        if request.url.path == '/auth/v1/user':
            return httpx.Response(200, json={"id": identity})
        if request.url.path == '/rest/v1/profiles':
            params = request.url.params
            rows = [dict(row) for row in self.rows.values()]
            if params.get('id'):
                rows = [row for row in rows if 'eq.' + row['id'] == params['id']]
            if params.get('username'):
                rows = [row for row in rows if params['username'] == 'eq.' + row['username']]
            if request.method == 'PATCH':
                if self.fail_patch:
                    return httpx.Response(403, json={'code': '42501', 'message': 'private database detail'})
                changes = json.loads(request.content)
                for row in rows:
                    self.rows[row['id']].update(changes)
                rows = [dict(self.rows[row['id']]) for row in rows]
                if self.commit_then_fail:
                    return httpx.Response(503, json={})
            return httpx.Response(200, json=rows)
        if request.url.path == '/rest/v1/capabilities':
            rows = [record('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', MIGUEL, 'private'),
                    record('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', MIGUEL, 'public'),
                    record('cccccccc-cccc-4ccc-8ccc-cccccccccccc', FAHIDA, 'public')]
            return httpx.Response(200, json=rows)
        if request.url.path.startswith('/storage/v1/object/avatars/') and request.method == 'POST':
            if self.fail_storage:
                return httpx.Response(400, json={'message': 'internal storage secret'})
            self.images[request.url.path.removeprefix('/storage/v1/object/avatars/')] = request.content
            return httpx.Response(200, json={'Key': 'stored'})
        if request.url.path == '/storage/v1/object/avatars' and request.method == 'DELETE':
            for key in json.loads(request.content)['prefixes']:
                self.images.pop(key, None)
            return httpx.Response(200, json=[])
        return httpx.Response(404, json={})


class ProfileAPITests(unittest.TestCase):
    def setUp(self):
        self.fixture = ProfileFixture()
        self.app = FastAPI()
        self.app.include_router(router, prefix='/api')
        async def gateway():
            async with httpx.AsyncClient(base_url='https://fixture.invalid', transport=httpx.MockTransport(self.fixture.handle)) as client:
                yield SupabaseGateway(client, 'public-test-key')
        self.app.dependency_overrides[get_supabase_gateway] = gateway
        self.client = TestClient(self.app)
        self.headers = {'Authorization': 'Bearer miguel-token'}

    def tearDown(self):
        self.client.close()

    def test_me_reads_real_profile_instead_of_memory(self):
        result = self.client.get('/api/users/me', headers=self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['data']['display_name'], 'Miguel')

    def test_edit_is_persisted_and_only_updates_own_allowed_columns(self):
        result = self.client.patch('/api/users/me', headers=self.headers, json={'display_name': '  Miguel nuevo  ', 'bio': '<b>Como texto</b>'})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.fixture.rows[MIGUEL]['display_name'], 'Miguel nuevo')
        self.assertEqual(self.fixture.rows[FAHIDA]['bio'], 'Otra bio')
        reread = self.client.get('/api/users/me', headers=self.headers)
        self.assertEqual(reread.json()['data']['bio'], '<b>Como texto</b>')
        patch = next(request for request in self.fixture.requests if request.method == 'PATCH')
        self.assertEqual(patch.url.params['id'], 'eq.' + MIGUEL)

    def test_rejects_impersonation_nulls_blank_names_and_empty_patch(self):
        for payload in ({'id': FAHIDA}, {'username': 'fahida'}, {'avatar_url': 'https://evil.invalid'}, {'display_name': None}, {'bio': None}, {'display_name': '   '}, {}):
            with self.subTest(payload=payload):
                result = self.client.patch('/api/users/me', headers=self.headers, json=payload)
                self.assertEqual(result.status_code, 422, result.text)

    def test_requires_session_and_returns_404_for_unknown_profile(self):
        self.assertEqual(self.client.get('/api/users/me').status_code, 401)
        self.assertEqual(self.client.patch('/api/users/me', json={'display_name': 'X'}).status_code, 401)
        self.assertEqual(self.client.get('/api/users/no-existe', headers=self.headers).status_code, 404)

    def test_public_profile_contains_no_private_capabilities_or_run_data(self):
        profile = self.client.get('/api/users/fahida', headers=self.headers)
        self.assertEqual(profile.status_code, 200, profile.text)
        self.assertIsNone(profile.json()['data']['stats']['runs'])
        result = self.client.get('/api/users/miguel/capabilities', headers=self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual([row['id'] for row in result.json()['data']['items']], ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'])
        query = next(request.url.params for request in self.fixture.requests if request.url.path == '/rest/v1/capabilities')
        self.assertEqual(query['owner_id'], 'eq.' + MIGUEL)
        self.assertIn('or', query)
        self.assertEqual(self.client.get('/api/users/fahida/activity', headers=self.headers).status_code, 503)

    def test_username_is_a_literal_parameter_not_a_quoted_filter_expression(self):
        from urllib.parse import quote
        username = 'nombre",or(id.eq.otro)'
        self.fixture.rows[FAHIDA]['username'] = username
        result = self.client.get('/api/users/' + quote(username, safe=''), headers=self.headers)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['data']['id'], FAHIDA)
        request = next(item for item in self.fixture.requests if item.url.params.get('username'))
        self.assertEqual(request.url.params['username'], 'eq.' + username)
        self.assertNotIn('or', request.url.params)

    @staticmethod
    def image():
        stream = BytesIO()
        metadata = PngImagePlugin.PngInfo()
        metadata.add_text('Private-Canary', 'not-in-saved-photo')
        Image.new('RGB', (1024, 512), 'blue').save(stream, format='PNG', pnginfo=metadata)
        return stream.getvalue()

    def upload(self, raw=None, content_type='image/png', **fields):
        return self.client.post('/api/users/me/avatar', headers=self.headers,
            files={'file': ('../../foreign.png', self.image() if raw is None else raw, content_type)}, data=fields)

    def test_avatar_is_normalized_persisted_and_bound_to_authenticated_owner(self):
        result = self.upload(display_name='Nombre con foto', bio='Bio y foto juntas')
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.fixture.rows[MIGUEL]['display_name'], 'Nombre con foto')
        key, raw = next(iter(self.fixture.images.items()))
        self.assertTrue(key.startswith(MIGUEL + '/'))
        self.assertNotIn(b'not-in-saved-photo', raw)
        with Image.open(BytesIO(raw)) as image:
            self.assertLessEqual(max(image.size), 512)
        self.assertTrue(self.fixture.rows[MIGUEL]['avatar_url'].endswith(key))
        self.assertIsNone(self.fixture.rows[FAHIDA]['avatar_url'])
        self.assertEqual(self.client.get('/api/users/me', headers=self.headers).json()['data']['avatar_url'], result.json()['data']['avatar_url'])

    def test_invalid_or_oversized_photos_do_not_write_profile_or_storage(self):
        for raw, kind, status in ((b'<script>bad</script>', 'image/png', 422), (self.image(), 'image/jpeg', 422), (self.image(), 'image/svg+xml', 422), (b'x' * (2 * 1024 * 1024 + 1), 'image/png', 413)):
            with self.subTest(kind=kind, status=status):
                response = self.upload(raw, kind, display_name='No guardar')
                self.assertEqual(response.status_code, status, response.text)
        self.assertEqual(self.fixture.images, {})
        self.assertEqual(self.fixture.rows[MIGUEL]['display_name'], 'Miguel')

    def test_storage_failure_does_not_partially_save_name_or_bio(self):
        self.fixture.fail_storage = True
        result = self.upload(display_name='No guardar')
        self.assertEqual(result.status_code, 503)
        self.assertNotIn('internal storage secret', result.text)
        self.assertEqual(self.fixture.rows[MIGUEL]['display_name'], 'Miguel')

    def test_failed_profile_update_cleans_staged_image_without_touching_old_url(self):
        self.fixture.fail_patch = True
        result = self.upload()
        self.assertEqual(result.status_code, 503)
        self.assertEqual(self.fixture.images, {})
        self.assertIsNone(self.fixture.rows[MIGUEL]['avatar_url'])

    def test_lost_patch_response_does_not_delete_committed_photo(self):
        self.fixture.commit_then_fail = True
        result = self.upload()
        self.assertEqual(result.status_code, 503)
        self.assertEqual(len(self.fixture.images), 1)
        self.assertTrue(self.fixture.rows[MIGUEL]['avatar_url'])

    def test_replacing_avatar_removes_only_own_previous_uploaded_image(self):
        self.assertEqual(self.upload().status_code, 200)
        old = self.fixture.rows[MIGUEL]['avatar_url']
        self.assertEqual(self.upload().status_code, 200)
        self.assertNotEqual(old, self.fixture.rows[MIGUEL]['avatar_url'])
        self.assertEqual(len(self.fixture.images), 1)

    def test_photo_can_clear_bio_and_rejects_extra_fields_before_upload(self):
        result = self.upload(bio='')
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.fixture.rows[MIGUEL]['bio'], '')
        previous = len(self.fixture.images)
        result = self.upload(owner_id=FAHIDA)
        self.assertEqual(result.status_code, 422)
        self.assertEqual(len(self.fixture.images), previous)

    def test_jpeg_is_accepted_and_saved_as_png(self):
        raw = BytesIO()
        Image.new('RGB', (16, 16), 'red').save(raw, format='JPEG')
        result = self.upload(raw.getvalue(), 'image/jpeg')
        self.assertEqual(result.status_code, 200, result.text)
        stored = next(iter(self.fixture.images.values()))
        with Image.open(BytesIO(stored)) as image:
            self.assertEqual(image.format, 'PNG')

    def test_excessive_pixel_count_is_rejected_before_storage(self):
        raw = BytesIO()
        Image.new('1', (4001, 4000)).save(raw, format='PNG')
        result = self.upload(raw.getvalue())
        self.assertEqual(result.status_code, 422, result.text)
        self.assertEqual(self.fixture.images, {})


if __name__ == '__main__':
    unittest.main()
