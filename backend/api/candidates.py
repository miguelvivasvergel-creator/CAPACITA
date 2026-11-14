"""Candidatos Python privados; no hay rutas de ejecución ni habilitación."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from api.capabilities import Repository
from core.config import settings
from core.responses import APIResponse
from providers.gemini import GeminiProvider
from repositories.candidates import CandidateRepository
from schemas.candidates import CandidateGenerateRequest, CandidateResponse, CandidateListResponse
from services.candidate_generation import owned_definition, review_generation, generate_candidate

router = APIRouter(tags=["Candidatos privados"])


def get_provider():
    return GeminiProvider()


@router.post("/capabilities/{id}/candidates/check", response_model=APIResponse[dict])
async def check(id: UUID, repository: Repository):
    return APIResponse(message="Coincidencias textuales revisadas; sin llamada IA", data=await review_generation(id, CandidateRepository(repository)))


@router.post("/capabilities/{id}/candidates", response_model=APIResponse[CandidateResponse], status_code=201)
async def generate(id: UUID, payload: CandidateGenerateRequest, repository: Repository, provider: Annotated[GeminiProvider, Depends(get_provider)]):
    data = await generate_candidate(id, payload, CandidateRepository(repository), provider, settings.GEMINI_MODEL)
    return APIResponse(message="Candidato privado guardado; pruebas aisladas pendientes", data=data)


@router.get("/capabilities/{id}/candidates", response_model=APIResponse[CandidateListResponse])
async def list_candidates(id: UUID, repository: Repository, cursor: UUID | None = None, limit: Annotated[int, Query(ge=1, le=100)] = 20):
    candidates = CandidateRepository(repository)
    await owned_definition(id, candidates)
    return APIResponse(data=await candidates.list(id, cursor, limit))


@router.get("/candidates/{id}", response_model=APIResponse[CandidateResponse])
async def get_candidate(id: UUID, repository: Repository):
    return APIResponse(data=await CandidateRepository(repository).get(id))
