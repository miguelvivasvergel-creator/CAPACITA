"""Escucha del bot de Telegram en el trabajador: vincular y desvincular chats (fase 3, SQL 16).

Sondeo corto (getUpdates sin espera) entre trabajos; sin webhook ni puerto abierto. Solo chats
privados. El token vive en backend/.env y nunca se imprime: los errores son códigos fijos.
"""
import re

import httpx

API = "https://api.telegram.org/bot{token}/{metodo}"
CODIGO = re.compile(r"\b([0-9A-Fa-f]{12})\b")
AYUDA = ("Hola 👋 Soy el bot de Capacita. Para recibir aquí tus resultados, abre Capacita → Configuración → "
         "«Conectar Telegram» y toca el enlace que aparece. Para dejar de recibir mensajes escribe /salir.")


def leer_comando(mensaje):
    """(accion, codigo) para un mensaje privado: ('salir', None), ('vincular', código) o ('ayuda', None)."""
    texto = str(mensaje.get("text") or "").strip()
    if texto.lower().startswith(("/salir", "/stop")):
        return "salir", None
    encontrado = CODIGO.search(texto)
    return ("vincular", encontrado.group(1).upper()) if encontrado else ("ayuda", None)


class TelegramBot:
    def __init__(self, token, transport=None):
        self.token, self.transport, self.offset = token, transport, None

    def _llamar(self, metodo, cuerpo):
        try:
            with httpx.Client(transport=self.transport, timeout=15, follow_redirects=False) as client:
                respuesta = client.post(API.format(token=self.token, metodo=metodo), json=cuerpo)
            data = respuesta.json()
        except (httpx.HTTPError, ValueError):
            raise RuntimeError("telegram_unavailable") from None
        if not isinstance(data, dict) or data.get("ok") is not True:
            raise RuntimeError("telegram_rejected")
        return data.get("result")

    def novedades(self):
        cuerpo = {"timeout": 0, "allowed_updates": ["message"], "limit": 20}
        if self.offset is not None:
            cuerpo["offset"] = self.offset
        resultado = self._llamar("getUpdates", cuerpo) or []
        mensajes = []
        for update in resultado:
            self.offset = max(self.offset or 0, int(update.get("update_id", 0)) + 1)
            mensaje = update.get("message") or {}
            chat = mensaje.get("chat") or {}
            if chat.get("type") == "private" and isinstance(chat.get("id"), int):
                mensajes.append((chat["id"], mensaje))
        return mensajes

    def responder(self, chat_id, texto):
        self._llamar("sendMessage", {"chat_id": chat_id, "text": texto, "link_preview_options": {"is_disabled": True}})


async def atender(bot, rpc, session_id, to_thread):
    """Procesa los mensajes pendientes. rpc(nombre, **datos) llama a las funciones SQL 16."""
    for chat_id, mensaje in await to_thread(bot.novedades):
        accion, codigo = leer_comando(mensaje)
        if accion == "salir":
            await rpc("telegram_unlink_chat", p_session=session_id, p_chat_id=chat_id)
            texto = "Listo: desvinculé este chat. Ya no te enviaré resultados. Puedes volver a conectarlo desde Capacita."
        elif accion == "vincular":
            resultado = await rpc("telegram_link_complete", p_session=session_id, p_code=codigo, p_chat_id=chat_id)
            if resultado.get("linked"):
                usuario = resultado.get("username")
                texto = (f"¡Listo! Vinculé este chat con tu cuenta de Capacita{f' (@{usuario})' if usuario else ''}. "
                         "Aquí recibirás los resultados que pidas enviar a Telegram. Para desvincularlo escribe /salir.")
            else:
                texto = "Ese código no sirve o ya venció (dura 15 minutos). Genera otro en Capacita → Configuración."
        else:
            texto = AYUDA
        await to_thread(bot.responder, chat_id, texto)
