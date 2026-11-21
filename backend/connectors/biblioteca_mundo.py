"""Biblioteca · mundo: ciencia y espacio, lugares y mapas, países y economía, datos abiertos de Colombia."""
from datetime import date, datetime, timedelta, timezone
import math
import re
import unicodedata

from connectors.biblioteca_base import (ConnectorInputError, cadena, campo, conector, corto, dic, entero,
                                        lista_de, numero, objeto, opcion, pesos, respuesta, salida_ficha,
                                        salida_lista, texto)

GEO = "https://geocoding-api.open-meteo.com/v1/search"
FECHA = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def sin_tildes(valor):
    return "".join(c for c in unicodedata.normalize("NFKD", str(valor)) if not unicodedata.combining(c)).lower()


COORDENADAS = re.compile(r"^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$")


def ubicar(http, ciudad):
    """Ciudad → (lat, lon, nombre legible) con el geocodificador de Open-Meteo («lat,lon» se usa tal cual)."""
    punto = COORDENADAS.match(str(ciudad or ""))
    if punto:  # la ubicación compartida en Telegram
        lat, lon = float(punto.group(1)), float(punto.group(2))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ConnectorInputError("ciudad")
        return lat, lon, "tu ubicación"
    hallados = lista_de(http.get_json(GEO, {"name": ciudad, "count": "1", "language": "es", "format": "json"}), "results")
    if not hallados:
        raise ConnectorInputError("ciudad")
    g = dic(hallados[0])
    nombre = ", ".join(str(x) for x in (g.get("name"), g.get("admin1"), g.get("country")) if x)
    return numero(g.get("latitude")), numero(g.get("longitude")), nombre


def mapa(lat, lon):
    return f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=15/{lat}/{lon}"


ENTRADA_CIUDAD = {"ciudad": campo("Ciudad", "Por ejemplo «Valledupar»")}


# ── Sismos ──────────────────────────────────────────────────────────────────────────────────
def sismos(http, inputs, parameters):
    lugar = texto(inputs, "lugar", 60, requerido=False)
    magnitud = numero(parameters.get("magnitud_minima", 4.5), -1)
    if not 0 <= magnitud <= 10:
        raise ConnectorInputError("magnitud_minima")
    dias = entero(parameters.get("dias"), 1, 30, 7, "dias")
    data = http.get_json("https://earthquake.usgs.gov/fdsnws/event/1/query", {
        "format": "geojson", "orderby": "time", "minmagnitude": str(magnitud), "limit": "300",
        "starttime": (date.today() - timedelta(days=dias)).isoformat()})
    clave, filas = sin_tildes(lugar), []
    for f in map(dic, lista_de(data, "features")):
        p = dic(f.get("properties"))
        sitio = cadena(p.get("place"))
        if clave and clave not in sin_tildes(sitio):
            continue
        ms = numero(p.get("time"))
        filas.append({"lugar": sitio, "magnitud": round(numero(p.get("mag")), 1),
                      "fecha": datetime.fromtimestamp(ms / 1000, timezone.utc).strftime("%Y-%m-%d %H:%M UTC") if ms else "",
                      "enlace": cadena(p.get("url"))})
        if len(filas) == 20:
            break
    donde = f" en {lugar}" if lugar else " en el mundo"
    return respuesta(filas, lambda n: f"{n} sismos de magnitud {magnitud:g} o más{donde} en los últimos {dias} días. "
                     f"El más reciente: {filas[0]['magnitud']} en {filas[0]['lugar']} ({filas[0]['fecha']}).",
                     f"No hubo sismos de magnitud {magnitud:g} o más{donde} en los últimos {dias} días.")


SISMOS = conector(
    key="sismos_recientes", proveedor="USGS", url="https://earthquake.usgs.gov/fdsnws/event/1/",
    hosts=["earthquake.usgs.gov"], nombre="Sismos recientes",
    descripcion="lista los temblores y terremotos recientes del mundo o de un país, con magnitud, lugar y hora.",
    categoria="ciencia", entradas={"lugar": campo("País o región (opcional)", "Nombre en inglés si es distinto: Brazil, Spain")},
    ejemplo={"lugar": "Colombia"},
    parametros=objeto({"magnitud_minima": campo("Magnitud mínima", tipo="number", minimum=0, maximum=10, default=4.5),
                       "dias": campo("Últimos días", tipo="integer", minimum=1, maximum=30, default=7)}),
    ejemplo_parametros={"magnitud_minima": 4.5, "dias": 7},
    salida=salida_lista({"lugar": campo("Lugar"), "magnitud": campo("Magnitud", tipo="number"),
                         "fecha": campo("Fecha y hora"), "enlace": campo("Enlace")}),
    restricciones=["Envía al USGS solo las fechas y la magnitud; el filtro por país se hace aquí."], run=sismos)


# ── Espacio ─────────────────────────────────────────────────────────────────────────────────
def foto_nasa(http, inputs, parameters):
    consulta = {"api_key": "DEMO_KEY"}  # clave pública de demostración de la NASA (cupo bajo, sin registro)
    fecha = texto(inputs, "fecha", 10, requerido=False)
    if fecha:
        if not FECHA.match(fecha):
            raise ConnectorInputError("fecha")
        consulta["date"] = fecha
    d = dic(http.get_json("https://api.nasa.gov/planetary/apod", consulta))
    titulo = cadena(d.get("title"))
    return {"titulo": titulo, "fecha": cadena(d.get("date")), "explicacion": corto(d.get("explanation"), 1500),
            "imagen": cadena(d.get("hdurl") or d.get("url")),
            "resumen": f"Imagen astronómica del día ({cadena(d.get('date'))}): {titulo}."}


FOTO_NASA = conector(
    key="foto_espacio_nasa", proveedor="NASA APOD", url="https://api.nasa.gov",
    hosts=["api.nasa.gov"], nombre="Foto astronómica del día (NASA)",
    descripcion="la imagen del espacio que la NASA elige cada día, con su explicación (en inglés).",
    categoria="ciencia", entradas={"fecha": campo("Fecha (opcional)", "AAAA-MM-DD; vacío para hoy")}, ejemplo={},
    salida=salida_ficha({"titulo": campo("Título"), "fecha": campo("Fecha"), "explicacion": campo("Explicación"),
                         "imagen": campo("Imagen")}),
    restricciones=["Envía a la NASA solo la fecha.", "Clave pública de demostración: pocas consultas por hora."],
    run=foto_nasa)


def estacion(http, inputs, parameters):
    d = dic(http.get_json("https://api.wheretheiss.at/v1/satellites/25544"))
    lat, lon = round(numero(d.get("latitude")), 4), round(numero(d.get("longitude")), 4)
    altitud, velocidad = round(numero(d.get("altitude")), 1), round(numero(d.get("velocity")))
    return {"latitud": lat, "longitud": lon, "altitud_km": altitud, "velocidad_kmh": velocidad,
            "mapa": f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=4/{lat}/{lon}",
            "resumen": f"La Estación Espacial Internacional está ahora sobre {lat}, {lon}, a {pesos(altitud, 0)} km "
                       f"de altura y {pesos(velocidad, 0)} km/h."}


ESTACION = conector(
    key="estacion_espacial", proveedor="Where the ISS at?", url="https://wheretheiss.at/w/developer",
    hosts=["api.wheretheiss.at"], nombre="¿Dónde está la Estación Espacial?",
    descripcion="posición actual de la Estación Espacial Internacional, su altura y velocidad, con un mapa.",
    categoria="ciencia", entradas={}, ejemplo={},
    salida=salida_ficha({"latitud": campo("Latitud", tipo="number"), "longitud": campo("Longitud", tipo="number"),
                         "altitud_km": campo("Altura (km)", tipo="number"), "velocidad_kmh": campo("Velocidad (km/h)", tipo="number"),
                         "mapa": campo("Mapa")}),
    restricciones=["No envía ningún dato tuyo."], run=estacion)


def lanzamientos(http, inputs, parameters):
    data = http.get_json("https://ll.thespacedevs.com/2.2.0/launch/upcoming/", {"limit": "6"})
    filas = []
    for d in map(dic, lista_de(data, "results")):
        pad = dic(d.get("pad"))
        filas.append({"mision": corto(d.get("name"), 200),
                      "fecha": cadena(d.get("net"))[:16].replace("T", " ") + (" UTC" if d.get("net") else ""),
                      "lugar": cadena(d.get("location") or dic(pad.get("location")).get("name") or pad.get("name")),
                      "empresa": cadena(d.get("lsp_name") or dic(d.get("launch_service_provider")).get("name"))})
    return respuesta(filas, lambda n: f"Próximo lanzamiento: {filas[0]['mision']} el {filas[0]['fecha']}.",
                     "No hay lanzamientos espaciales programados en la lista.")


LANZAMIENTOS = conector(
    key="lanzamientos_espaciales", proveedor="Launch Library 2", url="https://thespacedevs.com/llapi",
    hosts=["ll.thespacedevs.com"], nombre="Próximos lanzamientos espaciales",
    descripcion="cohetes que despegarán pronto en el mundo: misión, fecha, lugar y empresa.",
    categoria="ciencia", entradas={}, ejemplo={},
    salida=salida_lista({"mision": campo("Misión"), "fecha": campo("Fecha"), "lugar": campo("Lugar"), "empresa": campo("Empresa")}),
    restricciones=["No envía ningún dato tuyo.", "Cupo público de pocas consultas por hora."], run=lanzamientos)


# ── Sol y aire (Open-Meteo) ─────────────────────────────────────────────────────────────────
def sol(http, inputs, parameters):
    lat, lon, nombre = ubicar(http, texto(inputs, "ciudad", 100))
    d = dic(dic(http.get_json("https://api.open-meteo.com/v1/forecast", {
        "latitude": str(lat), "longitude": str(lon), "daily": "sunrise,sunset,daylight_duration",
        "timezone": "auto", "forecast_days": "1"})).get("daily"))
    amanecer = cadena((lista_de(d, "sunrise") or [""])[0])[11:16]
    atardecer = cadena((lista_de(d, "sunset") or [""])[0])[11:16]
    horas = round(numero((lista_de(d, "daylight_duration") or [0])[0]) / 3600, 1)
    return {"lugar": nombre, "amanecer": amanecer, "atardecer": atardecer, "horas_de_luz": horas,
            "resumen": f"Hoy en {nombre} amanece a las {amanecer} y atardece a las {atardecer} ({str(horas).replace('.', ',')} horas de luz)."}


SOL = conector(
    key="amanecer_atardecer", proveedor="Open-Meteo", url="https://open-meteo.com/en/docs",
    hosts=["geocoding-api.open-meteo.com", "api.open-meteo.com"], nombre="Hora del amanecer y el atardecer",
    descripcion="a qué hora sale y se oculta el sol hoy en una ciudad y cuántas horas de luz hay (hora local).",
    categoria="ciencia", entradas=ENTRADA_CIUDAD, requeridos=["ciudad"], ejemplo={"ciudad": "Santa Marta"},
    salida=salida_ficha({"lugar": campo("Lugar"), "amanecer": campo("Amanecer"), "atardecer": campo("Atardecer"),
                         "horas_de_luz": campo("Horas de luz", tipo="number")}),
    restricciones=["Envía a Open-Meteo solo la ciudad y sus coordenadas."], run=sol, max_requests=2)


def calidad(aqi):
    for limite, texto_ in ((50, "buena"), (100, "moderada"), (150, "dañina para personas sensibles"),
                           (200, "dañina"), (300, "muy dañina")):
        if aqi <= limite:
            return texto_
    return "peligrosa"


def aire(http, inputs, parameters):
    lat, lon, nombre = ubicar(http, texto(inputs, "ciudad", 100))
    actual = dic(dic(http.get_json("https://air-quality-api.open-meteo.com/v1/air-quality", {
        "latitude": str(lat), "longitude": str(lon), "current": "us_aqi,pm2_5,pm10", "timezone": "auto"})).get("current"))
    aqi = round(numero(actual.get("us_aqi")))
    estado = calidad(aqi)
    return {"lugar": nombre, "indice": aqi, "calidad": estado, "pm2_5": round(numero(actual.get("pm2_5")), 1),
            "pm10": round(numero(actual.get("pm10")), 1),
            "resumen": f"Calidad del aire en {nombre}: {estado} (índice {aqi})."}


AIRE = conector(
    key="calidad_aire", proveedor="Open-Meteo", url="https://open-meteo.com/en/docs/air-quality-api",
    hosts=["geocoding-api.open-meteo.com", "air-quality-api.open-meteo.com"], nombre="Calidad del aire",
    descripcion="qué tan limpio está el aire ahora en una ciudad (índice AQI, partículas PM2.5 y PM10).",
    categoria="ciencia", entradas=ENTRADA_CIUDAD, requeridos=["ciudad"], ejemplo={"ciudad": "Medellín"},
    salida=salida_ficha({"lugar": campo("Lugar"), "indice": campo("Índice AQI", tipo="number"), "calidad": campo("Calidad"),
                         "pm2_5": campo("PM2.5 (µg/m³)", tipo="number"), "pm10": campo("PM10 (µg/m³)", tipo="number")}),
    restricciones=["Envía a Open-Meteo solo la ciudad y sus coordenadas.", "Estimación de modelo, no medición de una estación."],
    run=aire, max_requests=2)


# ── Lugares y mapas (OpenStreetMap) ─────────────────────────────────────────────────────────
def lugares(http, inputs, parameters):
    busqueda = texto(inputs, "busqueda", 200)
    data = http.get_json("https://photon.komoot.io/api/", {"q": busqueda, "limit": "6"})
    filas = []
    for f in map(dic, lista_de(data, "features")):
        p, coordenadas = dic(f.get("properties")), lista_de(f, "geometry", "coordinates")
        if len(coordenadas) < 2:
            continue
        lat, lon = round(numero(coordenadas[1]), 6), round(numero(coordenadas[0]), 6)
        calle = " ".join(str(x) for x in (p.get("street"), p.get("housenumber")) if x)
        filas.append({"nombre": cadena(p.get("name") or calle), "direccion": calle,
                      "ciudad": cadena(p.get("city") or p.get("county")), "pais": cadena(p.get("country")),
                      "latitud": lat, "longitud": lon, "mapa": mapa(lat, lon)})
    return respuesta(filas, lambda n: f"Encontré {n} lugares para «{busqueda}». El primero: {filas[0]['nombre']}, "
                     f"{filas[0]['ciudad']} ({filas[0]['pais']}).", f"No encontré «{busqueda}» en el mapa.")


LUGARES = conector(
    key="buscar_lugar", proveedor="Photon (OpenStreetMap)", url="https://photon.komoot.io",
    hosts=["photon.komoot.io"], nombre="Buscar una dirección o lugar en el mapa",
    descripcion="encuentra direcciones, sitios y negocios y devuelve su ciudad, coordenadas y enlace al mapa.",
    categoria="lugares", entradas={"busqueda": campo("Dirección o lugar", "Por ejemplo «Universidad Popular del Cesar»")},
    requeridos=["busqueda"], ejemplo={"busqueda": "Plaza Alfonso López Valledupar"},
    salida=salida_lista({"nombre": campo("Nombre"), "direccion": campo("Dirección"), "ciudad": campo("Ciudad"),
                         "pais": campo("País"), "latitud": campo("Latitud", tipo="number"),
                         "longitud": campo("Longitud", tipo="number"), "mapa": campo("Mapa")}),
    restricciones=["Envía a Photon solo lo que buscas.", "Datos de OpenStreetMap (ODbL)."], run=lugares)


CERCANOS = {"farmacia": ("amenity", "pharmacy"), "cajero": ("amenity", "atm"), "banco": ("amenity", "bank"),
            "hospital": ("amenity", "hospital"), "restaurante": ("amenity", "restaurant"), "cafe": ("amenity", "cafe"),
            "gasolinera": ("amenity", "fuel"), "policia": ("amenity", "police"), "colegio": ("amenity", "school"),
            "supermercado": ("shop", "supermarket"), "parque": ("leisure", "park"), "hotel": ("tourism", "hotel")}


def distancia(lat1, lon1, lat2, lon2):
    rad = math.radians
    a = math.sin(rad(lat2 - lat1) / 2) ** 2 + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.sin(rad(lon2 - lon1) / 2) ** 2
    return 6371000 * 2 * math.asin(min(1.0, math.sqrt(a)))


def cercanos(http, inputs, parameters):
    sitio = texto(inputs, "lugar", 200)
    tipo = opcion(parameters, "que", tuple(CERCANOS), "farmacia")
    radio = entero(parameters.get("radio_metros"), 200, 3000, 1000, "radio_metros")
    punto = COORDENADAS.match(sitio)
    if punto:  # «10.47,-73.25»: la ubicación compartida en Telegram, sin buscar el nombre
        lat, lon = float(punto.group(1)), float(punto.group(2))
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise ConnectorInputError("lugar")
    else:
        hallados = lista_de(http.get_json("https://photon.komoot.io/api/", {"q": sitio, "limit": "1"}), "features")
        coordenadas = lista_de(dic(hallados[0]) if hallados else {}, "geometry", "coordinates")
        if len(coordenadas) < 2:
            raise ConnectorInputError("lugar")
        lat, lon = numero(coordenadas[1]), numero(coordenadas[0])
    clave, valor = CERCANOS[tipo]
    # La consulta solo lleva números y una etiqueta de la lista fija (nada escrito por la persona).
    consulta = f'[out:json][timeout:25];nwr(around:{radio},{lat:.6f},{lon:.6f})["{clave}"="{valor}"];out center 40;'
    filas = []
    for e in map(dic, lista_de(http.get_json("https://overpass-api.de/api/interpreter", {"data": consulta}), "elements")):
        centro = dic(e.get("center"))
        plat, plon = numero(e.get("lat", centro.get("lat"))), numero(e.get("lon", centro.get("lon")))
        etiquetas = dic(e.get("tags"))
        calle = " ".join(str(x) for x in (etiquetas.get("addr:street"), etiquetas.get("addr:housenumber")) if x)
        filas.append({"nombre": cadena(etiquetas.get("name")) or "Sin nombre", "direccion": calle,
                      "distancia_m": round(distancia(lat, lon, plat, plon)), "mapa": mapa(round(plat, 6), round(plon, 6))})
    filas = sorted(filas, key=lambda f: f["distancia_m"])[:15]
    return respuesta(filas, lambda n: f"{n} lugares de tipo {tipo} a menos de {radio} m. El más cercano: "
                     f"{filas[0]['nombre']} a {filas[0]['distancia_m']} m.",
                     f"No encontré {tipo} a menos de {radio} m de «{sitio}».")


CERCA = conector(
    key="lugares_cercanos", proveedor="OpenStreetMap (Photon + Overpass)", url="https://wiki.openstreetmap.org/wiki/Overpass_API",
    hosts=["photon.komoot.io", "overpass-api.de"], nombre="Qué hay cerca (farmacias, cajeros, restaurantes…)",
    descripcion="busca farmacias, cajeros, bancos, hospitales, restaurantes, supermercados y más cerca de una "
                "dirección, ordenados por distancia.",
    categoria="lugares", entradas={"lugar": campo("Dirección o lugar de referencia")}, requeridos=["lugar"],
    ejemplo={"lugar": "Parque de la Leyenda Vallenata, Valledupar"},
    parametros=objeto({"que": campo("Qué buscar", enum=list(CERCANOS), default="farmacia"),
                       "radio_metros": campo("Radio (metros)", tipo="integer", minimum=200, maximum=3000, default=1000)}),
    ejemplo_parametros={"que": "farmacia", "radio_metros": 1000},
    salida=salida_lista({"nombre": campo("Nombre"), "direccion": campo("Dirección"),
                         "distancia_m": campo("Distancia (m)", tipo="integer"), "mapa": campo("Mapa")}, maximo=15),
    restricciones=["Envía a OpenStreetMap solo el lugar de referencia y sus coordenadas.",
                   "Datos colaborativos: horarios y existencia pueden no estar al día."],
    run=cercanos, max_requests=2)


def vuelos(http, inputs, parameters):
    lat, lon, nombre = ubicar(http, texto(inputs, "ciudad", 100))
    data = http.get_json("https://opensky-network.org/api/states/all", {
        "lamin": f"{lat - 1:.4f}", "lamax": f"{lat + 1:.4f}", "lomin": f"{lon - 1:.4f}", "lomax": f"{lon + 1:.4f}"})
    filas = []
    for estado in lista_de(data, "states"):
        if not isinstance(estado, list) or len(estado) < 10:
            continue
        filas.append({"vuelo": cadena(estado[1]).strip() or cadena(estado[0]), "pais_origen": cadena(estado[2]),
                      "altitud_m": round(numero(estado[7])), "velocidad_kmh": round(numero(estado[9]) * 3.6),
                      "en_tierra": "sí" if estado[8] is True else "no"})
    filas = sorted(filas, key=lambda f: f["en_tierra"])[:20]
    return respuesta(filas, lambda n: f"Ahora hay {n} aviones cerca de {nombre}.",
                     f"Ahora no hay aviones con transpondedor visible cerca de {nombre}.")


VUELOS = conector(
    key="vuelos_en_vivo", proveedor="OpenSky Network", url="https://openskynetwork.github.io/opensky-api/rest.html",
    hosts=["geocoding-api.open-meteo.com", "opensky-network.org"], nombre="Aviones volando cerca de una ciudad",
    descripcion="aviones que vuelan ahora sobre una ciudad (unos 100 km a la redonda): vuelo, país, altura y velocidad.",
    categoria="lugares", entradas=ENTRADA_CIUDAD, requeridos=["ciudad"], ejemplo={"ciudad": "Bogotá"},
    salida=salida_lista({"vuelo": campo("Vuelo"), "pais_origen": campo("País de origen"),
                         "altitud_m": campo("Altura (m)", tipo="integer"), "velocidad_kmh": campo("Velocidad (km/h)", tipo="integer"),
                         "en_tierra": campo("En tierra")}),
    restricciones=["Envía a OpenSky solo un recuadro de coordenadas alrededor de la ciudad.",
                   "Cupo anónimo diario limitado."], run=vuelos, max_requests=2)


# ── Países y economía ───────────────────────────────────────────────────────────────────────
BANCO = "https://api.worldbank.org/v2/country/"
REGIONES = {"Latin America & Caribbean": "América Latina y el Caribe", "East Asia & Pacific": "Asia oriental y el Pacífico",
            "Europe & Central Asia": "Europa y Asia central", "North America": "América del Norte",
            "Middle East & North Africa": "Oriente Medio y Norte de África",
            "Middle East, North Africa, Afghanistan & Pakistan": "Oriente Medio y Norte de África",
            "South Asia": "Asia meridional", "Sub-Saharan Africa": "África subsahariana"}
INGRESOS = {"High income": "altos", "Upper middle income": "medianos altos", "Lower middle income": "medianos bajos",
            "Low income": "bajos"}


def buscar_pais(http, nombre):
    """País escrito en español → {codigo (ISO2), nombre} con el geocodificador de Open-Meteo (sin clave)."""
    hallados = [dic(g) for g in lista_de(http.get_json(GEO, {"name": nombre, "count": "10", "language": "es", "format": "json"}), "results")]
    paises = [g for g in hallados if str(g.get("feature_code") or "").startswith("PCL")] or hallados
    codigo = str(dic(paises[0]).get("country_code") or "").upper() if paises else ""
    if not re.fullmatch(r"[A-Z]{2}", codigo):
        raise ConnectorInputError("pais")
    return {"codigo": codigo, "nombre": cadena(paises[0].get("country") or paises[0].get("name"))}


def ficha_banco(http, codigo):
    """Datos oficiales del país en el Banco Mundial (ISO3, capital, región, nivel de ingresos)."""
    data = http.get_json(BANCO + codigo, {"format": "json"})
    filas = data[1] if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list) else []
    if not filas:
        raise ConnectorInputError("pais")
    return dic(filas[0])


def ultimo_valor(http, codigo, indicador):
    data = http.get_json(f"{BANCO}{codigo}/indicator/{indicador}", {"format": "json", "mrv": "1"})
    filas = data[1] if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list) else []
    return dic(filas[0]) if filas else {}


def pais(http, inputs, parameters):
    p = buscar_pais(http, texto(inputs, "pais", 80))
    ficha = ficha_banco(http, p["codigo"])
    poblacion = ultimo_valor(http, p["codigo"], "SP.POP.TOTL")
    habitantes = int(numero(poblacion.get("value")))
    region_en = cadena(dic(ficha.get("region")).get("value"))
    region = REGIONES.get(region_en, region_en)
    ingresos = INGRESOS.get(cadena(dic(ficha.get("incomeLevel")).get("value")), "sin dato")
    capital = cadena(ficha.get("capitalCity"))
    return {"nombre": p["nombre"], "capital": capital, "poblacion": habitantes, "anio_poblacion": cadena(poblacion.get("date")),
            "region": region, "ingresos": ingresos, "codigo": p["codigo"],
            "bandera": f"https://flagcdn.com/w320/{p['codigo'].lower()}.png",
            "resumen": f"{p['nombre']}: capital {capital or 'sin dato'}, {pesos(habitantes, 0)} habitantes "
                       f"({cadena(poblacion.get('date')) or 'sin año'}), región {region}, ingresos {ingresos} (Banco Mundial)."}


PAIS = conector(
    key="datos_pais", proveedor="Banco Mundial + Open-Meteo", url="https://datahelpdesk.worldbank.org/knowledgebase/articles/898590",
    hosts=["geocoding-api.open-meteo.com", "api.worldbank.org"], nombre="Datos de un país",
    descripcion="capital, población, región, nivel de ingresos, código y bandera de cualquier país.",
    categoria="lugares", entradas={"pais": campo("País", "Nombre en español, por ejemplo «Japón»")}, requeridos=["pais"],
    ejemplo={"pais": "Colombia"},
    salida=salida_ficha({"nombre": campo("País"), "capital": campo("Capital"), "poblacion": campo("Población", tipo="integer"),
                         "anio_poblacion": campo("Año de la población"), "region": campo("Región"),
                         "ingresos": campo("Nivel de ingresos"), "codigo": campo("Código"), "bandera": campo("Bandera")}),
    restricciones=["Envía solo el nombre del país (a Open-Meteo) y su código (al Banco Mundial)."], run=pais, max_requests=3)


INDICADORES = {
    "poblacion": ("SP.POP.TOTL", "Población", ""), "pib": ("NY.GDP.MKTP.CD", "PIB", " US$"),
    "pib_por_persona": ("NY.GDP.PCAP.CD", "PIB por persona", " US$"), "inflacion": ("FP.CPI.TOTL.ZG", "Inflación", " %"),
    "desempleo": ("SL.UEM.TOTL.ZS", "Desempleo", " %"), "esperanza_de_vida": ("SP.DYN.LE00.IN", "Esperanza de vida", " años"),
    "uso_de_internet": ("IT.NET.USER.ZS", "Personas que usan internet", " %"),
    "gasto_en_educacion": ("SE.XPD.TOTL.GD.ZS", "Gasto en educación", " % del PIB"),
    "pobreza_extrema": ("SI.POV.DDAY", "Pobreza extrema", " %"),
}


def banco_mundial(http, inputs, parameters):
    p = buscar_pais(http, texto(inputs, "pais", 80))
    clave = opcion(parameters, "indicador", tuple(INDICADORES), "poblacion")
    codigo, etiqueta, unidad = INDICADORES[clave]
    data = http.get_json(f"{BANCO}{p['codigo']}/indicator/{codigo}", {"format": "json", "mrv": "15", "per_page": "15"})
    filas = []
    if isinstance(data, list) and len(data) > 1:
        for d in map(dic, data[1] if isinstance(data[1], list) else []):
            if d.get("value") is not None and str(d.get("date") or "").isdigit():
                filas.append({"anio": cadena(d.get("date")), "valor": round(numero(d.get("value")), 2)})
    filas.sort(key=lambda f: f["anio"])
    nombre = p["nombre"]
    return respuesta(filas, lambda n: f"{etiqueta} de {nombre}: {pesos(filas[-1]['valor'])}{unidad} en {filas[-1]['anio']} "
                     f"({n} años de datos del Banco Mundial).", f"El Banco Mundial no tiene datos de {etiqueta.lower()} para {nombre}.")


BANCO_MUNDIAL = conector(
    key="indicadores_pais", proveedor="Banco Mundial", url="https://datahelpdesk.worldbank.org/knowledgebase/articles/889392",
    hosts=["geocoding-api.open-meteo.com", "api.worldbank.org"], nombre="Indicadores de un país año por año (Banco Mundial)",
    descripcion="evolución de población, PIB, inflación, desempleo, esperanza de vida, internet, educación o pobreza "
                "de cualquier país en los últimos años (sirve para gráficos).",
    categoria="economia", entradas={"pais": campo("País")}, requeridos=["pais"], ejemplo={"pais": "Colombia"},
    parametros=objeto({"indicador": campo("Indicador", enum=list(INDICADORES), default="poblacion")}),
    ejemplo_parametros={"indicador": "inflacion"},
    salida=salida_lista({"anio": campo("Año"), "valor": campo("Valor", tipo="number")}),
    restricciones=["Envía solo el nombre del país y el indicador elegido."], run=banco_mundial, max_requests=2)


ALIAS_CRIPTO = {"btc": "bitcoin", "eth": "ethereum", "xrp": "ripple", "bnb": "binancecoin", "sol": "solana",
                "doge": "dogecoin", "usdt": "tether", "ada": "cardano", "usdc": "usd-coin", "ltc": "litecoin"}


def cripto(http, inputs, parameters):
    pedidas = [ALIAS_CRIPTO.get(m, m) for m in (re.sub(r"\s+", "-", parte.strip().lower())
                                                for parte in texto(inputs, "monedas", 120).split(",")) if m][:5]
    if not pedidas or not all(re.match(r"^[a-z0-9-]{2,40}$", m) for m in pedidas):
        raise ConnectorInputError("monedas")
    data = dic(http.get_json("https://api.coingecko.com/api/v3/simple/price", {
        "ids": ",".join(pedidas), "vs_currencies": "usd,cop", "include_24hr_change": "true"}))
    filas = [{"cripto": m, "precio_usd": numero(dic(data[m]).get("usd")), "precio_cop": numero(dic(data[m]).get("cop")),
              "cambio_24h_pct": round(numero(dic(data[m]).get("usd_24h_change")), 2)} for m in pedidas if m in data]
    return respuesta(filas, lambda n: "; ".join(f"{f['cripto']}: US$ {pesos(f['precio_usd'])} ({f['cambio_24h_pct']:+.2f} % en 24 h)"
                                                for f in filas) + ".",
                     "No encontré esas criptomonedas; usa nombres como bitcoin o ethereum.")


CRIPTO = conector(
    key="precio_cripto", proveedor="CoinGecko", url="https://www.coingecko.com/en/api",
    hosts=["api.coingecko.com"], nombre="Precio de criptomonedas",
    descripcion="precio actual en dólares y pesos colombianos y cambio en 24 horas de bitcoin, ethereum y otras.",
    categoria="economia", entradas={"monedas": campo("Criptomonedas", "Separadas por coma: bitcoin, ethereum")},
    requeridos=["monedas"], ejemplo={"monedas": "bitcoin, ethereum"},
    salida=salida_lista({"cripto": campo("Criptomoneda"), "precio_usd": campo("Precio (US$)", tipo="number"),
                         "precio_cop": campo("Precio (COP)", tipo="number"), "cambio_24h_pct": campo("Cambio 24 h (%)", tipo="number")}, maximo=5),
    restricciones=["Envía a CoinGecko solo los nombres de las monedas.", "Información, no asesoría financiera."], run=cripto)


def datos_abiertos(http, inputs, parameters):
    tema = texto(inputs, "tema", 150)
    data = http.get_json("https://api.us.socrata.com/api/catalog/v1", {
        "domains": "www.datos.gov.co", "q": tema, "limit": "8", "only": "dataset"})
    filas = []
    for r in map(dic, lista_de(data, "results")):
        recurso = dic(r.get("resource"))
        filas.append({"conjunto": corto(recurso.get("name"), 200), "descripcion": corto(recurso.get("description"), 300),
                      "actualizado": cadena(recurso.get("updatedAt"))[:10], "enlace": cadena(r.get("permalink") or r.get("link"))})
    return respuesta(filas, lambda n: f"{n} conjuntos de datos abiertos de Colombia sobre «{tema}». El primero: {filas[0]['conjunto']}.",
                     f"No encontré datos abiertos de Colombia sobre «{tema}».")


DATOS_ABIERTOS = conector(
    key="datos_abiertos_colombia", proveedor="datos.gov.co", url="https://dev.socrata.com/docs/other/discovery",
    hosts=["api.us.socrata.com"], nombre="Buscar datos abiertos de Colombia",
    descripcion="encuentra conjuntos de datos públicos del Estado colombiano (DANE, salud, educación, contratos "
                "SECOP, municipios…) sobre un tema, con su enlace.",
    categoria="datos", entradas={"tema": campo("Tema", "Por ejemplo «matrícula escolar Cesar»")}, requeridos=["tema"],
    ejemplo={"tema": "contratos SECOP"},
    salida=salida_lista({"conjunto": campo("Conjunto de datos"), "descripcion": campo("Descripción"),
                         "actualizado": campo("Actualizado"), "enlace": campo("Enlace")}),
    restricciones=["Envía al catálogo de datos abiertos solo el tema."], run=datos_abiertos)


MUNDO = [SISMOS, FOTO_NASA, ESTACION, LANZAMIENTOS, SOL, AIRE, LUGARES, CERCA, VUELOS, PAIS, BANCO_MUNDIAL, CRIPTO,
         DATOS_ABIERTOS]
