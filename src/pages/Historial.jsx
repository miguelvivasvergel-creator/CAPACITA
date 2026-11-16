import { useEffect, useRef, useState } from 'react';
import DetalleResultado from '../components/runs/DetalleResultado';
import { botonRun, estadosRun, fechaRun } from '../components/runs/resultadoUtils';
import { cargarHistorial, cargarResultado, jsonObjeto } from '../services/historial';
import { ejecutarVersion } from '../services/versiones';

const input = 'mt-1 w-full rounded-lg border border-slate-300 p-3 font-mono text-sm focus:outline-2 focus:outline-blue-600';

export default function Historial({ runId, onCambiarSeccion }) {
  const [page, setPage] = useState({ items: [], next_cursor: null });
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [run, setRun] = useState(null);
  const [detailLoading, setDetailLoading] = useState(Boolean(runId));
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(false);
  const [inputs, setInputs] = useState('{}');
  const [parameters, setParameters] = useState('{}');
  const [sending, setSending] = useState(false);
  const key = useRef(null);
  const listController = useRef(null);
  const detailController = useRef(null);
  const alive = useRef(false);

  async function load(cursor = null) {
    listController.current?.abort();
    const controller = new AbortController(); listController.current = controller;
    setLoading(true); setListError('');
    try {
      const next = await cargarHistorial(cursor, controller.signal);
      if (!controller.signal.aborted) setPage(old => ({ ...next, items: cursor ? [...old.items, ...next.items.filter(item => !old.items.some(previous => previous.id === item.id))] : next.items }));
    } catch (cause) { if (!controller.signal.aborted) setListError(cause.message); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  useEffect(() => {
    alive.current = true; Promise.resolve().then(() => { if (alive.current) load(); });
    return () => { alive.current = false; listController.current?.abort(); detailController.current?.abort(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController(); detailController.current = controller;
    let timer;
    async function read() {
      try {
        const next = await cargarResultado(runId, controller.signal);
        if (controller.signal.aborted) return;
        setRun(next); setError(''); setDetailLoading(false);
        setPage(old => ({ ...old, items: old.items.map(item => item.id === next.id ? next : item) }));
        if (['queued', 'running'].includes(next.status)) timer = setTimeout(() => {
          if (document.visibilityState === 'visible') read();
        }, 2500);
      } catch (cause) { if (!controller.signal.aborted) { setError(cause.message); setDetailLoading(false); } }
    }
    function visible() { if (document.visibilityState === 'visible') { clearTimeout(timer); read(); } }
    if (runId) { read(); document.addEventListener('visibilitychange', visible); }
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener('visibilitychange', visible); };
  }, [runId]);

  function navigate(id) { onCambiarSeccion(`historial/${id}`); }
  async function refreshDetail() {
    if (!runId || detailLoading) return;
    setDetailLoading(true); setError('');
    const controller = detailController.current;
    try { const next = await cargarResultado(runId, controller.signal); if (!controller.signal.aborted) setRun(next); }
    catch (cause) { if (!controller.signal.aborted) setError(cause.message); }
    finally { if (!controller.signal.aborted) setDetailLoading(false); }
  }
  async function execute(event) {
    event.preventDefault(); if (sending) return;
    setSending(true); setError('');
    try {
      const data = jsonObjeto(inputs), options = jsonObjeto(parameters);
      key.current ||= crypto.randomUUID();
      const next = await ejecutarVersion(run.version_id, data, options, key.current);
      if (alive.current) { setRetry(false); navigate(next.id); load(); }
    } catch (cause) { if (alive.current) setError(cause.message); }
    finally { if (alive.current) setSending(false); }
  }
  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Mis ejecuciones</h1><p className="mt-2 max-w-2xl text-slate-600">Consulta tus resultados guardados y el progreso de tus capacidades y workflows. Solo tú puedes ver los datos de tus ejecuciones.</p></div><button type="button" className={botonRun} disabled={loading} onClick={() => load()}>Actualizar historial</button></header>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <section aria-label="Historial de ejecuciones" className="min-w-0 space-y-3">
        {loading && <p role="status">Cargando ejecuciones…</p>}{listError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{listError}</p>}
        {!loading && !listError && !page.items.length && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-slate-600">Todavía no tienes ejecuciones guardadas. Ejecuta una versión habilitada o un workflow aprobado para comenzar.</p>}
        <ul className="space-y-3">{page.items.map(item => <li key={item.id}><button type="button" aria-current={item.id === runId ? 'true' : undefined} onClick={() => navigate(item.id)} className={`w-full rounded-xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-blue-600 ${item.id === runId ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-400'}`}><span className="block font-semibold">{item.workflow_id ? 'Workflow' : 'Capacidad'} · {estadosRun[item.status] || item.status}</span><span className="mt-1 block text-sm text-slate-600">{fechaRun(item.created_at)}</span><span className="mt-2 block break-all text-xs text-slate-600">{item.id}</span></button></li>)}</ul>
        {page.next_cursor && <button type="button" className={botonRun} disabled={loading} onClick={() => load(page.next_cursor)}>Cargar más ejecuciones</button>}
      </section>
      <section aria-label="Detalle de ejecución" className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        {!runId && <p className="text-slate-600">Selecciona una ejecución para ver su resultado y sus pasos.</p>}
        {detailLoading && <p role="status">Consultando ejecución…</p>}{error && <p role="alert" className="break-words rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {runId && <button type="button" className={botonRun} disabled={detailLoading} onClick={refreshDetail}>Actualizar estado</button>}
        {run && <><DetalleResultado key={run.id} run={run} />{!['queued', 'running'].includes(run.status) && <div className="space-y-3 border-t border-slate-200 pt-4"><h3 className="font-semibold">Preparar otra ejecución</h3>{run.workflow_id ? <><p className="text-sm text-slate-600">Abre la revisión actual del workflow y revisa los datos. Necesita una aprobación nueva; el resultado anterior se conserva.</p><button type="button" className={botonRun} onClick={() => onCambiarSeccion(`workflows/${run.workflow_id}`)}>Abrir workflow para revisar y aprobar</button></> : <><p className="text-sm text-slate-600">Usará la misma versión, si continúa habilitada. Escribe los datos nuevos: no copiamos las entradas anteriores.</p><button type="button" className={botonRun} disabled={sending} onClick={() => setRetry(true)}>Introducir datos nuevos</button>{retry && <form onSubmit={execute} className="space-y-3"><label className="block text-sm font-medium">Datos nuevos (JSON)<textarea className={input} rows={5} value={inputs} disabled={sending} onChange={event => { setInputs(event.target.value); key.current = null; }} /></label><label className="block text-sm font-medium">Opciones (JSON)<textarea className={input} rows={3} value={parameters} disabled={sending} onChange={event => { setParameters(event.target.value); key.current = null; }} /></label><button className={botonRun} disabled={sending} type="submit">{sending ? 'Enviando…' : 'Confirmar y ejecutar con estos datos'}</button></form>}</>}</div>}</>}
      </section>
    </div>
  </div>;
}
