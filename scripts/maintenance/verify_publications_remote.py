"""Aceptacion de activacion B6: SOLO lecturas y peticiones rechazadas, sin publicar."""
import argparse
import asyncio
import json
from pathlib import Path
import sys
from uuid import UUID, uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
import httpx
from core.supabase import get_supabase_gateway
from services.shared_worker import WorkerSession, WorkerSettings


async def main(args):
    report = {'passed': False, 'scope': 'activation_readonly_no_publication'}
    async for gateway in get_supabase_gateway():
        session = WorkerSession(gateway, WorkerSettings())
        await session.authenticate()
        headers = {'Authorization': f'Bearer {session.token}'}
        async with httpx.AsyncClient(base_url='http://127.0.0.1:8000', timeout=30) as client:
            availability = await client.get('/api/publications/availability', headers=headers)
            assert availability.status_code == 200 and availability.json()['data']['enabled'] is True
            report['feature_enabled'] = True
            for path in ('/api/publications?limit=1', '/api/workflows/available-versions?limit=1'):
                response = await client.get(path, headers=headers)
                assert response.status_code == 200
                page = response.json()['data']
                assert isinstance(page['items'], list) and 'next_cursor' in page
                assert all(not any(key in row for key in ('source', 'manifest', 'candidate_id', 'build_id')) for row in page['items'])
            report['descriptors_and_workflow_contracts'] = True
            response = await client.get('/api/publications')
            assert response.status_code == 401
            report['unauthenticated_401'] = True
            absent = str(uuid4())
            response = await client.post(f'/api/publications/{absent}/runs', headers=headers | {'Idempotency-Key': str(uuid4())}, json={'inputs': {}, 'parameters': {}})
            assert response.status_code == 404
            report['unavailable_publication_404'] = True
            response = await client.post('/api/publications', headers=headers, json={'version_id': absent, 'license': 'MIT', 'consent': False})
            assert response.status_code == 422
            report['missing_consent_422'] = True
            response = await client.get(f'/api/runs/{args.protected_run}', headers=headers)
            assert response.status_code == 404
            report['other_owner_run_404'] = True
    report['passed'] = True
    path = ROOT / 'output/laboratory/block6-activation-remote.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--protected-run', type=UUID, required=True)
    try:
        asyncio.run(main(parser.parse_args()))
    except Exception as error:
        print('Verificacion detenida:', type(error).__name__, '(sin datos ni credenciales)', file=sys.stderr)
        raise SystemExit(1) from None
