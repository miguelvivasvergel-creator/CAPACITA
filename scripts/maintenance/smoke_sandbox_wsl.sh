#!/usr/bin/env bash
# Prueba de infraestructura con código fijo mantenido por B, nunca candidatos.
# No habilita versiones ni acredita todos los controles del laboratorio.
set -euo pipefail
exec 9>/run/lock/capacita-sandbox.lock
flock --nonblock --conflict-exit-code 75 9
unset DOCKER_HOST DOCKER_CONTEXT
docker_local() { /usr/bin/docker --host unix:///run/capacita-docker.sock "$@"; }
docker_local info --format '{{json .Runtimes}}' | /usr/bin/python3 -c \
    'import json,sys; assert "runsc" in json.load(sys.stdin), "Falta runsc"'
image=python:3.12-slim
docker_local pull "$image"
# Fijar al digest resuelto para que ambas pruebas usen exactamente la misma imagen.
image_ref=$(docker_local image inspect "$image" --format '{{index .RepoDigests 0}}')
printf 'Imagen de prueba: %s\n' "$image_ref"
container_name="capacita-smoke-$(cat /proc/sys/kernel/random/uuid)"
cleanup() { docker_local rm -f "$container_name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
limits=(--runtime runsc --network none --read-only --cap-drop ALL
    --security-opt no-new-privileges --user 65534:65534
    --memory 256m --memory-swap 256m --cpus 0.5 --pids-limit 64
    --ulimit nproc=8:8 --ulimit nofile=64:64 --ulimit fsize=1048576:1048576
    --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m --log-driver none)
timeout --kill-after=5s 30s /usr/bin/docker --host unix:///run/capacita-docker.sock run \
    --name "$container_name" -i "${limits[@]}" "$image_ref" python -I -B - <<'PY'
import json
import os
from pathlib import Path
import socket

def run(inputs, parameters):
    return {"resultado": inputs["texto"].strip()}

result = run({"texto": "  Árbol  azul  "}, {})
assert result == {"resultado": "Árbol  azul"}
assert os.getuid() == 65534
assert not Path('/mnt/c').exists()
assert not Path('/var/run/docker.sock').exists()
try:
    Path('/must-not-write').write_text('blocked')
except OSError:
    pass
else:
    raise AssertionError('La raíz permite escritura')
Path('/tmp/reference.txt').write_text('temporal')
with socket.socket() as connection:
    connection.settimeout(1)
    try:
        connection.connect(('1.1.1.1', 443))
    except OSError:
        pass
    else:
        raise AssertionError('Red externa accesible')
print(json.dumps({"reference_output": result, "non_root": True,
    "root_write_denied": True, "external_network_denied": True,
    "temporary_write": True}, ensure_ascii=False))
PY
docker_local inspect "$container_name" --format \
    'Runtime={{.HostConfig.Runtime}} Network={{.HostConfig.NetworkMode}} Memory={{.HostConfig.Memory}} NanoCpus={{.HostConfig.NanoCpus}} Pids={{.HostConfig.PidsLimit}} Mounts={{json .Mounts}}'
cleanup
if docker_local inspect "$container_name" >/dev/null 2>&1; then
    echo 'Fallo: contenedor no eliminado' >&2
    exit 1
fi
echo 'OK: transformación y comprobaciones iniciales; limpieza confirmada.'
echo 'Pendiente: pruebas de exceso de memoria/CPU/procesos/salida, timeout y concurrencia.'
