"""Verifica SQL 06/07 en PostgreSQL temporal, sin red, puertos ni Supabase.

Requiere imagen ya descargada: postgres@sha256:0d938e975177bef9f1f61f3f9dbcf2e0aa0a139568f66d3415ed8892eb97f6ac
No importa reportes reales ni usa .env. Elimina solo su propio contenedor.
"""
import argparse
from contextlib import nullcontext
import json
from pathlib import Path
import subprocess
import sys
import time
from uuid import UUID, uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from tests.test_builds import cases, manifest
from repositories.builds import DEFAULT_PATH
from services.build_worker import worker_lock
from services.execution_engine import execute_job

IMAGE = "postgres@sha256:0d938e975177bef9f1f61f3f9dbcf2e0aa0a139568f66d3415ed8892eb97f6ac"
DOCKER = ["wsl.exe", "--distribution", "Ubuntu-24.04", "--user", "root", "--exec",
          "/usr/bin/docker", "--host", "unix:///run/capacita-docker.sock"]


def command(*args, input=None, check=True):
    return subprocess.run(DOCKER + list(args), input=input, capture_output=True, check=check, timeout=90)


def main(sandbox=False):
    name = "capacita-db-check-" + str(uuid4())
    owner, other, worker, cap, session, successor = [str(uuid4()) for _ in range(6)]
    candidate = manifest().model_copy(update={"capability_id": UUID(cap)})
    # Cambiar el UUID de capacidad no altera el hash de contenido del contrato A.
    package = json.dumps(candidate.model_dump(mode="json"),ensure_ascii=False)
    request = json.dumps({"candidate_id":str(candidate.candidate_id),
                          "manifest":candidate.model_dump(mode="json"),
                          "cases":[case.model_dump(mode="json") for case in cases()]},ensure_ascii=False)

    def sql(text):
        response = command("exec","-i",name,"psql","-U","postgres","-v","ON_ERROR_STOP=1","-At",
                           input=text.encode())
        return response.stdout.decode().strip()

    try:
        command("run","--detach","--name",name,"--network=none","--memory=512m","--cpus=1",
                "--tmpfs=/var/lib/postgresql/data:rw,size=256m",
                "--env","POSTGRES_HOST_AUTH_METHOD=trust","--label","capacita.test=shared-execution",IMAGE)
        for _ in range(30):
            if command("exec",name,"pg_isready","-U","postgres",check=False).returncode==0:
                break
            time.sleep(1)
        else:
            raise RuntimeError("temporary_postgres_not_ready")
        sql((ROOT/"backend/tests/fixtures/shared_execution.sql").read_text(encoding="utf-8"))
        sql((ROOT/"db/06_private_candidates.sql").read_text(encoding="utf-8"))
        sql((ROOT/"db/07_shared_execution.sql").read_text(encoding="utf-8"))
        sql(f"INSERT INTO auth.users VALUES ('{owner}'),('{other}'),('{worker}'); "
            f"INSERT INTO public.profiles VALUES ('{owner}'),('{other}'); "
            f"INSERT INTO public.capabilities(id,owner_id) VALUES ('{cap}','{owner}'); "
            f"INSERT INTO public.capability_candidates(id,owner_id,capability_id,manifest,provider,model) "
            f"VALUES ('{candidate.candidate_id}','{owner}','{cap}',$json${package}$json$,'gemini','fixture'); "
            f"INSERT INTO capacita_execution.workers(user_id) VALUES ('{worker}');")
        # Cada conexión define explícitamente identidad y rol de prueba.
        def as_user(user,body):
            return sql(f"SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','{user}',false); " + body).splitlines()[-1]

        build = json.loads(as_user(owner,f"SELECT public.execution_enqueue('build','one',$json${request}$json$);"))
        repeat = json.loads(as_user(owner,f"SELECT public.execution_enqueue('build','one',$json${request}$json$);"))
        assert build["id"]==repeat["id"] and build["storage_backend"]=="supabase"
        identity=build["id"]
        assert "payload" not in build

        def must_fail(user, statement, code):
            try:
                as_user(user,f"DO $test$ BEGIN BEGIN {statement}; "
                        f"RAISE EXCEPTION USING ERRCODE='P9999', MESSAGE='expected rejection'; "
                        f"EXCEPTION WHEN SQLSTATE '{code}' THEN NULL; END; END $test$;")
            except subprocess.CalledProcessError:
                # La base solo contiene fixtures públicas. Identifica la aserción,
                # sin imprimir manifiestos ni credenciales del proyecto real.
                print(f"Aserción SQL: esperaba {code} en {statement.split('(')[0]}",file=sys.stderr)
                raise

        must_fail(other,f"PERFORM public.execution_get('build','{identity}')","P0002")
        assert json.loads(as_user(other,"SELECT public.execution_list('build');"))["items"]==[]
        must_fail(owner,f"PERFORM public.execution_lease('{session}','acquire')","42501")
        must_fail(owner,f"PERFORM public.execution_enable('{candidate.candidate_id}','{identity}')","P0001")
        must_fail(owner,"PERFORM 1 FROM capacita_execution.jobs","42501")
        must_fail(owner,f"PERFORM public.execution_finish('{session}','{identity}','passed','{{}}')","42501")
        # Ni anon ni authenticated reciben permisos directos de funciones internas.
        sql("SET ROLE anon; DO $test$ BEGIN BEGIN PERFORM public.execution_list('build'); "
            "RAISE EXCEPTION 'expected rejection'; EXCEPTION WHEN insufficient_privilege THEN NULL; END; END $test$;")
        changed=json.loads(request); changed["cases"][0]["name"]="changed"
        must_fail(owner,f"PERFORM public.execution_enqueue('build','one',$json${json.dumps(changed,ensure_ascii=False)}$json$)","P0001")
        as_user(worker,f"SELECT public.execution_lease('{session}','acquire');")
        must_fail(worker,f"PERFORM public.execution_lease('{successor}','acquire')","55P03")
        claimed=json.loads(as_user(worker,f"SELECT public.execution_claim('{session}');"))["job"]
        assert claimed["id"]==identity and claimed["status"]=="testing"
        must_fail(worker,f"PERFORM public.execution_claim('{session}')","P0001")
        report={"passed":True,"artifact_hash":candidate.artifact_hash,
                "definition_hash":candidate.definition_hash,"candidate_id":str(candidate.candidate_id),
                "profile":"gvisor-python-stdlib-v1"}
        if sandbox:
            status,report,output=execute_job(claimed)
            assert status=='passed' and output is None
        as_user(worker,f"SELECT public.execution_finish('{session}','{identity}','passed',$json${json.dumps(report)}$json$);")
        version=json.loads(as_user(owner,f"SELECT public.execution_enable('{candidate.candidate_id}','{identity}');"))
        same=json.loads(as_user(owner,f"SELECT public.execution_enable('{candidate.candidate_id}','{identity}');"))
        assert version["id"]==same["id"]
        assert "manifest" not in version
        must_fail(other,f"PERFORM public.execution_disable('{version['id']}')","P0002")
        run_request=json.dumps({"version_id":version["id"],"inputs":{"texto":"  nuevo  "},"parameters":{}})
        run=json.loads(as_user(owner,f"SELECT public.execution_enqueue('run','run1',$json${run_request}$json$);"))
        claimed_run=json.loads(as_user(worker,f"SELECT public.execution_claim('{session}');"))["job"]
        output={"resultado":"nuevo"}; run_report={}
        if sandbox:
            status,run_report,output=execute_job(claimed_run)
            assert status=='completed' and output=={"resultado":"nuevo"}
        as_user(worker,f"SELECT public.execution_finish('{session}','{run['id']}','completed',"
                       f"$json${json.dumps(run_report)}$json$,$json${json.dumps(output)}$json$);")
        completed=json.loads(as_user(owner,f"SELECT public.execution_get('run','{run['id']}');"))
        assert completed["output"]=={"resultado":"nuevo"}
        must_fail(other,f"PERFORM public.execution_get('run','{run['id']}')","P0002")
        assert json.loads(as_user(other,"SELECT public.execution_list('run');"))["items"]==[]
        interrupted=json.loads(as_user(owner,f"SELECT public.execution_enqueue('run','run2',$json${run_request}$json$);"))
        as_user(worker,f"SELECT public.execution_claim('{session}');")
        sql("UPDATE capacita_execution.lease SET expires_at=now()-interval '1 second';")
        must_fail(worker,f"PERFORM public.execution_finish('{session}','{interrupted['id']}','completed','{{}}','{{}}')","55P03")
        as_user(worker,f"SELECT public.execution_lease('{successor}','acquire');")
        must_fail(worker,f"PERFORM public.execution_finish('{session}','{interrupted['id']}','completed','{{}}','{{}}')","55P03")
        as_user(worker,f"SELECT public.execution_recover('{successor}');")
        recovered=json.loads(as_user(owner,f"SELECT public.execution_get('run','{interrupted['id']}');"))
        assert recovered["status"]=="interrupted" and recovered["output"] is None
        as_user(owner,f"SELECT public.execution_disable('{version['id']}');")
        must_fail(owner,f"PERFORM public.execution_enqueue('run','run3',$json${run_request}$json$)","P0001")
        page=json.loads(as_user(owner,"SELECT public.execution_list('run',NULL,1);"))
        assert len(page["items"])==1 and page["next_cursor"] is not None
        next_page=json.loads(as_user(owner,f"SELECT public.execution_list('run','{page['next_cursor']}',1);"))
        assert len(next_page["items"])==1 and next_page["items"][0]["id"]!=page["items"][0]["id"]
        print("PASS: migraciones, idempotencia/conflictos, privacidad, permisos worker, habilitación, salida privada, reserva y fencing, recuperación, deshabilitación y paginación.")
        if sandbox:
            print("PASS: candidato fixture probado y ejecutado realmente en gVisor, salida validada y persistida en PostgreSQL temporal.")
    except subprocess.CalledProcessError as error:
        # Solo SQL/fixtures públicos de esta base temporal, nunca .env/candidatos reales.
        print(error.stderr.decode(errors="replace"),file=sys.stderr)
        raise SystemExit(1) from None
    finally:
        command("rm","--force",name,check=False)
        remaining=command("ps","--all","--quiet","--filter",f"name=^{name}$").stdout.strip()
        if remaining:
            raise RuntimeError("temporary_database_cleanup_unverified")


if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument('--sandbox',action='store_true',help='Ejecutar fixture pública realmente en gVisor')
    args=parser.parse_args()
    # Nunca competir con el trabajador local B2 ni sus baterías.
    with worker_lock(DEFAULT_PATH) if args.sandbox else nullcontext():
        main(args.sandbox)
