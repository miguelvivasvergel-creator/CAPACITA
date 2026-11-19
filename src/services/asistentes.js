import { api } from '../api';

// Asistentes recurrentes (fase 5): una solución guardada que se ejecuta sola con horario.
export const listarAsistentes = () => api('/assistants');
export const crearAsistente = (guardada, inputs, horario, nombre, contentConsent = false) => api('/assistants', {
  method: 'POST',
  body: { workflow_id: guardada.id, revision: guardada.revision, definition_hash: guardada.definition_hash, inputs,
    schedule: horario, name: nombre.slice(0, 80), content_consent: contentConsent },
});
export const pausarAsistente = (id) => api(`/assistants/${encodeURIComponent(id)}/pause`, { method: 'POST' });
export const reanudarAsistente = (id) => api(`/assistants/${encodeURIComponent(id)}/resume`, { method: 'POST' });
export const borrarAsistente = (id) => api(`/assistants/${encodeURIComponent(id)}`, { method: 'DELETE' });

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
/** {frequency:'weekly', days:[1,3], time:'07:00'} → «Cada lunes y miércoles a las 07:00». */
export function horarioEnPalabras(horario) {
  if (horario?.frequency === 'daily') return `Todos los días a las ${horario.time}`;
  const dias = (horario?.days || []).map((dia) => DIAS[dia - 1]).filter(Boolean);
  if (dias.length === 7) return `Todos los días a las ${horario.time}`;
  const lista = dias.length > 1 ? `${dias.slice(0, -1).join(', ')} y ${dias.at(-1)}` : dias[0] || '';
  return `Cada ${lista} a las ${horario?.time}`;
}
