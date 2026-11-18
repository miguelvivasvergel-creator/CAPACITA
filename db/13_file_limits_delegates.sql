-- 13. Límites de archivos en las funciones delegadas. Aplicar una sola vez, después de SQL 12.
-- En Supabase, execution_enqueue (experimento managed-tools) delega las herramientas Python
-- normales a otra función (execution_enqueue_python_v1) que SQL 12 no conocía y conservaba
-- los límites de 64 KB / 350 KB: por eso una foto en una ejecución directa daba 22023.
-- Igual que SQL 12: toma la definición VIVA de cada función public.execution_* y solo
-- cambia el número de cada comparación octet_length(...) > 65536 / 350000.
--   datos de una ejecución: 64 KiB -> 4 MB · foto completa del trabajo: 350 KB -> 8 MB
-- Alcance real (aplicado 17/11): también sube a 4 MB los 64 KiB de reportes de progreso y de
-- definiciones de workflow guardadas; el payload de cada trabajo sigue acotado a 9 MB (SQL 12).
-- No cambia permisos, reglas ni privacidad. La regla «parameters = {}» de las herramientas
-- managed se conserva. Si no queda ningún límite viejo, se cancela sin cambiar nada.
BEGIN;
DO $$
DECLARE r record; def text; patched text; changed int := 0;
BEGIN
  FOR r IN SELECT p.oid, p.oid::regprocedure AS fn
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname LIKE 'execution\_%' AND p.prokind = 'f' LOOP
    def := pg_get_functiondef(r.oid);
    -- \1 conserva intacto "octet_length(...) >" y solo cambia el número.
    patched := regexp_replace(def, '(octet_length\([^\n]{1,120}?\)\s*>\s*)65536\M', '\14000000', 'g');
    patched := regexp_replace(patched, '(octet_length\([^\n]{1,120}?\)\s*>\s*)350000\M', '\18000000', 'g');
    IF patched <> def THEN
      EXECUTE patched;
      changed := changed + 1;
      RAISE NOTICE 'Límites actualizados en %', r.fn;
    END IF;
  END LOOP;
  IF changed = 0 THEN
    RAISE EXCEPTION 'No quedaba ningún límite de 64 KB / 350 KB en public.execution_*; no se cambió nada';
  END IF;
END $$;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): cada límite de tamaño que quedó. Todos deben ser 4000000 u 8000000.
SELECT p.oid::regprocedure AS funcion, m[1] AS limite
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace,
     -- Cuantificador codicioso: con «?» PostgreSQL vuelve perezosa toda la expresión y corta el número.
     LATERAL regexp_matches(pg_get_functiondef(p.oid), 'octet_length\([^\n]{1,120}\)\s*>\s*[0-9]+', 'g') AS m
WHERE n.nspname = 'public' AND p.proname LIKE 'execution\_%' AND p.prokind = 'f'
ORDER BY 1;
