"""Pruebas reales de infraestructura: solo fixtures fijas, nunca candidatos.

Ejecutar dentro de Ubuntu/WSL. No es una API ni habilita versiones del producto.
Usa solo stdlib; el código de prueba se ejecuta exclusivamente dentro de runsc.
"""
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import selectors
import subprocess
import sys
import time
import uuid

IMAGE = "python@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b"
LOCK = "/run/lock/capacita-sandbox.lock"
OUTPUT_LIMIT = 65536
ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C.UTF-8"}
DOCKER = ["/usr/bin/docker", "--host", "unix:///var/run/docker.sock"]


def docker(*args):
    return subprocess.run(DOCKER + list(args), env=ENV, capture_output=True,
                          timeout=20, check=True).stdout


def acquire():
    handle = open(LOCK, "a")
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close()
        raise
    return handle


def sample_cgroup(name):
    """Leer límites/contadores del kernel anfitrión, no del invitado gVisor."""
    info = json.loads(docker("inspect", name))[0]
    pid = info["State"]["Pid"]
    if not pid:
        return {}
    try:
        entry = Path(f"/proc/{pid}/cgroup").read_text().splitlines()
        relative = next(line[3:] for line in entry if line.startswith("0::"))
        root = Path("/sys/fs/cgroup")
        group = (root / relative.lstrip("/")).resolve()
        if not group.is_relative_to(root):
            raise RuntimeError("Ruta cgroup fuera del árbol esperado")
        return {key: (group / key).read_text().strip()
                for key in ("cpu.max", "cpu.stat", "memory.max", "pids.max")}
    except (FileNotFoundError, ProcessLookupError, StopIteration):
        return {}


def run_fixture(source, seconds=12, monitor=False):
    name = "capacita-verify-" + str(uuid.uuid4())
    created = False
    process = None
    started = time.monotonic()
    output = bytearray()
    reason = "exited"
    cgroup = {}
    try:
        docker("create", "--name", name, "--pull=never", "--runtime=runsc",
               "--network=none", "--read-only", "--cap-drop=ALL",
               "--security-opt=no-new-privileges", "--user=65534:65534",
               "--memory=256m", "--memory-swap=256m", "--cpus=0.5",
               "--pids-limit=64", "--ulimit=nproc=8:8", "--ulimit=nofile=64:64",
               "--ulimit=fsize=1048576:1048576",
               "--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=16m", "--log-driver=none",
               IMAGE, "python", "-I", "-B", "-c", source)
        created = True
        process = subprocess.Popen(DOCKER + ["start", "--attach", name], env=ENV,
                                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        selector = selectors.DefaultSelector()
        selector.register(process.stdout, selectors.EVENT_READ)
        deadline = time.monotonic() + seconds
        next_sample = time.monotonic() + 1
        try:
            while True:
                if time.monotonic() >= deadline:
                    reason = "timeout"
                    break
                for key, _ in selector.select(timeout=0.1):
                    chunk = os.read(key.fd, 8192)
                    if not chunk:
                        selector.unregister(key.fileobj)
                    else:
                        remaining = OUTPUT_LIMIT - len(output)
                        output.extend(chunk[:remaining])
                        if len(chunk) > remaining:
                            reason = "output_limit"
                            break
                if reason == "output_limit":
                    break
                if monitor and time.monotonic() >= next_sample:
                    sample = sample_cgroup(name)
                    if sample:
                        cgroup = sample
                    next_sample = time.monotonic() + 0.5
                if process.poll() is not None and not selector.get_map():
                    break
        finally:
            selector.close()
        if reason != "exited":
            # Desconectar primero el cliente attach: una salida masiva puede llenar
            # su pipe y bloquear la terminación si dejamos de consumirla.
            process.kill()
            process.wait(timeout=5)
            process.stdout.close()
            docker("kill", name)
        process.wait(timeout=10)
        info = json.loads(docker("inspect", name))[0]
        state = info["State"]
        if state["Running"]:
            raise RuntimeError("El contenedor no terminó")
        result = {"termination": reason, "exit_code": state["ExitCode"],
                  "oom_killed": state["OOMKilled"], "output_bytes": len(output),
                  "elapsed_seconds": round(time.monotonic() - started, 3),
                  "host_cgroup": cgroup, "output": output.decode("utf-8", errors="replace")}
    finally:
        if process is not None and process.poll() is None:
            process.kill()
            process.wait(timeout=5)
            process.stdout.close()
        if created:
            # Nombre aleatorio creado por esta llamada; nunca eliminar otros trabajos.
            docker("rm", "--force", name)
            remaining = docker("ps", "--all", "--quiet", "--filter", f"name=^/{name}$")
            if remaining.strip():
                raise RuntimeError("Falló la limpieza del contenedor propio")
        if process is not None:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=10)
            process.stdout.close()
    result["cleanup_verified"] = True
    return result


REFERENCE = '''
import json, os, socket
from pathlib import Path
def run(inputs, parameters):
    return {"resultado": inputs["texto"].strip()}
assert run({"texto":"  Árbol  azul  "}, {}) == {"resultado":"Árbol  azul"}
assert os.getuid() == 65534
assert "CAPACITA_TEST_SECRET" not in os.environ
assert not Path("/mnt/c").exists()
assert not Path("/var/run/docker.sock").exists()
assert not Path("/tmp/capacita-marker").exists()
Path("/tmp/capacita-marker").write_text("private-temporary")
try:
    Path("/blocked").write_text("blocked")
except OSError as error:
    assert error.errno in (13, 30)
else:
    raise AssertionError("Raíz escribible")
with socket.socket() as connection:
    connection.settimeout(1)
    try:
        connection.connect(("1.1.1.1", 443))
    except OSError:
        pass
    else:
        raise AssertionError("Red externa accesible")
print(json.dumps({"resultado":"Árbol  azul", "isolation_checks":True}, ensure_ascii=False))
'''

CPU = '''
import json, time
started = time.monotonic()
cpu = time.process_time()
while time.monotonic() - started < 4:
    pass
print(json.dumps({"wall":time.monotonic()-started,"cpu":time.process_time()-cpu}))
'''

PROCESSES = '''
import errno, json, os, signal
children = []
blocked = False
try:
    for _ in range(16):
        try:
            pid = os.fork()
            if pid == 0:
                signal.pause()
                os._exit(0)
            children.append(pid)
        except OSError as error:
            assert error.errno == errno.EAGAIN
            blocked = True
            break
finally:
    for child in children:
        os.kill(child, signal.SIGTERM)
    for child in children:
        os.waitpid(child, 0)
assert blocked, "No se limitó el número de procesos invitados"
assert len(children) <= 7
print(json.dumps({"guest_process_limit_enforced":True,"children_started":len(children)}))
'''


def main():
    if sys.argv[1:] == ["--probe-lock"]:
        try:
            with acquire():
                return 0
        except BlockingIOError:
            return 75
    report = {"format_version": 1, "image": IMAGE, "tests": [],
              "started_at": datetime.now(timezone.utc).isoformat(),
              "scope": "local_infrastructure_fixed_fixtures_only",
              "candidate_execution_enabled": False}
    def record(name, result, passed):
        # Solo fixtures públicas. No conservar salida masiva de la prueba de límite.
        if result.get("termination") == "output_limit":
            result.pop("output", None)
        report["tests"].append({"name": name, "passed": bool(passed), **result})
        print(f"{'PASS' if passed else 'FAIL'} {name}", flush=True)

    try:
        with acquire():
            os.environ["CAPACITA_TEST_SECRET"] = "public-canary-not-a-real-secret"
            assert "runsc" in json.loads(docker("info", "--format", "{{json .Runtimes}}"))
            docker("image", "inspect", IMAGE)
            report["docker_server"] = docker("version", "--format", "{{.Server.Version}}").decode().strip()
            report["runsc_version"] = subprocess.check_output(
                ["/usr/bin/runsc", "--version"], env=ENV, timeout=5).decode().strip()
            contender = subprocess.run([sys.executable, __file__, "--probe-lock"],
                                       env=ENV, capture_output=True, timeout=5)
            record("single_admission", {"contender_exit": contender.returncode}, contender.returncode == 75)
            for index in (1, 2):
                result = run_fixture(REFERENCE)
                record(f"isolation_and_fresh_temporary_{index}", result,
                       result["exit_code"] == 0 and result["termination"] == "exited")
            result = run_fixture("while True: pass", seconds=3)
            record("infinite_loop_timeout", result,
                   result["termination"] == "timeout" and result["exit_code"] != 0)
            result = run_fixture("import os\nwhile True: os.write(1, b'x' * 8192)")
            record("bounded_output", result, result["termination"] == "output_limit"
                   and result["output_bytes"] == OUTPUT_LIMIT)
            result = run_fixture("items=[]\nwhile True: items.append(bytearray(8*1024*1024))")
            record("memory_exhaustion", result, result["oom_killed"] and result["exit_code"] != 0)
            result = run_fixture(CPU, monitor=True)
            stats = dict(line.split() for line in result["host_cgroup"].get("cpu.stat", "").splitlines())
            record("cpu_throttling", result, result["exit_code"] == 0
                   and result["host_cgroup"].get("cpu.max") == "50000 100000"
                   and int(stats.get("nr_throttled", "0")) > 0)
            result = run_fixture(PROCESSES)
            record("guest_process_limit", result, result["exit_code"] == 0)
            result = run_fixture("raise RuntimeError('reference_failure')")
            record("failure_and_cleanup", result, result["exit_code"] == 1)
        # El lock debe liberarse después de la suite y permitir un nuevo trabajo.
        with acquire():
            record("admission_released", {}, True)
    except BlockingIOError:
        print("Sandbox ocupado; no se inició otro trabajo.", file=sys.stderr)
        return 75
    except Exception as error:
        # No imprimir comandos/entorno/objetos que pudieran incluir información local.
        detail = {"error_type": type(error).__name__}
        if isinstance(error, (subprocess.TimeoutExpired, subprocess.CalledProcessError)):
            detail["operation"] = error.cmd[3] if error.cmd[:3] == DOCKER else "host_command"
        record("infrastructure_error", detail, False)
    report["passed"] = bool(report["tests"]) and all(test["passed"] for test in report["tests"])
    target = Path(__file__).resolve().parents[2] / "output/sandbox/block1-latest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Reporte local: {target}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
