import { useEffect, useRef, useState } from 'react';
import Icono from '../common/Icono';
import { buscarOpcionesPlan, proponerPlan } from '../../services/planner';
import { interpretarObjetivo } from '../../services/objetivos';
import { guardarObjetivoPlan, leerObjetivoPlan } from '../../utils/plannerDraft';
import PlanGuiado from './PlanGuiado';
import PrepararHerramientaGuiada from './PrepararHerramientaGuiada';

const BUTTON='min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50';
export default function AsistenteGuiado({ usuario, onCambiarSeccion }) {
  const [objective,setObjective]=useState(()=>leerObjetivoPlan(usuario?.id)?.objective||'');
  const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [result,setResult]=useState(null),[answers,setAnswers]=useState({}),[history,setHistory]=useState([]);
  const [phase,setPhase]=useState(''),[partial,setPartial]=useState(false);
  const [interpretGoal,setInterpretGoal]=useState('');
  const request=useRef(null),lock=useRef(false);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{const warn=event=>{if(objective.trim()){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[objective]);
  const questions=result?.kind==='plan' ? result.value.proposal.questions||[] : result?.value.interpretation?.questions||[];
  async function search(event){
    event?.preventDefault();if(lock.current||!consent||objective.trim().length<10)return;
    const clarifications=[...history,...questions.map((question,index)=>({question,answer:(answers[index]||'').trim()}))];
    if(clarifications.some(item=>!item.answer)||clarifications.length>6){setError('Responde las preguntas o reformula la necesidad para continuar.');return;}
    const text=[objective.trim(),...clarifications.map(item=>`${item.question}: ${item.answer}`)].join('\n');
    if(text.length>2000){setError('Resume la necesidad y las respuestas en un máximo de 2.000 caracteres.');return;}
    lock.current=true;setBusy(true);setError('');setNotice('');setPartial(false);
    const controller=new AbortController();request.current?.abort();request.current=controller;
    try {
      guardarObjetivoPlan(usuario?.id,{objective:objective.trim(),mode:'text'});
      if(result?.kind==='definition'&&questions.length){
        setPhase('La IA está incorporando tus respuestas…');
        const value=await interpretarObjetivo(interpretGoal||objective.trim(),clarifications,true,controller.signal);
        if(!controller.signal.aborted){setResult({kind:'definition',value});setHistory(clarifications);setAnswers({});setConsent(false);}
        return;
      }
      setPhase('Buscando herramientas que ya puedes usar…');
      const options=await buscarOpcionesPlan(text,controller.signal);
      if(controller.signal.aborted)return;
      setPartial(Boolean(options.search_truncated)||options.items.length>12);
      if(options.items.length){
        setPhase('La IA está preparando una solución con las herramientas encontradas…');
        const value=await proponerPlan(text,options.items.slice(0,12),controller.signal);
        if(!controller.signal.aborted)setResult({kind:'plan',value});
      }else{
        setPhase('No encontré herramientas habilitadas en esta búsqueda. La IA está revisando qué hace falta…');
        const value=await interpretarObjetivo(objective.trim(),clarifications,true,controller.signal);
        if(!controller.signal.aborted){setInterpretGoal(objective.trim());setResult({kind:'definition',value});}
      }
      if(!controller.signal.aborted){setHistory(clarifications);setAnswers({});setConsent(false);}
    }catch(cause){if(!controller.signal.aborted)setError(cause.message);}
    finally{lock.current=false;if(!controller.signal.aborted){setBusy(false);setPhase('');}}
  }
  async function design(missing){
    if(lock.current||!consent)return;
    const text=`Preparar únicamente esta herramienta faltante: ${missing}. Contexto de la necesidad: ${objective}`;
    if(text.length>2000){setError('Resume la necesidad antes de preparar la herramienta faltante.');return;}
    lock.current=true;setBusy(true);setError('');setPhase('La IA está definiendo la herramienta que falta…');
    const controller=new AbortController();request.current=controller;
    try{const value=await interpretarObjetivo(text,[],true,controller.signal);if(!controller.signal.aborted){setInterpretGoal(text);setResult({kind:'definition',value});setHistory([]);setAnswers({});setConsent(false);}}
    catch(cause){if(!controller.signal.aborted)setError(cause.message);}finally{lock.current=false;if(!controller.signal.aborted){setBusy(false);setPhase('');}}
  }
  function change(value){request.current?.abort();setObjective(value);setResult(null);setHistory([]);setAnswers({});setConsent(false);setError('');setNotice('');}
  const proposal=result?.kind==='plan'?result.value.proposal:null;
  const definition=result?.kind==='definition'?result.value.definition:null;
  const explanation=proposal?.explanation||result?.value.interpretation?.explanation;
  return <section className="mx-auto max-w-4xl space-y-5" aria-label="Asistente guiado" data-trabajo-pendiente={objective.trim()?'true':undefined} data-task-busy={busy?'true':undefined}>
    <form onSubmit={search} className="asistente-superficie space-y-3">
      <label htmlFor="necesidad-guiada" className="font-bold"><Icono nombre="guiado"/>Cuéntame qué necesitas</label>
      <p className="text-sm text-slate-600">Describe los datos que tienes y el resultado que buscas. Buscaré herramientas existentes; si falta alguna, te ayudaré a prepararla.</p>
      <textarea id="necesidad-guiada" name="necesidad" autoComplete="off" required minLength={10} maxLength={2000} rows={4} value={objective} disabled={busy} onChange={event=>change(event.target.value)} placeholder="Por ejemplo: quiero quitar espacios de los extremos de un texto y convertirlo a mayúsculas…" className="w-full rounded-xl border border-slate-300 p-3 text-sm focus-visible:outline-2 focus-visible:outline-blue-600"/>
      {questions.length>0&&<fieldset disabled={busy} className="space-y-3"><legend className="mb-2 font-semibold">Necesito aclarar algo antes de continuar</legend>{questions.map((question,index)=><label key={index} className="block text-sm">{question}<textarea required maxLength={1000} rows={2} value={answers[index]||''} onChange={event=>{setAnswers(old=>({...old,[index]:event.target.value}));setConsent(false);}} className="mt-2 w-full rounded-xl border p-3"/></label>)}</fieldset>}
      <label className="asistente-consentimiento"><input type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)}/>Autorizo enviar a Google Gemini esta necesidad, mis aclaraciones y los nombres, descripciones y contratos de las herramientas encontradas, incluidas las privadas. Confirmo que no contienen datos sensibles.</label>
      <details className="asistente-detalles"><summary>Qué información se comparte con el proveedor</summary><p>Primero se busca en tu catálogo autorizado. No se envían código ni resultados. El nivel gratuito de Gemini puede usar el contenido para mejorar sus productos.</p></details>
      <button type="submit" disabled={busy||!consent||objective.trim().length<10||questions.some((_,i)=>!answers[i]?.trim())} className="asistente-enviar">{busy?'Preparando…':questions.length?'Continuar con mis respuestas':'Buscar una solución'}<Icono nombre="flecha" className="h-4 w-4"/></button>
      {busy&&<p role="status" className="text-sm text-blue-800">{phase}</p>}
      {error&&<p role="alert" className="break-words text-sm text-red-700">{error} Tu necesidad sigue aquí; puedes revisarla antes de volver a intentarlo.</p>}
      {notice&&<p role="status" className="text-sm text-blue-800">{notice}</p>}
    </form>
    {partial&&<p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">La búsqueda es parcial: se revisan hasta 12 herramientas encontradas. Puedes concretar tu necesidad para buscar otras alternativas.</p>}
    {explanation&&<p className="break-words text-slate-700">{explanation}</p>}
    {proposal?.definition&&<PlanGuiado key={JSON.stringify(proposal.definition)} definition={proposal.definition} onCambiarSeccion={onCambiarSeccion}/>}
    {proposal?.decision==='create'&&<div className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold">Falta una herramienta para resolverlo</h2><p className="text-sm text-slate-600">Revisa el requisito y vuelve a autorizar el envío a Gemini arriba para preparar su definición. No está disponible todavía.</p><ul className="space-y-3">{proposal.missing.map((item,index)=><li key={index}><p className="break-words text-sm">{item}</p><button type="button" disabled={busy||!consent} className={`${BUTTON} mt-2`} onClick={()=>design(item)}>Preparar esta herramienta faltante</button></li>)}</ul></div>}
    {(proposal?.decision==='blocked'||result?.value.interpretation?.decision==='blocked')&&<p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Hay un recurso o permiso pendiente. Puedes ajustar la necesidad; no se ha creado ni ejecutado una solución.</p>}
    {definition&&<PrepararHerramientaGuiada key={JSON.stringify(definition)} definition={definition} onGuardado={cap=>guardarObjetivoPlan(usuario?.id,{objective,mode:'text',capabilityId:cap.id})} onRetomar={()=>{setResult(null);setConsent(false);setHistory([]);setAnswers({});setNotice('La herramienta ya puede participar en una solución. Revisa y vuelve a autorizar la búsqueda para continuar.');}}/>}
  </section>;
}
