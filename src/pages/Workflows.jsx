import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { aprobarWorkflow, archivarWorkflow, ejecutarWorkflow, guardarWorkflow, listarVersionesWorkflow, listarWorkflows, obtenerWorkflow, validarWorkflow } from '../services/workflows';
import { consultarRun } from '../services/versiones';

const WorkflowGraph = lazy(() => import('../components/workflows/WorkflowGraph'));

const button = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50';
const primary = `${button} !border-blue-700 !bg-blue-700 !text-white hover:!bg-blue-800`;
const input = 'mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-2 focus:outline-blue-600';
const empty = () => ({ format_version: 1, name: '', description: '', input_schema: { type: 'object', properties: { texto: { type: 'string' } }, required: ['texto'], additionalProperties: false }, nodes: [], outputs: {} });
const labels = { queued: 'En cola', running: 'Ejecutando', completed: 'Completado', failed: 'Fallido', interrupted: 'Interrumpido', pending: 'Pendiente', skipped: 'Omitido' };

export default function Workflows({ workflowId } = {}) {
  const [page, setPage] = useState({ items: [], next_cursor: null });
  const [available, setAvailable] = useState({ items: [], next_cursor: null });
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [chosen, setChosen] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [proposal, setProposal] = useState('');
  const [data, setData] = useState('{"texto":"  Escribe tus datos  "}');
  const [approval, setApproval] = useState(null);
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const key = useRef(null);
  const versions = Object.fromEntries(available.items.map((version) => [version.id, version]));
  const pending = run && ['queued', 'running'].includes(run.status);
  const locked = busy || pending;

  function invalidate() { setApproval(null); key.current = null; setNotice(''); }
  function edit(transform) { setDraft(transform); setDirty(true); invalidate(); }
  function updateNode(id, patch) { edit((old) => ({ ...old, nodes: old.nodes.map((node) => node.id === id ? { ...node, ...patch } : node) })); }
  function canLeave() { return !dirty || window.confirm('Hay cambios sin guardar. ¿Quieres descartarlos?'); }
  function open(row) { setDraft(row.definition); setSaved(row); setSchemaText(JSON.stringify(row.definition.input_schema, null, 2)); setDirty(false); setRun(null); invalidate(); }
  async function perform(action) { setBusy(true); setError(''); try { await action(); } catch (cause) { setError(cause.message); } finally { setBusy(false); } }
  async function load(more = false) {
    const next = await listarWorkflows(more ? page.next_cursor : null);
    setPage((old) => ({ ...next, items: more ? [...old.items, ...next.items.filter((item) => !old.items.some((previous) => previous.id === item.id))] : next.items }));
  }
  async function loadVersions(more = false) {
    const next = await listarVersionesWorkflow(more ? available.next_cursor : null);
    setAvailable((old) => ({ ...next, items: more ? [...old.items, ...next.items.filter((item) => !old.items.some((previous) => previous.id === item.id))] : next.items }));
  }
  useEffect(() => {
    let current = true;
    Promise.allSettled([listarWorkflows(), listarVersionesWorkflow()]).then(([workflows, choices]) => {
      if (!current) return;
      if (workflows.status === 'fulfilled') setPage(workflows.value);
      if (choices.status === 'fulfilled') setAvailable(choices.value);
      if (workflows.status === 'rejected' || choices.status === 'rejected') setError('No se pudo cargar toda la información. Pulsa Actualizar para volver a intentarlo.');
    });
    return () => { current = false; };
  }, []);
  useEffect(() => {
    let current = true;
    if (workflowId) obtenerWorkflow(workflowId).then(row => { if (current) open(row); }).catch(cause => { if (current) setError(cause.message); });
    return () => { current = false; };
  }, [workflowId]);
  useEffect(() => {
    const warn = (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function serialize() {
    if (draft.name.trim().length < 3) throw new Error('Escribe un nombre de al menos tres caracteres.');
    if (!draft.nodes.length) throw new Error('Añade al menos un paso al proceso.');
    if (!Object.keys(draft.outputs).length) throw new Error('Elige las salidas que formarán el resultado final.');
    try {
      return { ...draft, input_schema: JSON.parse(schemaText), nodes: draft.nodes.map(({ _parameters, _values, ...node }) => ({
        ...node, parameters: _parameters == null ? node.parameters : JSON.parse(_parameters), values: _values == null ? node.values : JSON.parse(_values),
      })) };
    } catch { throw new Error('Revisa los campos de entrada, opciones y valores fijos: deben ser JSON válido.'); }
  }
  function addNode() {
    const version = versions[chosen];
    if (!version) return;
    const id = `paso_${crypto.randomUUID().slice(0, 8)}`;
    const previous = draft.nodes.at(-1);
    const previousVersion = previous && versions[previous.version_id];
    const fields = Object.keys(previousVersion?.output_schema.properties || {});
    const bindings = {};
    for (const field of version.input_schema.required || []) {
      if (previous && fields.length === 1 && previousVersion.output_schema.properties[fields[0]].type === version.input_schema.properties[field]?.type) bindings[field] = { source: previous.id, field: fields[0] };
      else if (draft.input_schema.properties?.[field]) bindings[field] = { source: '$input', field };
    }
    edit((old) => ({ ...old, nodes: [...old.nodes, { id, version_id: chosen, label: version.name, parameters: {}, values: {}, bindings, x: (old.nodes.length + 1) * 330, y: 0 }],
      outputs: Object.fromEntries((version.output_schema.required || []).map((field) => [field, { source: id, field }])) }));
  }
  function connect({ source, target, sourceHandle, targetHandle }) {
    if (locked || !sourceHandle || !targetHandle || target === '$input' || source === '$output') return;
    if (target === '$output') edit((old) => ({ ...old, outputs: { ...old.outputs, [targetHandle]: { source, field: sourceHandle } } }));
    else updateNode(target, { bindings: { ...draft.nodes.find((node) => node.id === target).bindings, [targetHandle]: { source, field: sourceHandle } } });
  }
  function removeConnection(target, field) {
    if (target === '$output') edit((old) => ({ ...old, outputs: Object.fromEntries(Object.entries(old.outputs).filter(([name]) => name !== field)) }));
    else updateNode(target, { bindings: Object.fromEntries(Object.entries(draft.nodes.find((node) => node.id === target).bindings).filter(([name]) => name !== field)) });
  }
  const sources = draft ? [
    ...Object.keys(draft.input_schema.properties || {}).map((field) => ({ source: '$input', field, label: `Datos iniciales · ${field}` })),
    ...draft.nodes.flatMap((node, index) => Object.keys(versions[node.version_id]?.output_schema.properties || {}).map((field) => ({ source: node.id, field, label: `${index + 1}. ${node.label} · ${field}` }))),
  ] : [];
  function sourceOptions(exclude) { return sources.filter((item) => item.source !== exclude).map((item) => <option key={`${item.source}|${item.field}`} value={`${item.source}|${item.field}`}>{item.label}</option>); }

  return <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900">Workflows</h1><p className="mt-2 max-w-2xl text-slate-600">Conecta capacidades probadas. Revisa los pasos y datos antes de permitir su ejecución privada.</p></div><button type="button" className={primary} disabled={locked} onClick={() => { if (!canLeave()) return; const next = empty(); setDraft(next); setSchemaText(JSON.stringify(next.input_schema, null, 2)); setSaved(null); setDirty(false); setRun(null); invalidate(); }}>Nuevo workflow</button></header>
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</p>}
    <section className="rounded-xl border border-slate-200 bg-white p-4" aria-label="Procesos guardados"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Mis workflows privados</h2><button type="button" className={button} disabled={busy} onClick={() => perform(async () => { await load(); await loadVersions(); })}>Actualizar</button></div>
      {!page.items.length && <p className="py-6 text-sm text-slate-600">Aún no hay procesos cargados. Crea uno o pulsa Actualizar.</p>}
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">{page.items.map((row) => <li key={row.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><button type="button" className="min-h-11 text-left font-medium text-blue-700 underline" disabled={locked} onClick={() => { if (canLeave()) perform(async () => open(await obtenerWorkflow(row.id))); }}>{row.definition.name}<span className="block text-xs font-normal text-slate-600">Revisión {row.revision} · {row.definition.nodes.length} pasos</span></button><button type="button" className={button} disabled={locked} onClick={() => { if (canLeave()) perform(async () => { await archivarWorkflow(row.id); if (saved?.id === row.id) { setDraft(null); setSaved(null); setDirty(false); invalidate(); } await load(); }); }}>Archivar</button></li>)}</ul>
      {page.next_cursor && <button type="button" className={`${button} mt-3`} disabled={busy} onClick={() => perform(() => load(true))}>Más workflows</button>}
    </section>
    {draft && <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6" aria-label="Editor de proceso"><h2 className="text-xl font-semibold">{saved ? 'Editar workflow' : 'Crear workflow'}</h2>
      <label className="block text-sm font-medium">Nombre<input className={input} maxLength={80} value={draft.name} disabled={locked} onChange={(event) => edit((old) => ({ ...old, name: event.target.value }))} /></label>
      <label className="block text-sm font-medium">Descripción<textarea className={input} maxLength={500} value={draft.description} disabled={locked} onChange={(event) => edit((old) => ({ ...old, description: event.target.value }))} /></label>
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm font-medium">Capacidad y versión<select className={input} value={chosen} disabled={locked} onChange={(event) => setChosen(event.target.value)}><option value="">Selecciona una versión habilitada</option>{available.items.map((version) => <option key={version.id} value={version.id}>{version.name} · {version.id.slice(0, 8)}</option>)}</select></label><button type="button" className={button} disabled={locked || !chosen || draft.nodes.length >= 12} onClick={addNode}>Añadir paso</button></div>
      {!available.items.length && <p className="text-sm text-slate-600">Primero prueba y permite el uso privado de una capacidad desde Mis capacidades.</p>}
      {available.next_cursor && <button type="button" className={button} disabled={busy} onClick={() => perform(() => loadVersions(true))}>Cargar más versiones</button>}
      <p className="text-sm text-slate-600">Conecta los puntos del mapa o usa los selectores de cada paso.</p>
      <Suspense fallback={<div className="flex h-96 items-center justify-center rounded-xl border text-slate-600">Cargando mapa…</div>}><WorkflowGraph definition={draft} versions={versions} onConnect={connect} onMove={(id, position) => { if (!locked) updateNode(id, { x: position.x, y: position.y }); }} onRemoveEdge={(edge) => { if (!locked) removeConnection(edge.target, edge.targetHandle); }} /></Suspense>
      <div className="grid gap-4 lg:grid-cols-2">{draft.nodes.map((node, index) => <fieldset key={node.id} className="min-w-0 space-y-3 rounded-xl border p-4" disabled={locked}><legend className="px-1 font-semibold">Paso {index + 1}: {node.label}</legend><label className="block text-sm">Nombre del paso<input className={input} value={node.label} maxLength={80} onChange={(event) => updateNode(node.id, { label: event.target.value })} /></label>
        {Object.keys(versions[node.version_id]?.input_schema.properties || node.bindings).map((field) => <label key={field} className="block text-sm">Entrada «{field}»<select className={input} value={node.bindings[field] ? `${node.bindings[field].source}|${node.bindings[field].field}` : ''} onChange={(event) => { const [source, port] = event.target.value.split('|'); if (!source) removeConnection(node.id, field); else updateNode(node.id, { bindings: { ...node.bindings, [field]: { source, field: port } } }); }}><option value="">Sin conexión / valor fijo</option>{sourceOptions(node.id)}</select></label>)}
        <label className="block text-sm">Opciones del paso (JSON)<textarea className={`${input} font-mono text-xs`} rows={3} spellCheck={false} value={node._parameters ?? JSON.stringify(node.parameters, null, 2)} onChange={(event) => updateNode(node.id, { _parameters: event.target.value })} /></label>
        <details><summary className="min-h-11 cursor-pointer py-2 text-sm text-blue-700">Valores fijos de entrada</summary><textarea aria-label={`Valores fijos de ${node.label}`} className={`${input} font-mono text-xs`} rows={3} spellCheck={false} value={node._values ?? JSON.stringify(node.values, null, 2)} onChange={(event) => updateNode(node.id, { _values: event.target.value })} /></details>
        <button type="button" className={button} onClick={() => edit((old) => ({ ...old, nodes: old.nodes.filter((item) => item.id !== node.id).map((item) => ({ ...item, bindings: Object.fromEntries(Object.entries(item.bindings).filter(([, binding]) => binding.source !== node.id)) })), outputs: Object.fromEntries(Object.entries(old.outputs).filter(([, binding]) => binding.source !== node.id)) }))}>Quitar paso</button>
        <button type="button" className={button} onClick={() => edit((old) => ({ ...old, outputs: Object.fromEntries((versions[node.version_id]?.output_schema.required || []).map((field) => [field, { source: node.id, field }])) }))}>Usar estas salidas como resultado</button>
      </fieldset>)}</div>
      <fieldset className="space-y-3 rounded-xl border p-4" disabled={locked}><legend className="px-1 font-semibold">Resultado final</legend>{Object.entries(draft.outputs).map(([field, binding]) => <label key={field} className="block text-sm">Campo «{field}»<select className={input} value={`${binding.source}|${binding.field}`} onChange={(event) => { const [source, port] = event.target.value.split('|'); edit((old) => ({ ...old, outputs: { ...old.outputs, [field]: { source, field: port } } })); }}>{sourceOptions()}</select></label>)}</fieldset>
      <details><summary className="min-h-11 cursor-pointer py-2 text-sm text-blue-700">Campos de entrada e importar propuesta</summary><label className="block text-sm">Contrato de datos iniciales (JSON)<textarea className={`${input} font-mono text-xs`} rows={8} spellCheck={false} disabled={locked} value={schemaText} onChange={(event) => { setSchemaText(event.target.value); setDirty(true); invalidate(); try { const parsed = JSON.parse(event.target.value); if (parsed.type === 'object' && parsed.properties) setDraft((old) => ({ ...old, input_schema: parsed })); } catch { /* Se valida al guardar. */ } }} /></label><label className="mt-3 block text-sm">Definición propuesta de workflow (JSON)<textarea className={`${input} font-mono text-xs`} rows={4} spellCheck={false} value={proposal} disabled={locked} onChange={(event) => setProposal(event.target.value)} /></label><button type="button" className={`${button} mt-2`} disabled={locked} onClick={() => perform(async () => { const parsed = JSON.parse(proposal); const checked = await validarWorkflow(parsed); setDraft(checked.definition); setSchemaText(JSON.stringify(parsed.input_schema, null, 2)); setDirty(true); invalidate(); setNotice('Propuesta cargada; revisa y guarda.'); })}>Cargar propuesta validada</button></details>
      <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={locked} onClick={() => perform(async () => { const result = await validarWorkflow(serialize()); setNotice(`Conexiones válidas. Orden: ${result.order.join(' → ')}.`); })}>Validar conexiones</button><button type="button" className={primary} disabled={locked} onClick={() => perform(async () => { open(await guardarWorkflow(serialize(), saved)); await load(); setNotice('Proceso privado guardado.'); })}>{busy ? 'Procesando…' : 'Guardar workflow privado'}</button></div>
      {saved && <section className="space-y-3 border-t pt-5" aria-label="Aprobación de ejecución"><h3 className="text-lg font-semibold">Revisar y ejecutar</h3><p className="text-sm text-slate-600">Revisión {saved.revision}. La aprobación permite una ejecución con estos pasos, versiones, opciones y datos. Cambiarlos requiere guardar y aprobar de nuevo.</p><label className="block text-sm font-medium">Datos de ejecución (JSON)<textarea className={`${input} font-mono text-xs`} rows={5} spellCheck={false} value={data} disabled={locked} onChange={(event) => { setData(event.target.value); invalidate(); }} /></label>{dirty && <p className="text-sm text-amber-800">Guarda los cambios antes de aprobar.</p>}
        <div className="flex flex-wrap gap-3"><button type="button" className={button} disabled={locked || dirty} onClick={() => perform(async () => { setApproval(await aprobarWorkflow(saved, JSON.parse(data))); key.current = null; setNotice('Ejecución aprobada para estos datos.'); })}>Aprobar estos pasos y datos</button><button type="button" className={primary} disabled={locked || dirty || !approval} onClick={() => perform(async () => { key.current ||= crypto.randomUUID(); setRun(await ejecutarWorkflow(saved.id, approval.id, key.current)); })}>Ejecutar workflow aprobado</button></div>{approval && <p className="text-xs text-slate-600">Aprobación válida hasta {new Date(approval.expires_at).toLocaleTimeString()}.</p>}
      </section>}
      {run && <section aria-live="polite" className="space-y-3 rounded-lg bg-slate-50 p-4"><h3 className="font-semibold">{labels[run.status]}</h3><p className="break-all text-xs">Ejecución: {run.id}</p><button type="button" className={button} disabled={busy} onClick={() => perform(async () => setRun(await consultarRun(run.id)))}>Actualizar ejecución</button><ol className="space-y-2">{run.report?.steps?.map((step) => <li key={step.id} className="text-sm">{step.label}: {labels[step.status]}{step.error ? ` · ${step.error}` : ''}</li>)}</ol>{run.output && <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded border bg-white p-3 text-xs">{JSON.stringify(run.output, null, 2)}</pre>}{run.report?.error && <p className="text-sm text-red-800">La ejecución no terminó: {run.report.error}.</p>}</section>}
    </section>}
  </div>;
}
