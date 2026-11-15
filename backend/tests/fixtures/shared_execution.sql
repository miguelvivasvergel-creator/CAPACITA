-- Solo base temporal: emula Auth y catálogo mínimos; NO aplicar en Supabase.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE TABLE public.profiles(id uuid PRIMARY KEY REFERENCES auth.users(id));
CREATE TABLE public.capabilities(id uuid PRIMARY KEY,owner_id uuid REFERENCES public.profiles(id),
  visibility text DEFAULT 'private',status text DEFAULT 'draft');
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_own ON public.capabilities FOR SELECT TO authenticated USING(owner_id=auth.uid());
GRANT SELECT ON public.capabilities TO authenticated;
