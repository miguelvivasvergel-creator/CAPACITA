"""Aceptación B4 real sobre fixture privada propia; sin IA ni credenciales aquí."""
import asyncio
from copy import deepcopy
import time
from uuid import uuid4


async def verify_workflow_remote(call, wait_run, version, recover, report, stop_worker, once, restart_api):
    schema={"type":"object","properties":{"texto":{"type":"string"}},"required":["texto"],"additionalProperties":False}
    definition={"format_version":1,"name":"[PRUEBA B4] dos pasos privados","description":"Fixture de aceptación sin IA",
        "input_schema":schema,"nodes":[
            {"id":"limpiar","label":"Limpiar","version_id":version['id'],"parameters":{},"values":{},
             "bindings":{"texto":{"source":"$input","field":"texto"}},"x":300,"y":0},
            {"id":"mayusculas","label":"Mayúsculas","version_id":version['id'],"parameters":{"mayusculas":True},"values":{},
             "bindings":{"texto":{"source":"limpiar","field":"resultado"}},"x":600,"y":0}],
        "outputs":{"final":{"source":"mayusculas","field":"resultado"}}}
    invalid=deepcopy(definition)
    invalid['nodes'][0]['bindings']['texto']={'source':'mayusculas','field':'resultado'}
    await call('POST','/api/workflows/validate',invalid,status=422)
    saved=await call('POST','/api/workflows',{'definition':definition},status=201)
    identity=saved['id']; report['workflow_id']=identity
    reread=await call('GET',f'/api/workflows/{identity}')
    assert reread['definition']==saved['definition']

    async def approve(row,inputs):
        return await call('POST',f'/api/workflows/{identity}/approvals',{
            'revision':row['revision'],'definition_hash':row['definition_hash'],'inputs':inputs},status=201)

    original_approval=await approve(saved,{'texto':'  Árbol azul  '})
    definition['description']='Edición para verificar invalidación de aprobación'
    updated=await call('PUT',f'/api/workflows/{identity}',{'definition':definition,'expected_revision':saved['revision']})
    assert updated['revision']==saved['revision']+1
    await call('POST',f'/api/workflows/{identity}/runs',{'approval_id':original_approval['id']},key=str(uuid4()),status=409)
    current=await approve(updated,{'texto':'  Árbol azul  '})
    key=str(uuid4())
    run=await call('POST',f'/api/workflows/{identity}/runs',{'approval_id':current['id']},key=key,status=202)
    completed=await wait_run(run['id'],{'completed'})
    assert completed['output']=={'final':'ÁRBOL AZUL'}
    assert completed['report']['steps'][0]['output']=={'resultado':'Árbol azul'}
    assert all(step['status']=='completed' for step in completed['report']['steps'])
    repeated=await call('POST',f'/api/workflows/{identity}/runs',{'approval_id':current['id']},key=key,status=202)
    assert repeated['id']==run['id']
    await call('POST',f'/api/workflows/{identity}/runs',{'approval_id':current['id']},key=str(uuid4()),status=409)
    await restart_api()
    assert (await call('GET',f'/api/runs/{run["id"]}'))==completed
    report.update(workflow_run_id=run['id'],workflow_two_real_steps=True,workflow_nondefault_parameter=True,
        workflow_approval_invalidated_409=True,workflow_cycle_rejected_422=True,
        workflow_restart_persistence=True,workflow_idempotency=True)
    print('PASS: workflow real de dos pasos, parámetro no predeterminado, revisión/aprobación e historial persistente.',flush=True)

    if recover:
        definition['nodes'][1]['parameters']['delay']=True
        recovering=await call('PUT',f'/api/workflows/{identity}',{'definition':definition,'expected_revision':updated['revision']})
        approval=await approve(recovering,{'texto':'  parcial  '})
        interrupted=await call('POST',f'/api/workflows/{identity}/runs',{'approval_id':approval['id']},key=str(uuid4()),status=202)
        report['workflow_interrupted_run_id']=interrupted['id']
        deadline=time.monotonic()+90
        while time.monotonic()<deadline:
            row=await call('GET',f'/api/runs/{interrupted["id"]}')
            steps=row.get('report',{}).get('steps',[]) if row.get('report') else []
            if len(steps)==2 and steps[0]['status']=='completed' and steps[1]['status']=='running':break
            if row['status'] in {'completed','failed','interrupted'}:raise RuntimeError('workflow_recovery_window_missed')
            await asyncio.sleep(0.3)
        else:raise RuntimeError('workflow_progress_timeout')
        stop_worker()
        assert (await call('GET',f'/api/runs/{interrupted["id"]}'))['status']=='running'
        print('Worker terminado durante segundo paso; esperando vencimiento real de reserva...',flush=True)
        for _ in range(13):await asyncio.sleep(5)
        await once()
        recovered=await call('GET',f'/api/runs/{interrupted["id"]}')
        assert recovered['status']=='interrupted' and recovered['output'] is None
        assert recovered['report']['steps'][0]['output']=={'resultado':'parcial'}
        assert recovered['report']['steps'][1]['status']=='interrupted'
        fresh_approval=await approve(recovering,{'texto':'  despues  '})
        fresh=await call('POST',f'/api/workflows/{identity}/runs',{'approval_id':fresh_approval['id']},key=str(uuid4()),status=202)
        await once()
        fresh_result=await call('GET',f'/api/runs/{fresh["id"]}')
        assert fresh_result['status']=='completed' and fresh_result['output']=={'final':'DESPUES'}
        report.update(workflow_abrupt_recovery=True,workflow_partial_preserved=True,workflow_new_run_after_recovery=fresh['id'])
        print('PASS: caída en segundo paso, parcial conservado, recuperación interrupted y workflow nuevo completado.',flush=True)

    await call('DELETE',f'/api/workflows/{identity}')
    await call('GET',f'/api/workflows/{identity}',status=404)
    assert (await call('GET',f'/api/runs/{run["id"]}'))==completed
    report['workflow_archive_preserves_history']=True
