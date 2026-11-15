import { useRef, useState } from 'react';
import { consultarRun, deshabilitarVersion, ejecutarVersion, habilitarVersion, listarRuns, listarVersiones } from '../../services/versiones';

const estados = { queued: 'En cola', running: 'Ejecutando', completed: 'Completada', failed: 'Fallida', interrupted: 'Interrumpida: crea otra ejecución' };

export default function VersionPrivada({ candidate, build }) {
  const example = candidate.manifest.definition.examples[0];
  const [versions, setVersions] = useState({ items: [], next_cursor: null });
  const [version, setVersion] = useState(null);
  const [inputs, setInputs] = useState(JSON.stringify(example?.inputs || {}, null, 2));
  const [parameters, setParameters] = useState(JSON.stringify(example?.parameters || {}, null, 2));
  const [run, setRun] = useState(null);
  const [history, setHistory] = useState({ items: [], next_cursor: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = useRef(null);
  const eligible = build?.storage_backend === 'supabase' && build.status === 'passed';
  const pending = run && ['queued', 'running'].includes(run.status);

  async function perform(action) {
    setBusy(true);
    setError('');
    try { await action(); } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  async function loadVersions(more = false) {
    const page = await listarVersiones(candidate.id, more ? versions.next_cursor : null);
    setVersions((previous) => ({ ...page, items: more ? [...previous.items, ...page.items.filter((item) => !previous.items.some((old) => old.id === item.id))] : page.items }));
  }

  async function loadRuns(more = false) {
    const page = await listarRuns(more ? history.next_cursor : null);
    setHistory((previous) => ({ ...page, items: more ? [...previous.items, ...page.items.filter((item) => !previous.items.some((old) => old.id === item.id))] : page.items }));
  }

  async function execute() {
    let data, options;
    try { data = JSON.parse(inputs); options = JSON.parse(parameters); } catch { throw new Error('Entradas y opciones deben ser JSON válido.'); }
    key.current ||= crypto.randomUUID();
    setRun(await ejecutarVersion(version.id, data, options, key.current));
  }

  return <section className="mt-4 space-y-3 border-t border-slate-200 pt-4" aria-label="Uso privado de una versión">
    <h4 className="font-semibold text-slate-900">Usar la capacidad con datos nuevos</h4>
    <p className="text-sm text-slate-600">Después de una prueba compartida superada, puedes permitir el uso privado de ese código. No publica la capacidad. Los resultados de cada ejecución son tuyos.</p>
    <div className="flex flex-wrap gap-2">
      {eligible && <button type="button" disabled={busy || pending} onClick={() => perform(async () => {
        const saved = await habilitarVersion(candidate.id, build.id);
        setVersion(saved); key.current = null; setRun(null); await loadVersions();
      })} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50">Permitir usar esta capacidad</button>}
      <button type="button" disabled={busy} onClick={() => perform(() => loadVersions())} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Cargar versiones guardadas</button>
    </div>
    {versions.items.length > 0 && <ul className="space-y-1 text-sm">{versions.items.map((item) => <li key={item.id}><button type="button" disabled={busy || pending} onClick={() => { setVersion(item); setRun(null); key.current = null; }} className="text-blue-700 underline disabled:opacity-50">{item.status === 'enabled' ? 'Uso permitido' : 'Deshabilitada'} · {item.id.slice(0, 8)}</button></li>)}</ul>}
    {versions.next_cursor && <button type="button" disabled={busy} onClick={() => perform(() => loadVersions(true))} className="text-sm text-blue-700 underline">Más versiones</button>}
    {version && <div className="space-y-3 rounded-lg bg-slate-50 p-3">
      <p className="break-all text-xs text-slate-600">Versión privada: {version.id}</p>
      <label className="block text-sm font-medium">Datos de entrada (JSON)<textarea rows={5} spellCheck={false} disabled={busy || pending} value={inputs} onChange={(event) => { setInputs(event.target.value); key.current = null; }} className="mt-1 w-full rounded border bg-white p-2 font-mono text-xs" /></label>
      <label className="block text-sm font-medium">Opciones (JSON)<textarea rows={3} spellCheck={false} disabled={busy || pending} value={parameters} onChange={(event) => { setParameters(event.target.value); key.current = null; }} className="mt-1 w-full rounded border bg-white p-2 font-mono text-xs" /></label>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || pending || version.status !== 'enabled'} onClick={() => perform(execute)} className="rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">Ejecutar con estos datos</button>
        {version.status === 'enabled' && <button type="button" disabled={busy || pending} onClick={() => perform(async () => { setVersion(await deshabilitarVersion(version.id)); await loadVersions(); })} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Impedir nuevas ejecuciones</button>}
      </div>
    </div>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {run && <div aria-live="polite" className="space-y-2 rounded border p-3 text-sm">
      <p className="font-semibold">{estados[run.status]}</p><p className="break-all text-xs">Ejecución: {run.id}</p>
      <button type="button" disabled={busy} onClick={() => perform(async () => setRun(await consultarRun(run.id)))} className="rounded border px-3 py-1">Actualizar ejecución</button>
      {run.output != null && <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-50 p-2 text-xs">{JSON.stringify(run.output, null, 2)}</pre>}
      {run.report?.error && <p>La ejecución no terminó correctamente. Motivo: {run.report.error}</p>}
      {!pending && <button type="button" disabled={busy} onClick={() => { setRun(null); key.current = null; }} className="rounded border px-3 py-1">Preparar otra ejecución</button>}
    </div>}
    <button type="button" disabled={busy} onClick={() => perform(() => loadRuns())} className="rounded border px-3 py-2 text-sm disabled:opacity-50">Cargar mis ejecuciones</button>
    {history.items.length > 0 && <ul className="space-y-1 text-sm">{history.items.map((item) => <li key={item.id}><button type="button" disabled={busy || pending} onClick={() => setRun(item)} className="text-blue-700 underline">{estados[item.status]} · {new Date(item.created_at).toLocaleString()} · {item.id.slice(0, 8)}</button></li>)}</ul>}
    {history.next_cursor && <button type="button" disabled={busy} onClick={() => perform(() => loadRuns(true))} className="text-sm text-blue-700 underline">Más ejecuciones</button>}
  </section>;
}
