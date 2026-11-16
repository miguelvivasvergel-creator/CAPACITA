import { useEffect, useRef, useState } from 'react';
import { guardarWorkflow, aprobarWorkflow, ejecutarWorkflow } from '../../services/workflows';
import { admiteFormulario, datosIniciales, pasosEnOrden } from '../../utils/formularioDatos';
import FormularioDatos from '../common/FormularioDatos';
import ResultadoGuiado from './ResultadoGuiado';
import ResultadoDatos from '../common/ResultadoDatos';

const BUTTON = 'min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50';
export default function PlanGuiado({ definition, initialSaved = null, onCambiarSeccion }) {
  const [saved, setSaved] = useState(initialSaved);
  const [inputs, setInputs] = useState(() => datosIniciales(definition.input_schema));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const [runId, setRunId] = useState(null);
  const lock = useRef(false), alive = useRef(false), approval = useRef(null), key = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function action(work) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await work(); } catch (cause) { if (alive.current) setError(cause.message); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function save() {
    if (uncertain || saved) return;
    await action(async () => {
      try { const next = await guardarWorkflow(definition); if (alive.current) setSaved(next); }
      catch (cause) { if (alive.current && (!cause.status || cause.status >= 500)) setUncertain(true); throw cause; }
    });
  }
  async function execute(event) {
    event.preventDefault();
    if (!saved || runId || !admiteFormulario(definition.input_schema)) return;
    await action(async () => {
      if (!approval.current) approval.current = await aprobarWorkflow(saved, inputs);
      if (!alive.current) return;
      key.current ||= crypto.randomUUID();
      try {
        const run = await ejecutarWorkflow(saved.id, approval.current.id, key.current);
        if (alive.current) setRunId(run.id);
      } catch (cause) { if (cause.status === 409) { approval.current = null; key.current = null; } throw cause; }
    });
  }
  return <section aria-label="Solución propuesta" className="min-w-0 space-y-5 guiado-detalle rounded-2xl border border-blue-200 bg-white p-5" data-trabajo-pendiente={!saved || busy ? 'true' : undefined} data-task-busy={busy ? 'true' : undefined}>
    <header><p className="text-sm font-semibold text-blue-700">{saved ? 'Tu solución privada' : 'Revisa la solución que preparó la IA'}</p><h2 className="mt-2 break-words text-2xl font-bold">{definition.name}</h2><p className="mt-2 break-words text-slate-600">{definition.description}</p></header>
    <ol className="space-y-3">{pasosEnOrden(definition.nodes).map((node,index)=><li key={node.id} className="rounded-xl bg-slate-50 p-3"><p className="break-words font-semibold">{index+1}. {node.label}</p><p className="mt-1 text-sm text-slate-600">{Object.values(node.bindings || {}).some(binding=>binding.source !== '$input') ? 'Usa el resultado de un paso anterior.' : 'Usa los datos que completes abajo.'}</p>{Object.keys(node.parameters||{}).length>0&&<div className="mt-3"><h3 className="mb-2 text-sm font-semibold">Opciones propuestas</h3><ResultadoDatos value={node.parameters}/></div>}{Object.keys(node.values||{}).length>0&&<div className="mt-3"><h3 className="mb-2 text-sm font-semibold">Datos fijados para este paso</h3><ResultadoDatos value={node.values}/></div>}</li>)}</ol>
    <p className="text-sm text-slate-600">Revisa que los pasos resuelvan tu necesidad. Guardar la solución no la ejecuta; al confirmar autorizarás estos pasos con los datos que completes. Los datos de ejecución no se envían a Gemini en este recorrido.</p>
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
    {!saved && <button type="button" disabled={busy || uncertain} className={`${BUTTON} bg-blue-700 text-white`} onClick={save}>{busy ? 'Guardando…' : 'Guardar solución privada'}</button>}
    {uncertain && <div role="status" className="space-y-2 text-sm text-amber-800"><p>No pudimos confirmar el guardado. Revisa tus soluciones antes de crear otra copia.</p><button type="button" className={BUTTON} onClick={()=>onCambiarSeccion?.('workflows')}>Ver mis soluciones guardadas</button></div>}
    {saved && !runId && <form className="space-y-4 border-t pt-5" onSubmit={execute}>
      <FormularioDatos schema={definition.input_schema} value={inputs} disabled={busy} legend="Completa los datos para esta ejecución" onChange={next=>{setInputs(next);approval.current=null;key.current=null;setError('');}} />
      <button type="submit" disabled={busy || !admiteFormulario(definition.input_schema)} className={`${BUTTON} bg-blue-700 text-white`}>{busy ? 'Preparando ejecución…' : 'Confirmar y ejecutar'}</button>
    </form>}
    {runId && <ResultadoGuiado key={runId} runId={runId} onCambiarSeccion={onCambiarSeccion} />}
  </section>;
}
