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

/** Cambia nombre y/o descripción (no cambia cómo funciona ni la despublica). */
export function actualizarCapacidad(id, cambios) {
  return api(`/capabilities/${encodeURIComponent(id)}`, { method: 'PUT', body: cambios });
}

/** Elimina una herramienta propia: deja de aparecer y de ejecutarse; su historial se conserva (db/22). */
export function eliminarCapacidad(id) {
  return api(`/capabilities/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
