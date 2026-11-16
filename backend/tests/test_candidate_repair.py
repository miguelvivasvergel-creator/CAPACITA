"""Reparación A con proveedores simulados; sin ejecutar código ni alterar evidencia B."""
from copy import deepcopy
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch
from uuid import uuid4
from fastapi import HTTPException
from schemas.candidates import CandidateRepairRequest, PythonSourceProposal
from services.candidate_generation import GenerationLimiter
from services.candidate_repair import repair_candidate
from tests.test_builds import manifest


class RepairTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.original = manifest()
        self.row = {'id': str(self.original.candidate_id), 'capability_id': str(self.original.capability_id),
                    'manifest': self.original.model_dump(mode='json')}
        self.snapshot = deepcopy(self.row)
        self.repository = SimpleNamespace(capabilities=SimpleNamespace(user_id='owner'),
            get=AsyncMock(return_value=self.row), create=AsyncMock(side_effect=lambda candidate, model: candidate))
        self.provider = SimpleNamespace(repair=AsyncMock(return_value=PythonSourceProposal(
            source="def run(inputs, parameters):\n    text = inputs['texto']\n    return {'resultado': text.strip()}\n")))
        self.payload = CandidateRepairRequest(feedback='Corregir los espacios exteriores sin quitar acentos', consent_to_provider=True)
        self.limits = GenerationLimiter()
        self.repairs = GenerationLimiter(hourly_limit=2)

    async def run_repair(self, hashes=None):
        hashes = hashes or [self.original.definition_hash] * 2
        values = [(self.original.definition, value) for value in hashes]
        with patch('services.candidate_repair.owned_definition', AsyncMock(side_effect=values)):
            return await repair_candidate(self.original.candidate_id, self.payload, self.repository,
                self.provider, 'fixture', self.limits, self.repairs)

    async def test_new_candidate_preserves_contract_and_does_not_modify_original(self):
        candidate = await self.run_repair()
        self.assertNotEqual(candidate.candidate_id, self.original.candidate_id)
        self.assertNotEqual(candidate.artifact_hash, self.original.artifact_hash)
        self.assertEqual(candidate.definition_hash, self.original.definition_hash)
        self.assertFalse(candidate.implementation_verified)
        self.assertEqual(candidate.status, 'draft')
        self.assertEqual(self.row, self.snapshot)
        self.repository.create.assert_awaited_once()
        self.assertEqual(self.limits.active, set())
        self.assertEqual(self.repairs.active, set())

    async def test_consent_prevents_sending_previous_code(self):
        self.payload.consent_to_provider = False
        with self.assertRaises(HTTPException) as caught:
            await self.run_repair()
        self.assertEqual(caught.exception.status_code, 422)
        self.provider.repair.assert_not_awaited()
        self.repository.create.assert_not_awaited()

    async def test_other_users_candidate_remains_404(self):
        self.repository.get.side_effect = HTTPException(404, 'Candidato no encontrado')
        with self.assertRaises(HTTPException) as caught:
            await self.run_repair()
        self.assertEqual(caught.exception.status_code, 404)
        self.provider.repair.assert_not_awaited()

    async def test_manifest_identity_mismatch_stops_before_model(self):
        self.row['manifest']['candidate_id'] = str(uuid4())
        with self.assertRaises(HTTPException) as caught:
            await self.run_repair()
        self.assertEqual(caught.exception.status_code, 409)
        self.provider.repair.assert_not_awaited()

    async def test_definition_change_before_or_during_model_is_not_saved(self):
        for hashes in [['a' * 64], [self.original.definition_hash, 'b' * 64]]:
            with self.subTest(hashes=hashes):
                self.limits = GenerationLimiter()
                self.repairs = GenerationLimiter(hourly_limit=2)
                with self.assertRaises(HTTPException) as caught:
                    await self.run_repair(hashes)
                self.assertEqual(caught.exception.status_code, 409)
                self.repository.create.assert_not_awaited()
                self.assertEqual(self.limits.active, set())
                self.assertEqual(self.repairs.active, set())

    async def test_unchanged_or_invalid_code_cannot_be_saved(self):
        for source in [self.original.proposal.source, 'def run(inputs): return {}']:
            self.provider.repair.return_value = PythonSourceProposal(source=source)
            self.limits = GenerationLimiter()
            self.repairs = GenerationLimiter(hourly_limit=2)
            with self.assertRaises(HTTPException) as caught:
                await self.run_repair()
            self.assertIn(caught.exception.status_code, [409, 422])
            self.repository.create.assert_not_awaited()
            self.assertEqual(self.limits.active, set())
            self.assertEqual(self.repairs.active, set())

    async def test_disabled_repairs_do_not_call_model(self):
        self.repairs = GenerationLimiter(hourly_limit=0)
        with self.assertRaises(HTTPException) as caught:
            await self.run_repair()
        self.assertEqual(caught.exception.status_code, 429)
        self.provider.repair.assert_not_awaited()

    def test_repair_quota_expires_and_limits_attempts(self):
        now = [0]
        quota = GenerationLimiter(clock=lambda: now[0], hourly_limit=2)
        for stamp in [0, 31]:
            now[0] = stamp
            quota.start('owner'); quota.finish('owner')
        now[0] = 62
        with self.assertRaises(HTTPException):
            quota.start('owner')
        now[0] = 3700
        quota.start('owner'); quota.finish('owner')

    async def test_model_failure_releases_both_locks(self):
        self.provider.repair.side_effect = HTTPException(502, 'Proveedor no disponible')
        with self.assertRaises(HTTPException):
            await self.run_repair()
        self.assertEqual(self.limits.active, set())
        self.assertEqual(self.repairs.active, set())
        self.repository.create.assert_not_awaited()
