"""Bot de Telegram de Capacita, dentro del trabajador (SQL 16 y 21).

Vincula y desvincula el chat, y además deja pedir cosas en lenguaje normal (con la misma lista de
verificación que la web), ejecutar soluciones guardadas, mandar fotos, archivos, notas de voz y la
ubicación, ver /asistentes e /historial y aprobar con botones. El bot NUNCA ejecuta: propone, y lo
que la persona aprueba se encola con funciones SQL del trabajador que deducen al dueño del chat.

Seguridad: solo chats privados ya vinculados; los botones llevan un id corto de telegram_pending
(lo que confirman vive en la base, vence en 30 min y se consume al tocarlo); nada se manda a Gemini
sin el consentimiento del chat (/permitir); el texto de la persona y de la IA se escapa siempre.
El token vive en backend/.env y nunca se imprime: los errores son códigos fijos.
"""
import asyncio
import base64
import html
import re
import time
from collections import deque
from uuid import uuid4

import httpx
from fastapi import HTTPException
from jsonschema import Draft202012Validator

API = "https://api.telegram.org/bot{token}/{metodo}"
ARCHIVOS = "https://api.telegram.org/file/bot{token}/{ruta}"
CODIGO = re.compile(r"\b([0-9A-Fa-f]{12})\b")
COMANDO = re.compile(r"^/([a-zA-Z_]+)(?:@\w+)?\s*(.*)$", re.S)
# Saludos, agradecimientos y monosílabos: se contestan sin IA (no son pedidos).
GRACIAS = r"(mil )?gracias( (por todo|amig[oa]))?|genial|perfecto|listo|ok|okay|vale|👍|🙏|❤️"
CHARLA = re.compile(r"(?i)[¡!¿?.,\s]*(hola+|holi+|hey|buenas|buen[oa]s? (d[ií]as?|tardes?|noches?)|qu[eé] tal|"
                    rf"{GRACIAS}|s[ií]|no|ja(ja)+|je(je)+|😊|🙂|👋)[¡!¿?.,\s]*")
AGRADECIMIENTO = re.compile(rf"(?i)[¡!¿?.,\s]*({GRACIAS})[¡!¿?.,\s]*")
MAX_ARCHIVO = 3_000_000  # en base64 queda bajo los 4 MB que admite una entrada de archivo (db/12)
MAX_VOZ = 2_000_000
ESPERA = 25  # segundos de long polling: el bot contesta al instante aunque haya un trabajo corriendo
AYUDA = ("Hola 👋 Soy el bot de Capacita. Para recibir aquí tus resultados, abre Capacita → Configuración → "
         "«Conectar Telegram» y toca el enlace que aparece. Para dejar de recibir mensajes escribe /salir.")
AYUDA_VINCULADO = (
    "Hola 👋 Soy Capacita. Puedo hacer cosas por ti con tus herramientas y conectores:\n\n"
    "• Escríbeme lo que necesitas («arma mi itinerario a Santa Marta y mándaselo a Ana en inglés»).\n"
    "• Mándame una foto, un PDF o un Excel (con o sin instrucciones), una nota de voz o tu ubicación.\n"
    "• /soluciones ejecuta una de tus soluciones guardadas.\n"
    "• /asistentes los pausa, reanuda o ejecuta ya; /historial muestra tus últimos resultados.\n"
    "• /permitir autoriza usar la IA (Gemini); /cancelar corta lo que esté en curso; /salir desvincula el chat.\n\n"
    "Nada se ejecuta sin que toques «Aprobar».")
COMANDOS = [("pedir", "Pídeme algo con tus palabras"), ("soluciones", "Ejecutar una de tus soluciones"),
            ("asistentes", "Ver, pausar o ejecutar tus asistentes"), ("historial", "Tus últimos resultados"),
            ("permitir", "Autorizar el uso de la IA (Gemini)"), ("cancelar", "Cancelar lo que estaba en curso"),
            ("ayuda", "Qué puedo hacer"), ("salir", "Desvincular este chat")]
ESTADOS = {"completed": "✅", "failed": "❌", "running": "▶️", "pending": "▫️", "skipped": "⏭", "queued": "⏳",
           "testing": "⏳", "interrupted": "⚠️"}
ERRORES = {"queue_full": "Ya tienes 3 ejecuciones en curso (o la cola está llena). Espera a que terminen.",
           "version_unavailable": "Una de las piezas ya no está disponible para tu cuenta.",
           "revision_changed": "Esa solución cambió desde que te la mostré. Vuelve a abrirla con /soluciones.",
           "node_limit": "El plan tiene más pasos de los permitidos (20).", "not_linked": "Este chat ya no está vinculado.",
           "not_found": "No encontré eso en tu cuenta."}
FOTO = [("📝 Leer el texto", "Lee el texto de esta foto y envíamelo por Telegram."),
        ("🧾 Datos de la factura", "Saca los datos de esta factura (proveedor, fecha, total y artículos) y envíamelos por Telegram."),
        ("🎨 Hacer un póster", "Con esta foto de mi producto hazme un póster promocional y envíamelo por Telegram."),
        ("✂️ Quitar el fondo", "Quítale el fondo a esta foto y envíamela por Telegram."),
        ("💬 Describirla", "Describe esta foto con detalle y envíamelo por Telegram.")]
DOCUMENTO = [("📄 Resumir", "Resume este documento en puntos claros y envíamelo por Telegram."),
             ("🗒️ Sacar las tareas y fechas", "Saca de este documento las tareas, responsables y fechas, y envíamelas por Telegram.")]
HOJA = [("📊 Resumir la hoja", "Analiza esta hoja de cálculo y envíame por Telegram un resumen con los datos más importantes."),
        ("📈 Hacer un gráfico", "Haz un gráfico con los datos de esta hoja y envíamelo por Telegram.")]
CERCA = [("💊 Farmacias", "farmacia"), ("🏧 Cajeros", "cajero"), ("🍽️ Restaurantes", "restaurante"),
         ("🏥 Hospitales", "hospital"), ("⛽ Gasolineras", "gasolinera")]


def leer_comando(mensaje):
    """(accion, codigo) para vincular: ('salir', None), ('vincular', código) o ('ayuda', None)."""
    texto = str(mensaje.get("text") or "").strip()
    if texto.lower().startswith(("/salir", "/stop")):
        return "salir", None
    encontrado = CODIGO.search(texto)
    return ("vincular", encontrado.group(1).upper()) if encontrado else ("ayuda", None)


def comando(texto):
    """('pedir', 'resto') para «/pedir resto» (sin @nombre_del_bot) o (None, texto)."""
    encontrado = COMANDO.match(texto or "")
    return (encontrado.group(1).lower(), encontrado.group(2).strip()) if encontrado else (None, texto or "")


def e(texto):
    return html.escape(str(texto or ""), quote=False)


def tipo_de(datos):
    """Tipo MIME por la firma del archivo (nunca por el nombre que manda Telegram), o None."""
    from connectors.telegram import FIRMAS, OFFICE
    for firma, tipo, _ in FIRMAS:
        if datos.startswith(firma):
            return tipo
    if datos.startswith(b"PK"):
        for marca, (tipo, _) in OFFICE.items():
            if marca.encode() in datos[:200000]:
                return tipo
    return None


class TelegramBot:
    def __init__(self, token, transport=None):
        self.token, self.transport, self.offset = token, transport, None

    def _llamar(self, metodo, cuerpo, timeout=15, archivos=None):
        try:
            with httpx.Client(transport=self.transport, timeout=timeout, follow_redirects=False) as client:
                url = API.format(token=self.token, metodo=metodo)
                respuesta = client.post(url, data=cuerpo, files=archivos) if archivos else client.post(url, json=cuerpo)
            data = respuesta.json()
        except (httpx.HTTPError, ValueError):
            raise RuntimeError("telegram_unavailable") from None
        if not isinstance(data, dict) or data.get("ok") is not True:
            raise RuntimeError("telegram_rejected")
        return data.get("result")

    def novedades(self, espera=0):
        """[(chat_id, evento)] de chats privados: el mensaje, o {"_boton": callback_query}."""
        cuerpo = {"timeout": espera, "allowed_updates": ["message", "callback_query"], "limit": 20}
        if self.offset is not None:
            cuerpo["offset"] = self.offset
        resultado = self._llamar("getUpdates", cuerpo, timeout=espera + 10) or []
        eventos = []
        for update in resultado:
            self.offset = max(self.offset or 0, int(update.get("update_id", 0)) + 1)
            boton = update.get("callback_query") or {}
            mensaje = update.get("message") or (boton.get("message") or {})
            chat = mensaje.get("chat") or {}
            if chat.get("type") != "private" or not isinstance(chat.get("id"), int):
                continue
            eventos.append((chat["id"], {"_boton": boton} if boton else mensaje))
        return eventos

    def responder(self, chat_id, texto, botones=None, html_=False):
        cuerpo = {"chat_id": chat_id, "text": str(texto)[:4000], "link_preview_options": {"is_disabled": True}}
        if html_:
            cuerpo["parse_mode"] = "HTML"
        if botones:
            cuerpo["reply_markup"] = {"inline_keyboard": botones}
        resultado = self._llamar("sendMessage", cuerpo)
        return resultado.get("message_id") if isinstance(resultado, dict) else None

    def editar(self, chat_id, message_id, texto, html_=False):
        cuerpo = {"chat_id": chat_id, "message_id": message_id, "text": str(texto)[:4000],
                  "link_preview_options": {"is_disabled": True}}
        if html_:
            cuerpo["parse_mode"] = "HTML"
        self._llamar("editMessageText", cuerpo)

    def contestar(self, callback_id, texto=""):
        self._llamar("answerCallbackQuery", {"callback_query_id": callback_id, "text": texto[:180]})

    def quitar_botones(self, chat_id, message_id):
        self._llamar("editMessageReplyMarkup", {"chat_id": chat_id, "message_id": message_id,
                                                "reply_markup": {"inline_keyboard": []}})

    def menu(self):
        self._llamar("setMyCommands", {"commands": [{"command": c, "description": d} for c, d in COMANDOS]})

    def descargar(self, file_id, maximo):
        """Bytes del archivo que mandó la persona (o RuntimeError si pasa del máximo)."""
        info = self._llamar("getFile", {"file_id": str(file_id)}) or {}
        ruta = str(info.get("file_path") or "")
        if not ruta or int(info.get("file_size") or 0) > maximo or ".." in ruta:
            raise RuntimeError("telegram_file_too_large")
        try:
            with httpx.Client(transport=self.transport, timeout=30, follow_redirects=False) as client:
                with client.stream("GET", ARCHIVOS.format(token=self.token, ruta=ruta)) as respuesta:
                    if respuesta.status_code != 200:
                        raise RuntimeError("telegram_unavailable")
                    datos = bytearray()
                    for trozo in respuesta.iter_bytes():
                        datos.extend(trozo)
                        if len(datos) > maximo:
                            raise RuntimeError("telegram_file_too_large")
        except httpx.HTTPError:
            raise RuntimeError("telegram_unavailable") from None
        return bytes(datos)

    def enviar_archivo(self, chat_id, nombre, datos, tipo, leyenda=""):
        foto = tipo in ("image/jpeg", "image/png")
        cuerpo = {"chat_id": str(chat_id)} | ({"caption": leyenda[:900]} if leyenda else {})
        self._llamar("sendPhoto" if foto else "sendDocument", cuerpo, timeout=60,
                     archivos={"photo" if foto else "document": (nombre, datos, tipo)})


# ---------- Conversación con un chat ----------

class Chat:
    """Lo que el router necesita de un chat: hablar, botones y las funciones SQL de ESE chat."""

    def __init__(self, bot, rpc, sesion, to_thread, chat_id, servicios):
        self.bot, self.rpc, self.sesion, self.to_thread = bot, rpc, sesion, to_thread
        self.id, self.servicios = chat_id, servicios

    async def decir(self, texto, botones=None, html_=False):
        return await self.to_thread(self.bot.responder, self.id, texto, botones, html_)

    async def editar(self, mensaje_id, texto, html_=False):
        if mensaje_id is None:
            return await self.decir(texto, html_=html_)
        try:
            await self.to_thread(self.bot.editar, self.id, mensaje_id, texto, html_)
        except RuntimeError:
            await self.decir(texto, html_=html_)

    async def sql(self, nombre, **datos):
        return await self.rpc(nombre, p_session=self.sesion, p_chat=self.id, **datos)

    async def opciones(self, texto, acciones, html_=False, extra=None):
        """Mensaje con botones. acciones: [(etiqueta, acción)]. Lo que confirman queda en la base."""
        guardado = await self.sql("telegram_pending_put", p_kind="botones",
                                  p_payload={"acciones": [accion for _, accion in acciones], **(extra or {})})
        filas = [[{"text": etiqueta[:60], "callback_data": f"{guardado['id']}:{indice}"}]
                 for indice, (etiqueta, _) in enumerate(acciones)]
        return await self.decir(texto, filas, html_)

    async def conversar(self, payload):
        await self.sql("telegram_pending_put", p_kind="conversacion", p_payload=payload)


def explicar(error):
    """Frase para la persona (nunca el detalle interno ni datos del servidor)."""
    if isinstance(error, HTTPException):
        detalle = str(error.detail)
        for codigo, frase in ERRORES.items():
            if codigo in detalle:
                return frase
        if error.status_code in (429, 502, 503):
            return detalle  # textos propios en español: cuota, IA ocupada, sin piezas…
    if isinstance(error, ValueError) and "Ruta Supabase" in str(error):
        return "Me falta una actualización del servidor (SQL 21). Avísale a quien administra Capacita."
    if isinstance(error, RuntimeError) and str(error) == "telegram_file_too_large":
        return "Ese archivo es muy grande para mí (máximo 3 MB; notas de voz, 2 MB)."
    return "Algo falló de mi lado y no hice nada. Inténtalo de nuevo en un momento."


class Limite:
    """Pedidos por chat y por hora (además del limitador de la IA): el bot es abierto a escribirle."""

    def __init__(self, por_hora=30, reloj=time.monotonic):
        self.por_hora, self.reloj, self.vistos = por_hora, reloj, {}

    def permitir(self, chat_id):
        ahora = self.reloj()
        cola = self.vistos.setdefault(chat_id, deque())
        while cola and ahora - cola[0] > 3600:
            cola.popleft()
        if len(cola) >= self.por_hora:
            return False
        cola.append(ahora)
        return True


class Rafaga:
    """Freno de inundaciones ANTES de tocar la base o la IA: el bot es público y cualquiera puede
    escribirle miles de mensajes (vinculado o no). Por chat: 6 eventos en 10 s y 25 por minuto. Lo que
    pasa del tope se ignora; se avisa una sola vez por minuto para no responder a cada mensaje."""

    def __init__(self, por_10s=6, por_minuto=25, reloj=time.monotonic):
        self.por_10s, self.por_minuto, self.reloj, self.vistos, self.avisado = por_10s, por_minuto, reloj, {}, {}

    def permitir(self, chat_id):
        """'si', 'avisar' (el primer rechazo del minuto) o 'no'."""
        ahora = self.reloj()
        if len(self.vistos) > 5000:  # memoria acotada: se olvidan los chats quietos
            self.vistos = {c: v for c, v in self.vistos.items() if v and ahora - v[-1] < 60}
            self.avisado = {c: t for c, t in self.avisado.items() if ahora - t < 60}
        cola = self.vistos.setdefault(chat_id, deque())
        while cola and ahora - cola[0] >= 60:
            cola.popleft()
        if len(cola) >= self.por_minuto or sum(1 for t in cola if ahora - t < 10) >= self.por_10s:
            if ahora - self.avisado.get(chat_id, float("-inf")) >= 60:
                self.avisado[chat_id] = ahora
                return "avisar"
            return "no"
        cola.append(ahora)
        return "si"


MAX_EN_CURSO = 40  # chats atendiéndose a la vez; lo demás se descarta (no tumba el trabajador)


async def atender(bot, rpc, session_id, to_thread, servicios=None, espera=0, esperar=True):
    """Procesa los mensajes y botones pendientes. Cada chat va en orden; chats distintos, en paralelo."""
    eventos = await to_thread(bot.novedades, espera)
    rafaga = getattr(servicios, "rafaga", None) if servicios is not None else None
    en_curso = getattr(servicios, "tareas", None) if servicios is not None else None
    admitidos = []
    for chat_id, evento in eventos:
        veredicto = rafaga.permitir(chat_id) if rafaga is not None else "si"
        if veredicto == "avisar":
            try:
                await to_thread(bot.responder, chat_id, "Vas muy rápido 🙂 Espera un minuto y vuelve a escribirme.")
            except RuntimeError:
                pass
        if veredicto != "si" or (en_curso is not None and len(en_curso) + len(admitidos) >= MAX_EN_CURSO):
            continue
        admitidos.append((chat_id, evento))
    eventos = admitidos
    candados = getattr(servicios, "candados", None) if servicios is not None else None
    if candados is None:
        candados = {}

    async def uno(chat_id, evento):
        chat = Chat(bot, rpc, session_id, to_thread, chat_id, servicios)
        async with candados.setdefault(chat_id, asyncio.Lock()):
            try:
                if "_boton" in evento:
                    await al_tocar(chat, evento["_boton"])
                else:
                    await al_recibir(chat, evento)
            except Exception as error:  # un mensaje nunca tumba al bot
                # Solo el tipo y nuestro código fijo (nunca el detalle, que podría traer datos del servidor).
                codigo = str(getattr(error, "detail", "") or error) if isinstance(error, (HTTPException, RuntimeError)) else ""
                print(f"Bot de Telegram: {type(error).__name__} {codigo[:80]}".rstrip(), flush=True)
                try:
                    await chat.decir(explicar(error))
                except Exception:
                    pass

    tareas = [asyncio.ensure_future(uno(chat_id, evento)) for chat_id, evento in eventos]
    if esperar and tareas:
        await asyncio.gather(*tareas)
    return tareas


async def al_recibir(chat, mensaje):
    texto = str(mensaje.get("text") or mensaje.get("caption") or "").strip()
    nombre, resto = comando(texto)
    accion, codigo = leer_comando({"text": texto})
    if accion == "salir":
        await chat.rpc("telegram_unlink_chat", p_session=chat.sesion, p_chat_id=chat.id)
        await chat.decir("Listo: desvinculé este chat. Ya no te enviaré resultados. Puedes volver a conectarlo desde Capacita.")
        return
    # Solo «/start CÓDIGO» (el enlace de Configuración) o el código solo: un pedido que por casualidad
    # trae 12 letras y números no intenta vincular nada.
    if accion == "vincular" and (nombre == "start" or texto.strip().upper() == codigo):
        resultado = await chat.rpc("telegram_link_complete", p_session=chat.sesion, p_code=codigo, p_chat_id=chat.id)
        if resultado.get("linked"):
            usuario = resultado.get("username")
            await chat.decir(f"¡Listo! Vinculé este chat con tu cuenta de Capacita{f' (@{usuario})' if usuario else ''}. "
                             "Aquí recibirás los resultados que pidas enviar a Telegram, y puedes pedirme cosas: "
                             "escribe /ayuda para ver qué hago. Para desvincularlo escribe /salir.")
        else:
            await chat.decir("Ese código no sirve o ya venció (dura 15 minutos). Genera otro en Capacita → Configuración.")
        return
    dueno = await chat.sql("telegram_owner")
    if not dueno.get("linked"):
        await chat.decir(AYUDA)
        return
    if nombre in ("start", "ayuda", "help"):
        await chat.decir(AYUDA_VINCULADO)
        return
    if nombre == "cancelar":
        await chat.sql("telegram_pending_take", p_id=None, p_consume=True)
        await chat.decir("Listo, cancelé lo que estaba en curso. No se ejecutó nada.")
        return
    if nombre == "permitir":
        await pedir_permiso(chat, None)
        return
    if nombre == "soluciones":
        await soluciones(chat)
        return
    if nombre == "asistentes":
        await asistentes(chat)
        return
    if nombre == "historial":
        await historial(chat)
        return
    if nombre is None:
        abierta = await chat.sql("telegram_pending_take", p_id=None, p_consume=False)
        if abierta.get("found"):
            await continuar(chat, abierta["payload"], mensaje, texto)
            return
    if mensaje.get("location"):
        await ubicacion(chat, mensaje["location"])
        return
    if mensaje.get("voice") or mensaje.get("audio"):
        await nota_de_voz(chat, dueno, mensaje.get("voice") or mensaje.get("audio"))
        return
    if mensaje.get("photo") or mensaje.get("document"):
        archivo = await adjunto(chat, mensaje)
        if archivo is None:
            return
        if texto:
            await pedido(chat, dueno, texto, archivo)
        else:
            await que_hago_con(chat, archivo)
        return
    pedir_texto = resto if nombre == "pedir" else (texto if nombre is None else "")
    if not pedir_texto:
        await chat.decir("No conozco ese comando. " + AYUDA_VINCULADO if nombre else AYUDA_VINCULADO)
        return
    if CHARLA.fullmatch(pedir_texto.strip()):
        # «hola», «gracias», «ok», un emoji: no es un pedido. Antes pasaba por el planner (2-3 llamadas a la
        # IA) y respondía con preguntas raras; ahora se contesta al instante y sin gastar cuota.
        await chat.decir("¡Con gusto! 🙌" if AGRADECIMIENTO.fullmatch(pedir_texto.strip())
                         else "¡Hola! 👋 Dime qué necesitas, por ejemplo «el clima de mañana en Valledupar» "
                              "(o /ayuda para ver todo lo que hago).")
        return
    await pedido(chat, dueno, pedir_texto)


async def al_tocar(chat, boton):
    """Un botón vale una vez: se consume en la base y en el acto se quitan TODOS los botones de su mensaje.
    Antes quedaban a la vista mientras el planner pensaba (~20 s); la persona volvía a tocar y, al
    terminar, le llegaba «ya se usó» en medio de la conversación. Un botón viejo o repetido solo recibe
    un aviso flotante (no un mensaje) y también pierde los botones."""
    ident, _, indice = str(boton.get("data") or "").partition(":")
    valido = bool(re.fullmatch(r"[0-9a-f-]{36}", ident)) and indice.isdigit()
    guardado = await chat.sql("telegram_pending_take", p_id=ident, p_consume=True) if valido else {}
    encontrado = bool(guardado.get("found"))
    aviso = "" if encontrado else "Ese botón ya se usó o venció. Pídemelo de nuevo."
    mensaje_id = (boton.get("message") or {}).get("message_id")
    llamadas = [(chat.bot.contestar, boton.get("id"), aviso)]
    if isinstance(mensaje_id, int):
        llamadas.append((chat.bot.quitar_botones, chat.id, mensaje_id))
    for llamada, *datos in llamadas:
        try:
            await chat.to_thread(llamada, *datos)
        except RuntimeError:
            pass  # el aviso venció o el mensaje ya no tiene botones: nada que hacer
    if not encontrado:
        return
    payload = guardado["payload"] or {}
    acciones = payload.get("acciones") or []
    if int(indice) >= len(acciones):
        return
    await despachar(chat, acciones[int(indice)], payload)


async def despachar(chat, accion, payload=None):
    tipo = accion.get("tipo")
    if tipo == "cancelar":
        await chat.decir("Cancelado. No se ejecutó nada.")
    elif tipo == "consentir":
        await chat.sql("telegram_set_consent", p_consent=bool(accion.get("valor")))
        if not accion.get("valor"):
            await chat.decir("Entendido: no usaré la IA. Puedes ejecutar tus /soluciones que no la usan. Cambia de opinión con /permitir.")
            return
        await chat.decir("Gracias. Ya puedo usar la IA (Gemini) con lo que me escribas o envíes.")
        if accion.get("luego"):
            await despachar(chat, accion["luego"], payload)
    elif tipo == "pedido":
        dueno = await chat.sql("telegram_owner")
        archivo = (payload or {}).get("archivo") if accion.get("con_archivo") else accion.get("archivo")
        await pedido(chat, dueno, accion.get("texto", ""), archivo)
    elif tipo == "aprobar":
        await aprobar(chat, accion)
    elif tipo == "solucion":
        await abrir_solucion(chat, accion.get("id"))
    elif tipo == "cerca":
        await cerca(chat, accion)
    elif tipo == "asistente":
        await accion_asistente(chat, accion)
    elif tipo == "resultado":
        datos = await chat.sql("telegram_job_result", p_job=accion.get("id"))
        if datos.get("found"):
            await enviar_resultado(chat.bot, chat.id, datos.get("name") or "Tu solución", datos.get("status"),
                                   datos.get("report") or {}, datos.get("output"), to_thread=chat.to_thread)
        else:
            await chat.decir(ERRORES["not_found"])


# ---------- Pedidos en lenguaje normal (el mismo planner de la web) ----------

async def pedir_permiso(chat, luego):
    await chat.opciones(
        "Para entender lo que me escribes, tus fotos o notas de voz, tengo que enviarlos a la IA de Google (Gemini). "
        "No se guarda en tu chat ni se usa para otra cosa. ¿Me autorizas?",
        [("✅ Sí, autorizo", {"tipo": "consentir", "valor": True, "luego": luego}),
         ("No por ahora", {"tipo": "consentir", "valor": False})])


async def pedido(chat, dueno, texto, archivo=None, aclaraciones=""):
    from services.telegram_planner import planear_pedido
    if not dueno.get("consent"):
        await pedir_permiso(chat, {"tipo": "pedido", "texto": texto, "archivo": archivo})
        return
    limite = getattr(chat.servicios, "limite", None)
    if limite is not None and not limite.permitir(chat.id):
        await chat.decir("Ya me pediste muchas cosas esta hora. Inténtalo de nuevo más tarde.")
        return
    aviso = await chat.decir("🧠 Analizando tu pedido punto por punto…")
    objetivo = texto + (f"\nAclaraciones de la persona: {aclaraciones}" if aclaraciones else "")
    if archivo:
        objetivo += (f"\n(La persona adjuntó por Telegram un archivo {archivo.get('tipo')}: úsalo como la entrada "
                     "de archivo del proceso, declarada en input_schema.)")
    items = (await chat.sql("telegram_planner_versions")).get("items") or []
    propuesta, _ = await planear_pedido(objetivo, items, chat.servicios.provider, chat.id, chat.servicios.limits)
    if propuesta.decision == "clarify":
        await chat.conversar({"tipo": "aclarar", "texto": texto, "archivo": archivo, "aclaraciones": aclaraciones})
        preguntas = "\n".join(f"{n}. {p}" for n, p in enumerate(propuesta.questions, 1))
        await chat.editar(aviso, f"{propuesta.explanation}\n\n{preguntas}\n\nRespóndeme en un solo mensaje (o /cancelar).")
        return
    if not propuesta.definition:
        faltan = "\n".join(f"• {m}" for m in propuesta.missing)
        await chat.editar(aviso, f"{propuesta.explanation}\n\n{faltan}\n\nPara crear una herramienta nueva entra al "
                                 "Taller de Capacita en la web; desde aquí solo uso las que ya existen.".strip())
        return
    definicion = propuesta.definition.model_dump(mode="json")
    siguiente = {"tipo": "proponer", "modo": "nuevo", "definition": definicion, "explicacion": propuesta.explanation,
                 "requisitos": propuesta.requisitos, "pendientes": propuesta.pendientes}
    datos = {}
    if archivo:
        campo = next((c for c, spec in definicion["input_schema"].get("properties", {}).items()
                      if isinstance(spec, dict) and spec.get("contentEncoding") == "base64"), None)
        if campo:
            datos[campo] = archivo["base64"]
    await chat.editar(aviso, "🧠 Listo, revisé tu pedido. Te muestro el plan:")
    await pedir_datos(chat, definicion["input_schema"], datos, siguiente)


async def continuar(chat, conversacion, mensaje, texto):
    tipo = conversacion.get("tipo")
    if tipo == "aclarar":
        await chat.sql("telegram_pending_take", p_id=None, p_consume=True)
        dueno = await chat.sql("telegram_owner")
        previas = conversacion.get("aclaraciones") or ""
        await pedido(chat, dueno, conversacion.get("texto", ""), conversacion.get("archivo"),
                     (previas + " " + texto).strip()[:1500])
        return
    if tipo != "datos":
        await chat.sql("telegram_pending_take", p_id=None, p_consume=True)
        return
    from services.ajuste_contratos import ajustar, primer_error
    schema, datos, faltan = conversacion["schema"], dict(conversacion["datos"]), list(conversacion["faltan"])
    campo = faltan[0]
    spec = schema.get("properties", {}).get(campo, {})
    if spec.get("contentEncoding") == "base64":
        archivo = await adjunto(chat, mensaje) if (mensaje.get("photo") or mensaje.get("document")) else None
        if archivo is None:
            await chat.decir(f"Para «{titulo(campo, spec)}» necesito un archivo: envíame la foto o el documento (o /cancelar).")
            return
        valor = archivo["base64"]
    else:
        valor = ajustar(texto, spec)
        if not Draft202012Validator(spec).is_valid(valor):
            _, esperado = primer_error(spec, valor) or ("", "otro valor")
            await chat.decir(f"«{titulo(campo, spec)}» debe ser {esperado}. Escríbelo de nuevo (o /cancelar).")
            return
    datos[campo] = valor
    faltan.pop(0)
    if faltan:
        await chat.conversar(conversacion | {"datos": datos, "faltan": faltan})
        await preguntar(chat, faltan[0], schema.get("properties", {}).get(faltan[0], {}))
        return
    await chat.sql("telegram_pending_take", p_id=None, p_consume=True)
    await proponer(chat, conversacion["siguiente"], datos)


def titulo(campo, spec):
    return str(spec.get("title") or campo.replace("_", " "))


async def preguntar(chat, campo, spec):
    nombre = titulo(campo, spec)
    if spec.get("contentEncoding") == "base64":
        await chat.decir(f"📎 Envíame «{nombre}» (foto, PDF, Word o Excel). /cancelar para dejarlo.")
        return
    pista = f" ({spec['description']})" if spec.get("description") else ""
    if spec.get("enum"):
        pista += "\nOpciones: " + ", ".join(map(str, spec["enum"]))
    await chat.decir(f"✍️ ¿{nombre}?{pista}\n(/cancelar para dejarlo)")


async def pedir_datos(chat, schema, datos, siguiente):
    """Pide uno por uno los datos obligatorios que faltan y luego muestra la propuesta."""
    faltan = [campo for campo in (schema or {}).get("required", []) if campo not in datos]
    if not faltan:
        await proponer(chat, siguiente, datos)
        return
    await chat.conversar({"tipo": "datos", "schema": schema, "datos": datos, "faltan": faltan, "siguiente": siguiente})
    await preguntar(chat, faltan[0], schema.get("properties", {}).get(faltan[0], {}))


def resumen_plan(definicion, accion):
    """Texto HTML (todo escapado) con lo que hará: lista de verificación, pasos y a dónde llega."""
    from connectors import BY_VERSION
    lineas = [f"📋 <b>{e(definicion.get('name') or 'Tu solución')}</b>"]
    if accion.get("explicacion"):
        lineas.append(e(accion["explicacion"])[:900])
    pendientes = accion.get("pendientes") or []
    if len(accion.get("requisitos") or []) > 1:
        lineas.append("<b>Revisé tu pedido punto por punto</b>")
        lineas += [f"{'⚠️' if r in pendientes else '✓'} {e(r)}" for r in accion["requisitos"][:20]]
    lineas.append("<b>Pasos</b>")
    destinos, proveedores = [], set()
    for numero, nodo in enumerate(definicion.get("nodes", []), 1):
        lineas.append(f"{numero}. {e(nodo.get('label'))}")
        conector = BY_VERSION.get(str(nodo.get("version_id")))
        if conector is None:
            continue
        if conector.sends_content:
            proveedores.add(conector.provider)
        para = (nodo.get("values") or {}).get("para")
        if conector.key == "enviar_correo" and para:
            destinos.append(f"✉️ Correo a <b>{e(para)}</b>")
        elif conector.key == "enviar_correo":
            destinos.append("✉️ Correo a ti")
        elif conector.key == "enviar_telegram":
            destinos.append("💬 Este chat")
        elif conector.key == "guardar_drive":
            destinos.append("📁 Tu Google Drive")
        elif conector.key == "agendar_evento":
            destinos.append("📅 Tu Google Calendar")
    if destinos:
        lineas.append("<b>Llega a</b>\n" + "\n".join(dict.fromkeys(destinos)))
    if proveedores:
        lineas.append("🔐 Al aprobar aceptas que tu contenido viaje a: " + e(", ".join(sorted(proveedores))) + ".")
    return "\n\n".join(lineas)[:3900]


async def proponer(chat, accion, datos):
    definicion = accion["definition"]
    if not Draft202012Validator(definicion.get("input_schema") or {}).is_valid(datos):
        await chat.decir("Los datos no encajan con lo que necesita la solución. Pídemelo de nuevo.")
        return
    aprobar_ = {"tipo": "aprobar", "modo": accion["modo"], "datos": datos, "clave": "telegram:" + uuid4().hex,
                "nombre": definicion.get("name")}
    if accion["modo"] == "nuevo":
        aprobar_["definition"] = definicion
    else:
        aprobar_ |= {"workflow_id": accion["workflow_id"], "revision": accion["revision"], "hash": accion["hash"]}
    await chat.opciones(resumen_plan(definicion, accion),
                        [("✅ Aprobar y ejecutar", aprobar_), ("❌ Cancelar", {"tipo": "cancelar"})], html_=True)


async def aprobar(chat, accion):
    aviso = await chat.decir(f"⏳ En cola: {accion.get('nombre') or 'tu solución'}. Te aviso el avance aquí mismo.")
    comun = {"p_inputs": accion.get("datos") or {}, "p_key": accion["clave"], "p_message": aviso}
    if accion["modo"] == "nuevo":
        await chat.sql("telegram_save_and_run", p_definition=accion["definition"], **comun)
    else:
        await chat.sql("telegram_run_workflow", p_workflow=accion["workflow_id"], p_revision=accion["revision"],
                       p_hash=accion["hash"], **comun)


# ---------- Archivos, voz y ubicación ----------

async def adjunto(chat, mensaje):
    """{base64, tipo, nombre} del archivo o foto del mensaje; None (y aviso) si no sirve."""
    if mensaje.get("photo"):
        foto = max(mensaje["photo"], key=lambda f: int(f.get("file_size") or 0) or int(f.get("width") or 0))
        file_id, nombre = foto.get("file_id"), "foto.jpg"
    else:
        documento = mensaje.get("document") or {}
        file_id, nombre = documento.get("file_id"), str(documento.get("file_name") or "archivo")[:80]
        if int(documento.get("file_size") or 0) > MAX_ARCHIVO:
            await chat.decir(explicar(RuntimeError("telegram_file_too_large")))
            return None
    datos = await chat.to_thread(chat.bot.descargar, file_id, MAX_ARCHIVO)
    tipo = tipo_de(datos)
    if tipo is None:
        await chat.decir("Solo puedo trabajar con fotos (JPG o PNG), PDF, Word o Excel.")
        return None
    return {"base64": base64.b64encode(datos).decode(), "tipo": tipo, "nombre": nombre}


async def que_hago_con(chat, archivo):
    tipo = archivo["tipo"]
    lista = FOTO if tipo.startswith("image/") else HOJA if "spreadsheet" in tipo else DOCUMENTO
    await chat.opciones("¿Qué hago con esto? (También puedes reenviarlo con instrucciones escritas.)",
                        [(etiqueta, {"tipo": "pedido", "texto": texto, "con_archivo": True}) for etiqueta, texto in lista]
                        + [("❌ Nada", {"tipo": "cancelar"})], extra={"archivo": archivo})


async def nota_de_voz(chat, dueno, voz):
    if not dueno.get("consent"):
        await chat.decir("Para entender notas de voz necesito tu permiso para usar la IA.")
        await pedir_permiso(chat, None)
        return
    if int(voz.get("file_size") or 0) > MAX_VOZ:
        await chat.decir(explicar(RuntimeError("telegram_file_too_large")))
        return
    # Transcribir también usa la IA: cuenta en el mismo límite por chat que los pedidos (antes no contaba
    # y se podían mandar notas de voz sin tope).
    limite = getattr(chat.servicios, "limite", None)
    if limite is not None and not limite.permitir(chat.id):
        await chat.decir("Ya me pediste muchas cosas esta hora. Inténtalo de nuevo más tarde.")
        return
    datos = await chat.to_thread(chat.bot.descargar, voz.get("file_id"), MAX_VOZ)
    texto = await chat.servicios.provider.transcribir(datos, str(voz.get("mime_type") or "audio/ogg"))
    if not texto:
        await chat.decir("No logré entender la nota de voz. ¿Me la escribes?")
        return
    await chat.decir(f"🎙️ Entendí: «{texto[:600]}»")
    await pedido(chat, dueno, texto)


async def ubicacion(chat, lugar):
    lat, lon = lugar.get("latitude"), lugar.get("longitude")
    if not isinstance(lat, (int, float)) or not isinstance(lon, (int, float)):
        return
    coordenadas = f"{lat:.5f},{lon:.5f}"
    await chat.opciones("📍 Recibí tu ubicación. ¿Qué busco cerca de ti?",
                        [(etiqueta, {"tipo": "cerca", "que": que, "lugar": coordenadas}) for etiqueta, que in CERCA]
                        + [("🌤️ El clima aquí", {"tipo": "cerca", "que": "clima", "lugar": coordenadas}),
                           ("❌ Nada", {"tipo": "cancelar"})])


def plan_cerca(que, lugar):
    """Plan fijo de un paso (sin IA) para la ubicación: qué hay cerca o el clima de ahí."""
    from connectors import REGISTRY
    if que == "clima":
        conector, valores, parametros, salida = REGISTRY["clima_pronostico@2"], {"ciudad": lugar}, {}, "resumen"
        nombre = "El clima donde estás"
    else:
        conector, valores = REGISTRY["lugares_cercanos@1"], {"lugar": lugar}
        parametros, salida, nombre = {"que": que, "radio_metros": 1000}, "resumen", f"{que.capitalize()} cerca de ti"
    ejemplo = dict((conector.definition.get("examples") or [{}])[0].get("parameters") or {})
    return {"name": nombre[:80], "description": "Desde tu ubicación en Telegram",
            "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
            "nodes": [{"id": "consulta", "version_id": str(conector.version_id), "label": conector.definition["name"][:80],
                       "values": valores, "parameters": ejemplo | parametros, "bindings": {}}],
            "outputs": {"resultado": {"source": "consulta", "field": salida},
                        **({"lugares": {"source": "consulta", "field": "resultados"}} if que != "clima" else {})}}


async def cerca(chat, accion):
    definicion = plan_cerca(accion.get("que"), accion.get("lugar"))
    await proponer(chat, {"tipo": "proponer", "modo": "nuevo", "definition": definicion,
                          "explicacion": "Busco en OpenStreetMap / Open-Meteo con tu ubicación. No uso la IA."}, {})


# ---------- Soluciones, asistentes e historial ----------

async def soluciones(chat):
    items = (await chat.sql("telegram_workflows")).get("items") or []
    if not items:
        await chat.decir("Todavía no tienes soluciones guardadas. Pídeme algo con tus palabras y lo armo.")
        return
    await chat.opciones("📂 Tus soluciones. ¿Cuál ejecuto?",
                        [((item.get("definition") or {}).get("name") or "Sin nombre", {"tipo": "solucion", "id": item["id"]})
                         for item in items[:10]])


async def abrir_solucion(chat, ident):
    item = next((i for i in (await chat.sql("telegram_workflows")).get("items") or [] if i.get("id") == ident), None)
    if item is None:
        await chat.decir(ERRORES["not_found"])
        return
    definicion = item["definition"]
    siguiente = {"tipo": "proponer", "modo": "guardada", "definition": definicion, "workflow_id": item["id"],
                 "revision": item["revision"], "hash": item["definition_hash"],
                 "explicacion": definicion.get("description") or ""}
    await pedir_datos(chat, definicion.get("input_schema") or {}, {}, siguiente)


async def asistentes(chat):
    items = (await chat.sql("telegram_assistants")).get("items") or []
    if not items:
        await chat.decir("No tienes asistentes. Créalos en Capacita web con «Repetir automáticamente».")
        return
    lineas, acciones = ["🤖 <b>Tus asistentes</b>"], []
    for item in items[:8]:
        nombre = item.get("name") or "Asistente"
        estado = "🟢 activo" if item.get("active") else "⏸ en pausa"
        proximo = cuando(item.get("next_run_at")) if item.get("active") else ""
        lineas.append(f"• <b>{e(nombre)}</b> — {estado}" + (f" · próximo: {e(proximo)}" if proximo else ""))
        acciones.append((f"{'⏸ Pausar' if item.get('active') else '▶️ Reanudar'} {nombre[:30]}",
                         {"tipo": "asistente", "id": item["id"], "que": "pausar" if item.get("active") else "reanudar"}))
        acciones.append((f"⚡ Ejecutar ya {nombre[:30]}", {"tipo": "asistente", "id": item["id"], "que": "ahora"}))
    await chat.opciones("\n".join(lineas), acciones, html_=True)


async def accion_asistente(chat, accion):
    if accion.get("que") == "ahora":
        await chat.sql("telegram_assistant_run_now", p_id=accion.get("id"))
        await chat.decir("⚡ Listo: lo ejecuto en menos de un minuto y te llega como siempre.")
    else:
        activo = accion.get("que") == "reanudar"
        await chat.sql("telegram_assistant_set_active", p_id=accion.get("id"), p_active=activo)
        await chat.decir("▶️ Reanudado." if activo else "⏸ En pausa. Reanúdalo cuando quieras con /asistentes.")


async def historial(chat):
    items = (await chat.sql("telegram_jobs")).get("items") or []
    if not items:
        await chat.decir("Aún no hay ejecuciones en tu cuenta.")
        return
    lineas = ["🕘 <b>Tus últimas ejecuciones</b>"]
    lineas += [f"{ESTADOS.get(i.get('status'), '•')} {e(i.get('name') or 'Solución')} · {e(cuando(i.get('created_at')))}"
               for i in items]
    terminadas = [i for i in items if i.get("status") == "completed"][:5]
    await chat.opciones("\n".join(lineas), [(f"Ver: {(i.get('name') or 'Solución')[:40]}", {"tipo": "resultado", "id": i["id"]})
                                            for i in terminadas], html_=True)


# ---------- Avance y resultado (los usa el trabajador mientras ejecuta) ----------

def cuando(valor):
    """Fecha de la base (UTC, ISO) en hora de Colombia y legible: «23/11 07:00». Antes salía
    «2026-11-23T12:00» y un asistente de las 7 a. m. parecía programado a las 12."""
    from datetime import datetime
    from connectors.fechas import COLOMBIA
    try:
        fecha = datetime.fromisoformat(str(valor).replace("Z", "+00:00"))
    except ValueError:
        return ""
    if fecha.tzinfo is not None:
        fecha = fecha.astimezone(COLOMBIA)
    return fecha.strftime("%d/%m %H:%M")


# Los mismos textos que la web (ChatTaller.jsx): la persona nunca ve un código interno.
FALLOS = {"connector_provider_unavailable": "el servicio externo no respondió; intenta de nuevo en unos minutos",
          "connector_not_found": "el servicio externo no tiene datos para eso",
          "connector_provider_busy": "el servicio externo está recibiendo muchas consultas; espera un minuto",
          "connector_provider_rejected": "el servicio externo rechazó la consulta; revisa los datos",
          "connector_invalid_response": "el servicio externo respondió algo que no pude leer",
          "connector_not_configured": "ese paso necesita una clave de servicio que no está configurada",
          "connector_quota": "se alcanzó el tope de usos de IA por hora; intenta más tarde",
          "output_contract": "el resultado no tuvo el formato esperado",
          "sandbox_unavailable": "el entorno de ejecución no está disponible",
          "intermediate_output_limit": "los datos entre pasos salieron demasiado grandes"}
DETALLES_IA = {"contenido_bloqueado": "la IA no quiso procesar ese contenido (lo marcó como sensible)",
               "respuesta_muy_larga": "la respuesta de la IA salía demasiado larga",
               "telegram_no_vinculado": "primero conecta tu Telegram en Capacita → Configuración",
               "google_no_vinculado": "primero conecta tu cuenta de Google en Capacita → Configuración",
               "cupo_traduccion": "se acabó el cupo gratuito de traducción de hoy"}


def motivo_fallo(report):
    report = report or {}
    paso = next((s for s in report.get("steps") or [] if s.get("status") == "failed"), None) or {}
    codigo, detalle, etiqueta = paso.get("error") or report.get("error"), paso.get("detail"), paso.get("label")
    if codigo == "connector_input" and detalle in DETALLES_IA:
        return DETALLES_IA[detalle]
    if codigo in ("connector_input", "input_contract") and etiqueta:
        dato = f"«{str(detalle).replace('_', ' ')}»" if detalle else "los datos"
        return f"revisa {dato} en el paso «{etiqueta}»"
    if codigo in FALLOS:
        return FALLOS[codigo] + (f" (paso «{etiqueta}»)" if etiqueta else "")
    return f"falló el paso «{etiqueta}»" if etiqueta else "hubo un error al ejecutar"


def texto_avance(nombre, report):
    lineas = [f"⏳ <b>{e(nombre)}</b>"]
    for paso in (report or {}).get("steps") or []:
        extra = " (sin ese dato)" if paso.get("sin_dato") else " (no se cumplió la condición)" if paso.get("omitido") else ""
        lineas.append(f"{ESTADOS.get(paso.get('status'), '▫️')} {e(paso.get('label'))}{extra}")
    return "\n".join(lineas)[:3900]


class Avance:
    """Edita UN mensaje con el avance (desde el hilo del trabajo), como mucho cada 1,5 s."""

    def __init__(self, bot, chat_id, mensaje_id, nombre, reloj=time.monotonic):
        self.bot, self.chat, self.mensaje, self.nombre, self.reloj = bot, chat_id, mensaje_id, nombre, reloj
        self.ultimo, self.cuando = None, float("-inf")  # el primer aviso sale siempre

    def __call__(self, report, forzar=False):
        texto, ahora = texto_avance(self.nombre, report), self.reloj()
        if texto == self.ultimo or (not forzar and ahora - self.cuando < 1.5):
            return
        try:
            if self.mensaje:
                self.bot.editar(self.chat, self.mensaje, texto, True)
            else:
                self.mensaje = self.bot.responder(self.chat, texto, None, True)
            self.ultimo, self.cuando = texto, ahora
        except RuntimeError:
            pass  # el avance es un extra: nunca frena el trabajo


async def enviar_resultado(bot, chat_id, nombre, estado, report, output, ya_en_telegram=False, to_thread=asyncio.to_thread):
    """El resultado en el chat: textos con formato bonito (escapado) y archivos como documento."""
    from connectors.formato import trozos
    from connectors.telegram import formatear
    from services.ajuste_contratos import texto_legible
    if estado != "completed":
        await to_thread(bot.responder, chat_id, f"❌ No se pudo terminar «{nombre}»: {motivo_fallo(report)}. "
                                                "Revisa el detalle en Capacita → Resultados o pídemelo de nuevo.")
        return
    condicion = (report or {}).get("condicion") or {}
    if condicion and condicion.get("cumple") is False:
        await to_thread(bot.responder, chat_id, f"🔕 «{nombre}»: no se cumplió la condición, así que no envié nada. "
                                                f"{str(condicion.get('motivo') or '')[:300]}")
        return
    if ya_en_telegram:
        await to_thread(bot.responder, chat_id, f"✅ Listo: «{nombre}». Te lo envié arriba ⬆️")
        return
    textos = []
    for campo, valor in (output or {}).items():
        tipo = None
        if isinstance(valor, str) and len(valor) > 2000:
            try:
                datos = base64.b64decode(valor, validate=True)
                tipo = tipo_de(datos)
            except (ValueError, TypeError):
                tipo = None
        if tipo:
            extension = {"application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png"}.get(tipo, "docx" if "word" in tipo else "xlsx")
            await to_thread(bot.enviar_archivo, chat_id, f"{campo}.{extension}", datos, tipo, nombre)
        elif valor not in (None, "", [], {}):
            textos.append(valor if isinstance(valor, str) else texto_legible(valor))
    cuerpo = "\n\n".join(textos)[:12000]
    if cuerpo:
        partes = trozos(cuerpo, 3500)[:4]
        for indice, parte in enumerate(partes):
            await to_thread(bot.responder, chat_id, formatear(parte, primero=indice == 0, ultimo=indice == len(partes) - 1),
                            None, True)
    avisos = (report or {}).get("avisos") or []
    final = f"✅ Listo: «{nombre}»." + (" Ojo: algunas consultas no respondieron y el texto lo menciona." if avisos else "")
    await to_thread(bot.responder, chat_id, final)
