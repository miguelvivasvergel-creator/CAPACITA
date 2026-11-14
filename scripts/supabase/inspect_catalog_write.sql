-- Diagnóstico de clone: solo metadatos, sin filas de usuarios ni cambios de permisos.
-- Ejecutar en el SQL Editor del mismo proyecto que utiliza la aplicación.

SELECT
  has_schema_privilege('authenticated', 'public', 'USAGE') AS schema_usage,
  has_table_privilege('authenticated', 'public.capabilities', 'SELECT') AS table_select,
  has_table_privilege('authenticated', 'public.capabilities', 'INSERT') AS table_insert,
  c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'capabilities';

-- INSERT puede concederse por columna en vez de para toda la tabla.
SELECT column_name, data_type, is_nullable, column_default,
       has_column_privilege(
         'authenticated', 'public.capabilities', column_name, 'INSERT'
       ) AS authenticated_can_insert
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'capabilities'
ORDER BY ordinal_position;

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'capabilities'
ORDER BY policyname;

SELECT con.conname, pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
WHERE con.conrelid = 'public.capabilities'::regclass
ORDER BY con.conname;
