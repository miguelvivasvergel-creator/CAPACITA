-- 17. Asistentes recurrentes (fase 5): una solución guardada que se ejecuta sola con horario.
-- Aplicar una sola vez DESPUES de 08, 09 y 16.
-- Crear el asistente aprueba EXACTAMENTE esa revisión y esos datos; si la solución cambia, se
-- pausa. El trabajador (cuenta autorizada con reserva) pide los turnos vencidos y la base crea el
-- trabajo a nombre del dueño, con la misma comprobación de versiones que una aprobación manual.
-- Límites: 5 activos por persona, un trabajo por turno, turnos con más de 6 h de atraso se
-- saltan, 3 fallos seguidos pausan el asistente.
BEGIN;
CREATE TABLE capacita_execution.assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES capacita_execution.workflows(id),
  revision integer NOT NULL,
  definition_hash text NOT NULL,
  inputs jsonb NOT NULL CHECK (jsonb_typeof(inputs) = 'object' AND octet_length(inputs::text) <= 65536),
  schedule jsonb NOT NULL,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  active boolean NOT NULL DEFAULT true,
  pause_reason text,
  next_run_at timestamptz,
  last_run_at timestamptz,
  last_job_id uuid REFERENCES capacita_execution.jobs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assistants_due ON capacita_execution.assistants(next_run_at) WHERE active;
CREATE INDEX assistants_owner ON capacita_execution.assistants(owner_id);
ALTER TABLE capacita_execution.assistants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON capacita_execution.assistants FROM PUBLIC, anon, authenticated;
ALTER TABLE capacita_execution.jobs ADD COLUMN IF NOT EXISTS assistant_id uuid REFERENCES capacita_execution.assistants(id);

-- Horario: {"frequency":"daily"|"weekly","days":[1..7 ISO, 1 = lunes],"time":"HH:MM","timezone":"America/Bogota"}
CREATE FUNCTION capacita_execution.assistant_schedule_valid(p jsonb)
RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_typeof(p) = 'object'
   AND p->>'frequency' IN ('daily', 'weekly')
   AND coalesce(p->>'time', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   AND EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = coalesce(p->>'timezone', ''))
   AND (p->>'frequency' = 'daily' OR (jsonb_typeof(p->'days') = 'array' AND jsonb_array_length(p->'days') BETWEEN 1 AND 7
        AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements_text(p->'days') d WHERE d.value !~ '^[1-7]$')))
$$;

CREATE FUNCTION capacita_execution.assistant_next_run(p jsonb, p_after timestamptz)
RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path='' AS $$
DECLARE tz text := p->>'timezone'; hora time := (p->>'time')::time; dias int[];
 base date := (p_after AT TIME ZONE tz)::date; candidato timestamptz;
BEGIN
 IF p->>'frequency' = 'daily' THEN dias := ARRAY[1,2,3,4,5,6,7];
 ELSE SELECT array_agg(d.value::int) INTO dias FROM jsonb_array_elements_text(p->'days') d; END IF;
 FOR i IN 0..8 LOOP
  IF extract(isodow FROM base + i)::int = ANY(dias) THEN
   candidato := ((base + i) + hora) AT TIME ZONE tz;
   IF candidato > p_after THEN RETURN candidato; END IF;
  END IF;
 END LOOP;
 RETURN NULL;
END $$;

CREATE FUNCTION capacita_execution.public_assistant(a capacita_execution.assistants)
RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id', a.id, 'workflow_id', a.workflow_id, 'revision', a.revision, 'name', a.name,
  'schedule', a.schedule, 'active', a.active, 'pause_reason', a.pause_reason, 'next_run_at', a.next_run_at,
  'last_run_at', a.last_run_at, 'last_job_id', a.last_job_id, 'created_at', a.created_at,
  'last_status', (SELECT j.status FROM capacita_execution.jobs j WHERE j.id = a.last_job_id))
$$;

-- Persona: crear un asistente sobre su solución (revisión exacta) con sus datos fijos.
CREATE FUNCTION public.assistant_save(p_workflow uuid, p_revision integer, p_hash text, p_inputs jsonb,
 p_schedule jsonb, p_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w capacita_execution.workflows; a capacita_execution.assistants;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 SELECT * INTO w FROM capacita_execution.workflows WHERE id = p_workflow AND owner_id = auth.uid() AND NOT archived;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 IF p_revision IS DISTINCT FROM w.revision OR p_hash IS DISTINCT FROM w.definition_hash THEN
  RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='revision_changed'; END IF;
 IF p_inputs IS NULL OR jsonb_typeof(p_inputs) <> 'object' OR octet_length(p_inputs::text) > 65536
  OR NOT capacita_execution.assistant_schedule_valid(p_schedule) OR length(coalesce(p_name, '')) NOT BETWEEN 1 AND 80 THEN
  RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid_assistant'; END IF;
 IF (SELECT count(*) FROM capacita_execution.assistants WHERE owner_id = auth.uid() AND active) >= 5 THEN
  RAISE EXCEPTION USING ERRCODE='53000', MESSAGE='assistant_limit'; END IF;
 INSERT INTO capacita_execution.assistants(owner_id, workflow_id, revision, definition_hash, inputs, schedule, name, next_run_at)
 VALUES (auth.uid(), w.id, w.revision, w.definition_hash, p_inputs, p_schedule, p_name,
         capacita_execution.assistant_next_run(p_schedule, now()))
 RETURNING * INTO a;
 RETURN capacita_execution.public_assistant(a);
END $$;

CREATE FUNCTION public.assistant_list()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 RETURN jsonb_build_object('items', coalesce((SELECT jsonb_agg(capacita_execution.public_assistant(a) ORDER BY a.created_at DESC)
   FROM capacita_execution.assistants a WHERE a.owner_id = auth.uid()), '[]'::jsonb), 'next_cursor', NULL);
END $$;

-- Reanudar vuelve a calcular el próximo turno; si la solución cambió, no se reanuda.
CREATE FUNCTION public.assistant_set_active(p_id uuid, p_active boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a capacita_execution.assistants; w capacita_execution.workflows;
BEGIN
 SELECT * INTO a FROM capacita_execution.assistants WHERE id = p_id AND owner_id = auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 IF p_active THEN
  SELECT * INTO w FROM capacita_execution.workflows WHERE id = a.workflow_id AND NOT archived;
  IF NOT FOUND OR w.revision <> a.revision OR w.definition_hash <> a.definition_hash THEN
   RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='revision_changed'; END IF;
  IF (SELECT count(*) FROM capacita_execution.assistants WHERE owner_id = auth.uid() AND active AND id <> a.id) >= 5 THEN
   RAISE EXCEPTION USING ERRCODE='53000', MESSAGE='assistant_limit'; END IF;
 END IF;
 UPDATE capacita_execution.assistants SET active = p_active,
   pause_reason = CASE WHEN p_active THEN NULL ELSE 'pausado' END,
   next_run_at = CASE WHEN p_active THEN capacita_execution.assistant_next_run(schedule, now()) ELSE next_run_at END
 WHERE id = a.id RETURNING * INTO a;
 RETURN capacita_execution.public_assistant(a);
END $$;

CREATE FUNCTION public.assistant_delete(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE capacita_execution.jobs SET assistant_id = NULL WHERE assistant_id = p_id AND owner_id = auth.uid();
 DELETE FROM capacita_execution.assistants WHERE id = p_id AND owner_id = auth.uid();
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 RETURN jsonb_build_object('deleted', true);
END $$;

-- Trabajador: crea los trabajos de los turnos vencidos (hasta 10 por llamada).
CREATE FUNCTION public.assistant_enqueue_due(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a capacita_execution.assistants; w capacita_execution.workflows; ap capacita_execution.workflow_approvals;
 j capacita_execution.jobs; node jsonb; v capacita_execution.versions; versions jsonb; creados int := 0; saltados int := 0;
 turno timestamptz;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 PERFORM pg_advisory_xact_lock(73426, 3);
 FOR a IN SELECT * FROM capacita_execution.assistants WHERE active AND next_run_at <= now()
   ORDER BY next_run_at LIMIT 10 FOR UPDATE SKIP LOCKED LOOP
  turno := a.next_run_at;
  j := NULL;
  -- El próximo turno se fija ya: pase lo que pase, este no se repite.
  UPDATE capacita_execution.assistants SET next_run_at = capacita_execution.assistant_next_run(schedule, greatest(now(), turno))
   WHERE id = a.id;
  IF now() - turno > interval '6 hours' THEN saltados := saltados + 1; CONTINUE; END IF;
  -- Tres fallos seguidos: se pausa.
  IF (SELECT count(*) FROM (SELECT status FROM capacita_execution.jobs WHERE assistant_id = a.id
       AND status IN ('completed', 'failed', 'interrupted') ORDER BY created_at DESC LIMIT 3) u WHERE u.status <> 'completed') = 3 THEN
   UPDATE capacita_execution.assistants SET active = false, pause_reason = 'tres_fallos' WHERE id = a.id;
   CONTINUE;
  END IF;
  -- Un trabajo a la vez por asistente, y los mismos topes de la cola que una ejecución manual.
  IF EXISTS (SELECT 1 FROM capacita_execution.jobs WHERE assistant_id = a.id AND status IN ('queued', 'testing', 'running'))
   OR (SELECT count(*) FROM capacita_execution.jobs WHERE owner_id = a.owner_id AND status IN ('queued', 'testing', 'running')) >= 3
   OR (SELECT count(*) FROM capacita_execution.jobs WHERE status IN ('queued', 'testing', 'running')) >= 20 THEN
   saltados := saltados + 1; CONTINUE;
  END IF;
  SELECT * INTO w FROM capacita_execution.workflows WHERE id = a.workflow_id AND NOT archived;
  IF NOT FOUND OR w.revision <> a.revision OR w.definition_hash <> a.definition_hash THEN
   UPDATE capacita_execution.assistants SET active = false, pause_reason = 'solucion_cambio' WHERE id = a.id;
   CONTINUE;
  END IF;
  versions := '{}'::jsonb;
  BEGIN
   FOR node IN SELECT value FROM jsonb_array_elements(w.definition->'nodes') LOOP
    SELECT x.* INTO v FROM capacita_execution.versions x WHERE x.id = (node->>'version_id')::uuid AND x.status = 'enabled'
      AND (x.owner_id = a.owner_id OR EXISTS (SELECT 1 FROM capacita_execution.publications p
        WHERE p.version_id = x.id AND capacita_execution.publication_available(p.id, a.owner_id)));
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='version_unavailable'; END IF;
    versions := versions || jsonb_build_object(v.id::text, jsonb_build_object('status', v.status,
      'publication_id', (SELECT p.id FROM capacita_execution.publications p WHERE p.version_id = v.id AND p.active),
      'manifest', v.manifest, 'artifact_hash', v.artifact_hash, 'definition_hash', v.definition_hash, 'profile', v.profile));
   END LOOP;
  EXCEPTION WHEN OTHERS THEN
   UPDATE capacita_execution.assistants SET active = false, pause_reason = 'version_no_disponible' WHERE id = a.id;
   CONTINUE;
  END;
  INSERT INTO capacita_execution.workflow_approvals(owner_id, workflow_id, revision, definition_hash, inputs, versions)
  VALUES (a.owner_id, w.id, w.revision, w.definition_hash, a.inputs, versions) RETURNING * INTO ap;
  INSERT INTO capacita_execution.jobs(owner_id, kind, workflow_id, workflow_revision, approval_id, artifact_hash, payload,
    idempotency_key, request, assistant_id)
  VALUES (a.owner_id, 'run', w.id, w.revision, ap.id, w.definition_hash,
    jsonb_build_object('execution_type', 'workflow', 'definition', w.definition, 'versions', versions,
      'inputs', a.inputs, 'workflow_hash', w.definition_hash, 'revision', w.revision),
    'asistente:' || a.id || ':' || extract(epoch FROM turno)::bigint,
    jsonb_build_object('workflow_id', w.id, 'approval_id', ap.id, 'assistant_id', a.id), a.id)
  ON CONFLICT (owner_id, kind, idempotency_key) DO NOTHING RETURNING * INTO j;
  IF j.id IS NOT NULL THEN
   UPDATE capacita_execution.assistants SET last_run_at = now(), last_job_id = j.id WHERE id = a.id;
   creados := creados + 1;
  END IF;
 END LOOP;
 RETURN jsonb_build_object('enqueued', creados, 'skipped', saltados);
END $$;

REVOKE ALL ON FUNCTION capacita_execution.assistant_schedule_valid(jsonb), capacita_execution.assistant_next_run(jsonb, timestamptz),
  capacita_execution.public_assistant(capacita_execution.assistants) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assistant_save(uuid, integer, text, jsonb, jsonb, text), public.assistant_list(),
  public.assistant_set_active(uuid, boolean), public.assistant_delete(uuid), public.assistant_enqueue_due(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assistant_save(uuid, integer, text, jsonb, jsonb, text), public.assistant_list(),
  public.assistant_set_active(uuid, boolean), public.assistant_delete(uuid), public.assistant_enqueue_due(uuid) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): próximo lunes a las 07:00 en Bogotá y las 5 funciones públicas.
SELECT capacita_execution.assistant_next_run('{"frequency":"weekly","days":[1],"time":"07:00","timezone":"America/Bogota"}', now()) AS proximo_lunes_7am;
SELECT p.proname AS funcion FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'assistant_%' ORDER BY 1;
