"""Acción externa: enviar el resultado al chat de Telegram de la propia persona (fase 3).

El chat sale del contexto del trabajo (lo pone el trabajador con telegram_chat_for_job, SQL 16):
nunca de una entrada, así que un proceso no puede escribirle a otra persona. El token del bot lo
añade el broker en la ruta; aquí se escribe «/bot/…». HTML de Telegram con todo escapado y solo
etiquetas propias (negrita, cursiva, cita): lo que llega de otros pasos no inyecta formato ni enlaces.
"""
import base64
import binascii
import re

from connectors.base import Connector, ConnectorInputError
from connectors.formato import SOBRIOS, estilo_telegram, telegram_html, trozos as partir
from services.connector_broker import ConnectorFailure

HOST = "api.telegram.org"
API = "https://" + HOST + "/bot/{metodo}"
MAX_MENSAJE = 12000
TROZO = 3800  # Telegram admite 4.096 caracteres por mensaje (deja sitio al encabezado y al pie)
LEYENDA = 900  # y 1.024 en la leyenda de un archivo
MAX_PETICIONES = 5  # el max_requests del conector (no cambiarlo sin regenerar db/15)
RECORTADO = "\n\n*(Mensaje recortado: era más largo de lo que admite Telegram.)*"
FIRMAS = [(b"%PDF", "application/pdf", "pdf"), (b"\xff\xd8\xff", "image/jpeg", "jpg"), (b"\x89PNG", "image/png", "png")]
OFFICE = {"word/": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"),
          "xl/": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx")}


def archivo_de(valor):
    try:
        datos = base64.b64decode(valor, validate=True)
    except (binascii.Error, ValueError, TypeError):
        raise ConnectorInputError("archivo") from None
    if not datos or len(datos) > 4_500_000:
        raise ConnectorInputError("archivo")
    for firma, tipo, extension in FIRMAS:
        if datos.startswith(firma):
            return datos, tipo, extension
    if datos.startswith(b"PK"):
        for marca, (tipo, extension) in OFFICE.items():
            if marca.encode() in datos[:200000]:
                return datos, tipo, extension
    return datos, "application/octet-stream", "bin"


def texto_como_archivo(mensaje, archivo):
    """Un plan puede conectar un TEXTO (el itinerario que escribió la IA) a la entrada «archivo», que
    espera un archivo real en base64. Antes fallaba con «revisa el archivo»; ahora ese texto se suma al
    mensaje (si no es el mismo) y el envío sigue sin adjunto. Devuelve (mensaje, archivo)."""
    if not isinstance(archivo, str) or not archivo.strip():
        return mensaje, archivo
    try:
        base64.b64decode(archivo, validate=True)
        return mensaje, archivo  # parece un archivo: archivo_de lo revisa
    except (binascii.Error, ValueError):
        pass
    texto = archivo.strip()
    if not mensaje or texto == mensaje or texto in mensaje:
        return mensaje or texto, None
    return (texto if mensaje in texto else f"{mensaje}\n\n{texto}"), None


def formatear(texto, primero=True, ultimo=True, estilo=None):
    """HTML de Telegram con TODO el contenido escapado: solo se agregan negritas, cursivas, frases
    destacadas e íconos propios (connectors/formato.py); lo que llega de otros pasos no inyecta formato.
    El estilo se elige una vez para todo el mensaje, así sus trozos se ven iguales."""
    estilo = estilo or estilo_telegram(texto)
    sobrio = estilo in SOBRIOS
    partes = [("<b>Capacita</b>" if sobrio else "✨ <b>Capacita</b>") + "\n┈┈┈┈┈┈┈┈┈┈"] if primero else []
    partes.append(telegram_html(texto, estilo))
    if ultimo:
        partes.append("┈┈┈┈┈┈┈┈┈┈\n<i>Enviado por Capacita a tu chat.</i>")
    return "\n\n".join(partes)


def recortar(texto, maximo, siempre=False):
    """Lo que cabe en `maximo` con el aviso de recorte, cortado al final de una línea: así no queda una
    negrita «**» abierta ni una fila de tabla a medias (las marcas nunca cruzan de línea). `siempre`:
    el aviso va aunque el texto quepa (el último trozo que se alcanza a enviar)."""
    if len(texto) <= maximo and not siempre:
        return texto
    if len(texto) + len(RECORTADO) <= maximo:
        return texto.rstrip() + RECORTADO
    limite = maximo - len(RECORTADO)
    corte = texto.rfind("\n", 0, limite + 1)
    return texto[:corte if corte > 0 else limite].rstrip() + RECORTADO


def respuesta_ok(data):
    if not isinstance(data, dict) or data.get("ok") is not True:
        raise ConnectorFailure("provider_rejected")


def enviar(http, inputs, parameters, context):
    chat = context.get("telegram_chat_id")
    if not isinstance(chat, int) or isinstance(chat, bool):
        raise ConnectorInputError("telegram_no_vinculado")
    mensaje, archivo = texto_como_archivo(str(inputs.get("mensaje") or "").strip(), inputs.get("archivo"))
    if len(mensaje) > MAX_MENSAJE:
        # Antes fallaba «mensaje muy largo»: ahora llega lo que cabe, cortado en una línea, con aviso.
        mensaje = recortar(mensaje, MAX_MENSAJE)
    if not mensaje and not archivo:
        raise ConnectorInputError("mensaje")
    enviados, pendiente, estilo = 0, mensaje, estilo_telegram(mensaje)
    if archivo:
        datos, tipo, extension = archivo_de(archivo)
        nombre = re.sub(r"[^\w\- ]+", "", str(inputs.get("nombre_archivo") or "resultado"))[:60].strip() or "resultado"
        leyenda = mensaje if len(mensaje) <= LEYENDA else ""
        foto = tipo in ("image/jpeg", "image/png")
        respuesta_ok(http.post_form(API.format(metodo="sendPhoto" if foto else "sendDocument"),
                                    {"chat_id": str(chat), **({"caption": formatear(leyenda, estilo=estilo), "parse_mode": "HTML"} if leyenda else {})},
                                    {"photo" if foto else "document": (f"{nombre}.{extension}", datos, tipo)}))
        enviados += 1
        pendiente = "" if leyenda else mensaje
    trozos = partir(pendiente, TROZO)
    cupo = MAX_PETICIONES - enviados  # cada trozo es una petición: no pasar del tope del conector
    if len(trozos) > cupo:
        trozos = trozos[:cupo]
        trozos[-1] = recortar(trozos[-1], TROZO, siempre=True)
    for indice, trozo in enumerate(trozos):
        texto = formatear(trozo, primero=indice == 0 and not archivo, ultimo=indice == len(trozos) - 1, estilo=estilo)
        respuesta_ok(http.post_json(API.format(metodo="sendMessage"),
                                    {"chat_id": chat, "text": texto, "parse_mode": "HTML",
                                     "link_preview_options": {"is_disabled": True}}))
        enviados += 1
    partes = []
    if archivo:
        partes.append("un archivo")
    if trozos or (archivo and mensaje and not pendiente):
        partes.append("el mensaje")
    return {"enviado": True, "resumen": f"Listo: te envié {' y '.join(partes)} a tu Telegram ({enviados} envío(s))."}


ENVIAR = Connector(
    key="enviar_telegram", version=1, provider="Telegram", provider_url="https://core.telegram.org/bots",
    hosts=[HOST],
    name="Enviarme por Telegram",
    description="Conector de acción (Telegram): te envía a TU chat de Telegram vinculado un mensaje y, si quieres, "
                "un archivo (el informe en PDF, una foto, un Excel). Sirve para recibir resultados o avisos en el celular.",
    category="comunicacion", input_type="texto", output_type="texto",
    input_schema={"type": "object", "additionalProperties": False, "required": ["mensaje"], "properties": {
        "mensaje": {"type": "string", "title": "Mensaje", "description": "El texto que quieres recibir en Telegram"},
        "archivo": {"type": "string", "title": "Archivo", "contentEncoding": "base64",
                    "description": "Archivo para enviar junto al mensaje (opcional)"},
        "nombre_archivo": {"type": "string", "title": "Nombre del archivo", "description": "Sin extensión (opcional)"}}},
    parameter_schema={"type": "object", "properties": {}, "additionalProperties": False},
    output_schema={"type": "object", "additionalProperties": False, "required": ["enviado", "resumen"], "properties": {
        "enviado": {"type": "boolean", "title": "Enviado"}, "resumen": {"type": "string", "title": "Resumen"}}},
    example_inputs={"mensaje": "Tu informe de ventas está listo."}, example_parameters={},
    constraints=["Solo envía a tu propio chat vinculado en Capacita → Configuración; nunca a otra persona.",
                 "Telegram recibe el mensaje y el archivo de este paso."],
    run=enviar, max_requests=MAX_PETICIONES, credential="telegram", sends_content=True, needs=("telegram_chat_id",))
