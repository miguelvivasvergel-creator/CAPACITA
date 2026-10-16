-- ==============================================================
-- CAPACITA: EJECUCIONES Y ARCHIVOS (Módulo D - Fahida)
-- ==============================================================

-- 1. Tabla runs: cada ejecución de un workflow o de una sola capacidad
CREATE TABLE IF NOT EXISTS public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  workflow_id UUID NULL,     -- FK a workflows cuando exista la tabla (Módulo C)
  capability_id UUID NULL REFERENCES public.capabilities(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,               -- estado de cada paso
  accepted_permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  input_file_id UUID NULL,
  output_text TEXT NULL,
  output_file_path VARCHAR(500) NULL,                      -- outputs/{user_id}/{run_id}
  error TEXT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP WITH TIME ZONE NULL,
  -- Se ejecuta un workflow O una capacidad, nunca los dos
  CONSTRAINT runs_un_objetivo CHECK (num_nonnulls(workflow_id, capability_id) = 1)
);

CREATE INDEX IF NOT EXISTS runs_user_id_idx ON public.runs (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS runs_workflow_id_idx ON public.runs (workflow_id, started_at DESC);

-- RLS: entradas y salidas son privadas, solo las ve quien ejecutó.
-- (FastAPI usa la service key, así que además se filtra en el código.)
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo el dueño ve sus ejecuciones" ON public.runs;
CREATE POLICY "Solo el dueño ve sus ejecuciones"
  ON public.runs FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Buckets de Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)     -- fotos de perfil: lectura pública
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('outputs', 'outputs', false)    -- resultados: privados, solo con URL firmada
ON CONFLICT (id) DO NOTHING;
