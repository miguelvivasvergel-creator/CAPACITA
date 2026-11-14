"""Revalidación de contenido no confiable sin ejecutar código."""
import json

from fastapi import HTTPException
from jsonschema import Draft202012Validator

from schemas.candidates import CandidateManifest
from services.candidate_preparation import prepare_candidate


def validate_manifest(raw) -> CandidateManifest:
    manifest = CandidateManifest.model_validate(raw)
    recalculated = prepare_candidate(manifest.capability_id, manifest.definition, manifest.proposal)
    if (manifest.artifact_hash != recalculated.artifact_hash
            or manifest.definition_hash != recalculated.definition_hash):
        raise HTTPException(409, "El contenido del candidato no coincide con sus hashes")
    if manifest.definition.required_permissions or manifest.definition.resources:
        raise HTTPException(422, "Este laboratorio no admite recursos ni permisos externos")
    return manifest


def validate_cases(manifest, cases):
    if not 1 <= len(cases) <= 20:
        raise HTTPException(422, "Incluye entre 1 y 20 casos")
    if not any(not case.expect_rejection for case in cases):
        raise HTTPException(422, "Incluye al menos un caso con salida esperada para probar la implementación")
    encoded = json.dumps([case.model_dump(mode="json") for case in cases],
                         ensure_ascii=False, allow_nan=False)
    if len(encoded.encode("utf-8")) > 65536:
        raise HTTPException(422, "Los casos superan 64 KiB")
    spec = manifest.definition
    for case in cases:
        valid = (Draft202012Validator(spec.input_schema).is_valid(case.inputs)
                 and Draft202012Validator(spec.parameter_schema).is_valid(case.parameters))
        if case.expect_rejection:
            if valid or case.expected_output is not None:
                raise HTTPException(422, "Un caso de rechazo requiere entradas inválidas y ninguna salida esperada")
        elif (not valid or case.expected_output is None
              or not Draft202012Validator(spec.output_schema).is_valid(case.expected_output)):
            raise HTTPException(422, "El caso no cumple los contratos o carece de salida esperada")


def accepts_input(manifest, case):
    return (Draft202012Validator(manifest.definition.input_schema).is_valid(case.inputs)
            and Draft202012Validator(manifest.definition.parameter_schema).is_valid(case.parameters))
