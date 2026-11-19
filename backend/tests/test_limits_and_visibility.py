"""Límite de la IA (turno corto vs. tope por hora) y comprobación de visibilidad en lote."""
import asyncio
import unittest
from uuid import uuid4

from fastapi import HTTPException

from repositories.capabilities import CapabilityRepository
from services.candidate_generation import GenerationLimiter


class GenerationLimiterTests(unittest.TestCase):
    def setUp(self):
        self.now = [1000.0]
        self.limits = GenerationLimiter(clock=lambda: self.now[0], hourly_limit=2, min_gap=5)

    def rejected(self):
        with self.assertRaises(HTTPException) as caught:
            self.limits.start('u')
        return caught.exception

    def test_short_gap_says_seconds_and_short_retry_after(self):
        self.limits.start('u'); self.limits.finish('u')
        self.now[0] += 2
        error = self.rejected()
        self.assertEqual(error.status_code, 429)
        self.assertEqual(error.headers['Retry-After'], '3')
        self.assertIn('3 segundos', error.detail)

    def test_busy_user_waits_for_the_previous_request(self):
        self.limits.start('u')
        error = self.rejected()
        self.assertIn('anterior', error.detail)
        self.assertEqual(error.headers['Retry-After'], '5')

    def test_hourly_cap_says_minutes_not_seconds(self):
        for _ in range(2):
            self.limits.start('u'); self.limits.finish('u'); self.now[0] += 10
        error = self.rejected()
        self.assertGreater(int(error.headers['Retry-After']), 3000)
        self.assertIn('minutos', error.detail)
        self.assertNotIn('segundos', error.detail)

    def test_hourly_cap_expires(self):
        for _ in range(2):
            self.limits.start('u'); self.limits.finish('u'); self.now[0] += 10
        self.now[0] += 3600
        self.limits.start('u')


class VisibleIdsTests(unittest.TestCase):
    def test_one_request_and_privacy_filter(self):
        user, other = str(uuid4()), str(uuid4())
        mine, public, foreign = str(uuid4()), str(uuid4()), str(uuid4())
        rows = {mine: {'id': mine, 'owner_id': user, 'visibility': 'private'},
                public: {'id': public, 'owner_id': other, 'visibility': 'public'},
                foreign: {'id': foreign, 'owner_id': other, 'visibility': 'private'}}
        calls = []

        class Gateway:
            async def request(self, method, path, token, params=None, **_):
                calls.append(params)
                ids = params['id'][len('in.('):-1].split(',')
                # Devuelve también la privada ajena: el filtro posterior debe descartarla.
                return [rows[identity] for identity in ids if identity in rows]

        repository = CapabilityRepository(Gateway(), 'token', user)
        visible = asyncio.run(repository.visible_ids([mine, public, foreign, mine]))
        self.assertEqual(visible, {mine, public})
        self.assertEqual(len(calls), 1)
        self.assertIn('or', calls[0])  # visible_to también se aplica en origen
        self.assertEqual(asyncio.run(repository.visible_ids([])), set())
        self.assertEqual(len(calls), 1)


if __name__ == '__main__':
    unittest.main()
