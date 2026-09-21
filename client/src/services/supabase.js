import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ideubwvlffbapneqftwj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Q5ynxzxEh3b5ildr02QEXQ_eTx9xmXZ"; // Tu clave anon pública

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 1. REGISTRO: Crea usuario en auth.users y pasa el nombre en raw_user_meta_data
 * El trigger de tu SQL se encarga de crear la fila en perfiles automáticamente.
 */
export async function registrarUsuario({ nombre, email, password }) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          nombre_completo: nombre.trim(), // <- Esto es lo que lee NEW.raw_user_meta_data->>'nombre_completo'
        },
      },
    });

    if (error) return { success: false, error: error.message };
    return { success: true, data: data.user };
  } catch (err) {
    return { success: false, error: "Error de conexión al registrar." };
  }
}

/**
 * 2. LOGIN: Valida credenciales contra auth.users y obtiene el perfil
 */
export async function loginUsuario({ email, password }) {
  try {
    // Autenticar en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (authError) return { success: false, error: authError.message };

    // Obtener los datos del perfil desde la tabla 'perfiles'
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (perfilError) {
      console.warn("No se pudo cargar el perfil:", perfilError);
    }

    return {
      success: true,
      data: {
        id: authData.user.id,
        email: authData.user.email,
        name: perfil?.nombre_completo || authData.user.user_metadata?.nombre_completo || email.split("@")[0],
        rol: perfil?.rol || "usuario",
        horas_balance: perfil?.horas_balance ?? 0,
        reputacion_promedio: perfil?.reputacion_promedio ?? 0,
      },
    };
  } catch (err) {
    return { success: false, error: "Error de conexión al iniciar sesión." };
  }
}

/**
 * 3. LOGIN CON GOOGLE
 */
export async function loginConGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
  });
  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/**
 * 4. CERRAR SESIÓN
 */
export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  return { success: !error, error: error?.message };
}

/**
 * 5. OBTENER SESIÓN ACTUAL (para mantener al usuario logueado al refrescar)
 */
export async function obtenerUsuarioActual() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return {
    id: session.user.id,
    email: session.user.email,
    name: perfil?.nombre_completo || session.user.user_metadata?.nombre_completo,
    rol: perfil?.rol || "usuario",
    horas_balance: perfil?.horas_balance ?? 0,
    reputacion_promedio: perfil?.reputacion_promedio ?? 0,
  };
}