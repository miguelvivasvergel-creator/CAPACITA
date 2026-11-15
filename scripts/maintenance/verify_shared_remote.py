"""Aceptación B3 sobre el proyecto real, con permiso explícito --allow-test-data.

Usa cuenta worker local, sin mostrar credenciales ni pedir JWT. Crea UNA capacidad
privada marcada fixture, candidato fijo sin IA y reportes propios. Quedan como
evidencia (no hay DELETE autorizado). Deshabilita solo su versión de fixture.
Reinicia API temporal propia; --exercise-recovery termina el worker de este repo
durante un run fixture, espera la reserva y comprueba recuperación. No apaga WSL.
"""
import argparse
import asyncio
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from uuid import UUID, uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

import httpx

from core.supabase import get_supabase_gateway
from repositories.candidates import CandidateRepository
from repositories.capabilities import CapabilityRepository
from schemas.candidates import PythonSourceProposal
from schemas.definitions import CapabilityDefinition
from services.candidate_preparation import prepare_candidate
from services.shared_worker import WorkerSession, WorkerSettings
from tests.fixtures.definitions import definition

SOURCE = '''# Fixture publica B3: codigo fijo, NO generado por Gemini.
def run(inputs, parameters):
    if inputs["texto"] == "__B3_RECOVERY_FIXTURE__" or parameters.get("delay"):
        import time
        time.sleep(8)
    text = inputs["texto"].strip()
    return {"resultado": text.upper() if parameters.get("mayusculas") else text}
'''


def stop_owned_process(process):
    if process is not None and process.poll() is None:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                           capture_output=True, check=True, timeout=20)
        else:
            process.terminate()
        process.wait(timeout=20)


class TemporaryAPI:
    def __init__(self, port):
        self.port = port
        self.process = None

    def start(self):
        self.process = subprocess.Popen([sys.executable,"-m","uvicorn","main:app","--app-dir","backend",
            "--host","127.0.0.1","--port",str(self.port)], cwd=ROOT,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0)

    def stop(self):
        stop_owned_process(self.process)
        self.process=None


async def ready(client, api):
    for _ in range(40):
        if api.process.poll() is not None:
            raise RuntimeError("temporary_api_start_failed")
        try:
            response=await client.get("/api/health")
            if response.status_code==200:
                return
        except httpx.RequestError:
            pass
        await asyncio.sleep(1)
    raise RuntimeError("temporary_api_not_ready")


async def wait_status(client, token, kind, identity, expected, timeout=90):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        response=await client.get(f"/api/{kind}/{identity}",headers={"Authorization":f"Bearer {token}"})
        if response.status_code!=200:
            raise RuntimeError(f"poll_{kind}_http_{response.status_code}")
        row=response.json()["data"]
        if row["status"] in expected:
            return row
        if row["status"] in {"passed","failed","completed","interrupted"}:
            raise RuntimeError(f"unexpected_{kind}_state_{row['status']}")
        await asyncio.sleep(0.3)
    raise RuntimeError(f"timeout_{kind}")


def terminate_repository_worker():
    # Solo proceso hijo del launcher de este repositorio; no tocar otro Python.
    launcher=str(ROOT/".venv/Scripts/python.exe").replace("'","''")
    script=r"""
$all = @(Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" |
  Where-Object { $_.CommandLine -match 'backend[\\/]services[\\/]shared_worker\.py' })
$launchers = @($all | Where-Object { $_.ExecutablePath -eq 'LAUNCHER' })
$children = @($all | Where-Object { $_.ParentProcessId -in $launchers.ProcessId })
if ($launchers.Count -ne 1 -or $children.Count -ne 1) { throw 'worker_identity_ambiguous' }
Stop-Process -Id $children[0].ProcessId -Force -ErrorAction Stop
""".replace("LAUNCHER",launcher)
    completed=subprocess.run(["powershell","-NoProfile","-Command",script],
                              capture_output=True,timeout=20)
    if completed.returncode:
        raise RuntimeError("worker_identity_or_stop_failed")


async def worker_once():
    process=subprocess.Popen([sys.executable,"backend/services/shared_worker.py","--once"],
        cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name=="nt" else 0)
    try:
        code=await asyncio.to_thread(process.wait,45)
        if code!=0:
            raise RuntimeError("recovery_worker_failed")
    finally:
        stop_owned_process(process)


async def verify(args, report):
    api=TemporaryAPI(args.port)
    api.start()
    try:
        async with httpx.AsyncClient(base_url=f"http://127.0.0.1:{args.port}",timeout=20) as client:
            await ready(client,api)
            async for gateway in get_supabase_gateway():
                session=WorkerSession(gateway,WorkerSettings())
                await session.authenticate()
                token=session.token
                headers={"Authorization":f"Bearer {token}"}
                user=await gateway.request("GET","/auth/v1/user",token)
                catalog=CapabilityRepository(gateway,token,user["id"])

                async def call(method,path,body=None,key=None,status=200):
                    extra={"Idempotency-Key":key} if key else {}
                    response=await client.request(method,path,headers=headers|extra,json=body)
                    if response.status_code!=status:
                        raise RuntimeError(f"{method}_{path.split('?')[0]}_http_{response.status_code}_expected_{status}")
                    return response.json().get("data")

                # Comprueba ausencia de acceso a la ejecución real de Fahida, sin
                # leer ni imprimir datos de ella. La lectura propia fue manual.
                if args.protected_run:
                    await call("GET",f"/api/runs/{args.protected_run}",status=404)
                    report["another_identity_get_404"]=True
                    print("PASS: otra identidad recibe 404 para la ejecución indicada.",flush=True)

                spec=definition()
                spec.update(name=f"[PRUEBA B3] {str(uuid4())[:8]}",
                    description="Fixture privada automática de aceptación B3. Código fijo del repositorio, no generado con IA. No publicar.",
                    parameter_schema={"type":"object","properties":{},"additionalProperties":False})
                spec["examples"][0]["parameters"]={}
                if args.workflows:
                    spec['name']=spec['name'].replace('[PRUEBA B3]','[PRUEBA B4]')
                    spec['description']='Fixture privada automática B4; código fijo, sin IA. No publicar.'
                    spec['parameter_schema']={'type':'object','properties':{'mayusculas':{'type':'boolean'},'delay':{'type':'boolean'}},'additionalProperties':False}
                checked=await call("POST","/api/capabilities/definitions/check",spec)
                if checked["matches"]["items"]:
                    # Es otra fixture: no se reutiliza porque vamos a deshabilitarla.
                    print("Coincidencias revisadas: se necesita fixture independiente para no alterar versiones anteriores.",flush=True)
                capability=await call("POST","/api/capabilities/definitions",
                    {"definition":spec,"acknowledge_similar":bool(checked["matches"]["items"])},status=201)
                report["fixture_capability_id"]=capability["id"]
                manifest=prepare_candidate(UUID(capability["id"]),CapabilityDefinition(**spec),PythonSourceProposal(source=SOURCE))
                # La tabla histórica solo acepta provider=gemini. El modelo y la
                # descripción marcan inequívocamente fixture, sin llamada de IA.
                row=await CandidateRepository(catalog).create(manifest,"fixture-b4-acceptance-no-ia" if args.workflows else "fixture-b3-acceptance-no-ia")
                report["fixture_candidate_id"]=row["id"]
                report["fixture_artifact_hash"]=manifest.artifact_hash
                build_body={"candidate_id":row["id"],"artifact_hash":manifest.artifact_hash,"cases":[{
                    "name":"Fixture controlada","inputs":{"texto":"  Árbol "},"parameters":{},
                    "expected_output":{"resultado":"Árbol"},"expect_rejection":False}]}
                build=await call("POST","/api/builds",build_body,key=str(uuid4()),status=202)
                report["fixture_build_id"]=build["id"]
                await wait_status(client,token,"builds",build["id"],{"passed"})
                version_body={"candidate_id":row["id"],"build_id":build["id"]}
                version=await call("POST","/api/versions",version_body,status=201)
                same=await call("POST","/api/versions",version_body,status=201)
                assert version["id"]==same["id"]
                report["fixture_version_id"]=version["id"]
                report["version_idempotency"]=True
                print("PASS: prueba real y habilitación privada con Supabase.",flush=True)

                body={"version_id":version["id"],"inputs":{"texto":"  verificación automática  "},"parameters":{}}
                key=str(uuid4())
                run=await call("POST","/api/runs",body,key=key,status=202)
                completed=await wait_status(client,token,"runs",run["id"],{"completed"})
                assert completed["output"]=={"resultado":"verificación automática"}
                same=await call("POST","/api/runs",body,key=key,status=202)
                assert same["id"]==run["id"]
                await call("POST","/api/runs",body|{"inputs":{"texto":"otra petición"}},key=key,status=409)
                await call("POST","/api/runs",body|{"inputs":{"texto":7}},key=str(uuid4()),status=422)
                report.update(fixture_run_id=run["id"],run_idempotency=True,conflict_409=True,input_422=True)
                api.stop(); api.start()
                await ready(client,api)
                reread=await call("GET",f"/api/runs/{run['id']}")
                assert reread==completed
                report["api_restart_persistence"]=True
                print("PASS: salida correcta, idempotencia, errores y resultado conservado al reiniciar API temporal.",flush=True)

                if args.workflows:
                    from workflow_remote_cases import verify_workflow_remote
                    async def wait_run(identity,expected):
                        return await wait_status(client,token,'runs',identity,expected,120)
                    async def restart_api():
                        api.stop();api.start();await ready(client,api)
                    await verify_workflow_remote(call,wait_run,version,args.exercise_recovery,report,
                                                 terminate_repository_worker,worker_once,restart_api)

                if args.exercise_recovery and not args.workflows:
                    recovery_body=body|{"inputs":{"texto":"__B3_RECOVERY_FIXTURE__"}}
                    interrupted=await call("POST","/api/runs",recovery_body,key=str(uuid4()),status=202)
                    report["interrupted_run_id"]=interrupted["id"]
                    await wait_status(client,token,"runs",interrupted["id"],{"running"})
                    terminate_repository_worker()
                    stopped=await call("GET",f"/api/runs/{interrupted['id']}")
                    assert stopped["status"]=="running", "worker_termination_missed_running_window"
                    print("Trabajador terminado durante run fixture. Esperando 65 s para que venza su reserva...",flush=True)
                    for _ in range(13):
                        await asyncio.sleep(5)
                    await worker_once()
                    recovered=await call("GET",f"/api/runs/{interrupted['id']}")
                    assert recovered["status"]=="interrupted" and recovered["output"] is None
                    report["abrupt_worker_recovery"]=True
                    command=["wsl.exe","--distribution","Ubuntu-24.04","--user","root","--exec",
                        "/usr/bin/docker","--host","unix:///run/capacita-docker.sock","ps","--all",
                        "--filter","label=capacita.laboratory=block2","--format","{{.Names}}"]
                    containers=await asyncio.to_thread(subprocess.run,command,capture_output=True,check=True,timeout=20)
                    assert not containers.stdout.strip()
                    report["sandbox_cleanup"]=True
                    after=await call("POST","/api/runs",body,key=str(uuid4()),status=202)
                    await worker_once()
                    fresh=await call("GET",f"/api/runs/{after['id']}")
                    assert fresh["status"]=="completed" and fresh["output"]==completed["output"]
                    report["new_run_after_recovery"]=after["id"]
                    assert (await call("GET",f"/api/runs/{run['id']}"))==completed
                    print("PASS: interrupted persistido, sin contenedores, nueva ejecución correcta e historial conservado.",flush=True)

                disabled=await call("POST",f"/api/versions/{version['id']}/disable")
                assert disabled["status"]=="disabled"
                await call("POST","/api/runs",body,key=str(uuid4()),status=409)
                assert (await call("GET",f"/api/runs/{run['id']}"))==completed
                report["disabled_version_rejected_409"]=True
                print("PASS: versión de fixture deshabilitada rechaza nuevas ejecuciones y conserva historial.",flush=True)
                report["passed"]=True
    finally:
        api.stop()


if __name__=="__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-test-data",action="store_true",required=True)
    parser.add_argument("--exercise-recovery",action="store_true")
    parser.add_argument("--workflows",action="store_true",help="Añadir aceptación B4 sobre fixture privada, requiere SQL 08/protocolo 2")
    parser.add_argument("--protected-run",type=UUID,help="Run ajeno conocido para comprobar 404 sin leer su contenido")
    parser.add_argument("--port",type=int,default=18003)
    args=parser.parse_args()
    report={"started_at":datetime.now(timezone.utc).isoformat(),"passed":False,
            "scope":"real_supabase_worker_owned_fixture_no_ai"}
    path=ROOT/"output/laboratory"/("block4-remote-latest.json" if args.workflows else "block3-remote-latest.json")
    try:
        asyncio.run(verify(args,report))
    except Exception as error:
        # No traceback, headers ni respuestas Auth: solo clase de error sanitizada.
        report["error_type"]=type(error).__name__
        if isinstance(error,(RuntimeError,AssertionError)):
            print(str(error),file=sys.stderr)
        else:
            print("Verificación detenida; revisar estado sin mostrar credenciales.",file=sys.stderr)
        raise SystemExit(1) from None
    finally:
        report["finished_at"]=datetime.now(timezone.utc).isoformat()
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
