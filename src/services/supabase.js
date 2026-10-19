import { createClient } from '@supabase/supabase-js';

// Se leen del .env (ver .env.example). Los valores por defecto son la llave
// pública (anon) del proyecto, para que nadie se quede sin poder correr la app.
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://ideubwvlffbapneqftwj.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_Q5ynxzxEh3b5ildr02QEXQ_eTx9xmXZ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Normaliza y extrae los datos del usuario asegurando que el nombre y avatar
 * correspondan exactamente a la cuenta autenticada.
 */
export function extraerDatosUsuario(authUser, perfil = null) {
  if (!authUser) return null;

  const meta = authUser.user_metadata || {};

  // 1. Detección exhaustiva del nombre real de la cuenta
  let nombre = null;

  if (perfil?.nombre_completo && perfil.nombre_completo.trim() !== '' && perfil.nombre_completo !== 'Usuario') {
    nombre = perfil.nombre_completo.trim();
  } else if (meta.nombre_completo && meta.nombre_completo.trim() !== '') {
    nombre = meta.nombre_completo.trim();
  } else if (meta.full_name && meta.full_name.trim() !== '') {
    nombre = meta.full_name.trim();
  } else if (meta.name && meta.name.trim() !== '') {
    nombre = meta.name.trim();
  } else if (meta.display_name && meta.display_name.trim() !== '') {
    nombre = meta.display_name.trim();
  } else if (perfil?.nombre_completo && perfil.nombre_completo.trim() !== '') {
    nombre = perfil.nombre_completo.trim();
  } else if (authUser.email) {
    // Si no tiene nombre explícito, formatear desde el prefijo del correo (ej: 'juan.perez' -> 'Juan Perez')
    const raw = authUser.email.split('@')[0];
    nombre = raw
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } else {
    nombre = 'Usuario';
  }

  // 2. Detección del avatar acorde a la cuenta (Google, Supabase o iniciales reales)
  const avatar =
    perfil?.avatar_url ||
    meta.avatar_url ||
    meta.picture ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(nombre)}&background=1a56db&color=fff&size=128&bold=true`;

  return {
    id: authUser.id,
    email: authUser.email,
    // Nombre de usuario para la URL del perfil (#perfil/:username)
    username: perfil?.username || authUser.email?.split('@')[0] || authUser.id,
    name: nombre,
    avatar_url: avatar,
    rol: perfil?.rol || 'usuario',
    horas_balance: perfil?.horas_balance ?? 0,
    reputacion_promedio: perfil?.reputacion_promedio ?? 0,
  };
}

/**
 * 1. REGISTRO
 */
export async function registrarUsuario({ nombre, email, password }) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password,
      options: {
        data: {
          nombre_completo: nombre.trim(),
          full_name: nombre.trim(),
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data.user };
  } catch {
    return { success: false, error: "Error de conexión al registrar." };
  }
}

/**
 * 2. INICIO DE SESIÓN
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
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    const usuarioFormateado = extraerDatosUsuario(authData.user, perfil);

    return {
      success: true,
      data: usuarioFormateado,
    };
  } catch {
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
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch {
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
  } catch {
    return { success: false, error: "Error al cerrar sesión." };
  }
}

/**
 * 5. OBTENER USUARIO ACTUAL (Para mantener la sesión activa y al recargar)
 */
export async function obtenerUsuarioActual() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    return extraerDatosUsuario(session.user, perfil);
  } catch {
    return null;
  }
}
