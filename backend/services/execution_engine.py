"""Valida en host; el source solo lo recibe el controlador gVisor."""
import json

from jsonschema import Draft202012Validator

from services.build_validation import validate_manifest
from services.build_worker import execute_build, invoke_runner

PROFILE = "gvisor-python-stdlib-v1"
IMAGE = "python@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b"
LIMITS = {"timeout_seconds": 12, "output_bytes": 65536, "memory_bytes": 268435456,
          "cpus": 0.5, "guest_processes": 8, "host_tasks": 64,
          "temporary_bytes": 16777216, "network": "none", "uid": 65534}


class ExecutionInfrastructureError(ValueError):
    """No iniciar otro invitado hasta recuperar el entorno."""


def require_profile(result):
    if (result.get("runtime") != "runsc" or result.get("image") != IMAGE
            or result.get("limits") != LIMITS or not result.get("cleanup_verified")):
        raise ExecutionInfrastructureError("unverified_runtime_profile")


def finite_json(raw):
    def reject(_):
        raise ValueError("nonfinite_json")
    return json.loads(raw, parse_constant=reject)


def execute_job(job, runner=invoke_runner, progress=None):
    payload = job["payload"]
    if payload.get("execution_type") == "workflow":
        from services.workflow_engine import execute_workflow
        return execute_workflow(job, runner, progress)
    manifest = validate_manifest(payload["manifest"])
    if str(manifest.candidate_id) != job["candidate_id"] or manifest.artifact_hash != job["artifact_hash"]:
        raise ValueError("identity_mismatch")

    def checked_runner(request):
        try:
            result = runner(request)
        except Exception:
            raise ExecutionInfrastructureError("runner_unavailable") from None
        require_profile(result)
        return result

    if job["kind"] == "build":
        status, report = execute_build(job, checked_runner)
        report["profile"] = PROFILE
        return status, report, None
    if job["kind"] != "run" or payload.get("profile") != PROFILE:
        raise ValueError("unsupported_execution")
    for schema, value in ((manifest.definition.input_schema, payload["inputs"]),
                          (manifest.definition.parameter_schema, payload["parameters"])):
        if not Draft202012Validator(schema).is_valid(value):
            return "failed", {"error": "input_contract"}, None
    result = checked_runner({"source": manifest.proposal.source, "inputs": payload["inputs"],
                             "parameters": payload["parameters"]})
    report = {"profile": PROFILE, "artifact_hash": manifest.artifact_hash,
              **{key: result[key] for key in ("elapsed_seconds", "cleanup_verified", "exit_code") if key in result}}
    if result.get("oom_killed") or result.get("termination") != "exited" or result.get("exit_code") != 0:
        report["error"] = "memory_limit" if result.get("oom_killed") else (
            result["termination"] if result.get("termination") in {"timeout", "output_limit"} else "candidate_error")
        return "failed", report, None
    try:
        output = finite_json(result["output"])
        if (not isinstance(output, dict)
                or not Draft202012Validator(manifest.definition.output_schema).is_valid(output)
                or len(json.dumps(output, ensure_ascii=False, allow_nan=False).encode()) > 65536):
            raise ValueError("invalid_output")
    except (KeyError, ValueError, TypeError, RecursionError):
        return "failed", report | {"error": "output_contract"}, None
    return "completed", report, output
