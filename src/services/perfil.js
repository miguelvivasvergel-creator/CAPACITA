import { api } from '../api';

export function listarCapacidadesPerfil(username, { cursor, signal } = {}) {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);
  return api(`/users/${encodeURIComponent(username)}/capabilities?${params}`, { signal });
}

export async function cargarPerfil(username, usuarioActual, { signal } = {}) {
  const target = username === usuarioActual?.username ? 'me' : username;
  let profile;
  try { profile = await api(`/users/${encodeURIComponent(target)}`, { signal }); }
  catch (cause) { if (cause.status === 404) return null; throw cause; }
  try {
    const page = await listarCapacidadesPerfil(target, { signal });
    return { perfil: { ...profile, capabilities: page.items,
      stats: { ...profile.stats, public_capabilities: page.next_cursor ? null : page.items.length } }, next_cursor: page.next_cursor, capacidadesError: '' };
  } catch (cause) {
    if (signal?.aborted) throw cause;
    return { perfil: { ...profile, capabilities: [] }, next_cursor: null, capacidadesError: cause.message };
  }
}

export function guardarPerfil({ display_name, bio, foto }) {
  if (!foto) return api('/users/me', { method: 'PATCH', body: { display_name, bio } });
  // Una sola petición: la foto se carga antes de confirmar nombre/bio y su URL.
  const body = new FormData();
  body.append('file', foto);
  body.append('display_name', display_name);
  body.append('bio', bio);
  return api('/users/me/avatar', { method: 'POST', body });
}
