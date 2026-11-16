r"""Auditoría de imports locales del frontend. Solo lee archivos; no elimina nada.

Ejecutar desde la raíz: .venv\Scripts\python.exe scripts/maintenance/audit_structure.py
Los módulos fuera del recorrido de main.jsx requieren revisión humana: pueden
ser puntos de integración pendientes. No usar este informe como orden de borrado.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src"
IMPORTS = re.compile(r"(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['\"]([^'\"]+)['\"]")
ASSETS = re.compile(r"(?:url\(\s*|(?:src|href)\s*=\s*)['\"]?([^\s'\"\)<>]+)")
EXTENSIONS = (".js", ".jsx", ".css", ".json")
EXPECTED_INACTIVE = {
    "src/mocks/guiado.js": "fixtures de experiencia guiada; nunca fallback ni evidencia de ejecución real",
    "src/mocks/trabajo.js": "fixture visual de integración A/B3 y reparación; nunca fallback",
    "src/pages/Ejecutar.jsx": "pantalla heredada B conservada; App usa integración A con B3/B4",
    "src/services/ejecucion.js": "cliente heredado con fallback; fuera del recorrido activo",
    "src/mocks/runs.js": "fixture del cliente heredado, fuera del recorrido activo",
    "src/components/runs/EntradaEjecucion.jsx": "componente heredado B conservado, fuera del recorrido activo",
    "src/components/runs/EstadoBadge.jsx": "componente heredado B conservado, fuera del recorrido activo",
    "src/components/runs/PasosEjecucion.jsx": "componente heredado B conservado, fuera del recorrido activo",
    "src/components/runs/PermisosModal.jsx": "componente heredado B conservado, fuera del recorrido activo",
    "src/components/runs/ResultadoEjecucion.jsx": "componente heredado B conservado, fuera del recorrido activo",
    "src/mocks/planner.js": "fixture visual planner A; nunca fallback de IA",
    "src/mocks/dashboard.js": "fixture visual A4; métricas reales sin fallback",
    "src/mocks/busqueda.js": "fixture de pruebas interceptadas; no fallback de búsqueda",
    "src/services/dotnet.js": "cliente histórico conservado; búsqueda y perfil usan FastAPI",
    "src/mocks/perfil-real.js": "fixture de contrato para pruebas interceptadas, sin fallback",
    "src/mocks/profile.js": "fixture histórica; el perfil real no usa fallback",
    "src/components/profile/PerfilActividad.jsx": "visualización conservada hasta contrato de historial B",
    "src/mocks/inicio.js": "fixtures visuales de Inicio para pruebas interceptadas, sin fallback",
    "src/mocks/home.js": "dashboard histórico; Inicio usa catálogo autorizado",
    "src/mocks/users.js": "personas de ejemplo históricas, fuera de Inicio real",
    "src/components/common/PlanProposal.jsx": "propuesta histórica; no usar como planner real ni contrato B",
    "src/mocks/historial.js": "fixture visual B5; nunca fallback de red",
    "src/mocks/workflows.js": "fixture de diseño B4; nunca fallback de red",
    "src/mocks/versiones.js": "fixture visual B3, sin fallback de versiones o ejecuciones",
    "src/mocks/laboratorio.js": "casos visuales del laboratorio B, sin fallback de red",
    "src/mocks/candidatos.js": "fixture visual de candidatos sin fallback en el flujo real",
    "src/components/common/FileUpload.jsx": "componente conservado para integración de archivos de B",
    "src/pages/Capacidades/CrearCapacidad.jsx": "laboratorio de B, pendiente; no editar por esta limpieza",
    "src/mocks/catalog/capabilities.js": "fixture antigua sin fallback en catálogo real",
    "src/mocks/catalog/community.js": "fixture antigua sin fallback en comunidad real",
}


def resolve_local(parent, specifier):
    if specifier.startswith("/src/"):
        candidate = ROOT / specifier.lstrip("/")
    elif specifier.startswith("."):
        candidate = parent / specifier
    else:
        return None
    candidate = candidate.resolve()
    options = [candidate] if candidate.suffix else [candidate, *(candidate.with_suffix(ext) for ext in EXTENSIONS), *(candidate / f"index{ext}" for ext in EXTENSIONS)]
    return next((path for path in options if path.is_file()), False)


def audit():
    files = sorted(path for path in SOURCE.rglob("*") if path.is_file() and path.suffix in EXTENSIONS)
    graph, missing = {}, []
    for path in files:
        content = path.read_text(encoding="utf-8-sig")
        graph[path] = set()
        for match in IMPORTS.finditer(content):
            specifier = match.group(1)
            target = resolve_local(path.parent, specifier)
            if target is False:
                missing.append((path.relative_to(ROOT).as_posix(), specifier))
            elif target is not None:
                graph[path].add(target)
        for match in ASSETS.finditer(content):
            target = resolve_local(path.parent, match.group(1))
            if target:
                graph[path].add(target)
    pending, reached = [SOURCE / "main.jsx"], set()
    while pending:
        path = pending.pop()
        if path in reached:
            continue
        reached.add(path)
        pending.extend(graph.get(path, ()))
    print("Imports locales sin resolver:")
    for path, specifier in missing:
        print(f"  {path}: {specifier}")
    if not missing:
        print("  Ninguno")
    print("Archivos fuera del recorrido estático de src/main.jsx (revisar, no borrar automáticamente):")
    inactive = []
    for path in files:
        if path not in reached:
            relative = path.relative_to(ROOT).as_posix()
            inactive.append(relative)
            print(f"  {relative}" + (f" — {EXPECTED_INACTIVE[relative]}" if relative in EXPECTED_INACTIVE else " — SIN CLASIFICAR"))
    unexpected = [path for path in inactive if path not in EXPECTED_INACTIVE]
    if not unexpected:
        print("  Ningún archivo inactivo sin clasificar")
    print("Assets locales fuera del recorrido estático:")
    for path in sorted((SOURCE / "assets").rglob("*")):
        if path.is_file() and path not in reached:
            print(f"  {path.relative_to(ROOT).as_posix()}")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(audit())
