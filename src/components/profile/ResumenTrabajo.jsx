import { useEffect, useState } from 'react';
import { cargarMetrica } from '../../services/dashboard';

const CARDS = [
  ['capabilities', 'Mis capacidades', 'capacidades'],
  ['workflows', 'Mis workflows', 'workflows'],
  ['runs', 'Mis ejecuciones', 'historial'],
];
const STATES = { queued: 'En cola', running: 'En curso', completed: 'Completadas', failed: 'Fallidas', interrupted: 'Interrumpidas' };

export default function ResumenTrabajo({ onCambiarSeccion }) {
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
  return <section aria-labelledby="resumen-trabajo" className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="resumen-trabajo" className="text-xl font-bold text-slate-900">Tu trabajo en Capacita</h2>
      <button type="button" disabled={loading} onClick={() => { setMetrics({}); setUpdated(null); setRevision((value) => value + 1); }} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">{loading ? 'Actualizando…' : 'Actualizar resumen'}</button>
    </div>
    <p className="mt-2 text-sm text-slate-500">Solo tu cuenta. Las ejecuciones incluyen capacidades y workflows; no incluyen pruebas del laboratorio.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      {CARDS.map(([key, title, section]) => {
        const result = metrics[key];
        return <article key={key} className="min-w-0 rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          {!result ? <p role="status" className="mt-3 text-sm text-slate-500">Cargando…</p> : result.error ? <p role="alert" className="mt-3 break-words text-sm text-red-700">No disponible: {result.error}</p> : <>
            <p className="mt-2 text-3xl font-bold text-slate-900">{result.data.count}{result.data.truncated ? '+' : ''}</p>
            {result.data.truncated && <p className="mt-2 text-xs text-amber-800">Recuento parcial: límite de 10 páginas. Puede haber más registros.</p>}
            {key === 'runs' && <dl className="mt-3 space-y-1 text-xs text-slate-600">{Object.entries(STATES).map(([status, label]) => <div key={status} className="flex justify-between gap-2"><dt>{label}</dt><dd>{result.data.states[status] || 0}</dd></div>)}</dl>}
          </>}
          <button type="button" onClick={() => onCambiarSeccion?.(section)} className="mt-4 text-sm font-semibold text-blue-700 underline">{`Abrir ${title.toLowerCase()}`}</button>
        </article>;
      })}
    </div>
    <p className="mt-4 text-xs text-slate-500">{updated ? `Última respuesta: ${updated.toLocaleTimeString()}. ` : ''}Recuento al consultar; puede cambiar durante la carga. Hasta 1.000 registros por sección.</p>
  </section>;
}
