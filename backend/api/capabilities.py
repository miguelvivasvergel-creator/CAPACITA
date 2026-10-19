# backend/api/capabilities.py
import uuid
from typing import Optional, List
from datetime import datetime, timezone
from fastapi import APIRouter, Query, Path, HTTPException, status

from core.responses import APIResponse
from schemas.capabilities import (
    CapabilityCreate,
    CapabilityUpdate,
    CapabilityResponse,
    CapabilityListResponse,
)

router = APIRouter(prefix="/capabilities", tags=["Capacidades"])

# Almacén en memoria para desarrollo inicial / pruebas sin bloqueo
# (Posteriormente se conecta con Supabase Client / Repository)
MOCK_DB: List[dict] = [
    {
        "id": "cap-001",
        "owner_id": "usr-demo-1",
        "owner_username": "franklin_dev",
        "name": "Quitar fondo de imagen",
        "description": "Elimina de forma automática el fondo de cualquier fotografía en formato JPG o PNG devolviendo un PNG con transparencia.",
        "category": "Imagen",
        "input_type": "imagen",
        "output_type": "imagen",
        "visibility": "public",
        "status": "published",
        "version": "1.0.0",
        "permissions": ["Acceso a procesamiento de imagen"],
        "adapter_key": "remove_background",
        "config": {"model": "rembg", "format": "png"},
        "cloned_from": None,
        "uses_count": 142,
        "clones_count": 18,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
    },
    {
        "id": "cap-002",
        "owner_id": "usr-demo-1",
        "owner_username": "franklin_dev",
        "name": "Extraer texto de PDF",
        "description": "Analiza documentos PDF digitales y extrae todo su contenido de texto limpio, listo para ser procesado o traducido.",
        "category": "Documentos",
        "input_type": "pdf",
        "output_type": "texto",
        "visibility": "public",
        "status": "published",
        "version": "1.1.0",
        "permissions": ["Lectura de documentos PDF"],
        "adapter_key": "extract_text",
        "config": {"parser": "pypdf", "ocr": False},
        "cloned_from": None,
        "uses_count": 89,
        "clones_count": 12,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
    },
    {
        "id": "cap-003",
        "owner_id": "usr-demo-2",
        "owner_username": "miguel_ui",
        "name": "Traducir texto multilingüe",
        "description": "Traduce texto de entrada a inglés, español, francés o alemán manteniendo la coherencia semántica.",
        "category": "Texto",
        "input_type": "texto",
        "output_type": "texto",
        "visibility": "public",
        "status": "published",
        "version": "2.0.0",
        "permissions": ["Traducción automática"],
        "adapter_key": "translate",
        "config": {"default_target": "es"},
        "cloned_from": None,
        "uses_count": 230,
        "clones_count": 45,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
    },
]


@router.get(
    "",
    response_model=APIResponse[CapabilityListResponse],
    summary="Listar capacidades disponibles",
    description="Obtiene el listado de capacidades filtradas por scope (mine, community, available), texto y tipo.",
)
async def list_capabilities(
    scope: str = Query(default="available", description="Filtro de alcance: mine | community | available"),
    q: Optional[str] = Query(default=None, description="Término de búsqueda textual"),
    type: Optional[str] = Query(default=None, description="Filtrar por tipo de entrada o salida"),
    owner: Optional[str] = Query(default=None, description="Filtrar por nombre de usuario del autor"),
    cursor: Optional[str] = Query(default=None, description="Cursor para paginación"),
) -> APIResponse[CapabilityListResponse]:
    # Simulación de usuario actual (temporal mientras se activa core/auth.py)
    current_user_id = "usr-demo-1"

    resultados = []
    for item in MOCK_DB:
        # Regla de visibilidad:
        # - scope=mine: solo las mías
        # - scope=community: solo las públicas de otros
        # - scope=available: mis capacidades + las públicas de otros
        is_mine = item["owner_id"] == current_user_id
        is_public = item["visibility"] == "public"

        if scope == "mine" and not is_mine:
            continue
        elif scope == "community" and (is_mine or not is_public):
            continue
        elif scope == "available" and not (is_mine or is_public):
            continue

        # Filtro por texto q
        if q:
            termino = q.lower()
            if termino not in item["name"].lower() and termino not in item["description"].lower():
                continue

        # Filtro por tipo de entrada/salida
        if type:
            tipo_filtro = type.lower()
            if item["input_type"] != tipo_filtro and item["output_type"] != tipo_filtro:
                continue

        # Filtro por owner
        if owner and item.get("owner_username") != owner:
            continue

        resultados.append(CapabilityResponse(**item))

    return APIResponse(
        success=True,
        message="Capacidades obtenidas exitosamente",
        data=CapabilityListResponse(items=resultados, next_cursor=None),
    )


@router.get(
    "/similar",
    response_model=APIResponse[List[CapabilityResponse]],
    summary="Detectar capacidades similares",
    description="Compara el nombre y descripción para prevenir duplicados al crear una nueva capacidad.",
)
async def check_similar_capabilities(
    name: str = Query(..., description="Nombre de la nueva capacidad a comparar"),
    description: Optional[str] = Query(default="", description="Descripción tentativa"),
) -> APIResponse[List[CapabilityResponse]]:
    similares = []
    palabras = [p.lower() for p in name.split() if len(p) > 3]

    for item in MOCK_DB:
        nombre_existente = item["name"].lower()
        if any(p in nombre_existente for p in palabras):
            similares.append(CapabilityResponse(**item))

    return APIResponse(
        success=True,
        message=f"Se encontraron {len(similares)} capacidades similares",
        data=similares,
    )


@router.get(
    "/{id}",
    response_model=APIResponse[CapabilityResponse],
    summary="Obtener detalle de una capacidad",
    description="Retorna la información completa de una capacidad. Si es privada y no pertenece al usuario, retorna 404.",
)
async def get_capability_by_id(
    id: str = Path(..., description="ID único de la capacidad"),
) -> APIResponse[CapabilityResponse]:
    current_user_id = "usr-demo-1"

    for item in MOCK_DB:
        if item["id"] == id:
            # Regla de privacidad: si es privada y ajena -> responder 404 para no filtrar su existencia
            if item["visibility"] == "private" and item["owner_id"] != current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Capacidad no encontrada",
                )
            return APIResponse(
                success=True,
                message="Capacidad encontrada",
                data=CapabilityResponse(**item),
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Capacidad no encontrada",
    )


@router.post(
    "",
    response_model=APIResponse[CapabilityResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva capacidad",
    description="Registra una nueva capacidad modular para el usuario activo.",
)
async def create_capability(
    payload: CapabilityCreate,
) -> APIResponse[CapabilityResponse]:
    current_user_id = "usr-demo-1"
    current_username = "franklin_dev"

    nuevo_item = {
        "id": f"cap-{uuid.uuid4().hex[:6]}",
        "owner_id": current_user_id,
        "owner_username": current_username,
        **payload.model_dump(),
        "cloned_from": None,
        "uses_count": 0,
        "clones_count": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
    }

    MOCK_DB.append(nuevo_item)

    return APIResponse(
        success=True,
        message="Capacidad creada con éxito",
        data=CapabilityResponse(**nuevo_item),
    )


@router.post(
    "/{id}/clone",
    response_model=APIResponse[CapabilityResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Clonar una capacidad pública",
    description="Crea una copia privada de la capacidad para el usuario que clona y suma el contador en la original.",
)
async def clone_capability(
    id: str = Path(..., description="ID de la capacidad original a clonar"),
) -> APIResponse[CapabilityResponse]:
    current_user_id = "usr-demo-1"
    current_username = "franklin_dev"

    original = next((item for item in MOCK_DB if item["id"] == id), None)

    if not original:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capacidad no encontrada",
        )

    # Solo se pueden clonar públicas o propias
    if original["visibility"] == "private" and original["owner_id"] != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Capacidad no encontrada",
        )

    # Incrementar contador de clones en la original
    original["clones_count"] += 1

    # Crear copia privada para el usuario
    clon = {
        **original,
        "id": f"cap-{uuid.uuid4().hex[:6]}",
        "owner_id": current_user_id,
        "owner_username": current_username,
        "visibility": "private",  # Un clon siempre inicia privado
        "cloned_from": original["id"],
        "uses_count": 0,
        "clones_count": 0,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
    }

    MOCK_DB.append(clon)

    return APIResponse(
        success=True,
        message=f"Capacidad '{original['name']}' clonada exitosamente",
        data=CapabilityResponse(**clon),
    )


@router.put(
    "/{id}",
    response_model=APIResponse[CapabilityResponse],
    summary="Actualizar capacidad",
    description="Permite al dueño modificar los detalles de su capacidad.",
)
async def update_capability(
    id: str = Path(...),
    payload: CapabilityUpdate = ...,
) -> APIResponse[CapabilityResponse]:
    current_user_id = "usr-demo-1"

    item = next((c for c in MOCK_DB if c["id"] == id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capacidad no encontrada")

    if item["owner_id"] != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para editar esta capacidad")

    # Actualizar solo los campos enviados
    update_data = payload.model_dump(exclude_unset=True)
    item.update(update_data)
    item["updated_at"] = datetime.now(timezone.utc)

    return APIResponse(
        success=True,
        message="Capacidad actualizada correctamente",
        data=CapabilityResponse(**item),
    )


@router.delete(
    "/{id}",
    response_model=APIResponse[dict],
    summary="Eliminar capacidad",
    description="Elimina una capacidad propia del usuario.",
)
async def delete_capability(
    id: str = Path(...),
) -> APIResponse[dict]:
    current_user_id = "usr-demo-1"

    global MOCK_DB
    item = next((c for c in MOCK_DB if c["id"] == id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Capacidad no encontrada")

    if item["owner_id"] != current_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para eliminar esta capacidad")

    MOCK_DB = [c for c in MOCK_DB if c["id"] != id]

    return APIResponse(
        success=True,
        message="Capacidad eliminada exitosamente",
        data={"deleted_id": id},
    )
