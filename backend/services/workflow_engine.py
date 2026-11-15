"""Ejecución secuencial de DAG: un invitado nuevo por paso y datos privados."""
import json

from services.workflow_validation import bounded_json, compile_workflow


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

    for index, identity in enumerate(order):
        node, step = nodes[identity], steps[index]
        version = payload["versions"][str(node.version_id)]
        manifest = version["manifest"]
        inputs = dict(node.values)
        inputs.update({field: outputs[binding.source][binding.field] for field, binding in node.bindings.items()})
        step["status"] = "running"
        step["artifact_hash"] = version["artifact_hash"]
        checkpoint()
        subjob = {"kind": "run", "candidate_id": manifest["candidate_id"],
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
            if output_bytes > 32768:
                status, details = "failed", {"error": "intermediate_output_limit"}
        if status != "completed":
            step.update(status="failed", error=details.get("error", "step_failed"))
            for later in steps[index + 1:]:
                later["status"] = "skipped"
            checkpoint()
            return "failed", report | {"error": "workflow_step_failed", "failed_step": identity}, None
        step.update(status="completed", output=output)
        outputs[identity] = output
        checkpoint()
    result = {field: outputs[binding.source][binding.field] for field, binding in definition.outputs.items()}
    bounded_json(result)
    return "completed", report, result
