-- 12. Archivos (fotos, PDF, Word, Excel) en entradas y salidas. Aplicar una sola vez.
-- Sube solo los límites de tamaño de datos; no cambia permisos, reglas ni privacidad.
-- Para no pisar cambios que existan en Supabase y no estén en este repositorio, toma
-- la definición viva de cada función y reemplaza únicamente el número del límite.
-- Si un texto esperado no aparece, se cancela todo sin cambiar nada.
--   datos de una ejecución (entradas, salidas, casos de prueba): 64 KiB -> 4 MB
--   foto completa del trabajo (versiones + plan + datos):          350 KB -> 8 MB
--   payload guardado de un trabajo:                                400 KB -> 9 MB
-- Los reportes siguen en 64 KiB: el motor ya no guarda archivos dentro de ellos.
BEGIN;
DO $$
DECLARE
  def text; patched text; t jsonb; s jsonb;
  targets constant jsonb := jsonb_build_array(
    jsonb_build_object('fn','public.execution_enqueue(text,text,jsonb)', 'swap', jsonb_build_array(
      jsonb_build_array('octet_length(p_request::text)>350000','octet_length(p_request::text)>8000000'),
      jsonb_build_array('octet_length((p_request->''cases'')::text)>65536','octet_length((p_request->''cases'')::text)>4000000'),
      jsonb_build_array('OR octet_length(p_request::text)>65536','OR octet_length(p_request::text)>4000000'))),
    jsonb_build_object('fn','public.execution_finish(uuid,uuid,text,jsonb,jsonb)', 'swap', jsonb_build_array(
      jsonb_build_array('octet_length(p_output::text)>65536','octet_length(p_output::text)>4000000'))),
    jsonb_build_object('fn','public.execution_workflow_approve(uuid,integer,text,jsonb)', 'swap', jsonb_build_array(
      jsonb_build_array('octet_length(p_inputs::text)>65536','octet_length(p_inputs::text)>4000000'),
      jsonb_build_array('octet_length(p_inputs::text)>350000','octet_length(p_inputs::text)>8000000'))),
    jsonb_build_object('fn','public.execution_public_enqueue(uuid,text,jsonb,jsonb)', 'swap', jsonb_build_array(
      jsonb_build_array('octet_length(req::text)>65536','octet_length(req::text)>4000000'))));
BEGIN
  FOR t IN SELECT value FROM jsonb_array_elements(targets) LOOP
    def := pg_get_functiondef((t->>'fn')::regprocedure);
    patched := def;
    FOR s IN SELECT value FROM jsonb_array_elements(t->'swap') LOOP
      IF position(s->>0 IN patched) = 0 THEN
        RAISE EXCEPTION 'No encontré "%" en %; no se cambió nada', s->>0, t->>'fn';
      END IF;
      patched := replace(patched, s->>0, s->>1);
    END LOOP;
    EXECUTE patched;
  END LOOP;
END $$;

-- Regla de tamaño del payload de cada trabajo (nombre automático en Supabase).
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
   WHERE conrelid='capacita_execution.jobs'::regclass AND contype='c'
     AND pg_get_constraintdef(oid) LIKE '%payload%400000%';
  IF c IS NULL THEN RAISE EXCEPTION 'No encontré la regla de 400000 del payload; no se cambió nada'; END IF;
  EXECUTE format('ALTER TABLE capacita_execution.jobs DROP CONSTRAINT %I', c);
END $$;
ALTER TABLE capacita_execution.jobs ADD CONSTRAINT jobs_payload_check
  CHECK (octet_length(payload::text) <= 9000000);
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): las cuatro filas deben decir true.
SELECT 'enqueue' AS funcion, pg_get_functiondef('public.execution_enqueue(text,text,jsonb)'::regprocedure) LIKE '%>4000000%' AS archivos_ok
UNION ALL SELECT 'finish', pg_get_functiondef('public.execution_finish(uuid,uuid,text,jsonb,jsonb)'::regprocedure) LIKE '%p_output::text)>4000000%'
UNION ALL SELECT 'approve', pg_get_functiondef('public.execution_workflow_approve(uuid,integer,text,jsonb)'::regprocedure) LIKE '%p_inputs::text)>4000000%'
UNION ALL SELECT 'payload', EXISTS(SELECT 1 FROM pg_constraint WHERE conname='jobs_payload_check'
  AND pg_get_constraintdef(oid) LIKE '%9000000%');
