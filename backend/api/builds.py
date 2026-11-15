"""API del laboratorio: autoriza y encola; nunca ejecuta el candidato."""
import hashlib
import json
import inspect
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import ValidationError

from api.capabilities import Repository
from core.responses import APIResponse
from core.config import settings
from repositories.builds import BuildRepository
from repositories.candidates import CandidateRepository
from repositories.shared_execution import SharedExecutionRepository
from schemas.builds import BuildRequest, BuildResponse
from services.build_validation import validate_cases, validate_manifest

router = APIRouter(prefix="/builds", tags=["Laboratorio privado"])


def get_build_repository(repository: Repository):
    return SharedExecutionRepository(repository) if settings.LABORATORY_STORAGE == "supabase" else BuildRepository()


async def resolve(result):
    # Compatibilidad explícita con el laboratorio SQLite ya aceptado.
    return await result if inspect.isawaitable(result) else result


Storage = Annotated[BuildRepository, Depends(get_build_repository)]


@router.post("", status_code=202, response_model=APIResponse[BuildResponse])
async def create(payload: BuildRequest, repository: Repository, storage: Storage,
                 idempotency_key: Annotated[str, Header(min_length=1, max_length=128)]):
    row = await CandidateRepository(repository).get(payload.candidate_id)
    try:
        manifest = validate_manifest(row["manifest"])
        if str(manifest.candidate_id) != row["id"] or str(manifest.capability_id) != row["capability_id"]:
            raise HTTPException(409, "Los identificadores del candidato no coinciden")
        validate_cases(manifest, payload.cases)
    except (ValidationError, ValueError, RecursionError):
        raise HTTPException(422, "Paquete o casos de prueba inválidos") from None
    if manifest.artifact_hash != payload.artifact_hash:
        raise HTTPException(409, "El hash solicitado no coincide con el candidato")
    digest = hashlib.sha256(json.dumps(payload.model_dump(mode="json"), sort_keys=True,
                                      ensure_ascii=False, allow_nan=False).encode()).hexdigest()
    result = await resolve(storage.enqueue(repository.user_id, manifest, payload.cases, idempotency_key, digest))
    return APIResponse(message="Prueba encolada; requiere trabajador aislado activo", data=result)


@router.get("/{id}", response_model=APIResponse[BuildResponse])
async def detail(id: UUID, repository: Repository, storage: Storage):
    return APIResponse(data=await resolve(storage.get(repository.user_id, id)))


@router.get("", response_model=APIResponse[dict])
async def listing(repository: Repository, storage: Storage, cursor: UUID | None = None,
                  candidate_id: UUID | None = None,
                  limit: Annotated[int, Query(ge=1, le=100)] = 20):
    return APIResponse(data=await resolve(storage.list(repository.user_id, cursor, limit, candidate_id)))
