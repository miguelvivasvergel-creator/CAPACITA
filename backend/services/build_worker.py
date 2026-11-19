"""Trabajador local B. API y worker separados; un único trabajador por BD.

Uso desde raíz: .venv/Scripts/python.exe backend/services/build_worker.py --once
Desde Linux: PYTHONPATH=backend python -m services.build_worker --once
"""
import argparse
import base64
import binascii
import builtins
from contextlib import contextmanager
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
import zipfile

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jsonschema import Draft202012Validator

from repositories.builds import BuildRepository, DEFAULT_PATH
from schemas.builds import LaboratoryCase
from services.build_validation import accepts_input, validate_cases, validate_manifest


# Pistas para reparar sin guardar salida del invitado: solo nombres de excepciones
# estándar y nombres de campos esperados definidos por la persona.
STANDARD_ERRORS = frozenset(name for name, value in vars(builtins).items()
                            if isinstance(value, type) and issubclass(value, BaseException))


# Un archivo generado (PDF, imagen, Office) no es idéntico byte a byte entre ejecuciones:
# si el ejemplo espera "ARCHIVO", basta con que sea base64 válido del formato declarado.
FILE_EXPECTED = "ARCHIVO"
SIGNATURES = {"image/jpeg": bytes([0xFF, 0xD8, 0xFF]), "image/png": bytes([0x89]) + b"PNG", "application/pdf": b"%PDF"}
OFFICE_PARTS = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word/document.xml",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xl/workbook.xml",
}


def valid_file(value, media_type):
    if not isinstance(value, str) or not value:
        return False
    try:
        data = base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError):
        return False
    if media_type in SIGNATURES:
        return data.startswith(SIGNATURES[media_type])
    if media_type in OFFICE_PARTS:
        try:
            # Solo lee el índice del zip; no extrae ni interpreta contenido.
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                return OFFICE_PARTS[media_type] in archive.namelist()
        except (zipfile.BadZipFile, ValueError, OSError):
            return False
    return len(data) > 0


def comparable(actual, expected, output_schema):
    """Sustituye los archivos válidos por el marcador para comparar el resto exactamente."""
    if not isinstance(actual, dict) or not isinstance(expected, dict):
        return actual
    fields = output_schema.get("properties", {})
    result = dict(actual)
    for key, rule in fields.items():
        if (isinstance(rule, dict) and rule.get("contentEncoding") == "base64"
                and expected.get(key) == FILE_EXPECTED and key in result):
            result[key] = FILE_EXPECTED if valid_file(result[key], rule.get("contentMediaType")) else "archivo_invalido"
    return result


def error_type(output):
    for line in reversed((output or "").splitlines()[-20:]):
        name = line.split(":", 1)[0].strip()
        if name in STANDARD_ERRORS:
            return name
    return None


# Errores de NOMBRES de código (import o atributo inexistente): su mensaje solo trae
# identificadores ("cannot import name 'Drawing' from 'reportlab.platypus'"), no datos, y sin
# él la corrección automática no sabe qué nombre cambiar. Cualquier otro carácter lo descarta.
NAME_ERRORS = frozenset({"ImportError", "ModuleNotFoundError", "AttributeError"})
SAFE_DETAIL = re.compile(r"^[A-Za-z0-9_ .'\"]{1,160}$")


def error_detail(output):
    for line in reversed((output or "").splitlines()[-20:]):
        name, _, message = line.partition(":")
        if name.strip() in NAME_ERRORS:
            message = re.sub(r"\s*\([^)]*\)\s*$", "", message.strip())  # quita la ruta del archivo
            return message if SAFE_DETAIL.match(message) else None
    return None


def runner_command():
    runner = Path(__file__).with_name("sandbox_runner.py").resolve()
    if os.name == "nt":
        # Ruta del propio repositorio; nunca una ruta aportada por la petición.
        drive = runner.drive[0].lower()
        linux_path = f"/mnt/{drive}/" + "/".join(runner.parts[1:])
        return ["wsl.exe", "--distribution", "Ubuntu-24.04", "--user", "root",
                "--exec", "/usr/bin/python3", linux_path]
    return ["/usr/bin/python3", str(runner)]


def invoke_runner(payload=None, recover=False):
    command = runner_command() + (["--recover"] if recover else [])
    # No heredar .env/JWT/claves del proceso. WSL recibe solo stdin autorizado.
    environment = {key: os.environ[key] for key in (
        "SYSTEMROOT", "WINDIR", "PATH", "TEMP", "TMP", "LOCALAPPDATA"
    ) if key in os.environ}
    environment["WSLENV"] = ""
    with tempfile.TemporaryFile() as output, tempfile.TemporaryFile() as errors:
        result = subprocess.run(command, input=json.dumps(payload, ensure_ascii=False, allow_nan=False).encode()
                                if payload is not None else b"", stdout=output, stderr=errors,
                                env=environment, timeout=90)
        output.seek(0)
        raw = output.read(9437185)
        if len(raw) > 9437184:
            raise RuntimeError("runner_response_limit")
        response = json.loads(raw.decode("utf-8"))
        if result.returncode != 0:
            raise RuntimeError("runner_unavailable")
        return response


@contextmanager
def worker_lock(path):
    handle = open(str(path) + ".worker.lock", "a+b")
    try:
        if os.name == "nt":
            import msvcrt
            if handle.tell() == 0:
                handle.write(b"0")
                handle.flush()
            handle.seek(0)
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        handle.close()


def execute_build(job, runner=invoke_runner):
    payload = job["payload"]
    manifest = validate_manifest(payload["manifest"])
    if str(manifest.candidate_id) != job["candidate_id"] or manifest.artifact_hash != job["artifact_hash"]:
        raise ValueError("persisted_identity_mismatch")
    cases = [LaboratoryCase.model_validate(case) for case in payload["cases"]]
    validate_cases(manifest, cases)
    report = {"format_version": 1, "candidate_id": str(manifest.candidate_id),
              "artifact_hash": manifest.artifact_hash, "definition_hash": manifest.definition_hash,
              "test_origin": "owner_supplied", "cases": [], "implementation_enabled": False}
    for index, case in enumerate(cases):
        if not accepts_input(manifest, case):
            report["cases"].append({"index": index, "passed": case.expect_rejection,
                                    "executed": False, "reason": "input_rejected"})
            continue
        result = runner({"source": manifest.proposal.source, "inputs": case.inputs,
                         "parameters": case.parameters})
        reason = result["termination"]
        passed = False
        hints = {}
        if (reason == "exited" and result.get("exit_code") == 0
                and result.get("cleanup_verified") and not result.get("oom_killed")):
            try:
                def reject_constant(_):
                    raise ValueError("nonfinite_json")
                actual = json.loads(result["output"], parse_constant=reject_constant)
                # is_valid considera bool distinto de integer. Comparación JSON canónica
                # evita que True == 1 en Python convierta una salida incorrecta en éxito.
                canonical = lambda value: json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False)
                schema_valid = (isinstance(actual, dict)
                                and Draft202012Validator(manifest.definition.output_schema).is_valid(actual))
                actual = comparable(actual, case.expected_output, manifest.definition.output_schema)
                passed = schema_valid and canonical(actual) == canonical(case.expected_output)
                reason = "matched" if passed else "output_mismatch"
                if not passed:
                    received = actual if isinstance(actual, dict) else {}
                    hints = {"schema_valid": schema_valid, "mismatched_fields": sorted(
                        key for key in case.expected_output or {}
                        if key not in received or canonical(received[key]) != canonical(case.expected_output[key])
                    )[:20]}
            except (KeyError, ValueError, TypeError, RecursionError):
                reason = "invalid_json_output"
        if not result.get("cleanup_verified"):
            reason = "cleanup_unverified"
        elif result.get("oom_killed"):
            reason = "memory_limit"
        elif reason == "exited":
            reason = "candidate_error"
            if error_type(result.get("output")):
                hints = {"error_type": error_type(result.get("output"))}
                if error_detail(result.get("output")):
                    hints["error_detail"] = error_detail(result.get("output"))
        report["cases"].append({"index": index, "executed": True, "passed": passed,
                                "reason": reason, **hints, **{key: result[key] for key in (
                                    "exit_code", "elapsed_seconds", "output_bytes", "cleanup_verified"
                                ) if key in result}})
        report["environment"] = {key: result[key] for key in (
            "runtime", "image", "limits", "docker_server", "runsc_version"
        ) if key in result}
        # Fallos de infraestructura/limpieza impiden iniciar más invitados.
        if not result.get("cleanup_verified") or result["termination"] == "infrastructure_error":
            break
    success = len(report["cases"]) == len(cases) and all(case["passed"] for case in report["cases"])
    report["passed"] = success
    return "passed" if success else "failed", report


def process_one(storage, runner=invoke_runner):
    job = storage.claim()
    if job is None:
        return False
    try:
        status, report = execute_build(job, runner)
    except Exception:
        status, report = "failed", {"error": "laboratory_failure", "implementation_enabled": False}
    storage.finish(job["id"], status, report)
    print(f"Build {job['id']}: {status}", flush=True)
    return True


def main():
    parser = argparse.ArgumentParser(description="Trabajador local del laboratorio B")
    parser.add_argument("--once", action="store_true", help="Procesar como máximo una prueba")
    args = parser.parse_args()
    storage = BuildRepository(DEFAULT_PATH)
    try:
        with worker_lock(storage.path):
            # Si no hay acceso al sandbox, no consumir trabajos ni simular éxito.
            if invoke_runner(recover=True).get("recovery_verified") is not True:
                raise RuntimeError("recovery_unverified")
            storage.recover_interrupted()
            while True:
                processed = process_one(storage)
                if args.once:
                    return 0
                if not processed:
                    time.sleep(1)
    except KeyboardInterrupt:
        return 130
    except Exception:
        print("Trabajador no disponible: revisar lock y Ubuntu/Docker/runsc. No se inició otra tarea.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
