-- Preparado a partir de grants, columnas y políticas aportados el 14/11/2026.
-- Ejecutar en el mismo proyecto Supabase de Capacita, desde SQL Editor.
-- Autoriza INSERT de borradores privados propios. No habilita ejecución.
-- Conserva SELECT y no concede UPDATE, DELETE ni publicación.

BEGIN;

-- Detenerse si el estado de políticas cambió desde la inspección.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'capabilities'
      AND cmd IN ('INSERT', 'ALL')
      AND policyname <> 'capabilities_insert_own_private_draft'
  ) THEN
    RAISE EXCEPTION 'Hay políticas de escritura no inspeccionadas; revisar antes de continuar';
  END IF;
END
$$;

ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS capabilities_insert_own_private_draft ON public.capabilities;
CREATE POLICY capabilities_insert_own_private_draft
ON public.capabilities
FOR INSERT TO authenticated
WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND visibility = 'private'
  AND status = 'draft'
  AND uses_count = 0
  AND clones_count = 0
  AND (
    cloned_from IS NULL
    OR EXISTS (
      SELECT 1 FROM public.capabilities AS source
      WHERE source.id = capabilities.cloned_from
        AND (
          source.owner_id = (SELECT auth.uid())
          OR (source.visibility = 'public' AND source.status = 'published')
        )
    )
  )
);

-- Solo columnas que envía actualmente el backend al crear/clonar.
-- Contadores, fechas, embedding y contratos no se conceden: usan defaults.
GRANT INSERT (
  id, owner_id, name, description, category, input_type, output_type,
  permissions, adapter_key, config, visibility, status, version, cloned_from
) ON public.capabilities TO authenticated;

COMMIT;

-- Verificación administrativa sin leer filas ni crear capacidades.
SELECT
  has_column_privilege('authenticated', 'public.capabilities', 'name', 'INSERT')
    AS puede_insertar_nombre,
  has_column_privilege('authenticated', 'public.capabilities', 'owner_id', 'INSERT')
    AS puede_insertar_propietario,
  has_column_privilege('authenticated', 'public.capabilities', 'uses_count', 'INSERT')
    AS puede_insertar_contador,
  has_table_privilege('authenticated', 'public.capabilities', 'UPDATE')
    AS puede_editar_tabla,
  has_table_privilege('authenticated', 'public.capabilities', 'DELETE')
    AS puede_borrar_tabla;

-- Tras aplicarlo: clonar una vez y comprobar el borrador en Mis capacidades.
-- Falta verificar con dos cuentas que la copia privada no sea accesible a otra.
