"""Pruebas B6 exclusivamente en PostgreSQL temporal, identidades sinteticas."""
import json
from uuid import uuid4
from services.execution_engine import execute_job


def check_publications(sql, as_user, must_fail, owner, other, worker, session, version, sandbox):
    def rpc(user, expression):
        return json.loads(as_user(user, 'SELECT ' + expression + ';'))

    identity = version['id']
    sql('ALTER POLICY catalog_own ON public.capabilities USING(owner_id=auth.uid() OR visibility=\'public\');')
    must_fail(other, f"PERFORM public.execution_publish('{identity}','MIT',true)", 'P0002')
    must_fail(owner, f"PERFORM public.execution_publish('{identity}','MIT',false)", '22023')
    published = rpc(owner, f"public.execution_publish('{identity}','MIT',true)")
    publication = published['publication_id']
    again = rpc(owner, f"public.execution_publish('{identity}','MIT',true)")
    assert again['publication_id'] == publication
    page = rpc(other, f"public.execution_publication_versions('{identity}')")
    assert len(page['items']) == 1
    raw = json.dumps(page)
    assert not any('"' + key + '"' in raw for key in ('manifest', 'source', 'candidate_id', 'build_id', 'examples'))
    must_fail(other, f"PERFORM public.execution_withdraw('{publication}')", 'P0002')
    request = "'" + publication + "','public-one','{\"texto\":\"  Árbol  \"}','{}'"
    job = rpc(other, 'public.execution_public_enqueue(' + request + ')')
    assert rpc(other, 'public.execution_public_enqueue(' + request + ')')['id'] == job['id']
    must_fail(other, f"PERFORM public.execution_public_enqueue('{publication}','public-one','{{}}','{{}}')", 'P0001')
    must_fail(owner, f"PERFORM public.execution_get('run','{job['id']}')", 'P0002')
    claimed = rpc(worker, f"public.execution_claim('{session}',2)")['job']
    assert claimed['id'] == job['id'] and claimed['payload']['manifest']
    status, report, output = 'completed', {'profile': 'fixture-no-execution'}, {'resultado': 'Árbol'}
    if sandbox:
        status, report, output = execute_job(claimed)
        assert status == 'completed' and output == {'resultado': 'Árbol'}
    rpc(worker, f"public.execution_finish('{session}','{job['id']}','{status}',$j${json.dumps(report)}$j$,$j${json.dumps(output)}$j$)")
    assert rpc(other, f"public.execution_get('run','{job['id']}')")['output'] == output
    definition = claimed['payload']['manifest']['definition']
    spec = {'format_version': 1, 'name': 'Proceso con herramienta publicada', 'description': '',
        'input_schema': definition['input_schema'], 'nodes': [
            {'id': 'uno', 'label': 'Limpiar', 'version_id': identity, 'parameters': {}, 'values': {},
             'bindings': {'texto': {'source': '$input', 'field': 'texto'}}, 'x': 300, 'y': 0}],
        'outputs': {'resultado': {'source': 'uno', 'field': 'resultado'}}}
    workflow = rpc(other, f"public.execution_workflow_save(NULL,NULL,$j${json.dumps(spec)}$j$)")
    approve = lambda: rpc(other, f"public.execution_workflow_approve('{workflow['id']}',{workflow['revision']},'{workflow['definition_hash']}','{{\"texto\":\"  Árbol  \"}}')")
    approval = approve()
    assert 'manifest' not in json.dumps(approval)
    process = rpc(other, f"public.execution_workflow_enqueue('{workflow['id']}','{approval['id']}','shared-workflow')")
    process_job = rpc(worker, f"public.execution_claim('{session}',2)")['job']
    assert process_job['id'] == process['id']
    process_report = {'steps': [{'id': 'uno', 'status': 'completed', 'output': output}]}
    if sandbox:
        process_status, process_report, process_output = execute_job(process_job)
        assert process_status == 'completed' and process_output == output
    rpc(worker, f"public.execution_finish('{session}','{process['id']}','completed',$j${json.dumps(process_report)}$j$,$j${json.dumps(output)}$j$)")
    stale = approve()
    queued_approval = approve()
    queued_process = rpc(other, f"public.execution_workflow_enqueue('{workflow['id']}','{queued_approval['id']}','withdraw-workflow')")
    queued = rpc(other, f"public.execution_public_enqueue('{publication}','before-withdraw','{{\"texto\":\"a\"}}','{{}}')")
    rpc(owner, f"public.execution_withdraw('{publication}')")
    assert rpc(other, f"public.execution_publication_versions('{identity}')")['items'] == []
    must_fail(other, f"PERFORM public.execution_public_enqueue('{publication}','after-withdraw','{{}}','{{}}')", 'P0002')
    assert rpc(worker, f"public.execution_claim('{session}',2)")['job'] is None
    assert rpc(worker, f"public.execution_claim('{session}',2)")['job'] is None
    assert rpc(other, f"public.execution_get('run','{queued_process['id']}')")['status'] == 'failed'
    failed = rpc(other, f"public.execution_get('run','{queued['id']}')")
    assert failed['status'] == 'failed' and failed['report']['error'] == 'publication_unavailable'
    assert rpc(other, f"public.execution_get('run','{job['id']}')")['output'] == output
    # Republicar crea otra autorización: no resucita una solicitud retirada.
    second = rpc(owner, f"public.execution_publish('{identity}','MIT',true)")
    assert second['publication_id'] != publication
    must_fail(other, f"PERFORM public.execution_workflow_enqueue('{workflow['id']}','{stale['id']}','stale-shared-approval')", 'P0001')
    rpc(owner, f"public.execution_withdraw('{second['publication_id']}')")
    rpc(other, f"public.execution_workflow_archive('{workflow['id']}')")
    must_fail(other, f"PERFORM public.execution_claim_private_v2('{session}',2)", '42501')
    print('PASS B6: publicar/retiro, consentimiento, descriptor sin codigo, uso ajeno, privacidad, idempotencia y retirada antes de claim.')
