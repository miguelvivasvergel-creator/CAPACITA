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
# Uso: build_toolbox_image_wsl.sh [v1|v2]  (v1 por defecto: la imagen original no cambia)
version="${1:-v1}"
case "$version" in
    v1) dockerfile="$here/Dockerfile.toolbox" ;;
    v2) dockerfile="$here/Dockerfile.toolbox2" ;;
    *) echo 'Versión desconocida: usa v1 o v2.' >&2; exit 1 ;;
esac
docker_cmd=(env -u DOCKER_HOST -u DOCKER_CONTEXT DOCKER_BUILDKIT=0 /usr/bin/docker --host unix:///run/capacita-docker.sock)
"${docker_cmd[@]}" build --pull=false --tag "capacita-toolbox:$version" --file "$dockerfile" "$here" >&2
"${docker_cmd[@]}" image inspect --format '{{.Id}}' "capacita-toolbox:$version"
