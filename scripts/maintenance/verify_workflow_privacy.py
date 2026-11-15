"""GET/lista con cuenta worker distinta de la dueña; sin contenido ni JWT impresos."""
import argparse
import asyncio
import json
from pathlib import Path
import sys
from uuid import UUID

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
import httpx
from core.supabase import get_supabase_gateway
from services.shared_worker import WorkerSession,WorkerSettings


async def main(args):
    report={'passed':False}
    async for gateway in get_supabase_gateway():
        session=WorkerSession(gateway,WorkerSettings());await session.authenticate()
        headers={'Authorization':f'Bearer {session.token}'}
        async with httpx.AsyncClient(base_url='http://127.0.0.1:8000',timeout=20) as client:
            for kind,identity in (('workflows',args.workflow),('runs',args.run)):
                response=await client.get(f'/api/{kind}/{identity}',headers=headers)
                report[kind+'_get_404']=response.status_code==404
                if response.status_code!=404:raise RuntimeError('unexpected_privacy_status')
                cursor=None;seen=set();found=False
                for _ in range(100):
                    query={'limit':100}
                    if cursor:query['cursor']=cursor
                    page_response=await client.get(f'/api/{kind}',params=query,headers=headers)
                    if page_response.status_code!=200:raise RuntimeError('private_list_failed')
                    page=page_response.json()['data']
                    found=found or any(row['id']==str(identity) for row in page['items'])
                    cursor=page['next_cursor']
                    if not cursor:break
                    if cursor in seen:raise RuntimeError('pagination_loop')
                    seen.add(cursor)
                else:raise RuntimeError('pagination_limit')
                report[kind+'_absent_from_list']=not found
                if found:raise RuntimeError('private_item_in_other_list')
    report['passed']=True
    path=ROOT/'output/laboratory/block4-user-privacy.json'
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(report)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workflow',type=UUID,required=True);parser.add_argument('--run',type=UUID,required=True)
    try:asyncio.run(main(parser.parse_args()))
    except Exception:
        print('Prueba de privacidad detenida; no se muestran datos ni credenciales.',file=sys.stderr)
        raise SystemExit(1) from None
