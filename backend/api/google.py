"""Conectar la cuenta de Google de la persona (fase 6, SQL 19).

El callback de Google no trae la sesión de Capacita, así que no toca tokens: solo devuelve el
navegador al frontend con código y state. El frontend (con sesión) llama a /complete, que consume
el state de ESA cuenta (un solo uso), cambia el código con PKCE y guarda el token ya cifrado.
"""
import asyncio
from urllib.parse import quote

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field

from api.capabilities import Repository
from core.config import settings
from core.responses import APIResponse
from services import google_oauth

router = APIRouter(prefix="/google", tags=["Google"])
MENSAJES = {
    "google_rejected": "Google rechazó la conexión. Vuelve a intentarlo desde Configuración.",
    "google_unavailable": "No se pudo hablar con Google. Intenta de nuevo en un momento.",
    "google_no_refresh": "Google no entregó el permiso permanente. Desconecta Capacita en tu cuenta de Google y vuelve a conectar.",
    "google_no_email": "Google no confirmó tu correo.",
    "google_key_invalid": "La clave de cifrado de Google no está bien configurada en el servidor.",
    "google_token_invalid": "El permiso guardado no se pudo leer; vuelve a conectar Google.",
}


class Completar(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(min_length=10, max_length=2048)
    state: str = Field(pattern=r"^[A-Za-z0-9_-]{32,128}$")


async def rpc(repository, nombre, **datos):
    return await repository.gateway.request("POST", f"/rest/v1/rpc/{nombre}", repository.token, json=datos)


def falla(error):
    return HTTPException(502, MENSAJES.get(error.code, "No se pudo completar la conexión con Google."))


@router.get("/status", response_model=APIResponse[dict])
async def status(repository: Repository):
    if not google_oauth.disponible():
        return APIResponse(data={"available": False, "linked": False})
    estado = await rpc(repository, "google_link_status")
    return APIResponse(data={"available": True, "linked": bool(estado.get("linked")), "email": estado.get("email"),
                             "linked_at": estado.get("linked_at")})


@router.post("/connect", response_model=APIResponse[dict])
async def connect(repository: Repository):
    if not google_oauth.disponible():
        raise HTTPException(503, "Google no está configurado en este Capacita")
    state, verifier, url = google_oauth.nuevo_inicio()
    await rpc(repository, "google_link_start", p_state=state, p_verifier=verifier)
    return APIResponse(data={"url": url})


@router.get("/callback", include_in_schema=False)
async def callback(code: str = "", state: str = "", error: str = ""):
    base = settings.FRONTEND_URL.rstrip("/") + "/#configuracion/google"
    if error or not code or not state:
        return RedirectResponse(f"{base}-error/{quote(error or 'cancelado', safe='')[:60]}", status_code=303)
    return RedirectResponse(f"{base}/{quote(code[:2048], safe='')}/{quote(state[:128], safe='')}", status_code=303)


@router.post("/complete", response_model=APIResponse[dict])
async def complete(payload: Completar, repository: Repository):
    if not google_oauth.disponible():
        raise HTTPException(503, "Google no está configurado en este Capacita")
    verifier = (await rpc(repository, "google_state_take", p_state=payload.state))["verifier"]
    try:
        refresh, email, scopes = await asyncio.to_thread(google_oauth.canjear_codigo, payload.code, verifier)
        cifrado = google_oauth.cifrar(refresh)
    except google_oauth.GoogleError as error:
        raise falla(error) from None
    await rpc(repository, "google_link_save", p_token=cifrado, p_email=email, p_scopes=scopes[:2000])
    return APIResponse(data={"linked": True, "email": email})


@router.delete("/link", response_model=APIResponse[dict])
async def unlink(repository: Repository):
    resultado = await rpc(repository, "google_unlink")
    revocado = False
    if resultado.get("token_cifrado"):
        try:
            revocado = await asyncio.to_thread(google_oauth.revocar, google_oauth.descifrar(resultado["token_cifrado"]))
        except google_oauth.GoogleError:
            revocado = False
    return APIResponse(data={"linked": False, "revoked": revocado})
