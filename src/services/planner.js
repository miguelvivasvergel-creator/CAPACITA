import { api } from '../api';

// completo: además de lo que encontró la búsqueda, TODOS los conectores, para que la IA elija.
export const buscarOpcionesPlan = (objective, signal, mode = 'text', completo = false) => api('/planner/options', {
  method: 'POST', body: { objective, mode, completo }, signal,
});
// auto: la IA elige primero entre todas las versiones qué piezas sirven y cuántas veces (paso 1) y
// después arma el plan solo con esas. Sin auto (modo desarrollador) se envían las que eligió la persona.
export const proponerPlan = (objective, versions, signal, mode = 'text', auto = false) => api('/planner/propose', {
  method: 'POST', body: { objective, version_ids: versions.map((version) => version.id),
    version_hashes: Object.fromEntries(versions.map((version) => [version.id, version.review_hash])),
    consent_to_provider: true, mode, completo: auto, auto }, signal,
});
