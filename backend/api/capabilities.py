"""CRUD del catálogo autorizado y persistente; no habilita ejecución de código."""
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from core.auth import get_access_token, get_current_user
from core.responses import APIResponse
from core.supabase import SupabaseGateway, get_supabase_gateway
from repositories.capabilities import CapabilityRepository
from schemas.capabilities import CapabilityCreate, CapabilityUpdate, CapabilityResponse, CapabilityListResponse, TipoDato
from schemas.definitions import CapabilityDefinition, DefinitionCheckResponse, DefinitionSaveRequest
from services.definition_service import check_definition, save_definition

router = APIRouter(prefix="/capabilities", tags=["Capacidades"])


async def get_repository(
    user: Annotated[dict, Depends(get_current_user)],
    token: Annotated[str, Depends(get_access_token)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
) -> CapabilityRepository:
    return CapabilityRepository(gateway, token, user["id"])


Repository = Annotated[CapabilityRepository, Depends(get_repository)]


def require_draft(status: str):
    if status != "draft":
        raise HTTPException(409, "Publicar requiere una versión con implementación y pruebas verificadas")


@router.get("", response_model=APIResponse[CapabilityListResponse])
async def list_capabilities(
    repository: Repository,
    scope: Literal["mine", "community", "available"] = "available",
    q: Annotated[str | None, Query(max_length=200)] = None,
    type: TipoDato | None = None,
    owner: Annotated[str | None, Query(max_length=50)] = None,
    cursor: UUID | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    data = await repository.list(scope=scope, q=q, data_type=type, owner=owner, cursor=cursor, limit=limit)
    return APIResponse(message="Capacidades obtenidas", data=data)


@router.post("/definitions/check", response_model=APIResponse[DefinitionCheckResponse])
async def check_capability_definition(payload: CapabilityDefinition, repository: Repository):
    return APIResponse(message="Contratos y ejemplos comprobados; implementación sin verificar", data=await check_definition(payload, repository))


@router.post("/definitions", response_model=APIResponse[CapabilityResponse], status_code=201)
async def create_capability_definition(payload: DefinitionSaveRequest, repository: Repository):
    return APIResponse(message="Definición guardada como borrador privado", data=await save_definition(payload, repository))


@router.get("/similar", response_model=APIResponse[CapabilityListResponse])
async def check_similar_capabilities(
    repository: Repository,
    name: Annotated[str, Query(min_length=3, max_length=80)],
    description: Annotated[str, Query(max_length=500)] = "",
):
    # Búsqueda textual explícita; no se presenta como búsqueda semántica.
    data = await repository.list(q=name, limit=20)
    return APIResponse(message="Coincidencias textuales del catálogo autorizado", data=data)


@router.get("/{id}", response_model=APIResponse[CapabilityResponse])
async def get_capability_by_id(id: UUID, repository: Repository):
    return APIResponse(data=await repository.get(id))


@router.post("", response_model=APIResponse[CapabilityResponse], status_code=201)
async def create_capability(payload: CapabilityCreate, repository: Repository):
    require_draft(payload.status)
    return APIResponse(message="Borrador guardado", data=await repository.create(payload.model_dump()))


@router.post("/{id}/clone", response_model=APIResponse[CapabilityResponse], status_code=201)
async def clone_capability(id: UUID, repository: Repository):
    original = await repository.get(id)
    payload = {key: original[key] for key in CapabilityCreate.model_fields}
    payload.update(visibility="private", status="draft")
    # No incrementar contadores mediante read-modify-write no atómico ni editar al otro autor.
    cloned = await repository.create(payload, cloned_from=str(id))
    return APIResponse(message="Copia privada guardada como borrador", data=cloned)


SOLO_PRESENTACION = {"name", "description", "category"}


@router.put("/{id}", response_model=APIResponse[CapabilityResponse])
async def update_capability(id: UUID, payload: CapabilityUpdate, repository: Repository):
    changes = payload.model_dump(exclude_unset=True)
    if "status" in changes:
        require_draft(changes["status"])
    if not changes:
        raise HTTPException(422, "Indica al menos un campo para actualizar")
    # Cambiar cómo funciona (tipos, contratos, permisos, adaptador, visibilidad) vuelve a borrador: no
    # conserva evidencia de la versión anterior. Renombrar o describir no cambia lo que hace, así que no
    # despublica una herramienta compartida (db/09 exige status='published').
    if set(changes) - SOLO_PRESENTACION:
        changes["status"] = "draft"
    return APIResponse(message="Capacidad actualizada", data=await repository.update(id, changes))


@router.delete("/{id}", response_model=APIResponse[dict])
async def delete_capability(id: UUID, repository: Repository):
    result = await repository.delete(id)
    return APIResponse(message="Capacidad eliminada", data={"deleted_id": str(id),
                       "disabled_versions": (result or {}).get("disabled_versions", 0)})
