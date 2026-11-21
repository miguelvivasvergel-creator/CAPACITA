"""Planner: autorización, datos enviados y contrato real B; sin IA ni escrituras."""
from copy import deepcopy
import json
from types import SimpleNamespace
import unittest
from unittest.mock import ANY, AsyncMock, patch
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from core.config import Settings
from api.planner import router
from providers.gemini import GeminiProvider
from schemas.planner import PlannerProposal, PlannerRequest
from services.candidate_generation import GenerationLimiter
from services.planner_service import planner_options, propose_plan, review_hash
from services.workflow_validation import compile_workflow
from tests.test_workflows import fixture
from tests.test_builds import manifest


class PlannerTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.definition, self.versions = fixture()
        self.identity = self.definition['nodes'][0]['version_id']
        self.catalog = SimpleNamespace(user_id='owner', get=AsyncMock(return_value={'visibility': 'private'}))
        self.options = {'items': [{'id': self.identity, 'name': 'Limpiar texto', 'input_schema': self.definition['input_schema']}], 'search_truncated': False}
        self.provider = SimpleNamespace(plan=AsyncMock(return_value={
            'decision': 'compose', 'explanation': 'Dos transformaciones para revisar',
            'definition': self.definition, 'questions': [], 'missing': []}))
        self.request = PlannerRequest(objective='Limpiar texto y convertir a mayúsculas', version_ids=[self.identity],
            version_hashes={self.identity: review_hash(self.options['items'][0])}, consent_to_provider=True)

    async def validate(self, definition, _catalog):
        _, order = compile_workflow(definition, self.versions)
        return {'valid': True, 'order': order}

    async def propose(self):
        with patch('services.planner_service.planner_options', AsyncMock(return_value=self.options)), \
             patch('services.planner_service.check_workflow', self.validate):
            return await propose_plan(self.request, self.catalog, self.provider, GenerationLimiter())

    async def test_plan_outside_the_schema_is_retried_with_the_exact_error(self):
        demasiados = {**self.definition, 'nodes': [{**self.definition['nodes'][0], 'id': f'p{n}'} for n in range(21)]}
        self.provider.plan.side_effect = [
            {'decision': 'compose', 'explanation': 'Veintiún pasos', 'definition': demasiados, 'questions': [], 'missing': []},
            {'decision': 'compose', 'explanation': 'Ahora sí', 'definition': self.definition, 'questions': [], 'missing': []}]
        result = await self.propose()
        self.assertEqual(result['proposal']['explanation'], 'Ahora sí')
        feedback = self.provider.plan.await_args_list[1].kwargs['feedback']
        self.assertIn('Máximo 20 pasos', feedback)

    async def test_lo_que_falta_del_pedido_se_corrige_o_se_avisa(self):
        # La lista de verificación del paso 1 llega al plan; si el plan no la cumple, se le devuelve a la IA
        # y, si sigue sin cumplirla, la persona lo ve en la explicación y en pendientes (nunca en silencio).
        otra = {'id': str(uuid4()), 'name': 'Otra herramienta', 'input_schema': {'type': 'object', 'properties': {}}}
        self.options = {'items': [self.options['items'][0], otra], 'search_truncated': False}
        self.request = PlannerRequest(objective='Limpia el texto y envía el resultado en inglés a ana@example.com',
            auto=True, consent_to_provider=True, version_ids=[row['id'] for row in self.options['items']],
            version_hashes={row['id']: review_hash(row) for row in self.options['items']})
        requisitos = ['Limpiar el texto', 'Enviar el resultado en inglés a ana@example.com']
        self.provider.select = AsyncMock(return_value={'requisitos': requisitos, 'falta': '',
                                                       'piezas': [{'id': self.identity, 'usos': 1, 'para_que': 'limpiar'}]})
        result = await self.propose()
        llamadas = self.provider.plan.await_args_list
        self.assertEqual(len(llamadas), 3)
        self.assertEqual(llamadas[0].kwargs['requisitos'], requisitos)
        self.assertIn('ana@example.com', llamadas[1].kwargs['feedback'])
        propuesta = result['proposal']
        self.assertEqual(propuesta['requisitos'], requisitos)
        self.assertEqual(propuesta['pendientes'], [requisitos[1]])
        self.assertTrue(propuesta['explanation'].startswith('Ojo: este plan no cumple todo lo que pediste'))

    async def test_auto_selects_pieces_first_and_creates_when_something_is_missing(self):
        # Paso 1: la IA ve todo el catálogo y elige; al paso 2 (plan) solo llegan las elegidas, con sus usos.
        otra = {'id': str(uuid4()), 'name': 'Otra herramienta', 'input_schema': {'type': 'object', 'properties': {}}}
        self.options = {'items': [self.options['items'][0], otra], 'search_truncated': False}
        self.request = PlannerRequest(objective='Limpiar texto y convertir a mayúsculas', auto=True, consent_to_provider=True,
            version_ids=[row['id'] for row in self.options['items']],
            version_hashes={row['id']: review_hash(row) for row in self.options['items']})
        self.provider.select = AsyncMock(return_value={'piezas': [{'id': self.identity, 'usos': 1, 'para_que': 'limpiar'}], 'falta': ''})
        result = await self.propose()
        enviados = self.provider.plan.await_args.args[1]
        self.assertEqual([row['id'] for row in enviados], [self.identity])
        self.assertEqual((enviados[0]['usos'], enviados[0]['para_que']), (1, 'limpiar'))
        self.assertEqual(len(self.provider.select.await_args.args[1]), 2)
        self.assertEqual(result['proposal']['decision'], 'compose')
        # Si el paso 1 no elige nada, el paso 2 decide con el respaldo (puede preguntar o proponer crear).
        self.provider.plan.reset_mock()
        self.provider.select = AsyncMock(return_value={'piezas': [], 'falta': 'No hay ninguna tarea'})
        await self.propose()
        self.assertEqual(len(self.provider.plan.await_args.args[1]), 2)
        # Sin auto (modo desarrollador) se siguen eligiendo a mano y hasta 12.
        with self.assertRaises(ValueError):
            PlannerRequest(objective='Limpiar texto y convertir', consent_to_provider=True,
                           version_ids=[uuid4() for _ in range(13)], version_hashes={uuid4(): 'a' * 64 for _ in range(13)})

    async def test_real_contract_validates_named_connections_without_saving(self):
        result = await self.propose()
        self.assertEqual(result['validation']['order'], ['limpiar', 'mayusculas'])
        self.assertFalse(result['saved'])
        self.assertFalse(result['executed'])
        self.assertEqual(self.provider.plan.await_args.args[1], self.options['items'])

    async def test_generated_layout_separates_input_sequential_and_parallel_steps(self):
        result = await self.propose()
        nodes = result['proposal']['definition']['nodes']
        self.assertEqual([(node['x'], node['y']) for node in nodes], [(330, 0), (660, 0)])
        self.assertEqual(nodes[1]['bindings'], self.definition['nodes'][1]['bindings'])
        self.definition['nodes'][1]['bindings']['texto'] = {'source': '$input', 'field': 'texto'}
        result = await self.propose()
        nodes = result['proposal']['definition']['nodes']
        self.assertEqual([(node['x'], node['y']) for node in nodes], [(330, 0), (330, 240)])
        self.assertEqual(result['proposal']['definition']['outputs'], self.definition['outputs'])

    async def test_consent_required_before_search_or_model(self):
        self.request.consent_to_provider = False
        with patch('services.planner_service.planner_options', AsyncMock()) as options:
            with self.assertRaises(HTTPException) as caught:
                await propose_plan(self.request, self.catalog, self.provider)
        self.assertEqual(caught.exception.status_code, 422)
        options.assert_not_awaited()
        self.provider.plan.assert_not_awaited()

    async def test_stale_selection_rejected_before_model(self):
        self.request.version_ids = [uuid4()]
        with self.assertRaises(HTTPException) as caught:
            await self.propose()
        self.assertEqual(caught.exception.status_code, 409)
        self.provider.plan.assert_not_awaited()

    async def test_changed_reviewed_metadata_is_not_sent_to_provider(self):
        for key in ['name', 'input_schema']:
            with self.subTest(key=key):
                original = deepcopy(self.options['items'][0])
                self.options['items'][0][key] = 'Changed' if key == 'name' else {'type': 'object', 'properties': {'secret': {'type': 'string'}}}
                with self.assertRaises(HTTPException) as caught:
                    await self.propose()
                self.assertEqual(caught.exception.status_code, 409)
                self.provider.plan.assert_not_awaited()
                self.options['items'][0] = original

    def test_selection_requires_exact_reviewed_hashes_and_no_duplicates(self):
        payload = self.request.model_dump(mode='json')
        for changes in [{'version_hashes': {}}, {'version_ids': [self.identity, self.identity]},
                        {'version_hashes': {str(uuid4()): 'a' * 64}}]:
            with self.assertRaises(ValueError):
                PlannerRequest.model_validate(payload | changes)

    async def test_review_hash_is_not_sent_to_model(self):
        self.options['items'][0]['review_hash'] = review_hash(self.options['items'][0])
        await self.propose()
        self.assertNotIn('review_hash', self.provider.plan.await_args.args[1][0])

    async def test_two_distinct_versions_use_real_resolver_and_port_validation(self):
        second_id = str(uuid4())
        self.definition['nodes'][1]['version_id'] = second_id
        first, second = manifest(), manifest()
        versions = {}
        candidates = {}
        for identity, candidate in [(self.identity, first), (second_id, second)]:
            versions[identity] = {'id': identity, 'status': 'enabled',
                'candidate_id': str(candidate.candidate_id), 'capability_id': str(candidate.capability_id),
                'artifact_hash': candidate.artifact_hash, 'definition_hash': candidate.definition_hash}
            candidates[str(candidate.candidate_id)] = {'id': str(candidate.candidate_id),
                'manifest': candidate.model_dump(mode='json')}
        self.options['items'].append({'id': second_id, 'name': 'Transformación independiente'})
        self.request = PlannerRequest(objective=self.request.objective, version_ids=[self.identity, second_id],
            version_hashes={row['id']: review_hash(row) for row in self.options['items']}, consent_to_provider=True)
        resolver = SimpleNamespace(version_for_execution=AsyncMock(side_effect=lambda identity: versions[str(identity)]))
        repository = SimpleNamespace(get=AsyncMock(side_effect=lambda identity: candidates[str(identity)]))
        with patch('services.planner_service.planner_options', AsyncMock(return_value=self.options)), \
             patch('services.workflow_service.SharedExecutionRepository', return_value=resolver), \
             patch('services.workflow_service.CandidateRepository', return_value=repository):
            result = await propose_plan(self.request, self.catalog, self.provider, GenerationLimiter())
        self.assertEqual(result['validation']['order'], ['limpiar', 'mayusculas'])
        self.assertEqual(len(result['validation']['versions']), 2)
        self.assertEqual(resolver.version_for_execution.await_count, 2)
        self.assertEqual(repository.get.await_count, 2)

    async def test_foreign_selection_never_reaches_provider(self):
        with patch('services.planner_service.planner_options', AsyncMock(return_value={'items': [], 'search_truncated': False})):
            with self.assertRaises(HTTPException) as caught:
                await propose_plan(self.request, self.catalog, self.provider, GenerationLimiter())
        self.assertEqual(caught.exception.status_code, 409)
        self.provider.plan.assert_not_awaited()

    async def test_semantic_options_use_authorized_search_without_provider(self):
        shared = SimpleNamespace(rpc=AsyncMock(return_value={'items': [], 'next_cursor': None}))
        search = AsyncMock(return_value={'capabilities': {'items': [], 'next_cursor': None}, 'semantic_truncated': False})
        with patch('services.planner_service.search_authorized', search), \
             patch('services.planner_service.SharedExecutionRepository', return_value=shared):
            result = await planner_options('Normalizar espacios ' * 20, self.catalog, mode='semantic')
        request, catalog = search.await_args.args
        self.assertIs(catalog, self.catalog)
        self.assertEqual(request.mode, 'semantic')
        self.assertEqual(request.kind, 'capabilities')
        self.assertEqual(request.query, ('Normalizar espacios ' * 20)[:200].strip())
        self.assertEqual(result['search_kind'], 'semantic')
        self.assertTrue(result['search_truncated'])
        self.provider.plan.assert_not_awaited()

    async def test_missing_semantic_model_is_an_explicit_error(self):
        with patch('services.planner_service.search_authorized', AsyncMock(side_effect=HTTPException(503, 'Modelo no disponible'))), \
             patch('services.planner_service.search_catalog', AsyncMock()) as textual:
            with self.assertRaises(HTTPException) as caught:
                await planner_options('Normalizar espacios', self.catalog, mode='semantic')
        self.assertEqual(caught.exception.status_code, 503)
        textual.assert_not_awaited()

    async def test_model_cannot_invent_or_choose_unselected_versions(self):
        self.provider.plan.return_value['definition']['nodes'][0]['version_id'] = str(uuid4())
        with self.assertRaises(HTTPException) as caught:
            await self.propose()
        self.assertEqual(caught.exception.status_code, 502)

    async def test_real_validator_rejects_cycles_and_missing_ports(self):
        for field in ['resultado', 'missing']:
            spec = deepcopy(self.definition)
            spec['nodes'][0]['bindings']['texto'] = {'source': 'mayusculas', 'field': field}
            self.provider.plan.return_value['definition'] = spec
            with self.assertRaises(HTTPException) as caught:
                await self.propose()
            self.assertEqual(caught.exception.status_code, 502)

    async def test_inconsistent_output_and_missing_questions_rejected(self):
        for proposal in [
            {'decision': 'reuse', 'explanation': 'Incorrecto', 'definition': self.definition},
            {'decision': 'clarify', 'explanation': 'Pregunta ausente'},
            {'decision': 'create', 'explanation': 'Inventa workflow', 'definition': self.definition},
        ]:
            self.provider.plan.return_value = proposal
            with self.assertRaises(HTTPException) as caught:
                await self.propose()
            self.assertEqual(caught.exception.status_code, 502)

    async def test_clarification_is_not_reported_as_validated_plan(self):
        self.provider.plan.return_value = {'decision': 'clarify', 'explanation': 'Falta regla', 'questions': ['¿Conservar signos?']}
        result = await self.propose()
        self.assertIsNone(result['validation'])
        self.assertIsNone(result['proposal']['definition'])

    async def test_invalid_connections_are_retried_once_with_the_validation_error(self):
        malo = deepcopy(self.definition)
        malo['nodes'][0]['bindings']['texto'] = {'source': 'mayusculas', 'field': 'missing'}
        bueno = self.provider.plan.return_value
        self.provider.plan.side_effect = [{**bueno, 'definition': malo}, bueno]
        limits = GenerationLimiter()
        with patch('services.planner_service.planner_options', AsyncMock(return_value=self.options)), \
             patch('services.planner_service.check_workflow', self.validate):
            result = await propose_plan(self.request, self.catalog, self.provider, limits)
        self.assertEqual(result['validation']['order'], ['limpiar', 'mayusculas'])
        self.assertEqual(self.provider.plan.await_count, 2)
        self.assertTrue(self.provider.plan.await_args.kwargs['feedback'])
        # Un pedido de la persona gasta un solo turno del limitador, aunque haya reintento.
        self.assertEqual(len(limits.attempts['owner']), 1)
        self.assertEqual(limits.active, set())

    async def test_versions_revalidated_after_inference_and_limiter_released(self):
        limits = GenerationLimiter()
        with patch('services.planner_service.planner_options', AsyncMock(return_value=self.options)), \
             patch('services.planner_service.check_workflow', AsyncMock(side_effect=HTTPException(404, 'Privada'))):
            with self.assertRaises(HTTPException) as caught:
                await propose_plan(self.request, self.catalog, self.provider, limits)
        self.assertEqual(caught.exception.status_code, 409)
        self.assertEqual(limits.active, set())

    async def test_options_use_catalog_authorization_and_never_return_source(self):
        candidate = manifest()
        version = {'id': self.identity, 'candidate_id': str(candidate.candidate_id),
            'capability_id': str(candidate.capability_id), 'status': 'enabled',
            'artifact_hash': candidate.artifact_hash, 'definition_hash': candidate.definition_hash}
        shared = SimpleNamespace(rpc=AsyncMock(return_value={'items': [version, version | {'capability_id': str(uuid4())}], 'next_cursor': None}))
        candidates = SimpleNamespace(get=AsyncMock(return_value={'manifest': candidate.model_dump(mode='json')}))
        with patch('services.planner_service.search_catalog', AsyncMock(return_value=([{'id': str(candidate.capability_id)}], False))), \
             patch('services.planner_service.SharedExecutionRepository', return_value=shared), \
             patch('services.planner_service.CandidateRepository', return_value=candidates):
            result = await planner_options('Limpiar texto', self.catalog)
        self.assertEqual(len(result['items']), 1)
        self.catalog.get.assert_awaited_once()
        candidates.get.assert_awaited_once()
        self.assertNotIn('source', json.dumps(result))
        self.assertEqual(result['items'][0]['visibility'], 'private')

    async def test_provider_protocol_only_sends_selected_metadata_and_objective(self):
        sent = []
        def handler(request):
            payload = json.loads(request.content)
            sent.append(json.loads(payload['contents'][0]['parts'][0]['text']))
            proposal = {'decision': 'blocked', 'explanation': 'Recurso no disponible'}
            return httpx.Response(200, json={'candidates': [{'finishReason': 'STOP', 'content': {'parts': [{'text': json.dumps(proposal)}]}}]})
        provider = GeminiProvider(Settings(_env_file=None, GEMINI_API_KEY='fixture'), httpx.MockTransport(handler))
        await provider.plan(self.request.objective, self.options['items'])
        # Además del objetivo y las versiones elegidas solo va la fecha de hoy (sin datos de la persona).
        self.assertEqual(sent, [{'objective': self.request.objective, 'versions': self.options['items'], 'hoy': ANY}])
        self.assertRegex(sent[0]['hoy'], r'^\d{4}-\d{2}-\d{2} \(')

    def test_api_requires_session_and_schema_rejects_execution_fields(self):
        app = FastAPI()
        app.include_router(router, prefix='/api')
        with TestClient(app) as client:
            result = client.post('/api/planner/options', json={'objective': 'Limpiar texto de prueba'})
        self.assertEqual(result.status_code, 401)
        with self.assertRaises(ValueError):
            PlannerProposal(decision='blocked', explanation='No', executed=True)
