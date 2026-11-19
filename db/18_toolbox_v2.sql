-- 18. Caja de herramientas v2 (fase 4). Aplicar una sola vez DESPUES de 10, 11 y 14.
-- Permite habilitar versiones probadas con el perfil gvisor-python-toolbox-v2 (pandas, matplotlib,
-- rembg, Tesseract). Las versiones existentes (stdlib, toolbox-v1, conectores, managed-tools) no
-- cambian: cada una sigue ejecutándose con la imagen de su propio perfil.
BEGIN;
CREATE OR REPLACE FUNCTION public.execution_enable(p_candidate_id uuid,p_build_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b capacita_execution.jobs; v capacita_execution.versions; c public.capability_candidates;
BEGIN
 PERFORM pg_advisory_xact_lock(73426,3);
 SELECT * INTO c FROM public.capability_candidates WHERE id=p_candidate_id AND owner_id=auth.uid();
 SELECT * INTO b FROM capacita_execution.jobs WHERE id=p_build_id AND owner_id=auth.uid()
   AND candidate_id=p_candidate_id AND kind='build';
 IF c.id IS NULL OR b.id IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 IF b.status<>'passed' OR b.report->'passed' IS DISTINCT FROM 'true'::jsonb
   OR b.payload->'manifest' IS DISTINCT FROM c.manifest
   OR b.report->>'artifact_hash' IS DISTINCT FROM b.artifact_hash
   OR b.report->>'profile' IS NULL
   OR b.report->>'profile' NOT IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1','gvisor-python-toolbox-v2')
   OR b.report->>'candidate_id' IS DISTINCT FROM c.id::text
   OR b.report->>'definition_hash' IS DISTINCT FROM c.manifest->>'definition_hash'
 THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='evidence_required'; END IF;
 SELECT * INTO v FROM capacita_execution.versions WHERE candidate_id=p_candidate_id;
 IF FOUND THEN
   IF v.status<>'enabled' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='disabled'; END IF;
   RETURN capacita_execution.public_version(v);
 END IF;
 INSERT INTO capacita_execution.versions(owner_id,capability_id,candidate_id,build_id,manifest,artifact_hash,definition_hash,profile)
 VALUES(auth.uid(),c.capability_id,c.id,b.id,c.manifest,b.artifact_hash,c.manifest->>'definition_hash',b.report->>'profile')
 RETURNING * INTO v;
 RETURN capacita_execution.public_version(v);
END $$;

DO $$
DECLARE managed boolean := EXISTS(SELECT 1 FROM information_schema.columns
  WHERE table_schema='capacita_execution' AND table_name='versions' AND column_name='managed_id');
BEGIN
  ALTER TABLE capacita_execution.versions DROP CONSTRAINT IF EXISTS version_executor;
  IF managed THEN
    ALTER TABLE capacita_execution.versions ADD CONSTRAINT version_executor CHECK (
      (managed_id IS NULL AND connector_key IS NULL AND candidate_id IS NOT NULL
        AND profile IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1','gvisor-python-toolbox-v2'))
      OR (managed_id IS NOT NULL AND connector_key IS NULL AND candidate_id IS NULL AND profile = 'managed-tools-v1')
      OR (managed_id IS NULL AND connector_key IS NOT NULL AND candidate_id IS NULL AND build_id IS NULL
        AND profile = 'connector-v1'));
  ELSE
    ALTER TABLE capacita_execution.versions ADD CONSTRAINT version_executor CHECK (
      (connector_key IS NULL AND candidate_id IS NOT NULL AND build_id IS NOT NULL
        AND profile IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1','gvisor-python-toolbox-v2'))
      OR (connector_key IS NOT NULL AND candidate_id IS NULL AND build_id IS NULL AND profile = 'connector-v1'));
  END IF;
END $$;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): la regla debe incluir toolbox-v2 y activar debe aceptarlo.
SELECT pg_get_constraintdef(oid) LIKE '%toolbox-v2%' AS regla_acepta_v2
FROM pg_constraint WHERE conrelid = 'capacita_execution.versions'::regclass AND conname = 'version_executor';
SELECT prosrc LIKE '%toolbox-v2%' AS activar_acepta_v2 FROM pg_proc WHERE oid = 'public.execution_enable(uuid,uuid)'::regprocedure;
