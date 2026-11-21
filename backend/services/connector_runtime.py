"""Ejecuta un paso conector en el trabajador (fuera del sandbox, sin credenciales de nadie).

El manifiesto guardado en la base de datos debe ser idéntico al del registro revisado
(connectors/); si no, no se ejecuta. Entradas, opciones y salida se validan con sus contratos.
"""
from collections import deque
import json
import time

from jsonschema import Draft202012Validator

from services.ajuste_contratos import ajustar_objeto, primer_error

from connectors import PROFILE, ConnectorInputError, from_manifest
from core.config import settings
from services.connector_broker import TOKEN_EN_RUTA, ConnectorFailure, SafeHttp
from services.contract_validation import DATA_BYTES


class HourlyBudget:
    """Tope de llamadas por hora en este trabajador (cuida la cuota gratuita del proveedor)."""

    def __init__(self, limit, clock=time.monotonic):
        self.limit, self.clock, self.calls = limit, clock, deque()

    def take(self):
        now = self.clock()
        while self.calls and now - self.calls[0] >= 3600:
            self.calls.popleft()
        if len(self.calls) >= self.limit:
            return False
        self.calls.append(now)
        return True


# Tope por hora en este trabajador, por proveedor con credencial (cuida las cuotas gratuitas).
BUDGETS = {"gemini": HourlyBudget(30), "telegram": HourlyBudget(60), "google": HourlyBudget(60)}
AI_BUDGET = BUDGETS["gemini"]
# Nombre de credencial → (host exacto, cabecera o modo, cómo leer la clave). La clave vive en
# backend/.env; el broker la añade a la petición y el código del conector no la ve.
CREDENTIALS = {
    "gemini": ("generativelanguage.googleapis.com", "x-goog-api-key", lambda: settings.GEMINI_API_KEY.get_secret_value()),
    "telegram": ("api.telegram.org", TOKEN_EN_RUTA, lambda: settings.TELEGRAM_BOT_TOKEN.get_secret_value()),
}


def credential_for(name, credentials=None):
    if credentials is not None:
        return credentials.get(name)
    host, header, read = CREDENTIALS.get(name, (None, None, lambda: ""))
    value = read()
    return (host, header, value) if host and value else None


def run_connector(job, transport=None, resolver=None, credentials=None, budget=None):
    payload = job["payload"]
    connector = from_manifest(payload.get("manifest"), job.get("artifact_hash"))
    report = {"profile": PROFILE}
    if connector is None:
        return "failed", report | {"error": "connector_mismatch"}, None
    report |= {"artifact_hash": connector.artifact_hash, "provider": connector.provider}
    definition = connector.definition
    # Lo que llega de otros pasos o de la IA casi bien («300», «Cajeros», una lista donde va texto)
    # se ajusta al contrato antes de validarlo; las opciones que faltan toman su valor por defecto.
    inputs = ajustar_objeto(definition["input_schema"], payload.get("inputs"), quitar_extra=False)
    parameters = ajustar_objeto(definition["parameter_schema"], payload.get("parameters") or {}, defaults=True,
                                quitar_extra=False)
    for schema, value in ((definition["input_schema"], inputs), (definition["parameter_schema"], parameters)):
        if not isinstance(value, dict) or not Draft202012Validator(schema).is_valid(value):
            # Qué campo revisar (su nombre, nunca el valor): el chat lo dice en vez de un error genérico.
            campo = primer_error(schema, value)[0] if isinstance(value, dict) else "entrada"
            return "failed", report | {"error": "input_contract", "detail": campo[:40]}, None
    auth = None
    contexto = dict(job.get("context") or {})
    if connector.credential == "google":
        # El token de acceso de la persona lo pone el trabajador en el contexto; solo lo usa el
        # broker (cabecera Authorization hacia las APIs de Google) y se quita antes del conector.
        token = contexto.pop("google_access_token", None)
        if not token:
            return "failed", report | {"error": "connector_input", "detail": "google_no_vinculado"}, None
        if not (budget or BUDGETS["google"]).take():
            return "failed", report | {"error": "connector_quota"}, None
        auth = (tuple(connector.hosts), "Authorization", f"Bearer {token}")
    elif connector.credential:
        auth = credential_for(connector.credential, credentials)
        if auth is None:
            return "failed", report | {"error": "connector_not_configured"}, None
        if not (budget or BUDGETS.get(connector.credential, AI_BUDGET)).take():
            return "failed", report | {"error": "connector_quota"}, None
    http = SafeHttp(connector.hosts, connector.max_requests, transport=transport, auth=auth,
                    **({"resolver": resolver} if resolver else {}))
    started = time.monotonic()
    try:
        output = connector.run(http, inputs, parameters, contexto)
    except ConnectorInputError as error:
        # El código dice qué dato revisar (ciudad, fecha…); nunca el valor recibido.
        return "failed", report | {"error": "connector_input", "detail": str(error)[:40]}, None
    except ConnectorFailure as error:
        return "failed", report | {"error": f"connector_{error.code}"}, None
    except Exception:
        return "failed", report | {"error": "connector_error"}, None
    finally:
        report |= {"elapsed_seconds": round(time.monotonic() - started, 3), "requests": http.calls}
    try:
        valid = (isinstance(output, dict) and Draft202012Validator(definition["output_schema"]).is_valid(output)
                 and len(json.dumps(output, ensure_ascii=False, allow_nan=False).encode()) <= DATA_BYTES)
    except (ValueError, TypeError, RecursionError):
        valid = False
    if not valid:
        return "failed", report | {"error": "output_contract"}, None
    return "completed", report, output
