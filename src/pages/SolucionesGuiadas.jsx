import { useEffect, useState } from 'react';
import { api } from '../api';
import PlanGuiado from '../components/capabilities/PlanGuiado';

export default function SolucionesGuiadas({ workflowId, onCambiarSeccion }) {
  const [page,setPage]=useState({items:[],next_cursor:null});
  const [saved,setSaved]=useState(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(true);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();
    const path=workflowId ? `/workflows/${encodeURIComponent(workflowId)}` : '/workflows?limit=20';
    api(path,{signal:controller.signal}).then(value=>{if(!controller.signal.aborted){if(workflowId)setSaved(value);else setPage(value);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
    return ()=>controller.abort();
  },[workflowId,revision]);
  async function more(){
    if(busy||!page.next_cursor)return;setBusy(true);setError('');
    try{const next=await api(`/workflows?limit=20&cursor=${encodeURIComponent(page.next_cursor)}`);setPage(old=>({...next,items:[...old.items,...next.items.filter(row=>!old.items.some(item=>item.id===row.id))]}));}
    catch(cause){setError(cause.message);}finally{setBusy(false);}
  }
  return <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Mis soluciones</h1><p className="text-slate-600">Soluciones privadas que puedes volver a usar con otros datos. Cada ejecución necesita tu confirmación.</p>
    <button type="button" className="min-h-11 rounded-xl border px-4 text-sm" onClick={()=>onCambiarSeccion?.('inicio')}>Resolver otra necesidad</button>
    {busy&&<p role="status">Cargando soluciones…</p>}{error&&<div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={()=>{setError('');setBusy(true);setRevision(old=>old+1);}}>Volver a consultar</button></div>}
    {saved&&<PlanGuiado key={saved.id+':'+saved.revision} definition={saved.definition} initialSaved={saved} onCambiarSeccion={onCambiarSeccion}/>}
    {!workflowId&&!busy&&!error&&!page.items.length&&<p>Todavía no tienes soluciones guardadas. Describe tu necesidad para preparar la primera.</p>}
    {!workflowId&&<ul className="space-y-3">{page.items.map(row=><li key={row.id}><button type="button" className="min-h-11 w-full rounded-xl border bg-white p-4 text-left" onClick={()=>onCambiarSeccion?.(`workflows/${row.id}`)}><span className="block break-words font-semibold">{row.definition.name}</span><span className="mt-1 block text-sm text-slate-600">{row.definition.nodes.length} pasos · Revisar y usar</span></button></li>)}</ul>}
    {page.next_cursor&&<button type="button" disabled={busy} className="min-h-11 rounded-xl border px-4 text-sm" onClick={more}>Ver más soluciones</button>}
  </div>;
}
