import { useEffect, useRef, useState } from 'react';
import { buscarOpcionesPlan, proponerPlan } from '../../services/planner';

const BUTTON = 'rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const LABELS = { reuse: 'Reutilizar una capacidad', compose: 'Combinar capacidades', create: 'Faltan capacidades', clarify: 'Necesita aclaraciones', blocked: 'Recurso pendiente' };

export default function PlanificarObjetivo({ onCambiarSeccion, onDefinirObjetivo }) {
  const [objective, setObjective] = useState('');
  const [mode, setMode] = useState('text');
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState([]);
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const request = useRef(null);
  useEffect(() => () => request.current?.abort(), []);

  async function perform(action) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setNotice(''); setResult(null);
    try { await action(controller.signal); }
    catch (cause) { if (!controller.signal.aborted) setError(cause.message); }
    finally { if (!controller.signal.aborted) setBusy(false); }
  }

  const proposal = result?.proposal;
  const definition = proposal?.definition;
  return <section aria-labelledby="planificar-objetivo" className="rounded-2xl border border-slate-200 bg-white p-5">
    <h2 id="planificar-objetivo" className="text-xl font-bold text-slate-900">Planificar con capacidades probadas</h2>
    <p className="mt-2 text-sm text-slate-600">Busca versiones habilitadas y revisa una propuesta antes de llevarla al constructor de workflows.</p>
    <form onSubmit={(event) => {
      event.preventDefault(); setOptions(null); setSelected([]); setConsent(false);
      perform(async (signal) => { const page = await buscarOpcionesPlan(objective.trim(), signal, mode); if (!signal.aborted) setOptions(page); });
    }}>
      <label htmlFor="planner-objetivo" className="mt-4 block text-sm font-semibold text-slate-800">Objetivo del proceso</label>
      <textarea id="planner-objetivo" required minLength={10} maxLength={2000} rows={3} disabled={busy} value={objective} onChange={(event) => {
        setObjective(event.target.value); setOptions(null); setSelected([]); setConsent(false); setResult(null); setError(''); setNotice('');
      }} className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Describe entradas, transformaciones y resultado esperado, sin datos privados" />
      <label className="mt-3 block text-sm text-slate-700">Buscar capacidades<select value={mode} disabled={busy} onChange={(event) => {
        setMode(event.target.value); setOptions(null); setSelected([]); setConsent(false); setResult(null); setError('');
      }} className="ml-2 rounded-lg border border-slate-300 p-2"><option value="text">Por texto</option><option value="semantic">Por significado · local</option></select></label>
      {mode === 'semantic' && <p className="mt-2 text-xs text-slate-500">Compara las primeras 200 capacidades autorizadas en tu equipo; usa los primeros 200 caracteres del objetivo para buscar. Revisa el recorte si se indica. Si falta el modelo, puedes elegir búsqueda textual.</p>}
      <button type="submit" disabled={busy || objective.trim().length < 10} className={`${BUTTON} mt-3`}>{busy ? 'Procesando…' : 'Buscar versiones disponibles'}</button>
      <p className="mt-2 text-xs text-slate-500">Esta búsqueda consulta Capacita; todavía no envía información a Gemini.</p>
    </form>
    {error && <p role="alert" className="mt-4 break-words text-sm text-red-700">{error}</p>}
    {options && <div className="mt-5 border-t border-slate-200 pt-4">
      <h3 className="font-semibold text-slate-800">Versiones encontradas</h3>
      <p className="mt-1 text-xs text-slate-500">{options.search_kind === 'semantic' ? 'Coincidencias por significado local' : 'Coincidencias textuales'}; no garantizan equivalencia. Elige hasta doce versiones.</p>
      {options.search_truncated && <p className="mt-2 text-sm text-amber-800">Búsqueda parcial. Puede haber otras versiones; concreta el objetivo para afinar.</p>}
      {!options.items.length && <p className="mt-3 text-sm text-slate-600">No se encontraron versiones habilitadas para este objetivo. Puedes ajustar la búsqueda o definir y probar la capacidad que falta.</p>}
      {!options.items.length && onDefinirObjetivo && <button type="button" className={`${BUTTON} mt-3`} onClick={() => onDefinirObjetivo(objective)}>Definir la capacidad que falta</button>}
      {options.items.map((version) => <div key={version.id} className="mt-3 rounded-xl border border-slate-200 p-3">
        <label className="flex items-start gap-3 text-sm font-semibold text-slate-800"><input type="checkbox" checked={selected.includes(version.id)} disabled={busy || (!selected.includes(version.id) && selected.length >= 12)} onChange={(event) => {
          setSelected((previous) => event.target.checked ? [...previous, version.id] : previous.filter((id) => id !== version.id)); setConsent(false); setResult(null); setNotice('');
        }} className="mt-1" />{version.name} · {version.visibility === 'private' ? 'Privada' : 'Pública'}</label>
        <p className="mt-2 break-words text-sm text-slate-600">{version.description}</p>
        <p className="mt-2 break-all text-xs text-slate-500">Versión: {version.id}</p>
        <details className="mt-2 text-sm"><summary className="cursor-pointer text-blue-700">Revisar contratos que se enviarían</summary><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify({ input_schema: version.input_schema, parameter_schema: version.parameter_schema, output_schema: version.output_schema }, null, 2)}</pre></details>
      </div>)}
      {!!options.items.length && <>
        <label className="mt-4 flex items-start gap-3 text-sm text-slate-700"><input type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} className="mt-1" />Autorizo enviar a Gemini este objetivo y los nombres, descripciones y contratos de las versiones que seleccioné, incluidas las privadas. Confirmo que no contienen datos sensibles. No se envían código ni resultados de ejecuciones.</label>
        <button type="button" disabled={busy || !consent || !selected.length} onClick={() => perform(async (signal) => { const next = await proponerPlan(objective.trim(), options.items.filter((version) => selected.includes(version.id)), signal, mode); if (!signal.aborted) setResult(next); })} className={`${BUTTON} mt-4`}>Proponer plan para revisar</button>
      </>}
    </div>}
    {proposal && <div className="mt-5 border-t border-slate-200 pt-4">
      <h3 className="text-lg font-bold text-slate-900">{LABELS[proposal.decision]}</h3>
      <p className="mt-2 text-sm text-slate-700">{proposal.explanation}</p>
      {!!proposal.questions.length && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{proposal.questions.map((question, index) => <li key={index}>{question}</li>)}</ul>}
      {!!proposal.missing.length && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">{proposal.missing.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      {proposal.decision === 'create' && onDefinirObjetivo && <button type="button" className={`${BUTTON} mt-3`} onClick={() => onDefinirObjetivo(`${objective}\nCapacidades faltantes: ${proposal.missing.join('; ')}`.slice(0, 2000))}>Definir la capacidad que falta</button>}
      {definition && <>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{(result.validation?.order || definition.nodes.map((node) => node.id)).map((id) => {
          const node = definition.nodes.find((item) => item.id === id);
          return <li key={id}><strong>{node.label}</strong><p className="break-all text-xs text-slate-500">Versión {node.version_id}</p>{Object.entries(node.bindings).map(([field, binding]) => <p key={field} className="break-words text-xs text-slate-600">{binding.source === '$input' ? 'Datos iniciales' : binding.source}.{binding.field} → {field}</p>)}</li>;
        })}</ol>
        <p className="mt-4 text-sm text-slate-600">Contratos validados. Esto no demuestra que el plan resuelva el objetivo. Revisa las entradas, pasos y opciones; todavía no se guardó ni ejecutó.</p>
        <details className="mt-3 text-sm"><summary className="cursor-pointer font-semibold text-blue-700">Ver definición completa y entradas requeridas</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(definition, null, 2)}</pre></details>
        <button type="button" className={`${BUTTON} mt-4`} onClick={async () => {
          try { await navigator.clipboard.writeText(JSON.stringify(definition, null, 2)); setNotice('Propuesta copiada. En Workflows crea un proceso y usa «Campos de entrada e importar propuesta».'); }
          catch { setNotice('No se pudo copiar. Puedes seleccionar la definición completa de arriba.'); }
        }}>Copiar propuesta de workflow</button>
        <button type="button" className={`${BUTTON} ml-2 mt-4`} onClick={() => onCambiarSeccion?.('workflows')}>Ir al constructor de workflows</button>
        <p className="mt-2 text-xs text-slate-500">Copia la propuesta antes de salir. En el constructor: Nuevo workflow → Campos de entrada e importar propuesta → pegar → Cargar propuesta validada. Guardar y aprobar son pasos separados.</p>
      </>}
      {notice && <p role="status" className="mt-3 text-sm text-blue-700">{notice}</p>}
    </div>}
  </section>;
}
