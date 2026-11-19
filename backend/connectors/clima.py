"""Clima con Open-Meteo (gratis, sin clave, datos abiertos CC BY 4.0)."""
from datetime import date
import re

from connectors.base import Connector, ConnectorInputError

GEOCODING = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST = "https://api.open-meteo.com/v1/forecast"
ARCHIVE = "https://archive-api.open-meteo.com/v1/archive"
FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
PAIS = re.compile(r"^[A-Z]{2}$")
# Códigos WMO que usa Open-Meteo, en palabras.
WMO = {0: "Despejado", 1: "Mayormente despejado", 2: "Parcialmente nublado", 3: "Nublado",
       45: "Niebla", 48: "Niebla", 51: "Llovizna ligera", 53: "Llovizna", 55: "Llovizna intensa",
       56: "Llovizna helada", 57: "Llovizna helada", 61: "Lluvia ligera", 63: "Lluvia", 65: "Lluvia fuerte",
       66: "Lluvia helada", 67: "Lluvia helada", 71: "Nieve ligera", 73: "Nieve", 75: "Nieve fuerte",
       77: "Granizo fino", 80: "Chubascos ligeros", 81: "Chubascos", 82: "Chubascos fuertes",
       85: "Chubascos de nieve", 86: "Chubascos de nieve", 95: "Tormenta", 96: "Tormenta con granizo",
       99: "Tormenta con granizo"}

CIUDAD = {"type": "string", "title": "Ciudad", "minLength": 2, "maxLength": 80,
          "description": "Ciudad o municipio, por ejemplo Bogotá"}
PAIS_PARAM = {"type": "string", "title": "País", "minLength": 2, "maxLength": 2, "default": "CO",
              "description": "Código de 2 letras del país donde buscar la ciudad (CO = Colombia)"}


DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre",
         "noviembre", "diciembre"]


def coma(valor):
    return str(valor).replace(".", ",")


def dias_humanos(fechas, hoy=None):
    """["2026-11-22", "2026-11-23"] → «el domingo 22 y el lunes 23 de noviembre» (agrupa por mes)."""
    hoy = hoy or date.today()
    grupos = []
    for texto in fechas:
        dia = date.fromisoformat(texto)
        nombre = "hoy" if dia == hoy else f"el {DIAS[dia.weekday()]} {dia.day}"
        if grupos and grupos[-1][0] == (dia.year, dia.month):
            grupos[-1][1].append(nombre)
        else:
            grupos.append(((dia.year, dia.month), [nombre]))
    partes = []
    for (_, mes), nombres in grupos:
        partes.extend(nombres[:-1])
        # «hoy» no lleva mes: «hoy y el viernes 20 de noviembre», nunca «hoy de noviembre».
        partes.append(nombres[-1] if nombres[-1] == "hoy" else f"{nombres[-1]} de {MESES[mes - 1]}")
    return partes[0] if len(partes) == 1 else ", ".join(partes[:-1]) + " y " + partes[-1]


def numero(valor, decimales=1):
    return round(float(valor), decimales) if isinstance(valor, (int, float)) and not isinstance(valor, bool) else 0.0


def pais_de(parameters):
    pais = str(parameters.get("pais") or "CO").upper()
    if not PAIS.match(pais):
        raise ConnectorInputError("pais")
    return pais


def ubicar(http, ciudad, pais):
    texto = " ".join(str(ciudad).split())[:80]
    if len(texto) < 2:
        raise ConnectorInputError("ciudad")
    data = http.get_json(GEOCODING, {"name": texto, "count": 1, "language": "es", "format": "json", "countryCode": pais})
    resultados = data.get("results") if isinstance(data, dict) else None
    if not resultados:
        raise ConnectorInputError("ciudad_no_encontrada")
    lugar = resultados[0]
    partes = [lugar.get("name"), lugar.get("admin1"), lugar.get("country")]
    nombre = ", ".join(dict.fromkeys(str(parte) for parte in partes if parte))
    return float(lugar["latitude"]), float(lugar["longitude"]), nombre[:200]


def fecha_valida(texto, campo):
    if not isinstance(texto, str) or not FECHA.match(texto):
        raise ConnectorInputError(campo)
    try:
        return date.fromisoformat(texto)
    except ValueError:
        raise ConnectorInputError(campo) from None


def columna(diario, campo, indice):
    valores = diario.get(campo) or []
    return valores[indice] if indice < len(valores) else None


def pronostico(http, inputs, parameters):
    dias = parameters.get("dias", 7)
    if not isinstance(dias, int) or isinstance(dias, bool) or not 1 <= dias <= 16:
        raise ConnectorInputError("dias")
    lat, lon, nombre = ubicar(http, inputs["ciudad"], pais_de(parameters))
    data = http.get_json(FORECAST, {
        "latitude": lat, "longitude": lon, "timezone": "auto", "forecast_days": dias,
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code"})
    diario = (data.get("daily") or {}) if isinstance(data, dict) else {}
    filas = []
    for i, fecha in enumerate(diario.get("time") or []):
        filas.append({"fecha": str(fecha), "estado": WMO.get(columna(diario, "weather_code", i), "Sin dato"),
                      "temperatura_max": numero(columna(diario, "temperature_2m_max", i)),
                      "temperatura_min": numero(columna(diario, "temperature_2m_min", i)),
                      "lluvia_mm": numero(columna(diario, "precipitation_sum", i)),
                      "probabilidad_lluvia": int(numero(columna(diario, "precipitation_probability_max", i), 0))})
    if not filas:
        raise ConnectorInputError("sin_datos")
    lluviosos = [fila["fecha"] for fila in filas if fila["probabilidad_lluvia"] >= 50]
    temperaturas = f"Temperatura entre {coma(min(f['temperatura_min'] for f in filas))} y " \
                   f"{coma(max(f['temperatura_max'] for f in filas))} °C."
    resumen = (f"{nombre}, próximos {len(filas)} días: "
               + (f"lluvia probable (50 % o más) {dias_humanos(lluviosos)}. " if lluviosos
                  else "no se espera lluvia (ningún día llega al 50 % de probabilidad). ")
               + temperaturas)
    return {"ciudad": nombre, "resumen": resumen, "dias_con_lluvia": len(lluviosos), "dias": filas}


def historico(http, inputs, parameters):
    inicio, fin = fecha_valida(inputs["fecha_inicio"], "fecha_inicio"), fecha_valida(inputs["fecha_fin"], "fecha_fin")
    if inicio > fin or fin > date.today() or inicio < date(1940, 1, 1) or (fin - inicio).days > 366:
        raise ConnectorInputError("rango_fechas")
    lat, lon, nombre = ubicar(http, inputs["ciudad"], pais_de(parameters))
    data = http.get_json(ARCHIVE, {
        "latitude": lat, "longitude": lon, "timezone": "auto", "start_date": inicio.isoformat(), "end_date": fin.isoformat(),
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code"})
    diario = (data.get("daily") or {}) if isinstance(data, dict) else {}
    filas = []
    for i, fecha in enumerate(diario.get("time") or []):
        if columna(diario, "temperature_2m_max", i) is None:
            continue  # Open-Meteo publica el archivo con unos días de retraso.
        lluvia = numero(columna(diario, "precipitation_sum", i))
        filas.append({"fecha": str(fecha), "estado": WMO.get(columna(diario, "weather_code", i), "Sin dato"),
                      "temperatura_max": numero(columna(diario, "temperature_2m_max", i)),
                      "temperatura_min": numero(columna(diario, "temperature_2m_min", i)),
                      "lluvia_mm": lluvia, "llovio": lluvia >= 1.0})
    if not filas:
        raise ConnectorInputError("sin_datos")
    lluviosos = sum(1 for fila in filas if fila["llovio"])
    resumen = (f"{nombre}, del {filas[0]['fecha']} al {filas[-1]['fecha']}: {len(filas)} día(s) con datos, "
               f"{lluviosos} con lluvia (1 mm o más), {round(sum(f['lluvia_mm'] for f in filas), 1)} mm en total.")
    return {"ciudad": nombre, "resumen": resumen, "dias_con_lluvia": lluviosos, "dias": filas}


DIA_PRONOSTICO = {"type": "object", "additionalProperties": False,
                  "required": ["fecha", "estado", "temperatura_max", "temperatura_min", "lluvia_mm", "probabilidad_lluvia"],
                  "properties": {"fecha": {"type": "string"}, "estado": {"type": "string"},
                                 "temperatura_max": {"type": "number"}, "temperatura_min": {"type": "number"},
                                 "lluvia_mm": {"type": "number"}, "probabilidad_lluvia": {"type": "integer"}}}
DIA_HISTORICO = {"type": "object", "additionalProperties": False,
                 "required": ["fecha", "estado", "temperatura_max", "temperatura_min", "lluvia_mm", "llovio"],
                 "properties": {"fecha": {"type": "string"}, "estado": {"type": "string"},
                                "temperatura_max": {"type": "number"}, "temperatura_min": {"type": "number"},
                                "lluvia_mm": {"type": "number"}, "llovio": {"type": "boolean"}}}


def salida(dia):
    return {"type": "object", "additionalProperties": False, "required": ["ciudad", "resumen", "dias_con_lluvia", "dias"],
            "properties": {"ciudad": {"type": "string", "title": "Ciudad"},
                           "resumen": {"type": "string", "title": "Resumen"},
                           "dias_con_lluvia": {"type": "integer", "title": "Días con lluvia"},
                           "dias": {"type": "array", "title": "Días", "items": dia, "maxItems": 400}}}


PRONOSTICO = Connector(
    key="clima_pronostico", version=1, provider="Open-Meteo", provider_url="https://open-meteo.com",
    hosts=["geocoding-api.open-meteo.com", "api.open-meteo.com"],
    name="Pronóstico del clima por ciudad",
    description="Conector externo (Open-Meteo): pronóstico del clima de los próximos días (hoy, mañana, esta semana) "
                "en una ciudad: si va a llover o llueve, temperatura máxima y mínima, lluvia y probabilidad de "
                "lluvia por día. Ej.: ¿va a llover esta semana en Bogotá, Medellín, Cali o Barranquilla?",
    category="datos", input_type="texto", output_type="datos",
    input_schema={"type": "object", "additionalProperties": False, "required": ["ciudad"], "properties": {"ciudad": CIUDAD}},
    parameter_schema={"type": "object", "additionalProperties": False, "required": ["dias", "pais"], "properties": {
        "dias": {"type": "integer", "title": "Días", "minimum": 1, "maximum": 16, "default": 7,
                 "description": "Cuántos días de pronóstico, de 1 a 16"},
        "pais": PAIS_PARAM}},
    output_schema=salida(DIA_PRONOSTICO),
    example_inputs={"ciudad": "Bogotá"}, example_parameters={"dias": 7, "pais": "CO"},
    constraints=["Envía a Open-Meteo solo la ciudad escrita; no envía archivos ni datos de la cuenta.",
                 "Pronóstico, no certeza: puede cambiar."],
    run=pronostico, max_requests=2)

HISTORICO = Connector(
    key="clima_historico", version=1, provider="Open-Meteo", provider_url="https://open-meteo.com",
    hosts=["geocoding-api.open-meteo.com", "archive-api.open-meteo.com"],
    name="Clima histórico por ciudad",
    description="Conector externo (Open-Meteo): clima que hizo cada día entre dos fechas en una ciudad: si llovió, "
                "temperatura y lluvia. Sirve para comparar ventas, asistencia o actividades con el clima pasado "
                "(semana, mes o año anterior).",
    category="datos", input_type="texto", output_type="datos",
    input_schema={"type": "object", "additionalProperties": False, "required": ["ciudad", "fecha_inicio", "fecha_fin"],
                  "properties": {"ciudad": CIUDAD,
                                 "fecha_inicio": {"type": "string", "title": "Fecha inicial", "minLength": 10, "maxLength": 10,
                                                  "description": "Fecha AAAA-MM-DD"},
                                 "fecha_fin": {"type": "string", "title": "Fecha final", "minLength": 10, "maxLength": 10,
                                               "description": "Fecha AAAA-MM-DD, como máximo un año después de la inicial"}}},
    parameter_schema={"type": "object", "additionalProperties": False, "required": ["pais"], "properties": {"pais": PAIS_PARAM}},
    output_schema=salida(DIA_HISTORICO),
    example_inputs={"ciudad": "Bogotá", "fecha_inicio": "2026-10-01", "fecha_fin": "2026-10-31"},
    example_parameters={"pais": "CO"},
    constraints=["Envía a Open-Meteo solo la ciudad y las fechas; no envía archivos ni datos de la cuenta.",
                 "Hasta 366 días por consulta; los últimos días pueden faltar porque el archivo se publica con retraso."],
    run=historico, max_requests=2)
