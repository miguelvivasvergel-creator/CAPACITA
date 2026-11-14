-- Solo inspección administrativa: sin cambios de esquema ni lectura de filas de usuarios.
-- Ejecutar en el proyecto correcto antes de preparar cualquier migración.

SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'capabilities')
ORDER BY table_name, ordinal_position;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('profiles', 'capabilities');

SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('profiles', 'capabilities')
ORDER BY tablename, policyname;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name IN ('profiles', 'capabilities')
ORDER BY table_name, grantee, privilege_type;

SELECT c.relname AS table_name, con.conname,
       pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint AS con
JOIN pg_class AS c ON c.oid = con.conrelid
JOIN pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname IN ('profiles', 'capabilities')
ORDER BY c.relname, con.conname;
