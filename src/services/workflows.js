import { api } from '../api';

const pageQuery = (cursor) => cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
export const listarWorkflows = (cursor) => api(`/workflows${pageQuery(cursor)}`);
export const listarVersionesWorkflow = (cursor) => api(`/workflows/available-versions${pageQuery(cursor)}`);
export const obtenerWorkflow = (id) => api(`/workflows/${encodeURIComponent(id)}`);
export const validarWorkflow = (definition) => api('/workflows/validate', { method: 'POST', body: definition });
export const guardarWorkflow = (definition, saved) => api(saved ? `/workflows/${encodeURIComponent(saved.id)}` : '/workflows', {
  method: saved ? 'PUT' : 'POST', body: { definition, expected_revision: saved?.revision || null },
});
export const archivarWorkflow = (id) => api(`/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' });
// contentConsent: «Acepto» explícito cuando un paso envía el contenido a una IA externa (el
// backend lo exige para esos procesos).
export const aprobarWorkflow = (saved, inputs, contentConsent = false) => api(`/workflows/${encodeURIComponent(saved.id)}/approvals`, {
  method: 'POST', body: { revision: saved.revision, definition_hash: saved.definition_hash, inputs, content_consent: contentConsent },
});
export const ejecutarWorkflow = (id, approvalId, idempotencyKey) => api(`/workflows/${encodeURIComponent(id)}/runs`, {
  method: 'POST', idempotencyKey, body: { approval_id: approvalId },
});
