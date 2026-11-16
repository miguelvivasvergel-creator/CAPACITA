export const estadosRun = { queued: 'En cola', running: 'Ejecutando', completed: 'Completada', failed: 'Fallida', interrupted: 'Interrumpida', pending: 'Pendiente', skipped: 'Omitido' };
export const botonRun = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50';
export const fechaRun = (value) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString() : 'Sin fecha';
