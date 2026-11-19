"""Fábrica REAL sin tocar la cuenta: Gemini diseña y escribe, gVisor prueba y Gemini corrige (máx. 2).

Mismo camino que el chat (diseño -> código -> prueba con archivos de muestra -> correcciones),
pero sin Supabase: no guarda capacidades, candidatos ni versiones. Gasta 2-4 llamadas de Gemini
del modelo indicado y envía solo el objetivo escrito (usa datos ficticios). Requiere el sandbox
del trabajador libre (un trabajo a la vez). Desde la raíz:
  .venv/Scripts/python.exe scripts/maintenance/verify_factory_gemini_real.py gemini-3.1-flash-lite "Ponle un filtro vintage cálido a mi foto"
Resultados 18/11 en docs/PLAN_MIERCOLES_JUEVES.md."""
import asyncio
import base64
import json
from pathlib import Path
import sys
import time
from uuid import uuid4

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi import HTTPException  # noqa: E402
from core.config import settings  # noqa: E402
from providers.gemini import GeminiProvider  # noqa: E402
from schemas.objectives import ObjectiveRequest, draft_to_definition  # noqa: E402
from services.objective_service import quitar_librerias_instaladas  # noqa: E402
from services.contract_validation import validate_definition  # noqa: E402
from services.candidate_preparation import prepare_candidate  # noqa: E402
from services.execution_engine import execute_job  # noqa: E402

MUESTRAS = {"foto": "foto.jpg", "pdf": "documento.pdf", "word": "documento.docx", "excel": "hoja.xlsx"}
CORREGIBLES = {"output_mismatch", "candidate_error", "invalid_json_output", "timeout", "output_limit", "memory_limit"}


def con_muestras(valor):
    if isinstance(valor, str) and valor.startswith("MUESTRA:"):
        nombre = MUESTRAS.get(valor[8:].strip().lower(), MUESTRAS["foto"])
        return base64.b64encode((ROOT / "public" / "muestras" / nombre).read_bytes()).decode()
    if isinstance(valor, list):
        return [con_muestras(v) for v in valor]
    if isinstance(valor, dict):
        return {k: con_muestras(v) for k, v in valor.items()}
    return valor


def observacion(definition, report):
    partes = []
    for caso in report.get("cases", []):
        if caso.get("passed"):
            continue
        ej = definition.examples[caso["index"]].model_dump(mode="json")
        detalle = caso["reason"] + (f" ({caso['error_type']}{': ' + caso['error_detail'] if caso.get('error_detail') else ''})"
                                    if caso.get("error_type") else "")
        if caso["reason"] == "output_mismatch":
            detalle += "; la salida no cumple output_schema" if caso.get("schema_valid") is False else \
                f"; campos con valor distinto: {', '.join(caso.get('mismatched_fields') or []) or 'no identificados'}"
        partes.append(f"Ejemplo {caso['index'] + 1}: entradas {json.dumps(ej['inputs'], ensure_ascii=False)}, parámetros "
                      f"{json.dumps(ej['parameters'], ensure_ascii=False)}, salida esperada {json.dumps(ej['expected_output'], ensure_ascii=False)}. El código {detalle}.")
    extra = "MUESTRA:x en las entradas es un archivo real en base64; ARCHIVO en la salida exige base64 válido del contentMediaType. " \
        if "MUESTRA:" in json.dumps([e.model_dump(mode="json") for e in definition.examples]) else ""
    return f"Las pruebas en el entorno aislado fallaron. {' '.join(partes)} {extra}Corrige el código para cumplir los ejemplos y el contrato completo."[:1500]


def probar(manifest):
    cases = [{"name": f"Ejemplo {i + 1}", "inputs": con_muestras(e.inputs), "parameters": e.parameters or {},
              "expected_output": e.expected_output, "expect_rejection": False} for i, e in enumerate(manifest.definition.examples)]
    job = {"kind": "build", "candidate_id": str(manifest.candidate_id), "artifact_hash": manifest.artifact_hash,
           "payload": {"manifest": manifest.model_dump(mode="json"), "cases": cases}}
    return execute_job(job)[:2]


async def main(modelo, objetivo):
    provider = GeminiProvider(settings.model_copy(update={"GEMINI_MODEL": modelo}))
    log, llamadas, inicio = [], 0, time.monotonic()

    def paso(texto):
        log.append(f"{time.monotonic() - inicio:5.1f}s {texto}")
        print(log[-1], flush=True)
    try:
        llamadas += 1
        interp = await provider.interpret(ObjectiveRequest(objective=objetivo, consent_to_provider=True))
        if interp.decision != "define":
            paso(f"diseño: decision={interp.decision} {interp.explanation[:200]}")
            return {"modelo": modelo, "ok": False, "llamadas": llamadas, "log": log}
        draft = quitar_librerias_instaladas(interp.draft)
        definition = draft_to_definition(draft)
        validate_definition(definition)
        paso(f"diseño: «{definition.name}» recursos={definition.resources} permisos={definition.required_permissions}")
        paso(f"  entradas={list(definition.input_schema['properties'])} opciones={list(definition.parameter_schema.get('properties', {}))} "
             f"salida={list(definition.output_schema['properties'])} ejemplos={len(definition.examples)}")
        paso(f"  ejemplo1={json.dumps(definition.examples[0].model_dump(mode='json'), ensure_ascii=False)[:300]}")
        if definition.resources or definition.required_permissions:
            return {"modelo": modelo, "ok": False, "bloqueada": True, "llamadas": llamadas, "log": log}
        capability = uuid4()
        manifest = None
        for _ in range(2):
            llamadas += 1
            propuesta = await provider.generate(definition)
            try:
                manifest = prepare_candidate(capability, definition, propuesta)
                break
            except HTTPException as error:
                paso(f"código inválido ({error.detail}); pido otra versión")
        if manifest is None:
            return {"modelo": modelo, "ok": False, "llamadas": llamadas, "log": log}
        for correcciones in range(3):
            status, report = probar(manifest)
            casos = report.get("cases", [])
            paso(f"prueba {correcciones + 1}: {status} " + json.dumps([{k: c.get(k) for k in ('passed', 'reason', 'error_type', 'mismatched_fields', 'elapsed_seconds')} for c in casos], ensure_ascii=False))
            if status == "passed":
                return {"modelo": modelo, "ok": True, "llamadas": llamadas, "correcciones": correcciones, "segundos": round(time.monotonic() - inicio), "log": log}
            fallidos = [c for c in casos if not c.get("passed")]
            if correcciones == 2 or report.get("error") or not fallidos or not all(c["reason"] in CORREGIBLES for c in fallidos):
                break
            llamadas += 1
            nueva = await provider.repair(definition, manifest.proposal.source, observacion(definition, report))
            try:
                manifest = prepare_candidate(capability, definition, nueva)
            except HTTPException as error:
                paso(f"corrección inválida ({error.detail})")
                break
        return {"modelo": modelo, "ok": False, "llamadas": llamadas, "segundos": round(time.monotonic() - inicio), "log": log}
    except HTTPException as error:
        paso(f"HTTP {error.status_code}: {error.detail}")
        return {"modelo": modelo, "ok": False, "llamadas": llamadas, "log": log}


if __name__ == "__main__":
    resultado = asyncio.run(main(sys.argv[1], sys.argv[2]))
    print("RESULTADO " + json.dumps({k: v for k, v in resultado.items() if k != "log"}, ensure_ascii=False))
