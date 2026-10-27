const BASE = import.meta.env.VITE_DOTNET_API_URL || 'https://localhost:7015/api';

async function get(ruta) {
  const respuesta = await fetch(`${BASE}${ruta}`);
  if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status} en ${ruta}`);
  return respuesta.json();
}

export const getComunidad = () => get('/Comunidad');
export const getCreadores = () => get('/Comunidad/creadores');
export const getPopulares = () => get('/Comunidad/populares');
export const getPerfil = (username) => get(`/Perfiles/${encodeURIComponent(username)}`);
export const buscarPerfiles = (texto, limite = 8) =>
  get(`/Perfiles?q=${encodeURIComponent(texto)}&limit=${limite}`);