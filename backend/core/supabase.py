"""Transporte acotado a Supabase; conserva el contexto RLS de cada petición."""
from collections.abc import AsyncIterator
import logging
from urllib.parse import urlsplit

import httpx
from fastapi import HTTPException

from core.config import settings

logger = logging.getLogger(__name__)

EXECUTION_RPCS = {
    "execution_publication_versions", "execution_publish", "execution_withdraw", "execution_public_enqueue",
    "execution_enqueue", "execution_get", "execution_list", "execution_enable",
    "execution_versions", "execution_disable", "execution_lease", "execution_claim",
    "execution_recover", "execution_finish",
    "execution_workflow_get", "execution_workflow_list", "execution_workflow_save",
    "execution_workflow_archive", "execution_workflow_approve", "execution_workflow_enqueue",
    "execution_progress",
    # Telegram (SQL 16): las tres primeras para la persona; las otras exigen al trabajador.
    "telegram_link_start", "telegram_link_status", "telegram_unlink",
    "telegram_link_complete", "telegram_unlink_chat", "telegram_chat_for_job",
    # Bot completo (SQL 21): todas exigen al trabajador (check_worker) y deducen al dueño del chat.
    "telegram_owner", "telegram_set_consent", "telegram_pending_put", "telegram_pending_take",
    "telegram_workflows", "telegram_planner_versions", "telegram_save_and_run", "telegram_run_workflow",
    "telegram_job_origin", "telegram_jobs", "telegram_job_result", "telegram_assistants",
    "telegram_assistant_set_active", "telegram_assistant_run_now",
    # Asistentes recurrentes (SQL 17): las cuatro primeras para la persona; la última, el trabajador.
    "assistant_save", "assistant_list", "assistant_set_active", "assistant_delete", "assistant_enqueue_due",
    # Eliminar (archivar) una herramienta propia (SQL 22).
    "capability_archive",
    # Google (SQL 19): las cinco primeras para la persona; la última, el trabajador.
    "google_link_start", "google_state_take", "google_link_save", "google_link_status", "google_unlink",
    "google_token_for_job",
}


class SupabaseGateway:
    def __init__(self, client: httpx.AsyncClient, api_key: str):
        self.client = client
        self.api_key = api_key

    async def request(self, method: str, path: str, token: str, *, params=None, json=None):
        is_execution_rpc = path in {f"/rest/v1/rpc/{name}" for name in EXECUTION_RPCS}
        if not is_execution_rpc and path not in {"/auth/v1/user", "/rest/v1/capabilities", "/rest/v1/profiles", "/rest/v1/capability_candidates"}:
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
            if is_execution_rpc:
                mapped = {
                    "P0002": (404, "Recurso no encontrado"),
                    "P0001": (409, "La operación no es compatible con el estado o la evidencia actual"),
                    "22023": (422, "Datos de ejecución inválidos"),
                    "53000": (429, "La cola compartida está llena"),
                    "55P03": (409, "Hay otro trabajador activo; espera a que termine su reserva"),
                    "42501": (403, "Esta cuenta no está autorizada como trabajador"),
                    # La función no existe en la base: falta aplicar su script SQL (db/README.md).
                    "PGRST202": (503, "Esta función todavía no está instalada en Supabase: falta aplicar un script SQL pendiente (ver db/README.md)"),
                }
                if safe_code in mapped:
                    status, message = mapped[safe_code]
                    raise HTTPException(status, message)
            logger.warning("Supabase request failed: method=%s path=%s status=%s code=%s", method, path, response.status_code, safe_code)
            # No exponer cuerpos del proveedor: pueden contener detalles SQL o datos privados.
            raise HTTPException(503, "No se pudo completar la operación en Supabase")
        try:
            data = response.json()
        except ValueError:
            raise HTTPException(503, "Respuesta inválida de Supabase") from None
        if is_execution_rpc:
            valid = isinstance(data, dict)
        elif path == "/auth/v1/user":
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
