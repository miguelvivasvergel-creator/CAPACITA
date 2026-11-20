-- 19. Google (fase 6): cada persona conecta SU cuenta (Gmail, Drive, Calendar) por OAuth.
-- Aplicar una sola vez DESPUES de 07 (trabajador).
-- El token de actualización llega YA CIFRADO (Fernet, clave solo en el backend/trabajador): la base
-- nunca lo ve en claro. El «state» del inicio de sesión es de un solo uso, vence en 10 minutos y
-- queda atado a la cuenta que lo pidió. El trabajador solo lee el token del dueño del trabajo que
-- está ejecutando.
BEGIN;
CREATE TABLE capacita_execution.google_links (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_cifrado text NOT NULL CHECK (length(token_cifrado) BETWEEN 20 AND 4000),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  scopes text NOT NULL CHECK (length(scopes) <= 2000),
  linked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE capacita_execution.google_states (
  state text PRIMARY KEY CHECK (state ~ '^[A-Za-z0-9_-]{32,128}$'),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  verifier text NOT NULL CHECK (verifier ~ '^[A-Za-z0-9_-]{43,128}$'),
  expires_at timestamptz NOT NULL
);
ALTER TABLE capacita_execution.google_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacita_execution.google_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON capacita_execution.google_links, capacita_execution.google_states FROM PUBLIC, anon, authenticated;

-- Persona: guarda el state y el verificador PKCE del inicio de sesión (borra los anteriores).
CREATE FUNCTION public.google_link_start(p_state text, p_verifier text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 DELETE FROM capacita_execution.google_states WHERE user_id = auth.uid() OR expires_at < now();
 INSERT INTO capacita_execution.google_states(state, user_id, verifier, expires_at)
 VALUES (p_state, auth.uid(), p_verifier, now() + interval '10 minutes');
 RETURN jsonb_build_object('ok', true);
END $$;

-- Persona: consume su state (un solo uso) y devuelve el verificador para cambiar el código.
CREATE FUNCTION public.google_state_take(p_state text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s capacita_execution.google_states;
BEGIN
 DELETE FROM capacita_execution.google_states WHERE state = p_state AND user_id = auth.uid() AND expires_at > now()
 RETURNING * INTO s;
 IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 RETURN jsonb_build_object('verifier', s.verifier);
END $$;

CREATE FUNCTION public.google_link_save(p_token text, p_email text, p_scopes text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 INSERT INTO capacita_execution.google_links(user_id, token_cifrado, email, scopes) VALUES (auth.uid(), p_token, p_email, p_scopes)
 ON CONFLICT (user_id) DO UPDATE SET token_cifrado = EXCLUDED.token_cifrado, email = EXCLUDED.email,
   scopes = EXCLUDED.scopes, linked_at = now();
 RETURN jsonb_build_object('linked', true, 'email', p_email);
END $$;

CREATE FUNCTION public.google_link_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l capacita_execution.google_links;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 SELECT * INTO l FROM capacita_execution.google_links WHERE user_id = auth.uid();
 RETURN jsonb_build_object('linked', FOUND, 'email', l.email, 'linked_at', l.linked_at, 'scopes', l.scopes);
END $$;

-- Persona: desconectar. Devuelve el token cifrado una última vez para revocarlo en Google.
CREATE FUNCTION public.google_unlink()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l capacita_execution.google_links;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 DELETE FROM capacita_execution.google_links WHERE user_id = auth.uid() RETURNING * INTO l;
 DELETE FROM capacita_execution.google_states WHERE user_id = auth.uid();
 RETURN jsonb_build_object('linked', false, 'token_cifrado', l.token_cifrado);
END $$;

-- Trabajador: token cifrado y correo del dueño del trabajo que ejecuta ahora (y solo de ese).
CREATE FUNCTION public.google_token_for_job(p_session uuid, p_job uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l capacita_execution.google_links;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 SELECT g.* INTO l FROM capacita_execution.jobs j JOIN capacita_execution.google_links g ON g.user_id = j.owner_id
   WHERE j.id = p_job AND j.worker_session = p_session AND j.status = 'running';
 RETURN jsonb_build_object('token_cifrado', l.token_cifrado, 'email', l.email);
END $$;

REVOKE ALL ON FUNCTION public.google_link_start(text, text), public.google_state_take(text), public.google_link_save(text, text, text),
  public.google_link_status(), public.google_unlink(), public.google_token_for_job(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.google_link_start(text, text), public.google_state_take(text), public.google_link_save(text, text, text),
  public.google_link_status(), public.google_unlink(), public.google_token_for_job(uuid, uuid) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): deben aparecer las 6 funciones google_….
SELECT p.proname AS funcion FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'google_%' ORDER BY 1;
