-- Preparado para el esquema real inspeccionado el 13/11/2026.
-- Aplicar únicamente al proyecto de Capacita verificado por el usuario.
-- Habilita lectura autenticada; no concede escritura ni altera políticas.
-- profiles_select_all permite leer los campos de perfiles de otros usuarios.
-- capabilities_select limita filas a propias o públicas publicadas.
-- Pendiente: comprobar privacidad con dos cuentas reales después de aplicar.

BEGIN;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capabilities ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON TABLE public.profiles, public.capabilities TO authenticated;

COMMIT;

-- Verifica permisos efectivos sin leer filas de usuarios.
SELECT
  has_table_privilege('authenticated', 'public.profiles', 'SELECT')
    AS authenticated_reads_profiles,
  has_table_privilege('authenticated', 'public.capabilities', 'SELECT')
    AS authenticated_reads_capabilities;
