// src/utils/formato.js
// Funciones pequeñas para mostrar fechas y duraciones de forma amigable.

/** '2026-10-03T14:20:00Z' → '3 oct 2026, 9:20 a. m.' */
export function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** '2026-09-22T12:00:00Z' → 'septiembre de 2026' */
export function formatearMesAnio(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

/** 8400 → '8,4 s' · 95000 → '1 min 35 s' · null → '—' */
export function formatearDuracion(ms) {
  if (ms === null || ms === undefined) return '—';
  const segundos = ms / 1000;
  if (segundos < 60) {
    return `${segundos.toLocaleString('es-CO', { maximumFractionDigits: 1 })} s`;
  }
  const minutos = Math.floor(segundos / 60);
  return `${minutos} min ${Math.round(segundos % 60)} s`;
}
