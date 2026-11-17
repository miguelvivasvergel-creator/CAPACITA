// Estados visibles de cada nodo del taller; el backend sigue siendo la fuente de verdad.
export const ESTADOS_NODO = {
  espera: { icono: '⚪', texto: 'En espera', clase: 'border-slate-300 bg-white' },
  queued: { icono: '⏳', texto: 'En cola', clase: 'border-slate-400 bg-white' },
  pending: { icono: '⚪', texto: 'En espera', clase: 'border-slate-300 bg-white' },
  running: { icono: '🔵', texto: 'Trabajando', clase: 'border-blue-500 bg-blue-50 taller-pulso' },
  completed: { icono: '🟢', texto: 'Listo', clase: 'border-emerald-500 bg-emerald-50' },
  failed: { icono: '🔴', texto: 'Falló', clase: 'border-red-500 bg-red-50' },
  interrupted: { icono: '🔴', texto: 'Interrumpido', clase: 'border-red-500 bg-red-50' },
  skipped: { icono: '⏭️', texto: 'Omitido', clase: 'border-slate-300 bg-slate-100' },
  creando: { icono: '🛠️', texto: 'Creándose', clase: 'border-amber-500 bg-amber-50 taller-pulso' },
  aprobar: { icono: '🔒', texto: 'Espera tu aprobación', clase: 'border-violet-500 bg-violet-50' },
};
