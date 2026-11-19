"""Verificar referencias académicas con Crossref (gratis, sin clave; metadatos CC0).

Nunca afirma que una referencia es inventada: si no aparece, dice «no encontrada en Crossref»,
porque libros, tesis y fuentes sin DOI pueden no estar ahí.
"""
import re
import unicodedata

from connectors.base import Connector, ConnectorInputError

API = "https://api.crossref.org/works"
CAMPOS = "DOI,title,author,issued,container-title,volume,issue,page,type"
UMBRAL = 0.75


def palabras(texto):
    plano = unicodedata.normalize("NFD", str(texto)).encode("ascii", "ignore").decode().lower()
    return {palabra for palabra in re.split(r"[^a-z0-9]+", plano) if len(palabra) > 3}


def tokens(texto):
    plano = unicodedata.normalize("NFD", str(texto)).encode("ascii", "ignore").decode().lower()
    return {parte for parte in re.split(r"[^a-z]+", plano) if len(parte) >= 2}


def autor_coincide(item, referencia):
    """None si Crossref no trae autores; si los trae, al menos un apellido debe estar en la cita.
    Evita dar por «encontrado» otro trabajo con un título genérico («Metodología de la investigación»)."""
    apellidos = set()
    for autor in item.get("author") or []:
        if isinstance(autor, dict):
            apellidos |= tokens(autor.get("family") or autor.get("name") or "")
    return bool(apellidos & tokens(referencia)) if apellidos else None


def coincidencia(titulo, referencia):
    propias = palabras(titulo)
    return len(propias & palabras(referencia)) / len(propias) if propias else 0.0


def inicial(nombre):
    return " ".join(f"{parte[0]}." for parte in re.split(r"[\s-]+", nombre) if parte and parte[0].isalpha())


def autores_apa(autores):
    nombres = []
    for autor in autores:
        apellido = str(autor.get("family") or autor.get("name") or "").strip()
        if apellido:
            iniciales = inicial(str(autor.get("given") or ""))
            nombres.append(f"{apellido}, {iniciales}" if iniciales else apellido)
    if len(nombres) > 20:
        nombres = nombres[:19] + ["…", nombres[-1]]
        return ", ".join(nombres)
    if len(nombres) <= 1:
        return "".join(nombres)
    return ", ".join(nombres[:-1]) + ", & " + nombres[-1]


def anio_de(item):
    partes = ((item.get("issued") or {}).get("date-parts") or [[None]])[0]
    return str(partes[0]) if partes and isinstance(partes[0], int) else ""


def apa(item, titulo, anio):
    autores = autores_apa(item.get("author") or [])
    revista = " ".join((item.get("container-title") or [""])[0].split())
    cita = f"{autores} ({anio or 's. f.'}). {titulo.rstrip('.')}."
    if revista:
        cita += f" {revista}"
        if item.get("volume"):
            cita += f", {item['volume']}"
            if item.get("issue"):
                cita += f"({item['issue']})"
        if item.get("page"):
            cita += f", {item['page']}"
        cita += "."
    return f"{cita} https://doi.org/{item['DOI']}".strip()


def verificar(http, inputs, parameters):
    referencia = " ".join(str(inputs["referencia"]).split())
    if not 10 <= len(referencia) <= 1000:
        raise ConnectorInputError("referencia")
    data = http.get_json(API, {"query.bibliographic": referencia, "rows": "5", "select": CAMPOS})
    items = ((data.get("message") or {}).get("items") or []) if isinstance(data, dict) else []
    anios_citados = set(re.findall(r"\b(1[89]\d{2}|20\d{2})\b", referencia))
    mejor, orden, puntaje = None, None, 0.0
    for item in items:
        if not isinstance(item, dict):
            continue
        titulo = " ".join(((item.get("title") or [""])[0]).split())
        if not titulo or not item.get("DOI"):
            continue
        valor = coincidencia(titulo, referencia)
        autor = autor_coincide(item, referencia)
        if autor is False:
            continue  # mismo título, otros autores: es otro trabajo
        # Mismo título repetido (re-depósitos, preprints): se prefiere con autor comprobado, del año
        # citado y con revista.
        clave = (valor, autor is True, anio_de(item) in anios_citados, bool(item.get("container-title")))
        if orden is None or clave > orden:
            mejor, orden, puntaje = (item, titulo), clave, valor
    vacio = {"doi": "", "titulo": "", "autores": "", "anio": "", "revista": "", "cita_apa": ""}
    if not mejor or puntaje < UMBRAL:
        return vacio | {"encontrada": False, "confianza": round(puntaje, 2),
                        "resumen": "No la encontré en Crossref. Puede estar mal escrita, ser un libro, tesis o página "
                                   "sin DOI, o no existir: revísala a mano."}
    item, titulo = mejor
    anio = anio_de(item)
    aviso = (f" Ojo: el año citado ({', '.join(sorted(anios_citados))}) no coincide con el registrado en Crossref "
             f"({anio}); puede ser otra edición o un re-depósito: revisa cuál citas.") \
        if anio and anios_citados and anio not in anios_citados else ""
    if autor_coincide(item, referencia) is None:
        aviso += " Crossref no trae autores para comprobarlos."
    return {"encontrada": True, "confianza": round(puntaje, 2), "doi": str(item["DOI"]), "titulo": titulo,
            "autores": autores_apa(item.get("author") or []), "anio": anio,
            "revista": " ".join((item.get("container-title") or [""])[0].split()),
            "cita_apa": apa(item, titulo, anio), "resumen": f"Encontrada en Crossref: {titulo} ({anio or 's. f.'}).{aviso}"}


TEXTO = {"type": "string"}
REFERENCIA = Connector(
    key="verificar_referencia", version=1, provider="Crossref", provider_url="https://www.crossref.org",
    hosts=["api.crossref.org"],
    name="Verificar una referencia bibliográfica (Crossref)",
    description="Conector externo (Crossref): busca una referencia, cita o bibliografía académica (artículo, paper) "
                "para comprobar que existe y devuelve su DOI, autores, año, revista y la cita en formato APA 7.",
    category="documentos", input_type="texto", output_type="datos",
    input_schema={"type": "object", "additionalProperties": False, "required": ["referencia"], "properties": {
        "referencia": {"type": "string", "title": "Referencia", "minLength": 10, "maxLength": 1000,
                       "description": "La referencia tal como aparece en el trabajo"}}},
    parameter_schema={"type": "object", "properties": {}, "additionalProperties": False},
    output_schema={"type": "object", "additionalProperties": False,
                   "required": ["encontrada", "confianza", "doi", "titulo", "autores", "anio", "revista", "cita_apa", "resumen"],
                   "properties": {"encontrada": {"type": "boolean", "title": "Encontrada"},
                                  "confianza": {"type": "number", "title": "Confianza"},
                                  "doi": {**TEXTO, "title": "DOI"}, "titulo": {**TEXTO, "title": "Título"},
                                  "autores": {**TEXTO, "title": "Autores"}, "anio": {**TEXTO, "title": "Año"},
                                  "revista": {**TEXTO, "title": "Revista"}, "cita_apa": {**TEXTO, "title": "Cita APA"},
                                  "resumen": {**TEXTO, "title": "Resumen"}}},
    example_inputs={"referencia": "Vaswani, A. et al. (2017). Attention is all you need."}, example_parameters={},
    constraints=["Envía a Crossref solo el texto de la referencia.",
                 "Si no aparece no significa que sea inventada: libros, tesis y fuentes sin DOI pueden no estar."],
    run=verificar, max_requests=1)
