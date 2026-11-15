"""Lecturas autorizadas desde el cliente abierto, sin copiar sesión/credenciales.

Añade temporalmente un módulo DEV de solo GET a Workflows y lo retira siempre.
Colector loopback recibe únicamente booleanos y hashes; nunca JWT ni contenido.
Tras baseline, otro proceso reinicia API y crea owner-api-restarted.flag. El cliente
relee del servidor, compara y reporta. No crea ni modifica datos en Supabase.
"""
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
import time
from uuid import UUID, uuid4

ROOT=Path(__file__).resolve().parents[2]
OUTPUT=ROOT/'output/laboratory'

HOOK=r'''
// __B4_READONLY_ACCEPTANCE_NONCE__
if (import.meta.env.DEV && ['http://127.0.0.1:5173','http://localhost:5173'].includes(location.origin)) {
  void (async () => {
    const nonce=NONCE, collector='http://127.0.0.1:18006';
    const send=async(body)=>fetch(collector+'/report',{method:'POST',credentials:'omit',headers:{'Content-Type':'application/json'},body:JSON.stringify({nonce,...body})});
    try {
      const {api}=await import('/src/api.js');
      const hash=async(value)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(b=>b.toString(16).padStart(2,'0')).join('');
      async function read(phase) {
        const suffix='?acceptance='+nonce+'-'+phase;
        const w=await api('/workflows/'+WORKFLOW+suffix);
        const r=await api('/runs/'+RUN+suffix);
        const checks={workflow_readable:true,run_readable:true,has_steps:w.definition.nodes.length>0,
          options_preserved:w.definition.nodes.every(node=>Object.keys(node.parameters||{}).length===0),
          bindings_valid:w.definition.nodes.every(node=>Object.values(node.bindings||{}).every(binding=>binding.source==='$input'||w.definition.nodes.some(source=>source.id===binding.source))),
          run_completed:r.status==='completed',steps_completed:r.report?.steps?.length===w.definition.nodes.length&&r.report.steps.every(step=>step.status==='completed'),
          correct_result:r.output?.resultado==='Mi primer workflow real',matching_workflow:r.workflow_id===w.id};
        return {phase,checks,workflow_hash:await hash(w.definition),run_hash:await hash({status:r.status,output:r.output,steps:r.report.steps})};
      }
      const before=await read('before');await send(before);
      if(!Object.values(before.checks).every(Boolean))return;
      for(let i=0;i<600;i++) {
        const gate=await(await fetch(collector+'/continue?nonce='+nonce,{credentials:'omit'})).json();
        if(gate.ready) {
          const after=await read('after');
          after.checks.same_workflow=before.workflow_hash===after.workflow_hash;
          after.checks.same_run=before.run_hash===after.run_hash;
          await send(after);return;
        }
        await new Promise(resolve=>setTimeout(resolve,500));
      }
    } catch { await send({phase:'failed',checks:{owner_read:false}}).catch(()=>{}); }
  })();
}
'''


def main(args):
    OUTPUT.mkdir(parents=True,exist_ok=True)
    baseline=OUTPUT/'owner-baseline.ready'
    restarted=OUTPUT/'owner-api-restarted.flag'
    for path in (baseline,restarted):
        if path.exists():path.unlink()
    nonce=uuid4().hex
    reports=[]; lock=threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def log_message(self,*args):pass
        def respond(self,data,status=200):
            self.send_response(status)
            origin=self.headers.get('Origin','')
            if origin in {'http://127.0.0.1:5173','http://localhost:5173'}:
                self.send_header('Access-Control-Allow-Origin',origin)
            self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers','Content-Type')
            self.send_header('Content-Type','application/json');self.end_headers()
            self.wfile.write(json.dumps(data).encode())
        def do_OPTIONS(self):self.respond({})
        def do_GET(self):
            if self.path!='/continue?nonce='+nonce:return self.respond({},404)
            self.respond({'ready':restarted.exists()})
        def do_POST(self):
            if self.path!='/report':return self.respond({},404)
            length=int(self.headers.get('Content-Length','0'))
            if not 0<length<=4096:return self.respond({},400)
            body=json.loads(self.rfile.read(length))
            if body.get('nonce')!=nonce:return self.respond({},403)
            # Solo campos cerrados, booleanos y huellas: nunca persistir contenido.
            checks=body.get('checks',{})
            if not isinstance(checks,dict) or not all(isinstance(v,bool) for v in checks.values()):return self.respond({},400)
            safe={'phase':body.get('phase'),'checks':checks}
            for field in ('workflow_hash','run_hash'):
                value=body.get(field)
                if isinstance(value,str) and len(value)==64 and all(c in '0123456789abcdef' for c in value):safe[field]=value
            with lock:reports.append(safe)
            self.respond({'received':True})
    server=ThreadingHTTPServer(('127.0.0.1',18006),Handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
    source=ROOT/'src/pages/Workflows.jsx'
    original=source.read_bytes()
    hook=HOOK.replace('NONCE',json.dumps(nonce)).replace('WORKFLOW',json.dumps(str(args.workflow))).replace('RUN',json.dumps(str(args.run))).encode()
    # Identificador del marcador no comparte los tokens de sustitución.
    hook=hook.replace(b'__B4_READONLY_ACCEPTANCE_'+json.dumps(nonce).encode()+b'__',b'__B4_READONLY_ACCEPTANCE__')
    report={'passed':False,'workflow_id':str(args.workflow),'run_id':str(args.run),'method':'client_readonly_no_session_export'}
    try:
        source.write_bytes(original+hook)
        deadline=time.monotonic()+90; observed=False
        while time.monotonic()<deadline:
            with lock:before=next((r for r in reports if r['phase']=='before' and r['checks']),None)
            if before:
                report['before']=before
                if not all(before['checks'].values()):
                    print('OWNER_BASELINE_MISMATCH:',before['checks'],flush=True)
                    raise RuntimeError('owner_baseline_mismatch')
                baseline.write_text('ready');observed=True
                print('OWNER_BASELINE_READY: lecturas propias correctas; esperando reinicio de API.',flush=True);break
            time.sleep(1)
        if not observed:raise RuntimeError('owner_browser_not_available')
        deadline=time.monotonic()+300
        while time.monotonic()<deadline:
            with lock:after=next((r for r in reports if r['phase']=='after' and r['checks'] and all(r['checks'].values())),None)
            if after:
                report.update(passed=True,after=after)
                print('PASS: workflow y ejecución de usuaria conservados tras reinicio; mismos pasos, opciones, conexiones y resultado.',flush=True)
                break
            time.sleep(1)
        else:raise RuntimeError('owner_after_restart_timeout')
    finally:
        current=source.read_bytes()
        if current==original+hook:source.write_bytes(original)
        elif hook in current:source.write_bytes(current.replace(hook,b'',1))
        server.shutdown();server.server_close()
        report['observations']=reports
        (OUTPUT/'block4-owner-persistence.json').write_text(json.dumps(report,indent=2),encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workflow',type=UUID,required=True);parser.add_argument('--run',type=UUID,required=True)
    main(parser.parse_args())
