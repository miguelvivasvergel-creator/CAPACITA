"""Monedas: TRM oficial de Colombia (datos.gov.co) y tasas de cambio (ExchangeRate-API, acceso abierto)."""
from datetime import date
import re

from connectors.base import Connector, ConnectorInputError

TRM = "https://www.datos.gov.co/resource/32sa-8pi3.json"
TASAS = "https://open.er-api.com/v6/latest/{moneda}"
FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MONEDA = re.compile(r"^[A-Z]{3}$")
# Sus términos piden atribución visible.
ATRIBUCION = "Tasas por ExchangeRate-API (https://www.exchangerate-api.com)"


def pesos(valor):
    """3326.96 → «3.326,96» (formato colombiano)."""
    return f"{valor:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def trm(http, inputs, parameters):
    texto = str(inputs.get("fecha") or "").strip()
    if texto:
        if not FECHA.match(texto):
            raise ConnectorInputError("fecha")
        try:
            dia = date.fromisoformat(texto)
        except ValueError:
            raise ConnectorInputError("fecha") from None
    else:
        dia = date.today()
    # El filtro solo contiene una fecha ya validada (sin texto libre de la persona).
    data = http.get_json(TRM, {"$where": f"vigenciadesde <= '{dia.isoformat()}T00:00:00'",
                               "$order": "vigenciadesde DESC", "$limit": "1"})
    if not isinstance(data, list) or not data:
        raise ConnectorInputError("sin_datos")
    try:
        valor = float(data[0]["valor"])
        vigente = str(data[0]["vigenciadesde"])[:10]
    except (KeyError, TypeError, ValueError):
        raise ConnectorInputError("sin_datos") from None
    return {"fecha": vigente, "valor_cop_por_usd": round(valor, 2),
            "resumen": f"TRM vigente desde el {vigente}: ${pesos(valor)} pesos por dólar "
                       "(Superintendencia Financiera, vía datos.gov.co)."}


def cambio(http, inputs, parameters):
    monto = inputs["monto"]
    origen, destino = str(inputs["moneda_origen"]).strip().upper(), str(inputs["moneda_destino"]).strip().upper()
    if (not isinstance(monto, (int, float)) or isinstance(monto, bool) or not 0 <= monto <= 1e12
            or not MONEDA.match(origen) or not MONEDA.match(destino)):
        raise ConnectorInputError("monto_moneda")
    data = http.get_json(TASAS.format(moneda=origen))
    if not isinstance(data, dict) or data.get("result") != "success":
        raise ConnectorInputError("moneda_origen")
    tasa = (data.get("rates") or {}).get(destino)
    if not isinstance(tasa, (int, float)) or isinstance(tasa, bool) or tasa <= 0:
        raise ConnectorInputError("moneda_destino")
    convertido = round(monto * tasa, 2)
    fecha = str(data.get("time_last_update_utc") or "")[:40]
    return {"monto_convertido": convertido, "tasa": round(float(tasa), 6), "fecha_tasa": fecha,
            "resumen": f"{pesos(monto)} {origen} = {pesos(convertido)} {destino} (1 {origen} = {round(float(tasa), 6)} {destino}).",
            "fuente": ATRIBUCION}


TRM_COLOMBIA = Connector(
    key="trm_colombia", version=1, provider="datos.gov.co (Superintendencia Financiera)",
    provider_url="https://www.datos.gov.co/d/32sa-8pi3", hosts=["www.datos.gov.co"],
    name="TRM del dólar en Colombia",
    description="Conector externo (datos.gov.co): TRM oficial, cuántos pesos colombianos vale un dólar hoy o en "
                "una fecha (precio del dólar en Colombia). Sirve para convertir dólares a pesos.",
    category="datos", input_type="texto", output_type="datos",
    input_schema={"type": "object", "additionalProperties": False, "properties": {
        "fecha": {"type": "string", "title": "Fecha", "maxLength": 10,
                  "description": "Fecha AAAA-MM-DD; vacío para la TRM vigente hoy"}}},
    parameter_schema={"type": "object", "properties": {}, "additionalProperties": False},
    output_schema={"type": "object", "additionalProperties": False, "required": ["fecha", "valor_cop_por_usd", "resumen"],
                   "properties": {"fecha": {"type": "string", "title": "Vigente desde"},
                                  "valor_cop_por_usd": {"type": "number", "title": "Pesos por dólar"},
                                  "resumen": {"type": "string", "title": "Resumen"}}},
    example_inputs={}, example_parameters={},
    constraints=["Envía a datos.gov.co solo la fecha consultada.",
                 "Los fines de semana y festivos rige la TRM del último día hábil."],
    run=trm, max_requests=1)

CAMBIO = Connector(
    key="cambio_moneda", version=1, provider="ExchangeRate-API (acceso abierto)",
    provider_url="https://www.exchangerate-api.com/docs/free", hosts=["open.er-api.com"],
    name="Convertir dinero entre monedas",
    description="Conector externo (ExchangeRate-API): convierte un monto de una moneda a otra con la tasa del "
                "día (dólares, euros, pesos colombianos, mexicanos y más de 150 monedas, códigos USD, EUR, COP…).",
    category="datos", input_type="datos", output_type="datos",
    input_schema={"type": "object", "additionalProperties": False, "required": ["monto", "moneda_origen", "moneda_destino"],
                  "properties": {"monto": {"type": "number", "title": "Monto", "minimum": 0, "maximum": 1000000000000},
                                 "moneda_origen": {"type": "string", "title": "Moneda de origen", "minLength": 3, "maxLength": 3,
                                                   "description": "Código de 3 letras, por ejemplo USD"},
                                 "moneda_destino": {"type": "string", "title": "Moneda de destino", "minLength": 3, "maxLength": 3,
                                                    "description": "Código de 3 letras, por ejemplo COP"}}},
    parameter_schema={"type": "object", "properties": {}, "additionalProperties": False},
    output_schema={"type": "object", "additionalProperties": False,
                   "required": ["monto_convertido", "tasa", "fecha_tasa", "resumen", "fuente"],
                   "properties": {"monto_convertido": {"type": "number", "title": "Monto convertido"},
                                  "tasa": {"type": "number", "title": "Tasa"},
                                  "fecha_tasa": {"type": "string", "title": "Fecha de la tasa"},
                                  "resumen": {"type": "string", "title": "Resumen"},
                                  "fuente": {"type": "string", "title": "Fuente"}}},
    example_inputs={"monto": 100, "moneda_origen": "USD", "moneda_destino": "COP"}, example_parameters={},
    constraints=["Envía al proveedor solo la moneda de origen; el monto se calcula aquí.",
                 "Tasa de referencia diaria del mercado, no la TRM oficial ni la de un banco."],
    run=cambio, max_requests=1)
