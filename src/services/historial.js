import { api } from '../api';

export function cargarHistorial(cursor, signal) {
  const query = new URLSearchParams({ limit: '20' });
  if (cursor) query.set('cursor', cursor);
  return api(`/runs?${query}`, { signal });
}
export const cargarResultado = (id, signal) => api(`/runs/${encodeURIComponent(id)}`, { signal });

export function jsonObjeto(text) {
  let value;
  try { value = JSON.parse(text); } catch { throw new Error('Escribe JSON válido en datos y opciones.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Los datos y las opciones deben ser objetos JSON.');
  return value;
}
