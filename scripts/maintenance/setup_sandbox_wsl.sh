#!/usr/bin/env bash
# Ejecutar solo en Ubuntu destinado al sandbox, como administrador.
# Instala infraestructura; no ejecuta candidatos ni contenedores.
set -euo pipefail
if [ "$(id -u)" != 0 ]; then
    echo 'Se requiere root dentro de Ubuntu.' >&2
    exit 1
fi
. /etc/os-release
if [ "$ID" != ubuntu ] || [ "$VERSION_ID" != 24.04 ]; then
    echo 'Este procedimiento requiere Ubuntu 24.04.' >&2
    exit 1
fi
if [ "$(ps -p 1 -o comm=)" != systemd ]; then
    echo 'Se requiere systemd activo.' >&2
    exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends docker.io ca-certificates curl gnupg
key_path=/usr/share/keyrings/capacita-gvisor-archive-keyring.gpg
source_path=/etc/apt/sources.list.d/capacita-gvisor.list
if [ ! -e "$key_path" ]; then
    curl --fail --silent --show-error --location --max-time 60 https://gvisor.dev/archive.key |
        gpg --dearmor -o "$key_path"
    chmod 644 "$key_path"
fi
source_line="deb [arch=$(dpkg --print-architecture) signed-by=$key_path] https://storage.googleapis.com/gvisor/releases release main"
if [ -e "$source_path" ] && [ "$(cat "$source_path")" != "$source_line" ]; then
    echo 'El repositorio gVisor existente difiere; revisar manualmente.' >&2
    exit 1
fi
printf '%s\n' "$source_line" > "$source_path"
apt-get update
apt-get install -y --no-install-recommends runsc
systemctl start docker
# Algunos paquetes Docker de distribución requieren registro explícito.
if ! env -u DOCKER_HOST -u DOCKER_CONTEXT /usr/bin/docker --host unix:///var/run/docker.sock info --format '{{json .Runtimes}}' |
    /usr/bin/python3 -c 'import json,sys; sys.exit(0 if "runsc" in json.load(sys.stdin) else 1)'; then
    runsc install
    systemctl restart docker
fi
env -u DOCKER_HOST -u DOCKER_CONTEXT /usr/bin/docker --host unix:///var/run/docker.sock info --format '{{range $name, $runtime := .Runtimes}}{{$name}} {{end}}'
runsc --version
dpkg-query -W -f='${Package} ${Version}\n' docker.io runsc
