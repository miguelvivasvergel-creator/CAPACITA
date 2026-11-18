"""Publicacion ejecutable: contratos publicos, artefactos y resultados privados."""
import json
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Query
from jsonschema import Draft202012Validator
from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator

from api.capabilities import Repository
from api.versions import Shared
from core.config import settings
from core.responses import APIResponse
from schemas.executions import ExecutionResponse
from services.contract_validation import DATA_BYTES

router = APIRouter(prefix='/publications', tags=['Versiones publicadas'])


class PublishRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version_id: UUID
    license: Literal['MIT', 'Apache-2.0', 'CC0-1.0']
    consent: StrictBool

    @field_validator('consent')
    @classmethod
    def explicit_consent(cls, value):
        if not value:
            raise ValueError('Autoriza explícitamente la publicación')
        return value


class PublicRunRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    inputs: dict
    parameters: dict = Field(default_factory=dict)


def require_publications():
    if not settings.PUBLICATIONS_ENABLED:
        raise HTTPException(503, 'Publicación ejecutable pendiente de activar SQL 09 en este entorno')


@router.get('/availability')
async def availability(repository: Repository):
    return APIResponse(data={'enabled': settings.PUBLICATIONS_ENABLED})


@router.get('')
async def listing(repository: Repository, shared: Shared, capability_id: UUID | None = None,
                  cursor: UUID | None = None, limit: Annotated[int, Query(ge=1, le=100)] = 20):
    require_publications()
    if capability_id:
        await repository.get(capability_id)  # visible_to en origen y resultado.
    page = await shared.rpc('publication_versions', p_capability=str(capability_id) if capability_id else None,
                            p_cursor=str(cursor) if cursor else None, p_limit=limit)
    for row in page['items']:
        await repository.get(UUID(row['capability_id']))
    return APIResponse(data=page)


async def descriptor(identity, repository, shared):
    page = await shared.rpc('publication_versions', p_publication=str(identity))
    if not page['items']:
        raise HTTPException(404, 'Publicación no encontrada')
    row = page['items'][0]
    await repository.get(UUID(row['capability_id']))
    return row


@router.post('', status_code=201)
async def publish(payload: PublishRequest, repository: Repository, shared: Shared):
    require_publications()
    version = await shared.version_for_execution(payload.version_id)
    capability = await repository.get(UUID(version['capability_id']))
    if capability['owner_id'] != repository.user_id:
        raise HTTPException(404, 'Versión no encontrada')
    return APIResponse(data=await shared.rpc('publish', p_version=str(payload.version_id),
                                           p_license=payload.license, p_consent=payload.consent))


@router.post('/{id}/withdraw')
async def withdraw(id: UUID, repository: Repository, shared: Shared):
    require_publications()
    return APIResponse(data=await shared.rpc('withdraw', p_id=str(id)))


@router.post('/{id}/runs', status_code=202, response_model=APIResponse[ExecutionResponse])
async def execute(id: UUID, payload: PublicRunRequest, repository: Repository, shared: Shared,
                  idempotency_key: Annotated[str, Header(min_length=1, max_length=128)]):
    require_publications()
    version = await descriptor(id, repository, shared)
    for field, value in (('input_schema', payload.inputs), ('parameter_schema', payload.parameters)):
        if not Draft202012Validator(version['contracts'][field]).is_valid(value):
            raise HTTPException(422, 'Datos incompatibles con la versión publicada')
    try:
        if len(json.dumps(payload.model_dump(), ensure_ascii=False, allow_nan=False).encode()) > DATA_BYTES:
            raise ValueError()
    except (ValueError, TypeError, RecursionError):
        raise HTTPException(422, 'La ejecución requiere JSON finito de hasta 4 MB') from None
    return APIResponse(data=await shared.rpc('public_enqueue', p_id=str(id), p_key=idempotency_key,
                                            p_inputs=payload.inputs, p_parameters=payload.parameters))
