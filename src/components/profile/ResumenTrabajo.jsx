import { useEffect, useState } from 'react';
import { cargarMetrica } from '../../services/dashboard';
import Icono from '../common/Icono';

const CARDS = [
  ['capabilities', 'Mis capacidades', 'capacidades'],
  ['workflows', 'Mis workflows', 'workflows'],
  ['runs', 'Mis ejecuciones', 'historial'],
];
const STATES = { queued: 'En cola', running: 'En curso', completed: 'Completadas', failed: 'Fallidas', interrupted: 'Interrumpidas' };

export default function ResumenTrabajo({ onCambiarSeccion, experiencia = 'desarrollador' }) {
  const [metrics, setMetrics] = useState({});
  const [revision, setRevision] = useState(0);
  const [updated, setUpdated] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    for (const [key] of CARDS) {
      cargarMetrica(key, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) {
            setMetrics((previous) => ({ ...previous, [key]: { data } }));
            setUpdated(new Date());
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) setMetrics((previous) => ({ ...previous, [key]: { error: error.message } }));
        });
    }
    return () => controller.abort();
  }, [revision]);
  const loading = CARDS.some(([key]) => !metrics[key]);
  return <section aria-labelledby="resumen-trabajo" className="resumen-superficie">
    <div className="resumen-heading">
      <h2 id="resumen-trabajo">Tu trabajo en Capacita</h2>
      <button type="button" disabled={loading} onClick={() => { setMetrics({}); setUpdated(null); setRevision((value) => value + 1); }} className="resumen-actualizar disabled:opacity-50"><Icono nombre="actualizar" className="h-3 w-3"/>{loading ? 'Actualizando…' : 'Actualizar resumen'}</button>
    </div>
    <p className="resumen-nota">Un vistazo a lo que has creado y resuelto. Solo visible para ti.</p>
    <div className="resumen-grid">
      {CARDS.map(([key, originalTitle, section]) => {
        const title = experiencia === 'guiado' ? ({capabilities:'Mis herramientas',workflows:'Mis soluciones',runs:'Mis resultados'}[key]) : originalTitle;
        const result = metrics[key];
        return <article key={key} className="resumen-card">
          <div className="resumen-card-cabecera"><Icono nombre={{capabilities:'herramientas',workflows:'soluciones',runs:'resultados'}[key]}/><h3>{title}</h3></div>
          {!result ? <p role="status" className="mt-3 text-sm text-slate-500">Cargando…</p> : result.error ? <p role="alert" className="mt-3 break-words text-sm text-red-700">No disponible: {result.error}</p> : <>
            <p className="resumen-cifra">{result.data.count}{result.data.truncated ? '+' : ''}</p>
            {result.data.truncated && <p className="mt-2 text-xs text-amber-800">Recuento parcial: límite de 10 páginas. Puede haber más registros.</p>}
            {key === 'runs' && <details><summary>Ver estados</summary><dl className="mt-3 space-y-1 text-xs text-slate-600">{Object.entries(STATES).map(([status, label]) => <div key={status} className="flex justify-between gap-2"><dt>{label}</dt><dd>{result.data.states[status] || 0}</dd></div>)}</dl></details>}
          </>}
          <button type="button" onClick={() => onCambiarSeccion?.(section)} className="resumen-abrir">{`Abrir ${title.toLowerCase()}`}<Icono nombre="flecha"/></button>
        </article>;
      })}
    </div>
    <details className="asistente-detalles mt-3"><summary>Sobre estos recuentos</summary><p>Las ejecuciones incluyen capacidades y workflows; no incluyen pruebas del laboratorio. {updated ? `Última respuesta: ${updated.toLocaleTimeString()}. ` : ''}Recuento al consultar; puede cambiar durante la carga. Hasta 1.000 registros por sección.</p></details>
  </section>;
}
