-- Preparado, NO aplicado automáticamente. Revisar con Fahida antes de usar.
-- Requiere public.profiles y public.capabilities del proyecto real (no el esquema histórico 01).
-- Crea almacenamiento privado e inmutable de candidatos; no habilita ejecución/publicación.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.capability_candidates') IS NOT NULL THEN
    RAISE EXCEPTION 'La tabla de candidatos ya existe; inspeccionar antes de aplicar otro esquema';
  END IF;
  IF to_regclass('public.profiles') IS NULL OR to_regclass('public.capabilities') IS NULL THEN
    RAISE EXCEPTION 'Revisar esquema real: faltan profiles o capabilities';
  END IF;
END
$$;

CREATE TABLE public.capability_candidates (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  capability_id uuid NOT NULL REFERENCES public.capabilities(id) ON DELETE CASCADE,
  manifest jsonb NOT NULL,
  provider text NOT NULL CHECK (provider = 'gemini'),
  model text NOT NULL CHECK (length(model) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT candidate_manifest_object CHECK (coalesce((
    jsonb_typeof(manifest) = 'object'
    AND manifest ?& ARRAY['candidate_id', 'capability_id', 'status', 'implementation_verified', 'artifact_hash', 'definition_hash', 'definition', 'proposal', 'runtime', 'entrypoint', 'format_version']
    AND manifest->>'candidate_id' = id::text
    AND manifest->>'capability_id' = capability_id::text
    AND manifest->>'status' = 'draft'
    AND manifest->'implementation_verified' = 'false'::jsonb
    AND manifest->>'runtime' = 'python'
    AND manifest->>'entrypoint' = 'main.run'
    AND manifest->'format_version' = '1'::jsonb
    AND octet_length(manifest::text) <= 200000
  ), false))
);

CREATE INDEX capability_candidates_owner_page_idx ON public.capability_candidates (owner_id, id);
CREATE INDEX capability_candidates_capability_page_idx ON public.capability_candidates (capability_id, id);
ALTER TABLE public.capability_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capability_candidates FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.capability_candidates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.capability_candidates TO authenticated;
GRANT INSERT (id, owner_id, capability_id, manifest, provider, model)
ON public.capability_candidates TO authenticated;

CREATE POLICY candidates_select_own ON public.capability_candidates
FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));
CREATE POLICY candidates_insert_own ON public.capability_candidates
FOR INSERT TO authenticated WITH CHECK (
  owner_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.capabilities AS source
    WHERE source.id = capability_id
      AND source.owner_id = (SELECT auth.uid())
      AND source.visibility = 'private' AND source.status = 'draft'
  )
);

COMMIT;

-- Comprobación administrativa de permisos, sin leer datos ni generar código.
SELECT
  has_table_privilege('authenticated', 'public.capability_candidates', 'SELECT') AS lectura,
  has_column_privilege('authenticated', 'public.capability_candidates', 'manifest', 'INSERT') AS insertar,
  has_table_privilege('authenticated', 'public.capability_candidates', 'UPDATE') AS editar,
  has_table_privilege('authenticated', 'public.capability_candidates', 'DELETE') AS borrar;
-- Esperado: true, true, false, false. Aún requiere matriz RLS real con dos cuentas.
