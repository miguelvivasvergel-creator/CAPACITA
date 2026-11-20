import { useEffect, useState } from 'react';
import Icono from '../common/Icono';
import { borrarAsistente, horarioEnPalabras, listarAsistentes, pausarAsistente, reanudarAsistente } from '../../services/asistentes';

const BOTON = 'min-h-11 rounded-xl px-3 py-2 text-sm font-semibold disabled:opacity-50';
const PAUSA = {
  pausado: 'Lo pausaste tú.',
  tres_fallos: 'Se pausó solo: falló 3 veces seguidas. Revisa la solución y reanúdalo.',
  solucion_cambio: 'Se pausó solo: la solución cambió. Crea el asistente de nuevo sobre la versión actual.',
  version_no_disponible: 'Se pausó solo: una herramienta del proceso ya no está disponible.',
};
const ESTADO = { completed: 'Salió bien', failed: 'Falló', interrupted: 'Se interrumpió', queued: 'En cola', running: 'Trabajando' };
const fecha = (valor) => (valor ? new Date(valor).toLocaleString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—');

/** «Mis asistentes»: soluciones que se ejecutan solas con horario (fase 5). */
// mostrarVacio: en el filtro «Asistentes» de Mi biblioteca se explica cómo crear el primero.
export default function MisAsistentes({ onCambiarSeccion, mostrarVacio = false }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState('');

  const cargar = () => listarAsistentes().then((valor) => setItems(valor.items || [])).catch((causa) => setError(causa.message));
  useEffect(() => { cargar(); }, []);

  async function accion(id, tarea, confirmar) {
    if (confirmar && !window.confirm(confirmar)) return;
    setOcupado(id); setError('');
    try { await tarea(id); await cargar(); } catch (causa) { setError(causa.message); } finally { setOcupado(''); }
  }

  if (items === null && !error) return null;
  if (items && !items.length && !error) return mostrarVacio ? <p className="guiado-vacio">Todavía no tienes asistentes. Ejecuta una solución en el chat y toca «Repetir automáticamente» para que trabaje sola con un horario.</p> : null;
  return <section aria-label="Mis asistentes" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
    <h2 className="font-sans text-base font-extrabold tracking-tight text-slate-900"><Icono nombre="actualizar" className="mr-1 inline h-4 w-4 align-[-3px]" />Mis asistentes</h2>
    <p className="mb-3 text-xs text-slate-500">Se ejecutan solos con el horario que elegiste, con los mismos datos que aprobaste. Máximo 5 activos.</p>
    {error && <p role="alert" className="mb-2 text-sm text-red-700">{error}</p>}
    <ul className="space-y-3">{(items || []).map((asistente) => <li key={asistente.id} className="rounded-xl bg-slate-50 p-3 text-sm">
      <p className="break-words font-semibold text-slate-900">{asistente.name}</p>
      <p className="text-slate-700">{horarioEnPalabras(asistente.schedule)}</p>
      {asistente.active ? <p className="text-xs text-slate-600">Próximo turno: {fecha(asistente.next_run_at)}</p>
        : <p className="text-xs text-amber-800"><Icono nombre="pausa" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />{PAUSA[asistente.pause_reason] || 'En pausa.'}</p>}
      {asistente.last_job_id && <p className="text-xs text-slate-600">Último: {ESTADO[asistente.last_status] || asistente.last_status} · {fecha(asistente.last_run_at)}
        {' · '}<button type="button" className="font-semibold text-blue-700 underline" onClick={() => onCambiarSeccion?.(`historial/${asistente.last_job_id}`)}>ver resultado</button></p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {asistente.active
          ? <button type="button" disabled={ocupado === asistente.id} onClick={() => accion(asistente.id, pausarAsistente)} className={`${BOTON} border border-slate-300`}>Pausar</button>
          : asistente.pause_reason !== 'solucion_cambio' && <button type="button" disabled={ocupado === asistente.id} onClick={() => accion(asistente.id, reanudarAsistente)} className={`${BOTON} bg-emerald-600 text-white`}>Reanudar</button>}
        <button type="button" disabled={ocupado === asistente.id} onClick={() => accion(asistente.id, borrarAsistente, `¿Borrar el asistente «${asistente.name}»? Sus resultados anteriores se conservan.`)} className={`${BOTON} border border-red-200 text-red-700`}>Borrar</button>
      </div>
    </li>)}</ul>
  </section>;
}
