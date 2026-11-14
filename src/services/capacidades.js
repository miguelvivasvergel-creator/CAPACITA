import { api } from '../api';

export function listarCapacidades(scope, { cursor, signal } = {}) {
  const params = new URLSearchParams({ scope, limit: '20' });
  if (cursor) params.set('cursor', cursor);
  return api(`/capabilities?${params}`, { signal });
}

export function clonarCapacidad(id) {
  return api(`/capabilities/${encodeURIComponent(id)}/clone`, { method: 'POST' });
}
