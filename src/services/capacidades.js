import { api } from '../api';

export function obtenerCapacidad(id, { signal } = {}) {
  return api(`/capabilities/${encodeURIComponent(id)}`, { signal });
}

export function listarCapacidades(scope, { cursor, signal, q, limit = 20 } = {}) {
  const params = new URLSearchParams({ scope, limit: String(limit) });
  if (q) params.set('q', q);
  if (cursor) params.set('cursor', cursor);
  return api(`/capabilities?${params}`, { signal });
}

export function clonarCapacidad(id) {
  return api(`/capabilities/${encodeURIComponent(id)}/clone`, { method: 'POST' });
}
