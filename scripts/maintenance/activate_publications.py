"""Activa solo el flag local tras verificar SQL09; no aplica SQL ni publica datos."""
import asyncio
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
from core.supabase import get_supabase_gateway
from services.shared_worker import WorkerSession, WorkerSettings


async def main():
    async for gateway in get_supabase_gateway():
        session = WorkerSession(gateway, WorkerSettings())
        await session.authenticate()
        result = await session.rpc('publication_versions', p_limit=1)
        if not isinstance(result.get('items'), list) or 'next_cursor' not in result:
            raise RuntimeError('publication_rpc_not_ready')
    path = ROOT / 'backend/.env'
    content = path.read_bytes()
    pattern = rb'(?m)^PUBLICATIONS_ENABLED=[^\r\n]*'
    if re.search(pattern, content):
        content = re.sub(pattern, b'PUBLICATIONS_ENABLED=true', content)
    else:
        newline = b'\r\n' if b'\r\n' in content else b'\n'
        content = content.rstrip(b'\r\n') + newline + b'PUBLICATIONS_ENABLED=true' + newline
    path.write_bytes(content)
    print('SQL09 disponible. PUBLICATIONS_ENABLED=true guardado; reiniciar API. No se publico ni modifico ninguna capacidad.')


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except Exception:
        print('Activacion detenida; verifica SQL09, cuenta y red. No se muestran credenciales.', file=sys.stderr)
        raise SystemExit(1) from None
