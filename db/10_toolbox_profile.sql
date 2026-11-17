-- 10. Perfil "caja de herramientas" (gvisor-python-toolbox-v1). Aplicar una sola vez
-- DESPUES de 07_shared_execution, 08 y 09. No cambia versiones existentes: siguen en
-- gvisor-python-stdlib-v1. Las nuevas guardan el perfil con que superaron su prueba,
-- y el trabajador las ejecuta con la imagen de ese mismo perfil.
BEGIN;
ALTER TABLE capacita_execution.versions
 ADD CONSTRAINT versions_profile_known
 CHECK (profile IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1'));

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
   OR b.report->>'profile' NOT IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1')
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
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): debe devolver una fila con perfiles_conocidos = true.
SELECT bool_and(profile IN ('gvisor-python-stdlib-v1','gvisor-python-toolbox-v1')) AS perfiles_conocidos,
       count(*) AS versiones
FROM capacita_execution.versions;
