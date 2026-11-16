from typing import Annotated
from fastapi import APIRouter, Depends
from api.capabilities import Repository
from api.candidates import get_provider
from core.responses import APIResponse
from providers.gemini import GeminiProvider
from schemas.planner import PlannerRequest, PlannerSearch
from services.planner_service import planner_options, propose_plan

router = APIRouter(prefix="/planner", tags=["Planificación para revisar"])


@router.post("/options", response_model=APIResponse[dict])
async def options(payload: PlannerSearch, repository: Repository):
    return APIResponse(data=await planner_options(payload.objective, repository, mode=payload.mode))


@router.post("/propose", response_model=APIResponse[dict])
async def propose(payload: PlannerRequest, repository: Repository,
                  provider: Annotated[GeminiProvider, Depends(get_provider)]):
    return APIResponse(data=await propose_plan(payload, repository, provider))
