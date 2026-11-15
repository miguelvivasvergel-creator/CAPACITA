"""Perfiles persistentes de A; no consulta ejecuciones ni workflows de B."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, File, Form, HTTPException, Path, Query, Request, UploadFile
from pydantic import ValidationError

from api.capabilities import Repository
from core.responses import APIResponse
from repositories.profiles import ProfileRepository
from schemas.capabilities import CapabilityListResponse
from schemas.users import UserProfile, UserUpdate
from services.profile_avatar import AvatarStorage, MAX_BYTES, save_avatar

router = APIRouter(prefix='/users', tags=['Usuarios'])
Username = Annotated[str, Path(min_length=1, max_length=100)]


@router.get('/me', response_model=APIResponse[UserProfile])
async def get_me(repository: Repository):
    return APIResponse(data=await ProfileRepository(repository).get())


@router.patch('/me', response_model=APIResponse[UserProfile])
async def update_me(changes: UserUpdate, repository: Repository):
    return APIResponse(message='Perfil guardado', data=await ProfileRepository(repository).update(changes.model_dump(exclude_unset=True)))


@router.post('/me/avatar', response_model=APIResponse[UserProfile])
async def upload_avatar(request: Request, repository: Repository, file: Annotated[UploadFile, File()],
                        display_name: Annotated[str | None, Form()] = None,
                        bio: Annotated[str | None, Form()] = None):
    # Form(None) confunde texto vacío con ausencia. Conservar vacío para borrar bio.
    form = await request.form()
    if set(form) - {'file', 'display_name', 'bio'}:
        raise HTTPException(422, 'Campos de perfil no permitidos')
    values = {key: form[key] for key in ('display_name', 'bio') if key in form}
    try:
        changes = UserUpdate(**values).model_dump(exclude_unset=True) if values else {}
    except ValidationError:
        raise HTTPException(422, 'Nombre o biografía inválidos') from None
    raw = await file.read(MAX_BYTES + 1)
    return APIResponse(message='Foto y perfil guardados', data=await save_avatar(
        ProfileRepository(repository), AvatarStorage(repository), raw, file.content_type, changes,
    ))


@router.get('/{username}/capabilities', response_model=APIResponse[CapabilityListResponse])
async def profile_capabilities(username: Username, repository: Repository, cursor: UUID | None = None,
                               limit: Annotated[int, Query(ge=1, le=100)] = 20):
    return APIResponse(data=await ProfileRepository(repository).public_capabilities(username, cursor, limit))


@router.get('/{username}/activity')
async def profile_activity(username: Username, repository: Repository):
    await ProfileRepository(repository).get(username)
    raise HTTPException(503, 'La actividad del perfil todavía no está integrada con el historial privado')


@router.get('/{username}', response_model=APIResponse[UserProfile])
async def get_profile(username: Username, repository: Repository):
    return APIResponse(data=await ProfileRepository(repository).get(username))
