"""Inspección de metadatos PostgREST. No lee filas ni cambia el esquema."""
import asyncio
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))

import httpx
from fastapi import HTTPException

from core.supabase import get_supabase_gateway
from core.visibility import visible_to


async def inspect():
    try:
        async for gateway in get_supabase_gateway():
            headers = {"apikey": gateway.api_key, "Accept": "application/openapi+json"}
            response = await gateway.client.get("/rest/v1/", headers=headers)
            if response.status_code != 200:
                print(f"Metadatos no disponibles (HTTP {response.status_code}).")
                for path, params in (
                    ("/auth/v1/settings", {}),
                    ("/rest/v1/profiles", {"select": "id", "limit": "0"}),
                    ("/rest/v1/capabilities", {"select": "id", "limit": "0", **visible_to(None, "00000000-0000-0000-0000-000000000000")}),
                ):
                    probe = await gateway.client.get(path, headers={"apikey": gateway.api_key}, params=params)
                    data = probe.json()
                    error = data if isinstance(data, dict) else {}
                    code = str(error.get("code", "sin código"))[:40]
                    message = str(error.get("message", "")).lower()
                    category = next((term for term in ("invalid api key", "invalid jwt", "permission denied", "schema", "column", "relationship", "could not find") if term in message), "sin clasificación")
                    print(f"{path}: HTTP {probe.status_code}; código {code}; categoría {category}")
                return 1
            document = response.json()
            definitions = document.get("definitions", {})
            print("Tablas expuestas:", ", ".join(sorted(definitions)))
            for name in ("capabilities", "profiles"):
                columns = definitions.get(name, {}).get("properties", {})
                print(f"{name}: " + ", ".join(f"{key} ({value.get('format', value.get('type', '?'))})" for key, value in columns.items()))
            return 0
    except HTTPException as error:
        print(error.detail)
    except (httpx.RequestError, ValueError):
        print("No se pudieron obtener los metadatos de Supabase.")
    return 1


if __name__ == "__main__":
    sys.exit(asyncio.run(inspect()))
