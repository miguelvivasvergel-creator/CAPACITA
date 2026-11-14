"""Prepara backend/.env desde el .env del frontend sin sobrescribir valores."""
import json
from pathlib import Path
import sys

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parents[2]


def main():
    frontend = dotenv_values(ROOT / ".env")
    names = {"SUPABASE_URL": "VITE_SUPABASE_URL", "SUPABASE_ANON_KEY": "VITE_SUPABASE_ANON_KEY"}
    values = {backend: frontend.get(frontend_name) for backend, frontend_name in names.items()}
    if not all(values.values()) or "tu-proyecto" in values["SUPABASE_URL"]:
        print("Configura primero la URL y clave pública de Supabase en el .env del frontend.")
        return 1
    destination = ROOT / "backend" / ".env"
    if destination.exists():
        existing = dotenv_values(destination)
        if any(existing.get(key) != value for key, value in values.items()):
            print("Las configuraciones no coinciden. Revisa backend/.env; no se sobrescribió.")
            return 1
        print("Frontend y backend apuntan al mismo Supabase. No se modificaron archivos.")
        return 0
    with destination.open("x", encoding="utf-8") as target:
        target.write("# Configuración local; nunca subir este archivo a Git.\n")
        for key, value in values.items():
            target.write(f"{key}={json.dumps(value)}\n")
    print("backend/.env creado desde el frontend. No se muestran claves.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
