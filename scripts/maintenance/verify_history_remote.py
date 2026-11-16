"""B5: solo lecturas reales de fixtures de la cuenta worker, sin imprimir datos/JWT."""
import argparse
import asyncio
import json
from pathlib import Path
import sys
from uuid import UUID

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
import httpx
from core.supabase import get_supabase_gateway
from services.shared_worker import WorkerSession, WorkerSettings


async def main(args):
    report = {'passed': False, 'scope': 'readonly_worker_owned_fixtures'}
    async for gateway in get_supabase_gateway():
        session = WorkerSession(gateway, WorkerSettings())
        await session.authenticate()
        headers = {'Authorization': f'Bearer {session.token}'}
        async with httpx.AsyncClient(base_url='http://127.0.0.1:8000', timeout=20) as client:
            cursor = None
            seen_cursors, seen_ids = set(), set()
            completed = interrupted = None
            for _ in range(100):
                params = {'limit': 2}
                if cursor:
                    params['cursor'] = cursor
                response = await client.get('/api/runs', params=params, headers=headers)
                response.raise_for_status()
                page = response.json()['data']
                assert len(page['items']) <= 2
                for row in page['items']:
                    assert row['id'] not in seen_ids
                    seen_ids.add(row['id'])
                    if row.get('workflow_id') and row['status'] == 'completed':
                        completed = row
                    if row.get('workflow_id') and row['status'] == 'interrupted':
                        interrupted = row
                cursor = page['next_cursor']
                if not cursor:
                    break
                assert cursor not in seen_cursors
                seen_cursors.add(cursor)
            else:
                raise RuntimeError('pagination_limit')
            assert completed and interrupted and seen_cursors
            for name, row in [('completed', completed), ('interrupted', interrupted)]:
                detail = await client.get(f"/api/runs/{row['id']}", headers=headers)
                detail.raise_for_status()
                value = detail.json()['data']
                for field in ('id', 'status', 'output', 'report', 'workflow_id', 'workflow_revision'):
                    assert value.get(field) == row.get(field)
                assert value['report']['steps']
                if name == 'completed':
                    assert isinstance(value['output'], dict)
                    assert all(step['status'] == 'completed' for step in value['report']['steps'])
                else:
                    assert any(step.get('output') is not None for step in value['report']['steps'])
                report[name + '_detail_matches_list'] = True
            assert str(args.protected_run) not in seen_ids
            other = await client.get(f'/api/runs/{args.protected_run}', headers=headers)
            assert other.status_code == 404
            report.update(pagination_without_duplicates=True, partial_output_preserved=True,
                          other_owner_404=True, other_owner_absent=True, passed=True)
    path = ROOT / 'output/laboratory/block5-history-remote.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--protected-run', type=UUID, required=True)
    try:
        asyncio.run(main(parser.parse_args()))
    except Exception:
        print('Verificacion detenida; no se muestran datos privados ni credenciales.', file=sys.stderr)
        raise SystemExit(1) from None
