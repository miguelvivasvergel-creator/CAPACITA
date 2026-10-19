# backend/api/runs.py
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from core.auth import get_current_user
from core.responses import APIResponse
from core.visibility import visible_to
from repositories.memoria import ARCHIVOS, CAPACIDADES, RUNS, WORKFLOWS, buscar_por_id
from schemas.runs import RunCreate, RunList, RunResponse
from services.run_engine import ejecutar_run

router = APIRouter(prefix="/runs", tags=["Ejecuciones"])


def _no_encontrado() -> HTTPException:
    # 404 (no 403) para no revelar que el recurso existe
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No encontrado")


def _capacidades_a_ejecutar(datos: RunCreate, user_id: str) -> list[dict]:
    """Devuelve las capacidades en orden. Si algo no es visible para el usuario, responde 404."""
    capacidades_visibles = visible_to(CAPACIDADES, user_id)

    if datos.capability_id:
        capacidad = buscar_por_id(capacidades_visibles, datos.capability_id)
        if capacidad is None:
            raise _no_encontrado()
        return [capacidad]

    workflow = buscar_por_id(visible_to(WORKFLOWS, user_id), datos.workflow_id)
    if workflow is None:
        raise _no_encontrado()

    capacidades = [buscar_por_id(capacidades_visibles, cap_id) for cap_id in workflow["steps"]]
    if None in capacidades:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este workflow usa una capacidad a la que no tienes acceso",
        )
    return capacidades


@router.post(
    "",
    response_model=APIResponse[RunResponse],
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ejecutar un workflow o una capacidad",
    description="Valida acceso, permisos y archivo; crea la ejecución y la corre en segundo plano.",
)
async def create_run(
    datos: RunCreate,
    tareas: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
) -> APIResponse[RunResponse]:
    user_id = current_user["id"]
    capacidades = _capacidades_a_ejecutar(datos, user_id)

    # 1. Debe aceptar todos los permisos que piden sus pasos
    requeridos = {permiso for cap in capacidades for permiso in cap["permissions"]}
    if not requeridos.issubset(datos.accepted_permissions):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debes aceptar todos los permisos para ejecutar",
        )

    # 2. El archivo de entrada debe ser suyo
    if datos.file_id:
        archivo = buscar_por_id(ARCHIVOS, datos.file_id)
        if archivo is None or archivo["owner_id"] != user_id:
            raise _no_encontrado()

    # 3. Crear la fila y ejecutarla en segundo plano
    run = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "workflow_id": datos.workflow_id,
        "capability_id": datos.capability_id,
        "status": "queued",
        "steps": [
            {
                "name": cap["name"],
                "input_type": cap["input_type"],
                "output_type": cap["output_type"],
                "status": "pending",
                "error": None,
            }
            for cap in capacidades
        ],
        "accepted_permissions": datos.accepted_permissions,
        "input_file_id": datos.file_id,
        "input_text": datos.text,
        "output_text": None,
        "output_file_path": None,
        "error": None,
        "started_at": datetime.now(timezone.utc),
        "finished_at": None,
    }
    RUNS.append(run)
    tareas.add_task(ejecutar_run, run, capacidades, datos.text or datos.file_id)

    return APIResponse(message="Ejecución iniciada", data=RunResponse(**run))


@router.get(
    "/{run_id}",
    response_model=APIResponse[RunResponse],
    summary="Ver una ejecución",
    description="Solo su dueño puede verla. Para cualquier otra persona responde 404.",
)
async def get_run(run_id: str, current_user: dict = Depends(get_current_user)) -> APIResponse[RunResponse]:
    run = buscar_por_id(RUNS, run_id)
    if run is None or run["user_id"] != current_user["id"]:
        raise _no_encontrado()
    return APIResponse(message="Ejecución obtenida", data=RunResponse(**run))


@router.get(
    "",
    response_model=APIResponse[RunList],
    summary="Mis ejecuciones",
    description="Solo ejecuciones propias, de la más reciente a la más antigua.",
)
async def list_runs(
    workflow_id: Optional[str] = Query(default=None, description="Filtrar por workflow"),
    limit: int = Query(default=20, ge=1, le=50, description="Máximo de resultados"),
    current_user: dict = Depends(get_current_user),
) -> APIResponse[RunList]:
    runs = [
        r for r in RUNS
        if r["user_id"] == current_user["id"] and (workflow_id is None or r["workflow_id"] == workflow_id)
    ]
    runs.sort(key=lambda r: r["started_at"], reverse=True)
    return APIResponse(
        message="Ejecuciones obtenidas",
        data=RunList(items=[RunResponse(**r) for r in runs[:limit]]),
    )
