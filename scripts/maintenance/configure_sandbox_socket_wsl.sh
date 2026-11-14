#!/usr/bin/env bash
# Daemon propio de Ubuntu con socket exclusivo; no modifica Docker Desktop.
set -euo pipefail
exec 9>/run/lock/capacita-sandbox.lock
flock --nonblock --conflict-exit-code 75 9
if [ "$(id -u)" != 0 ] || [ "$(ps -p 1 -o comm=)" != systemd ]; then
    echo 'Se requiere root y systemd dentro de Ubuntu.' >&2
    exit 1
fi
. /etc/os-release
if [ "$ID" != ubuntu ] || [ "$VERSION_ID" != 24.04 ]; then
    echo 'Se requiere Ubuntu 24.04.' >&2
    exit 1
fi
target=/etc/systemd/system/docker.service.d/capacita-socket.conf
expected='[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H unix:///run/capacita-docker.sock --containerd=/run/containerd/containerd.sock'
if [ -e "$target" ] && [ "$(cat "$target")" != "$expected" ]; then
    echo 'Configuración de Capacita diferente; revisar antes de sobrescribir.' >&2
    exit 1
fi
mkdir -p /etc/systemd/system/docker.service.d
printf '%s\n' "$expected" > "$target"
systemctl daemon-reload
systemctl restart docker.service
env -u DOCKER_HOST -u DOCKER_CONTEXT /usr/bin/docker --host unix:///run/capacita-docker.sock info --format '{{json .Runtimes}}' |
    /usr/bin/python3 -c 'import json,sys; assert "runsc" in json.load(sys.stdin), "Falta runsc en el Engine de Ubuntu"'
env -u DOCKER_HOST -u DOCKER_CONTEXT /usr/bin/docker --host unix:///run/capacita-docker.sock version --format '{{.Server.Version}}'
