-- Frente A: perfil propio y fotos de perfil públicas. No toca tablas de B.
-- Ejecutar en SQL Editor de Supabase con rol administrador, después de revisar.
-- No modifica filas de profiles ni convierte un bucket privado en público.
BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL OR to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'Faltan profiles o Supabase Storage; revisar proyecto';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name IN ('id', 'username', 'display_name', 'bio', 'avatar_url', 'created_at')) <> 6 THEN
    RAISE EXCEPTION 'El esquema de profiles no coincide; no continuar';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatars' AND public IS NOT TRUE) THEN
    RAISE EXCEPTION 'avatars ya existe y es privado; revisar sin hacerlo público automáticamente';
  END IF;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT UPDATE (display_name, bio, avatar_url) ON public.profiles TO authenticated;

-- Restrictiva: otras políticas permisivas existentes no pueden autorizar editar ajenos.
DROP POLICY IF EXISTS capacita_profile_guard_07 ON public.profiles;
CREATE POLICY capacita_profile_guard_07 ON public.profiles AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
DROP POLICY IF EXISTS capacita_profile_edit_07 ON public.profiles;
CREATE POLICY capacita_profile_edit_07 ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- Los avatares son imágenes públicas de perfil; nunca usar para archivos privados.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;
UPDATE storage.buckets SET file_size_limit = 2097152, allowed_mime_types = ARRAY['image/png']
WHERE id = 'avatars' AND public IS TRUE;

-- Protecciones limitadas al bucket avatars. Para los demás buckets el guard no restringe.
DROP POLICY IF EXISTS capacita_avatar_insert_guard_07 ON storage.objects;
CREATE POLICY capacita_avatar_insert_guard_07 ON storage.objects AS RESTRICTIVE
  FOR INSERT TO public WITH CHECK (
    bucket_id <> 'avatars' OR (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      AND name ~ ('^' || (SELECT auth.uid())::text || '/[0-9a-f-]{36}[.]png$')
    )
  );
DROP POLICY IF EXISTS capacita_avatar_select_guard_07 ON storage.objects;
CREATE POLICY capacita_avatar_select_guard_07 ON storage.objects AS RESTRICTIVE
  FOR SELECT TO authenticated USING (
    bucket_id <> 'avatars' OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
DROP POLICY IF EXISTS capacita_avatar_delete_guard_07 ON storage.objects;
CREATE POLICY capacita_avatar_delete_guard_07 ON storage.objects AS RESTRICTIVE
  FOR DELETE TO public USING (
    bucket_id <> 'avatars' OR (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
-- Cada imagen nueva usa otro UUID. Ningún usuario sobrescribe avatares existentes.
DROP POLICY IF EXISTS capacita_avatar_update_guard_07 ON storage.objects;
CREATE POLICY capacita_avatar_update_guard_07 ON storage.objects AS RESTRICTIVE
  FOR UPDATE TO public USING (bucket_id <> 'avatars') WITH CHECK (bucket_id <> 'avatars');

DROP POLICY IF EXISTS capacita_avatar_insert_07 ON storage.objects;
CREATE POLICY capacita_avatar_insert_07 ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS capacita_avatar_select_07 ON storage.objects;
CREATE POLICY capacita_avatar_select_07 ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
DROP POLICY IF EXISTS capacita_avatar_delete_07 ON storage.objects;
CREATE POLICY capacita_avatar_delete_07 ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

COMMIT;

-- Comprobación de grants efectivos; no incluye datos de usuarios.
SELECT
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'UPDATE') AS editar_nombre,
  has_column_privilege('authenticated', 'public.profiles', 'bio', 'UPDATE') AS editar_bio,
  has_column_privilege('authenticated', 'public.profiles', 'avatar_url', 'UPDATE') AS editar_avatar,
  has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE') AS editar_id,
  has_column_privilege('authenticated', 'public.profiles', 'username', 'UPDATE') AS editar_username;
-- Esperado: true, true, true, false, false. Verificar RLS con dos cuentas por API.
