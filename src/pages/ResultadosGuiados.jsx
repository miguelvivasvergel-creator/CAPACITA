import EncabezadoVista from '../components/common/EncabezadoVista';
import Icono from '../components/common/Icono';
import { useEffect, useState } from 'react';
import { api } from '../api';
import ResultadoGuiado from '../components/capabilities/ResultadoGuiado';
import { nombresDeResultados } from '../components/taller/solucionDirecta';

const STATES={queued:'En espera',running:'En curso',completed:'Listo',failed:'No pudo terminar',interrupted:'Interrumpido'};
export default function ResultadosGuiados({runId,onCambiarSeccion}){
  const [page,setPage]=useState({items:[],next_cursor:null}),[error,setError]=useState(''),[busy,setBusy]=useState(true),[revision,setRevision]=useState(0);
  // Qué herramienta o solución produjo cada resultado (si ya no existe, queda sin nombre).
  const [nombres,setNombres]=useState(()=>new Map());
  useEffect(()=>{let vivo=true;nombresDeResultados().then(next=>{if(vivo)setNombres(next);});return()=>{vivo=false;};},[revision]);
  useEffect(()=>{const controller=new AbortController();api('/runs?limit=20',{signal:controller.signal}).then(next=>{if(!controller.signal.aborted)setPage(next);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[revision]);
  async function more(){if(busy||!page.next_cursor)return;setBusy(true);setError('');try{const next=await api(`/runs?limit=20&cursor=${encodeURIComponent(page.next_cursor)}`);setPage(old=>({...next,items:[...old.items,...next.items.filter(row=>!old.items.some(item=>item.id===row.id))]}));}catch(cause){setError(cause.message);}finally{setBusy(false);}}
  return <div className="vista-contenedor guiado-pagina space-y-5"><EncabezadoVista icono="resultados" titulo="Mis resultados" descripcion="Solo tu cuenta puede ver los datos de estos trabajos."/>
    {runId&&<ResultadoGuiado key={runId} runId={runId} onCambiarSeccion={onCambiarSeccion}/>}
    <button type="button" disabled={busy} className="vista-boton-primario" onClick={()=>{setBusy(true);setError('');setRevision(old=>old+1);}}>Actualizar mis resultados</button>
    {busy&&<p role="status">Cargando resultados…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {!busy&&!error&&!page.items.length&&<p className="guiado-vacio">Todavía no tienes resultados guardados. Empieza por describir una necesidad.</p>}
    <ul className="guiado-lista">{page.items.map(row=><li key={row.id}><button type="button" className="guiado-item" onClick={()=>onCambiarSeccion?.(`historial/${row.id}`)}><span className="guiado-item-icono"><Icono nombre="resultados"/></span><span className="guiado-item-copy"><strong>{nombres.get(row.workflow_id)||nombres.get(row.version_id)||'Resultado'}</strong><span >{STATES[row.status]||row.status} · {new Date(row.created_at).toLocaleString()} · Ver resultado</span></span><Icono nombre="flecha" className="guiado-item-flecha"/></button></li>)}</ul>
    {page.next_cursor&&<button type="button" disabled={busy} className="vista-boton-primario" onClick={more}>Ver más resultados</button>}
  </div>;
}
