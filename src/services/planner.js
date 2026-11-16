import { api } from '../api';

export const buscarOpcionesPlan = (objective, signal) => api('/planner/options', { method: 'POST', body: { objective }, signal });
export const proponerPlan = (objective, versions, signal) => api('/planner/propose', {
  method: 'POST', body: { objective, version_ids: versions.map((version) => version.id),
    version_hashes: Object.fromEntries(versions.map((version) => [version.id, version.review_hash])),
    consent_to_provider: true }, signal,
});
