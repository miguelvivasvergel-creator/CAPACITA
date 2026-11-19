import EncabezadoVista from '../components/common/EncabezadoVista';
import Icono from '../components/common/Icono';
import { useEffect, useState } from 'react';
import { listarCapacidades } from '../services/capacidades';
import { herramientasListas } from '../components/taller/solucionDirecta';

export default function HerramientasGuiadas({onCambiarSeccion}){
  const [page,setPage]=useState({items:[],next_cursor:null}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0);
  // null mientras se consulta: sin esa respuesta no se marca ninguna como lista ni pendiente.
  const [listas,setListas]=useState(null);
  useEffect(()=>{const controller=new AbortController();listarCapacidades('mine',{signal:controller.signal}).then(next=>{if(!controller.signal.aborted)setPage(next);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[revision]);
  useEffect(()=>{let vivo=true;herramientasListas().then(ids=>{if(vivo)setListas(ids);}).catch(()=>{});return()=>{vivo=false;};},[revision]);
  async function more(){if(busy||!page.next_cursor)return;setBusy(true);setError('');try{const next=await listarCapacidades('mine',{cursor:page.next_cursor});setPage(old=>({...next,items:[...old.items,...next.items.filter(row=>!old.items.some(item=>item.id===row.id))]}));}catch(cause){setError(cause.message);}finally{setBusy(false);}}
  // Las listas primero: son las que la persona viene a usar.
  const items=listas?[...page.items].sort((a,b)=>Number(listas.has(b.id))-Number(listas.has(a.id))):page.items;
  return <div className="vista-contenedor guiado-pagina space-y-5"><EncabezadoVista icono="herramientas" titulo="Mis herramientas" descripcion="Las herramientas que creaste en el chat. Toca una lista para usarla con tus datos, sin esperar a la IA."/><button type="button" className="vista-boton-primario" onClick={()=>onCambiarSeccion?.('inicio')}>Crear una herramienta nueva</button>
    {busy&&<p role="status">Cargando herramientas…</p>}{error&&<div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={()=>{setError('');setBusy(true);setRevision(old=>old+1);}}>Volver a consultar</button></div>}
    {!busy&&!error&&!page.items.length&&<p className="guiado-vacio">Todavía no tienes herramientas. Cuéntale al chat qué necesitas y la creamos juntos.</p>}
    <ul className="guiado-lista">{items.map(row=>{
      const lista=listas?.has(row.id);
      // Lista: se abre directa en el chat, sin IA. Sin terminar (no superó sus pruebas): el
      // chat deja escrito el pedido para crearla otra vez con la IA.
      // Mientras se consulta (listas null) también va directa: el chat avisa si no está lista.
      const abrir=()=>onCambiarSeccion?.(lista||listas===null?`inicio/herramienta/${row.id}`:`inicio/usar/${encodeURIComponent(`Quiero usar mi herramienta «${row.name}»: ${row.description}`.slice(0,1500))}`);
      return <li key={row.id}>
        <button type="button" className="guiado-item" onClick={abrir}><span className="guiado-item-icono"><Icono nombre="herramientas"/></span><span className="guiado-item-copy"><strong>{row.name}</strong><span >{row.description}</span>
          <span >{listas===null?'Abrir en el chat':lista?'✓ Lista · Usar ahora':'Sin terminar · Crearla otra vez en el chat'}</span></span><Icono nombre="flecha" className="guiado-item-flecha"/></button>
        <button type="button" className="ml-2 mt-1 min-h-11 text-sm text-slate-600 underline" onClick={()=>onCambiarSeccion?.(`ejecutar/capability/${row.id}`)}>Ficha técnica</button>
      </li>;})}</ul>
    {page.next_cursor&&<button type="button" disabled={busy} className="vista-boton-primario" onClick={more}>Ver más herramientas</button>}
  </div>;
}
