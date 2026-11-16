import { api } from '../api';

export const buscarOpcionesPlan = (objective, signal, mode = 'text') => api('/planner/options', { method: 'POST', body: { objective, mode }, signal });
export const proponerPlan = (objective, versions, signal, mode = 'text') => api('/planner/propose', {
  method: 'POST', body: { objective, version_ids: versions.map((version) => version.id),
    version_hashes: Object.fromEntries(versions.map((version) => [version.id, version.review_hash])),
    consent_to_provider: true, mode }, signal,
});
