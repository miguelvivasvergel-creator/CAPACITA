// src/api.js
// Punto único para llamar al backend FastAPI. Todos los módulos lo usan.
import { supabase } from './services/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

/**
 * Llama a un endpoint del backend agregando el token de Supabase.
 * - Devuelve el campo `data` de la respuesta estándar (APIResponse).
 * - Si el backend responde 401, cierra la sesión.
 * - Si hay error, lanza un Error con el mensaje `detail` de FastAPI.
 *
 * Ejemplos:
 *   api('/users/fahida')
 *   api('/runs', { method: 'POST', body: { workflow_id, text } })
 *   api('/users/me/avatar', { method: 'POST', body: formData })
 */
export async function api(ruta, { method = 'GET', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession();

  const headers = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  // FormData (archivos) se envía tal cual; lo demás como JSON
  const esArchivo = body instanceof FormData;
  if (body && !esArchivo) {
    headers['Content-Type'] = 'application/json';
  }

  const respuesta = await fetch(`${API_URL}${ruta}`, {
    method,
    headers,
    body: body ? (esArchivo ? body : JSON.stringify(body)) : undefined,
  });

  if (respuesta.status === 401) {
    await supabase.auth.signOut();
    throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
  }

  const json = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(json.detail || 'No se pudo conectar con el servidor.');
  }

  return json.data;
}
