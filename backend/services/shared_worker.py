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
from types import SimpleNamespace
from uuid import uuid4

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from core.supabase import get_supabase_gateway
from repositories.shared_execution import SharedExecutionRepository
from repositories.builds import DEFAULT_PATH
from services.build_worker import invoke_runner, worker_lock
from services.execution_engine import ExecutionInfrastructureError, execute_job


class WorkerSettings(BaseSettings):
    SUPABASE_WORKER_EMAIL: str = ""
    SUPABASE_WORKER_PASSWORD: SecretStr = SecretStr("")
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


async def serve(session, once=False, runner=invoke_runner):
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
            job = (await session.rpc("claim", p_session=identity))["job"]
            if job is None:
                if once:
                    clean_exit = True
                    return
                await asyncio.sleep(1)
                continue
            infrastructure_failure = False
            try:
                status, report, output = await asyncio.to_thread(execute_job, job, guarded_runner)
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
        async for gateway in get_supabase_gateway():
            await serve(WorkerSession(gateway, credentials), once)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Trabajador compartido de builds y runs")
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    try:
        asyncio.run(main(args.once))
    except KeyboardInterrupt:
        raise SystemExit(130) from None
    except Exception:
        print("Trabajador compartido no disponible. Revisa cuenta autorizada, migración, red, reserva y sandbox. No se reintenta automáticamente ni se muestran credenciales.", file=sys.stderr)
        raise SystemExit(1) from None
