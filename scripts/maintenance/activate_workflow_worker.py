"""Comprueba RPC B4 y cambia SOLO WORKFLOW_PROTOCOL en backend/.env.

No aplica SQL ni imprime credenciales. No reinicia procesos automáticamente.
"""
import asyncio
from pathlib import Path
import re
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'backend'))
from core.supabase import get_supabase_gateway
from services.shared_worker import WorkerSession,WorkerSettings


async def main():
    async for gateway in get_supabase_gateway():
        session=WorkerSession(gateway,WorkerSettings())
        await session.rpc('workflow_list',p_cursor=None,p_limit=1)
        print('RPC de workflows disponible con la cuenta configurada.',flush=True)
    path=ROOT/'backend/.env'
    data=path.read_bytes()
    pattern=rb'(?im)^[ \t]*WORKFLOW_PROTOCOL[ \t]*=[^\r\n]*'
    matches=re.findall(pattern,data)
    if len(matches)>1:
        raise RuntimeError('duplicate_protocol_setting')
    if matches:
        updated=re.sub(pattern,b'WORKFLOW_PROTOCOL=2',data)
    else:
        newline=b'\r\n' if b'\r\n' in data else b'\n'
        updated=data+(b'' if data.endswith(b'\n') else newline)+b'WORKFLOW_PROTOCOL=2'+newline
    if updated!=data:path.write_bytes(updated)
    print('Protocolo 2 guardado. Los demás valores se conservaron sin mostrarlos.',flush=True)


if __name__=='__main__':
    try:asyncio.run(main())
    except Exception:
        print('Activación detenida. Revisar migración 08/acceso o configuración duplicada, sin mostrar .env.',file=sys.stderr)
        raise SystemExit(1) from None
