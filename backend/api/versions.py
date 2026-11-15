"""Habilitación explícita y privada; no cambia el catálogo ni publica."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError

from api.capabilities import Repository
from core.responses import APIResponse
from repositories.candidates import CandidateRepository
from repositories.shared_execution import SharedExecutionRepository
from schemas.executions import EnableVersionRequest, VersionResponse
from services.build_validation import validate_manifest

router = APIRouter(prefix="/versions", tags=["Versiones privadas"])


def get_execution_repository(repository: Repository):
    return SharedExecutionRepository(repository)


Shared = Annotated[SharedExecutionRepository, Depends(get_execution_repository)]


@router.post("", response_model=APIResponse[VersionResponse], status_code=201)
async def enable(payload: EnableVersionRequest, repository: Repository, shared: Shared):
    row = await CandidateRepository(repository).get(payload.candidate_id)
    try:
        manifest = validate_manifest(row["manifest"])
    except (ValidationError, ValueError, RecursionError):
        raise HTTPException(422, "Candidato inválido") from None
    if str(manifest.candidate_id) != row["id"] or str(manifest.capability_id) != row["capability_id"]:
        raise HTTPException(409, "Identificadores del candidato inconsistentes")
    # La prueba se recupera del almacenamiento compartido; nunca del cliente.
    return APIResponse(message="Versión habilitada para uso privado",
                       data=await shared.rpc("enable", p_candidate_id=str(payload.candidate_id),
                                             p_build_id=str(payload.build_id)))


@router.get("", response_model=APIResponse[dict])
async def listing(shared: Shared, candidate_id: UUID | None = None, cursor: UUID | None = None,
                  limit: Annotated[int, Query(ge=1, le=100)] = 20):
    return APIResponse(data=await shared.rpc("versions", p_candidate_id=str(candidate_id) if candidate_id else None,
                                            p_cursor=str(cursor) if cursor else None, p_limit=limit))


@router.post("/{id}/disable", response_model=APIResponse[VersionResponse])
async def disable(id: UUID, shared: Shared):
    return APIResponse(data=await shared.rpc("disable", p_id=str(id)))
