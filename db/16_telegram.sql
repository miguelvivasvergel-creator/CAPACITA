-- 16. Telegram (fase 3): cada persona vincula SU chat con el bot y solo recibe lo suyo.
-- Aplicar una sola vez DESPUES de 07 (trabajador) y 14 (conectores).
-- El número del chat es dato personal: tablas privadas sin acceso directo; solo funciones.
-- La persona genera un código de un solo uso (15 min) y lo envía al bot con /start; el trabajador
-- (cuenta autorizada con reserva activa) completa el vínculo. Nadie más puede leer los chats.
BEGIN;
CREATE TABLE capacita_execution.telegram_links (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  chat_id bigint NOT NULL UNIQUE,
  linked_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE capacita_execution.telegram_codes (
  code text PRIMARY KEY CHECK (code ~ '^[0-9A-F]{12}$'),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX telegram_codes_user ON capacita_execution.telegram_codes(user_id);
ALTER TABLE capacita_execution.telegram_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE capacita_execution.telegram_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON capacita_execution.telegram_links, capacita_execution.telegram_codes FROM PUBLIC, anon, authenticated;

-- Persona: nuevo código (borra los anteriores y los vencidos).
CREATE FUNCTION public.telegram_link_start()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c text; vence timestamptz := now() + interval '15 minutes';
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 DELETE FROM capacita_execution.telegram_codes WHERE user_id = auth.uid() OR expires_at < now();
 -- gen_random_uuid usa un generador aleatorio seguro; 12 hexadecimales = 48 bits.
 c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
 INSERT INTO capacita_execution.telegram_codes(code, user_id, expires_at) VALUES (c, auth.uid(), vence);
 RETURN jsonb_build_object('code', c, 'expires_at', vence);
END $$;

CREATE FUNCTION public.telegram_link_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l capacita_execution.telegram_links;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 SELECT * INTO l FROM capacita_execution.telegram_links WHERE user_id = auth.uid();
 RETURN jsonb_build_object('linked', FOUND, 'linked_at', l.linked_at);
END $$;

CREATE FUNCTION public.telegram_unlink()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='not_found'; END IF;
 DELETE FROM capacita_execution.telegram_links WHERE user_id = auth.uid();
 DELETE FROM capacita_execution.telegram_codes WHERE user_id = auth.uid();
 RETURN jsonb_build_object('linked', false);
END $$;

-- Trabajador: completa el vínculo con el código que la persona envió al bot.
CREATE FUNCTION public.telegram_link_complete(p_session uuid, p_code text, p_chat_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE c capacita_execution.telegram_codes;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 IF p_code IS NULL OR p_chat_id IS NULL THEN RETURN jsonb_build_object('linked', false); END IF;
 SELECT * INTO c FROM capacita_execution.telegram_codes
   WHERE code = upper(p_code) AND expires_at > now() FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('linked', false); END IF;
 DELETE FROM capacita_execution.telegram_codes WHERE code = c.code;
 -- Un chat pertenece a una sola cuenta: si estaba con otra, se mueve a esta.
 DELETE FROM capacita_execution.telegram_links WHERE chat_id = p_chat_id AND user_id <> c.user_id;
 INSERT INTO capacita_execution.telegram_links(user_id, chat_id) VALUES (c.user_id, p_chat_id)
 ON CONFLICT (user_id) DO UPDATE SET chat_id = EXCLUDED.chat_id, linked_at = now();
 RETURN jsonb_build_object('linked', true,
   'username', (SELECT username FROM public.profiles WHERE id = c.user_id));
END $$;

-- Trabajador: la persona escribió /salir al bot.
CREATE FUNCTION public.telegram_unlink_chat(p_session uuid, p_chat_id bigint)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 DELETE FROM capacita_execution.telegram_links WHERE chat_id = p_chat_id;
 RETURN jsonb_build_object('unlinked', FOUND);
END $$;

-- Trabajador: el chat del dueño del trabajo que está ejecutando ahora (y solo de ese).
CREATE FUNCTION public.telegram_chat_for_job(p_session uuid, p_job uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE chat bigint;
BEGIN
 PERFORM capacita_execution.check_worker(p_session);
 SELECT l.chat_id INTO chat FROM capacita_execution.jobs j
   JOIN capacita_execution.telegram_links l ON l.user_id = j.owner_id
   WHERE j.id = p_job AND j.worker_session = p_session AND j.status = 'running';
 RETURN jsonb_build_object('chat_id', chat);
END $$;

REVOKE ALL ON FUNCTION public.telegram_link_start(), public.telegram_link_status(), public.telegram_unlink(),
  public.telegram_link_complete(uuid, text, bigint), public.telegram_unlink_chat(uuid, bigint),
  public.telegram_chat_for_job(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.telegram_link_start(), public.telegram_link_status(), public.telegram_unlink(),
  public.telegram_link_complete(uuid, text, bigint), public.telegram_unlink_chat(uuid, bigint),
  public.telegram_chat_for_job(uuid, uuid) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';

-- Comprobación (solo lectura): deben aparecer las 6 funciones.
SELECT p.proname AS funcion FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'telegram_%' ORDER BY 1;
