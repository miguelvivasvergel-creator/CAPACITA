import { useEffect, useRef, useState } from 'react';
import { guardarWorkflow, aprobarWorkflow, ejecutarWorkflow } from '../../services/workflows';
import { admiteFormulario, datosIniciales, pasosEnOrden } from '../../utils/formularioDatos';
import FormularioDatos from '../common/FormularioDatos';

const BOTON = 'min-h-11 rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50';

/**
 * Plan propuesto dentro del chat: guardar la solución privada, completar datos,
 * aprobar y ejecutar. Editar los datos invalida la aprobación anterior.
 */
export default function TarjetaPlan({ definition, ocupadoExterno, onGuardado, onEjecucion }) {
  const [saved, setSaved] = useState(null);
  const [inputs, setInputs] = useState(() => datosIniciales(definition.input_schema));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [incierto, setIncierto] = useState(false);
  const [ejecutadas, setEjecutadas] = useState(0);
  const lock = useRef(false), alive = useRef(false), approval = useRef(null), key = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const pasos = pasosEnOrden(definition.nodes);
  const formulario = admiteFormulario(definition.input_schema);

  async function accion(trabajo) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await trabajo(); } catch (cause) { if (alive.current) setError(cause.message); }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  const guardar = () => accion(async () => {
    try { const next = await guardarWorkflow(definition); if (alive.current) { setSaved(next); onGuardado?.(next); } }
    catch (cause) { if (alive.current && (!cause.status || cause.status >= 500)) setIncierto(true); throw cause; }
  });
  const ejecutar = (event) => { event.preventDefault(); if (!saved || !formulario) return; return accion(async () => {
    if (!approval.current) approval.current = await aprobarWorkflow(saved, inputs);
    key.current ||= crypto.randomUUID();
    try {
      const run = await ejecutarWorkflow(saved.id, approval.current.id, key.current);
      if (!alive.current) return;
      approval.current = null; key.current = null; setEjecutadas((n) => n + 1);
      onEjecucion?.(run.id);
    } catch (cause) { if (cause.status === 409) { approval.current = null; key.current = null; } throw cause; }
  }); };

  return <div className="space-y-4" data-task-busy={busy ? 'true' : undefined}>
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{saved ? 'Solución guardada en tu espacio' : 'Solución propuesta'}</p>
      <h3 className="mt-1 break-words text-lg font-bold text-slate-900">{definition.name}</h3>
      {definition.description && <p className="mt-1 break-words text-sm text-slate-600">{definition.description}</p>}
    </div>
    <ol className="space-y-2">{pasos.map((node, index) => <li key={node.id} className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-sm">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-800">{index + 1}</span>
      <span className="break-words">{node.label}</span>
    </li>)}</ol>
    {error && <p role="alert" className="break-words text-sm text-red-700">{error}</p>}
    {!saved && <>
      <p className="text-xs text-slate-500">Guardarla no la ejecuta. Después completarás tus datos y confirmarás la ejecución.</p>
      <button type="button" disabled={busy || incierto || ocupadoExterno} onClick={guardar} className={`${BOTON} bg-blue-700 text-white`}>{busy ? 'Guardando…' : 'Usar esta solución'}</button>
    </>}
    {incierto && <p role="status" className="text-sm text-amber-800">No pudimos confirmar el guardado. Revisa tus soluciones antes de crear otra copia.</p>}
    {saved && (formulario ? <form className="space-y-4 border-t pt-4" onSubmit={ejecutar}>
      <FormularioDatos schema={definition.input_schema} value={inputs} disabled={busy || ocupadoExterno} legend="Tus datos para esta ejecución"
        onChange={(next) => { setInputs(next); approval.current = null; key.current = null; setError(''); }} />
      <p className="text-xs text-slate-500">🔒 Al confirmar autorizas estos pasos con estos datos. Tus datos no se envían a la IA.</p>
      <button type="submit" disabled={busy || ocupadoExterno} className={`${BOTON} bg-emerald-600 text-white`}>
        {busy ? 'Preparando…' : ejecutadas ? 'Ejecutar de nuevo con estos datos' : 'Aprobar y ejecutar'}
      </button>
    </form> : <p className="text-sm text-amber-800">Esta solución necesita datos que el chat todavía no sabe pedir. Ábrela en el modo desarrollador para ejecutarla.</p>)}
  </div>;
}
