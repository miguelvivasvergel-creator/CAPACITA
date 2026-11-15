"""Casos SQL B4 sobre fixtures temporales; nunca datos del proyecto remoto."""
import json
from uuid import uuid4

from services.execution_engine import IMAGE, LIMITS, execute_job


def verify_workflows(sql, as_user, must_fail, owner, other, worker, session, version, candidate, sandbox):
    # El verificador no ejecuta heartbeat. Extiende solo la reserva de la base
    # temporal para evitar depender de la velocidad de cada comando WSL.
    sql("UPDATE capacita_execution.lease SET expires_at=now()+interval '1 hour';")
    spec={"format_version":1,"name":"Fixture workflow","description":"",
          "input_schema":candidate.definition.input_schema,
          "nodes":[{"id":"uno","label":"Limpiar","version_id":version["id"],"parameters":{},"values":{},
                    "bindings":{"texto":{"source":"$input","field":"texto"}},"x":300,"y":0},
                   {"id":"dos","label":"Mayúsculas","version_id":version["id"],"parameters":{"mayusculas":True},"values":{},
                    "bindings":{"texto":{"source":"uno","field":"resultado"}},"x":600,"y":0}],
          "outputs":{"final":{"source":"dos","field":"resultado"}}}
    def literal(value):
        return '$json$'+json.dumps(value,ensure_ascii=False)+'$json$'
    def call(user,expression):
        return json.loads(as_user(user,'SELECT '+expression+';'))
    saved=call(owner,f"public.execution_workflow_save(NULL,NULL,{literal(spec)})")
    identity=saved["id"]
    must_fail(other,f"PERFORM public.execution_workflow_get('{identity}')","P0002")
    assert call(other,'public.execution_workflow_list()')["items"]==[]
    assert call(owner,f"public.execution_workflow_get('{identity}')")["definition"]==spec
    def approve(row):
        return call(owner,f"public.execution_workflow_approve('{identity}',{row['revision']},'{row['definition_hash']}',"
                          f"{literal({'texto':'  Árbol azul  '})})")
    stale=approve(saved)
    spec["description"]="edición que invalida aprobación"
    updated=call(owner,f"public.execution_workflow_save('{identity}',1,{literal(spec)})")
    assert updated["revision"]==2 and updated["definition_hash"]!=saved["definition_hash"]
    must_fail(owner,f"PERFORM public.execution_workflow_save('{identity}',1,{literal(spec)})","P0001")
    must_fail(owner,f"PERFORM public.execution_workflow_enqueue('{identity}','{stale['id']}','stale')","P0001")
    approval=approve(updated)
    run=call(owner,f"public.execution_workflow_enqueue('{identity}','{approval['id']}','workflow-key')")
    assert call(owner,f"public.execution_workflow_enqueue('{identity}','{approval['id']}','workflow-key')")["id"]==run["id"]
    must_fail(owner,f"PERFORM public.execution_workflow_enqueue('{identity}','{approval['id']}','another-key')","P0001")
    assert call(worker,f"public.execution_claim('{session}')")["job"] is None
    claimed=call(worker,f"public.execution_claim('{session}',2)")["job"]
    assert claimed["id"]==run["id"] and claimed["workflow_revision"]==2
    def fixture_runner(request):
        text=request["inputs"]["texto"].strip()
        if request["parameters"].get("mayusculas"):
            text=text.upper()
        return {"runtime":"runsc","image":IMAGE,"limits":LIMITS,"cleanup_verified":True,
                "termination":"exited","exit_code":0,"output":json.dumps({"resultado":text})}
    progress=[]
    def checkpoint(report):
        progress.append(json.loads(json.dumps(report)))
        call(worker,f"public.execution_progress('{session}','{run['id']}',{literal(report)})")
    if sandbox:
        status,report,output=execute_job(claimed,progress=checkpoint)
    else:
        status,report,output=execute_job(claimed,fixture_runner,checkpoint)
    assert status=='completed' and output=={"final":"ÁRBOL AZUL"}
    assert progress[1]["steps"][0]["output"]=={"resultado":"Árbol azul"}
    call(worker,f"public.execution_finish('{session}','{run['id']}','completed',{literal(report)},{literal(output)})")
    assert call(owner,f"public.execution_get('run','{run['id']}')")["output"]==output
    must_fail(other,f"PERFORM public.execution_get('run','{run['id']}')","P0002")
    # Interrupción conserva parciales; aprobación vencida no genera un run.
    expired=approve(updated)
    sql(f"UPDATE capacita_execution.workflow_approvals SET expires_at=now()-interval '1 second' WHERE id='{expired['id']}';")
    must_fail(owner,f"PERFORM public.execution_workflow_enqueue('{identity}','{expired['id']}','expired')","P0001")
    recovering=approve(updated)
    pending=call(owner,f"public.execution_workflow_enqueue('{identity}','{recovering['id']}','recover-wf')")
    call(worker,f"public.execution_claim('{session}',2)")
    partial={"steps":[{"id":"uno","status":"completed","output":{"resultado":"parcial"}},
                      {"id":"dos","status":"running"}]}
    call(worker,f"public.execution_progress('{session}','{pending['id']}',{literal(partial)})")
    # Simula nueva reserva; no se altera reloj/configuración de Supabase real.
    successor=str(uuid4())
    sql(f"UPDATE capacita_execution.jobs SET worker_session='{successor}' WHERE id='{pending['id']}';")
    call(worker,f"public.execution_recover('{session}')")
    recovered=call(owner,f"public.execution_get('run','{pending['id']}')")
    assert recovered["status"]=='interrupted'
    assert recovered["report"]["steps"][0]["output"]=={"resultado":"parcial"}
    assert recovered["report"]["steps"][1]["status"]=='interrupted'
    failed_approval=approve(updated)
    failed=call(owner,f"public.execution_workflow_enqueue('{identity}','{failed_approval['id']}','failure-wf')")
    call(worker,f"public.execution_claim('{session}',2)")
    call(worker,f"public.execution_progress('{session}','{failed['id']}',{literal(partial)})")
    call(worker,f"public.execution_finish('{session}','{failed['id']}','failed',{literal({'error':'sandbox_unavailable'})})")
    failed_report=call(owner,f"public.execution_get('run','{failed['id']}')")["report"]
    assert failed_report["steps"][0]["status"]=='completed' and failed_report["steps"][1]["status"]=='failed'
    call(owner,f"public.execution_workflow_archive('{identity}')")
    must_fail(owner,f"PERFORM public.execution_workflow_get('{identity}')","P0002")
    assert call(owner,f"public.execution_get('run','{run['id']}')")["status"]=='completed'
    print('PASS: workflows privados, revisiones, aprobaciones, protocolo worker, dos pasos, parámetros, parciales y archivo.',flush=True)
