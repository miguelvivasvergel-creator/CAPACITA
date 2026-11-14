import { api } from '../api';

export function revisarGeneracion(capabilityId, options = {}) {
  return api(`/capabilities/${encodeURIComponent(capabilityId)}/candidates/check`, { ...options, method: 'POST' });
}

export function listarCandidatos(capabilityId, options = {}) {
  const { cursor, ...request } = options;
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return api(`/capabilities/${encodeURIComponent(capabilityId)}/candidates${query}`, request);
}

export function generarCandidato(capabilityId, payload) {
  return api(`/capabilities/${encodeURIComponent(capabilityId)}/candidates`, { method: 'POST', body: payload });
}
