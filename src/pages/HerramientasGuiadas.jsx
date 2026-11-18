import EncabezadoVista from '../components/common/EncabezadoVista';
import Icono from '../components/common/Icono';
import { useEffect, useState } from 'react';
import { listarCapacidades } from '../services/capacidades';

export default function HerramientasGuiadas({onCambiarSeccion}){
  const [page,setPage]=useState({items:[],next_cursor:null}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();listarCapacidades('mine',{signal:controller.signal}).then(next=>{if(!controller.signal.aborted)setPage(next);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[revision]);
  async function more(){if(busy||!page.next_cursor)return;setBusy(true);setError('');try{const next=await listarCapacidades('mine',{cursor:page.next_cursor});setPage(old=>({...next,items:[...old.items,...next.items.filter(row=>!old.items.some(item=>item.id===row.id))]}));}catch(cause){setError(cause.message);}finally{setBusy(false);}}
  return <div className="vista-contenedor guiado-pagina space-y-5"><EncabezadoVista icono="herramientas" titulo="Mis herramientas" descripcion="Aquí están tus definiciones y preparaciones. La disponibilidad para usar cada una se comprueba al abrirla."/><button type="button" className="vista-boton-primario" onClick={()=>onCambiarSeccion?.('inicio')}>Describir una necesidad nueva</button>
    {busy&&<p role="status">Cargando herramientas…</p>}{error&&<div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={()=>{setError('');setBusy(true);setRevision(old=>old+1);}}>Volver a consultar</button></div>}
    {!busy&&!error&&!page.items.length&&<p className="guiado-vacio">Todavía no tienes herramientas propias. La IA puede ayudarte a definir la que necesites.</p>}
    <ul className="guiado-lista">{page.items.map(row=><li key={row.id}>
      {/* Acción principal: el mismo flujo del chat. La ficha técnica queda como detalle. */}
      <button type="button" className="guiado-item" onClick={()=>onCambiarSeccion?.(`inicio/usar/${encodeURIComponent(`Quiero usar mi herramienta «${row.name}»: ${row.description}`.slice(0,1500))}`)}><span className="guiado-item-icono"><Icono nombre="herramientas"/></span><span className="guiado-item-copy"><strong>{row.name}</strong><span >{row.description}</span><span >Usar en el chat</span></span><Icono nombre="flecha" className="guiado-item-flecha"/></button>
      <button type="button" className="ml-2 mt-1 min-h-11 text-sm text-slate-600 underline" onClick={()=>onCambiarSeccion?.(`ejecutar/capability/${row.id}`)}>Ver detalles y preparación</button>
    </li>)}</ul>
    {page.next_cursor&&<button type="button" disabled={busy} className="vista-boton-primario" onClick={more}>Ver más herramientas</button>}
  </div>;
}
