import { api } from '../api';

export function habilitarVersion(candidateId, buildId) {
  return api('/versions', { method: 'POST', body: { candidate_id: candidateId, build_id: buildId } });
}

export function listarVersiones(candidateId, cursor) {
  const query = new URLSearchParams({ candidate_id: candidateId });
  if (cursor) query.set('cursor', cursor);
  return api(`/versions?${query}`);
}

export function deshabilitarVersion(id) {
  return api(`/versions/${encodeURIComponent(id)}/disable`, { method: 'POST' });
}

export function ejecutarVersion(versionId, inputs, parameters, idempotencyKey) {
  return api('/runs', { method: 'POST', idempotencyKey, body: { version_id: versionId, inputs, parameters } });
}

export function consultarRun(id) {
  return api(`/runs/${encodeURIComponent(id)}`);
}

export function listarRuns(cursor) {
  const query = new URLSearchParams();
  if (cursor) query.set('cursor', cursor);
  return api(`/runs?${query}`);
}
