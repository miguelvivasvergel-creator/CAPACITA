"""Valida en host; el source solo lo recibe el controlador gVisor."""
import json

from jsonschema import Draft202012Validator

from services.build_validation import validate_manifest
from services.contract_validation import DATA_BYTES
from services.build_worker import execute_build, invoke_runner
from connectors.base import PROFILE as CONNECTOR_PROFILE

# Copia de sandbox_runner.IMAGES (ese módulo solo importa en Linux); un test exige igualdad.
IMAGES = {
    "gvisor-python-stdlib-v1": "python@sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b",
    "gvisor-python-toolbox-v1": "sha256:b114eaf63095892781835ee9ee6eedd20d5d3bc6f47e80a380c944c4d7e4bf65",
    "gvisor-python-toolbox-v2": "sha256:056d17e5ca36a529c78ebf8896779f245c43e6fb314bd8a14ef2367653589d83",
}
# Perfil con que se prueban las herramientas nuevas; cada versión se ejecuta con el
# perfil de su prueba (las antiguas siguen en stdlib o toolbox-v1).
PROFILE = "gvisor-python-toolbox-v2"
IMAGE = IMAGES[PROFILE]
# Copia de sandbox_runner.PROFILE_LIMITS; el mismo test exige igualdad.
PROFILE_LIMITS = {
    "gvisor-python-stdlib-v1": {"timeout_seconds": 12, "output_bytes": 65536, "memory_bytes": 268435456,
                                "cpus": 0.5, "guest_processes": 8, "host_tasks": 64,
                                "temporary_bytes": 16777216, "network": "none", "uid": 65534},
    # Documentos e imágenes: importar lxml/reportlab/Pillow bajo gVisor necesita más margen.
    "gvisor-python-toolbox-v1": {"timeout_seconds": 30, "output_bytes": 4194304, "memory_bytes": 536870912,
                                 "cpus": 1.0, "guest_processes": 8, "host_tasks": 64,
                                 "temporary_bytes": 16777216, "network": "none", "uid": 65534},
    "gvisor-python-toolbox-v2": {"timeout_seconds": 60, "output_bytes": 4194304, "memory_bytes": 1073741824,
                                 "cpus": 1.0, "guest_processes": 8, "host_tasks": 64,
                                 "temporary_bytes": 16777216, "network": "none", "uid": 65534},
}
LIMITS = PROFILE_LIMITS[PROFILE]


class ExecutionInfrastructureError(ValueError):
    """No iniciar otro invitado hasta recuperar el entorno."""


def require_profile(result, profile=PROFILE):
    if (result.get("runtime") != "runsc" or result.get("image") != IMAGES[profile]
            or result.get("limits") != PROFILE_LIMITS[profile] or not result.get("cleanup_verified")):
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
    if payload.get("profile") == CONNECTOR_PROFILE:
        # Conector revisado: lo ejecuta el broker del trabajador, nunca el sandbox.
        if job["kind"] != "run":
            raise ValueError("unsupported_execution")
        from services.connector_runtime import run_connector
        return run_connector(job)
    manifest = validate_manifest(payload["manifest"])
    if str(manifest.candidate_id) != job["candidate_id"] or manifest.artifact_hash != job["artifact_hash"]:
        raise ValueError("identity_mismatch")

    profile = PROFILE if job["kind"] == "build" else payload.get("profile")
    if profile not in IMAGES:
        raise ValueError("unsupported_execution")

    def checked_runner(request):
        try:
            result = runner(request | {"profile": profile})
        except Exception:
            raise ExecutionInfrastructureError("runner_unavailable") from None
        require_profile(result, profile)
        return result

    if job["kind"] == "build":
        status, report = execute_build(job, checked_runner)
        report["profile"] = PROFILE
        return status, report, None
    if job["kind"] != "run":
        raise ValueError("unsupported_execution")
    for schema, value in ((manifest.definition.input_schema, payload["inputs"]),
                          (manifest.definition.parameter_schema, payload["parameters"])):
        if not Draft202012Validator(schema).is_valid(value):
            return "failed", {"error": "input_contract"}, None
    result = checked_runner({"source": manifest.proposal.source, "inputs": payload["inputs"],
                             "parameters": payload["parameters"]})
    report = {"profile": profile, "artifact_hash": manifest.artifact_hash,
              **{key: result[key] for key in ("elapsed_seconds", "cleanup_verified", "exit_code") if key in result}}
    if result.get("oom_killed") or result.get("termination") != "exited" or result.get("exit_code") != 0:
        report["error"] = "memory_limit" if result.get("oom_killed") else (
            result["termination"] if result.get("termination") in {"timeout", "output_limit"} else "candidate_error")
        return "failed", report, None
    try:
        output = finite_json(result["output"])
        if (not isinstance(output, dict)
                or not Draft202012Validator(manifest.definition.output_schema).is_valid(output)
                or len(json.dumps(output, ensure_ascii=False, allow_nan=False).encode()) > DATA_BYTES):
            raise ValueError("invalid_output")
    except (KeyError, ValueError, TypeError, RecursionError):
        return "failed", report | {"error": "output_contract"}, None
    return "completed", report, output
