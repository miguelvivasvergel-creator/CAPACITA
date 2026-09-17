const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ideubwvlffbapneqftwj.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_Q5ynxzxEh3b5ildr02QEXQ_eTx9xmXZ";

/**
 * Registra un nuevo usuario en la tabla 'usuarios' de Supabase
 * @param {Object} param0
 * @param {string} param0.nombre
 * @param {string} param0.email
 * @param {string} param0.password
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function registrarUsuario({ nombre, email, password }) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/usuarios`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        nombre,
        email,
        password_hash: password,
      }),
    });

    if (!response.ok) {
      let errorMsg = "No se pudo completar el registro.";
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.message || errorJson.hint || errorJson.details || errorMsg;
      } catch {
        errorMsg = response.statusText || errorMsg;
      }
      return { success: false, error: errorMsg };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err.message || "Error de conexión al registrar usuario.",
    };
  }
}
