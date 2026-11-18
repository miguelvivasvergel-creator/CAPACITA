// Playwright CLI: chat + taller con archivos. Identidad y APIs interceptadas; sin IA ni escrituras reales.
// Cubre: fábrica con foto → vista previa «en prueba» → ajustes («ponle 30 %», frase con IA, barra,
// volver a un intento) → guardar → compartir/dejar de compartir; descartar; «Créalas todas»;
// solución abierta desde el menú + ajuste después del resultado (actualiza, no duplica); «Usar en el chat».
// Ejecutar con Vite abierto en 5173:
//   npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-qa open http://127.0.0.1:5173
//   npx.cmd --yes --package @playwright/cli playwright-cli -s=capacita-qa run-code --filename scripts/maintenance/verify_taller_archivos_browser.js
// eslint-disable-next-line no-unused-expressions -- La CLI evalúa esta función.
async (page) => {
  await page.unrouteAll({behavior:'ignoreErrors'});
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  const userId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  await page.goto('http://127.0.0.1:5173/');
  // Foto real de muestra (la misma que usa la fábrica) como archivo de la persona y como resultado.
  const fotoB64=await page.evaluate(async()=>{const r=await fetch('/muestras/foto.jpg');const b=new Uint8Array(await r.arrayBuffer());let t='';for(let i=0;i<b.length;i+=0x8000)t+=String.fromCharCode(...b.subarray(i,i+0x8000));return btoa(t);});
  const fotoArchivo={name:'plato.jpg',mimeType:'image/jpeg',buffer:Buffer.from(fotoB64,'base64')};
  const uid=n=>`${String(n).padStart(8,'0')}-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const ids={cap:uid(1),cand:uid(2),build:uid(3),version:uid(4),workflow:uid(5),approval:uid(6),pub:uid(7)};
  const foto={type:'string',contentEncoding:'base64',contentMediaType:'image/jpeg',description:'Foto JPEG codificada en base64'};
  const parametros={type:'object',properties:{intensidad:{type:'number',description:'Intensidad del filtro de 0.0 (sin efecto) a 1.0 (máxima)'}},required:['intensidad'],additionalProperties:false};
  const herramienta=(name)=>({name,description:`${name}: aplica un filtro cálido graduable a una foto.`,category:'Imagen',input_type:'imagen',output_type:'imagen',
    input_schema:{type:'object',properties:{foto},required:['foto'],additionalProperties:false},
    output_schema:{type:'object',properties:{imagen:{...foto,description:'Foto resultante'}},required:['imagen'],additionalProperties:false},
    parameter_schema:parametros,required_permissions:[],resources:[],constraints:[],failure_cases:[],
    examples:[{inputs:{foto:'MUESTRA:foto'},parameters:{intensidad:0.5},expected_output:{imagen:'ARCHIVO'}}]});
  const opcion={id:ids.version,name:'Filtro cálido',description:'Filtro cálido graduable.',visibility:'private',review_hash:'a'.repeat(64),
    input_schema:herramienta('x').input_schema,output_schema:herramienta('x').output_schema,parameter_schema:parametros};
  const planFoto={format_version:1,name:'Foto del plato con filtro',description:'Aplica un filtro cálido a la foto.',input_schema:{type:'object',properties:{foto},required:['foto'],additionalProperties:false},
    nodes:[{id:'filtro',version_id:ids.version,label:'Filtro cálido',parameters:{intensidad:0.8},values:{},bindings:{foto:{source:'$input',field:'foto'}},x:0,y:0}],
    outputs:{imagen:{source:'filtro',field:'imagen'}}};

  const requests=[];let s={};
  const envelope=data=>({success:true,message:'Fixture',data});
  const handler=async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin!=='http://127.0.0.1:8000')return route.continue();
    const path=url.pathname,method=req.method(),body=req.postData()?req.postDataJSON():null;
    requests.push({path,method,body,search:url.search});
    let data;
    if(path==='/api/planner/options')data={items:s.opciones||[],next_cursor:null,search_truncated:false};
    else if(path==='/api/planner/propose'){
      s.propuestas=(s.propuestas||0)+1;
      data=s.propuestas===1&&s.faltan?{proposal:{decision:'create',explanation:'Me faltan dos herramientas.',questions:[],missing:s.faltan,definition:null},validation:null,saved:false,executed:false}
        :{proposal:{decision:'compose',explanation:'Con tus herramientas nuevas ya puedo.',questions:[],missing:[],definition:planFoto},validation:{valid:true},saved:false,executed:false};
    }else if(path==='/api/objectives/interpret'){
      s.disenos=(s.disenos||0)+1;
      data={interpretation:{decision:'define',explanation:'Diseñé la herramienta que falta.',questions:[]},definition:herramienta(`Filtro cálido ${s.disenos}`),matches:{items:[],next_cursor:null}};
    }else if(path==='/api/objectives/adjust'){
      assert(!JSON.stringify(body).includes(fotoB64.slice(0,200)),'La foto viajó a la IA');
      data={decision:'adjust',explanation:'Lo dejé más suave.',parameters:{...body.current,intensidad:0.2}};
    }
    else if(path==='/api/capabilities/definitions/check')data={definition:body,definition_hash:'d'.repeat(64),matches:{items:[],next_cursor:null}};
    else if(path==='/api/capabilities/definitions'&&method==='POST')data={id:ids.cap,name:body.definition.name};
    else if(path===`/api/capabilities/${ids.cap}/candidates/check`)data={definition_hash:'f'.repeat(64),matches:{items:[],next_cursor:null}};
    else if(path===`/api/capabilities/${ids.cap}/candidates`&&method==='POST')data={id:ids.cand,capability_id:ids.cap,manifest:{definition:herramienta(`Filtro cálido ${s.disenos||1}`),artifact_hash:'1'.repeat(64)},provider:'gemini',model:'fixture'};
    else if(path==='/api/builds'&&method==='POST'){
      assert(body.cases[0].inputs.foto.startsWith('/9j/'),'La prueba no recibió la foto de muestra real');
      assert(body.cases[0].expected_output.imagen==='ARCHIVO','El caso no espera un archivo');
      data={id:ids.build,status:'queued'};
    }else if(path===`/api/builds/${ids.build}`)data={id:ids.build,candidate_id:ids.cand,status:'passed',storage_backend:'supabase',report:{passed:true,cases:[{index:0,executed:true,passed:true,reason:'matched'}]}};
    else if(path==='/api/versions'&&method==='POST'){s.versiones=(s.versiones||0)+1;data={id:ids.version,capability_id:ids.cap,status:'enabled'};}
    else if(path===`/api/versions/${ids.version}/disable`)data={id:ids.version,status:'disabled'};
    else if(path==='/api/runs'&&method==='POST'){
      assert(body.version_id===ids.version&&body.inputs.foto?.startsWith('/9j/'),'La vista previa no usó una foto');
      const id=uid(100+requests.length);s.runs=s.runs||{};s.runs[id]=body.parameters;data={id,status:'queued'};
    }else if(path.startsWith('/api/runs/')&&s.runs?.[path.slice(10)]){
      data={id:path.slice(10),status:'completed',output:{imagen:fotoB64}};
    }
    else if(path==='/api/publications/availability')data={enabled:true};
    else if(path==='/api/publications'&&method==='GET')data={items:s.publicada?[{id:ids.version,capability_id:ids.cap,publication_id:ids.pub}]:[],next_cursor:null};
    else if(path==='/api/publications'&&method==='POST'){assert(body.version_id===ids.version&&body.consent===true&&body.license==='Apache-2.0','Publicación sin consentimiento o licencia');s.publicada=true;data={id:ids.pub};}
    else if(path===`/api/publications/${ids.pub}/withdraw`){s.publicada=false;data={withdrawn:true};}
    else if(path===`/api/workflows/${ids.workflow}`&&method==='GET')data={id:ids.workflow,revision:3,definition_hash:'e'.repeat(64),definition:planFoto};
    else if(path===`/api/workflows/${ids.workflow}`&&method==='PUT'){assert(body.expected_revision===3,'Actualizó sin la revisión esperada');data={id:ids.workflow,revision:4,definition_hash:'c'.repeat(64),definition:body.definition};}
    else if(path==='/api/workflows'&&method==='POST')data={id:ids.workflow,revision:1,definition_hash:'e'.repeat(64),definition:body.definition};
    else if(path==='/api/workflows/available-versions')data={items:[opcion],next_cursor:null};
    else if(path===`/api/workflows/${ids.workflow}/approvals`){assert(body.inputs.foto?.startsWith('/9j/'),'Aprobación sin la foto');data={id:uid(200+requests.length)};}
    else if(path===`/api/workflows/${ids.workflow}/runs`){const id=uid(300+requests.length);s.runs=s.runs||{};s.runs[id]=true;data={id,status:'queued'};}
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
  const escribir=async(texto)=>{await entrada().fill(texto);await entrada().press('Enter');};
  const adjuntar=()=>page.locator('input[type=file]').setInputFiles(fotoArchivo);
  const reset=async(estado,hash='#inicio')=>{
    s=estado;requests.length=0;
    await page.evaluate(id=>{localStorage.setItem(`capacita:experiencia:${id}`,'guiado');sessionStorage.clear();},userId);
    await page.goto(`http://127.0.0.1:5173/${hash}`);await page.reload();await entrada().waitFor();
  };
  const contar=(path,method='POST')=>requests.filter(r=>r.path===path&&r.method===method).length;
  const checks=[];
  try{
    page.on('dialog',d=>d.accept());
    await page.route('**/src/services/supabase.js*',authFixture);
    await page.route('**/api/**',handler);
    await page.setViewportSize({width:1280,height:860});

    // 1. Foto adjunta antes de pedir: la fábrica la crea, la prueba con la muestra y la muestra «en prueba» con TU foto.
    await reset({});
    await adjuntar();
    await page.getByText('Recibí tu archivo').waitFor();
    await escribir('Ponle un filtro vintage cálido a mi foto');
    await page.getByRole('button',{name:'Acepto, continuar'}).click();
    await page.getByRole('button',{name:'Crear y probar'}).click();
    await page.getByText('En prueba · solo tú la ves',{exact:false}).waitFor({timeout:15000});
    await page.getByText('Así queda con los valores iniciales.').waitFor({timeout:15000});
    await page.getByRole('img',{name:/Resultado:/}).first().waitFor({timeout:15000});
    assert(await page.getByRole('button',{name:'📥 Descargar'}).count()>0,'Sin botón de descarga');
    assert(contar('/api/versions')===1,'No se activó en prueba una sola vez');
    const previa=requests.filter(r=>r.path==='/api/runs'&&r.method==='POST');
    assert(previa.length===1&&previa[0].body.parameters.intensidad===0.5,'La primera vista no usó los valores del ejemplo');
    assert(await page.getByText('usé uno de muestra',{exact:false}).count()===0,'Dijo que usó una muestra teniendo la foto');
    checks.push('fábrica con foto: prueba con muestra, activa en prueba y muestra el resultado con tu foto');
    await page.screenshot({path:'output/playwright/taller-vista-previa.png'});

    // 2. «ponle 30 %» se aplica sin IA; una frase relativa va a /objectives/adjust sin la foto.
    await escribir('ponle 30 %');
    await page.getByText('Puse intensidad en 0.3.',{exact:false}).waitFor({timeout:15000});
    await page.getByText('Intento 2 · pediste «ponle 30 %»').waitFor();
    assert(contar('/api/objectives/adjust')===0,'Un número claro consultó a la IA');
    let runs=requests.filter(r=>r.path==='/api/runs'&&r.method==='POST');
    assert(runs.at(-1).body.parameters.intensidad===0.3,'No ejecutó con 0.3');
    const libre=()=>page.waitForFunction(()=>!/Aplicándola a tu archivo|En cola: esperando/.test(document.body.innerText),null,{timeout:15000});
    await libre();
    await escribir('un poco más suave');
    await page.getByText('Lo dejé más suave.').waitFor({timeout:15000});
    runs=requests.filter(r=>r.path==='/api/runs'&&r.method==='POST');
    assert(contar('/api/objectives/adjust')===1&&runs.at(-1).body.parameters.intensidad===0.2,'La frase relativa no se ajustó con la IA');
    checks.push('ajustes escribiendo: número directo sin IA y frase relativa con IA, sin enviar la foto');

    // 3. La barra y «Ver cómo queda»; luego volver al intento 2 y guardarla.
    await libre();
    await page.getByRole('button',{name:'Ver cómo queda'}).waitFor();
    await page.getByRole('slider',{name:/Intensidad/}).fill('0.7');
    await page.getByRole('button',{name:'Ver cómo queda'}).click();
    await page.getByText('Con los valores que elegiste.').waitFor({timeout:15000});
    runs=requests.filter(r=>r.path==='/api/runs'&&r.method==='POST');
    await libre();
    assert(Math.abs(runs.at(-1).body.parameters.intensidad-0.7)<1e-9,'La barra no cambió la intensidad');
    await page.locator('li',{hasText:'Intento 2'}).getByRole('button',{name:'Volver a este'}).click({timeout:15000});
    await page.getByText('Intento 2 · pediste «ponle 30 %»').waitFor();
    await page.getByRole('button',{name:'✅ Me gusta, guardarla'}).click();
    await page.getByText('¡Guardada en tus herramientas privadas!',{exact:false}).waitFor();
    assert(contar('/api/planner/propose')===0,'Volvió a planificar sin necesidad');
    checks.push('barra, volver a un intento anterior y guardarla');

    // 4. Compartir con licencia y consentimiento; dejar de compartir.
    await page.getByRole('button',{name:'🌎 Compartir con la comunidad'}).click();
    await page.getByRole('combobox').last().selectOption('Apache-2.0');
    assert(await page.getByRole('button',{name:'Publicar'}).isDisabled(),'Publicar sin consentimiento');
    await page.getByLabel(/Autorizo publicarla/).check();
    await page.getByRole('button',{name:'Publicar'}).click();
    await page.getByText('Compartida: otras cuentas',{exact:false}).waitFor();
    await page.evaluate(()=>{window.confirm=()=>true;});
    await page.getByRole('button',{name:'Dejar de compartir'}).click();
    await page.getByRole('button',{name:'Publicar'}).waitFor();
    assert(contar(`/api/publications/${ids.pub}/withdraw`)===1,'No se retiró la publicación');
    checks.push('compartir con licencia y consentimiento, y dejar de compartir');
    await page.screenshot({path:'output/playwright/taller-compartir.png'});

    // 5. Sin foto adjunta: usa la muestra y lo avisa; «Descartar» desactiva la versión.
    await reset({});
    await escribir('Ponle un filtro vintage cálido a mi foto');
    await page.getByRole('button',{name:'Acepto, continuar'}).click();
    await page.getByRole('button',{name:'Crear y probar'}).click();
    await page.getByText('usé uno de muestra',{exact:false}).waitFor({timeout:15000});
    await page.getByRole('img',{name:/Resultado:/}).first().waitFor({timeout:15000});
    await page.getByRole('button',{name:'🗑️ Descartar'}).click();
    await page.getByText('Descartada: la desactivé',{exact:false}).waitFor();
    assert(contar(`/api/versions/${ids.version}/disable`)===1,'Descartar no desactivó la versión');
    checks.push('sin foto usa la muestra y lo avisa; descartar desactiva la versión');

    // 6. «Créalas todas»: dos herramientas automáticas seguidas y al final arma la solución.
    await reset({opciones:[opcion],faltan:['Mejorar la foto','Poner el nombre encima']});
    await adjuntar();
    await escribir('Mejora la foto de mi plato y ponle encima el nombre de mi restaurante');
    await page.getByRole('button',{name:'Acepto, continuar'}).click();
    await page.getByRole('button',{name:/Créalas todas \(2\)/}).click();
    await page.getByText('Sigo con la siguiente',{exact:false}).waitFor({timeout:20000});
    await page.getByRole('heading',{name:planFoto.name}).waitFor({timeout:20000});
    assert(s.disenos===2&&s.versiones===2,`Créalas todas: ${s.disenos} diseños y ${s.versiones} activaciones`);
    const metas=requests.filter(r=>r.path==='/api/objectives/interpret').map(r=>r.body.objective);
    assert(metas.every(m=>m.startsWith('Preparar únicamente'))&&metas[0].includes('Mejorar la foto')&&metas[1].includes('Poner el nombre'),'Diseñó otra cosa');
    assert(contar('/api/planner/propose')===2,'No rearmó la solución al final');
    await page.getByText('Uso el archivo que me enviaste',{exact:false}).waitFor();
    await page.getByText('Listo para ejecutar').waitFor();
    checks.push('Créalas todas: crea las dos en automático y rearma la solución con tu foto');

    // 7. Soluciones → abrir en el chat (sin IA ni guardar), pedir la foto, ejecutar y ajustar el resultado.
    await reset({},`#inicio/solucion/${ids.workflow}`);
    await page.getByText(`Abrí tu solución «${planFoto.name}»`,{exact:false}).waitFor();
    await page.getByText('Súbelo con el botón 📎',{exact:false}).waitFor();
    await adjuntar();
    await page.getByText('Listo para ejecutar').waitFor();
    await page.getByRole('button',{name:'Aprobar y ejecutar'}).click();
    await page.getByText('¡Listo! Aquí está tu resultado').first().waitFor({timeout:15000});
    assert(contar('/api/workflows')===0&&contar(`/api/workflows/${ids.workflow}`,'PUT')===0,'Volvió a guardar una solución abierta');
    await escribir('bájale al 50 %');
    await page.getByText('Puse intensidad en 0.5.',{exact:false}).waitFor();
    assert(contar('/api/objectives/adjust')===0,'«al 50 %» consultó a la IA');
    await page.getByRole('button',{name:'Aprobar y ejecutar'}).last().click();
    await page.waitForFunction(()=>document.body.innerText.split('¡Listo! Aquí está tu resultado').length>=3,null,{timeout:15000});
    const put=requests.find(r=>r.path===`/api/workflows/${ids.workflow}`&&r.method==='PUT');
    assert(put&&put.body.definition.nodes[0].parameters.intensidad===0.5,'El ajuste no actualizó la solución guardada');
    assert(contar('/api/workflows')===0,'El ajuste creó una copia nueva');
    assert(contar('/api/planner/propose')===0&&contar('/api/planner/options','GET')===0,'Abrir/ajustar usó el planner');
    checks.push('solución abierta desde el menú: pide la foto, ejecuta y el ajuste actualiza la misma solución');
    await page.screenshot({path:'output/playwright/taller-solucion-ajustada.png'});

    // 8. Herramientas → «Usar en el chat» deja el pedido escrito.
    await reset({},`#inicio/usar/${encodeURIComponent('Quiero usar mi herramienta «Filtro cálido»')}`);
    assert(await entrada().inputValue()==='Quiero usar mi herramienta «Filtro cálido»','No dejó el pedido escrito');
    checks.push('usar en el chat deja el pedido escrito');

    // 9. Móvil: la vista previa no desborda.
    await page.setViewportSize({width:390,height:844});
    await reset({});
    await adjuntar();
    await escribir('Ponle un filtro vintage cálido a mi foto');
    await page.getByRole('button',{name:'Acepto, continuar'}).click();
    await page.getByRole('button',{name:'Crear y probar'}).click();
    await page.getByRole('img',{name:/Resultado:/}).first().waitFor({timeout:15000});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Desplazamiento horizontal en móvil');
    await page.screenshot({path:'output/playwright/taller-vista-previa-movil.png'});
    checks.push('vista previa en móvil 390 sin desbordar');
    return {passed:true,checks};
  }catch(error){
    await page.screenshot({path:'output/playwright/taller-archivos-error.png'}).catch(()=>{});
    throw new Error(`${error.message} | checks: ${checks.join(' / ')}`);
  }finally{
    await page.setViewportSize({width:1280,height:860}).catch(()=>{});
    await page.unroute('**/api/**',handler);
    await page.unroute('**/src/services/supabase.js*',authFixture);
  }
}
