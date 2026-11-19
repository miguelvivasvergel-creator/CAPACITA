"""Primer bloque de comprensión de objetivos; no genera ni ejecuta workflows."""
from typing import Annotated

from fastapi import APIRouter, Depends

from api.capabilities import Repository
from api.candidates import get_provider
from core.responses import APIResponse
from providers.gemini import GeminiProvider
from schemas.objectives import AdjustRequest, AdjustResponse, ObjectiveRequest, ObjectiveResponse, ResearchResult
from services.objective_service import adjust_parameters, interpret_objective, research_objective

router = APIRouter(prefix="/objectives", tags=["Definir desde un objetivo"])


@router.post("/interpret", response_model=APIResponse[ObjectiveResponse])
async def interpret(payload: ObjectiveRequest, repository: Repository, provider: Annotated[GeminiProvider, Depends(get_provider)]):
    return APIResponse(message="Interpretación para revisar; sin guardado ni ejecución", data=await interpret_objective(payload, repository, provider))


@router.post("/research", response_model=APIResponse[ResearchResult | None])
async def research(payload: ObjectiveRequest, repository: Repository, provider: Annotated[GeminiProvider, Depends(get_provider)]):
    """Investiga en Google cómo se hace bien lo pedido; no guarda lo encontrado (términos de Google)."""
    return APIResponse(message="Investigación para esta conversación; no se guarda",
                       data=await research_objective(payload, repository.user_id, provider))


@router.post("/adjust", response_model=APIResponse[AdjustResponse])
async def adjust(payload: AdjustRequest, repository: Repository, provider: Annotated[GeminiProvider, Depends(get_provider)]):
    """Traduce «ponle 30 %» a valores de las opciones; no ejecuta ni guarda nada."""
    return APIResponse(message="Ajuste propuesto; sin guardado ni ejecución", data=await adjust_parameters(payload, repository.user_id, provider))
