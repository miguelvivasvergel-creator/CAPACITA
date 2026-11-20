"""Trabajador compartido: JWT de cuenta dedicada, nunca service_role.

Desde raíz: .venv/Scripts/python.exe backend/services/shared_worker.py
Credenciales solo en backend/.env; el runner recibe un entorno cerrado de B2.
"""
import argparse
import asyncio
from contextlib import suppress
from pathlib import Path
import sys
import threading
import time
from fastapi import HTTPException
from types import SimpleNamespace
from uuid import uuid4

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from core.supabase import get_supabase_gateway
from repositories.shared_execution import SharedExecutionRepository
from repositories.builds import DEFAULT_PATH
from services.build_worker import invoke_runner, worker_lock
from services.execution_engine import ExecutionInfrastructureError, execute_job
from services.telegram_bot import TelegramBot, atender
from core.config import settings


class WorkerSettings(BaseSettings):
    SUPABASE_WORKER_EMAIL: str = ""
    SUPABASE_WORKER_PASSWORD: SecretStr = SecretStr("")
    WORKFLOW_PROTOCOL: int = Field(default=1, ge=1, le=2)
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / ".env",
                                     env_file_encoding="utf-8", extra="ignore")


class WorkerSession:
    def __init__(self, gateway, credentials):
        self.gateway = gateway
        self.credentials = credentials
        self.token = ""
        self.refresh_token = ""
        self.expiry = 0
        self.lock = asyncio.Lock()

    async def authenticate(self):
        async with self.lock:
            if self.token and time.monotonic() < self.expiry:
                return
            grant = "refresh_token" if self.refresh_token else "password"
            payload = {"refresh_token": self.refresh_token} if self.refresh_token else {
                "email": self.credentials.SUPABASE_WORKER_EMAIL,
                "password": self.credentials.SUPABASE_WORKER_PASSWORD.get_secret_value(),
            }
            response = await self.gateway.client.post(f"/auth/v1/token?grant_type={grant}",
                headers={"apikey": self.gateway.api_key}, json=payload)
            if response.status_code != 200:
                raise RuntimeError("worker_authentication_failed")
            data = response.json()
            self.token = data["access_token"]
            self.refresh_token = data["refresh_token"]
            self.expiry = time.monotonic() + max(1, int(data["expires_in"]) - 60)

    async def rpc(self, name, **payload):
        await self.authenticate()
        catalog = SimpleNamespace(gateway=self.gateway, token=self.token)
        return await SharedExecutionRepository(catalog).rpc(name, **payload)

    async def rpc_raw(self, name, **payload):
        """Funciones sin el prefijo execution_ (Telegram, SQL 16)."""
        await self.authenticate()
        return await self.gateway.request("POST", f"/rest/v1/rpc/{name}", self.token, json=payload)


def needs_telegram(job):
    payload = job.get("payload") or {}
    manifests = [version.get("manifest") for version in (payload.get("versions") or {}).values()] + [payload.get("manifest")]
    return any(isinstance(m, dict) and str(m.get("connector_key", "")).startswith("enviar_telegram@") for m in manifests)


def needs_google(job):
    payload = job.get("payload") or {}
    manifests = [version.get("manifest") for version in (payload.get("versions") or {}).values()] + [payload.get("manifest")]
    return any(isinstance(m, dict) and m.get("credential") == "google" for m in manifests)


async def google_context(session, identity, job):
    """Token de acceso de Google (corta duración) y correo del dueño de ESTE trabajo, o {} si no conectó."""
    from services import google_oauth
    try:
        datos = await session.rpc_raw("google_token_for_job", p_session=identity, p_job=job["id"])
        if not datos.get("token_cifrado") or not google_oauth.disponible():
            return {}
        refresh = google_oauth.descifrar(datos["token_cifrado"])
        acceso = await asyncio.to_thread(google_oauth.token_de_acceso, refresh)
        return {"google_access_token": acceso, "google_email": datos.get("email")}
    except Exception:
        return {}


async def telegram_context(session, identity, job):
    """Chat del dueño de ESTE trabajo (o None si no lo vinculó o falta el SQL 16)."""
    try:
        chat = (await session.rpc_raw("telegram_chat_for_job", p_session=identity, p_job=job["id"])).get("chat_id")
    except Exception:
        chat = None
    return {"telegram_chat_id": chat if isinstance(chat, int) else None}


async def serve(session, once=False, runner=invoke_runner, protocol=1, bot=None):
    identity = str(uuid4())
    await session.rpc("lease", p_session=identity, p_action="acquire")
    lost = threading.Event()
    last_ack = [time.monotonic()]

    async def heartbeat():
        try:
            while True:
                await asyncio.sleep(10)
                await session.rpc("lease", p_session=identity, p_action="heartbeat")
                last_ack[0] = time.monotonic()
        except Exception:
            lost.set()

    def guarded_runner(payload=None, recover=False):
        if lost.is_set() or time.monotonic() - last_ack[0] > 40:
            raise RuntimeError("worker_lease_lost")
        return runner(payload, recover=recover) if recover else runner(payload)

    task = asyncio.create_task(heartbeat())
    clean_exit = False
    bot_next = [0.0]
    assistants_next = [0.0]
    try:
        # Limpieza local antes de recuperar estados de la reserva anterior.
        recovery = await asyncio.to_thread(guarded_runner, recover=True)
        if recovery.get("recovery_verified") is not True:
            raise RuntimeError("recovery_unverified")
        await session.rpc("recover", p_session=identity)
        print("Trabajador compartido listo; sandbox recuperado.", flush=True)
        while not lost.is_set():
            await session.rpc("lease", p_session=identity, p_action="heartbeat")
            last_ack[0] = time.monotonic()
            claim_args = {"p_session": identity} | ({"p_protocol": protocol} if protocol >= 2 else {})
            job = (await session.rpc("claim", **claim_args))["job"]
            if job is None:
                if once:
                    clean_exit = True
                    return
                # Asistentes recurrentes (SQL 17): la base crea los trabajos de los turnos vencidos.
                if time.monotonic() >= assistants_next[0]:
                    try:
                        creados = await session.rpc_raw("assistant_enqueue_due", p_session=identity)
                        assistants_next[0] = time.monotonic() + 30
                        if creados.get("enqueued"):
                            print(f"Asistentes: {creados['enqueued']} trabajo(s) en cola", flush=True)
                            continue
                    except Exception:
                        assistants_next[0] = time.monotonic() + 300
                if bot is not None and time.monotonic() >= bot_next[0]:
                    # Telegram nunca detiene al trabajador: ante un fallo, espera un minuto.
                    try:
                        await atender(bot, session.rpc_raw, identity, asyncio.to_thread)
                        bot_next[0] = time.monotonic() + 3
                    except Exception:
                        bot_next[0] = time.monotonic() + 60
                await asyncio.sleep(1)
                continue
            if needs_telegram(job):
                job["context"] = await telegram_context(session, identity, job)
            if needs_google(job):
                job["context"] = {**(job.get("context") or {}), **await google_context(session, identity, job)}
            infrastructure_failure = False
            loop = asyncio.get_running_loop()

            def progress(report):
                if lost.is_set():
                    raise RuntimeError("worker_lease_lost")
                future = asyncio.run_coroutine_threadsafe(session.rpc("progress", p_session=identity,
                    p_id=job["id"], p_report=report), loop)
                future.result(timeout=20)

            try:
                status, report, output = await asyncio.to_thread(execute_job, job, guarded_runner,
                    progress if job["payload"].get("execution_type") == "workflow" else None)
            except ExecutionInfrastructureError:
                infrastructure_failure = True
                status, report, output = "failed", {"error": "sandbox_unavailable"}, None
            except Exception:
                status, report, output = "failed", {"error": "execution_failure"}, None
            if lost.is_set():
                raise RuntimeError("worker_lease_lost")
            await session.rpc("finish", p_session=identity, p_id=job["id"], p_status=status,
                              p_report=report, p_output=output)
            print(f"Trabajo {job['id']}: {status}", flush=True)
            if infrastructure_failure:
                raise RuntimeError("sandbox_recovery_required")
            if once:
                clean_exit = True
                return
        raise RuntimeError("worker_lease_lost")
    finally:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task
        # En error/cancelación no liberar anticipadamente: un controlador puede
        # seguir terminando. La reserva caduca en <=60 s y los writes quedan cercados.
        if clean_exit:
            await session.rpc("lease", p_session=identity, p_action="release")


async def main(once=False):
    credentials = WorkerSettings()
    if not credentials.SUPABASE_WORKER_EMAIL or not credentials.SUPABASE_WORKER_PASSWORD.get_secret_value():
        raise RuntimeError("configure_worker_credentials")
    # Usa la validación de URL del gateway común; no sigue redirecciones.
    DEFAULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with worker_lock(DEFAULT_PATH):
        token = settings.TELEGRAM_BOT_TOKEN.get_secret_value()
        bot = TelegramBot(token) if token else None
        async for gateway in get_supabase_gateway():
            await serve(WorkerSession(gateway, credentials), once, protocol=credentials.WORKFLOW_PROTOCOL, bot=bot)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Trabajador compartido de builds y runs")
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    try:
        asyncio.run(main(args.once))
    except KeyboardInterrupt:
        raise SystemExit(130) from None
    except Exception as exc:
        # Solo el tipo de error (y el código interno si es uno nuestro, p. ej. worker_lease_lost): nunca
        # el detalle completo, que podría incluir respuestas del servidor.
        causa = type(exc).__name__ + (f": {exc}" if isinstance(exc, RuntimeError) and str(exc).isidentifier() else "")
        if isinstance(exc, HTTPException):  # textos propios en español, sin datos del servidor
            causa += f" {exc.status_code}: {exc.detail}"
        print(f"Trabajador compartido no disponible ({causa}). Revisa cuenta autorizada, migración, red, reserva y sandbox. No se reintenta automáticamente ni se muestran credenciales.", file=sys.stderr)
        raise SystemExit(1) from None
