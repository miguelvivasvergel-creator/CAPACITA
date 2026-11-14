# Diagnóstico de solo lectura. No crea contenedores ni ejecuta candidatos.
# Exit 0: prerrequisitos detectados (aislamiento aún NO probado).
# Exit 2: infraestructura pendiente; Exit 3: Docker inaccesible.
$ErrorActionPreference = 'Stop'
$diagnostic = [ordered]@{
    schema_version = 1
    docker_available = $false
    server_version = $null
    os_type = $null
    runtimes = @()
    gvisor_registered = $false
    isolation_verified = $false
    candidate_execution_allowed = $false
    status = 'docker_unavailable'
}
$diagnosticExitCode = 3
try {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        throw 'Docker no disponible'
    }
    # No imprimir configuración Docker: puede contener credenciales de registros.
    $serverVersion = & docker version --format '{{.Server.Version}}' 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Servidor Docker inaccesible' }
    $runtimeInfo = & docker info --format '{{json .Runtimes}}' 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Runtimes inaccesibles' }
    $osType = & docker info --format '{{.OSType}}' 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Sistema del servidor inaccesible' }
    $runtimeNames = @((ConvertFrom-Json ($runtimeInfo -join '')).PSObject.Properties.Name)
    $diagnostic.docker_available = $true
    $diagnostic.server_version = ($serverVersion -join '').Trim()
    $diagnostic.os_type = ($osType -join '').Trim()
    $diagnostic.runtimes = $runtimeNames
    $diagnostic.gvisor_registered = $runtimeNames -contains 'runsc'
    $diagnostic.status = 'reinforced_runtime_missing'
    $diagnosticExitCode = 2
    if ($diagnostic.os_type -eq 'linux' -and $diagnostic.gvisor_registered) {
        $diagnostic.status = 'prerequisites_detected_isolation_tests_pending'
        $diagnosticExitCode = 0
    }
} catch {
    # Errores sanitizados; no imprimir objetos de configuración ni respuestas completas.
    $diagnostic.status = 'docker_unavailable'
}
$diagnostic | ConvertTo-Json -Depth 3
exit $diagnosticExitCode
