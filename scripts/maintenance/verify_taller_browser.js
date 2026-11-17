// Playwright CLI: chat + taller. Identidad y APIs de negocio interceptadas; sin IA ni escrituras reales.
// Ejecutar con Vite abierto en 5173:
//   npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-qa open http://127.0.0.1:5173
//   npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-qa run-code --filename scripts/maintenance/verify_taller_browser.js
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  await page.unrouteAll({behavior:'ignoreErrors'});
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  await page.goto('http://127.0.0.1:5173/');
  const {opcionesGuiadas,planGuiado,herramientaGuiada}=await page.evaluate(()=>import('/src/mocks/guiado.js'));
  const ids={workflow:'33333333-3333-4333-8333-333333333333',approval:'44444444-4444-4444-8444-444444444444',run:'55555555-5555-4555-8555-555555555555',
    cap:'66666666-6666-4666-8666-666666666666',c1:'77777777-7777-4777-8777-777777777777',c2:'88888888-8888-4888-8888-888888888888',
    b1:'99999999-9999-4999-8999-999999999999',b2:'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',version:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
  const candidato=id=>({id,capability_id:ids.cap,manifest:{definition:herramientaGuiada,artifact_hash:(id===ids.c1?'1':'2').repeat(64)},provider:'gemini',model:'fixture'});
  const build=(id,status,cases)=>({id,candidate_id:id===ids.b1?ids.c1:ids.c2,artifact_hash:'0'.repeat(64),status,created_at:'2026-11-17T00:00:00Z',updated_at:'2026-11-17T00:00:00Z',storage_backend:'supabase',implementation_enabled:false,report:cases?{passed:status==='passed',cases}:null});
  const checks=[],requests=[];let mode='compose',runReads=0,failRun=true;
  const envelope=data=>({success:true,message:'Fixture',data});
  const handler=async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!=='http://127.0.0.1:8000')return route.continue();
    const path=url.pathname,method=req.method(),body=req.postData()?req.postDataJSON():null;
    requests.push({path,method,body,key:req.headers()['idempotency-key']});
    let data;
    if(path==='/api/planner/options')data={...opcionesGuiadas,items:mode==='create'?[]:opcionesGuiadas.items};
    else if(path==='/api/planner/propose'){
      assert(body.consent_to_provider&&body.version_ids.length===2,'Propuesta sin consentimiento o selección incorrecta');
      data={proposal:{decision:'compose',explanation:'Estas dos herramientas resuelven tu necesidad.',questions:[],missing:[],definition:planGuiado},validation:{valid:true},saved:false,executed:false};
    }else if(path==='/api/objectives/interpret'){
      assert(body.consent_to_provider,'Interpretación sin consentimiento');
      data={interpretation:{decision:'define',explanation:'Hace falta preparar una herramienta.',questions:[]},definition:herramientaGuiada,matches:{items:[],next_cursor:null}};
    }else if(path==='/api/workflows'&&method==='POST')data={id:ids.workflow,revision:1,definition_hash:'e'.repeat(64),definition:body.definition};
    else if(path===`/api/workflows/${ids.workflow}/approvals`){assert(body.inputs.texto==='  Niño  azul  ','Los datos aprobados no coinciden');data={id:ids.approval};}
    else if(path===`/api/workflows/${ids.workflow}/runs`){
      assert(body.approval_id===ids.approval,'Aprobación incorrecta');
      if(failRun){failRun=false;return route.fulfill({status:503,json:{detail:'Respuesta perdida de prueba'}});}
      data={id:ids.run,status:'queued'};
    }else if(path===`/api/runs/${ids.run}`){
      runReads++;const [a,b]=planGuiado.nodes;
      const steps=runReads===1?null:runReads===2?[{id:a.id,label:a.label,status:'completed',output:{resultado:'Niño  azul'}},{id:b.id,label:b.label,status:'running'}]:[{id:a.id,label:a.label,status:'completed',output:{resultado:'Niño  azul'}},{id:b.id,label:b.label,status:'completed'}];
      data={id:ids.run,workflow_id:ids.workflow,status:runReads===1?'queued':runReads===2?'running':'completed',output:runReads>2?{resultado:'NIÑO  AZUL <img src=x onerror="window.__tallerXss=1">'}:null,report:steps?{steps}:null};
    }
    else if(path==='/api/capabilities/definitions'&&method==='POST'){assert(body.acknowledge_similar===true,'Guardado sin reconocer similares');data={id:ids.cap,name:body.definition.name};}
    else if(path===`/api/capabilities/${ids.cap}/candidates/check`)data={definition_hash:'f'.repeat(64),matches:{items:[],next_cursor:null}};
    else if(path===`/api/capabilities/${ids.cap}/candidates`&&method==='POST'){assert(body.consent_to_provider&&body.definition_hash==='f'.repeat(64),'Generación sin consentimiento o hash');data=candidato(ids.c1);}
    else if(path==='/api/builds'&&method==='POST'){
      assert(body.cases.length===herramientaGuiada.examples.length&&body.cases[0].expected_output.resultado==='EJEMPLO','Casos no salen de los ejemplos');
      data=build(body.candidate_id===ids.c1?ids.b1:ids.b2,'queued');
    }
    else if(path===`/api/builds/${ids.b1}`)data=build(ids.b1,'failed',[{index:0,executed:true,passed:false,reason:'output_mismatch',schema_valid:true,mismatched_fields:['resultado']}]);
    else if(path===`/api/builds/${ids.b2}`)data=build(ids.b2,'passed',[{index:0,executed:true,passed:true,reason:'matched'}]);
    else if(path===`/api/candidates/${ids.c1}/repair`){assert(body.consent_to_provider&&body.feedback.includes('resultado')&&body.feedback.includes('EJEMPLO'),'Corrección sin pistas');data=candidato(ids.c2);}
    else if(path==='/api/versions'&&method==='POST'){assert(body.candidate_id===ids.c2&&body.build_id===ids.b2,'Activó una versión no probada');mode='compose';data={id:ids.version,status:'enabled'};}
    else if(path===`/api/capabilities/definitions/check`)data={definition:body,definition_hash:'d'.repeat(64),matches:{items:[],next_cursor:null}};
    else if(['/api/workflows','/api/runs','/api/capabilities'].includes(path))data={items:[],next_cursor:null};
    else throw new Error(`Petición inesperada: ${method} ${path}`);
    return route.fulfill({json:envelope(data)});
  };
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
  const entrada=()=>page.getByRole('textbox',{name:'Escribe tu necesidad'});
  const reset=async(nextMode)=>{
    mode=nextMode;runReads=0;failRun=true;
    await page.evaluate(id=>{localStorage.setItem(`capacita:experiencia:${id}`,'guiado');sessionStorage.clear();},userId);
    await page.goto('http://127.0.0.1:5173/#inicio');await page.reload();await entrada().waitFor();
  };
  const nodos=()=>page.locator('.react-flow__node');
  try{
    page.on('dialog',d=>d.accept());
    await page.route('**/src/services/supabase.js*',authFixture);
    await page.route('**/api/**',handler);
    await page.setViewportSize({width:1280,height:860});

    // 1. Componer herramientas existentes y ejecutar con progreso en el taller.
    await reset('compose');
    await page.getByText('¿Qué necesitas resolver hoy?').waitFor();
    await entrada().fill('Quita los espacios de los extremos de un texto y conviértelo a mayúsculas');
    await entrada().press('Enter');
    await page.getByRole('button',{name:'Acepto, continuar'}).click();
    await page.getByRole('heading',{name:'Limpiar y convertir texto'}).waitFor();
    assert(await nodos().count()===planGuiado.nodes.length+2,'El taller no dibuja datos, pasos y resultado');
    checks.push('plan compuesto aparece en chat y taller tras consentimiento');
    await page.screenshot({path:'output/playwright/taller-plan-desktop.png'});
    await page.getByRole('button',{name:'Usar esta solución'}).click();
    const campo=page.locator('.taller-mensajes form').locator('input,textarea').first();
    await campo.waitFor();await campo.fill('  Niño  azul  ');
    await page.getByRole('button',{name:'Aprobar y ejecutar'}).click();
    await page.getByText('Respuesta perdida de prueba').waitFor();
    await page.getByRole('button',{name:'Aprobar y ejecutar'}).click();
    const runPosts=requests.filter(r=>r.path===`/api/workflows/${ids.workflow}/runs`);
    assert(runPosts.length===2&&runPosts[0].key&&runPosts[0].key===runPosts[1].key,'El reintento no conserva la clave de idempotencia');
    assert(requests.filter(r=>r.path.endsWith('/approvals')).length===1,'Se duplicó la aprobación');
    checks.push('fallo de red visible y reintento con la misma clave');
    await page.locator('.react-flow__node',{hasText:'Trabajando'}).first().waitFor({timeout:15000});
    checks.push('nodo en curso se ilumina durante la ejecución');
    await page.screenshot({path:'output/playwright/taller-ejecutando-desktop.png'});
    await page.getByText('¡Listo! Aquí está tu resultado').first().waitFor({timeout:15000});
    assert(await page.evaluate(()=>window.__tallerXss===undefined),'Salida interpretada como HTML');
    assert(await page.getByText('<img src=x',{exact:false}).count()>0,'La salida no se muestra como texto');
    assert(await nodos().filter({hasText:'Listo'}).count()===planGuiado.nodes.length+2,'No todos los nodos quedaron listos');
    checks.push('resultado escapado y todos los nodos en verde');
    await nodos().nth(1).click();
    await page.getByText('Lo que produjo').waitFor();
    checks.push('detalle del paso muestra lo que produjo');
    await page.screenshot({path:'output/playwright/taller-resultado-desktop.png'});

    // 2. Móvil: pestañas chat/taller y sin desplazamiento horizontal.
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Desplazamiento horizontal en móvil');
    await page.getByRole('tab',{name:/Taller/}).click();
    await nodos().first().waitFor();
    await page.screenshot({path:'output/playwright/taller-movil.png'});
    await page.getByRole('tab',{name:/Chat/}).click();
    checks.push('móvil 390 con pestañas y sin desplazamiento horizontal');

    // 3. Sin herramientas: diseñar una nueva y mostrarla creándose.
    await page.setViewportSize({width:1280,height:860});
    await reset('create');
    await entrada().fill('Necesito convertir un texto de prueba a mayúsculas');
    await entrada().press('Enter');
    await page.getByRole('button',{name:'Acepto, continuar'}).click();
    await page.getByRole('heading',{name:herramientaGuiada.name}).waitFor();
    await nodos().filter({hasText:'Creándose'}).first().waitFor();
    assert(!requests.some(r=>r.path==='/api/planner/propose'&&r.body?.objective?.includes('convertir un texto de prueba')),'Propuso plan sin herramientas');
    checks.push('sin herramientas: definición nueva y nodo creándose');
    await page.screenshot({path:'output/playwright/taller-creando-desktop.png'});

    // 4. Fábrica automática: escribe, prueba, corrige con pistas, vuelve a probar y activa.
    await page.getByRole('button',{name:'Crear y probar'}).click();
    await page.getByText(/La IA lo está corrigiendo/).waitFor({timeout:15000});
    await page.getByText('Superó 1 de 1 ejemplos.').waitFor({timeout:15000});
    assert(await nodos().filter({hasText:'Espera tu aprobación'}).count()===1,'El nodo no pide aprobación');
    assert(!requests.some(r=>r.path==='/api/versions'),'Se activó sin confirmar');
    checks.push('fábrica: falla, se corrige sola y espera aprobación');
    await page.screenshot({path:'output/playwright/taller-fabrica-desktop.png'});
    await page.getByRole('button',{name:'Activar y continuar'}).click();
    await page.getByRole('heading',{name:'Limpiar y convertir texto'}).waitFor({timeout:15000});
    checks.push('tras activar vuelve a armar el plan con la herramienta');
    return {passed:true,checks};
  }finally{
    await page.unroute('**/api/**',handler);
    await page.unroute('**/src/services/supabase.js*',authFixture);
  }
}
