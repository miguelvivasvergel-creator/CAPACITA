-- B4: preparado para revisión/aplicación manual. Requiere 07; no lo repite.
-- Conserva B3. Workflows privados, revisiones fijas y aprobación por datos.
BEGIN;
CREATE TABLE capacita_execution.workflows (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES public.profiles(id),
 visibility text NOT NULL DEFAULT 'private' CHECK(visibility='private'),
 archived boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>=1),
 definition jsonb NOT NULL,
 definition_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX private_workflows_owner ON capacita_execution.workflows(owner_id,id);
CREATE TABLE capacita_execution.workflow_revisions (
 workflow_id uuid NOT NULL REFERENCES capacita_execution.workflows(id),
 revision integer NOT NULL, definition jsonb NOT NULL, definition_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(workflow_id,revision)
);
CREATE TABLE capacita_execution.workflow_approvals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES public.profiles(id),
 workflow_id uuid NOT NULL REFERENCES capacita_execution.workflows(id),
 revision integer NOT NULL, definition_hash text NOT NULL, inputs jsonb NOT NULL, versions jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '15 minutes'
);
ALTER TABLE capacita_execution.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacita_execution.workflow_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacita_execution.workflow_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY workflow_own ON capacita_execution.workflows FOR SELECT TO authenticated USING(owner_id=(SELECT auth.uid()));
CREATE POLICY workflow_approval_own ON capacita_execution.workflow_approvals FOR SELECT TO authenticated USING(owner_id=(SELECT auth.uid()));
REVOKE ALL ON capacita_execution.workflows,capacita_execution.workflow_revisions,
 capacita_execution.workflow_approvals FROM PUBLIC,anon,authenticated;

ALTER TABLE capacita_execution.jobs ALTER COLUMN candidate_id DROP NOT NULL;
ALTER TABLE capacita_execution.jobs ADD COLUMN workflow_id uuid REFERENCES capacita_execution.workflows(id);
ALTER TABLE capacita_execution.jobs ADD COLUMN workflow_revision integer;
ALTER TABLE capacita_execution.jobs ADD COLUMN approval_id uuid UNIQUE REFERENCES capacita_execution.workflow_approvals(id);
ALTER TABLE capacita_execution.jobs ADD CONSTRAINT execution_target CHECK (
 (workflow_id IS NULL AND candidate_id IS NOT NULL AND (kind='build' OR version_id IS NOT NULL)) OR
 (workflow_id IS NOT NULL AND kind='run' AND candidate_id IS NULL AND version_id IS NULL AND approval_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION capacita_execution.public_job(j capacita_execution.jobs)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',j.id,'candidate_id',j.candidate_id,'version_id',j.version_id,
  'workflow_id',j.workflow_id,'workflow_revision',j.workflow_revision,
  'artifact_hash',j.artifact_hash,'status',j.status,'created_at',j.created_at,
  'updated_at',j.updated_at,'report',j.report,'output',j.output) ||
  CASE WHEN j.kind='build' THEN jsonb_build_object('implementation_enabled',false,'storage_backend','supabase') ELSE '{}'::jsonb END
$$;

CREATE FUNCTION public.execution_workflow_get(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w capacita_execution.workflows;
BEGIN
 SELECT * INTO w FROM capacita_execution.workflows WHERE id=p_id AND owner_id=auth.uid() AND NOT archived;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 RETURN to_jsonb(w);
END $$;
CREATE FUNCTION public.execution_workflow_list(p_cursor uuid DEFAULT NULL,p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; next_id uuid;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_limit'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.id),'[]'::jsonb) INTO result
 FROM (SELECT * FROM capacita_execution.workflows WHERE owner_id=auth.uid() AND NOT archived
  AND (p_cursor IS NULL OR id>p_cursor) ORDER BY id LIMIT p_limit+1) q;
 IF jsonb_array_length(result)>p_limit THEN next_id:=(result->(p_limit-1)->>'id')::uuid; result:=result-p_limit; END IF;
 RETURN jsonb_build_object('items',result,'next_cursor',next_id);
END $$;
CREATE FUNCTION public.execution_workflow_save(p_id uuid,p_expected integer,p_definition jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w capacita_execution.workflows; fingerprint text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 IF p_definition IS NULL OR jsonb_typeof(p_definition)<>'object'
  OR octet_length(p_definition::text)>65536 OR jsonb_typeof(p_definition->'nodes') IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_definition'; END IF;
 IF jsonb_array_length(p_definition->'nodes') NOT BETWEEN 1 AND 12 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='node_limit'; END IF;
 fingerprint:=encode(sha256(convert_to(p_definition::text,'UTF8')),'hex');
 IF p_id IS NULL THEN
  INSERT INTO capacita_execution.workflows(owner_id,definition,definition_hash)
  VALUES(auth.uid(),p_definition,fingerprint) RETURNING * INTO w;
 ELSE
  SELECT * INTO w FROM capacita_execution.workflows WHERE id=p_id AND owner_id=auth.uid() AND NOT archived FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
  IF p_expected IS DISTINCT FROM w.revision THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='revision_changed'; END IF;
  IF w.definition=p_definition THEN RETURN to_jsonb(w); END IF;
  UPDATE capacita_execution.workflows SET definition=p_definition,definition_hash=fingerprint,
   revision=revision+1,updated_at=now() WHERE id=p_id RETURNING * INTO w;
 END IF;
 INSERT INTO capacita_execution.workflow_revisions(workflow_id,revision,definition,definition_hash)
 VALUES(w.id,w.revision,w.definition,w.definition_hash);
 RETURN to_jsonb(w);
END $$;
CREATE FUNCTION public.execution_workflow_archive(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE capacita_execution.workflows SET archived=true,updated_at=now() WHERE id=p_id AND owner_id=auth.uid() AND NOT archived;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 RETURN jsonb_build_object('archived',true);
END $$;

CREATE FUNCTION public.execution_workflow_approve(p_id uuid,p_revision integer,p_hash text,p_inputs jsonb)
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
  SELECT * INTO v FROM capacita_execution.versions WHERE id=(node->>'version_id')::uuid AND owner_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
  IF v.status<>'enabled' THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='version_disabled'; END IF;
  versions:=versions||jsonb_build_object(v.id::text,jsonb_build_object('status',v.status,
   'manifest',v.manifest,'artifact_hash',v.artifact_hash,'definition_hash',v.definition_hash,'profile',v.profile));
 END LOOP;
 IF octet_length(versions::text)+octet_length(w.definition::text)+octet_length(p_inputs::text)>350000 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='snapshot_limit'; END IF;
 INSERT INTO capacita_execution.workflow_approvals(owner_id,workflow_id,revision,definition_hash,inputs,versions)
 VALUES(auth.uid(),w.id,w.revision,w.definition_hash,p_inputs,versions) RETURNING * INTO a;
 RETURN jsonb_build_object('id',a.id,'workflow_id',w.id,'revision',w.revision,
  'definition_hash',w.definition_hash,'expires_at',a.expires_at);
END $$;

CREATE FUNCTION public.execution_workflow_enqueue(p_id uuid,p_approval uuid,p_key text)
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
  IF NOT EXISTS(SELECT 1 FROM capacita_execution.versions WHERE id=ref.key::uuid AND owner_id=auth.uid()
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

-- Protocolo 1 (worker B3 antiguo) nunca reclama workflows.
CREATE FUNCTION public.execution_claim(p_session uuid,p_protocol integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j capacita_execution.jobs;
BEGIN
 PERFORM 1 FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 PERFORM capacita_execution.check_worker(p_session);
 IF EXISTS(SELECT 1 FROM capacita_execution.jobs WHERE worker_session=p_session AND status IN ('testing','running')) THEN
 RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='active_job'; END IF;
 SELECT * INTO j FROM capacita_execution.jobs WHERE status='queued'
  AND (workflow_id IS NULL OR p_protocol>=2) ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('job',NULL); END IF;
 IF (j.workflow_id IS NULL AND j.kind='run' AND NOT EXISTS(SELECT 1 FROM capacita_execution.versions WHERE id=j.version_id AND status='enabled'))
 OR (j.workflow_id IS NOT NULL AND (
  NOT EXISTS(SELECT 1 FROM capacita_execution.workflows WHERE id=j.workflow_id AND NOT archived AND definition_hash=j.artifact_hash)
  OR EXISTS(SELECT 1 FROM jsonb_each(j.payload->'versions') ref WHERE NOT EXISTS(
   SELECT 1 FROM capacita_execution.versions v WHERE v.id=ref.key::uuid AND v.status='enabled' AND v.artifact_hash=ref.value->>'artifact_hash'))))
 THEN
  UPDATE capacita_execution.jobs SET status='failed',updated_at=now(),report='{"error":"plan_or_version_unavailable"}'::jsonb WHERE id=j.id;
  RETURN jsonb_build_object('job',NULL);
 END IF;
 UPDATE capacita_execution.jobs SET status=CASE WHEN kind='build' THEN 'testing' ELSE 'running' END,
  worker_session=p_session,updated_at=now() WHERE id=j.id RETURNING * INTO j;
 RETURN jsonb_build_object('job',to_jsonb(j)-'request'-'idempotency_key'-'owner_id');
END $$;
CREATE OR REPLACE FUNCTION public.execution_claim(p_session uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT public.execution_claim(p_session,1)
$$;
CREATE FUNCTION public.execution_progress(p_session uuid,p_id uuid,p_report jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 PERFORM capacita_execution.check_worker(p_session);
 IF p_report IS NULL OR jsonb_typeof(p_report)<>'object' OR octet_length(p_report::text)>65536 THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_report'; END IF;
 IF EXISTS(SELECT 1 FROM capacita_execution.jobs j, jsonb_each(j.payload->'versions') ref
  WHERE j.id=p_id AND NOT EXISTS(SELECT 1 FROM capacita_execution.versions v
   WHERE v.id=ref.key::uuid AND v.status='enabled' AND v.artifact_hash=ref.value->>'artifact_hash')) THEN
 RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='version_disabled'; END IF;
 UPDATE capacita_execution.jobs SET report=p_report,updated_at=now()
 WHERE id=p_id AND worker_session=p_session AND status='running' AND workflow_id IS NOT NULL;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE OR REPLACE FUNCTION public.execution_finish(p_session uuid,p_id uuid,p_status text,p_report jsonb,p_output jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j capacita_execution.jobs; final_report jsonb;
BEGIN
 PERFORM 1 FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 PERFORM capacita_execution.check_worker(p_session);
 SELECT * INTO j FROM capacita_execution.jobs WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR j.worker_session IS DISTINCT FROM p_session THEN
 RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 final_report:=CASE WHEN j.workflow_id IS NOT NULL THEN coalesce(j.report,'{}'::jsonb)||p_report ELSE p_report END;
 IF j.workflow_id IS NOT NULL AND p_status='failed' AND NOT (p_report ? 'steps') THEN
  final_report:=final_report||jsonb_build_object('steps',(SELECT coalesce(jsonb_agg(
   step||jsonb_build_object('status',CASE step->>'status' WHEN 'running' THEN 'failed'
    WHEN 'pending' THEN 'skipped' ELSE step->>'status' END) ORDER BY ordinal),'[]'::jsonb)
   FROM jsonb_array_elements(coalesce(j.report->'steps','[]'::jsonb)) WITH ORDINALITY AS s(step,ordinal)));
 END IF;
 IF j.status NOT IN ('testing','running') OR p_status IS NULL
  OR (j.kind='build' AND p_status NOT IN ('passed','failed')) OR (j.kind='run' AND p_status NOT IN ('completed','failed'))
  OR final_report IS NULL OR jsonb_typeof(final_report)<>'object' OR octet_length(final_report::text)>65536
  OR (p_status='completed' AND (p_output IS NULL OR jsonb_typeof(p_output)<>'object'))
  OR (p_output IS NOT NULL AND octet_length(p_output::text)>65536) THEN
 RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_result'; END IF;
 UPDATE capacita_execution.jobs SET status=p_status,report=final_report,
  output=CASE WHEN p_status='completed' THEN p_output ELSE NULL END,updated_at=now() WHERE id=p_id;
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE OR REPLACE FUNCTION public.execution_recover(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
 PERFORM 1 FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 PERFORM capacita_execution.check_worker(p_session);
 UPDATE capacita_execution.jobs SET status='interrupted',updated_at=now(),output=NULL,
 report=coalesce(report,'{}'::jsonb)||jsonb_build_object('error','worker_interrupted','retry_requires_new_key',true,
  'steps',(SELECT coalesce(jsonb_agg(step||jsonb_build_object('status',CASE step->>'status'
   WHEN 'running' THEN 'interrupted' WHEN 'pending' THEN 'skipped' ELSE step->>'status' END) ORDER BY ordinal),'[]'::jsonb)
   FROM jsonb_array_elements(coalesce(report->'steps','[]'::jsonb)) WITH ORDINALITY AS s(step,ordinal)))
 WHERE status IN ('testing','running') AND worker_session IS DISTINCT FROM p_session;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN jsonb_build_object('recovered',affected);
END $$;
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname='public' AND p.proname LIKE 'execution\_%' ESCAPE '\' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',f.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
 END LOOP;
END $$;
COMMIT;
