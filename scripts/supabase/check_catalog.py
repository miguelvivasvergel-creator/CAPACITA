r"""Comprueba columnas y relación del catálogo sin leer filas ni modificar datos.

Ejecutar desde la raíz: .venv\Scripts\python.exe scripts/supabase/check_catalog.py
No certifica las políticas RLS: requieren inspección administrativa y dos cuentas.
"""
import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

from fastapi import HTTPException
import httpx

from core.supabase import get_supabase_gateway
from core.visibility import visible_to

COLUMNS = (
    "id,owner_id,name,description,category,input_type,output_type,visibility,status,version,"
    "permissions,adapter_key,config,cloned_from,uses_count,clones_count,created_at,updated_at,"
    "owner:profiles!capabilities_owner_id_fkey(username)"
)


async def check():
    try:
        async for gateway in get_supabase_gateway():
            response = await gateway.client.get(
                "/rest/v1/capabilities",
                headers={"apikey": gateway.api_key},
                params={"select": COLUMNS, "limit": "0", **visible_to(None, "00000000-0000-0000-0000-000000000000")},
            )
            if response.status_code == 200 and response.json() == []:
                print("OK: columnas y relación del catálogo accesibles; cero filas leídas.")
                print("Pendiente: inspeccionar grants/RLS y probar dos cuentas autenticadas.")
                return 0
            print(f"No se pudo verificar el esquema (HTTP {response.status_code}). No se muestran datos del proveedor.")
            return 1
    except HTTPException as error:
        print(error.detail)
    except (httpx.RequestError, ValueError):
        print("No se pudo verificar Supabase. Revisa conexión y configuración local.")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(check()))
