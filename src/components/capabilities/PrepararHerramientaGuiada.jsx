import { useCallback, useEffect, useRef, useState } from 'react';
import { comprobarDefinicion, guardarDefinicion } from '../../services/definiciones';
import { revisarGeneracion, listarCandidatos, generarCandidato } from '../../services/candidatos';
import { crearPrueba } from '../../services/laboratorio';
import { habilitarVersion, listarVersiones } from '../../services/versiones';
import { api } from '../../api';
import { admiteFormulario, datosIniciales } from '../../utils/formularioDatos';
import FormularioDatos from '../common/FormularioDatos';
import ResultadoDatos from '../common/ResultadoDatos';

const BUTTON='min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50';
const EMPTY_OPTIONS={type:'object',properties:{},additionalProperties:false};
export default function PrepararHerramientaGuiada({ definition, capacidad = null, onGuardado, onRetomar }) {
  const [cap,setCap]=useState(capacidad),[checked,setChecked]=useState(null),[revision,setRevision]=useState(null);
  const [candidates,setCandidates]=useState({items:[],next_cursor:null}),[candidate,setCandidate]=useState(null);
  const [build,setBuild]=useState(null),[versions,setVersions]=useState([]),[enabled,setEnabled]=useState(null);
  const [inputs,setInputs]=useState(()=>datosIniciales(definition.input_schema));
  const [parameters,setParameters]=useState(()=>datosIniciales(definition.parameter_schema||EMPTY_OPTIONS));
  const [expected,setExpected]=useState(()=>datosIniciales(definition.output_schema));
  const [consent,setConsent]=useState(false),[ack,setAck]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false);
  const [poll,setPoll]=useState(0);
  const [loadingCandidate,setLoadingCandidate]=useState(false);
  const alive=useRef(false),lock=useRef(false),testKey=useRef(null);
  const initialDefinition=useRef(definition);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const choose=useCallback(next=>{const spec=next?.manifest?.definition||initialDefinition.current;setCandidate(next);setInputs(datosIniciales(spec.input_schema));setParameters(datosIniciales(spec.parameter_schema||EMPTY_OPTIONS));setExpected(datosIniciales(spec.output_schema));setBuild(null);setEnabled(null);setVersions([]);testKey.current=null;setLoadingCandidate(Boolean(next));},[]);
  async function action(work){if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();}catch(cause){if(alive.current)setError(cause.message);}finally{lock.current=false;if(alive.current)setBusy(false);}}
  useEffect(()=>{
    if(!cap?.id)return;
    const controller=new AbortController();
    Promise.all([revisarGeneracion(cap.id,{signal:controller.signal}),listarCandidatos(cap.id,{signal:controller.signal})]).then(([review,page])=>{if(!controller.signal.aborted){setRevision(review);setCandidates(page);choose(page.items[0]||null);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);});
    return()=>controller.abort();
  },[cap?.id,choose]);
  useEffect(()=>{
    if(!candidate)return;
    const controller=new AbortController();
    Promise.all([api(`/builds?candidate_id=${encodeURIComponent(candidate.id)}&limit=20`,{signal:controller.signal}),api(`/versions?candidate_id=${encodeURIComponent(candidate.id)}&limit=100`,{signal:controller.signal})]).then(([builds,saved])=>{if(!controller.signal.aborted){setBuild(builds.items[0]||null);setVersions(saved.items);setEnabled(saved.items.find(item=>item.status==='enabled')||null);}}).catch(cause=>{if(!controller.signal.aborted)setError(cause.message);}).finally(()=>{if(!controller.signal.aborted)setLoadingCandidate(false);});
    return()=>controller.abort();
  },[candidate]);
  const buildId=build?.id, pending=build&&['queued','testing'].includes(build.status);
  useEffect(()=>{
    if(!buildId||!pending)return;
    const controller=new AbortController();let timer;
    async function read(){try{const next=await api(`/builds/${encodeURIComponent(buildId)}`,{signal:controller.signal});if(controller.signal.aborted)return;setBuild(next);if(['queued','testing'].includes(next.status))timer=setTimeout(()=>{if(document.visibilityState==='visible')read();},2500);}catch(cause){if(!controller.signal.aborted)setError(cause.message);}}
    const visible=()=>{if(document.visibilityState==='visible'){clearTimeout(timer);read();}};
    read();document.addEventListener('visibilitychange',visible);
    return()=>{controller.abort();clearTimeout(timer);document.removeEventListener('visibilitychange',visible);};
  },[buildId,pending,poll]);
  const matches=(cap?revision:checked)?.matches?.items||[];
  const blocked=definition.resources?.length>0||definition.required_permissions?.length>0;
  const testDefinition=candidate?.manifest?.definition||definition;
  const forms=[testDefinition.input_schema,testDefinition.parameter_schema||EMPTY_OPTIONS,testDefinition.output_schema].every(schema=>admiteFormulario(schema));
  function edit(setter,next){setter(next);testKey.current=null;setBuild(null);setError('');}
  async function save(){await action(async()=>{try{const saved=await guardarDefinicion(checked.definition,ack);if(alive.current){setCap(saved);setAck(false);onGuardado?.(saved);}}catch(cause){if(alive.current&&(!cause.status||cause.status>=500))setUncertain(true);throw cause;}});}
  async function generate(){await action(async()=>{const saved=await generarCandidato(cap.id,{definition_hash:revision.definition_hash,acknowledge_similar:ack,consent_to_provider:consent});if(alive.current){setCandidates(old=>({...old,items:[saved,...old.items]}));choose(saved);setConsent(false);}});}
  async function test(event){event.preventDefault();if(!candidate||pending||loadingCandidate)return;await action(async()=>{testKey.current||=crypto.randomUUID();const saved=await crearPrueba(candidate,[{name:'Referencia aportada por la persona',inputs,parameters,expected_output:expected,expect_rejection:false}],testKey.current);if(alive.current)setBuild(saved);});}
  return <section aria-label="Preparar una herramienta nueva" className="min-w-0 space-y-5 rounded-2xl border border-blue-200 bg-white p-5" data-task-busy={busy||pending?'true':undefined} data-trabajo-pendiente={!cap?'true':undefined}>
    <header><p className="text-sm font-semibold text-blue-700">{enabled?'Herramienta lista para uso privado':candidate?'Preparación guardada · prueba pendiente':cap?'Idea guardada · preparación pendiente':'La IA propone una herramienta nueva'}</p><h2 className="mt-2 break-words text-2xl font-bold">{definition.name}</h2><p className="mt-2 break-words text-slate-600">{definition.description}</p></header>
    <div className="grid gap-3 sm:grid-cols-2">{[['Recibe',definition.input_schema],['Entrega',definition.output_schema]].map(([label,schema])=><div key={label} className="rounded-xl bg-slate-50 p-3"><h3 className="font-semibold">{label}</h3><ul className="mt-2 space-y-1 text-sm">{Object.entries(schema.properties||{}).map(([name,spec])=><li key={name} className="break-words">{spec.title||name.replaceAll('_',' ')}{spec.description?`: ${spec.description}`:''}</li>)}</ul></div>)}</div>
    {definition.constraints?.length>0&&<ul className="list-disc space-y-1 pl-5 text-sm">{definition.constraints.map((item,index)=><li key={index}>{item}</li>)}</ul>}
    {blocked&&<p role="status" className="text-sm text-amber-800">Esta herramienta necesita permisos o recursos externos que el laboratorio actual no admite. Puedes conservar su definición; aún no está disponible para usar.</p>}
    {error&&<p role="alert" className="break-words text-sm text-red-700">{error}</p>}
    {!cap&&!checked&&<button type="button" disabled={busy} className={BUTTON} onClick={()=>action(async()=>{const result=await comprobarDefinicion(definition);if(alive.current)setChecked(result);})}>Revisar esta herramienta y buscar similares</button>}
    {matches.length>0&&!enabled&&<div className="space-y-2 rounded-xl bg-amber-50 p-3 text-sm"><p>Hay herramientas parecidas en tu catálogo:</p><ul className="list-disc pl-5">{matches.map(item=><li key={item.id}>{item.name}</li>)}</ul><label className="flex items-start gap-2"><input type="checkbox" checked={ack} disabled={busy} onChange={event=>setAck(event.target.checked)}/>He revisado las coincidencias y necesito una herramienta distinta.</label></div>}
    {!cap&&checked&&<button type="button" className={`${BUTTON} bg-blue-700 text-white`} disabled={busy||uncertain||(matches.length>0&&!ack)} onClick={save}>Guardar herramienta privada</button>}
    {uncertain&&<p role="status" className="text-sm text-amber-800">No pudimos confirmar el guardado. Revisa Mis capacidades antes de crear otra copia.</p>}
    {cap&&revision&&!enabled&&!blocked&&<div className="space-y-3 border-t pt-4"><p className="text-sm text-slate-600">La IA puede preparar el código a partir de esta definición. Después tendrás que comprobar el resultado con un ejemplo conocido; no se habilita automáticamente.</p><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} disabled={busy||pending} onChange={event=>setConsent(event.target.checked)}/>Confirmo que la definición y sus ejemplos no contienen datos sensibles y autorizo enviarlos a Google Gemini para preparar la herramienta. El nivel gratuito puede usar el contenido para mejorar sus productos.</label><button type="button" className={BUTTON} disabled={busy||pending||!consent||(matches.length>0&&!ack)} onClick={generate}>{candidate?'Preparar otra alternativa':'Preparar herramienta con IA'}</button></div>}
    {candidates.items.length>0&&<label className="block text-sm font-semibold">Preparación que quieres revisar<select className="mt-2 w-full rounded-xl border p-3 font-normal" value={candidate?.id||''} disabled={busy||pending||loadingCandidate} onChange={event=>choose(candidates.items.find(item=>item.id===event.target.value))}>{candidates.items.map((item,index)=><option key={item.id} value={item.id}>Preparación {index+1} · {new Date(item.created_at).toLocaleString()}</option>)}</select></label>}
    {candidates.next_cursor&&<button type="button" className={BUTTON} disabled={busy||pending} onClick={()=>action(async()=>{const next=await listarCandidatos(cap.id,{cursor:candidates.next_cursor});if(alive.current)setCandidates(old=>({...next,items:[...old.items,...next.items.filter(item=>!old.items.some(row=>row.id===item.id))]}));})}>Ver preparaciones anteriores</button>}
    {loadingCandidate&&<p role="status">Consultando pruebas y disponibilidad guardadas…</p>}
    {candidate&&!enabled&&!blocked&&!loadingCandidate&&<form key={candidate.id} onSubmit={test} className="space-y-4 border-t pt-4"><h3 className="font-bold">Comprueba con un ejemplo que conozcas</h3><p className="text-sm text-slate-600">Escribe los datos y el resultado que esperas. Se probarán en el entorno aislado, sin enviarlos a Gemini. Superar un ejemplo no garantiza todos los casos.</p>
      <FormularioDatos schema={testDefinition.input_schema} value={inputs} onChange={next=>edit(setInputs,next)} disabled={busy||pending} legend="Datos de prueba"/>
      {Object.keys(testDefinition.parameter_schema?.properties||{}).length>0&&<FormularioDatos schema={testDefinition.parameter_schema} value={parameters} onChange={next=>edit(setParameters,next)} disabled={busy||pending} legend="Opciones de prueba"/>}
      <FormularioDatos schema={testDefinition.output_schema} value={expected} onChange={next=>edit(setExpected,next)} disabled={busy||pending} legend="Resultado que esperas"/>
      <button type="submit" className={BUTTON} disabled={busy||pending||!forms}>{pending?'Prueba en curso…':'Probar con estos datos'}</button>
    </form>}
    {build&&<div className="space-y-2 rounded-xl bg-slate-50 p-4"><h3 className="font-semibold">{build.status==='passed'?'Prueba superada':build.status==='queued'?'Esperando al trabajador':build.status==='testing'?'Comprobando la herramienta':'La prueba no se superó'}</h3>{pending&&<p className="text-sm">La prueba continúa cuando el trabajador autorizado esté disponible.</p>}{build.report?.cases&&<p className="text-sm">{build.report.cases.filter(item=>item.passed).length} de {build.report.cases.length} ejemplos superados.</p>}<button type="button" className={BUTTON} disabled={busy} onClick={()=>action(async()=>{const next=await api(`/builds/${encodeURIComponent(build.id)}`);if(alive.current){setBuild(next);setPoll(old=>old+1);}})}>Consultar prueba</button></div>}
    {!enabled&&build?.status==='passed'&&build.storage_backend==='supabase'&&<button type="button" className={`${BUTTON} bg-blue-700 text-white`} disabled={busy} onClick={()=>action(async()=>{const saved=await habilitarVersion(candidate.id,build.id);const next=await listarVersiones(candidate.id);if(alive.current){setEnabled(saved);setVersions(next.items);}})}>Permitir usar esta herramienta en privado</button>}
    {enabled&&<div className="space-y-3 rounded-xl bg-emerald-50 p-4"><p className="text-sm text-emerald-900">Hay una preparación probada habilitada. Vuelve a buscar una solución para revisar cómo usarla con las demás herramientas. No se ha publicado para otras cuentas.</p><button type="button" className={BUTTON} onClick={onRetomar}>Volver a resolver mi necesidad</button></div>}
    {versions.length>0&&!enabled&&<p className="text-sm text-amber-800">Las preparaciones guardadas no están habilitadas actualmente.</p>}
    {definition.examples?.[0]&&<details><summary className="min-h-11 cursor-pointer py-2 text-sm text-blue-700">Ver el ejemplo propuesto por la IA</summary><p className="mb-2 text-xs text-slate-600">Es un ejemplo de la definición; no es evidencia de prueba independiente.</p><ResultadoDatos value={definition.examples[0]}/></details>}
  </section>;
}
