// Playwright CLI: todas las operaciones de negocio se interceptan; no IA ni escrituras reales.
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  await page.unrouteAll({behavior:'ignoreErrors'});
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const initial=await page.evaluate(async()=>{
    const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    return {userId,preference:localStorage.getItem(`capacita:experiencia:${userId}`),drafts:Object.fromEntries(Object.entries(sessionStorage)),...(await import('/src/mocks/guiado.js'))};
  });
  const {userId,opcionesGuiadas,planGuiado,herramientaGuiada}=initial;
  const ids={workflow:'33333333-3333-4333-8333-333333333333',approval:'44444444-4444-4444-8444-444444444444',run:'55555555-5555-4555-8555-555555555555',cap:'66666666-6666-4666-8666-666666666666',candidate:'77777777-7777-4777-8777-777777777777',build:'88888888-8888-4888-8888-888888888888'};
  const checks=[],requests=[];let mode='compose',saved=null,candidate=null,build=null,version=null,runReads=0,failRun=true,releaseModel;
  const envelope=data=>({success:true,message:'Fixture',data});
  const candidateRow=()=>({id:ids.candidate,capability_id:ids.cap,created_at:'2026-11-16T10:00:00Z',manifest:{artifact_hash:'c'.repeat(64),definition:herramientaGuiada,proposal:{source:'codigo_de_fixture_no_ejecutable'}}});
  const capRow=()=>({id:ids.cap,owner_id:userId,visibility:'private',status:'draft',...herramientaGuiada,config:{definition:{...herramientaGuiada,definition_hash:'d'.repeat(64)}}});
  const handler=async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!=='http://127.0.0.1:8000')return route.continue();
    const path=url.pathname,method=req.method(),body=req.postData()?req.postDataJSON():null;
    requests.push({path,method,body,key:req.headers()['idempotency-key']});
    if(mode==='service-error'&&path==='/api/planner/options')return route.fulfill({status:503,json:{detail:'Búsqueda temporalmente no disponible'}});
    let data;
    if(path==='/api/planner/options')data={...opcionesGuiadas,items:['create','clarify','resource'].includes(mode)?[]:opcionesGuiadas.items};
    else if(path==='/api/planner/propose'){
      assert(body.consent_to_provider&&body.version_ids.length===2,'Selección automática o consentimiento incorrectos');
      if(mode==='stale')return route.fulfill({status:409,json:{detail:'Las herramientas cambiaron. Vuelve a buscar.'}});
      if(mode==='compose')await new Promise(resolve=>{releaseModel=resolve;});
      data={proposal:{decision:'compose',explanation:'Estas dos herramientas resuelven la necesidad.',questions:[],missing:[],definition:planGuiado},validation:{valid:true,order:['limpiar','mayusculas']},saved:false,executed:false};
    }else if(path==='/api/objectives/interpret'){
      assert(body.consent_to_provider,'Interpretación sin consentimiento');
      const clarify=mode==='clarify'&&!body.clarifications.length;
      if(mode==='clarify'&&!clarify)assert(body.clarifications[0].answer==='Conservar espacios interiores','Se perdieron las aclaraciones');
      data={interpretation:{decision:clarify?'clarify':'define',explanation:clarify?'Necesito una regla.':'Hace falta preparar una herramienta.',questions:clarify?['¿Qué espacios quieres conservar?']:[]},definition:clarify?null:{...herramientaGuiada,resources:mode==='resource'?['API externa pendiente']:[]},matches:{items:[],next_cursor:null}};
    }else if(path==='/api/capabilities/definitions/check')data={definition:body,definition_hash:'d'.repeat(64),matches:{items:[{id:'otra',name:'Herramienta similar'}],next_cursor:null}};
    else if(path==='/api/capabilities/definitions'&&method==='POST'){assert(body.acknowledge_similar,'No revisó similares');data=capRow();}
    else if(path===`/api/capabilities/${ids.cap}/candidates/check`)data={definition_hash:'d'.repeat(64),matches:{items:[],next_cursor:null}};
    else if(path===`/api/capabilities/${ids.cap}/candidates`){
      if(method==='POST'){assert(body.consent_to_provider,'Generación sin consentimiento');candidate=candidateRow();data=candidate;}
      else data={items:candidate?[candidate]:[],next_cursor:null};
    }else if(path==='/api/builds'&&method==='POST'){
      assert(body.candidate_id===ids.candidate&&body.cases[0].inputs.texto==='prueba propia'&&body.cases[0].expected_output.resultado==='PRUEBA PROPIA','Prueba no usa la referencia de la persona');
      build={id:ids.build,candidate_id:ids.candidate,status:'queued',storage_backend:'supabase'};data=build;
    }else if(path===`/api/builds/${ids.build}`){build={...build,status:'passed',report:{cases:[{passed:true}]}};data=build;}
    else if(path==='/api/builds')data={items:build?[build]:[],next_cursor:null};
    else if(path==='/api/versions'&&method==='POST'){assert(build?.status==='passed','Habilitación sin prueba');version={id:'99999999-9999-4999-8999-999999999999',status:'enabled'};data=version;}
    else if(path==='/api/versions')data={items:version?[version]:[],next_cursor:null};
    else if(path==='/api/workflows'&&method==='POST'){saved={id:ids.workflow,revision:1,definition_hash:'e'.repeat(64),definition:body.definition};data=saved;}
    else if(path===`/api/workflows/${ids.workflow}/approvals`){assert(body.inputs.texto==='  Niño  azul  ','Datos de aprobación cambiaron');data={id:ids.approval};}
    else if(path===`/api/workflows/${ids.workflow}/runs`){
      assert(body.approval_id===ids.approval,'Aprobación incorrecta');
      if(failRun){failRun=false;return route.fulfill({status:503,json:{detail:'Respuesta perdida de prueba'}});}
      data={id:ids.run,status:'queued'};
    }else if(path===`/api/runs/${ids.run}`){runReads++;data={id:ids.run,workflow_id:ids.workflow,status:runReads>1?'completed':'queued',output:runReads>1?{resultado:'NIÑO  AZUL <img src=x onerror="window.__guidedXss=1">'}:null,report:runReads>1?{steps:planGuiado.nodes.map(node=>({id:node.id,label:node.label,status:'completed'}))}:null};}
    else if(path===`/api/workflows/${ids.workflow}`)data=saved;
    else if(path==='/api/workflows/available-versions')data=opcionesGuiadas;
    else if(['/api/workflows','/api/runs','/api/capabilities'].includes(path))data={items:[],next_cursor:null};
    else throw new Error(`Petición inesperada: ${method} ${url.origin}${path} tipo=${req.resourceType()}`);
    return route.fulfill({json:envelope(data)});
  };
  const dialog=d=>d.accept();page.on('dialog',dialog);
  const authFixture=route=>route.fulfill({contentType:'text/javascript',body:`
    const user={id:'${userId}',name:'Persona de prueba',username:'persona-de-prueba',email:'persona@example.test'};
    export const supabase={auth:{getSession:async()=>({data:{session:{user,access_token:'fixture-token'}}}),getUser:async()=>({data:{user},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})}};
    export const obtenerUsuarioActual=async()=>user;
    export const cerrarSesion=async()=>({success:true});
    export const registrarUsuario=async()=>({success:false});
    export const loginUsuario=async()=>({success:false});
    export const loginConGoogle=async()=>({success:false});
    export const extraerDatosUsuario=()=>user;
  `});
  async function clearNeed(){const input=page.getByRole('textbox',{name:'Cuéntame qué necesitas',exact:true});if(await input.count()){await input.fill('');await page.waitForFunction(()=>!document.querySelector('[aria-label="Asistente guiado"][data-trabajo-pendiente="true"]'));await page.waitForTimeout(100);}}
  const reset=async(nextMode)=>{
    await clearNeed();
    mode=nextMode;await page.evaluate(id=>{localStorage.setItem(`capacita:experiencia:${id}`,'guiado');sessionStorage.clear();},userId);
    await page.goto('http://127.0.0.1:5173/#inicio');await page.reload();await page.getByRole('textbox',{name:'Cuéntame qué necesitas',exact:true}).waitFor();
  };
  try{
    await page.route('**/src/services/supabase.js*',authFixture);
    await page.route('**/api/**',handler);
    await reset('compose');
    const need=()=>page.getByRole('textbox',{name:'Cuéntame qué necesitas',exact:true});
    const consent=()=>page.getByRole('checkbox',{name:'Autorizo enviar a Google Gemini',exact:false});
    const search=()=>page.getByRole('button',{name:'Buscar una solución',exact:true});
    await need().fill('Quitar espacios exteriores y convertir un texto a mayúsculas');
    assert(await search().isDisabled(),'Puede invocar IA sin consentimiento');
    await consent().check();await search().click();
    await page.getByText('La IA está preparando una solución con las herramientas encontradas…',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Desarrollador',exact:true}).click();
    assert(await page.getByRole('button',{name:'Guiado',exact:true}).getAttribute('aria-pressed')==='true','Cambió de modo durante operación');
    assert(typeof releaseModel==='function','No comenzó búsqueda antes de proponer');releaseModel();
    await page.getByRole('button',{name:'Guardar solución privada',exact:true}).waitFor();
    assert(!requests.some(r=>r.path.endsWith('/approvals')),'Aprobación automática');
    assert(!await page.getByRole('button',{name:'Copiar propuesta de workflow',exact:true}).count(),'Pide copiar JSON');
    await page.getByRole('button',{name:'Guardar solución privada',exact:true}).click();
    await page.getByRole('group',{name:'Completa los datos para esta ejecución'}).getByRole('textbox').fill('  Niño  azul  ');
    await page.getByRole('button',{name:'Confirmar y ejecutar',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'Respuesta perdida de prueba'}).waitFor();
    await page.getByRole('button',{name:'Confirmar y ejecutar',exact:true}).click();
    await page.getByRole('heading',{name:'Resultado listo',exact:true}).waitFor();
    assert((await page.getByRole('region',{name:'Resultado de tu solución'}).textContent()).includes('NIÑO  AZUL'),'No muestra resultado legible');
    assert(!await page.getByRole('region',{name:'Resultado de tu solución'}).locator('img').count()&&!await page.evaluate(()=>window.__guidedXss),'Interpreta resultado como HTML');
    const runs=requests.filter(r=>r.path.endsWith('/runs')&&r.method==='POST');
    assert(runs.length===2&&runs[0].key===runs[1].key,'Reintento perdió idempotencia');
    assert(requests.filter(r=>r.path.endsWith('/approvals')).length===1,'Reintento duplicó aprobación');
    checks.push('búsqueda y selección automáticas, consentimiento, bloqueo de cambio de modo, guardado separado, formulario, aprobación, idempotencia y resultado sin JSON');
    await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Desborde guiado móvil');
    await page.screenshot({path:'output/playwright/guided-compose-mobile.png',fullPage:true});await page.setViewportSize({width:1280,height:900});
    await clearNeed();
    await page.getByRole('button',{name:'Desarrollador',exact:true}).click();
    await page.getByRole('button',{name:'Planificar un proceso',exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'Planificar un proceso',exact:true}).waitFor();
    checks.push('modo desarrollador conserva recorrido técnico y preferencia tras recarga');
    await reset('create');
    await need().fill('Crear una transformación de texto que todavía no existe');await consent().check();await search().click();
    await page.getByRole('button',{name:'Revisar esta herramienta y buscar similares',exact:true}).click();
    assert(await page.getByRole('button',{name:'Guardar herramienta privada',exact:true}).isDisabled(),'Ignora coincidencias');
    await page.getByRole('checkbox',{name:'He revisado las coincidencias',exact:false}).check();await page.getByRole('button',{name:'Guardar herramienta privada',exact:true}).click();
    await page.getByRole('button',{name:'Preparar herramienta con IA',exact:true}).waitFor();
    assert(await page.getByRole('button',{name:'Preparar herramienta con IA',exact:true}).isDisabled(),'Genera sin consentimiento nuevo');
    await page.getByRole('checkbox',{name:'Confirmo que la definición y sus ejemplos',exact:false}).check();await page.getByRole('button',{name:'Preparar herramienta con IA',exact:true}).click();
    const testInput=page.getByRole('group',{name:'Datos de prueba'}).getByRole('textbox');await testInput.waitFor();assert(await testInput.inputValue()==='','Usa ejemplo IA como prueba independiente');
    await testInput.fill('prueba propia');await page.getByRole('group',{name:'Resultado que esperas'}).getByRole('textbox').fill('PRUEBA PROPIA');
    assert(!await page.getByRole('button',{name:'Permitir usar esta herramienta en privado',exact:true}).count(),'Habilita sin probar');
    await page.getByRole('button',{name:'Probar con estos datos',exact:true}).click();
    await page.getByRole('button',{name:'Permitir usar esta herramienta en privado',exact:true}).click();
    await page.getByText('Hay una preparación probada habilitada.',{exact:false}).waitFor();
    assert(!await page.locator('pre').count(),'Expone código en modo guiado');
    checks.push('faltante → definición revisada → guardado → consentimiento de generación → referencia humana → laboratorio B → habilitación explícita');
    await reset('clarify');await need().fill('Necesito una herramienta con algunas reglas por aclarar');await consent().check();await search().click();
    await page.getByRole('textbox',{name:'¿Qué espacios quieres conservar?',exact:true}).fill('Conservar espacios interiores');await consent().check();await page.getByRole('button',{name:'Continuar con mis respuestas',exact:true}).click();
    await page.getByRole('heading',{name:herramientaGuiada.name,exact:true}).waitFor();checks.push('aclaraciones y consentimiento nuevo sin perder contexto');
    await reset('resource');await need().fill('Crear una herramienta que necesita una API externa');await consent().check();await search().click();
    await page.getByText('Esta herramienta necesita permisos o recursos externos',{exact:false}).waitFor();assert(!await page.getByRole('button',{name:'Preparar herramienta con IA',exact:true}).count(),'Ofrece ejecutar recurso inexistente');checks.push('recursos pendientes no simulan disponibilidad');
    await reset('stale');await need().fill('Limpiar un texto con herramientas que cambiaron');await consent().check();await search().click();await page.getByRole('alert').filter({hasText:'Las herramientas cambiaron'}).waitFor();assert(await need().inputValue()==='Limpiar un texto con herramientas que cambiaron','Error pierde necesidad');checks.push('contrato cambiado conserva necesidad y no guarda ni ejecuta');
    await reset('service-error');await need().fill('Necesito buscar una solución con el servicio caído');await consent().check();await search().click();await page.getByRole('alert').filter({hasText:'Búsqueda temporalmente no disponible'}).waitFor();checks.push('error de búsqueda visible sin fallback');
    return {passed:true,checks,realWrites:0,realProviderCalls:0};
  }finally{
    await clearNeed();
    releaseModel?.();await page.unroute('**/api/**',handler);await page.setViewportSize({width:1280,height:900});
    await page.evaluate(({userId,preference,drafts})=>{const key=`capacita:experiencia:${userId}`;if(preference===null)localStorage.removeItem(key);else localStorage.setItem(key,preference);sessionStorage.clear();for(const [key,value]of Object.entries(drafts))sessionStorage.setItem(key,value);},initial);
    await page.goto('http://127.0.0.1:5173/#inicio');
    page.off('dialog',dialog);
    await page.unroute('**/src/services/supabase.js*',authFixture);
  }
}
