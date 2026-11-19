"""Genera db/15_conectores_iniciales.sql desde el registro revisado (backend/connectors).

Así los hashes de la base de datos son exactamente los del código. Desde la raíz:
  .venv/Scripts/python.exe scripts/connectors/generate_seed_sql.py
backend/tests/test_connectors.py falla si el archivo no está al día con el registro.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from connectors import CONNECTORS, PROFILE  # noqa: E402
from connectors.base import canonical  # noqa: E402

DESTINO = ROOT / "db" / "15_conectores_iniciales.sql"


def literal(texto, etiqueta):
    """Cadena SQL con dollar quoting; la etiqueta no puede aparecer dentro del texto."""
    if f"${etiqueta}$" in texto:
        raise ValueError("etiqueta_en_contenido")
    return f"${etiqueta}${texto}${etiqueta}$"


def jsonb(valor):
    return literal(canonical(valor), "json") + "::jsonb"


def bloque(connector):
    d = connector.definition
    config = {
        "definition": {"format_version": 1, "definition_hash": connector.definition_hash,
                       "parameter_schema": d["parameter_schema"], "constraints": d["constraints"],
                       "resources": [], "required_permissions": [], "failure_cases": [], "examples": d["examples"]},
        "connector": {"key": connector.connector_key, "provider": connector.provider,
                      "provider_url": connector.provider_url, "hosts": connector.hosts, "seal": "conectada"},
    }
    cap, ver = connector.capability_id, connector.version_id
    return f"""
  -- {connector.connector_key} · {connector.provider}
  INSERT INTO public.capabilities(id, owner_id, name, description, category, input_type, output_type,
    visibility, status, input_schema, output_schema, config)
  VALUES ('{cap}'::uuid, propietario, {literal(d['name'], 'txt')}, {literal(d['description'], 'txt')},
    {literal(d['category'], 'txt')}, '{d['input_type']}', '{d['output_type']}', 'public', 'published',
    {jsonb(d['input_schema'])},
    {jsonb(d['output_schema'])},
    {jsonb(config)})
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO capacita_execution.versions(id, owner_id, capability_id, manifest, artifact_hash, definition_hash,
    profile, connector_key)
  VALUES ('{ver}'::uuid, propietario, '{cap}'::uuid,
    {jsonb(connector.manifest())},
    '{connector.artifact_hash}', '{connector.definition_hash}', '{PROFILE}', '{connector.connector_key}')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO capacita_execution.publications(version_id, owner_id, license)
  SELECT '{ver}'::uuid, propietario, 'MIT'
  WHERE NOT EXISTS (SELECT 1 FROM capacita_execution.publications WHERE version_id = '{ver}'::uuid AND active);
"""


def generar():
    cuerpo = "".join(bloque(connector) for connector in CONNECTORS)
    return f"""-- 15. GENERADO por scripts/connectors/generate_seed_sql.py: no editar a mano.
-- Aplicar una sola vez DESPUES de 14_connectors.sql (se puede repetir: no duplica filas).
-- Registra los conectores revisados como capacidades públicas publicadas cuyo autor es la cuenta
-- del trabajador (Capacita). Cualquier persona los ve en la comunidad y los puede usar como paso.
-- Una versión nueva de un conector (key@N) entra como fila nueva; las anteriores siguen igual.
BEGIN;
DO $$
DECLARE propietario uuid;
BEGIN
  SELECT w.user_id INTO propietario FROM capacita_execution.workers w
    JOIN public.profiles p ON p.id = w.user_id
    WHERE w.enabled ORDER BY w.user_id LIMIT 1;
  IF propietario IS NULL THEN
    RAISE EXCEPTION 'Falta la cuenta del trabajador en capacita_execution.workers (con perfil en public.profiles)';
  END IF;
{cuerpo}END $$;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): cada conector habilitado y publicado.
SELECT v.connector_key AS conector, v.status AS estado, p.active AS publicado
FROM capacita_execution.versions v
LEFT JOIN capacita_execution.publications p ON p.version_id = v.id AND p.active
WHERE v.connector_key IS NOT NULL ORDER BY 1;
"""


if __name__ == "__main__":
    DESTINO.write_text(generar(), encoding="utf-8", newline="\n")
    print(f"Escrito {DESTINO.relative_to(ROOT)} con {len(CONNECTORS)} conectores.")
