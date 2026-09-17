// Configuración de Supabase
const SUPABASE_URL = "https://ideubwvlffbapneqftwj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Q5ynxzxEh3b5ildr02QEXQ_eTx9xmXZ";

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Registra un nuevo usuario en Supabase
 */
export async function registrarUsuario({ nombre, email, password }) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
      method: "POST",
      headers: { ...HEADERS, Prefer: "return=representation" },
      body: JSON.stringify({
        nombre: nombre.trim(),
        email: email.trim(),
        password_hash: password,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err.message || "No se pudo registrar el usuario." };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Error de conexión al registrar." };
  }
}

/**
 * Inicia sesión buscando el usuario en Supabase
 */
export async function loginUsuario({ email, password }) {
  try {
    const url = `${SUPABASE_URL}/rest/v1/usuarios?email=eq.${encodeURIComponent(email.trim())}&select=*`;
    const res = await fetch(url, { method: "GET", headers: HEADERS });

    if (!res.ok) {
      return { success: false, error: "Error al consultar usuario." };
    }

    const usuarios = await res.json();
    if (!usuarios || usuarios.length === 0) {
      return { success: false, error: "Usuario no encontrado." };
    }

    const usuario = usuarios[0];
    if (usuario.password_hash && usuario.password_hash !== password) {
      return { success: false, error: "Contraseña incorrecta." };
    }

    return {
      success: true,
      data: {
        id: usuario.id,
        name: usuario.nombre || usuario.email.split("@")[0],
        email: usuario.email,
        rol: usuario.rol || "cliente",
      },
    };
  } catch (err) {
    return { success: false, error: "Error de conexión al iniciar sesión." };
  }
}
