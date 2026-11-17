#!/usr/bin/env bash
# Construye la imagen "caja de herramientas" en el daemon exclusivo de Capacita.
# Ejecutar como root dentro de Ubuntu 24.04 ya preparado (setup_sandbox_wsl.sh).
# Imprime el ID inmutable (sha256) que se fija en sandbox_runner.py y execution_engine.py.
set -euo pipefail
if [ "$(id -u)" != 0 ]; then
    echo 'Se requiere root dentro de Ubuntu.' >&2
    exit 1
fi
here="$(cd "$(dirname "$0")" && pwd)"
docker_cmd=(env -u DOCKER_HOST -u DOCKER_CONTEXT DOCKER_BUILDKIT=0 /usr/bin/docker --host unix:///run/capacita-docker.sock)
"${docker_cmd[@]}" build --pull=false --tag capacita-toolbox:v1 --file "$here/Dockerfile.toolbox" "$here" >&2
"${docker_cmd[@]}" image inspect --format '{{.Id}}' capacita-toolbox:v1
