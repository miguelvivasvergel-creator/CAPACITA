import { api } from '../api';

export function crearPrueba(candidate, cases, idempotencyKey) {
  return api('/builds', {
    method: 'POST', idempotencyKey,
    body: { candidate_id: candidate.id, artifact_hash: candidate.manifest.artifact_hash, cases },
  });
}

export function consultarPrueba(id) {
  return api(`/builds/${encodeURIComponent(id)}`);
}

export function listarPruebas(candidateId, cursor) {
  const query = new URLSearchParams({ candidate_id: candidateId });
  if (cursor) query.set('cursor', cursor);
  return api(`/builds?${query}`);
}
