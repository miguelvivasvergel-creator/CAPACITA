-- PREPARADO: revisar A/B y aplicar manualmente en el proyecto correcto.
-- No importa SQLite, no publica capacidades, no concede service_role.
-- Requiere SQL 06. Una cuenta Auth dedicada se autoriza al final manualmente.
BEGIN;

CREATE SCHEMA capacita_execution;
REVOKE ALL ON SCHEMA capacita_execution FROM PUBLIC, anon, authenticated;

CREATE TABLE capacita_execution.workers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE capacita_execution.lease (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  session_id uuid, worker_id uuid, expires_at timestamptz NOT NULL DEFAULT '-infinity'
);
INSERT INTO capacita_execution.lease(singleton) VALUES (true);

CREATE TABLE capacita_execution.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  kind text NOT NULL CHECK (kind IN ('build','run')),
  candidate_id uuid NOT NULL REFERENCES public.capability_candidates(id),
  version_id uuid,
  artifact_hash text NOT NULL CHECK (artifact_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','testing','running','passed','failed','completed','interrupted')),
  payload jsonb NOT NULL CHECK (octet_length(payload::text) <= 400000),
  report jsonb, output jsonb,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 128),
  request jsonb NOT NULL,
  worker_session uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(owner_id,kind,idempotency_key)
);
CREATE INDEX execution_jobs_queue ON capacita_execution.jobs(created_at,id) WHERE status='queued';
CREATE INDEX execution_jobs_owner ON capacita_execution.jobs(owner_id,kind,id);

CREATE TABLE capacita_execution.versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id),
  capability_id uuid NOT NULL REFERENCES public.capabilities(id),
  candidate_id uuid NOT NULL UNIQUE REFERENCES public.capability_candidates(id),
  build_id uuid NOT NULL REFERENCES capacita_execution.jobs(id),
  manifest jsonb NOT NULL,
  artifact_hash text NOT NULL,
  definition_hash text NOT NULL,
  profile text NOT NULL DEFAULT 'gvisor-python-stdlib-v1',
  status text NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','disabled')),
  created_at timestamptz NOT NULL DEFAULT now(), disabled_at timestamptz
);
ALTER TABLE capacita_execution.jobs ADD FOREIGN KEY(version_id) REFERENCES capacita_execution.versions(id);

-- Defensa adicional: tablas privadas, sin permisos directos; toda escritura pasa
-- por funciones con argumentos cerrados. El usuario nunca puede emitir reportes.
ALTER TABLE capacita_execution.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacita_execution.lease ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacita_execution.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacita_execution.versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_own ON capacita_execution.jobs FOR SELECT TO authenticated USING (owner_id=(SELECT auth.uid()));
CREATE POLICY versions_own ON capacita_execution.versions FOR SELECT TO authenticated USING (owner_id=(SELECT auth.uid()));
REVOKE ALL ON ALL TABLES IN SCHEMA capacita_execution FROM PUBLIC,anon,authenticated;

CREATE FUNCTION capacita_execution.public_job(j capacita_execution.jobs)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',j.id,'candidate_id',j.candidate_id,'version_id',j.version_id,
   'artifact_hash',j.artifact_hash,'status',j.status,'created_at',j.created_at,
   'updated_at',j.updated_at,'report',j.report,'output',j.output,
   'implementation_enabled',false,'storage_backend','supabase')
$$;
CREATE FUNCTION capacita_execution.public_version(v capacita_execution.versions)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',v.id,'capability_id',v.capability_id,'candidate_id',v.candidate_id,
   'build_id',v.build_id,'artifact_hash',v.artifact_hash,'definition_hash',v.definition_hash,
   'status',v.status,'profile',v.profile,'created_at',v.created_at)
$$;
CREATE FUNCTION capacita_execution.check_worker(p_session uuid)
RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM capacita_execution.workers WHERE user_id=auth.uid() AND enabled)
 THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='worker_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM capacita_execution.lease WHERE worker_id=auth.uid()
   AND session_id=p_session AND expires_at>clock_timestamp())
 THEN RAISE EXCEPTION USING ERRCODE='55P03', MESSAGE='lease_required'; END IF;
END $$;

CREATE FUNCTION public.execution_enqueue(p_kind text,p_key text,p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j capacita_execution.jobs; v capacita_execution.versions;
 c public.capability_candidates; content jsonb; candidate uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 IF p_kind IS NULL OR p_kind NOT IN ('build','run') OR p_key IS NULL
   OR length(p_key) NOT BETWEEN 1 AND 128 OR p_request IS NULL
   OR jsonb_typeof(p_request)<>'object' OR octet_length(p_request::text)>350000
 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_request'; END IF;
 -- Serializa admisión y cuotas, también entre equipos. No contiene ejecución.
 PERFORM pg_advisory_xact_lock(73426,3);
 SELECT * INTO j FROM capacita_execution.jobs WHERE owner_id=auth.uid()
   AND kind=p_kind AND idempotency_key=p_key;
 IF FOUND THEN
   IF j.request<>p_request THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='key_conflict'; END IF;
   RETURN capacita_execution.public_job(j);
 END IF;
 IF p_kind='build' THEN
   candidate:=(p_request->>'candidate_id')::uuid;
   SELECT * INTO c FROM public.capability_candidates WHERE id=candidate AND owner_id=auth.uid();
   IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
   IF c.manifest IS DISTINCT FROM p_request->'manifest'
     OR jsonb_typeof(p_request->'cases') IS DISTINCT FROM 'array'
   THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='manifest_changed'; END IF;
   IF jsonb_array_length(p_request->'cases') NOT BETWEEN 1 AND 20
     OR octet_length((p_request->'cases')::text)>65536
   THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='case_limit'; END IF;
   content:=jsonb_build_object('manifest',c.manifest,'cases',p_request->'cases');
 ELSE
   SELECT * INTO v FROM capacita_execution.versions
    WHERE id=(p_request->>'version_id')::uuid AND owner_id=auth.uid() FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
   IF v.status<>'enabled' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='disabled'; END IF;
   IF jsonb_typeof(p_request->'inputs') IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_request->'parameters') IS DISTINCT FROM 'object'
     OR octet_length(p_request::text)>65536
   THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_input'; END IF;
   candidate:=v.candidate_id;
   content:=jsonb_build_object('manifest',v.manifest,'inputs',p_request->'inputs',
     'parameters',p_request->'parameters','profile',v.profile);
 END IF;
 IF (SELECT count(*) FROM capacita_execution.jobs WHERE owner_id=auth.uid()
      AND status IN ('queued','testing','running'))>=3
   OR (SELECT count(*) FROM capacita_execution.jobs WHERE status IN ('queued','testing','running'))>=20
 THEN RAISE EXCEPTION USING ERRCODE='53000', MESSAGE='queue_full'; END IF;
 INSERT INTO capacita_execution.jobs(owner_id,kind,candidate_id,version_id,artifact_hash,
   payload,idempotency_key,request)
 VALUES(auth.uid(),p_kind,candidate,v.id,content->'manifest'->>'artifact_hash',content,p_key,p_request)
 RETURNING * INTO j;
 RETURN capacita_execution.public_job(j);
END $$;

CREATE FUNCTION public.execution_get(p_kind text,p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j capacita_execution.jobs;
BEGIN
 SELECT * INTO j FROM capacita_execution.jobs WHERE id=p_id AND kind=p_kind AND owner_id=auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 RETURN capacita_execution.public_job(j);
END $$;
CREATE FUNCTION public.execution_list(p_kind text,p_cursor uuid DEFAULT NULL,p_limit integer DEFAULT 20,p_candidate_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; total integer; next_id uuid;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
 RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_limit'; END IF;
 SELECT coalesce(jsonb_agg(capacita_execution.public_job(q) ORDER BY q.id),'[]'::jsonb)
 INTO result FROM (SELECT * FROM capacita_execution.jobs WHERE owner_id=auth.uid() AND kind=p_kind
   AND (p_cursor IS NULL OR id>p_cursor) AND (p_candidate_id IS NULL OR candidate_id=p_candidate_id)
   ORDER BY id LIMIT p_limit+1) q;
 total:=jsonb_array_length(result);
 IF total>p_limit THEN next_id:=(result->(p_limit-1)->>'id')::uuid; result:=result-p_limit; END IF;
 RETURN jsonb_build_object('items',result,'next_cursor',next_id);
END $$;

CREATE FUNCTION public.execution_enable(p_candidate_id uuid,p_build_id uuid)
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
   OR b.report->>'profile' IS DISTINCT FROM 'gvisor-python-stdlib-v1'
   OR b.report->>'candidate_id' IS DISTINCT FROM c.id::text
   OR b.report->>'definition_hash' IS DISTINCT FROM c.manifest->>'definition_hash'
 THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='evidence_required'; END IF;
 SELECT * INTO v FROM capacita_execution.versions WHERE candidate_id=p_candidate_id;
 IF FOUND THEN
   IF v.status<>'enabled' THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='disabled'; END IF;
   RETURN capacita_execution.public_version(v);
 END IF;
 INSERT INTO capacita_execution.versions(owner_id,capability_id,candidate_id,build_id,manifest,artifact_hash,definition_hash)
 VALUES(auth.uid(),c.capability_id,c.id,b.id,c.manifest,b.artifact_hash,c.manifest->>'definition_hash')
 RETURNING * INTO v;
 RETURN capacita_execution.public_version(v);
END $$;
CREATE FUNCTION public.execution_versions(p_candidate_id uuid DEFAULT NULL,p_id uuid DEFAULT NULL,
 p_cursor uuid DEFAULT NULL,p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; next_id uuid;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
 RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_limit'; END IF;
 SELECT coalesce(jsonb_agg(capacita_execution.public_version(q) ORDER BY q.id),'[]'::jsonb)
 INTO result FROM (SELECT * FROM capacita_execution.versions WHERE owner_id=auth.uid()
   AND (p_candidate_id IS NULL OR candidate_id=p_candidate_id) AND (p_id IS NULL OR id=p_id)
   AND (p_cursor IS NULL OR id>p_cursor) ORDER BY id LIMIT p_limit+1) q;
 IF jsonb_array_length(result)>p_limit THEN
   next_id:=(result->(p_limit-1)->>'id')::uuid; result:=result-p_limit;
 END IF;
 RETURN jsonb_build_object('items',result,'next_cursor',next_id);
END $$;
CREATE FUNCTION public.execution_disable(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v capacita_execution.versions;
BEGIN
 UPDATE capacita_execution.versions SET status='disabled',disabled_at=coalesce(disabled_at,now())
 WHERE id=p_id AND owner_id=auth.uid() RETURNING * INTO v;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 RETURN capacita_execution.public_version(v);
END $$;

-- Cuenta Auth dedicada, autorizada por administrador en workers. Su JWT normal
-- no omite RLS del catálogo. Las funciones solo conceden acceso a trabajos.
CREATE FUNCTION public.execution_lease(p_session uuid,p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l capacita_execution.lease;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM capacita_execution.workers WHERE user_id=auth.uid() AND enabled)
 THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='worker_required'; END IF;
 IF p_session IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='session_required'; END IF;
 SELECT * INTO l FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 IF p_action='acquire' THEN
   IF l.expires_at>clock_timestamp() AND (l.session_id IS DISTINCT FROM p_session OR l.worker_id IS DISTINCT FROM auth.uid())
   THEN RAISE EXCEPTION USING ERRCODE='55P03', MESSAGE='busy'; END IF;
 ELSIF p_action IN ('heartbeat','release') THEN
   PERFORM capacita_execution.check_worker(p_session);
 ELSE RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_action'; END IF;
 UPDATE capacita_execution.lease SET session_id=p_session,worker_id=auth.uid(),
   expires_at=CASE WHEN p_action='release' THEN '-infinity'::timestamptz ELSE clock_timestamp()+interval '60 seconds' END
 WHERE singleton;
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE FUNCTION public.execution_recover(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE affected integer;
BEGIN
 PERFORM 1 FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 PERFORM capacita_execution.check_worker(p_session);
 UPDATE capacita_execution.jobs SET status='interrupted',updated_at=now(),output=NULL,
   report=jsonb_build_object('error','worker_interrupted','retry_requires_new_key',true)
 WHERE status IN ('testing','running') AND worker_session IS DISTINCT FROM p_session;
 GET DIAGNOSTICS affected=ROW_COUNT;
 RETURN jsonb_build_object('recovered',affected);
END $$;
CREATE FUNCTION public.execution_claim(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j capacita_execution.jobs;
BEGIN
 -- Bloquea el lease durante el claim para impedir nueva reserva concurrente.
 PERFORM 1 FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 PERFORM capacita_execution.check_worker(p_session);
 IF EXISTS(SELECT 1 FROM capacita_execution.jobs WHERE worker_session=p_session AND status IN ('testing','running'))
 THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='active_job'; END IF;
 SELECT * INTO j FROM capacita_execution.jobs WHERE status='queued' ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF NOT FOUND THEN RETURN jsonb_build_object('job',NULL); END IF;
 IF j.kind='run' AND NOT EXISTS(SELECT 1 FROM capacita_execution.versions WHERE id=j.version_id AND status='enabled') THEN
   UPDATE capacita_execution.jobs SET status='failed',updated_at=now(),report='{"error":"version_disabled"}'::jsonb WHERE id=j.id;
   RETURN jsonb_build_object('job',NULL);
 END IF;
 UPDATE capacita_execution.jobs SET status=CASE WHEN kind='build' THEN 'testing' ELSE 'running' END,
   worker_session=p_session,updated_at=now() WHERE id=j.id RETURNING * INTO j;
 RETURN jsonb_build_object('job',to_jsonb(j)-'request'-'idempotency_key'-'owner_id');
END $$;
CREATE FUNCTION public.execution_finish(p_session uuid,p_id uuid,p_status text,p_report jsonb,p_output jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j capacita_execution.jobs;
BEGIN
 PERFORM 1 FROM capacita_execution.lease WHERE singleton FOR UPDATE;
 PERFORM capacita_execution.check_worker(p_session);
 SELECT * INTO j FROM capacita_execution.jobs WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR j.worker_session IS DISTINCT FROM p_session
 THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 IF j.status NOT IN ('testing','running') OR p_status IS NULL
    OR (j.kind='build' AND p_status NOT IN ('passed','failed'))
    OR (j.kind='run' AND p_status NOT IN ('completed','failed'))
    OR p_report IS NULL OR jsonb_typeof(p_report)<>'object' OR octet_length(p_report::text)>65536
    OR (p_status='completed' AND (p_output IS NULL OR jsonb_typeof(p_output)<>'object'))
    OR (p_output IS NOT NULL AND octet_length(p_output::text)>65536)
 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_result'; END IF;
 UPDATE capacita_execution.jobs SET status=p_status,report=p_report,
   output=CASE WHEN p_status='completed' THEN p_output ELSE NULL END,updated_at=now() WHERE id=p_id;
 RETURN jsonb_build_object('ok',true);
END $$;

-- Por defecto las funciones pueden ser ejecutables por PUBLIC: revocar cada una.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE (n.nspname='public' AND p.proname LIKE 'execution\_%' ESCAPE '\') OR n.nspname='capacita_execution'
 LOOP
   EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
   IF f.signature::text LIKE 'execution_%' OR f.signature::text LIKE 'public.execution_%' THEN
     EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated',f.signature);
   END IF;
 END LOOP;
END $$;
COMMIT;

-- DESPUÉS: crear cuenta Auth dedicada con correo confirmado, sin compartir su
-- contraseña. Administrador autoriza solo su UUID (no ejecutar el ejemplo literal):
-- INSERT INTO capacita_execution.workers(user_id) VALUES ('UUID_CUENTA_TRABAJADOR');
-- Revocar: UPDATE capacita_execution.workers SET enabled=false WHERE user_id='...';
