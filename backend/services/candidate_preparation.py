"""Prepara datos de un candidato sin importar, compilar ni ejecutar su código."""
import ast
import hashlib
import json
import sys
from uuid import UUID, uuid4

from fastapi import HTTPException

from schemas.candidates import CandidateManifest, PythonSourceProposal
from schemas.definitions import CapabilityDefinition
from services.contract_validation import validate_definition

# Lo que existe en la imagen del sandbox (perfil toolbox): biblioteca estándar de
# Python 3.12 + scripts/sandbox/Dockerfile.toolbox. Falla rápido sin gastar sandbox.
TOOLBOX_MODULES = frozenset({"pypdf", "docx", "openpyxl", "reportlab", "PIL"})
AVAILABLE_MODULES = frozenset(sys.stdlib_module_names) | TOOLBOX_MODULES


def unavailable_imports(tree):
    missing = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            missing.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            missing.add("." if node.level else (node.module or "").split(".")[0])
    return sorted(name for name in missing if name not in AVAILABLE_MODULES)


def prepare_candidate(
    capability_id: UUID,
    definition: CapabilityDefinition,
    proposal: PythonSourceProposal,
) -> CandidateManifest:
    definition_hash = validate_definition(definition)
    source = proposal.source
    if len(source.encode("utf-8")) > 65536:
        raise HTTPException(422, "El código supera el límite de 64 KiB")
    try:
        tree = ast.parse(source, filename="main.py")
    except (SyntaxError, ValueError, RecursionError, MemoryError):
        raise HTTPException(422, "El candidato no contiene sintaxis Python válida") from None
    missing = unavailable_imports(tree)
    if missing:
        raise HTTPException(422, f"El candidato importa módulos no disponibles en el entorno aislado: {', '.join(missing)[:200]}")
    functions = [node for node in tree.body if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == "run"]
    if len(functions) != 1:
        raise HTTPException(422, "Se requiere una única función principal run(inputs, parameters)")
    function = functions[0]
    args = function.args
    if (
        isinstance(function, ast.AsyncFunctionDef) or function.decorator_list
        or args.posonlyargs or args.kwonlyargs or args.vararg or args.kwarg
        or args.defaults or args.kw_defaults
        or [arg.arg for arg in args.args] != ["inputs", "parameters"]
    ):
        raise HTTPException(422, "La firma debe ser run(inputs, parameters), síncrona y sin decoradores ni valores por defecto")
    # El hash incluye contratos, restricciones, ejemplos y código exacto UTF-8.
    # No incluye ids: permite comprobar el contenido de forma independiente en B.
    artifact = {
        "format_version": 1, "runtime": "python", "entrypoint": "main.run",
        "definition": definition.model_dump(mode="json"),
        "proposal": proposal.model_dump(mode="json"),
    }
    encoded = json.dumps(artifact, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return CandidateManifest(
        candidate_id=uuid4(), capability_id=capability_id,
        definition_hash=definition_hash, artifact_hash=hashlib.sha256(encoded).hexdigest(),
        definition=definition, proposal=proposal,
    )
