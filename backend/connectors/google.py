"""Acciones en la cuenta de Google de la propia persona (fase 6): correo, Drive y Calendar.

El token de acceso lo pone el trabajador en el contexto y el runtime se lo entrega SOLO al broker
(cabecera Authorization); este código no lo ve. El correo va únicamente a la dirección conectada
(google_email del contexto), nunca a una dirección que llegue como entrada: un proceso no puede
escribirle a otra persona en nombre de quien lo ejecuta.
"""
import base64
from datetime import date, datetime, timedelta
from email.message import EmailMessage
import json
import re
import secrets

from connectors.base import Connector, ConnectorInputError
from connectors.telegram import archivo_de, en_lineas
import html
from services.connector_broker import ConnectorFailure

HOSTS = ["gmail.googleapis.com", "www.googleapis.com"]
FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HORA = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")
TEXTO = {"type": "string"}
ARCHIVO = {"type": "string", "title": "Archivo", "contentEncoding": "base64"}


def limpio(valor, maximo):
    """Una línea, sin saltos (evita inyectar cabeceras en el correo), recortada."""
    return " ".join(str(valor or "").split())[:maximo]


def nombre_de(inputs, extension):
    base = re.sub(r"[^\w\- ]+", "", str(inputs.get("nombre_archivo") or "resultado"))[:80].strip() or "resultado"
    return f"{base}.{extension}"


def html_correo(asunto, mensaje, adjunto=False):
    """Plantilla sencilla y limpia (estilos en línea, como exigen los clientes de correo). Todo escapado."""
    parrafos = "".join(
        '<p style="margin:0 0 12px;line-height:1.55">' + "<br>".join(html.escape(linea) for linea in en_lineas(bloque)) + "</p>"
        for bloque in re.split(r"\n\s*\n", mensaje) if bloque.strip())
    nota = ('<p style="margin:16px 0 0;padding:10px 12px;background:#eff6ff;border-radius:10px;color:#1e40af;font-size:13px">'
            "Va adjunto el archivo que generó tu proceso.</p>") if adjunto else ""
    return ('<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#0f172a">'
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">'
            '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;'
            'border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">'
            '<tr><td style="background:#1d4ed8;padding:16px 24px;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:.2px">Capacita</td></tr>'
            f'<tr><td style="padding:24px"><h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">{html.escape(asunto)}</h1>{parrafos}{nota}</td></tr>'
            '<tr><td style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px">'
            "Te lo envió Capacita a tu propio correo porque lo aprobaste en un proceso.</td></tr>"
            "</table></td></tr></table></body></html>")


def enviar_correo(http, inputs, parameters, context):
    para = context.get("google_email")
    if not para or "@" not in str(para):
        raise ConnectorInputError("google_no_vinculado")
    asunto = limpio(inputs.get("asunto"), 200) or "Resultado de Capacita"
    mensaje = str(inputs.get("mensaje") or "").strip()
    archivo = inputs.get("archivo")
    if not mensaje and not archivo:
        raise ConnectorInputError("mensaje")
    if len(mensaje) > 50000:
        raise ConnectorInputError("mensaje_muy_largo")
    correo = EmailMessage()
    correo["To"], correo["Subject"] = para, asunto
    cuerpo = mensaje or "Te envío el archivo que pediste en Capacita."
    correo.set_content("\n".join(en_lineas(cuerpo)) + "\n\n—\nEnviado por Capacita a tu propio correo.")
    correo.add_alternative(html_correo(asunto, cuerpo, adjunto=bool(archivo)), subtype="html")
    if archivo:
        datos, tipo, extension = archivo_de(archivo)
        principal, secundario = tipo.split("/", 1)
        correo.add_attachment(datos, maintype=principal, subtype=secundario, filename=nombre_de(inputs, extension))
    data = http.post_json("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                          {"raw": base64.urlsafe_b64encode(correo.as_bytes()).decode()})
    if not isinstance(data, dict) or not data.get("id"):
        raise ConnectorFailure("invalid_response")
    return {"enviado": True, "resumen": f"Listo: te envié el correo «{asunto}» a {para}"
                                        + (" con el archivo adjunto." if archivo else ".")}


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
        # archivo: se guarda como documento de Google Docs, que Drive crea a partir de texto plano.
        texto = inputs["archivo"]
        if not isinstance(texto, str) or not texto.strip() or len(texto) > 1_000_000:
            raise
        datos, tipo = texto.encode("utf-8"), "text/plain; charset=UTF-8"
        nombre = nombre_de(inputs, "txt")[:-4]
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
    texto_fecha = str(inputs.get("fecha") or "").strip()
    if not FECHA.match(texto_fecha):
        raise ConnectorInputError("fecha")
    try:
        dia = date.fromisoformat(texto_fecha)
    except ValueError:
        raise ConnectorInputError("fecha") from None
    hora = str(inputs.get("hora") or "").strip()
    evento = {"summary": titulo, "description": str(inputs.get("descripcion") or "")[:8000]}
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


def accion(*, key, provider, name, description, input_schema, output_schema, example_inputs, run):
    return Connector(key=key, version=1, provider=provider, provider_url="https://developers.google.com/workspace",
                     hosts=HOSTS, name=name, description=f"Conector de acción ({provider}): " + description,
                     category="comunicacion", input_type="texto", output_type="texto", input_schema=input_schema,
                     parameter_schema={"type": "object", "properties": {}, "additionalProperties": False},
                     output_schema=output_schema, example_inputs=example_inputs, example_parameters={},
                     constraints=["Solo actúa en TU cuenta de Google conectada en Capacita → Configuración.",
                                  f"{provider} recibe el contenido de este paso."],
                     run=run, max_requests=1, credential="google", sends_content=True, needs=("google_email",))


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

GOOGLE = [CORREO, DRIVE, CALENDARIO]
