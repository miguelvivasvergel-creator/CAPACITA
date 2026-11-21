"""Festivos oficiales con Nager.Date (gratis, sin clave)."""
from datetime import date
import re

from connectors.base import Connector, ConnectorInputError

API = "https://date.nager.at/api/v3/PublicHolidays/{anio}/{pais}"
PAIS = re.compile(r"^[A-Z]{2}$")
DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def festivos(http, inputs, parameters):
    anio = inputs["anio"]
    pais = str(parameters.get("pais") or "CO").upper()
    if not isinstance(anio, int) or isinstance(anio, bool) or not 1975 <= anio <= 2100 or not PAIS.match(pais):
        raise ConnectorInputError("anio_pais")
    # La ruta solo lleva valores ya validados (entero y dos letras).
    data = http.get_json(API.format(anio=anio, pais=pais))
    if not isinstance(data, list):
        raise ConnectorInputError("pais_sin_datos")
    filas = []
    for item in data:
        try:
            dia = date.fromisoformat(str(item["date"]))
        except (KeyError, ValueError, TypeError):
            continue
        filas.append({"fecha": dia.isoformat(), "dia_semana": DIAS[dia.weekday()],
                      "nombre": str(item.get("localName") or item.get("name") or "Festivo")[:120]})
    if not filas:
        raise ConnectorInputError("pais_sin_datos")
    from connectors.fechas import hoy_colombia
    hoy = hoy_colombia().isoformat()
    # Los próximos tres (no solo uno): «¿el lunes es festivo?» o «¿cuándo es el siguiente puente?» se
    # responden con el resumen, que es lo que el plan suele conectar a la IA que escribe.
    proximos = [fila for fila in filas if fila["fecha"] >= hoy][:3]
    resumen = f"{pais} {anio}: {len(filas)} festivos." + (
        " Próximos: " + "; ".join(f"{f['nombre']}, {f['dia_semana']} {f['fecha']}" for f in proximos) + "."
        if proximos else " Ya no quedan festivos este año.")
    return {"festivos": filas, "total": len(filas), "resumen": resumen}


FESTIVOS = Connector(
    key="festivos_pais", version=1, provider="Nager.Date", provider_url="https://date.nager.at",
    hosts=["date.nager.at"],
    name="Festivos de un país por año",
    description="Conector externo (Nager.Date): días festivos o feriados oficiales de un año (los puentes festivos "
                "de Colombia por defecto), con la fecha, el día de la semana y el nombre del festivo.",
    category="datos", input_type="datos", output_type="datos",
    input_schema={"type": "object", "additionalProperties": False, "required": ["anio"], "properties": {
        "anio": {"type": "integer", "title": "Año", "minimum": 1975, "maximum": 2100, "description": "Año, por ejemplo 2026"}}},
    parameter_schema={"type": "object", "additionalProperties": False, "required": ["pais"], "properties": {
        "pais": {"type": "string", "title": "País", "minLength": 2, "maxLength": 2, "default": "CO",
                 "description": "Código de 2 letras del país (CO = Colombia)"}}},
    output_schema={"type": "object", "additionalProperties": False, "required": ["festivos", "total", "resumen"], "properties": {
        "festivos": {"type": "array", "title": "Festivos", "maxItems": 60, "items": {
            "type": "object", "additionalProperties": False, "required": ["fecha", "dia_semana", "nombre"],
            "properties": {"fecha": {"type": "string"}, "dia_semana": {"type": "string"}, "nombre": {"type": "string"}}}},
        "total": {"type": "integer", "title": "Total"},
        "resumen": {"type": "string", "title": "Resumen"}}},
    example_inputs={"anio": 2026}, example_parameters={"pais": "CO"},
    constraints=["Envía a Nager.Date solo el año y el país."],
    run=festivos, max_requests=1)
