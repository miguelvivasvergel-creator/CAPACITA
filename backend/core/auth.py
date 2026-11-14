"""Identidad verificada por Supabase Auth, sin usuarios de demostración."""
from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from core.supabase import SupabaseGateway, get_supabase_gateway

bearer = HTTPBearer(auto_error=False)


def unauthorized() -> HTTPException:
    return HTTPException(401, "Sesión inválida o expirada", headers={"WWW-Authenticate": "Bearer"})


async def get_access_token(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> str:
    if credentials is None or len(credentials.credentials) > 8192:
        raise unauthorized()
    return credentials.credentials


async def get_current_user(
    token: Annotated[str, Depends(get_access_token)],
    gateway: Annotated[SupabaseGateway, Depends(get_supabase_gateway)],
) -> dict:
    # Auth valida firma, expiración y proyecto; nunca confiar en un JWT solo decodificado.
    user = await gateway.request("GET", "/auth/v1/user", token)
    try:
        user_id = str(UUID(user["id"]))
    except (KeyError, TypeError, ValueError):
        raise unauthorized() from None
    profiles = await gateway.request(
        "GET", "/rest/v1/profiles", token,
        params={"id": f"eq.{user_id}", "select": "id,username,display_name,bio,avatar_url,created_at", "limit": "1"},
    )
    profile = profiles[0] if profiles else {}
    return {
        "id": user_id,
        "username": profile.get("username") or user_id,
        "display_name": profile.get("display_name") or "Usuario",
        "bio": profile.get("bio") or "",
        "avatar_url": profile.get("avatar_url"),
        "created_at": profile.get("created_at") or user.get("created_at"),
    }
