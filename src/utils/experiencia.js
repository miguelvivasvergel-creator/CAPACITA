const clave = id => `capacita:experiencia:${id}`;
export function leerExperiencia(id) {
  if (!id) return 'guiado';
  try { return localStorage.getItem(clave(id)) === 'desarrollador' ? 'desarrollador' : 'guiado'; }
  catch { return 'guiado'; }
}
export function guardarExperiencia(id, value) {
  if (!id || !['guiado', 'desarrollador'].includes(value)) return;
  try { localStorage.setItem(clave(id), value); } catch { /* La preferencia sigue disponible en memoria. */ }
}
