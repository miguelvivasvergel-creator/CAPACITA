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
  useEffect(()=>{const controller=new AbortController();api('/runs?limit=100',{signal:controller.signal}).then(next=>{if(!controller.signal.aborted)setPage(next);}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});return()=>controller.abort();},[revision]);
  async function more(){if(busy||!page.next_cursor)return;setBusy(true);setError('');try{const next=await api(`/runs?limit=100&cursor=${encodeURIComponent(page.next_cursor)}`);setPage(old=>({...next,items:[...old.items,...next.items.filter(row=>!old.items.some(item=>item.id===row.id))]}));}catch(cause){setError(cause.message);}finally{setBusy(false);}}
  // En el modo guiado todo uso real pasa por una solución (workflow): «Usar ahora», un plan o
  // una herramienta ya guardada. Las ejecuciones directas de una versión son los intentos de la
  // vista previa; se agrupan aparte para que no tapen los resultados de verdad.
  // La API pagina por id (no por fecha): se piden 100 por página y se ordenan del más nuevo al más viejo.
  const ordenados=[...page.items].sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const usos=ordenados.filter(row=>row.workflow_id),pruebas=ordenados.filter(row=>!row.workflow_id);
  const nombre=(row)=>row.workflow_id?nombres.get(row.workflow_id)||'Resultado':nombres.has(row.version_id)?`Prueba de «${nombres.get(row.version_id)}»`:'Prueba de una herramienta descartada';
  const fila=(row)=><li key={row.id}><button type="button" className="guiado-item" onClick={()=>onCambiarSeccion?.(`historial/${row.id}`)}><span className="guiado-item-icono"><Icono nombre="resultados"/></span><span className="guiado-item-copy"><strong>{nombre(row)}</strong><span >{STATES[row.status]||row.status} · {new Date(row.created_at).toLocaleString()} · Ver resultado</span></span><Icono nombre="flecha" className="guiado-item-flecha"/></button></li>;
  return <div className="vista-contenedor guiado-pagina space-y-5"><EncabezadoVista icono="resultados" titulo="Mis resultados" descripcion="Solo tu cuenta puede ver los datos de estos trabajos."/>
    {runId&&<ResultadoGuiado key={runId} runId={runId} onCambiarSeccion={onCambiarSeccion}/>}
    <button type="button" disabled={busy} className="vista-boton-primario" onClick={()=>{setBusy(true);setError('');setRevision(old=>old+1);}}>Actualizar mis resultados</button>
    {busy&&<p role="status">Cargando resultados…</p>}{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {!busy&&!error&&!page.items.length&&<p className="guiado-vacio">Todavía no tienes resultados guardados. Empieza por describir una necesidad.</p>}
    {!busy&&!error&&page.items.length>0&&!usos.length&&<p className="guiado-vacio">Todavía no usaste tus herramientas con tus datos; abajo están las pruebas de la vista previa.</p>}
    <ul className="guiado-lista">{usos.map(fila)}</ul>
    {pruebas.length>0&&<details className="rounded-xl border border-slate-200 bg-white p-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-slate-700">Pruebas de la vista previa ({pruebas.length})</summary>
      <p className="mb-3 text-xs text-slate-500">Cada intento que viste al crear o ajustar una herramienta. También son privados.</p>
      <ul className="guiado-lista">{pruebas.map(fila)}</ul>
    </details>}
    {page.next_cursor&&<button type="button" disabled={busy} className="vista-boton-primario" onClick={more}>Ver más resultados</button>}
  </div>;
}
