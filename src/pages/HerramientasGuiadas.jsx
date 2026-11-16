import { useEffect, useState } from 'react';
import { listarCapacidades } from '../services/capacidades';

export default function HerramientasGuiadas({onCambiarSeccion}){
  const [page,setPage]=useState({items:[],next_cursor:null}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();listarCapacidades('mine',{signal:controller.signal}).then(next=>{if(!controller.signal.aborted)setPage(next);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[revision]);
  async function more(){if(busy||!page.next_cursor)return;setBusy(true);setError('');try{const next=await listarCapacidades('mine',{cursor:page.next_cursor});setPage(old=>({...next,items:[...old.items,...next.items.filter(row=>!old.items.some(item=>item.id===row.id))]}));}catch(cause){setError(cause.message);}finally{setBusy(false);}}
  return <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 sm:px-6"><h1 className="text-3xl font-bold">Mis herramientas</h1><p className="text-slate-600">Aquí están tus definiciones y preparaciones. La disponibilidad para usar cada una se comprueba al abrirla.</p><button type="button" className="min-h-11 rounded-xl border px-4 text-sm" onClick={()=>onCambiarSeccion?.('inicio')}>Describir una necesidad nueva</button>
    {busy&&<p role="status">Cargando herramientas…</p>}{error&&<div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={()=>{setError('');setBusy(true);setRevision(old=>old+1);}}>Volver a consultar</button></div>}
    {!busy&&!error&&!page.items.length&&<p>Todavía no tienes herramientas propias. La IA puede ayudarte a definir la que necesites.</p>}
    <ul className="space-y-3">{page.items.map(row=><li key={row.id}><button type="button" className="min-h-11 w-full rounded-xl border bg-white p-4 text-left" onClick={()=>onCambiarSeccion?.(`ejecutar/capability/${row.id}`)}><span className="block break-words font-semibold">{row.name}</span><span className="mt-1 block break-words text-sm text-slate-600">{row.description}</span><span className="mt-2 block text-sm text-blue-700">Revisar preparación y disponibilidad</span></button></li>)}</ul>
    {page.next_cursor&&<button type="button" disabled={busy} className="min-h-11 rounded-xl border px-4 text-sm" onClick={more}>Ver más herramientas</button>}
  </div>;
}
