"""Comprueba editor real en Chrome headless, con HTTP de fixture sin Supabase.

No usa perfil/sesión del usuario, no inicia sesión ni envía datos remotos.
Arranca Vite temporal en 18004 y lo detiene. Artefactos ignorados en output/playwright.
"""
import json
from pathlib import Path
import subprocess
import time
from urllib.request import urlopen
from uuid import uuid4

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/'output/playwright'
CHROME=Path('C:/Program Files/Google/Chrome/Application/chrome.exe')
HTML=r'''<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><pre id="b4-test-result">pending</pre><script>window.addEventListener('error',event=>{document.getElementById('b4-test-result').textContent=JSON.stringify({passed:false,error:event.message||'module_load_failed'})});window.addEventListener('unhandledrejection',event=>{document.getElementById('b4-test-result').textContent=JSON.stringify({passed:false,error:String(event.reason)})});</script><script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import Workflows from '/src/pages/Workflows.jsx';
import '/src/index.css';
const vid1='00000000-0000-4000-8000-000000000001',vid2='00000000-0000-4000-8000-000000000002';
const input_schema={type:'object',properties:{texto:{type:'string'}},required:['texto'],additionalProperties:false};
const output_schema={type:'object',properties:{resultado:{type:'string'}},required:['resultado'],additionalProperties:false};
const choices=[{id:vid1,name:'Limpiar texto'},{id:vid2,name:'Mayúsculas'}].map(v=>({...v,status:'enabled',input_schema,output_schema,parameter_schema:{type:'object',properties:{mayusculas:{type:'boolean'}}}}));
let saved=null,approvalCount=0; const requests=[];const nativeFetch=window.fetch.bind(window);
window.fetch=async(url,options={})=>{
 const path=new URL(url,location.origin).pathname,method=options.method||'GET';
 if(!path.startsWith('/api/')){if(new URL(url,location.origin).origin===location.origin)return nativeFetch(url,options);throw new Error('unexpected_remote_request')}
 const body=options.body?JSON.parse(options.body):null;requests.push({path,method,body,headers:options.headers});
 let data;
 if(path.endsWith('/available-versions'))data={items:choices,next_cursor:null};
 else if(path==='/api/workflows/validate')data={valid:true,order:body.nodes.map(n=>n.id),definition:body};
 else if(path==='/api/workflows'&&method==='POST'){saved={id:'00000000-0000-4000-8000-000000000003',definition:body.definition,revision:1,definition_hash:'a'.repeat(64)};data=saved;}
 else if(path==='/api/workflows')data={items:saved?[saved]:[],next_cursor:null};
 else if(path.endsWith('/approvals')){approvalCount++;data={id:'00000000-0000-4000-8000-000000000004',expires_at:new Date(Date.now()+600000).toISOString()};}
 else if(path.endsWith('/runs'))data={id:'00000000-0000-4000-8000-000000000005',status:'queued'};
 else if(path.startsWith('/api/runs/'))data={id:'00000000-0000-4000-8000-000000000005',status:'completed',report:{steps:[{id:'uno',label:'Limpiar texto',status:'completed'},{id:'dos',label:'Mayúsculas',status:'completed'}]},output:{resultado:'<img src=x onerror="window.__xss=1">'}};
 else if(path.startsWith('/api/workflows/'))data=saved;
 else throw new Error('unexpected_api_route');
 return new Response(JSON.stringify({success:true,data}),{status:method==='POST'?201:200,headers:{'Content-Type':'application/json'}});
};
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(test){for(let i=0;i<150;i++){if(test())return;await sleep(100)}throw new Error('ui_wait_timeout')}
const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
const label=text=>[...document.querySelectorAll('label')].find(l=>l.firstChild?.textContent.trim()===text);
function fill(element,value){const prototype=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:element.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,value);element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));}
createRoot(document.getElementById('root')).render(React.createElement(Workflows));
try{
 await wait(()=>button('Nuevo workflow'));button('Nuevo workflow').click();await sleep(150);
 fill(label('Nombre').querySelector('input'),'Prueba visual del proceso');await sleep(100);
 let select=label('Capacidad y versión').querySelector('select');fill(select,vid1);await sleep(100);button('Añadir paso').click();await sleep(150);
 select=label('Capacidad y versión').querySelector('select');fill(select,vid2);await sleep(100);button('Añadir paso').click();await sleep(150);
 const parameters=[...document.querySelectorAll('label')].filter(l=>l.firstChild?.textContent.trim()==='Opciones del paso (JSON)');
 fill(parameters[1].querySelector('textarea'),'{"mayusculas":true}');await sleep(100);
 button('Validar conexiones').click();await wait(()=>document.body.textContent.includes('Conexiones válidas'));
 button('Guardar workflow privado').click();await wait(()=>saved&&button('Aprobar estos pasos y datos'));
 assert(saved.definition.nodes.length===2,'two_steps_missing');
 assert(saved.definition.nodes[1].parameters.mayusculas===true,'parameters_not_saved');
 assert(saved.definition.nodes[1].bindings.texto.source===saved.definition.nodes[0].id,'mapping_not_saved');
 await wait(()=>!button('Aprobar estos pasos y datos').disabled);button('Aprobar estos pasos y datos').click();await wait(()=>approvalCount===1&&!button('Ejecutar workflow aprobado').disabled);
 fill(label('Datos de ejecución (JSON)').querySelector('textarea'),'{"texto":"otro dato"}');await sleep(100);
 assert(button('Ejecutar workflow aprobado').disabled,'editing_did_not_invalidate_approval');
 button('Aprobar estos pasos y datos').click();await wait(()=>approvalCount===2&&!button('Ejecutar workflow aprobado').disabled);
 button('Ejecutar workflow aprobado').click();await wait(()=>button('Actualizar ejecución'));await sleep(100);button('Actualizar ejecución').click();await wait(()=>document.body.textContent.includes('Completado'));
 assert(document.querySelectorAll('img').length===0&&!window.__xss,'unsafe_output_html');
 assert(requests.find(r=>r.path.endsWith('/runs')&&r.method==='POST').headers['Idempotency-Key'],'missing_idempotency');
 assert(document.documentElement.scrollWidth<=innerWidth+2,'horizontal_overflow');
 await wait(()=>document.querySelectorAll('.react-flow__node').length===4);
 document.getElementById('b4-test-result').textContent=JSON.stringify({passed:true,two_steps:true,parameters:true,mapping:true,approval_invalidated:true,escaped_output:true,no_overflow:true});
}catch(error){document.getElementById('b4-test-result').textContent=JSON.stringify({passed:false,error:error.message})}
</script></body></html>'''


def main():
    OUTPUT.mkdir(parents=True,exist_ok=True)
    (OUTPUT/'workflow-harness.html').write_text(HTML,encoding='utf-8')
    server=subprocess.Popen(['node','node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','18004','--strictPort'],
        cwd=ROOT,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        for _ in range(30):
            try:
                with urlopen('http://127.0.0.1:18004/output/playwright/workflow-harness.html',timeout=2) as response:
                    if response.status==200:break
            except OSError:pass
            time.sleep(1)
        else:raise RuntimeError('temporary_vite_not_ready')
        for name,width,height in [('desktop',1280,1100),('mobile',390,950)]:
            profile=OUTPUT/f'b4-browser-{uuid4()}'
            browser=subprocess.Popen([str(CHROME),'--headless=new','--no-first-run','--disable-background-networking',
                '--disable-sync','--disable-extensions','--remote-debugging-port=0',f'--user-data-dir={profile}','about:blank'],
                stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
            try:
                for _ in range(30):
                    if (profile/'DevToolsActivePort').exists():break
                    time.sleep(1)
                port=(profile/'DevToolsActivePort').read_text().splitlines()[0]
                completed=subprocess.run(['node',str(ROOT/'scripts/maintenance/workflow_browser.mjs'),port,str(width),str(height),str(OUTPUT/f'workflow-{name}.png')],
                    capture_output=True,timeout=90,creationflags=subprocess.CREATE_NO_WINDOW)
                report=json.loads(completed.stdout.decode('utf-8').strip())
                print(name,report,flush=True)
                if not report.get('passed'):raise RuntimeError('workflow_ui_failed')
            finally:
                if browser.poll() is None:
                    subprocess.run(['taskkill','/PID',str(browser.pid),'/T','/F'],capture_output=True,check=True,timeout=20)
                    browser.wait(timeout=20)
    finally:
        if server.poll() is None:
            subprocess.run(['taskkill','/PID',str(server.pid),'/T','/F'],capture_output=True,check=True,timeout=20)
            server.wait(timeout=20)


if __name__=='__main__':main()
