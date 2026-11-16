import { useEffect, useRef, useState } from 'react';
import { api } from '../../api';
import ResultadoDatos from '../common/ResultadoDatos';

const BUTTON = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50';
const STATES = { queued: 'En cola', running: 'En curso', completed: 'Completada', failed: 'Fallida', interrupted: 'Interrumpida' };

// Solo se monta en el perfil del usuario autenticado; el endpoint vuelve a autorizar.
export default function HistorialPropio({ kind, onCambiarSeccion, experiencia = 'desarrollador' }) {
  const [page, setPage] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [revision, setRevision] = useState(0);
  const request = useRef(null);
  useEffect(() => {
    const controller = new AbortController(); request.current = controller;
    api(`/${kind}?limit=20`, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setPage(result); })
      .catch((cause) => { if (!controller.signal.aborted) setError(cause.message); });
    return () => controller.abort();
  }, [kind, revision]);
  async function perform(action) {
    if (busy) return;
    setBusy(true); setError('');
    try { await action(request.current.signal); }
    catch (cause) { if (!request.current.signal.aborted) setError(cause.message); }
    finally { if (!request.current.signal.aborted) setBusy(false); }
  }
  return <section className="space-y-4 rounded-xl border border-slate-200 p-4" aria-label={kind === 'runs' ? 'Mis ejecuciones privadas' : 'Mis workflows privados'}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold text-slate-900">{kind === 'runs' ? 'Mis ejecuciones privadas' : 'Mis workflows privados'}</h2>
      <button type="button" className={BUTTON} disabled={busy} onClick={() => { request.current?.abort(); setPage(null); setDetail(null); setError(''); setRevision((value) => value + 1); }}>Actualizar lista</button></div>
    <p className="text-sm text-slate-600">Solo tu cuenta puede consultar esta sección. No se publica en el perfil de otras personas.</p>
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
    {!page && !error && <p role="status" className="text-sm text-slate-500">Cargando…</p>}
    {page && !page.items.length && <p className="text-sm text-slate-500">Todavía no hay registros propios.</p>}
    <ul className="space-y-2">{page?.items.map((row) => <li key={row.id} className="rounded-lg border border-slate-200 p-3">
      <button type="button" disabled={busy} className="max-w-full break-words text-left text-sm font-semibold text-blue-700 underline disabled:opacity-50" onClick={() => perform(async (signal) => {
        const next = await api(`/${kind}/${encodeURIComponent(row.id)}`, { signal });
        if (!signal.aborted) setDetail(next);
      })}>{kind === 'workflows' ? row.definition.name : `${STATES[row.status] || row.status} · ${new Date(row.created_at).toLocaleString()}`}</button>
      {experiencia === 'desarrollador' && <p className="mt-1 break-all text-xs text-slate-500">{row.id}</p>}
    </li>)}</ul>
    {page?.next_cursor && <button type="button" disabled={busy} className={BUTTON} onClick={() => perform(async (signal) => {
      const next = await api(`/${kind}?limit=20&cursor=${encodeURIComponent(page.next_cursor)}`, { signal });
      if (!signal.aborted) setPage((old) => ({ ...next, items: [...old.items, ...next.items.filter((row) => !old.items.some((previous) => previous.id === row.id))] }));
    })}>Cargar más registros</button>}
    {detail && <section className="space-y-3 rounded-lg bg-slate-50 p-3" aria-label="Detalle privado">
      <h3 className="font-semibold text-slate-800">{kind === 'workflows' ? detail.definition.name : STATES[detail.status] || detail.status}</h3>
      {experiencia === 'desarrollador' ? <><p className="break-all text-xs text-slate-500">{detail.id}</p><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(kind === 'workflows' ? detail.definition : detail.output, null, 2)}</pre></> : kind === 'runs' ? <ResultadoDatos value={detail.output}/> : <ol className="list-decimal space-y-1 pl-5">{detail.definition.nodes.map(node=><li key={node.id}>{node.label}</li>)}</ol>}
      {kind === 'runs' && detail.output == null && <p className="text-sm">Esta ejecución todavía no tiene resultado. Consulta su estado actualizado.</p>}
      <button type="button" className={BUTTON} onClick={() => onCambiarSeccion?.(`${kind === 'runs' ? 'historial' : 'workflows'}/${detail.id}`)}>{kind === 'runs' ? 'Abrir resultado completo' : 'Abrir workflow para revisar'}</button>
      <button type="button" disabled={busy} className={BUTTON} onClick={() => perform(async (signal) => {
        const next = await api(`/${kind}/${encodeURIComponent(detail.id)}`, { signal }); if (!signal.aborted) setDetail(next);
      })}>Actualizar detalle</button>
      <button type="button" className={`${BUTTON} ml-2`} onClick={() => setDetail(null)}>Cerrar detalle</button>
    </section>}
    {kind === 'workflows' && <button type="button" className={BUTTON} onClick={() => onCambiarSeccion?.('workflows')}>Abrir constructor de workflows</button>}
    {kind === 'runs' && <button type="button" className={BUTTON} onClick={() => onCambiarSeccion?.('historial')}>Abrir mis ejecuciones</button>}
  </section>;
}
