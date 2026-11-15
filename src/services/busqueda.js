import { api } from '../api';

export async function buscarTodo(texto, limite = 5, { signal, modo = 'text', scope = 'available', tipo = 'all', capabilitiesCursor, profilesCursor } = {}) {
  const data = await api('/search', { method: 'POST', signal, body: {
    query: texto, mode: modo, scope, kind: tipo, limit: limite,
    capabilities_cursor: capabilitiesCursor || null, profiles_cursor: profilesCursor || null,
  } });
  return { ...data, usuarios: data.profiles.items, capacidades: data.capabilities.items,
    workflows: [], cursores: { usuarios: data.profiles.next_cursor, capacidades: data.capabilities.next_cursor } };
}
