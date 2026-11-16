import { useEffect, useState } from 'react';
import { api } from '../../api';
import ResultadoDatos from '../common/ResultadoDatos';

const STATES = {queued:'Esperando al trabajador',running:'Resolviendo tu necesidad',completed:'Resultado listo',failed:'La solución no pudo terminar',interrupted:'El trabajo se interrumpió',skipped:'Paso omitido',pending:'Pendiente'};
export default function ResultadoGuiado({ runId, onCambiarSeccion }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer;
    async function read() {
      try {
        const next = await api(`/runs/${encodeURIComponent(runId)}`, {signal:controller.signal});
        if (controller.signal.aborted) return;
        setRun(next); setError('');
        if (['queued','running'].includes(next.status)) timer = setTimeout(() => { if (document.visibilityState === 'visible') read(); },2500);
      } catch (cause) { if (!controller.signal.aborted) setError(cause.message); }
    }
    const visible = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); read(); } };
    read(); document.addEventListener('visibilitychange',visible);
    return () => {controller.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
  },[runId,revision]);
  return <section aria-label="Resultado de tu solución" className="min-w-0 space-y-4 guiado-detalle rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="text-xl font-bold">{run ? STATES[run.status] || run.status : 'Consultando resultado…'}</h2>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={() => setRevision(old=>old+1)}>Actualizar resultado</button>
    {run?.status === 'queued' && <p role="status" className="text-sm text-slate-600">Tu solicitud está guardada. Comenzará cuando el trabajador autorizado esté disponible.</p>}
    {run?.report?.steps?.length > 0 && <ol className="space-y-3">{run.report.steps.map(step=><li key={step.id} className="min-w-0 rounded-xl border p-3"><p className="break-words font-semibold">{step.label || 'Paso'} · {STATES[step.status] || step.status}</p>{step.output != null && <details className="mt-2"><summary className="cursor-pointer text-sm text-blue-700">Ver resultado de este paso</summary><div className="mt-2"><ResultadoDatos value={step.output} /></div></details>}{step.error && <p className="mt-2 break-words text-sm text-red-700">{step.error}</p>}</li>)}</ol>}
    {run?.output != null && <div className="min-w-0 rounded-xl bg-blue-50 p-4"><ResultadoDatos value={run.output} /></div>}
    {run?.report?.error && <p role="alert" className="break-words text-sm text-red-700">{run.report.error}. Revisa los datos antes de preparar otra ejecución.</p>}
    {run?.workflow_id && !['queued','running'].includes(run.status) && <button type="button" className="min-h-11 rounded-lg border px-3 text-sm" onClick={()=>onCambiarSeccion?.(`workflows/${run.workflow_id}`)}>Usar esta solución con otros datos</button>}
  </section>;
}
