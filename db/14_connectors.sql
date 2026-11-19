-- 14. Conectores (fase 1 del banco de APIs). Aplicar una sola vez DESPUES de 07, 08, 09 y 11.
-- Un conector es una versión sin candidato ni build: la ejecuta el broker del trabajador
-- (backend/services/connector_runtime.py), nunca el sandbox, y el trabajador compara su
-- manifiesto con el registro revisado del repositorio (backend/connectors/) antes de usarlo.
-- No cambia ninguna fila existente ni las reglas de las versiones de la fábrica.
-- Después aplicar 15_conectores_iniciales.sql.
BEGIN;
ALTER TABLE capacita_execution.versions ALTER COLUMN candidate_id DROP NOT NULL;
ALTER TABLE capacita_execution.versions ALTER COLUMN build_id DROP NOT NULL;
ALTER TABLE capacita_execution.versions ADD COLUMN IF NOT EXISTS connector_key text;
CREATE UNIQUE INDEX IF NOT EXISTS versions_connector_key
  ON capacita_execution.versions(connector_key) WHERE connector_key IS NOT NULL;

-- version_executor (SQL 11) admite fábrica y managed-tools; se le suma el conector. Las dos
-- ramas anteriores quedan idénticas, así que ninguna fila existente puede incumplirla.
DO $$
DECLARE managed boolean := EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema='capacita_execution' AND table_name='versions' AND column_name='managed_id');
BEGIN
  ALTER TABLE capacita_execution.versions DROP CONSTRAINT IF EXISTS version_executor;
  IF managed THEN
    ALTER TABLE capacita_execution.versions ADD CONSTRAINT version_executor CHECK (
      (managed_id IS NULL AND connector_key IS NULL AND candidate_id IS NOT NULL
        AND profile IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1'))
      OR (managed_id IS NOT NULL AND connector_key IS NULL AND candidate_id IS NULL AND profile = 'managed-tools-v1')
      OR (managed_id IS NULL AND connector_key IS NOT NULL AND candidate_id IS NULL AND build_id IS NULL
        AND profile = 'connector-v1'));
  ELSE
    ALTER TABLE capacita_execution.versions ADD CONSTRAINT version_executor CHECK (
      (connector_key IS NULL AND candidate_id IS NOT NULL AND build_id IS NOT NULL
        AND profile IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1'))
      OR (connector_key IS NOT NULL AND candidate_id IS NULL AND build_id IS NULL AND profile = 'connector-v1'));
  END IF;
END $$;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): version_executor debe incluir connector-v1.
SELECT conname AS regla, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'capacita_execution.versions'::regclass AND contype = 'c';
