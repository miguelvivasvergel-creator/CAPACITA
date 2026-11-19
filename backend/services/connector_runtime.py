"""Ejecuta un paso conector en el trabajador (fuera del sandbox, sin credenciales de nadie).

El manifiesto guardado en la base de datos debe ser idéntico al del registro revisado
(connectors/); si no, no se ejecuta. Entradas, opciones y salida se validan con sus contratos.
"""
from collections import deque
import json
import time

from jsonschema import Draft202012Validator

from connectors import PROFILE, ConnectorInputError, from_manifest
from core.config import settings
from services.connector_broker import ConnectorFailure, SafeHttp
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


AI_BUDGET = HourlyBudget(30)
# Nombre de credencial → (host exacto, cabecera, cómo leer la clave). La clave vive en
# backend/.env; el broker la añade a la petición y el código del conector no la ve.
CREDENTIALS = {
    "gemini": ("generativelanguage.googleapis.com", "x-goog-api-key", lambda: settings.GEMINI_API_KEY.get_secret_value()),
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
    inputs, parameters = payload.get("inputs"), payload.get("parameters")
    for schema, value in ((definition["input_schema"], inputs), (definition["parameter_schema"], parameters)):
        if not isinstance(value, dict) or not Draft202012Validator(schema).is_valid(value):
            return "failed", report | {"error": "input_contract"}, None
    auth = None
    if connector.credential:
        auth = credential_for(connector.credential, credentials)
        if auth is None:
            return "failed", report | {"error": "connector_not_configured"}, None
        if not (budget or AI_BUDGET).take():
            return "failed", report | {"error": "connector_quota"}, None
    http = SafeHttp(connector.hosts, connector.max_requests, transport=transport, auth=auth,
                    **({"resolver": resolver} if resolver else {}))
    started = time.monotonic()
    try:
        output = connector.run(http, inputs, parameters)
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
