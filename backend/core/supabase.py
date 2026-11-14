"""Transporte acotado a Supabase; conserva el contexto RLS de cada petición."""
from collections.abc import AsyncIterator
import logging
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException

from core.config import settings

logger = logging.getLogger(__name__)


class SupabaseGateway:
    def __init__(self, client: httpx.AsyncClient, api_key: str):
        self.client = client
        self.api_key = api_key

    async def request(self, method: str, path: str, token: str, *, params=None, json=None):
        if path not in {"/auth/v1/user", "/rest/v1/capabilities", "/rest/v1/profiles", "/rest/v1/capability_candidates"}:
            raise ValueError("Ruta Supabase no permitida")
        headers = {"apikey": self.api_key, "Authorization": f"Bearer {token}"}
        if method != "GET":
            headers["Prefer"] = "return=representation"
        try:
            response = await self.client.request(method, path, headers=headers, params=params, json=json)
        except httpx.RequestError:
            raise HTTPException(503, "Supabase no está disponible. Intenta de nuevo más tarde.") from None
        if response.status_code == 401 or (path == "/auth/v1/user" and response.status_code == 403):
            raise HTTPException(401, "Sesión inválida o expirada", headers={"WWW-Authenticate": "Bearer"})
        if not 200 <= response.status_code < 300:
            # Solo metadatos del fallo: nunca tokens, payloads ni mensajes SQL.
            try:
                error = response.json()
                code = error.get("code") if isinstance(error, dict) else None
            except ValueError:
                code = None
            safe_code = code if isinstance(code, str) and code.isalnum() and len(code) <= 20 else "unknown"
            logger.warning("Supabase request failed: method=%s path=%s status=%s code=%s", method, path, response.status_code, safe_code)
            # No exponer cuerpos del proveedor: pueden contener detalles SQL o datos privados.
            raise HTTPException(503, "No se pudo completar la operación en Supabase")
        try:
            data = response.json()
        except ValueError:
            raise HTTPException(503, "Respuesta inválida de Supabase") from None
        if path == "/auth/v1/user":
            valid = isinstance(data, dict)
        else:
            valid = isinstance(data, list) and all(isinstance(row, dict) for row in data)
        if not valid:
            raise HTTPException(503, "Respuesta inválida de Supabase")
        return data


async def get_supabase_gateway() -> AsyncIterator[SupabaseGateway]:
    url = urlsplit(settings.SUPABASE_URL)
    local = url.hostname in {"localhost", "127.0.0.1", "::1"}
    if (
        not url.hostname or url.username or url.password or url.query or url.fragment
        or url.path not in {"", "/"}
        or (url.scheme != "https" and not (local and url.scheme == "http"))
        or not settings.SUPABASE_ANON_KEY
    ):
        raise HTTPException(503, "Configura SUPABASE_URL y SUPABASE_ANON_KEY en backend/.env")
    async with httpx.AsyncClient(
        base_url=settings.SUPABASE_URL.rstrip("/"), timeout=10.0, follow_redirects=False,
    ) as client:
        yield SupabaseGateway(client, settings.SUPABASE_ANON_KEY)
