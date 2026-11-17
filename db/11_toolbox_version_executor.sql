-- 11. Completa el SQL 10. Aplicar una sola vez DESPUES de 10_toolbox_profile.sql.
-- En Supabase existe la regla version_executor (experimento managed-tools, columna
-- managed_id; no está en este repositorio) que exigía perfil stdlib a toda versión de
-- la fábrica, y quedó instalada versions_profile_known de un intento del SQL 10.
-- La regla nueva acepta todo lo que aceptaba la anterior y además el perfil toolbox:
-- ninguna fila existente cambia ni puede incumplirla. managed-tools queda igual.
BEGIN;
ALTER TABLE capacita_execution.versions DROP CONSTRAINT IF EXISTS versions_profile_known;
ALTER TABLE capacita_execution.versions DROP CONSTRAINT version_executor;
ALTER TABLE capacita_execution.versions ADD CONSTRAINT version_executor CHECK (
  (managed_id IS NULL AND candidate_id IS NOT NULL
    AND profile IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1'))
  OR (managed_id IS NOT NULL AND candidate_id IS NULL AND profile = 'managed-tools-v1'));
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): deben quedar version_executor (con toolbox) y versions_status_check.
SELECT conname AS regla, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid = 'capacita_execution.versions'::regclass AND contype = 'c';
