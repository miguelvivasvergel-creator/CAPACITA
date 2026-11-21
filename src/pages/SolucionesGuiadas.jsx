import EncabezadoVista from '../components/common/EncabezadoVista';
import Icono from '../components/common/Icono';
import MiniCadena from '../components/common/MiniCadena';
import { mapaVersiones } from '../components/taller/solucionDirecta';
import { useEffect, useState } from 'react';
import { api } from '../api';
import PlanGuiado from '../components/capabilities/PlanGuiado';
import { coincide } from '../utils/buscar';

// incrustada: sección de Mi biblioteca (sin encabezado ni botón propios). pasos: 'varios' muestra
// las combinadas; 'uno', las de un solo paso que NO son herramientas tuyas (por ejemplo, una de la
// comunidad que ya usaste). Las de un paso con herramienta tuya ya aparecen como «Simples».
// busqueda/estado/orden: filtros de la biblioteca (una solución guardada cuenta como «lista»);
// onContar(pasos, n) informa cuántas pasan.
export default function SolucionesGuiadas({ workflowId, onCambiarSeccion, incrustada = false, pasos, propias, busqueda = '', estado = 'todos', orden = 'recientes', onContar }) {
  const [page,setPage]=useState({items:[],next_cursor:null});
  const [capacidadDe,setCapacidadDe]=useState(null);
  useEffect(()=>{
    if(!pasos)return undefined;
    let vivo=true;
    mapaVersiones().then(mapas=>{if(vivo)setCapacidadDe(mapas.capacidadDe);}).catch(()=>{if(vivo)setCapacidadDe(new Map());});
    return ()=>{vivo=false;};
  },[pasos]);
  const numero=row=>row.definition?.nodes?.length||0;
  const deOtro=row=>propias!=null&&capacidadDe!=null&&!propias.has(capacidadDe.get(row.definition.nodes[0]?.version_id));
  // Se busca en el nombre de la solución y en el de cada uno de sus pasos.
  const pasa=row=>(estado==='todos'||estado==='lista')&&coincide(`${row.definition?.name||''} ${(row.definition?.nodes||[]).map(node=>node.label||'').join(' ')}`,busqueda);
  const porPasos=pasos==='varios'?page.items.filter(row=>numero(row)>1):pasos==='uno'?page.items.filter(row=>numero(row)===1&&deOtro(row)):page.items;
  const visibles=porPasos.filter(pasa);
  if(orden==='az')visibles.sort((a,b)=>String(a.definition?.name||'').localeCompare(String(b.definition?.name||''),'es',{sensitivity:'base'}));
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
  // Para buscar en TODAS, se traen las páginas que falten. Las de 1 paso esperan a saber cuáles son tuyas.
  const filtrando=busqueda.trim()!==''||estado!=='todos';
  const faltan=!workflowId&&filtrando&&Boolean(page.next_cursor)&&!error;
  useEffect(()=>{
    if(!faltan)return undefined;
    const controller=new AbortController();
    api(`/workflows?limit=20&cursor=${encodeURIComponent(page.next_cursor)}`,{signal:controller.signal})
      .then(next=>{if(!controller.signal.aborted)setPage(old=>({...next,items:[...old.items,...next.items.filter(row=>!old.items.some(item=>item.id===row.id))]}));})
      .catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});
    return ()=>controller.abort();
  },[faltan,page.next_cursor]);
  const total=workflowId||busy||error||faltan||(pasos==='uno'&&(propias==null||capacidadDe==null))?undefined:visibles.length;
  useEffect(()=>{if(pasos)onContar?.(pasos,total);},[pasos,total,onContar]);
  return <div className={incrustada ? 'space-y-4' : 'vista-contenedor guiado-pagina space-y-5'}>
    {!incrustada && <><EncabezadoVista icono="soluciones" etiqueta="Mi biblioteca" titulo="Solución combinada" descripcion="Varias herramientas conectadas en un proceso privado que puedes volver a usar con otros datos. Cada ejecución necesita tu confirmación."/>
      <button type="button" className="vista-boton-primario" onClick={()=>onCambiarSeccion?.('capacidades')}><Icono nombre="flecha" className="h-4 w-4 rotate-180"/>Volver a Mi biblioteca</button></>}
    {busy&&pasos!=='uno'&&<p role="status">Cargando soluciones…</p>}{error&&<div role="alert" className="text-sm text-red-700"><p>{error}</p><button type="button" className="min-h-11 underline" onClick={()=>{setError('');setBusy(true);setRevision(old=>old+1);}}>Volver a consultar</button></div>}
    {saved&&<PlanGuiado key={saved.id+':'+saved.revision} definition={saved.definition} initialSaved={saved} onCambiarSeccion={onCambiarSeccion}/>}
    {!workflowId&&!busy&&!error&&!visibles.length&&pasos!=='uno'&&<p className="guiado-vacio">Todavía no tienes soluciones combinadas. Pide en el chat algo de varios pasos (por ejemplo «el clima de mañana y mándamelo a Telegram») y guárdalo.</p>}
    {!workflowId&&<ul className="guiado-lista">{visibles.map(row=><li key={row.id}><button type="button" className="guiado-item" onClick={()=>onCambiarSeccion?.(`inicio/solucion/${row.id}`)}><span className="guiado-item-icono"><MiniCadena pasos={row.definition.nodes.length}/></span><span className="guiado-item-copy"><strong>{row.definition.name}</strong><span>{numero(row)===1?'Simple · de la comunidad o de Capacita · Usar en el chat':`Combinada · ${numero(row)} pasos conectados · Usar en el chat`}</span></span><Icono nombre="flecha" className="guiado-item-flecha"/></button></li>)}</ul>}
    {page.next_cursor&&pasos!=='uno'&&<button type="button" disabled={busy} className="vista-boton-primario" onClick={more}>Ver más soluciones</button>}
  </div>;
}
