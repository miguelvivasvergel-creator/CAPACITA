"""Prueba real local B2 con candidatos de fixture públicos; sin IA ni Supabase.

Solo el worker invoca gVisor. Nada de proposal.source se ejecuta en este proceso.
Ejecutar desde raíz con .venv/Scripts/python.exe scripts/maintenance/verify_laboratory.py
"""
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from repositories.builds import BuildRepository
from schemas.builds import LaboratoryCase
from schemas.candidates import PythonSourceProposal
from schemas.definitions import CapabilityDefinition
from services.build_worker import invoke_runner, process_one, worker_lock
from services.candidate_preparation import prepare_candidate
from tests.fixtures.definitions import definition

NORMAL = "def run(inputs, parameters):\n    return {'resultado': inputs['texto'].strip()}\n"
ISOLATION = '''def run(inputs, parameters):
    import os, socket
    from pathlib import Path
    assert os.getuid() == 65534
    assert not any(key in os.environ for key in ('CAPACITA_TEST_SECRET','SUPABASE_KEY','GEMINI_API_KEY'))
    assert not Path('/mnt/c').exists() and not Path('/var/run/docker.sock').exists()
    assert not Path('/tmp/laboratory-marker').exists()
    Path('/tmp/laboratory-marker').write_text('public-marker')
    try:
        Path('/blocked').write_text('blocked')
    except OSError:
        pass
    else:
        raise RuntimeError('root_writable')
    with socket.socket() as connection:
        connection.settimeout(0.3)
        try:
            connection.connect(('1.1.1.1',443))
        except OSError:
            pass
        else:
            raise RuntimeError('network_accessible')
    return {'resultado': inputs['texto'].strip()}
'''
PROCESSES = '''def run(inputs, parameters):
    import errno, os, signal
    children = []
    blocked = False
    try:
        for index in range(16):
            try:
                child = os.fork()
                if child == 0:
                    signal.pause()
                    os._exit(0)
                children.append(child)
            except OSError as error:
                assert error.errno == errno.EAGAIN
                blocked = True
                break
    finally:
        for child in children:
            os.kill(child, signal.SIGTERM)
        for child in children:
            os.waitpid(child, 0)
    assert blocked and len(children) <= 7
    return {'resultado': inputs['texto'].strip()}
'''


def main():
    target = ROOT / "output/laboratory"
    target.mkdir(parents=True, exist_ok=True)
    report = {"started_at": datetime.now(timezone.utc).isoformat(), "scope": "public_fixture_candidates_real_gvisor",
              "tests": [], "remote_authenticated_flow_verified": False}
    owner = str(uuid4())
    positive = [LaboratoryCase(name=f"trim-{index}", inputs={"texto": text}, parameters={}, expected_output={"resultado": expected})
                for index, (text, expected) in enumerate((
                    ("  Árbol  azul  ", "Árbol  azul"), ("   ", ""), ("", ""),
                    ("sin cambios", "sin cambios"), ("\tHola\n", "Hola")))]
    negative = [LaboratoryCase(name=f"invalid-{index}", inputs=inputs, parameters=params, expect_rejection=True)
                for index, (inputs, params) in enumerate((({}, {}), ({"texto": 7}, {}),
                    ({"texto": "Hola", "extra": True}, {}), ({"texto": "Hola"}, {"extra": True}), ([], {}), ({"texto": "Hola"}, None)))]
    fixtures = [
        ("transform_and_contract_rejection", NORMAL, positive + negative, "passed", "matched"),
        ("isolation_first", ISOLATION, positive[:1], "passed", "matched"),
        ("fresh_temporary", ISOLATION, positive[:1], "passed", "matched"),
        ("process_limit", PROCESSES, positive[:1], "passed", "matched"),
        ("infinite_loop", "def run(inputs, parameters):\n    while True: pass\n", positive[:1], "failed", "timeout"),
        ("memory_limit", "def run(inputs, parameters):\n    items=[]\n    while True: items.append(bytearray(8*1024*1024))\n", positive[:1], "failed", "memory_limit"),
        ("output_limit", "def run(inputs, parameters):\n    import os\n    while True: os.write(1,b'x'*8192)\n", positive[:1], "failed", "output_limit"),
        ("candidate_exception", "def run(inputs, parameters):\n    raise RuntimeError('private-canary')\n", positive[:1], "failed", "candidate_error"),
        ("non_json_object", "def run(inputs, parameters):\n    return {'resultado': object()}\n", positive[:1], "failed", "candidate_error"),
        ("non_json_output", "def run(inputs, parameters):\n    print('not-json')\n    return {'resultado': inputs['texto'].strip()}\n", positive[:1], "failed", "invalid_json_output"),
        ("wrong_output_contract", "def run(inputs, parameters):\n    return {'resultado': 7}\n", positive[:1], "failed", "output_mismatch"),
        ("wrong_value", "def run(inputs, parameters):\n    return {'resultado': 'incorrecto'}\n", positive[:1], "failed", "output_mismatch"),
    ]
    try:
        with TemporaryDirectory(dir=target) as directory:
            storage = BuildRepository(Path(directory) / "verify.sqlite3")
            with worker_lock(storage.path):
                assert invoke_runner(recover=True)["recovery_verified"]
                for name, source, cases, expected_status, expected_reason in fixtures:
                    candidate = prepare_candidate(uuid4(), CapabilityDefinition(**definition()), PythonSourceProposal(source=source))
                    queued = storage.enqueue(owner, candidate, cases, name, candidate.artifact_hash)
                    assert process_one(storage)
                    # Reabrir comprueba persistencia después de cada candidato.
                    result = BuildRepository(storage.path).get(owner, queued["id"])
                    actual = result["report"]
                    passed = (result["status"] == expected_status
                              and actual.get("cases", [{}])[0].get("reason") == expected_reason
                              and all(case.get("cleanup_verified") for case in actual.get("cases", []) if case.get("executed")))
                    if name == "transform_and_contract_rejection":
                        passed = passed and len(actual["cases"]) == 11 and sum(case["executed"] for case in actual["cases"]) == 5
                    report["tests"].append({"name": name, "passed": bool(passed), "status": result["status"], "report": actual})
                    print(f"{'PASS' if passed else 'FAIL'} {name}", flush=True)
                    if actual.get("error") or any(not case.get("cleanup_verified") for case in actual.get("cases", []) if case.get("executed")):
                        raise RuntimeError("infrastructure_unverified")
                assert invoke_runner(recover=True)["recovery_verified"]
    except Exception as error:
        report["tests"].append({"name": "infrastructure", "passed": False, "error_type": type(error).__name__})
    report["passed"] = len(report["tests"]) == len(fixtures) and all(test["passed"] for test in report["tests"])
    (target / "block2-latest.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Reporte local: output/laboratory/block2-latest.json", flush=True)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
