"""Controlador Linux de gVisor, stdlib. Entrada/salida JSON por stdin/stdout.

Ejecutar solo en Ubuntu preparado en bloque 1. No importa código en el host.
El protocolo del invitado es no confiable: la validación final ocurre en worker.
"""
import fcntl
import json
import os
import selectors
import subprocess
import sys
import tempfile
import time
from uuid import uuid4

IMAGE = "python@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b"
DOCKER = ["/usr/bin/docker", "--host", "unix:///run/capacita-docker.sock"]
ENV = {"PATH": "/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C.UTF-8"}
LABEL = "capacita.laboratory=block2"
LIMITS = {"timeout_seconds": 12, "output_bytes": 65536, "memory_bytes": 268435456,
          "cpus": 0.5, "guest_processes": 8, "host_tasks": 64,
          "temporary_bytes": 16777216, "network": "none", "uid": 65534}
HARNESS = '''import json, sys
request = json.loads(sys.stdin.buffer.read(196609))
namespace = {"__name__": "main"}
# Este exec ocurre exclusivamente dentro del invitado gVisor.
exec(compile(request["source"], "main.py", "exec"), namespace)
result = namespace["run"](request["inputs"], request["parameters"])
if type(result) is not dict:
    raise TypeError("output_not_object")
print(json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(",", ":")))
'''


def docker(*args, check=True):
    return subprocess.run(DOCKER + list(args), env=ENV, capture_output=True,
                          timeout=15, check=check)


def remove(name):
    docker("rm", "--force", name)
    if docker("ps", "--all", "--quiet", "--filter", f"name=^/{name}$").stdout.strip():
        raise RuntimeError("cleanup_failed")


def recover_orphans():
    names = docker("ps", "--all", "--format", "{{.Names}}", "--filter", f"label={LABEL}").stdout.decode().splitlines()
    for name in names:
        # No tocar contenedores ajenos aunque compartan una etiqueta accidental.
        if not name.startswith("capacita-lab-"):
            raise RuntimeError("unexpected_container")
        remove(name)


def run(request):
    name = "capacita-lab-" + str(uuid4())
    output = bytearray()
    process = None
    created = False
    started = time.monotonic()
    result = {"termination": "infrastructure_error", "cleanup_verified": False}
    try:
        # Marcar antes de create permite limpiar incluso si el cliente vence tras crear.
        created = True
        docker("create", "--name", name, "--label", LABEL, "--interactive",
               "--pull=never", "--runtime=runsc", "--network=none", "--read-only",
               "--cap-drop=ALL", "--security-opt=no-new-privileges", "--user=65534:65534",
               "--memory=256m", "--memory-swap=256m", "--cpus=0.5", "--pids-limit=64",
               "--ulimit=nproc=8:8", "--ulimit=nofile=64:64", "--ulimit=fsize=1048576:1048576",
               "--tmpfs=/tmp:rw,noexec,nosuid,nodev,size=16m", "--log-driver=none",
               IMAGE, "python", "-I", "-B", "-c", HARNESS)
        info = json.loads(docker("inspect", name).stdout)[0]
        host = info["HostConfig"]
        if (host["Runtime"] != "runsc" or host["NetworkMode"] != "none"
                or not host["ReadonlyRootfs"] or info["Mounts"]
                or info["Config"]["User"] != "65534:65534"
                or host["Memory"] != LIMITS["memory_bytes"]
                or host["MemorySwap"] != LIMITS["memory_bytes"]
                or host["NanoCpus"] != 500000000 or host["PidsLimit"] != 64):
            raise RuntimeError("unexpected_profile")
        with tempfile.TemporaryFile() as incoming:
            incoming.write(json.dumps(request, ensure_ascii=False, allow_nan=False).encode())
            incoming.seek(0)
            process = subprocess.Popen(DOCKER + ["start", "--attach", "--interactive", name],
                                       stdin=incoming, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=ENV)
            deadline = time.monotonic() + LIMITS["timeout_seconds"]
            reason = "exited"
            with selectors.DefaultSelector() as selector:
                selector.register(process.stdout, selectors.EVENT_READ)
                while True:
                    if time.monotonic() >= deadline:
                        reason = "timeout"
                        break
                    for key, _ in selector.select(0.05):
                        chunk = os.read(key.fd, 8192)
                        if not chunk:
                            selector.unregister(key.fileobj)
                            continue
                        remaining = LIMITS["output_bytes"] - len(output)
                        output.extend(chunk[:remaining])
                        if len(chunk) > remaining:
                            reason = "output_limit"
                            break
                    if reason == "output_limit" or (process.poll() is not None and not selector.get_map()):
                        break
            if reason != "exited":
                process.kill()
                process.wait(timeout=5)
                process.stdout.close()
                docker("kill", name, check=False)
            process.wait(timeout=5)
        state = json.loads(docker("inspect", name).stdout)[0]["State"]
        if state["Running"]:
            raise RuntimeError("container_still_running")
        result = {"termination": reason, "exit_code": state["ExitCode"],
                  "oom_killed": state["OOMKilled"], "output_bytes": len(output),
                  "elapsed_seconds": round(time.monotonic() - started, 3),
                  "output": output.decode("utf-8", errors="replace")}
    except Exception:
        # Nunca devolver excepciones que contengan código, comandos o rutas locales.
        result = {"termination": "infrastructure_error"}
    finally:
        if process is not None:
            if process.poll() is None:
                process.kill()
            process.wait(timeout=5)
            process.stdout.close()
        if created:
            try:
                # Si create no llegó a crear nada, verificar ausencia igualmente.
                existing = docker("ps", "--all", "--quiet", "--filter", f"name=^/{name}$").stdout.strip()
                if existing:
                    remove(name)
                result["cleanup_verified"] = True
            except Exception:
                result = {"termination": "cleanup_error", "cleanup_verified": False}
    return result | {"runtime": "runsc", "image": IMAGE, "limits": LIMITS}


def main():
    try:
        with open("/run/lock/capacita-sandbox.lock", "a") as lock:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                print(json.dumps({"termination": "sandbox_busy", "cleanup_verified": False}))
                return 75
            # Recuperar solo contenedores de este laboratorio bajo lock compartido B1/B2.
            recover_orphans()
            if sys.argv[1:] == ["--recover"]:
                print(json.dumps({"recovery_verified": True}))
                return 0
            if sys.argv[1:]:
                raise ValueError("arguments")
            raw = sys.stdin.buffer.read(196609)
            if len(raw) > 196608:
                raise ValueError("payload_size")
            request = json.loads(raw)
            if set(request) != {"source", "inputs", "parameters"}:
                raise ValueError("payload_fields")
            if not isinstance(request["source"], str) or len(request["source"].encode()) > 65536:
                raise ValueError("source_size")
            result = run(request)
            result["docker_server"] = docker("version", "--format", "{{.Server.Version}}").stdout.decode().strip()
            result["runsc_version"] = subprocess.check_output(
                ["/usr/bin/runsc", "--version"], env=ENV, timeout=5).decode().strip()
            print(json.dumps(result, ensure_ascii=False, allow_nan=False))
            return 0
    except Exception:
        print(json.dumps({"termination": "infrastructure_error", "cleanup_verified": False}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
