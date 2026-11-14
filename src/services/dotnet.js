// Integración .NET existente. Mantenerla hasta migrar y verificar sus consumidores.
const BASE = import.meta.env.VITE_DOTNET_API_URL || 'https://localhost:7015/api';

async function get(ruta, { signal } = {}) {
  const respuesta = await fetch(`${BASE}${ruta}`, { signal });
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${ruta}`);
  return respuesta.json();
}

export const getPerfil = (username) => get(`/Perfiles/${encodeURIComponent(username)}`);
export const buscarPerfiles = (texto, limite = 8) =>
  get(`/Perfiles?q=${encodeURIComponent(texto)}&limit=${limite}`);
export const buscarTodo = (texto, limite = 5, options) =>
  get(`/Buscar?q=${encodeURIComponent(texto)}&limit=${limite}`, options);
