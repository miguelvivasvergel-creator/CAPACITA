# Arranca Capacita para una demo local: sandbox (WSL), backend, trabajador y frontend.
# Cada proceso queda en su propia ventana; para apagar todo, cierra esas tres ventanas.
# No muestra claves, no instala nada y no cambia datos: solo comprueba y arranca.
#
#   powershell -ExecutionPolicy Bypass -File scripts\demo\iniciar-demo.ps1
#
# Salida 0: todo listo. Salida 1: algo no arrancó (el mensaje dice qué y qué hacer).
$ErrorActionPreference = 'Stop'
$raiz = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$python = Join-Path $raiz '.venv\Scripts\python.exe'
$distro = 'Ubuntu-24.04'
$socket = '/run/capacita-docker.sock'
$registro = Join-Path $env:TEMP 'capacita-demo'
$logTrabajador = Join-Path $registro 'trabajador.log'

function Write-Paso($texto) { Write-Host "`n▶ $texto" -ForegroundColor Cyan }
function Write-Bien($texto) { Write-Host "  ✓ $texto" -ForegroundColor Green }
function Write-Aviso($texto) { Write-Host "  ! $texto" -ForegroundColor Yellow }
function Stop-Demo($texto) { Write-Host "  ✗ $texto" -ForegroundColor Red; exit 1 }
function Test-Puerto($puerto) {
    [bool](Get-NetTCPConnection -LocalPort $puerto -State Listen -ErrorAction SilentlyContinue)
}
function Wait-Url($url, $segundos) {
    $limite = (Get-Date).AddSeconds($segundos)
    while ((Get-Date) -lt $limite) {
        try { Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true } catch { Start-Sleep -Seconds 1 }
    }
    return $false
}
function Start-Ventana($titulo, $carpeta, $comando) {
    $script = "`$Host.UI.RawUI.WindowTitle = 'Capacita · $titulo'; `$env:PYTHONIOENCODING = 'utf-8'; $comando"
    Start-Process powershell.exe -WorkingDirectory $carpeta -ArgumentList '-NoExit', '-NoProfile', '-Command', $script | Out-Null
}

Write-Paso 'Revisando lo necesario'
if (-not (Test-Path $python)) { Stop-Demo "Falta el entorno de Python (.venv). Créalo según el README." }
if (-not (Test-Path (Join-Path $raiz 'backend\.env'))) { Stop-Demo 'Falta backend\.env (claves). Copia backend\.env.example y complétalo.' }
if (-not (Test-Path (Join-Path $raiz 'node_modules'))) { Stop-Demo 'Faltan las dependencias del frontend: ejecuta npm install.' }
$libreGB = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 1)
if ($libreGB -lt 2) {
    Write-Aviso "Solo hay $libreGB GB de memoria libre. Cierra navegadores y programas que no uses: con poca memoria Windows puede cerrar los procesos a mitad de la demo."
} else { Write-Bien "Memoria libre: $libreGB GB" }

Write-Paso 'Sandbox (Docker + gVisor dentro de WSL)'
$listo = $false
for ($intento = 1; $intento -le 3 -and -not $listo; $intento++) {
    # Arrancar WSL levanta systemd y con él el Docker del sandbox; puede tardar unos segundos.
    & wsl.exe --distribution $distro --user root --exec /usr/bin/test -S $socket 2>$null
    if ($LASTEXITCODE -eq 0) { $listo = $true; break }
    & wsl.exe --distribution $distro --user root --exec /usr/bin/systemctl start docker.service 2>$null
    Start-Sleep -Seconds 4
}
if (-not $listo) { Stop-Demo "El Docker del sandbox no responde en $distro. Abre WSL ($distro) y revisa: systemctl status docker" }
$runtimes = & wsl.exe --distribution $distro --user root --exec /usr/bin/docker --host "unix://$socket" info --format '{{json .Runtimes}}' 2>$null
if ($LASTEXITCODE -ne 0 -or ($runtimes -join '') -notmatch '"runsc"') {
    Stop-Demo 'Docker responde pero gVisor (runsc) no está registrado. Ver scripts/maintenance/configure_sandbox_socket_wsl.sh'
}
Write-Bien 'Sandbox listo (gVisor registrado)'

Write-Paso 'Backend (http://127.0.0.1:8000)'
if (Test-Puerto 8000) { Write-Aviso 'El puerto 8000 ya está en uso: supongo que el backend ya corre y no abro otro.' }
else { Start-Ventana 'backend' (Join-Path $raiz 'backend') "& '$python' main.py" }
if (-not (Wait-Url 'http://127.0.0.1:8000/api/health' 60)) { Stop-Demo 'El backend no respondió en 60 s. Mira su ventana para ver el error.' }
Write-Bien 'Backend responde'

Write-Paso 'Trabajador (ejecuta las herramientas en el sandbox)'
New-Item -ItemType Directory -Force $registro | Out-Null
if (Test-Path $logTrabajador) { Remove-Item $logTrabajador -Force }
$yaCorre = Get-CimInstance Win32_Process -Filter "Name = 'python.exe'" | Where-Object { $_.CommandLine -match 'shared_worker\.py' }
if ($yaCorre) { Write-Aviso 'Ya hay un trabajador corriendo; no abro otro (solo puede haber uno).' }
else {
    Start-Ventana 'trabajador' $raiz "& '$python' -u backend\services\shared_worker.py 2>&1 | Tee-Object -FilePath '$logTrabajador'"
    $limite = (Get-Date).AddSeconds(90); $estado = $null
    while ((Get-Date) -lt $limite -and -not $estado) {
        Start-Sleep -Seconds 2
        if (Test-Path $logTrabajador) {
            $texto = (Get-Content $logTrabajador -Raw -ErrorAction SilentlyContinue) -as [string]
            if ($texto -match 'Trabajador compartido listo') { $estado = 'listo' }
            elseif ($texto -match 'no disponible') { $estado = 'fallo' }
        }
    }
    if ($estado -ne 'listo') {
        # Justo después de reiniciar, la reserva anterior puede seguir activa unos segundos.
        Stop-Demo 'El trabajador no quedó listo. Cierra su ventana, espera 30 s y vuelve a ejecutar este script.'
    }
    Write-Bien 'Trabajador listo; sandbox recuperado'
}

Write-Paso 'Frontend (http://localhost:5173)'
if (Test-Puerto 5173) { Write-Aviso 'El puerto 5173 ya está en uso: supongo que Vite ya corre.' }
else { Start-Ventana 'frontend' $raiz 'npm run dev' }
if (-not (Wait-Url 'http://localhost:5173' 60)) { Stop-Demo 'El frontend no respondió en 60 s. Mira su ventana para ver el error.' }
Write-Bien 'Frontend responde'

Start-Process 'http://localhost:5173'
Write-Host "`nTodo listo. Archivo de ejemplo para la demo: $(Join-Path $raiz 'docs\demo\ventas.xlsx')" -ForegroundColor Green
Write-Host 'Para apagar, cierra las ventanas «Capacita · backend / trabajador / frontend».'
exit 0
