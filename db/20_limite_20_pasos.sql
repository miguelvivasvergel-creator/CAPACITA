-- 20: una solución puede tener hasta 20 pasos (antes 12).
-- Un pedido completo (varios datos, textos en varios idiomas y envíos) llegaba a 14 pasos y, con 12,
-- el planner tenía que dejar partes fuera. Debe coincidir con MAX_NODOS en backend/schemas/workflows.py.
-- Solo cambia el tope de execution_workflow_save (db/08); el resto de la función queda igual.
-- CREATE OR REPLACE conserva los permisos (GRANT) que ya tenía la función.
-- Ejecutar UNA vez en el SQL Editor de Supabase, DESPUÉS de db/08. Se puede repetir sin daño.

CREATE OR REPLACE FUNCTION public.execution_workflow_save(p_id uuid,p_expected integer,p_definition jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE w capacita_execution.workflows; fingerprint text;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002',MESSAGE='not_found'; END IF;
 IF p_definition IS NULL OR jsonb_typeof(p_definition)<>'object'
  OR octet_length(p_definition::text)>65536 OR jsonb_typeof(p_definition->'nodes') IS DISTINCT FROM 'array'
 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='invalid_definition'; END IF;
 IF jsonb_array_length(p_definition->'nodes') NOT BETWEEN 1 AND 20 THEN
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

-- Comprobación: debe devolver tope_20 = true.
SELECT position('AND 20' IN pg_get_functiondef('public.execution_workflow_save(uuid,integer,jsonb)'::regprocedure)) > 0 AS tope_20;
