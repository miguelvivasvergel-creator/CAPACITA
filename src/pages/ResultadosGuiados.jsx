import { useEffect, useState } from 'react';
import { api } from '../api';
import ResultadoGuiado from '../components/capabilities/ResultadoGuiado';

const STATES={queued:'En espera',running:'En curso',completed:'Listo',failed:'No pudo terminar',interrupted:'Interrumpido'};
export default function ResultadosGuiados({runId,onCambiarSeccion}){
  const [page,setPage]=useState({items:[],next_cursor:null}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();api('/runs?limit=20',{signal:controller.signal}).then(next=>{if(!controller.signal.aborted)setPage(next);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[revision]);
  async function more(){if(busy||!page.next_cursor)return;setBusy(true);setError('');try{const next=await api(`/runs?limit=20&cursor=${encodeURIComponent(page.next_cursor)}`);setPage(old=>({...next,items:[...old.items,...next.items.filter(row=>!old.items.some(item=>item.id===row.id))]}));}catch(cause){setError(cause.message);}finally{setBusy(false);}}
  return <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Mis resultados</h1><p className="text-slate-600">Solo tu cuenta puede ver los datos de estos trabajos.</p>
    {runId&&<ResultadoGuiado key={runId} runId={runId} onCambiarSeccion={onCambiarSeccion}/>}
    <button type="button" disabled={busy} className="min-h-11 rounded-xl border px-4 text-sm" onClick={()=>{setBusy(true);setError('');setRevision(old=>old+1);}}>Actualizar mis resultados</button>
    {busy&&<p role="status">Cargando resultados…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {!busy&&!error&&!page.items.length&&<p>Todavía no tienes resultados guardados. Empieza por describir una necesidad.</p>}
    <ul className="space-y-3">{page.items.map(row=><li key={row.id}><button type="button" className="min-h-11 w-full rounded-xl border bg-white p-4 text-left" onClick={()=>onCambiarSeccion?.(`historial/${row.id}`)}><span className="font-semibold">{STATES[row.status]||row.status}</span><span className="mt-1 block text-sm text-slate-600">{new Date(row.created_at).toLocaleString()} · Ver resultado</span></button></li>)}</ul>
    {page.next_cursor&&<button type="button" disabled={busy} className="min-h-11 rounded-xl border px-4 text-sm" onClick={more}>Ver más resultados</button>}
  </div>;
}
