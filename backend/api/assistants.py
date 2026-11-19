"""Asistentes recurrentes (fase 5, SQL 17): una solución propia que se ejecuta sola con horario.

Crear un asistente equivale a aprobar de forma permanente ESA revisión con ESOS datos; por eso se
revalida aquí igual que una aprobación (versiones disponibles, datos que cumplen el contrato y el
«Acepto» si un paso envía contenido a un tercero). La base de datos vuelve a comprobar todo en
cada turno y pausa el asistente si la solución cambia o una versión deja de estar disponible.
"""
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator

from api.capabilities import Repository
from api.workflows import Storage
from connectors import sending_content
from core.responses import APIResponse
from schemas.workflows import WorkflowDefinition
from services.workflow_service import check_workflow

router = APIRouter(prefix="/assistants", tags=["Asistentes"])
Hora = Annotated[str, Field(pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")]


class Schedule(BaseModel):
    model_config = ConfigDict(extra="forbid")
    frequency: Literal["daily", "weekly"]
    days: list[Annotated[int, Field(ge=1, le=7)]] = Field(default_factory=list, max_length=7)
    time: Hora
    timezone: Literal["America/Bogota"] = "America/Bogota"

    @field_validator("days")
    @classmethod
    def sin_repetidos(cls, dias):
        return sorted(set(dias))


class AssistantCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    workflow_id: UUID
    revision: int = Field(ge=1)
    definition_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    inputs: dict
    schedule: Schedule
    name: str = Field(min_length=1, max_length=80)
    content_consent: bool = False


async def rpc(repository, nombre, **datos):
    return await repository.gateway.request("POST", f"/rest/v1/rpc/{nombre}", repository.token, json=datos)


@router.get("", response_model=APIResponse[dict])
async def listing(repository: Repository):
    return APIResponse(data=await rpc(repository, "assistant_list"))


@router.post("", status_code=201, response_model=APIResponse[dict])
async def create(payload: AssistantCreate, repository: Repository, storage: Storage):
    if payload.schedule.frequency == "weekly" and not payload.schedule.days:
        raise HTTPException(422, "Elige al menos un día de la semana")
    row = await storage.get(payload.workflow_id)
    if row["revision"] != payload.revision or row["definition_hash"] != payload.definition_hash:
        raise HTTPException(409, "La solución cambió; vuelve a revisarla")
    definition = WorkflowDefinition.model_validate(row["definition"])
    externos = sending_content(node.version_id for node in definition.nodes)
    if externos and not payload.content_consent:
        proveedores = ", ".join(sorted({connector.provider for connector in externos}))
        raise HTTPException(422, f"Este asistente envía tu contenido a {proveedores}: acepta ese envío para crearlo")
    await check_workflow(definition, repository, payload.inputs)
    return APIResponse(data=await rpc(repository, "assistant_save", p_workflow=str(payload.workflow_id),
                                      p_revision=payload.revision, p_hash=payload.definition_hash, p_inputs=payload.inputs,
                                      p_schedule=payload.schedule.model_dump(), p_name=payload.name))


@router.post("/{id}/pause", response_model=APIResponse[dict])
async def pause(id: UUID, repository: Repository):
    return APIResponse(data=await rpc(repository, "assistant_set_active", p_id=str(id), p_active=False))


@router.post("/{id}/resume", response_model=APIResponse[dict])
async def resume(id: UUID, repository: Repository):
    return APIResponse(data=await rpc(repository, "assistant_set_active", p_id=str(id), p_active=True))


@router.delete("/{id}", response_model=APIResponse[dict])
async def delete(id: UUID, repository: Repository):
    return APIResponse(data=await rpc(repository, "assistant_delete", p_id=str(id)))
