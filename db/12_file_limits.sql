-- 12. Archivos (fotos, PDF, Word, Excel) en entradas y salidas. Aplicar una sola vez.
-- Sube solo los límites de tamaño de datos; no cambia permisos, reglas ni privacidad.
-- Supabase tiene versiones de estas funciones distintas a las del repositorio (experimento
-- managed-tools), así que se toma la definición VIVA de cada función y solo se cambia el
-- número de cada comparación octet_length(...) > 65536 / 350000, escrita como esté.
--   datos de una ejecución (entradas, salidas, casos de prueba): 64 KiB -> 4 MB
--   foto completa del trabajo (versiones + plan + datos):          350 KB -> 8 MB
--   payload guardado de un trabajo:                                400 KB -> 9 MB
-- Una función que no exista o no tenga esos límites se omite (aviso NOTICE); si ninguna
-- cambia, se cancela todo sin cambiar nada. La consulta final muestra lo que quedó.
BEGIN;
DO $$
DECLARE
  fn text; proc regprocedure; def text; patched text; changed int := 0;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.execution_enqueue(text,text,jsonb)',
    'public.execution_finish(uuid,uuid,text,jsonb,jsonb)',
    'public.execution_workflow_approve(uuid,integer,text,jsonb)',
    'public.execution_public_enqueue(uuid,text,jsonb,jsonb)'] LOOP
    proc := to_regprocedure(fn);
    IF proc IS NULL THEN
      RAISE NOTICE 'No existe %; se omite', fn;
      CONTINUE;
    END IF;
    def := pg_get_functiondef(proc);
    -- Solo comparaciones de tamaño en una misma línea: octet_length(...) > número.
    -- \1 conserva intacto el texto "octet_length(...) >" y solo cambia el número.
    patched := regexp_replace(def, '(octet_length\([^\n]{1,120}?\)\s*>\s*)65536\M', '\14000000', 'g');
    patched := regexp_replace(patched, '(octet_length\([^\n]{1,120}?\)\s*>\s*)350000\M', '\18000000', 'g');
    IF patched = def THEN
      RAISE NOTICE 'Sin límites 65536/350000 en %; se omite', fn;
      CONTINUE;
    END IF;
    EXECUTE patched;
    changed := changed + 1;
  END LOOP;
  IF changed = 0 THEN
    RAISE EXCEPTION 'No encontré ningún límite de tamaño; no se cambió nada';
  END IF;
END $$;

-- Regla de tamaño del payload de cada trabajo (el nombre puede variar en Supabase).
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid='capacita_execution.jobs'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) ILIKE '%octet_length%payload%' LOOP
    EXECUTE format('ALTER TABLE capacita_execution.jobs DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE capacita_execution.jobs ADD CONSTRAINT jobs_payload_check
  CHECK (octet_length(payload::text) <= 9000000);
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): muestra cada límite de tamaño que quedó en las funciones.
SELECT p.proname AS funcion, m[1] AS limite
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
     LATERAL regexp_matches(pg_get_functiondef(p.oid), 'octet_length\([^\n]{1,120}?\)\s*>\s*\d+', 'g') AS m
WHERE n.nspname = 'public' AND p.proname IN
  ('execution_enqueue','execution_finish','execution_workflow_approve','execution_public_enqueue')
UNION ALL
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'capacita_execution.jobs'::regclass AND conname = 'jobs_payload_check';
