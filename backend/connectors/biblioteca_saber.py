"""Biblioteca · saber: enciclopedia, investigación, libros, salud científica e idiomas."""
import re
from urllib.parse import quote

from connectors.biblioteca_base import (ConnectorInputError, cadena, campo, conector, corto, dic, entero,
                                        lista_de, numero, objeto, opcion, respuesta, salida_ficha, salida_lista, texto)

PALABRA = re.compile(r"^[A-Za-zÀ-ÿñÑ' -]{1,50}$")


def nombres(valor, maximo=3):
    return corto(", ".join(str(item) for item in (valor if isinstance(valor, list) else [])[:maximo] if item), 200)


# ── Wikipedia ────────────────────────────────────────────────────────────────────────────────
def wikipedia(http, inputs, parameters):
    tema = texto(inputs, "tema", 150)
    idioma = opcion(parameters, "idioma", ("es", "en"), "es")
    base = f"https://{idioma}.wikipedia.org"
    hallados = lista_de(http.get_json(f"{base}/w/api.php", {"action": "query", "list": "search", "srsearch": tema,
                                                          "srlimit": "1", "format": "json"}), "query", "search")
    if not hallados:
        return {"titulo": "", "extracto": "", "enlace": "", "resumen": f"Wikipedia no tiene un artículo sobre «{tema}»."}
    titulo = cadena(dic(hallados[0]).get("title"))
    ruta = quote(titulo.replace(" ", "_"), safe="")
    data = dic(http.get_json(f"{base}/api/rest_v1/page/summary/{ruta}"))
    extracto = corto(data.get("extract"), 1500)
    enlace = cadena(dic(dic(data.get("content_urls")).get("desktop")).get("page")) or f"{base}/wiki/{ruta}"
    return {"titulo": titulo, "extracto": extracto, "enlace": enlace,
            "resumen": f"{titulo}: {corto(extracto, 600)} (Wikipedia)"}


WIKIPEDIA = conector(
    key="wikipedia_resumen", proveedor="Wikipedia", url="https://www.mediawiki.org/wiki/API:Main_page",
    hosts=["es.wikipedia.org", "en.wikipedia.org"], nombre="Explicar un tema con Wikipedia",
    descripcion="busca un tema, persona, lugar o concepto y devuelve su resumen de la enciclopedia, con el enlace.",
    categoria="educacion", entradas={"tema": campo("Tema", "Lo que quieres saber, por ejemplo «fotosíntesis»")},
    requeridos=["tema"], ejemplo={"tema": "Gabriel García Márquez"},
    parametros=objeto({"idioma": campo("Idioma", enum=["es", "en"], default="es")}), ejemplo_parametros={"idioma": "es"},
    salida=salida_ficha({"titulo": campo("Artículo"), "extracto": campo("Resumen del artículo"), "enlace": campo("Enlace")}),
    restricciones=["Envía a Wikipedia solo el tema buscado.", "Contenido CC BY-SA de Wikipedia: cita el enlace."],
    run=wikipedia, max_requests=2)


# ── Artículos científicos ───────────────────────────────────────────────────────────────────
def articulos(http, inputs, parameters):
    tema = texto(inputs, "tema", 200)
    cantidad = entero(parameters.get("cantidad"), 1, 10, 5, "cantidad")
    data = http.get_json("https://api.openalex.org/works", {
        "search": tema, "per-page": str(cantidad),
        "select": "id,display_name,publication_year,doi,cited_by_count,authorships"})
    filas = []
    for obra in map(dic, lista_de(data, "results")):
        autores = [dic(dic(a).get("author")).get("display_name") for a in lista_de(obra, "authorships")]
        filas.append({"titulo": corto(obra.get("display_name"), 250), "anio": cadena(obra.get("publication_year")),
                      "autores": nombres(autores), "citas": int(numero(obra.get("cited_by_count"))),
                      "enlace": cadena(obra.get("doi") or obra.get("id"))})
    return respuesta(filas, lambda n: f"{n} artículos sobre «{tema}»: " + "; ".join(
        f"{f['titulo']} ({f['anio']})" for f in filas[:3]) + ".", f"No encontré artículos sobre «{tema}».")


ARTICULOS = conector(
    key="articulos_cientificos", proveedor="OpenAlex", url="https://docs.openalex.org",
    hosts=["api.openalex.org"], nombre="Buscar artículos científicos",
    descripcion="encuentra artículos e investigaciones de cualquier campo con autores, año, citas y enlace "
                "(útil para tesis, trabajos y referencias).",
    categoria="educacion", entradas={"tema": campo("Tema de investigación")}, requeridos=["tema"],
    ejemplo={"tema": "energía solar en zonas rurales"},
    parametros=objeto({"cantidad": campo("Cuántos", tipo="integer", minimum=1, maximum=10, default=5)}),
    ejemplo_parametros={"cantidad": 5},
    salida=salida_lista({"titulo": campo("Título"), "anio": campo("Año"), "autores": campo("Autores"),
                         "citas": campo("Citas", tipo="integer"), "enlace": campo("Enlace")}),
    restricciones=["Envía a OpenAlex solo el tema buscado."], run=articulos)


# ── Libros ──────────────────────────────────────────────────────────────────────────────────
def libros(http, inputs, parameters):
    busqueda = texto(inputs, "busqueda", 200)
    data = http.get_json("https://openlibrary.org/search.json", {
        "q": busqueda, "limit": "6", "fields": "title,author_name,first_publish_year,key"})
    filas = [{"titulo": corto(d.get("title"), 250), "autores": nombres(d.get("author_name")),
              "anio": cadena(d.get("first_publish_year")),
              "enlace": f"https://openlibrary.org{d['key']}" if str(d.get("key") or "").startswith("/") else ""}
             for d in map(dic, lista_de(data, "docs"))]
    return respuesta(filas, lambda n: f"{n} libros para «{busqueda}»: " + "; ".join(
        f"{f['titulo']} de {f['autores'] or 'autor desconocido'}" for f in filas[:3]) + ".",
        f"No encontré libros para «{busqueda}».")


LIBROS = conector(
    key="buscar_libros", proveedor="Open Library", url="https://openlibrary.org/developers/api",
    hosts=["openlibrary.org"], nombre="Buscar libros",
    descripcion="busca libros por título, autor o tema y devuelve autores, año de publicación y enlace.",
    categoria="educacion", entradas={"busqueda": campo("Título, autor o tema")}, requeridos=["busqueda"],
    ejemplo={"busqueda": "Cien años de soledad"},
    salida=salida_lista({"titulo": campo("Título"), "autores": campo("Autores"), "anio": campo("Primera edición"),
                         "enlace": campo("Enlace")}),
    restricciones=["Envía a Open Library solo la búsqueda."], run=libros)


# ── Salud y medicina (literatura científica) ────────────────────────────────────────────────
EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"


def pubmed(http, inputs, parameters):
    tema = texto(inputs, "tema", 200)
    ids = [str(i) for i in lista_de(http.get_json(EUTILS + "esearch.fcgi", {
        "db": "pubmed", "term": tema, "retmode": "json", "retmax": "6", "sort": "relevance"}), "esearchresult", "idlist")
        if str(i).isdigit()]
    filas = []
    if ids:
        data = dic(dic(http.get_json(EUTILS + "esummary.fcgi", {"db": "pubmed", "id": ",".join(ids), "retmode": "json"})).get("result"))
        for uid in ids:
            d = dic(data.get(uid))
            if d:
                filas.append({"titulo": corto(d.get("title"), 250), "revista": cadena(d.get("source")),
                              "fecha": cadena(d.get("pubdate")), "autores": nombres([dic(a).get("name") for a in lista_de(d, "authors")]),
                              "enlace": f"https://pubmed.ncbi.nlm.nih.gov/{uid}/"})
    return respuesta(filas, lambda n: f"{n} estudios de salud sobre «{tema}» en PubMed.",
                     f"No encontré estudios en PubMed sobre «{tema}».")


PUBMED = conector(
    key="estudios_salud", proveedor="PubMed (NCBI)", url="https://www.ncbi.nlm.nih.gov/books/NBK25501/",
    hosts=["eutils.ncbi.nlm.nih.gov"], nombre="Buscar estudios de salud y medicina",
    descripcion="encuentra estudios médicos publicados (PubMed) con revista, fecha, autores y enlace. "
                "Funciona mejor con términos en inglés.",
    categoria="salud", entradas={"tema": campo("Tema de salud", "Por ejemplo «diabetes exercise»")}, requeridos=["tema"],
    ejemplo={"tema": "dengue vaccine"},
    salida=salida_lista({"titulo": campo("Título"), "revista": campo("Revista"), "fecha": campo("Fecha"),
                         "autores": campo("Autores"), "enlace": campo("Enlace")}),
    restricciones=["Envía a PubMed solo el tema buscado.", "Información científica: no reemplaza una consulta médica."],
    run=pubmed, max_requests=2)


def europe_pmc(http, inputs, parameters):
    tema = texto(inputs, "tema", 200)
    data = http.get_json("https://www.ebi.ac.uk/europepmc/webservices/rest/search", {
        "query": tema, "format": "json", "pageSize": "6", "resultType": "lite"})
    filas = []
    for d in map(dic, lista_de(data, "resultList", "result")):
        enlace = f"https://doi.org/{d['doi']}" if d.get("doi") else (
            f"https://europepmc.org/article/{cadena(d.get('source'))}/{cadena(d.get('id'))}" if d.get("id") else "")
        filas.append({"titulo": corto(d.get("title"), 250), "autores": corto(d.get("authorString"), 200),
                      "revista": cadena(d.get("journalTitle")), "anio": cadena(d.get("pubYear")),
                      "acceso_abierto": "sí" if d.get("isOpenAccess") == "Y" else "no", "enlace": enlace})
    return respuesta(filas, lambda n: f"{n} artículos biomédicos sobre «{tema}» (Europe PMC).",
                     f"No encontré artículos en Europe PMC sobre «{tema}».")


EUROPE_PMC = conector(
    key="articulos_biomedicos", proveedor="Europe PMC", url="https://europepmc.org/RestfulWebService",
    hosts=["www.ebi.ac.uk"], nombre="Artículos de salud y biología con acceso abierto",
    descripcion="busca artículos biomédicos y de ciencias de la vida, indicando cuáles se pueden leer gratis.",
    categoria="salud", entradas={"tema": campo("Tema")}, requeridos=["tema"], ejemplo={"tema": "malaria Colombia"},
    salida=salida_lista({"titulo": campo("Título"), "autores": campo("Autores"), "revista": campo("Revista"),
                         "anio": campo("Año"), "acceso_abierto": campo("Lectura gratis"), "enlace": campo("Enlace")}),
    restricciones=["Envía a Europe PMC solo el tema buscado.", "Información científica: no reemplaza una consulta médica."],
    run=europe_pmc)


# ── Idiomas ─────────────────────────────────────────────────────────────────────────────────
def diccionario(http, inputs, parameters):
    palabra = texto(inputs, "palabra", 50)
    if not PALABRA.match(palabra):
        raise ConnectorInputError("palabra")
    data = http.get_json(f"https://api.dictionaryapi.dev/api/v2/entries/en/{quote(palabra.lower(), safe='')}")
    filas = []
    for entrada in map(dic, data if isinstance(data, list) else []):
        for significado in map(dic, lista_de(entrada, "meanings")):
            for definicion in map(dic, lista_de(significado, "definitions")[:2]):
                filas.append({"tipo": cadena(significado.get("partOfSpeech")), "definicion": corto(definicion.get("definition"), 400),
                              "ejemplo": corto(definicion.get("example"), 300)})
    filas = filas[:10]
    return respuesta(filas, lambda n: f"«{palabra}»: {filas[0]['definicion']}",
                     f"No encontré «{palabra}» en el diccionario de inglés.")


DICCIONARIO = conector(
    key="diccionario_ingles", proveedor="Free Dictionary API", url="https://dictionaryapi.dev",
    hosts=["api.dictionaryapi.dev"], nombre="Diccionario de inglés",
    descripcion="definiciones, tipo de palabra y ejemplos de uso de una palabra en inglés.",
    categoria="idiomas", entradas={"palabra": campo("Palabra en inglés")}, requeridos=["palabra"], ejemplo={"palabra": "serendipity"},
    salida=salida_lista({"tipo": campo("Tipo"), "definicion": campo("Definición"), "ejemplo": campo("Ejemplo")}),
    restricciones=["Envía al diccionario solo la palabra."], run=diccionario)


RELACIONES = {"significado": "ml", "suena_como": "sl"}


def palabras(http, inputs, parameters):
    palabra = texto(inputs, "palabra", 60)
    relacion = opcion(parameters, "relacion", tuple(RELACIONES), "significado")
    idioma = opcion(parameters, "idioma", ("es", "en"), "es")
    consulta = {RELACIONES[relacion]: palabra, "max": "15"}
    if idioma == "es":
        consulta["v"] = "es"
    data = http.get_json("https://api.datamuse.com/words", consulta)
    filas = [{"palabra": cadena(dic(d).get("word"))} for d in (data if isinstance(data, list) else []) if dic(d).get("word")][:15]
    return respuesta(filas, lambda n: f"Palabras para «{palabra}»: " + ", ".join(f["palabra"] for f in filas) + ".",
                     f"No encontré palabras relacionadas con «{palabra}».")


PALABRAS = conector(
    key="palabras_relacionadas", proveedor="Datamuse", url="https://www.datamuse.com/api/",
    hosts=["api.datamuse.com"], nombre="Sinónimos y palabras relacionadas",
    descripcion="sinónimos o palabras de significado parecido (o que suenan parecido) para escribir mejor.",
    categoria="idiomas", entradas={"palabra": campo("Palabra o idea")}, requeridos=["palabra"], ejemplo={"palabra": "feliz"},
    parametros=objeto({"relacion": campo("Buscar", enum=list(RELACIONES), default="significado"),
                       "idioma": campo("Idioma", enum=["es", "en"], default="es")}),
    ejemplo_parametros={"relacion": "significado", "idioma": "es"},
    salida=salida_lista({"palabra": campo("Palabra")}),
    restricciones=["Envía a Datamuse solo la palabra."], run=palabras)


IDIOMAS_LT = {"es": "es", "en": "en-US", "pt": "pt-BR", "fr": "fr", "auto": "auto"}


def ortografia(http, inputs, parameters):
    escrito = str(inputs.get("texto") or "").strip()
    if not escrito or len(escrito) > 6000:
        raise ConnectorInputError("texto")
    idioma = opcion(parameters, "idioma", tuple(IDIOMAS_LT), "es")
    data = dic(http.post_form("https://api.languagetool.org/v2/check", {"text": escrito, "language": IDIOMAS_LT[idioma]}))
    errores, hallazgos = [], []
    for m in map(dic, lista_de(data, "matches")):
        inicio, largo = int(numero(m.get("offset"), -1)), int(numero(m.get("length"), 0))
        if not 0 <= inicio <= inicio + largo <= len(escrito):
            continue
        sugerencias = [dic(r).get("value") for r in lista_de(m, "replacements")]
        sugerencia = cadena(sugerencias[0]) if sugerencias and sugerencias[0] is not None else ""
        hallazgos.append((inicio, largo, sugerencia))
        errores.append({"fragmento": corto(escrito[inicio:inicio + largo], 120), "error": corto(m.get("message"), 300),
                        "sugerencia": sugerencia})
    # Aplica las sugerencias de atrás hacia adelante sin pisar correcciones superpuestas.
    corregido, limite = escrito, len(escrito) + 1
    for inicio, largo, sugerencia in sorted(hallazgos, reverse=True):
        if sugerencia and inicio + largo <= limite:
            corregido = corregido[:inicio] + sugerencia + corregido[inicio + largo:]
            limite = inicio
    errores = errores[:30]
    salida = respuesta(errores, lambda n: f"Encontré {n} detalle{'s' if n != 1 else ''} de ortografía o gramática y te dejo el texto corregido.",
                       "No encontré errores de ortografía ni gramática.")
    salida["texto_corregido"] = corregido
    return salida


SALIDA_ORTOGRAFIA = salida_lista({"fragmento": campo("Fragmento"), "error": campo("Qué está mal"),
                                  "sugerencia": campo("Sugerencia")}, maximo=30)
SALIDA_ORTOGRAFIA["properties"]["texto_corregido"] = campo("Texto corregido")
SALIDA_ORTOGRAFIA["required"].append("texto_corregido")

ORTOGRAFIA = conector(
    key="corregir_ortografia", proveedor="LanguageTool", url="https://languagetool.org/http-api/",
    hosts=["api.languagetool.org"], nombre="Corregir ortografía y gramática",
    descripcion="revisa un texto (español, inglés, portugués o francés), explica cada error y devuelve el texto corregido.",
    categoria="idiomas", entradas={"texto": campo("Texto a revisar")}, requeridos=["texto"],
    ejemplo={"texto": "Hola, mañana boy a la reunion."},
    parametros=objeto({"idioma": campo("Idioma", enum=list(IDIOMAS_LT), default="es")}), ejemplo_parametros={"idioma": "es"},
    salida=SALIDA_ORTOGRAFIA, output_type="texto",
    restricciones=["Envía tu texto a LanguageTool (servicio externo) para revisarlo; evita datos sensibles.",
                   "Hasta 6.000 caracteres por revisión."],
    run=ortografia, envia_contenido=True)


IDIOMAS_TRADUCIR = ["es", "en", "pt", "fr", "it", "de"]


def traducir(http, inputs, parameters):
    escrito = str(inputs.get("texto") or "").strip()
    if not escrito or len(escrito.encode("utf-8")) > 500:
        raise ConnectorInputError("texto")
    origen = opcion(parameters, "de", IDIOMAS_TRADUCIR, "es")
    destino = opcion(parameters, "a", IDIOMAS_TRADUCIR, "en")
    if origen == destino:
        raise ConnectorInputError("a")
    data = dic(http.get_json("https://api.mymemory.translated.net/get", {"q": escrito, "langpair": f"{origen}|{destino}"}))
    traduccion = corto(dic(data.get("responseData")).get("translatedText"), 2000)
    if int(numero(data.get("responseStatus"), 0)) != 200 or not traduccion or "MYMEMORY WARNING" in traduccion:
        raise ConnectorInputError("cupo_traduccion")
    return {"traduccion": traduccion, "resumen": f"Traducción ({origen} → {destino}): {traduccion}"}


TRADUCIR = conector(
    key="traducir_frase", proveedor="MyMemory", url="https://mymemory.translated.net/doc/spec.php",
    hosts=["api.mymemory.translated.net"], nombre="Traducir un texto corto",
    descripcion="traduce frases cortas entre español, inglés, portugués, francés, italiano y alemán.",
    categoria="idiomas", entradas={"texto": campo("Texto a traducir", "Hasta unos 500 caracteres")}, requeridos=["texto"],
    ejemplo={"texto": "¿Dónde queda la estación de bus?"},
    parametros=objeto({"de": campo("Desde", enum=IDIOMAS_TRADUCIR, default="es"), "a": campo("Hacia", enum=IDIOMAS_TRADUCIR, default="en")}),
    ejemplo_parametros={"de": "es", "a": "en"},
    salida=salida_ficha({"traduccion": campo("Traducción")}), output_type="texto",
    restricciones=["Envía tu texto a MyMemory (servicio externo); evita datos sensibles.",
                   "Cupo diario gratuito limitado; para textos largos usa la IA."],
    run=traducir, envia_contenido=True)


SABER = [WIKIPEDIA, ARTICULOS, LIBROS, PUBMED, EUROPE_PMC, DICCIONARIO, PALABRAS,
         ORTOGRAFIA, TRADUCIR]
