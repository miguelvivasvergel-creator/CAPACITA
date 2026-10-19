# backend/api/users.py
import base64
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from core.auth import get_current_user
from core.responses import APIResponse
from core.visibility import visible_to
from repositories.memoria import CAPACIDADES, PERFILES, RUNS, WORKFLOWS
from schemas.users import ActivityItem, ActivityList, UserProfile, UserStats, UserUpdate

router = APIRouter(prefix="/users", tags=["Usuarios"])

MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB
TIPOS_AVATAR = {"image/png", "image/jpeg"}
LIMITE_ACTIVIDAD = 10


def _buscar_perfil(username: str) -> dict:
    perfil = next((p for p in PERFILES if p["username"] == username), None)
    if perfil is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado")
    return perfil


def _armar_perfil(perfil: dict, viewer_id: str) -> UserProfile:
    """Calcula los 4 contadores. Todo pasa por visible_to y solo cuenta lo público."""
    capacidades = [
        c for c in visible_to(CAPACIDADES, viewer_id)
        if c["owner_id"] == perfil["id"] and c["visibility"] == "public"
    ]
    workflows = [
        w for w in visible_to(WORKFLOWS, viewer_id)
        if w["owner_id"] == perfil["id"] and w["visibility"] == "public"
    ]

    stats = UserStats(
        public_capabilities=len(capacidades),
        public_workflows=len(workflows),
        runs=sum(1 for r in RUNS if r["user_id"] == perfil["id"]),
        clones=sum(item["clones_count"] for item in capacidades + workflows),
    )
    return UserProfile(
        username=perfil["username"],
        display_name=perfil["display_name"],
        bio=perfil["bio"],
        avatar_url=perfil["avatar_url"],
        created_at=perfil["created_at"],
        stats=stats,
    )


@router.get(
    "/{username}",
    response_model=APIResponse[UserProfile],
    summary="Perfil público de un usuario",
    description="Datos públicos y los 4 contadores. Lo privado nunca se cuenta ni se muestra.",
)
async def get_user(username: str, current_user: dict = Depends(get_current_user)) -> APIResponse[UserProfile]:
    perfil = _buscar_perfil(username)
    return APIResponse(message="Perfil obtenido", data=_armar_perfil(perfil, current_user["id"]))


@router.patch(
    "/me",
    response_model=APIResponse[UserProfile],
    summary="Editar mi perfil",
    description="Solo cambia display_name y bio, y solo del propio usuario.",
)
async def update_me(cambios: UserUpdate, current_user: dict = Depends(get_current_user)) -> APIResponse[UserProfile]:
    for campo, valor in cambios.model_dump(exclude_unset=True).items():
        current_user[campo] = valor.strip() if isinstance(valor, str) else valor

    return APIResponse(message="Perfil actualizado", data=_armar_perfil(current_user, current_user["id"]))


@router.post(
    "/me/avatar",
    response_model=APIResponse[UserProfile],
    summary="Subir mi foto de perfil",
    description="PNG o JPG de máximo 2 MB.",
)
async def upload_avatar(
    file: UploadFile = File(..., description="Imagen PNG o JPG"),
    current_user: dict = Depends(get_current_user),
) -> APIResponse[UserProfile]:
    if file.content_type not in TIPOS_AVATAR:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La foto debe ser PNG o JPG")

    contenido = await file.read()
    if len(contenido) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La foto supera el límite de 2 MB",
        )

    # (Con Supabase, aquí se sube al bucket avatars/{user_id} y se guarda su URL pública)
    imagen_base64 = base64.b64encode(contenido).decode()
    current_user["avatar_url"] = f"data:{file.content_type};base64,{imagen_base64}"

    return APIResponse(message="Foto actualizada", data=_armar_perfil(current_user, current_user["id"]))


@router.get(
    "/{username}/activity",
    response_model=APIResponse[ActivityList],
    summary="Actividad pública de un usuario",
    description="Últimas 10 ejecuciones de workflows públicos. Nunca entradas, salidas ni ids de archivos.",
)
async def get_activity(username: str, current_user: dict = Depends(get_current_user)) -> APIResponse[ActivityList]:
    perfil = _buscar_perfil(username)
    workflows_publicos = {
        w["id"]: w for w in visible_to(WORKFLOWS, current_user["id"]) if w["visibility"] == "public"
    }

    runs = [
        r for r in RUNS
        if r["user_id"] == perfil["id"] and r["workflow_id"] in workflows_publicos
    ]
    runs.sort(key=lambda r: r["started_at"], reverse=True)

    items = []
    for run in runs[:LIMITE_ACTIVIDAD]:
        duracion = None
        if run["finished_at"]:
            duracion = int((run["finished_at"] - run["started_at"]).total_seconds() * 1000)

        # Se copian campo por campo para que nada privado se filtre por accidente
        items.append(ActivityItem(
            id=run["id"],
            workflow_id=run["workflow_id"],
            workflow_name=workflows_publicos[run["workflow_id"]]["name"],
            steps=[paso["name"] for paso in run["steps"]],
            status=run["status"],
            started_at=run["started_at"],
            duration_ms=duracion,
        ))

    return APIResponse(message="Actividad obtenida", data=ActivityList(items=items))
