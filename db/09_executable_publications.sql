-- B6. Revisar/aplicar una sola vez DESPUES de 06, 07_shared_execution y 08.
-- No publica ninguna capacidad existente ni cambia sus resultados.
BEGIN;
CREATE TABLE capacita_execution.publications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 version_id uuid NOT NULL REFERENCES capacita_execution.versions(id),
 owner_id uuid NOT NULL REFERENCES public.profiles(id),
 license text NOT NULL CHECK(license IN ('MIT','Apache-2.0','CC0-1.0')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), withdrawn_at timestamptz
);
CREATE UNIQUE INDEX publication_active_version ON capacita_execution.publications(version_id) WHERE active;
ALTER TABLE capacita_execution.publications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON capacita_execution.publications FROM PUBLIC,anon,authenticated;
ALTER TABLE capacita_execution.jobs ADD publication_id uuid REFERENCES capacita_execution.publications(id);

CREATE FUNCTION capacita_execution.publication_available(p_id uuid,p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM capacita_execution.publications p
 JOIN capacita_execution.versions v ON v.id=p.version_id
 JOIN public.capabilities c ON c.id=v.capability_id
 WHERE p.id=p_id AND p.active AND v.status='enabled' AND c.visibility='public'
 AND c.status='published' AND (c.visibility='public' OR c.owner_id=p_user))
$$;
CREATE FUNCTION capacita_execution.version_contract(v capacita_execution.versions,p capacita_execution.publications)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',v.id,'capability_id',v.capability_id,'owner_id',v.owner_id,
 'artifact_hash',v.artifact_hash,'definition_hash',v.definition_hash,'status',v.status,
 'profile',v.profile,'created_at',v.created_at,'publication_id',p.id,'license',p.license,
 'public_execution',true,'contract_only',true,
 'name',v.manifest->'definition'->>'name','description',v.manifest->'definition'->>'description',
 'contracts',jsonb_build_object('input_schema',v.manifest->'definition'->'input_schema',
 'parameter_schema',v.manifest->'definition'->'parameter_schema',
 'output_schema',v.manifest->'definition'->'output_schema'))
$$;
CREATE FUNCTION public.execution_publication_versions(p_version uuid DEFAULT NULL,p_capability uuid DEFAULT NULL,
 p_cursor uuid DEFAULT NULL,p_limit integer DEFAULT 20,p_publication uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; next_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_limit'; END IF;
 SELECT coalesce(jsonb_agg(q.value ORDER BY q.id),'[]'::jsonb) INTO result FROM (
 SELECT v.id,capacita_execution.version_contract(v,p) AS value FROM capacita_execution.versions v
 JOIN public.capabilities c ON c.id=v.capability_id
 LEFT JOIN capacita_execution.publications p ON p.version_id=v.id AND p.active
 WHERE v.status='enabled' AND (v.owner_id=auth.uid() OR capacita_execution.publication_available(p.id,auth.uid()))
 AND (c.owner_id=auth.uid() OR c.visibility='public')
 AND (p_version IS NULL OR v.id=p_version) AND (p_capability IS NULL OR v.capability_id=p_capability)
 AND (p_publication IS NULL OR p.id=p_publication)
 AND (p_cursor IS NULL OR v.id>p_cursor) ORDER BY v.id LIMIT p_limit+1) q;
 IF jsonb_array_length(result)>p_limit THEN next_id:=(result->(p_limit-1)->>'id')::uuid;result:=result-p_limit; END IF;
 RETURN jsonb_build_object('items',result,'next_cursor',next_id);
END $$;
CREATE FUNCTION public.execution_publish(p_version uuid,p_license text,p_consent boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v capacita_execution.versions; b capacita_execution.jobs; c public.capability_candidates;
 p capacita_execution.publications;
BEGIN
 PERFORM pg_advisory_xact_lock(73426,3);
 SELECT * INTO v FROM capacita_execution.versions WHERE id=p_version AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 IF p_consent IS DISTINCT FROM true OR p_license IS NULL OR p_license NOT IN ('MIT','Apache-2.0','CC0-1.0') THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='consent_required'; END IF;
 SELECT * INTO b FROM capacita_execution.jobs WHERE id=v.build_id AND owner_id=auth.uid() AND kind='build';
 SELECT * INTO c FROM public.capability_candidates WHERE id=v.candidate_id AND owner_id=auth.uid();
 IF v.status<>'enabled' OR b.id IS NULL OR c.id IS NULL OR b.status<>'passed'
 OR b.report->'passed' IS DISTINCT FROM 'true'::jsonb
 OR b.payload->'manifest' IS DISTINCT FROM v.manifest OR c.manifest IS DISTINCT FROM v.manifest
 OR b.report->>'artifact_hash' IS DISTINCT FROM v.artifact_hash
 OR b.report->>'definition_hash' IS DISTINCT FROM v.definition_hash THEN
 RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='evidence_required'; END IF;
 PERFORM 1 FROM public.capabilities WHERE id=v.capability_id AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 -- Una version activa por capacidad: publicar otra retira la anterior.
 UPDATE capacita_execution.publications p2 SET active=false,withdrawn_at=now()
 FROM capacita_execution.versions v2 WHERE p2.version_id=v2.id AND v2.capability_id=v.capability_id
 AND p2.active AND v2.id<>v.id;
 SELECT * INTO p FROM capacita_execution.publications WHERE version_id=v.id AND active;
 IF FOUND AND p.license<>p_license THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='license_changed'; END IF;
 IF NOT FOUND THEN INSERT INTO capacita_execution.publications(version_id,owner_id,license)
 VALUES(v.id,auth.uid(),p_license) RETURNING * INTO p; END IF;
 UPDATE public.capabilities SET visibility='public',status='published' WHERE id=v.capability_id AND owner_id=auth.uid();
 RETURN capacita_execution.version_contract(v,p);
END $$;
CREATE FUNCTION public.execution_withdraw(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p capacita_execution.publications; cap uuid;
BEGIN
 PERFORM pg_advisory_xact_lock(73426,3);
 SELECT * INTO p FROM capacita_execution.publications WHERE id=p_id AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 UPDATE capacita_execution.publications SET active=false,withdrawn_at=coalesce(withdrawn_at,now()) WHERE id=p.id;
 SELECT capability_id INTO cap FROM capacita_execution.versions WHERE id=p.version_id AND owner_id=auth.uid();
 IF NOT EXISTS(SELECT 1 FROM capacita_execution.publications p2 JOIN capacita_execution.versions v ON v.id=p2.version_id
 WHERE v.capability_id=cap AND p2.active) THEN
 UPDATE public.capabilities SET visibility='private',status='draft' WHERE id=cap AND owner_id=auth.uid(); END IF;
 RETURN jsonb_build_object('withdrawn',true);
END $$;
CREATE FUNCTION public.execution_public_enqueue(p_id uuid,p_key text,p_inputs jsonb,p_parameters jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p capacita_execution.publications; v capacita_execution.versions; j capacita_execution.jobs; req jsonb;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 128 OR p_inputs IS NULL OR p_parameters IS NULL
 OR jsonb_typeof(p_inputs)<>'object' OR jsonb_typeof(p_parameters)<>'object' THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_request'; END IF;
 req:=jsonb_build_object('publication_id',p_id,'inputs',p_inputs,'parameters',p_parameters);
 IF octet_length(req::text)>65536 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='input_limit'; END IF;
 PERFORM pg_advisory_xact_lock(73426,3);
 SELECT * INTO j FROM capacita_execution.jobs WHERE owner_id=auth.uid() AND kind='run' AND idempotency_key=p_key;
 IF FOUND THEN
 IF j.request<>req THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='key_conflict'; END IF;
 RETURN capacita_execution.public_job(j); END IF;
 IF NOT capacita_execution.publication_available(p_id,auth.uid()) THEN
 RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 SELECT * INTO p FROM capacita_execution.publications WHERE id=p_id;
 SELECT * INTO v FROM capacita_execution.versions WHERE id=p.version_id;
 IF (SELECT count(*) FROM capacita_execution.jobs WHERE owner_id=auth.uid() AND status IN ('queued','testing','running'))>=3
 OR (SELECT count(*) FROM capacita_execution.jobs WHERE status IN ('queued','testing','running'))>=20 THEN
 RAISE EXCEPTION USING ERRCODE='53000',MESSAGE='queue_full'; END IF;
 INSERT INTO capacita_execution.jobs(owner_id,kind,candidate_id,version_id,artifact_hash,payload,idempotency_key,request,publication_id)
 VALUES(auth.uid(),'run',v.candidate_id,v.id,v.artifact_hash,
 jsonb_build_object('manifest',v.manifest,'inputs',p_inputs,'parameters',p_parameters,'profile',v.profile),p_key,req,p.id)
 RETURNING * INTO j;
 RETURN capacita_execution.public_job(j);
END $$;

CREATE FUNCTION capacita_execution.snapshot_available(p_version uuid,p_user uuid,p_snapshot jsonb)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM capacita_execution.versions v WHERE v.id=p_version AND v.status='enabled'
 AND (v.owner_id=p_user OR EXISTS(SELECT 1 FROM capacita_execution.publications p
 WHERE p.id=nullif(p_snapshot->>'publication_id','')::uuid AND p.version_id=v.id
 AND capacita_execution.publication_available(p.id,p_user))))
$$;

CREATE OR REPLACE FUNCTION public.execution_workflow_approve(p_id uuid,p_revision integer,p_hash text,p_inputs jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w capacita_execution.workflows; a capacita_execution.workflow_approvals;
 node jsonb; v capacita_execution.versions; versions jsonb:='{}'::jsonb;
BEGIN
 SELECT * INTO w FROM capacita_execution.workflows WHERE id=p_id AND owner_id=auth.uid() AND NOT archived FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 IF p_revision IS DISTINCT FROM w.revision OR p_hash IS DISTINCT FROM w.definition_hash THEN
 RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='revision_changed'; END IF;
 IF p_inputs IS NULL OR jsonb_typeof(p_inputs)<>'object' OR octet_length(p_inputs::text)>65536 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_inputs'; END IF;
 FOR node IN SELECT value FROM jsonb_array_elements(w.definition->'nodes') LOOP
  SELECT * INTO v FROM capacita_execution.versions WHERE id=(node->>'version_id')::uuid AND (owner_id=auth.uid() OR EXISTS(SELECT 1 FROM capacita_execution.publications p WHERE p.version_id=versions.id AND capacita_execution.publication_available(p.id,auth.uid())));
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
  IF v.status<>'enabled' THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='version_disabled'; END IF;
  versions:=versions||jsonb_build_object(v.id::text,jsonb_build_object('status',v.status,
   'publication_id',(SELECT p.id FROM capacita_execution.publications p WHERE p.version_id=v.id AND p.active),'manifest',v.manifest,'artifact_hash',v.artifact_hash,'definition_hash',v.definition_hash,'profile',v.profile));
 END LOOP;
 IF octet_length(versions::text)+octet_length(w.definition::text)+octet_length(p_inputs::text)>350000 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='snapshot_limit'; END IF;
 INSERT INTO capacita_execution.workflow_approvals(owner_id,workflow_id,revision,definition_hash,inputs,versions)
 VALUES(auth.uid(),w.id,w.revision,w.definition_hash,p_inputs,versions) RETURNING * INTO a;
 RETURN jsonb_build_object('id',a.id,'workflow_id',w.id,'revision',w.revision,
  'definition_hash',w.definition_hash,'expires_at',a.expires_at);
END $$;
CREATE OR REPLACE FUNCTION public.execution_workflow_enqueue(p_id uuid,p_approval uuid,p_key text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w capacita_execution.workflows; a capacita_execution.workflow_approvals;
 j capacita_execution.jobs; ref record; payload jsonb;
BEGIN
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 128 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_key'; END IF;
 PERFORM pg_advisory_xact_lock(73426,3);
 SELECT * INTO j FROM capacita_execution.jobs WHERE owner_id=auth.uid() AND kind='run' AND idempotency_key=p_key;
 IF FOUND THEN
  IF j.workflow_id IS DISTINCT FROM p_id OR j.approval_id IS DISTINCT FROM p_approval THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='key_conflict'; END IF;
  RETURN capacita_execution.public_job(j);
 END IF;
 SELECT * INTO w FROM capacita_execution.workflows WHERE id=p_id AND owner_id=auth.uid() AND NOT archived FOR UPDATE;
 SELECT * INTO a FROM capacita_execution.workflow_approvals WHERE id=p_approval AND owner_id=auth.uid() AND workflow_id=p_id FOR UPDATE;
 IF w.id IS NULL OR a.id IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 IF a.expires_at<=clock_timestamp() OR a.definition_hash<>w.definition_hash OR a.revision<>w.revision
  OR EXISTS(SELECT 1 FROM capacita_execution.jobs WHERE approval_id=a.id) THEN
 RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='approval_invalid'; END IF;
 FOR ref IN SELECT key,value FROM jsonb_each(a.versions) LOOP
  IF NOT EXISTS(SELECT 1 FROM capacita_execution.versions WHERE id=ref.key::uuid AND capacita_execution.snapshot_available(id,auth.uid(),ref.value)
    AND status='enabled' AND artifact_hash=ref.value->>'artifact_hash') THEN
  RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='version_disabled'; END IF;
 END LOOP;
 IF (SELECT count(*) FROM capacita_execution.jobs WHERE owner_id=auth.uid() AND status IN ('queued','testing','running'))>=3
 OR (SELECT count(*) FROM capacita_execution.jobs WHERE status IN ('queued','testing','running'))>=20 THEN
 RAISE EXCEPTION USING ERRCODE='53000',MESSAGE='queue_full'; END IF;
 payload:=jsonb_build_object('execution_type','workflow','definition',w.definition,'versions',a.versions,
  'inputs',a.inputs,'workflow_hash',a.definition_hash,'revision',a.revision);
 INSERT INTO capacita_execution.jobs(owner_id,kind,workflow_id,workflow_revision,approval_id,
  artifact_hash,payload,idempotency_key,request)
 VALUES(auth.uid(),'run',w.id,w.revision,a.id,a.definition_hash,payload,p_key,
  jsonb_build_object('workflow_id',w.id,'approval_id',a.id)) RETURNING * INTO j;
 RETURN capacita_execution.public_job(j);
END $$;
CREATE OR REPLACE FUNCTION public.execution_progress(p_session uuid,p_id uuid,p_report jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 PERFORM capacita_execution.check_worker(p_session);
 IF p_report IS NULL OR jsonb_typeof(p_report)<>'object' OR octet_length(p_report::text)>65536 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_report'; END IF;
 IF EXISTS(SELECT 1 FROM capacita_execution.jobs j, jsonb_each(j.payload->'versions') ref
  WHERE j.id=p_id AND NOT EXISTS(SELECT 1 FROM capacita_execution.versions v
   WHERE v.id=ref.key::uuid AND capacita_execution.snapshot_available(v.id,j.owner_id,ref.value) AND v.status='enabled' AND v.artifact_hash=ref.value->>'artifact_hash')) THEN
 RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='version_disabled'; END IF;
 UPDATE capacita_execution.jobs SET report=p_report,updated_at=now()
 WHERE id=p_id AND worker_session=p_session AND status='running' AND workflow_id IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 RETURN jsonb_build_object('ok',true);
END $$;
-- Preserva la implementacion B4, pero revalida retirada antes de entregar codigo.
ALTER FUNCTION public.execution_claim(uuid,integer) RENAME TO execution_claim_private_v2;
REVOKE ALL ON FUNCTION public.execution_claim_private_v2(uuid,integer) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.execution_claim(p_session uuid,p_protocol integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; j capacita_execution.jobs;
BEGIN
 PERFORM pg_advisory_xact_lock(73426,3);
 result:=public.execution_claim_private_v2(p_session,p_protocol);
 IF result->'job'='null'::jsonb THEN RETURN result; END IF;
 SELECT * INTO j FROM capacita_execution.jobs WHERE id=(result->'job'->>'id')::uuid;
 IF (j.publication_id IS NOT NULL AND NOT capacita_execution.publication_available(j.publication_id,j.owner_id)) OR EXISTS(SELECT 1 FROM jsonb_each(j.payload->'versions') ref WHERE NOT capacita_execution.snapshot_available(ref.key::uuid,j.owner_id,ref.value)) THEN
 UPDATE capacita_execution.jobs SET status='failed',updated_at=now(),report='{"error":"publication_unavailable"}'::jsonb WHERE id=j.id;
 RETURN jsonb_build_object('job',NULL); END IF;
 RETURN result;
END $$;
-- Rebind SQL wrapper: no worker antiguo evita la comprobacion nueva.
CREATE OR REPLACE FUNCTION public.execution_claim(p_session uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT public.execution_claim(p_session,1) $$;
REVOKE ALL ON FUNCTION capacita_execution.snapshot_available(uuid,uuid,jsonb),
 capacita_execution.publication_available(uuid,uuid),
 capacita_execution.version_contract(capacita_execution.versions,capacita_execution.publications)
 FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.execution_publication_versions(uuid,uuid,uuid,integer,uuid),
 public.execution_publish(uuid,text,boolean),public.execution_withdraw(uuid),
 public.execution_public_enqueue(uuid,text,jsonb,jsonb),public.execution_claim(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.execution_publication_versions(uuid,uuid,uuid,integer,uuid),
 public.execution_publish(uuid,text,boolean),public.execution_withdraw(uuid),
 public.execution_public_enqueue(uuid,text,jsonb,jsonb),public.execution_claim(uuid,integer) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
