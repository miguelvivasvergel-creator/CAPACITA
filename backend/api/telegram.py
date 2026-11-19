"""Vincular el chat de Telegram de la persona (fase 3, SQL 16). El trabajador completa el vínculo
cuando la persona abre el enlace y toca «Iniciar»; aquí solo se genera el código y se consulta."""
from fastapi import APIRouter, HTTPException

from api.capabilities import Repository
from core.config import settings
from core.responses import APIResponse

router = APIRouter(prefix="/telegram", tags=["Telegram"])


def disponible():
    return bool(settings.TELEGRAM_BOT_TOKEN.get_secret_value() and settings.TELEGRAM_BOT_USERNAME)


async def rpc(repository, nombre):
    return await repository.gateway.request("POST", f"/rest/v1/rpc/{nombre}", repository.token, json={})


@router.get("/status", response_model=APIResponse[dict])
async def status(repository: Repository):
    if not disponible():
        return APIResponse(data={"available": False, "linked": False})
    estado = await rpc(repository, "telegram_link_status")
    return APIResponse(data={"available": True, "linked": bool(estado.get("linked")),
                             "linked_at": estado.get("linked_at"), "bot_username": settings.TELEGRAM_BOT_USERNAME})


@router.post("/link", response_model=APIResponse[dict])
async def link(repository: Repository):
    if not disponible():
        raise HTTPException(503, "Telegram no está configurado en este Capacita")
    codigo = await rpc(repository, "telegram_link_start")
    url = f"https://t.me/{settings.TELEGRAM_BOT_USERNAME}?start={codigo['code']}"
    return APIResponse(data={"code": codigo["code"], "expires_at": codigo["expires_at"], "url": url,
                             "bot_username": settings.TELEGRAM_BOT_USERNAME})


@router.delete("/link", response_model=APIResponse[dict])
async def unlink(repository: Repository):
    return APIResponse(data=await rpc(repository, "telegram_unlink"))
