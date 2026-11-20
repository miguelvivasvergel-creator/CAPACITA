"""Acción externa: enviar el resultado al chat de Telegram de la propia persona (fase 3).

El chat sale del contexto del trabajo (lo pone el trabajador con telegram_chat_for_job, SQL 16):
nunca de una entrada, así que un proceso no puede escribirle a otra persona. El token del bot lo
añade el broker en la ruta; aquí se escribe «/bot/…». Texto plano (sin parse_mode): lo que llega
de otros pasos no puede inyectar formato ni enlaces ocultos.
"""
import base64
import binascii
import html
import re

from connectors.base import Connector, ConnectorInputError
from services.connector_broker import ConnectorFailure

HOST = "api.telegram.org"
API = "https://" + HOST + "/bot/{metodo}"
MAX_MENSAJE = 12000
TROZO = 3800  # Telegram admite 4.096 caracteres por mensaje (deja sitio al encabezado y al pie)
LEYENDA = 900  # y 1.024 en la leyenda de un archivo
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


def en_lineas(texto):
    """Un párrafo largo de un solo bloque (un resumen) se parte por oraciones; las viñetas se unifican."""
    if "\n" not in texto and len(texto) > 140:
        texto = re.sub(r"(?<=[a-záéíóúñ0-9)])\. (?=[A-ZÁÉÍÓÚÑ¿¡])", ".\n", texto)
    lineas = []
    for linea in texto.split("\n"):
        limpia = linea.strip()
        if limpia[:2] in ("- ", "* ", "• "):
            limpia = "• " + limpia[2:].strip()
        lineas.append(limpia)
    return lineas


def formatear(texto, primero=True, ultimo=True):
    """HTML de Telegram con TODO el contenido escapado: lo que llega de otros pasos no inyecta formato."""
    partes = ["<b>Capacita</b>"] if primero else []
    partes.append("\n".join(html.escape(linea, quote=False) for linea in en_lineas(texto)))
    if ultimo:
        partes.append("<i>Enviado por Capacita a tu chat.</i>")
    return "\n\n".join(partes)


def respuesta_ok(data):
    if not isinstance(data, dict) or data.get("ok") is not True:
        raise ConnectorFailure("provider_rejected")


def enviar(http, inputs, parameters, context):
    chat = context.get("telegram_chat_id")
    if not isinstance(chat, int) or isinstance(chat, bool):
        raise ConnectorInputError("telegram_no_vinculado")
    mensaje = str(inputs.get("mensaje") or "").strip()
    if len(mensaje) > MAX_MENSAJE:
        raise ConnectorInputError("mensaje_muy_largo")
    archivo = inputs.get("archivo")
    if not mensaje and not archivo:
        raise ConnectorInputError("mensaje")
    enviados, pendiente = 0, mensaje
    if archivo:
        datos, tipo, extension = archivo_de(archivo)
        nombre = re.sub(r"[^\w\- ]+", "", str(inputs.get("nombre_archivo") or "resultado"))[:60].strip() or "resultado"
        leyenda = mensaje if len(mensaje) <= LEYENDA else ""
        foto = tipo in ("image/jpeg", "image/png")
        respuesta_ok(http.post_form(API.format(metodo="sendPhoto" if foto else "sendDocument"),
                                    {"chat_id": str(chat), **({"caption": formatear(leyenda), "parse_mode": "HTML"} if leyenda else {})},
                                    {"photo" if foto else "document": (f"{nombre}.{extension}", datos, tipo)}))
        enviados += 1
        pendiente = "" if leyenda else mensaje
    trozos = [pendiente[i:i + TROZO] for i in range(0, len(pendiente), TROZO)]
    for indice, trozo in enumerate(trozos):
        texto = formatear(trozo, primero=indice == 0 and not archivo, ultimo=indice == len(trozos) - 1)
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
    run=enviar, max_requests=5, credential="telegram", sends_content=True, needs=("telegram_chat_id",))
