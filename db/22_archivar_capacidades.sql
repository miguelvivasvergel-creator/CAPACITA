-- 22. Eliminar (archivar) una herramienta propia sin perder el historial.
-- Aplicar una sola vez DESPUÉS de 07_shared_execution, 08 y 09. Se puede volver a ejecutar.
-- Borrar la fila no sirve: sus versiones probadas y sus ejecuciones la referencian. Archivar la saca de
-- Mi biblioteca, del planner y de la comunidad, deshabilita sus versiones (ya no se ejecutan) y retira su
-- publicación; las ejecuciones anteriores y sus resultados se conservan.
BEGIN;
ALTER TABLE public.capabilities ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.capability_archive(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE versiones integer;
BEGIN
 -- Solo el dueño; si no es suya (o no existe, o ya se archivó) se responde igual: no encontrada.
 PERFORM 1 FROM public.capabilities WHERE id=p_id AND owner_id=auth.uid() AND NOT archived FOR UPDATE;
 IF auth.uid() IS NULL OR NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 UPDATE capacita_execution.publications p SET active=false, withdrawn_at=coalesce(p.withdrawn_at, now())
  FROM capacita_execution.versions v
  WHERE v.id=p.version_id AND v.capability_id=p_id AND v.owner_id=auth.uid() AND p.active;
 UPDATE capacita_execution.versions SET status='disabled', disabled_at=coalesce(disabled_at, now())
  WHERE capability_id=p_id AND owner_id=auth.uid() AND status='enabled';
 GET DIAGNOSTICS versiones = ROW_COUNT;
 UPDATE public.capabilities SET archived=true, visibility='private', status='draft', updated_at=now()
  WHERE id=p_id AND owner_id=auth.uid();
 RETURN jsonb_build_object('id', p_id, 'archived', true, 'disabled_versions', versiones);
END $$;
REVOKE ALL ON FUNCTION public.capability_archive(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.capability_archive(uuid) TO authenticated;
COMMIT;

-- Comprobación: debe devolver archivar_listo = true.
SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='capabilities'
  AND column_name='archived') AND to_regprocedure('public.capability_archive(uuid)') IS NOT NULL AS archivar_listo;
