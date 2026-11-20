"""Acciones en la cuenta de Google de la propia persona (fase 6): correo, Drive y Calendar.

El token de acceso lo pone el trabajador en el contexto y el runtime se lo entrega SOLO al broker
(cabecera Authorization); este código no lo ve. La versión 1 del correo va únicamente a la dirección
conectada (google_email del contexto). La versión 2 también puede ir a la dirección que la persona
escribió: su entrada «para» es solo_persona, así que nunca sale de otro paso (una página, un Excel o
la IA), y la persona la ve en el plan antes de su «Acepto». El formato sale de connectors/formato.py.
"""
import base64
from datetime import datetime, timedelta
from email.message import EmailMessage
import json
import re
import secrets

from connectors.base import Connector, ConnectorInputError
from connectors.formato import correo_html, documento_html, elegir_estilo, texto_plano
from connectors.telegram import archivo_de, texto_como_archivo
from connectors.fechas import leer_fecha, leer_hora
from services.connector_broker import ConnectorFailure

HOSTS = ["gmail.googleapis.com", "www.googleapis.com"]
HORA = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
TEXTO = {"type": "string"}
ARCHIVO = {"type": "string", "title": "Archivo", "contentEncoding": "base64"}


def limpio(valor, maximo):
    """Una línea, sin saltos (evita inyectar cabeceras en el correo), recortada."""
    return " ".join(str(valor or "").split())[:maximo]


def nombre_de(inputs, extension):
    base = re.sub(r"[^\w\- ]+", "", str(inputs.get("nombre_archivo") or "resultado"))[:80].strip() or "resultado"
    return f"{base}.{extension}"


CORREO_VALIDO = re.compile(r"^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9\-]+(\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,24}$")


def destinatario(valor):
    """Una sola dirección bien escrita (sin comas, espacios ni saltos que agreguen copias), o None."""
    texto = str(valor or "").strip()
    if not texto:
        return None
    if len(texto) > 254 or not CORREO_VALIDO.match(texto):
        raise ConnectorInputError("para")
    return texto


def enviar_correo(http, inputs, parameters, context):
    """Versión 1: solo a la propia persona. Versión 2: también a la dirección que ella escribió
    (entrada «para», que workflow_validation solo acepta como valor fijo o dato de la persona)."""
    propio = context.get("google_email")
    if not propio or "@" not in str(propio):
        raise ConnectorInputError("google_no_vinculado")
    para = destinatario(inputs.get("para")) or str(propio)
    a_otra = para.lower() != str(propio).lower()
    asunto = limpio(inputs.get("asunto"), 200) or "Resultado de Capacita"
    mensaje, archivo = texto_como_archivo(str(inputs.get("mensaje") or "").strip(), inputs.get("archivo"))
    if not mensaje and not archivo:
        raise ConnectorInputError("mensaje")
    if len(mensaje) > 50000:
        raise ConnectorInputError("mensaje_muy_largo")
    correo = EmailMessage()
    correo["To"], correo["Subject"] = para, asunto
    cuerpo = mensaje or ("Te envío el archivo adjunto." if a_otra else "Te envío el archivo que pediste en Capacita.")
    # El estilo sale del contenido (o del que se pidió): académico sobrio, promoción con color…
    estilo = elegir_estilo(asunto, cuerpo, parameters.get("estilo"))
    pie = f"Enviado por {propio} con Capacita." if a_otra else "Enviado por Capacita a tu propio correo."
    correo.set_content(texto_plano(cuerpo) + "\n\n—\n" + pie)
    correo.add_alternative(correo_html(asunto, cuerpo, estilo=estilo, adjunto=bool(archivo),
                                       remitente=str(propio) if a_otra else None), subtype="html")
    if archivo:
        datos, tipo, extension = archivo_de(archivo)
        principal, secundario = tipo.split("/", 1)
        correo.add_attachment(datos, maintype=principal, subtype=secundario, filename=nombre_de(inputs, extension))
    data = http.post_json("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                          {"raw": base64.urlsafe_b64encode(correo.as_bytes()).decode()})
    if not isinstance(data, dict) or not data.get("id"):
        raise ConnectorFailure("invalid_response")
    adjunto = " con el archivo adjunto." if archivo else "."
    if a_otra:
        return {"enviado": True, "resumen": f"Listo: envié el correo «{asunto}» desde tu Gmail a {para}{adjunto}"}
    return {"enviado": True, "resumen": f"Listo: te envié el correo «{asunto}» a {para}{adjunto}"}


def guardar_drive(http, inputs, parameters, context):
    if not context.get("google_email"):
        raise ConnectorInputError("google_no_vinculado")
    if not inputs.get("archivo"):
        raise ConnectorInputError("archivo")
    try:
        datos, tipo, extension = archivo_de(inputs["archivo"])
        nombre = nombre_de(inputs, extension)
        metadatos = {"name": nombre}
    except ConnectorInputError:
        # Un plan puede conectar aquí un texto (la promoción que redactó la IA) en vez de un
        # archivo: se guarda como documento de Google Docs, que Drive crea a partir de HTML con
        # títulos, negritas, listas y tablas, y con el estilo que corresponde al contenido.
        texto = inputs["archivo"]
        if not isinstance(texto, str) or not texto.strip() or len(texto) > 1_000_000:
            raise
        nombre = nombre_de(inputs, "txt")[:-4]
        documento = documento_html(nombre, texto, elegir_estilo(nombre, texto))
        datos, tipo = documento.encode("utf-8"), "text/html; charset=UTF-8"
        metadatos = {"name": nombre, "mimeType": "application/vnd.google-apps.document"}
    limite = "capacita" + secrets.token_hex(8)
    cuerpo = (f"--{limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n"
              f"{json.dumps(metadatos, ensure_ascii=False)}\r\n--{limite}\r\nContent-Type: {tipo}\r\n\r\n").encode() \
        + datos + f"\r\n--{limite}--".encode()
    data = http.post_bytes("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
                           cuerpo, f"multipart/related; boundary={limite}")
    if not isinstance(data, dict) or not data.get("id"):
        raise ConnectorFailure("invalid_response")
    enlace = str(data.get("webViewLink") or f"https://drive.google.com/file/d/{data['id']}/view")
    return {"enlace": enlace, "nombre": str(data.get("name") or nombre),
            "resumen": f"Listo: guardé «{nombre}» en tu Google Drive."}


def agendar_evento(http, inputs, parameters, context):
    if not context.get("google_email"):
        raise ConnectorInputError("google_no_vinculado")
    titulo = limpio(inputs.get("titulo"), 200)
    if not titulo:
        raise ConnectorInputError("titulo")
    # Acepta la fecha como la escribe una persona o la IA («27/11/2026», «27 de noviembre», «el
    # viernes»), no solo AAAA-MM-DD: con el itinerario de viaje fallaba con «revisa la fecha».
    dia = leer_fecha(inputs.get("fecha") or "")
    if dia is None:
        raise ConnectorInputError("fecha")
    texto_fecha = dia.isoformat()
    hora = str(inputs.get("hora") or "").strip()
    if hora:
        hora = leer_hora(hora) or hora
    # El calendario no muestra formato: la descripción va sin marcas (**, ##) pero con sus viñetas.
    evento = {"summary": titulo, "description": texto_plano(str(inputs.get("descripcion") or ""))[:8000]}
    if hora:
        if not HORA.match(hora):
            raise ConnectorInputError("hora")
        minutos = inputs.get("duracion_minutos", 60)
        if not isinstance(minutos, (int, float)) or isinstance(minutos, bool) or not 5 <= minutos <= 1440:
            raise ConnectorInputError("duracion_minutos")
        inicio = datetime.fromisoformat(f"{texto_fecha}T{hora}:00")
        fin = inicio + timedelta(minutes=int(minutos))
        evento |= {"start": {"dateTime": inicio.isoformat(), "timeZone": "America/Bogota"},
                   "end": {"dateTime": fin.isoformat(), "timeZone": "America/Bogota"}}
        cuando = f"el {texto_fecha} a las {hora}"
    else:
        evento |= {"start": {"date": dia.isoformat()}, "end": {"date": (dia + timedelta(days=1)).isoformat()}}
        cuando = f"el {texto_fecha} (todo el día)"
    data = http.post_json("https://www.googleapis.com/calendar/v3/calendars/primary/events", evento)
    if not isinstance(data, dict) or not data.get("id"):
        raise ConnectorFailure("invalid_response")
    return {"enlace": str(data.get("htmlLink") or ""), "resumen": f"Listo: agendé «{titulo}» {cuando} en tu Google Calendar."}


def accion(*, key, provider, name, description, input_schema, output_schema, example_inputs, run, version=1,
           parametros=None, example_parameters=None, constraints=None, solo_persona=()):
    return Connector(key=key, version=version, provider=provider, provider_url="https://developers.google.com/workspace",
                     hosts=HOSTS, name=name, description=f"Conector de acción ({provider}): " + description,
                     category="comunicacion", input_type="texto", output_type="texto", input_schema=input_schema,
                     parameter_schema={"type": "object", "properties": parametros or {}, "additionalProperties": False},
                     output_schema=output_schema, example_inputs=example_inputs, example_parameters=example_parameters or {},
                     constraints=constraints or ["Solo actúa en TU cuenta de Google conectada en Capacita → Configuración.",
                                                 f"{provider} recibe el contenido de este paso."],
                     run=run, max_requests=1, credential="google", sends_content=True, needs=("google_email",),
                     solo_persona=solo_persona)


def objeto(propiedades, requeridos):
    return {"type": "object", "additionalProperties": False, "required": requeridos, "properties": propiedades}


CORREO = accion(
    key="enviar_correo", provider="Gmail", name="Enviarme por correo",
    description="te envía a TU propio correo de Gmail conectado un mensaje y, si quieres, un archivo adjunto (el "
                "informe en PDF, una foto, un Excel). Sirve para recibir resultados en tu correo.",
    input_schema=objeto({"asunto": {**TEXTO, "title": "Asunto"}, "mensaje": {**TEXTO, "title": "Mensaje"},
                         "archivo": {**ARCHIVO, "description": "Archivo adjunto (opcional)"},
                         "nombre_archivo": {**TEXTO, "title": "Nombre del archivo", "description": "Sin extensión (opcional)"}},
                        ["asunto", "mensaje"]),
    output_schema=objeto({"enviado": {"type": "boolean", "title": "Enviado"}, "resumen": {**TEXTO, "title": "Resumen"}},
                         ["enviado", "resumen"]),
    example_inputs={"asunto": "Tu informe semanal", "mensaje": "Aquí está el resumen de la semana."}, run=enviar_correo)

DRIVE = accion(
    key="guardar_drive", provider="Google Drive", name="Guardar en mi Drive",
    description="guarda un archivo (el informe en PDF, una foto, un Word o un Excel) en TU Google Drive y devuelve el "
                "enlace. Capacita solo ve los archivos que ella misma crea.",
    input_schema=objeto({"archivo": {**ARCHIVO, "description": "El archivo que quieres guardar"},
                         "nombre_archivo": {**TEXTO, "title": "Nombre del archivo", "description": "Sin extensión (opcional)"}},
                        ["archivo"]),
    output_schema=objeto({"enlace": {**TEXTO, "title": "Enlace"}, "nombre": {**TEXTO, "title": "Nombre"},
                          "resumen": {**TEXTO, "title": "Resumen"}}, ["enlace", "nombre", "resumen"]),
    example_inputs={"archivo": "MUESTRA:pdf"}, run=guardar_drive)

CALENDARIO = accion(
    key="agendar_evento", provider="Google Calendar", name="Agendar en mi calendario",
    description="crea un evento o recordatorio en TU Google Calendar con título, fecha y, si quieres, hora y "
                "duración (hora de Colombia). Sin hora queda como evento de todo el día.",
    input_schema=objeto({"titulo": {**TEXTO, "title": "Título"},
                         "fecha": {**TEXTO, "title": "Fecha", "description": "Fecha AAAA-MM-DD"},
                         "hora": {**TEXTO, "title": "Hora", "description": "HH:MM en hora de Colombia (opcional)"},
                         "duracion_minutos": {"type": "integer", "title": "Duración en minutos", "description": "De 5 a 1440 (opcional)"},
                         "descripcion": {**TEXTO, "title": "Descripción", "description": "Opcional"}},
                        ["titulo", "fecha"]),
    output_schema=objeto({"enlace": {**TEXTO, "title": "Enlace"}, "resumen": {**TEXTO, "title": "Resumen"}}, ["enlace", "resumen"]),
    example_inputs={"titulo": "Revisar inventario", "fecha": "2026-11-24", "hora": "09:00"}, run=agendar_evento)

# Versión 2 del correo: misma acción, pero puede ir a la dirección que la persona escribió y elige
# el estilo según el contenido (o el que se pida). La versión 1 sigue para lo ya guardado con ella.
CORREO_V2 = accion(
    key="enviar_correo", version=2, provider="Gmail", name="Enviar por correo",
    description="envía desde TU Gmail conectado un correo con buen formato (títulos, listas, tablas y un estilo "
                "según el contenido: sobrio si es académico, con color si es una promoción) y, si quieres, un "
                "archivo adjunto. Llega a tu propio correo o, si escribes en tu pedido la dirección de otra "
                "persona (un cliente, tu profesor), a esa dirección.",
    input_schema=objeto({"asunto": {**TEXTO, "title": "Asunto"}, "mensaje": {**TEXTO, "title": "Mensaje"},
                         "para": {**TEXTO, "title": "Para", "description": "Correo de otra persona, tal como lo "
                                  "escribiste (opcional; si no, te llega a ti)"},
                         "archivo": {**ARCHIVO, "description": "Archivo adjunto (opcional)"},
                         "nombre_archivo": {**TEXTO, "title": "Nombre del archivo", "description": "Sin extensión (opcional)"}},
                        ["asunto", "mensaje"]),
    parametros={"estilo": {"type": "string", "title": "Estilo", "enum": ["automático", "académico", "formal",
                                                                          "promocional", "sencillo"],
                           "default": "automático",
                           "description": "Cómo se ve el correo; «automático» lo elige según el contenido"}},
    example_parameters={"estilo": "automático"},
    output_schema=objeto({"enviado": {"type": "boolean", "title": "Enviado"}, "resumen": {**TEXTO, "title": "Resumen"}},
                         ["enviado", "resumen"]),
    constraints=["Sale desde TU cuenta de Google conectada en Capacita → Configuración.",
                 "Solo va a otra persona si tú escribiste su correo; nunca a una dirección que venga de otro paso.",
                 "Gmail recibe el contenido de este paso."],
    example_inputs={"asunto": "Tu informe semanal", "mensaje": "## Resumen\n- Ventas: **+12 %**"},
    run=enviar_correo, solo_persona=("para",))

GOOGLE = [CORREO, CORREO_V2, DRIVE, CALENDARIO]
