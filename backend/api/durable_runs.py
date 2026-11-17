"""Runs reales en cola compartida; reemplaza el router heredado en memoria."""
import json
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query
from jsonschema import Draft202012Validator
from pydantic import ValidationError

from api.capabilities import Repository
from api.versions import Shared
from core.responses import APIResponse
from repositories.candidates import CandidateRepository
from schemas.executions import ExecutionRequest, ExecutionResponse
from services.build_validation import validate_manifest
from services.contract_validation import DATA_BYTES

router = APIRouter(prefix="/runs", tags=["Ejecuciones persistentes privadas"])


@router.post("", status_code=202, response_model=APIResponse[ExecutionResponse])
async def create(payload: ExecutionRequest, repository: Repository, shared: Shared,
                 idempotency_key: Annotated[str, Header(min_length=1, max_length=128)]):
    version = await shared.version_for_execution(payload.version_id)
    if version.get('public_execution'):
        for field, value in (('input_schema', payload.inputs), ('parameter_schema', payload.parameters)):
            if not Draft202012Validator(version['contracts'][field]).is_valid(value):
                raise HTTPException(422, 'Entradas o parámetros incompatibles con la versión')
        try:
            if len(json.dumps(payload.model_dump(mode='json'), allow_nan=False).encode()) > DATA_BYTES - 1000:
                raise ValueError()
        except (ValueError, TypeError, RecursionError):
            raise HTTPException(422, 'La ejecución requiere JSON finito de hasta 4 MB') from None
        return APIResponse(data=await shared.rpc('public_enqueue', p_id=version['publication_id'],
            p_key=idempotency_key, p_inputs=payload.inputs, p_parameters=payload.parameters))
    candidate = await CandidateRepository(repository).get(UUID(version["candidate_id"]))
    try:
        manifest = validate_manifest(candidate["manifest"])
    except (ValidationError, ValueError, RecursionError):
        raise HTTPException(422, "Candidato inválido") from None
    if (manifest.artifact_hash != version["artifact_hash"]
            or manifest.definition_hash != version["definition_hash"]
            or str(manifest.candidate_id) != version["candidate_id"]
            or str(manifest.capability_id) != version["capability_id"]):
        raise HTTPException(409, "La versión no coincide con su candidato")
    for schema, value in ((manifest.definition.input_schema, payload.inputs),
                          (manifest.definition.parameter_schema, payload.parameters)):
        if not Draft202012Validator(schema).is_valid(value):
            raise HTTPException(422, "Entradas o parámetros incompatibles con la versión")
    try:
        if len(json.dumps(payload.model_dump(mode="json"), ensure_ascii=False, allow_nan=False).encode()) > DATA_BYTES:
            raise ValueError()
    except (ValueError, TypeError, RecursionError):
        raise HTTPException(422, "La ejecución requiere JSON finito de hasta 4 MB") from None
    return APIResponse(message="Ejecución encolada",
                       data=await shared.rpc("enqueue", p_kind="run", p_key=idempotency_key,
                                             p_request=payload.model_dump(mode="json")))


@router.get("/{id}", response_model=APIResponse[ExecutionResponse])
async def detail(id: UUID, shared: Shared):
    return APIResponse(data=await shared.rpc("get", p_kind="run", p_id=str(id)))


@router.get("", response_model=APIResponse[dict])
async def listing(shared: Shared, cursor: UUID | None = None,
                  limit: Annotated[int, Query(ge=1, le=100)] = 20):
    return APIResponse(data=await shared.rpc("list", p_kind="run", p_cursor=str(cursor) if cursor else None,
                                            p_limit=limit))
