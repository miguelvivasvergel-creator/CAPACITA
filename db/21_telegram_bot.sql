-- 21. Bot de Telegram completo: pedir, aprobar, ejecutar soluciones, ver avance, historial y asistentes.
-- Aplicar UNA vez DESPUÉS de 16 (Telegram), 17 (asistentes) y 20 (tope de 20 pasos).
-- Todas las funciones son del TRABAJADOR (check_worker): el dueño se deduce SIEMPRE del chat vinculado
-- en telegram_links; nunca se recibe un user_id. Mismas reglas de visibilidad que db/17 (versiones
-- propias o publicadas y disponibles) y mismos topes de cola (3 por persona, 20 en total).
BEGIN;

ALTER TABLE capacita_execution.telegram_links ADD COLUMN IF NOT EXISTS gemini_consent boolean NOT NULL DEFAULT false;

-- Propuestas y conversaciones pendientes del bot (lo que un botón confirma). Vencen en 30 minutos.
CREATE TABLE IF NOT EXISTS capacita_execution.telegram_pending (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL,
  kind text NOT NULL CHECK (kind ~ '^[a-z_]{1,40}$'),
  payload jsonb NOT NULL CHECK (octet_length(payload::text) <= 12000000),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes'
);
CREATE INDEX IF NOT EXISTS telegram_pending_chat ON capacita_execution.telegram_pending(chat_id, kind);
ALTER TABLE capacita_execution.telegram_pending ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON capacita_execution.telegram_pending FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION capacita_execution.telegram_owner_of(p_chat bigint)
RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT user_id FROM capacita_execution.telegram_links WHERE chat_id = p_chat
$$;

-- Foto de las versiones de una definición, solo si el dueño puede usarlas (igual que db/17).
CREATE OR REPLACE FUNCTION capacita_execution.telegram_snapshot(p_owner uuid, p_definition jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE node jsonb; v capacita_execution.versions; versions jsonb := '{}'::jsonb;
BEGIN
 FOR node IN SELECT value FROM jsonb_array_elements(p_definition->'nodes') LOOP
  SELECT x.* INTO v FROM capacita_execution.versions x WHERE x.id = (node->>'version_id')::uuid AND x.status = 'enabled'
    AND (x.owner_id = p_owner OR EXISTS (SELECT 1 FROM capacita_execution.publications p
      WHERE p.version_id = x.id AND capacita_execution.publication_available(p.id, p_owner)));
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='version_unavailable'; END IF;
  versions := versions || jsonb_build_object(v.id::text, jsonb_build_object('status', v.status,
    'publication_id', (SELECT p.id FROM capacita_execution.publications p WHERE p.version_id = v.id AND p.active),
    'manifest', v.manifest, 'artifact_hash', v.artifact_hash, 'definition_hash', v.definition_hash, 'profile', v.profile));
 END LOOP;
 RETURN versions;
END $$;

-- Crea la aprobación (la persona tocó «Aprobar») y el trabajo. Origen Telegram: el trabajador edita
-- el mensaje p_message con el avance y manda el resultado a ese chat.
CREATE OR REPLACE FUNCTION capacita_execution.telegram_enqueue(p_owner uuid, p_chat bigint, w capacita_execution.workflows,
  p_inputs jsonb, p_key text, p_message bigint)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE versions jsonb; ap capacita_execution.workflow_approvals; j capacita_execution.jobs;
BEGIN
 IF p_key IS NULL OR length(p_key) NOT BETWEEN 1 AND 128 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_key'; END IF;
 IF p_inputs IS NULL OR jsonb_typeof(p_inputs) <> 'object' OR octet_length(p_inputs::text) > 9000000 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_inputs'; END IF;
 PERFORM pg_advisory_xact_lock(73426, 3);
 SELECT * INTO j FROM capacita_execution.jobs WHERE owner_id = p_owner AND kind = 'run' AND idempotency_key = p_key;
 IF FOUND THEN RETURN jsonb_build_object('job_id', j.id, 'status', j.status, 'repeated', true); END IF;
 IF (SELECT count(*) FROM capacita_execution.jobs WHERE owner_id = p_owner AND status IN ('queued', 'testing', 'running')) >= 3
  OR (SELECT count(*) FROM capacita_execution.jobs WHERE status IN ('queued', 'testing', 'running')) >= 20 THEN
  RAISE EXCEPTION USING ERRCODE='53000', MESSAGE='queue_full'; END IF;
 versions := capacita_execution.telegram_snapshot(p_owner, w.definition);
 INSERT INTO capacita_execution.workflow_approvals(owner_id, workflow_id, revision, definition_hash, inputs, versions)
 VALUES (p_owner, w.id, w.revision, w.definition_hash, p_inputs, versions) RETURNING * INTO ap;
 INSERT INTO capacita_execution.jobs(owner_id, kind, workflow_id, workflow_revision, approval_id, artifact_hash, payload,
   idempotency_key, request)
 VALUES (p_owner, 'run', w.id, w.revision, ap.id, w.definition_hash,
   jsonb_build_object('execution_type', 'workflow', 'definition', w.definition, 'versions', versions,
     'inputs', p_inputs, 'workflow_hash', w.definition_hash, 'revision', w.revision),
   p_key, jsonb_build_object('workflow_id', w.id, 'approval_id', ap.id, 'origen', 'telegram',
     'chat_id', p_chat, 'message_id', p_message)) RETURNING * INTO j;
 RETURN jsonb_build_object('job_id', j.id, 'status', j.status, 'repeated', false);
END $$;

-- ---------- Funciones del trabajador ----------

CREATE OR REPLACE FUNCTION public.telegram_owner(p_session uuid, p_chat bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l capacita_execution.telegram_links;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 SELECT * INTO l FROM capacita_execution.telegram_links WHERE chat_id = p_chat;
 IF NOT FOUND THEN RETURN jsonb_build_object('linked', false); END IF;
 RETURN jsonb_build_object('linked', true, 'consent', l.gemini_consent,
   'username', (SELECT username FROM public.profiles WHERE id = l.user_id));
END $$;

CREATE OR REPLACE FUNCTION public.telegram_set_consent(p_session uuid, p_chat bigint, p_consent boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 UPDATE capacita_execution.telegram_links SET gemini_consent = coalesce(p_consent, false) WHERE chat_id = p_chat;
 RETURN jsonb_build_object('saved', FOUND);
END $$;

CREATE OR REPLACE FUNCTION public.telegram_pending_put(p_session uuid, p_chat bigint, p_kind text, p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE nuevo uuid;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 IF capacita_execution.telegram_owner_of(p_chat) IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_linked'; END IF;
 DELETE FROM capacita_execution.telegram_pending WHERE expires_at <= now();
 -- Una conversación abierta por chat (la pregunta que espera respuesta): la nueva reemplaza a la anterior.
 IF p_kind = 'conversacion' THEN
  DELETE FROM capacita_execution.telegram_pending WHERE chat_id = p_chat AND kind = 'conversacion';
 END IF;
 IF (SELECT count(*) FROM capacita_execution.telegram_pending WHERE chat_id = p_chat) >= 40 THEN
  DELETE FROM capacita_execution.telegram_pending WHERE id IN (SELECT id FROM capacita_execution.telegram_pending
    WHERE chat_id = p_chat ORDER BY expires_at LIMIT 10);
 END IF;
 INSERT INTO capacita_execution.telegram_pending(chat_id, kind, payload) VALUES (p_chat, p_kind, p_payload) RETURNING id INTO nuevo;
 RETURN jsonb_build_object('id', nuevo);
END $$;

-- p_id NULL: la conversación abierta del chat. Solo devuelve lo de ESTE chat y sin vencer.
CREATE OR REPLACE FUNCTION public.telegram_pending_take(p_session uuid, p_chat bigint, p_id uuid, p_consume boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE t capacita_execution.telegram_pending;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 SELECT * INTO t FROM capacita_execution.telegram_pending WHERE chat_id = p_chat AND expires_at > now()
   AND ((p_id IS NOT NULL AND id = p_id) OR (p_id IS NULL AND kind = 'conversacion'))
   ORDER BY expires_at DESC LIMIT 1 FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
 IF p_consume THEN DELETE FROM capacita_execution.telegram_pending WHERE id = t.id; END IF;
 RETURN jsonb_build_object('found', true, 'id', t.id, 'kind', t.kind, 'payload', t.payload);
END $$;

CREATE OR REPLACE FUNCTION public.telegram_workflows(p_session uuid, p_chat bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE dueno uuid;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 dueno := capacita_execution.telegram_owner_of(p_chat);
 IF dueno IS NULL THEN RETURN jsonb_build_object('items', '[]'::jsonb); END IF;
 RETURN jsonb_build_object('items', coalesce((SELECT jsonb_agg(jsonb_build_object('id', w.id, 'revision', w.revision,
   'definition_hash', w.definition_hash, 'definition', w.definition) ORDER BY w.updated_at DESC)
   FROM (SELECT * FROM capacita_execution.workflows WHERE owner_id = dueno AND NOT archived
         ORDER BY updated_at DESC LIMIT 15) w), '[]'::jsonb));
END $$;

-- Versiones que el dueño puede usar (para el planner del bot): propias o publicadas disponibles.
CREATE OR REPLACE FUNCTION public.telegram_planner_versions(p_session uuid, p_chat bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE dueno uuid;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 dueno := capacita_execution.telegram_owner_of(p_chat);
 IF dueno IS NULL THEN RETURN jsonb_build_object('items', '[]'::jsonb); END IF;
 RETURN jsonb_build_object('items', coalesce((SELECT jsonb_agg(jsonb_build_object('id', x.id, 'capability_id', x.capability_id,
   'manifest', x.manifest, 'profile', x.profile, 'artifact_hash', x.artifact_hash, 'definition_hash', x.definition_hash,
   'publication_id', (SELECT p.id FROM capacita_execution.publications p WHERE p.version_id = x.id AND p.active),
   'own', x.owner_id = dueno))
   FROM (SELECT * FROM capacita_execution.versions v WHERE v.status = 'enabled'
     AND (v.owner_id = dueno OR EXISTS (SELECT 1 FROM capacita_execution.publications p
       WHERE p.version_id = v.id AND capacita_execution.publication_available(p.id, dueno)))
     ORDER BY v.created_at DESC LIMIT 300) x), '[]'::jsonb));
END $$;

-- Plan nuevo hecho en el bot: se guarda como solución del dueño (tope de 20 pasos) y se ejecuta.
CREATE OR REPLACE FUNCTION public.telegram_save_and_run(p_session uuid, p_chat bigint, p_definition jsonb, p_inputs jsonb,
  p_key text, p_message bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE dueno uuid; w capacita_execution.workflows; fingerprint text;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 dueno := capacita_execution.telegram_owner_of(p_chat);
 IF dueno IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_linked'; END IF;
 IF p_definition IS NULL OR jsonb_typeof(p_definition) <> 'object' OR octet_length(p_definition::text) > 65536
  OR jsonb_typeof(p_definition->'nodes') IS DISTINCT FROM 'array' THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_definition'; END IF;
 IF jsonb_array_length(p_definition->'nodes') NOT BETWEEN 1 AND 20 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='node_limit'; END IF;
 -- Reintento del mismo botón: no guarda otra solución.
 IF EXISTS (SELECT 1 FROM capacita_execution.jobs WHERE owner_id = dueno AND kind = 'run' AND idempotency_key = p_key) THEN
  RETURN (SELECT jsonb_build_object('job_id', id, 'status', status, 'repeated', true) FROM capacita_execution.jobs
    WHERE owner_id = dueno AND kind = 'run' AND idempotency_key = p_key);
 END IF;
 fingerprint := encode(sha256(convert_to(p_definition::text, 'UTF8')), 'hex');
 INSERT INTO capacita_execution.workflows(owner_id, definition, definition_hash)
 VALUES (dueno, p_definition, fingerprint) RETURNING * INTO w;
 INSERT INTO capacita_execution.workflow_revisions(workflow_id, revision, definition, definition_hash)
 VALUES (w.id, w.revision, w.definition, w.definition_hash);
 RETURN capacita_execution.telegram_enqueue(dueno, p_chat, w, p_inputs, p_key, p_message) || jsonb_build_object('workflow_id', w.id);
END $$;

-- Solución guardada: la revisión exacta que la persona vio en el botón.
CREATE OR REPLACE FUNCTION public.telegram_run_workflow(p_session uuid, p_chat bigint, p_workflow uuid, p_revision integer,
  p_hash text, p_inputs jsonb, p_key text, p_message bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE dueno uuid; w capacita_execution.workflows;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 dueno := capacita_execution.telegram_owner_of(p_chat);
 SELECT * INTO w FROM capacita_execution.workflows WHERE id = p_workflow AND owner_id = dueno AND NOT archived;
 IF dueno IS NULL OR NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 IF w.revision IS DISTINCT FROM p_revision OR w.definition_hash IS DISTINCT FROM p_hash THEN
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='revision_changed'; END IF;
 RETURN capacita_execution.telegram_enqueue(dueno, p_chat, w, p_inputs, p_key, p_message);
END $$;

-- El trabajo que ESTE trabajador ejecuta ahora, si salió del bot: a qué chat y mensaje avisar.
CREATE OR REPLACE FUNCTION public.telegram_job_origin(p_session uuid, p_job uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j capacita_execution.jobs; chat bigint;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 SELECT * INTO j FROM capacita_execution.jobs WHERE id = p_job AND worker_session = p_session AND status = 'running';
 IF NOT FOUND OR j.request->>'origen' IS DISTINCT FROM 'telegram' THEN RETURN jsonb_build_object('chat_id', NULL); END IF;
 -- El chat debe seguir vinculado al MISMO dueño (si lo desvinculó, no se le escribe).
 SELECT chat_id INTO chat FROM capacita_execution.telegram_links WHERE user_id = j.owner_id;
 IF chat IS DISTINCT FROM (j.request->>'chat_id')::bigint THEN RETURN jsonb_build_object('chat_id', NULL); END IF;
 RETURN jsonb_build_object('chat_id', chat, 'message_id', (j.request->>'message_id')::bigint);
END $$;

CREATE OR REPLACE FUNCTION public.telegram_jobs(p_session uuid, p_chat bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE dueno uuid;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 dueno := capacita_execution.telegram_owner_of(p_chat);
 IF dueno IS NULL THEN RETURN jsonb_build_object('items', '[]'::jsonb); END IF;
 RETURN jsonb_build_object('items', coalesce((SELECT jsonb_agg(jsonb_build_object('id', j.id, 'status', j.status,
   'created_at', j.created_at, 'name', j.payload->'definition'->>'name', 'error', j.report->>'error') ORDER BY j.created_at DESC)
   FROM (SELECT * FROM capacita_execution.jobs WHERE owner_id = dueno AND kind = 'run' ORDER BY created_at DESC LIMIT 10) j),
   '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.telegram_job_result(p_session uuid, p_chat bigint, p_job uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j capacita_execution.jobs;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 SELECT * INTO j FROM capacita_execution.jobs WHERE id = p_job AND owner_id = capacita_execution.telegram_owner_of(p_chat);
 IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
 RETURN jsonb_build_object('found', true, 'status', j.status, 'name', j.payload->'definition'->>'name',
   'report', j.report, 'output', j.output);
END $$;

CREATE OR REPLACE FUNCTION public.telegram_assistants(p_session uuid, p_chat bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE dueno uuid;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 dueno := capacita_execution.telegram_owner_of(p_chat);
 RETURN jsonb_build_object('items', coalesce((SELECT jsonb_agg(capacita_execution.public_assistant(a) ORDER BY a.created_at DESC)
   FROM capacita_execution.assistants a WHERE a.owner_id = dueno), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.telegram_assistant_set_active(p_session uuid, p_chat bigint, p_id uuid, p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a capacita_execution.assistants;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 SELECT * INTO a FROM capacita_execution.assistants WHERE id = p_id AND owner_id = capacita_execution.telegram_owner_of(p_chat) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 UPDATE capacita_execution.assistants SET active = coalesce(p_active, false), pause_reason = NULL,
   next_run_at = CASE WHEN p_active THEN capacita_execution.assistant_next_run(schedule, now()) ELSE next_run_at END
   WHERE id = a.id RETURNING * INTO a;
 RETURN capacita_execution.public_assistant(a);
END $$;

-- «Ejecutar ahora»: adelanta el turno; assistant_enqueue_due (db/17) lo encola con sus mismas reglas.
CREATE OR REPLACE FUNCTION public.telegram_assistant_run_now(p_session uuid, p_chat bigint, p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a capacita_execution.assistants;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 UPDATE capacita_execution.assistants SET next_run_at = now(), active = true, pause_reason = NULL
   WHERE id = p_id AND owner_id = capacita_execution.telegram_owner_of(p_chat) RETURNING * INTO a;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 RETURN capacita_execution.public_assistant(a);
END $$;

REVOKE ALL ON FUNCTION capacita_execution.telegram_owner_of(bigint), capacita_execution.telegram_snapshot(uuid, jsonb),
  capacita_execution.telegram_enqueue(uuid, bigint, capacita_execution.workflows, jsonb, text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.telegram_owner(uuid, bigint), public.telegram_set_consent(uuid, bigint, boolean),
  public.telegram_pending_put(uuid, bigint, text, jsonb), public.telegram_pending_take(uuid, bigint, uuid, boolean),
  public.telegram_workflows(uuid, bigint), public.telegram_planner_versions(uuid, bigint),
  public.telegram_save_and_run(uuid, bigint, jsonb, jsonb, text, bigint),
  public.telegram_run_workflow(uuid, bigint, uuid, integer, text, jsonb, text, bigint),
  public.telegram_job_origin(uuid, uuid), public.telegram_jobs(uuid, bigint), public.telegram_job_result(uuid, bigint, uuid),
  public.telegram_assistants(uuid, bigint), public.telegram_assistant_set_active(uuid, bigint, uuid, boolean),
  public.telegram_assistant_run_now(uuid, bigint, uuid) FROM PUBLIC, anon, authenticated;
-- Solo la cuenta del trabajador pasa check_worker; authenticated es el rol con el que entra.
GRANT EXECUTE ON FUNCTION public.telegram_owner(uuid, bigint), public.telegram_set_consent(uuid, bigint, boolean),
  public.telegram_pending_put(uuid, bigint, text, jsonb), public.telegram_pending_take(uuid, bigint, uuid, boolean),
  public.telegram_workflows(uuid, bigint), public.telegram_planner_versions(uuid, bigint),
  public.telegram_save_and_run(uuid, bigint, jsonb, jsonb, text, bigint),
  public.telegram_run_workflow(uuid, bigint, uuid, integer, text, jsonb, text, bigint),
  public.telegram_job_origin(uuid, uuid), public.telegram_jobs(uuid, bigint), public.telegram_job_result(uuid, bigint, uuid),
  public.telegram_assistants(uuid, bigint), public.telegram_assistant_set_active(uuid, bigint, uuid, boolean),
  public.telegram_assistant_run_now(uuid, bigint, uuid) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
