"""Ejecución secuencial de DAG: un invitado nuevo por paso y datos privados."""
import json

from services.contract_validation import DATA_BYTES
from services.workflow_validation import bounded_json, compile_workflow


ESCRIBEN = {"redactar_texto", "tarea_texto", "resumir_texto", "traducir_texto", "componer_texto"}
MOTIVOS = {"connector_provider_unavailable": "el servicio no respondió", "connector_provider_busy": "el servicio estaba ocupado",
           "connector_not_found": "no encontró resultados", "connector_input": "no reconoció el dato pedido",
           "input_contract": "el dato pedido no tenía el formato esperado",
           "connector_invalid_response": "el servicio respondió algo inesperado"}


def llega_a_otra_persona(inicio, definition):
    """¿Lo que sale de estos pasos termina, directo o tras otros pasos, en un envío con destinatario
    elegido (el correo «para»: entradas solo_persona)? Un texto con «dato no disponible» puede llegar al
    Telegram, al Drive o al correo de la propia persona, pero nunca a clientes o terceros sin que ella
    lo vea antes: la aprobación es del plan, no de ese texto."""
    from connectors import BY_VERSION

    pendientes, vistos = list(inicio), set()
    while pendientes:
        actual = pendientes.pop()
        if actual in vistos:
            continue
        vistos.add(actual)
        nodo = next((n for n in definition.nodes if n.id == actual), None)
        if nodo is not None and getattr(BY_VERSION.get(str(nodo.version_id)), "solo_persona", ()):
            return True
        pendientes.extend(n.id for n in definition.nodes
                          if any(b.source == actual for b in n.bindings.values()))
    return False


def salida_suplente(identity, version_id, error, definition):
    """Si falla una CONSULTA de datos (sin credenciales: clima, lugares, festivos…) y todo lo que usa su
    resultado es una IA que escribe, la solución sigue con «dato no disponible» y la IA lo menciona en
    una frase (antes: una caída de OpenStreetMap cancelaba el itinerario entero). Nunca con envíos,
    guardados, la IA misma ni herramientas propias: ahí un dato faltante sí debe detener todo.
    Devuelve la salida suplente o None."""
    from connectors import BY_VERSION

    conector = BY_VERSION.get(version_id)
    if conector is None or conector.credential or conector.sends_content:
        return None
    usos = [(node, campo, binding) for node in definition.nodes for campo, binding in node.bindings.items()
            if binding.source == identity]
    if not usos or any(getattr(BY_VERSION.get(str(node.version_id)), "key", None) not in ESCRIBEN for node, _, _ in usos):
        return None
    if any(binding.source == identity for binding in definition.outputs.values()):
        return None
    if llega_a_otra_persona({node.id for node, _, _ in usos}, definition):
        return None
    aviso = f"(Dato no disponible: {MOTIVOS.get(error, 'la consulta falló')}. Menciónalo en una frase sin inventarlo.)"
    salida = {}
    for node, campo, binding in usos:
        # Lo que recibe la IA: un texto (o un dato sin tipo) lleva el aviso para que lo mencione.
        destino = BY_VERSION[str(node.version_id)].definition["input_schema"].get("properties", {}).get(campo, {})
        if destino.get("type") not in ("string", None):
            return None
        salida[binding.field] = aviso
    return salida


def es_condicion(version_id):
    from connectors import BY_VERSION
    return getattr(BY_VERSION.get(str(version_id)), "key", None) == "revisar_condicion"


def dependientes(identity, definition):
    """Todos los pasos que usan, directa o indirectamente, la salida de `identity`."""
    alcanzados, pendientes = set(), [identity]
    while pendientes:
        actual = pendientes.pop()
        for node in definition.nodes:
            if node.id not in alcanzados and any(b.source == actual for b in node.bindings.values()):
                alcanzados.add(node.id)
                pendientes.append(node.id)
    return alcanzados


def summary(output):
    """El reporte (64 KiB) muestra los archivos como tamaño; el contenido viaja solo entre pasos."""
    return {key: f"📎 archivo ({len(value) * 3 // 4 // 1024} KB)" if isinstance(value, str) and len(value) > 2000 else value
            for key, value in output.items()}


def execute_workflow(job, runner, progress=None):
    from services.execution_engine import ExecutionInfrastructureError, execute_job

    payload = job["payload"]
    if job["artifact_hash"] != payload["workflow_hash"] or job["workflow_revision"] != payload["revision"]:
        raise ValueError("workflow_snapshot_mismatch")
    definition, order = compile_workflow(payload["definition"], payload["versions"], payload["inputs"])
    nodes = {node.id: node for node in definition.nodes}
    outputs = {"$input": payload["inputs"]}
    steps = [{"id": identity, "label": nodes[identity].label, "version_id": str(nodes[identity].version_id),
              "status": "pending"} for identity in order]
    report = {"workflow_hash": job["artifact_hash"], "revision": payload["revision"], "steps": steps}
    output_bytes = 0

    def checkpoint():
        bounded_json(report, 60000)
        if progress:
            try:
                progress(report)
            except Exception:
                raise ExecutionInfrastructureError("workflow_checkpoint_failed") from None

    omitidos = set()
    for index, identity in enumerate(order):
        node, step = nodes[identity], steps[index]
        if identity in omitidos:
            # Depende de una condición que no se cumplió («avísame si…»): no se ejecuta ni envía nada.
            step.update(status="skipped", omitido=True)
            checkpoint()
            continue
        version = payload["versions"][str(node.version_id)]
        manifest = version["manifest"]
        inputs = dict(node.values)
        inputs.update({field: outputs[binding.source][binding.field] for field, binding in node.bindings.items()})
        step["status"] = "running"
        step["artifact_hash"] = version["artifact_hash"]
        checkpoint()
        # Los conectores no tienen candidato: su identidad es el artifact_hash del registro.
        # context: lo pone el trabajador (p. ej. el chat de Telegram del dueño); solo lo leen conectores.
        subjob = {"kind": "run", "candidate_id": manifest.get("candidate_id"), "context": job.get("context"),
                  "artifact_hash": version["artifact_hash"],
                  "payload": {"manifest": manifest, "inputs": inputs, "parameters": node.parameters,
                              "profile": version["profile"]}}
        try:
            status, details, output = execute_job(subjob, runner)
        except ExecutionInfrastructureError:
            step.update(status="failed", error="sandbox_unavailable")
            for later in steps[index + 1:]:
                later["status"] = "skipped"
            checkpoint()
            raise
        step.update({key: details[key] for key in ("elapsed_seconds", "cleanup_verified") if key in details})
        if status == "completed":
            output_bytes += len(json.dumps(output, ensure_ascii=False, allow_nan=False).encode())
            if output_bytes > 2 * DATA_BYTES:
                status, details = "failed", {"error": "intermediate_output_limit"}
        if status != "completed":
            step.update(status="failed", error=details.get("error", "step_failed"))
            if details.get("detail"):
                step["detail"] = details["detail"]  # qué dato revisar (código fijo, nunca el valor)
            suplente = salida_suplente(identity, str(node.version_id), step["error"], definition)
            if suplente is not None:
                # Sigue sin ese dato: el paso queda marcado y el aviso va en el reporte.
                step["sin_dato"] = True
                report.setdefault("avisos", []).append(identity)
                outputs[identity] = suplente
                checkpoint()
                continue
            for later in steps[index + 1:]:
                later["status"] = "skipped"
            checkpoint()
            return "failed", report | {"error": "workflow_step_failed", "failed_step": identity}, None
        step.update(status="completed", output=summary(output))
        outputs[identity] = output
        if es_condicion(node.version_id) and output.get("cumple") is False:
            omitidos |= dependientes(identity, definition)
            report["condicion"] = {"paso": identity, "cumple": False, "motivo": str(output.get("motivo") or "")[:300]}
        checkpoint()
    # Lo que salía de pasos omitidos lleva el motivo (la solución terminó bien, solo que «sin novedades»).
    motivo = (report.get("condicion") or {}).get("motivo", "")
    result = {field: (outputs[binding.source][binding.field] if binding.source not in omitidos
                      else f"Sin novedades: no se cumplió la condición. {motivo}".strip())
              for field, binding in definition.outputs.items()}
    bounded_json(result, DATA_BYTES)
    return "completed", report, result
