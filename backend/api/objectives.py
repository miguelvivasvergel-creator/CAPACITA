"""Primer bloque de comprensión de objetivos; no genera ni ejecuta workflows."""
from typing import Annotated

from fastapi import APIRouter, Depends

from api.capabilities import Repository
from api.candidates import get_provider
from core.responses import APIResponse
from providers.gemini import GeminiProvider
from schemas.objectives import ObjectiveRequest, ObjectiveResponse
from services.objective_service import interpret_objective

router = APIRouter(prefix="/objectives", tags=["Definir desde un objetivo"])


@router.post("/interpret", response_model=APIResponse[ObjectiveResponse])
async def interpret(payload: ObjectiveRequest, repository: Repository, provider: Annotated[GeminiProvider, Depends(get_provider)]):
    return APIResponse(message="Interpretación para revisar; sin guardado ni ejecución", data=await interpret_objective(payload, repository, provider))
