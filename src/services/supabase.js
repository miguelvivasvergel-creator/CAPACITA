import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ideubwvlffbapneqftwj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Q5ynxzxEh3b5ildr02QEXQ_eTx9xmXZ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * 1. REGISTRO
 * Crea el usuario en auth.users pasando el nombre completo en user_metadata.
 * El trigger SQL 'on_auth_user_created' insertará automáticamente en la tabla 'perfiles'.
 */
export async function registrarUsuario({ nombre, email, password }) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          nombre_completo: nombre.trim(),
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data.user };
  } catch (err) {
    return { success: false, error: "Error de conexión al registrar." };
  }
}

/**
 * 2. INICIO DE SESIÓN
 * Autentica contra auth.users y recupera los datos del perfil desde 'perfiles'.
 */
export async function loginUsuario({ email, password }) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password,
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    // Consultar el perfil del usuario autenticado
    const { data: perfil, error: perfilError } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (perfilError) {
      console.warn("Aviso al obtener perfil:", perfilError.message);
    }

    return {
      success: true,
      data: {
        id: authData.user.id,
        email: authData.user.email,
        name: perfil?.nombre_completo || authData.user.user_metadata?.nombre_completo || email.split('@')[0],
        rol: perfil?.rol || 'usuario',
        horas_balance: perfil?.horas_balance ?? 0,
        reputacion_promedio: perfil?.reputacion_promedio ?? 0,
      },
    };
  } catch (err) {
    return { success: false, error: "Error de conexión al iniciar sesión." };
  }
}

/**
 * 3. INICIO DE SESIÓN CON GOOGLE
 */
export async function loginConGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Error al conectar con Google." };
  }
}

/**
 * 4. CERRAR SESIÓN
 */
export async function cerrarSesion() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: "Error al cerrar sesión." };
  }
}

/**
 * 5. OBTENER USUARIO ACTUAL (Para mantener la sesión activa al recargar)
 */
export async function obtenerUsuarioActual() {
  try {
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
      name: perfil?.nombre_completo || session.user.user_metadata?.nombre_completo || session.user.email.split('@')[0],
      rol: perfil?.rol || 'usuario',
      horas_balance: perfil?.horas_balance ?? 0,
      reputacion_promedio: perfil?.reputacion_promedio ?? 0,
    };
  } catch (err) {
    return null;
  }
}
