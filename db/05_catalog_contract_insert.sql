-- Complemento de 04_catalog_draft_insert.sql para conservar contratos al clonar.
-- Basado en las columnas jsonb NOT NULL existentes, inspeccionadas el 14/11/2026.
-- No crea columnas, no cambia filas ni habilita ejecución o publicación.
-- Aplicar antes de reiniciar el backend con los modelos que incluyen contratos.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'capabilities' AND c.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'capabilities'
      AND policyname = 'capabilities_insert_own_private_draft'
      AND cmd = 'INSERT'
  ) OR EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'capabilities'
      AND cmd IN ('INSERT', 'ALL')
      AND policyname <> 'capabilities_insert_own_private_draft'
  ) THEN
    RAISE EXCEPTION 'Revisar RLS y aplicar primero 04_catalog_draft_insert.sql';
  END IF;
END
$$;

-- La política de 04 sigue exigiendo propietario autenticado, privado y draft.
GRANT INSERT (input_schema, output_schema)
ON public.capabilities TO authenticated;

COMMIT;

SELECT
  has_column_privilege('authenticated', 'public.capabilities', 'input_schema', 'INSERT')
    AS puede_insertar_contrato_entrada,
  has_column_privilege('authenticated', 'public.capabilities', 'output_schema', 'INSERT')
    AS puede_insertar_contrato_salida,
  has_column_privilege('authenticated', 'public.capabilities', 'uses_count', 'INSERT')
    AS puede_insertar_contador,
  has_table_privilege('authenticated', 'public.capabilities', 'UPDATE')
    AS puede_editar_tabla,
  has_table_privilege('authenticated', 'public.capabilities', 'DELETE')
    AS puede_borrar_tabla;
