"""Biblioteca · vida diaria: comida y salud, cultura y ocio, imágenes, deportes y noticias."""
import html
import re

from connectors.biblioteca_base import (ConnectorInputError, cadena, campo, conector, corto, dic, entero,
                                        lista_de, numero, objeto, opcion, pesos, respuesta, salida_ficha,
                                        salida_lista, texto)
from connectors.biblioteca_mundo import buscar_pais, ficha_banco

AVISO_SALUD = "Información de referencia: no reemplaza la consulta con un profesional de la salud."


# ── Comida y salud ──────────────────────────────────────────────────────────────────────────
def gramos(nutrientes, clave, unidad="g"):
    valor = nutrientes.get(clave)
    return f"{pesos(numero(valor), 1)} {unidad}" if isinstance(valor, (int, float)) and not isinstance(valor, bool) else "sin dato"


def alimentos(http, inputs, parameters):
    busqueda = texto(inputs, "producto", 120)
    campos = "code,product_name,brands,nutriscore_grade,nutriments"
    if re.fullmatch(r"\d{8,14}", busqueda):
        producto = dic(dic(http.get_json(f"https://world.openfoodfacts.org/api/v2/product/{busqueda}.json", {"fields": campos})).get("product"))
        productos = [producto] if producto else []
    else:
        productos = [dic(p) for p in lista_de(http.get_json("https://search.openfoodfacts.org/search", {
            "q": busqueda, "page_size": "6", "fields": campos}), "hits")]
    filas = []
    for p in productos:
        n = dic(p.get("nutriments"))
        marcas = p.get("brands")
        marca = ", ".join(str(m) for m in marcas[:2]) if isinstance(marcas, list) else cadena(marcas)
        filas.append({"producto": corto(p.get("product_name") or "Sin nombre", 150), "marca": corto(marca, 120),
                      "nutriscore": nota.upper() if (nota := str(p.get("nutriscore_grade") or "").lower()) in ("a", "b", "c", "d", "e") else "sin dato",
                      "calorias_100g": gramos(n, "energy-kcal_100g", "kcal"), "azucar_100g": gramos(n, "sugars_100g"),
                      "grasa_100g": gramos(n, "fat_100g"), "sal_100g": gramos(n, "salt_100g"),
                      "proteina_100g": gramos(n, "proteins_100g")})
    return respuesta(filas, lambda c: f"{filas[0]['producto']} ({filas[0]['marca'] or 'sin marca'}): {filas[0]['calorias_100g']}, "
                     f"azúcar {filas[0]['azucar_100g']} y Nutri-Score {filas[0]['nutriscore']} por 100 g.",
                     f"No encontré «{busqueda}» en Open Food Facts.")


ALIMENTOS = conector(
    key="info_nutricional", proveedor="Open Food Facts", url="https://openfoodfacts.github.io/openfoodfacts-server/api/",
    hosts=["world.openfoodfacts.org", "search.openfoodfacts.org"], nombre="Información nutricional de un alimento",
    descripcion="calorías, azúcar, grasa, sal, proteína y Nutri-Score de un producto por nombre o código de barras.",
    categoria="salud", entradas={"producto": campo("Producto o código de barras", "Por ejemplo «avena» o 7702007012345")},
    requeridos=["producto"], ejemplo={"producto": "galletas de avena"},
    salida=salida_lista({"producto": campo("Producto"), "marca": campo("Marca"), "nutriscore": campo("Nutri-Score"),
                         "calorias_100g": campo("Calorías por 100 g"), "azucar_100g": campo("Azúcar por 100 g"),
                         "grasa_100g": campo("Grasa por 100 g"), "sal_100g": campo("Sal por 100 g"),
                         "proteina_100g": campo("Proteína por 100 g")}),
    restricciones=["Envía a Open Food Facts solo el producto buscado.", "Base colaborativa: verifica la etiqueta.", AVISO_SALUD],
    run=alimentos)


def primero(lista_textos, maximo):
    return corto(lista_textos[0], maximo) if isinstance(lista_textos, list) and lista_textos else ""


def medicamento(http, inputs, parameters):
    nombre = texto(inputs, "medicamento", 60)
    if not re.fullmatch(r"[A-Za-z0-9 \-]{2,60}", nombre):
        raise ConnectorInputError("medicamento")
    data = http.get_json("https://api.fda.gov/drug/label.json", {"search": f'openfda.generic_name:"{nombre}"', "limit": "1"})
    etiqueta = dic((lista_de(data, "results") or [{}])[0])
    if not etiqueta:
        return {"nombre": nombre, "para_que_sirve": "", "advertencias": "", "dosis": "",
                "resumen": f"No encontré «{nombre}» en las etiquetas de openFDA (usa el nombre genérico en inglés)."}
    openfda = dic(etiqueta.get("openfda"))
    nombre_oficial = primero(openfda.get("generic_name"), 100) or nombre
    uso = primero(etiqueta.get("indications_and_usage") or etiqueta.get("purpose"), 900)
    return {"nombre": nombre_oficial, "para_que_sirve": uso,
            "advertencias": primero(etiqueta.get("boxed_warning") or etiqueta.get("warnings"), 900),
            "dosis": primero(etiqueta.get("dosage_and_administration"), 700),
            "resumen": f"{nombre_oficial}: {corto(uso, 300)} ({AVISO_SALUD})"}


MEDICAMENTO = conector(
    key="info_medicamento", proveedor="openFDA", url="https://open.fda.gov/apis/drug/label/",
    hosts=["api.fda.gov"], nombre="Para qué sirve un medicamento",
    descripcion="usos, advertencias y dosis según la etiqueta oficial (EE. UU., en inglés) de un medicamento "
                "buscado por su nombre genérico en inglés (ibuprofen, acetaminophen, loratadine…).",
    categoria="salud", entradas={"medicamento": campo("Nombre genérico en inglés")}, requeridos=["medicamento"],
    ejemplo={"medicamento": "ibuprofen"},
    salida=salida_ficha({"nombre": campo("Medicamento"), "para_que_sirve": campo("Para qué sirve"),
                         "advertencias": campo("Advertencias"), "dosis": campo("Dosis")}),
    restricciones=["Envía a openFDA solo el nombre del medicamento.", AVISO_SALUD], run=medicamento)


INDICADORES_OMS = {"esperanza_de_vida": ("WHOSIS_000001", "Esperanza de vida al nacer", " años"),
                   "mortalidad_infantil": ("MDG_0000000001", "Mortalidad infantil", " por 1.000 nacidos vivos"),
                   "obesidad_adultos": ("NCD_BMI_30A", "Obesidad en adultos", " %"),
                   "medicos": ("HWF_0001", "Médicos", " por 10.000 habitantes")}


def oms(http, inputs, parameters):
    p = buscar_pais(http, texto(inputs, "pais", 80))
    codigo, etiqueta, unidad = INDICADORES_OMS[opcion(parameters, "indicador", tuple(INDICADORES_OMS), "esperanza_de_vida")]
    iso3 = cadena(ficha_banco(http, p["codigo"]).get("id"))
    if not re.fullmatch(r"[A-Z]{3}", iso3):
        raise ConnectorInputError("pais")
    data = http.get_json(f"https://ghoapi.azureedge.net/api/{codigo}", {"$filter": f"SpatialDim eq '{iso3}'"})
    por_anio = {}
    for d in map(dic, lista_de(data, "value")):
        if d.get("Dim1") not in (None, "SEX_BTSX", "BTSX") or d.get("NumericValue") is None:
            continue
        por_anio[cadena(d.get("TimeDim"))] = round(numero(d.get("NumericValue")), 2)
    filas = [{"anio": anio, "valor": valor} for anio, valor in sorted(por_anio.items())][-20:]
    nombre = p["nombre"]
    return respuesta(filas, lambda n: f"{etiqueta} en {nombre}: {pesos(filas[-1]['valor'])}{unidad} en {filas[-1]['anio']} (OMS).",
                     f"La OMS no tiene datos de {etiqueta.lower()} para {nombre}.")


OMS = conector(
    key="indicadores_salud_oms", proveedor="Organización Mundial de la Salud (GHO)", url="https://www.who.int/data/gho/info/gho-odata-api",
    hosts=["geocoding-api.open-meteo.com", "api.worldbank.org", "ghoapi.azureedge.net"],
    nombre="Indicadores de salud de un país (OMS)",
    descripcion="evolución de esperanza de vida, mortalidad infantil, obesidad o médicos por habitante de un país.",
    categoria="salud", entradas={"pais": campo("País")}, requeridos=["pais"], ejemplo={"pais": "Colombia"},
    parametros=objeto({"indicador": campo("Indicador", enum=list(INDICADORES_OMS), default="esperanza_de_vida")}),
    ejemplo_parametros={"indicador": "esperanza_de_vida"},
    salida=salida_lista({"anio": campo("Año"), "valor": campo("Valor", tipo="number")}),
    restricciones=["Envía solo el nombre del país y el indicador elegido."], run=oms, max_requests=3)


def recetas(http, inputs, parameters):
    plato = texto(inputs, "plato", 80)
    filas = []
    for m in map(dic, lista_de(http.get_json("https://www.themealdb.com/api/json/v1/1/search.php", {"s": plato}), "meals")[:5]):
        ingredientes = [" ".join(str(x).strip() for x in (m.get(f"strMeasure{i}"), m.get(f"strIngredient{i}")) if x and str(x).strip())
                        for i in range(1, 21) if str(m.get(f"strIngredient{i}") or "").strip()]
        filas.append({"receta": cadena(m.get("strMeal")), "categoria": cadena(m.get("strCategory")),
                      "origen": cadena(m.get("strArea")), "ingredientes": corto(", ".join(ingredientes), 600),
                      "preparacion": corto(m.get("strInstructions"), 900), "imagen": cadena(m.get("strMealThumb"))})
    return respuesta(filas, lambda n: f"{n} recetas para «{plato}». Ingredientes de {filas[0]['receta']}: {filas[0]['ingredientes']}.",
                     f"No encontré recetas para «{plato}» (prueba en inglés: chicken, rice, cake).")


RECETAS = conector(
    key="buscar_recetas", proveedor="TheMealDB", url="https://www.themealdb.com/api.php",
    hosts=["www.themealdb.com"], nombre="Buscar recetas de cocina",
    descripcion="recetas del mundo con ingredientes, preparación y foto (nombres en inglés: chicken, pasta, cake…).",
    categoria="comida", entradas={"plato": campo("Plato o ingrediente")}, requeridos=["plato"], ejemplo={"plato": "chicken"},
    salida=salida_lista({"receta": campo("Receta"), "categoria": campo("Categoría"), "origen": campo("Origen"),
                         "ingredientes": campo("Ingredientes"), "preparacion": campo("Preparación"), "imagen": campo("Imagen")}, maximo=5),
    restricciones=["Envía a TheMealDB solo el plato buscado.", "Usa la clave pública de prueba del proveedor."], run=recetas)


# ── Cultura ─────────────────────────────────────────────────────────────────────────────────
def canciones(http, inputs, parameters):
    busqueda = texto(inputs, "busqueda", 120)
    data = http.get_json("https://itunes.apple.com/search", {"term": busqueda, "media": "music", "entity": "song",
                                                            "limit": "8", "country": "CO"})
    filas = [{"cancion": cadena(d.get("trackName")), "artista": cadena(d.get("artistName")), "album": cadena(d.get("collectionName")),
              "anio": cadena(d.get("releaseDate"))[:4], "muestra": cadena(d.get("previewUrl")), "enlace": cadena(d.get("trackViewUrl"))}
             for d in map(dic, lista_de(data, "results"))]
    return respuesta(filas, lambda n: f"{n} canciones para «{busqueda}»: " + "; ".join(
        f"{f['cancion']} de {f['artista']}" for f in filas[:3]) + ".", f"No encontré canciones para «{busqueda}».")


CANCIONES = conector(
    key="buscar_musica", proveedor="iTunes Search", url="https://performance-partners.apple.com/search-api",
    hosts=["itunes.apple.com"], nombre="Buscar canciones y artistas",
    descripcion="canciones de un artista o con un título, con álbum, año, muestra de 30 segundos y enlace.",
    categoria="cultura", entradas={"busqueda": campo("Canción o artista")}, requeridos=["busqueda"], ejemplo={"busqueda": "Diomedes Díaz"},
    salida=salida_lista({"cancion": campo("Canción"), "artista": campo("Artista"), "album": campo("Álbum"), "anio": campo("Año"),
                         "muestra": campo("Muestra de audio"), "enlace": campo("Enlace")}),
    restricciones=["Envía a Apple solo la búsqueda."], run=canciones)


def artistas(http, inputs, parameters):
    nombre = texto(inputs, "artista", 120)
    data = http.get_json("https://musicbrainz.org/ws/2/artist", {"query": nombre, "fmt": "json", "limit": "5"})
    filas = [{"artista": cadena(d.get("name")), "tipo": cadena(d.get("type")), "pais": cadena(d.get("country")),
              "desde": cadena(dic(d.get("life-span")).get("begin")), "detalle": cadena(d.get("disambiguation")),
              "enlace": f"https://musicbrainz.org/artist/{d['id']}" if re.fullmatch(r"[0-9a-f-]{36}", str(d.get("id") or "")) else ""}
             for d in map(dic, lista_de(data, "artists"))]
    return respuesta(filas, lambda n: f"{filas[0]['artista']}: {filas[0]['tipo'] or 'artista'} de {filas[0]['pais'] or 'origen desconocido'}"
                     f"{', activo desde ' + filas[0]['desde'] if filas[0]['desde'] else ''}.", f"No encontré a «{nombre}» en MusicBrainz.")


ARTISTAS = conector(
    key="info_artista", proveedor="MusicBrainz", url="https://musicbrainz.org/doc/MusicBrainz_API",
    hosts=["musicbrainz.org"], nombre="Información de un artista o banda",
    descripcion="tipo (solista o grupo), país, desde cuándo está activo y enlace de un artista musical.",
    categoria="cultura", entradas={"artista": campo("Artista o banda")}, requeridos=["artista"], ejemplo={"artista": "Carlos Vives"},
    salida=salida_lista({"artista": campo("Artista"), "tipo": campo("Tipo"), "pais": campo("País"), "desde": campo("Desde"),
                         "detalle": campo("Detalle"), "enlace": campo("Enlace")}),
    restricciones=["Envía a MusicBrainz solo el nombre del artista."], run=artistas)


def arte_chicago(http, inputs, parameters):
    tema = texto(inputs, "tema", 120)
    data = http.get_json("https://api.artic.edu/api/v1/artworks/search", {
        "q": tema, "limit": "6", "fields": "id,title,artist_display,date_display,image_id"})
    filas = []
    for d in map(dic, lista_de(data, "data")):
        imagen = str(d.get("image_id") or "")
        filas.append({"obra": corto(d.get("title"), 200), "artista": corto(d.get("artist_display"), 200),
                      "fecha": cadena(d.get("date_display")),
                      "imagen": f"https://www.artic.edu/iiif/2/{imagen}/full/843,/0/default.jpg" if re.fullmatch(r"[0-9a-f-]{36}", imagen) else "",
                      "enlace": f"https://www.artic.edu/artworks/{int(numero(d.get('id')))}" if d.get("id") else ""})
    return respuesta(filas, lambda n: f"{n} obras de arte sobre «{tema}». La primera: {filas[0]['obra']} ({filas[0]['artista']}).",
                     f"No encontré obras sobre «{tema}» en el Art Institute of Chicago.")


ARTE = conector(
    key="obras_de_arte", proveedor="Art Institute of Chicago", url="https://api.artic.edu/docs/",
    hosts=["api.artic.edu"], nombre="Buscar obras de arte",
    descripcion="pinturas, esculturas y fotografías de un museo de arte, con artista, fecha, imagen y enlace.",
    categoria="cultura", entradas={"tema": campo("Tema, artista o estilo")}, requeridos=["tema"], ejemplo={"tema": "Monet"},
    salida=salida_lista({"obra": campo("Obra"), "artista": campo("Artista"), "fecha": campo("Fecha"),
                         "imagen": campo("Imagen"), "enlace": campo("Enlace")}),
    restricciones=["Envía al museo solo la búsqueda."], run=arte_chicago)


def arte_met(http, inputs, parameters):
    tema = texto(inputs, "tema", 120)
    base = "https://collectionapi.metmuseum.org/public/collection/v1/"
    ids = [int(i) for i in lista_de(http.get_json("https://collectionapi.metmuseum.org/public/collection/v1.1/search",
                                                  {"q": tema, "hasImages": "true", "limit": "3"}), "objectIDs")
           if isinstance(i, int) and not isinstance(i, bool)][:3]
    filas = []
    for identificador in ids:
        d = dic(http.get_json(f"{base}objects/{identificador}"))
        filas.append({"obra": corto(d.get("title"), 200), "artista": cadena(d.get("artistDisplayName")) or "Autor desconocido",
                      "fecha": cadena(d.get("objectDate")), "cultura": cadena(d.get("culture") or d.get("department")),
                      "imagen": cadena(d.get("primaryImageSmall")), "enlace": cadena(d.get("objectURL"))})
    return respuesta(filas, lambda n: f"{n} obras del Museo Metropolitano sobre «{tema}». La primera: {filas[0]['obra']}.",
                     f"No encontré obras con imagen sobre «{tema}» en el Museo Metropolitano.")


ARTE_MET = conector(
    key="obras_museo_met", proveedor="The Met Museum", url="https://metmuseum.github.io",
    hosts=["collectionapi.metmuseum.org"], nombre="Obras del Museo Metropolitano de Nueva York",
    descripcion="obras con imagen de todas las épocas y culturas, con artista, fecha y enlace.",
    categoria="cultura", entradas={"tema": campo("Tema, artista o cultura")}, requeridos=["tema"], ejemplo={"tema": "sunflowers"},
    salida=salida_lista({"obra": campo("Obra"), "artista": campo("Artista"), "fecha": campo("Fecha"), "cultura": campo("Cultura"),
                         "imagen": campo("Imagen"), "enlace": campo("Enlace")}, maximo=3),
    restricciones=["Envía al museo solo la búsqueda."], run=arte_met, max_requests=4)


# ── Imágenes e íconos ───────────────────────────────────────────────────────────────────────
def imagenes(http, inputs, parameters):
    tema = texto(inputs, "tema", 120)
    data = http.get_json("https://api.openverse.org/v1/images/", {"q": tema, "page_size": "8"})
    filas = []
    for d in map(dic, lista_de(data, "results")):
        licencia = " ".join(str(x) for x in ("CC", str(d.get("license") or "").upper(), d.get("license_version")) if x)
        filas.append({"titulo": corto(d.get("title") or "Sin título", 200), "autor": cadena(d.get("creator")) or "Desconocido",
                      "licencia": licencia, "imagen": cadena(d.get("url")), "pagina": cadena(d.get("foreign_landing_url"))})
    return respuesta(filas, lambda n: f"{n} imágenes libres sobre «{tema}». Cita al autor y la licencia al usarlas.",
                     f"No encontré imágenes libres sobre «{tema}».")


IMAGENES = conector(
    key="imagenes_libres", proveedor="Openverse", url="https://api.openverse.org/v1/",
    hosts=["api.openverse.org"], nombre="Buscar imágenes libres de derechos",
    descripcion="fotos e ilustraciones con licencia Creative Commons para presentaciones, trabajos y redes, con su autor.",
    categoria="imagenes", entradas={"tema": campo("Qué imagen buscas")}, requeridos=["tema"], ejemplo={"tema": "cafetal"},
    salida=salida_lista({"titulo": campo("Título"), "autor": campo("Autor"), "licencia": campo("Licencia"),
                         "imagen": campo("Imagen"), "pagina": campo("Página de origen")}),
    restricciones=["Envía a Openverse solo la búsqueda.", "Respeta la licencia: cita autor y origen."], run=imagenes)


def iconos(http, inputs, parameters):
    tema = texto(inputs, "tema", 60)
    data = http.get_json("https://api.iconify.design/search", {"query": tema, "limit": "24"})
    filas = []
    for nombre in lista_de(data, "icons"):
        if isinstance(nombre, str) and re.fullmatch(r"[a-z0-9-]+:[a-z0-9-]+", nombre):
            prefijo, icono = nombre.split(":")
            filas.append({"icono": nombre, "imagen": f"https://api.iconify.design/{prefijo}/{icono}.svg"})
    filas = filas[:20]
    return respuesta(filas, lambda n: f"{n} íconos para «{tema}» (SVG gratis).", f"No encontré íconos para «{tema}» (prueba en inglés).")


ICONOS = conector(
    key="buscar_iconos", proveedor="Iconify", url="https://iconify.design/docs/api/",
    hosts=["api.iconify.design"], nombre="Buscar íconos",
    descripcion="íconos SVG gratuitos de muchas colecciones abiertas para diseños y presentaciones (búsqueda en inglés).",
    categoria="imagenes", entradas={"tema": campo("Tema del ícono", "Por ejemplo «home», «coffee»")}, requeridos=["tema"],
    ejemplo={"tema": "coffee"},
    salida=salida_lista({"icono": campo("Ícono"), "imagen": campo("Imagen SVG")}),
    restricciones=["Envía a Iconify solo la búsqueda.", "Cada colección tiene su licencia abierta."], run=iconos)


# ── Deportes ────────────────────────────────────────────────────────────────────────────────
def equipos(http, inputs, parameters):
    equipo = texto(inputs, "equipo", 80)
    data = http.get_json("https://www.thesportsdb.com/api/v1/json/123/searchteams.php", {"t": equipo})
    # El fútbol primero: «Junior» debe ser el de Barranquilla antes que un equipo de hockey homónimo.
    hallados = sorted(map(dic, lista_de(data, "teams")), key=lambda d: d.get("strSport") != "Soccer")
    filas = [{"equipo": cadena(d.get("strTeam")), "deporte": cadena(d.get("strSport")), "liga": cadena(d.get("strLeague")),
              "pais": cadena(d.get("strCountry")), "estadio": cadena(d.get("strStadium")),
              "fundado": cadena(d.get("intFormedYear")) if str(d.get("intFormedYear") or "0") != "0" else "",
              "escudo": cadena(d.get("strBadge") or d.get("strTeamBadge")),
              "historia": corto(d.get("strDescriptionES") or d.get("strDescriptionEN"), 600)}
             for d in hallados[:5]]
    return respuesta(filas, lambda n: f"{filas[0]['equipo']} ({filas[0]['deporte']}, {filas[0]['liga']}, {filas[0]['pais']}); "
                     f"estadio {filas[0]['estadio'] or 'sin dato'}, fundado en {filas[0]['fundado'] or 'sin dato'}.",
                     f"No encontré el equipo «{equipo}».")


EQUIPOS = conector(
    key="info_equipo_deportivo", proveedor="TheSportsDB", url="https://www.thesportsdb.com/free_sports_api",
    hosts=["www.thesportsdb.com"], nombre="Información de un equipo deportivo",
    descripcion="liga, país, estadio, año de fundación, escudo e historia de equipos de fútbol y otros deportes.",
    categoria="deportes", entradas={"equipo": campo("Equipo")}, requeridos=["equipo"], ejemplo={"equipo": "Junior"},
    salida=salida_lista({"equipo": campo("Equipo"), "deporte": campo("Deporte"), "liga": campo("Liga"), "pais": campo("País"),
                         "estadio": campo("Estadio"), "fundado": campo("Fundado"), "escudo": campo("Escudo"),
                         "historia": campo("Historia")}, maximo=5),
    restricciones=["Envía a TheSportsDB solo el nombre del equipo.", "Usa la clave pública de prueba del proveedor."], run=equipos)


# ── Noticias y tendencias ───────────────────────────────────────────────────────────────────
IDIOMA_NOTICIAS = {"espanol": "spanish", "ingles": "english", "cualquiera": ""}


def noticias(http, inputs, parameters):
    tema = texto(inputs, "tema", 120)
    if len(tema) < 3:
        raise ConnectorInputError("tema")
    idioma = IDIOMA_NOTICIAS[opcion(parameters, "idioma", tuple(IDIOMA_NOTICIAS), "espanol")]
    dias = entero(parameters.get("dias"), 1, 30, 3, "dias")
    consulta = f'"{tema}"' if " " in tema else tema
    if idioma:
        consulta += f" sourcelang:{idioma}"
    data = http.get_json("https://api.gdeltproject.org/api/v2/doc/doc", {
        "query": consulta, "mode": "artlist", "format": "json", "maxrecords": "10", "sort": "datedesc", "timespan": f"{dias}d"})
    filas = []
    for d in map(dic, lista_de(data, "articles")):
        visto = cadena(d.get("seendate"))
        filas.append({"titular": corto(d.get("title"), 250), "medio": cadena(d.get("domain")),
                      "fecha": f"{visto[0:4]}-{visto[4:6]}-{visto[6:8]}" if len(visto) >= 8 else "", "enlace": cadena(d.get("url"))})
    return respuesta(filas, lambda n: f"{n} noticias recientes sobre «{tema}»: " + "; ".join(
        f"{f['titular']} ({f['medio']})" for f in filas[:3]) + ".", f"No encontré noticias recientes sobre «{tema}».")


NOTICIAS = conector(
    key="noticias_recientes", proveedor="GDELT", url="https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/",
    hosts=["api.gdeltproject.org"], nombre="Noticias recientes sobre un tema",
    descripcion="titulares de medios de todo el mundo de los últimos días sobre un tema, con el medio y el enlace.",
    categoria="noticias", entradas={"tema": campo("Tema")}, requeridos=["tema"], ejemplo={"tema": "Valledupar"},
    parametros=objeto({"idioma": campo("Idioma de los medios", enum=list(IDIOMA_NOTICIAS), default="espanol"),
                       "dias": campo("Últimos días", tipo="integer", minimum=1, maximum=30, default=3)}),
    ejemplo_parametros={"idioma": "espanol", "dias": 3},
    salida=salida_lista({"titular": campo("Titular"), "medio": campo("Medio"), "fecha": campo("Fecha"), "enlace": campo("Enlace")}, maximo=10),
    restricciones=["Envía a GDELT solo el tema.", "GDELT reúne medios automáticamente: verifica la fuente."], run=noticias)


def tecnologia(http, inputs, parameters):
    tema = texto(inputs, "tema", 120)
    data = http.get_json("https://hn.algolia.com/api/v1/search", {"query": tema, "tags": "story", "hitsPerPage": "8"})
    filas = []
    for d in map(dic, lista_de(data, "hits")):
        identificador = str(d.get("objectID") or "")
        filas.append({"titulo": corto(html.unescape(str(d.get("title") or "")), 250),
                      "enlace": cadena(d.get("url")) or (f"https://news.ycombinator.com/item?id={identificador}" if identificador.isdigit() else ""),
                      "puntos": int(numero(d.get("points"))), "fecha": cadena(d.get("created_at"))[:10]})
    return respuesta(filas, lambda n: f"{n} historias de tecnología sobre «{tema}» en Hacker News.",
                     f"No encontré historias sobre «{tema}» en Hacker News.")


TECNOLOGIA = conector(
    key="tendencias_tecnologia", proveedor="Hacker News (Algolia)", url="https://hn.algolia.com/api",
    hosts=["hn.algolia.com"], nombre="Tendencias de tecnología (Hacker News)",
    descripcion="lo que se comenta sobre un tema en la comunidad tecnológica Hacker News (en inglés), con puntos y enlace.",
    categoria="noticias", entradas={"tema": campo("Tema")}, requeridos=["tema"], ejemplo={"tema": "open source AI"},
    salida=salida_lista({"titulo": campo("Título"), "enlace": campo("Enlace"), "puntos": campo("Puntos", tipo="integer"),
                         "fecha": campo("Fecha")}),
    restricciones=["Envía a Hacker News solo el tema."], run=tecnologia)


VIDA = [ALIMENTOS, MEDICAMENTO, OMS, RECETAS, CANCIONES, ARTISTAS, ARTE, ARTE_MET, IMAGENES, ICONOS, EQUIPOS,
        NOTICIAS, TECNOLOGIA]
