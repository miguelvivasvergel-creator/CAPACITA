import { useState } from 'react';

import { estadosRun, botonRun, fechaRun } from './resultadoUtils';

function JsonGuardado({ value }) {
  return <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-100 p-4 text-sm text-slate-900">{JSON.stringify(value, null, 2)}</pre>;
}

export default function DetalleResultado({ run }) {
  const [notice, setNotice] = useState('');
  const hasOutput = run.output !== null && run.output !== undefined;
  const pending = ['queued', 'running'].includes(run.status);
  const steps = run.report?.steps || [];
  async function copy() {
    try { await navigator.clipboard.writeText(JSON.stringify(run.output, null, 2)); setNotice('Resultado copiado.'); }
    catch { setNotice('No se pudo copiar. Puedes descargar el resultado.'); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(run.output, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `resultado-${run.id}.json`;
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Descarga preparada.');
  }
  return <section className="min-w-0 space-y-4" aria-label="Resultado guardado">
    <div><h2 className="text-xl font-bold">{estadosRun[run.status] || run.status}</h2><p className="mt-1 break-all text-sm text-slate-600">Ejecución: {run.id}</p></div>
    <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold">Creada</dt><dd>{fechaRun(run.created_at)}</dd></div><div><dt className="font-semibold">Última actualización</dt><dd>{fechaRun(run.updated_at)}</dd></div><div className="min-w-0 sm:col-span-2"><dt className="font-semibold">{run.workflow_id ? 'Workflow y revisión' : 'Versión utilizada'}</dt><dd className="break-all">{run.workflow_id ? `${run.workflow_id} · revisión ${run.workflow_revision}` : run.version_id}</dd></div></dl>
    {pending && <p role="status" className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{run.status === 'queued' ? 'Esperando al trabajador. Si está detenido, la ejecución seguirá en cola.' : 'El trabajador está ejecutando estos datos.'} El estado se consulta automáticamente mientras esta página está visible.</p>}
    {run.status === 'interrupted' && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">La ejecución se interrumpió. Conservamos lo que alcanzó a terminar; no se reintenta automáticamente.</p>}
    {steps.length > 0 && <div><h3 className="font-semibold">Progreso por paso</h3><p className="mb-3 text-sm text-slate-600">{steps.filter(step => step.status === 'completed').length} de {steps.length} pasos completados</p><ol className="space-y-3">{steps.map((step, index) => <li key={step.id || index} className="min-w-0 rounded-lg border border-slate-200 p-3"><p className="break-words font-medium">{index + 1}. {step.label || step.id} · {estadosRun[step.status] || step.status}</p>{step.error && <p className="mt-2 break-words text-sm text-red-800">Motivo: {step.error}</p>}{step.output != null && <details className="mt-2"><summary className="cursor-pointer py-2 text-sm text-blue-800">Ver resultado de este paso</summary><JsonGuardado value={step.output} /></details>}</li>)}</ol></div>}
    {run.report?.error && <p role="alert" className="break-words rounded-lg bg-red-50 p-3 text-sm text-red-800">Motivo registrado: {run.report.error}</p>}
    <div><h3 className="mb-2 font-semibold">Resultado final</h3>{hasOutput ? <><JsonGuardado value={run.output} /><div className="mt-3 flex flex-wrap gap-2"><button type="button" className={botonRun} onClick={copy}>Copiar resultado</button><button type="button" className={botonRun} onClick={download}>Descargar JSON</button></div></> : <p className="text-sm text-slate-600">{pending ? 'El resultado final estará disponible cuando termine.' : 'Esta ejecución no produjo un resultado final. Revisa el motivo y los resultados de cada paso.'}</p>}</div>
    <p role="status" className="text-sm text-slate-700">{notice}</p>
  </section>;
}
