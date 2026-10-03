-- ==============================================================
-- CAPACITA: ESQUEMA BASE DE DATOS (Supabase / PostgreSQL)
-- ==============================================================

-- 1. Extensión para vectores (Búsqueda semántica)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Tabla perfiles (Vinculada a auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE,
  nombre_completo VARCHAR(150) NOT NULL,
  biografia TEXT,
  avatar_url VARCHAR(500),
  horas_balance NUMERIC(10,2) DEFAULT 0,
  reputacion_promedio NUMERIC(3,2) DEFAULT 0,
  rol VARCHAR(20) NOT NULL DEFAULT 'usuario',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NULL
);

-- Trigger: al registrarse en auth.users se crea su fila en perfiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nombre_completo',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      'Usuario'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS de perfiles
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura pública de perfiles" ON public.perfiles;
CREATE POLICY "Lectura pública de perfiles"
  ON public.perfiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Solo el dueño edita su perfil" ON public.perfiles;
CREATE POLICY "Solo el dueño edita su perfil"
  ON public.perfiles FOR UPDATE
  USING (auth.uid() = id);

-- 3. Tabla capabilities (Módulo B - Franklin)
CREATE TABLE IF NOT EXISTS public.capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  input_type VARCHAR(20) NOT NULL CHECK (input_type IN ('pdf', 'texto', 'imagen', 'audio', 'datos')),
  output_type VARCHAR(20) NOT NULL CHECK (output_type IN ('pdf', 'texto', 'imagen', 'audio', 'datos')),
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  version VARCHAR(20) DEFAULT '1.0.0',
  permissions JSONB DEFAULT '[]'::jsonb,
  adapter_key VARCHAR(50) NULL,
  config JSONB DEFAULT '{}'::jsonb,
  cloned_from UUID NULL REFERENCES public.capabilities(id) ON DELETE SET NULL,
  uses_count INTEGER DEFAULT 0,
  clones_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NULL
);

ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Cualquiera lee capacidades públicas o las suyas" ON public.capabilities;
CREATE POLICY "Cualquiera lee capacidades públicas o las suyas"
  ON public.capabilities FOR SELECT
  USING (visibility = 'public' OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Solo el dueño administra sus capacidades" ON public.capabilities;
CREATE POLICY "Solo el dueño administra sus capacidades"
  ON public.capabilities FOR ALL
  USING (auth.uid() = owner_id);
