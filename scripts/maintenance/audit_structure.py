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
