"""Comprueba destinos de enlaces Markdown locales; sin red ni cambios de archivos."""
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]
LINKS = re.compile(r"\]\(([^)]+)\)")


def check():
    missing = []
    files = [ROOT / "README.md", ROOT / "AGENTS.md", *(ROOT / "docs").rglob("*.md")]
    for path in files:
        for match in LINKS.finditer(path.read_text(encoding="utf-8-sig")):
            target = match.group(1).strip().strip("<>")
            parsed = urlsplit(target)
            if not parsed.path or parsed.scheme or target.startswith("/"):
                continue
            resolved = (path.parent / unquote(parsed.path)).resolve()
            if not resolved.is_relative_to(ROOT) or not resolved.exists():
                missing.append((path.relative_to(ROOT).as_posix(), target))
    if missing:
        for path, target in missing:
            print(f"Enlace local sin destino: {path} -> {target}")
        return 1
    print(f"OK: enlaces Markdown locales comprobados en {len(files)} documentos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(check())
