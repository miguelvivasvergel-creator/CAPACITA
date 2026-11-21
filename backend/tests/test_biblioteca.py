"""Biblioteca de APIs abiertas: cada conector con respuestas simuladas del proveedor (sin red real),
su salida validada contra el contrato y reglas comunes (sin claves, componibles, consultas seguras)."""
import unittest
from urllib.parse import parse_qs, urlsplit

import httpx
from jsonschema import Draft202012Validator

from connectors import PROFILE, REGISTRY
from connectors.biblioteca_mundo import MUNDO
from connectors.biblioteca_saber import SABER
from connectors.biblioteca_vida import VIDA
from services.connector_runtime import run_connector

BIBLIOTECA = [*SABER, *MUNDO, *VIDA]
PUBLICA = lambda host, port, type=None: [(None, None, None, None, ("93.184.216.34", port))]

# host → respuesta, o {fragmento de la ruta: respuesta} cuando un conector llama dos rutas del mismo host.
PROVEEDORES = {
    "es.wikipedia.org": {"/w/api.php": {"query": {"search": [{"title": "Gabriel García Márquez"}]}},
                         "/api/rest_v1/": {"extract": "Escritor colombiano, Nobel de Literatura 1982.",
                                           "content_urls": {"desktop": {"page": "https://es.wikipedia.org/wiki/GGM"}}}},
    "api.openalex.org": {"results": [{"id": "https://openalex.org/W1", "display_name": "Solar energy in rural areas",
                                      "publication_year": 2020, "doi": "https://doi.org/10.1/x", "cited_by_count": 12,
                                      "authorships": [{"author": {"display_name": "Ana Ruiz"}}]}]},
    "api.semanticscholar.org": {"data": [{"title": "ML in agriculture", "year": 2021, "authors": [{"name": "B. Paz"}],
                                          "citationCount": 3, "url": "https://www.semanticscholar.org/p/1", "tldr": None}]},
    "openlibrary.org": {"docs": [{"title": "Cien años de soledad", "author_name": ["Gabriel García Márquez"],
                                  "first_publish_year": 1967, "key": "/works/OL1W"}]},
    "www.googleapis.com": {"items": [{"volumeInfo": {"title": "Hábitos atómicos", "authors": ["James Clear"],
                                                     "publishedDate": "2018-10-16", "description": "Cambios pequeños.",
                                                     "infoLink": "https://books.google.com/x"}}]},
    "eutils.ncbi.nlm.nih.gov": {"/esearch": {"esearchresult": {"idlist": ["123"]}},
                                "/esummary": {"result": {"123": {"title": "Dengue vaccine trial", "source": "Lancet",
                                                                 "pubdate": "2024", "authors": [{"name": "Smith J"}]}}}},
    "www.ebi.ac.uk": {"resultList": {"result": [{"title": "Malaria in Colombia", "authorString": "Ruiz A",
                                                 "journalTitle": "Malar J", "pubYear": "2023", "isOpenAccess": "Y",
                                                 "doi": "10.1/m"}]}},
    "api.dictionaryapi.dev": [{"meanings": [{"partOfSpeech": "noun", "definitions": [
        {"definition": "Finding good things by chance.", "example": "It was pure serendipity."}]}]}],
    "api.datamuse.com": [{"word": "contento"}, {"word": "alegre"}],
    "api.languagetool.org": {"matches": [
        {"offset": 13, "length": 3, "message": "Posible error ortográfico", "replacements": [{"value": "voy"}]},
        {"offset": 22, "length": 7, "message": "Falta la tilde", "replacements": [{"value": "reunión"}]}]},
    "api.mymemory.translated.net": {"responseData": {"translatedText": "Where is the bus station?"}, "responseStatus": 200},
    "earthquake.usgs.gov": {"features": [
        {"properties": {"place": "10 km N of Bogotá, Colombia", "mag": 4.8, "time": 1763600000000, "url": "https://usgs/1"}},
        {"properties": {"place": "Honshu, Japan", "mag": 5.1, "time": 1763600000000, "url": "https://usgs/2"}}]},
    "api.nasa.gov": {"title": "Galaxia espiral", "date": "2026-11-20", "explanation": "A spiral galaxy.",
                     "url": "https://apod.nasa.gov/x.jpg"},
    "api.wheretheiss.at": {"latitude": 4.5, "longitude": -74.1, "altitude": 420.3, "velocity": 27600.5},
    "ll.thespacedevs.com": {"results": [{"name": "Falcon 9 | Starlink", "net": "2026-11-25T14:00:00Z",
                                         "pad": {"location": {"name": "Cabo Cañaveral"}},
                                         "launch_service_provider": {"name": "SpaceX"}}]},
    "geocoding-api.open-meteo.com": {"results": [{"name": "Santa Marta", "admin1": "Magdalena", "country": "Colombia",
                                                  "country_code": "CO", "feature_code": "PPLA",
                                                  "latitude": 11.24, "longitude": -74.2}]},
    "api.open-meteo.com": {"daily": {"sunrise": ["2026-11-20T05:58"], "sunset": ["2026-11-20T17:40"],
                                     "daylight_duration": [42120.0]}},
    "air-quality-api.open-meteo.com": {"current": {"us_aqi": 62, "pm2_5": 18.2, "pm10": 30.1}},
    "photon.komoot.io": {"features": [{"properties": {"name": "Plaza Alfonso López", "city": "Valledupar",
                                                      "country": "Colombia", "street": "Calle 16"},
                                       "geometry": {"coordinates": [-73.25, 10.47]}}]},
    "overpass-api.de": {"elements": [{"lat": 10.48, "lon": -73.25, "tags": {}},
                                     {"lat": 10.4705, "lon": -73.2505, "tags": {"name": "Droguería Central", "addr:street": "Calle 16"}}]},
    "opensky-network.org": {"states": [["abc123", "AVA123  ", "Colombia", 0, 0, -74.1, 4.6, 3000.0, False, 200.0]]},
    "api.worldbank.org": {"/indicator/": [{"page": 1}, [{"date": "2024", "value": 6.6}, {"date": "2023", "value": 11.7},
                                                        {"date": "2022", "value": None}]],
                          "/country/": [{"page": 1}, [{"id": "COL", "iso2Code": "CO", "name": "Colombia", "capitalCity": "Bogota",
                                                      "region": {"value": "Latin America & Caribbean"},
                                                      "incomeLevel": {"value": "Upper middle income"}}]]},
    "api.coingecko.com": {"bitcoin": {"usd": 95000, "cop": 380000000, "usd_24h_change": 1.5}},
    "api.us.socrata.com": {"results": [{"resource": {"name": "SECOP II - Contratos", "description": "Contratos públicos",
                                                     "updatedAt": "2026-11-01T00:00:00Z"},
                                        "permalink": "https://www.datos.gov.co/d/x"}]},
    "search.openfoodfacts.org": {"hits": [{"product_name": "Galletas de avena", "brands": ["Marca"], "nutriscore_grade": "c",
                                           "nutriments": {"energy-kcal_100g": 450, "sugars_100g": 20.5}}]},
    "world.openfoodfacts.org": {"product": {"product_name": "Leche", "nutriments": {}, "nutriscore_grade": "unknown"}},
    "api.fda.gov": {"results": [{"openfda": {"generic_name": ["IBUPROFEN"]}, "indications_and_usage": ["Temporary pain relief."],
                                 "warnings": ["Stomach bleeding warning."], "dosage_and_administration": ["1 tablet every 6 hours."]}]},
    "ghoapi.azureedge.net": {"value": [{"TimeDim": 2019, "NumericValue": 77.1, "Dim1": "SEX_BTSX"},
                                       {"TimeDim": 2019, "NumericValue": 74.0, "Dim1": "SEX_MLE"},
                                       {"TimeDim": 2021, "NumericValue": 76.8, "Dim1": "SEX_BTSX"}]},
    "www.themealdb.com": {"meals": [{"strMeal": "Chicken Curry", "strCategory": "Chicken", "strArea": "Indian",
                                     "strInstructions": "Cook slowly.", "strMealThumb": "https://x.jpg",
                                     "strIngredient1": "Chicken", "strMeasure1": "1 kg", "strIngredient2": "", "strMeasure2": ""}]},
    "itunes.apple.com": {"results": [{"trackName": "Tu dulce voz", "artistName": "Diomedes Díaz", "collectionName": "Álbum",
                                      "releaseDate": "1990-01-01T00:00:00Z", "previewUrl": "https://p", "trackViewUrl": "https://t"}]},
    "musicbrainz.org": {"artists": [{"id": "12345678-1234-1234-1234-123456789012", "name": "Carlos Vives", "type": "Person",
                                     "country": "CO", "life-span": {"begin": "1961"}}]},
    "api.artic.edu": {"data": [{"id": 1, "title": "Water Lilies", "artist_display": "Claude Monet", "date_display": "1906",
                                "image_id": "3c27b499-af56-f0d5-93b5-a7f2f1ad5813"}]},
    "collectionapi.metmuseum.org": {"/search": {"objectIDs": [436524]},
                                    "/objects/": {"title": "Sunflowers", "artistDisplayName": "Vincent van Gogh",
                                                  "objectDate": "1887", "department": "European Paintings",
                                                  "primaryImageSmall": "https://i", "objectURL": "https://o"}},
    "api.openverse.org": {"results": [{"title": "Cafetal", "creator": "Ana", "license": "by", "license_version": "4.0",
                                       "url": "https://img", "foreign_landing_url": "https://land"}]},
    "api.iconify.design": {"icons": ["mdi:coffee", "icono inválido"]},
    "www.thesportsdb.com": {"teams": [{"strTeam": "Junior", "strSport": "Soccer", "strLeague": "Liga BetPlay",
                                       "strCountry": "Colombia", "strStadium": "Metropolitano", "intFormedYear": "1924",
                                       "strBadge": "https://b", "strDescriptionES": "Equipo de Barranquilla."}]},
    "api.gdeltproject.org": {"articles": [{"title": "Festival Vallenato", "url": "https://n", "domain": "elpilon.com.co",
                                           "seendate": "20261120T101500Z"}]},
    "hn.algolia.com": {"hits": [{"title": "Open &amp; AI", "url": "", "objectID": "123", "points": 50,
                                 "created_at": "2026-11-20T00:00:00Z"}]},
}


def respuesta_para(request, proveedores):
    valor = proveedores[request.url.host]
    if isinstance(valor, dict) and valor and all(clave.startswith("/") for clave in valor):
        for fragmento, contenido in valor.items():
            if fragmento in request.url.path:
                return contenido
        raise AssertionError(f"ruta sin respuesta simulada: {request.url}")
    return valor


def ejecutar(key, inputs, parameters, proveedores=PROVEEDORES, vistas=None):
    connector = REGISTRY[key]

    def handler(request):
        if vistas is not None:
            vistas.append(request)
        return httpx.Response(200, json=respuesta_para(request, proveedores))

    trabajo = {"kind": "run", "artifact_hash": connector.artifact_hash,
               "payload": {"manifest": connector.manifest(), "inputs": inputs, "parameters": parameters, "profile": PROFILE}}
    return run_connector(trabajo, transport=httpx.MockTransport(handler), resolver=PUBLICA)


class BibliotecaTests(unittest.TestCase):
    def completo(self, key, inputs, parameters=None, **kwargs):
        estado, reporte, salida = ejecutar(key, inputs, parameters or {}, **kwargs)
        self.assertEqual(estado, "completed", reporte)
        self.assertTrue(Draft202012Validator(REGISTRY[key].definition["output_schema"]).is_valid(salida), salida)
        self.assertTrue(salida["resumen"])
        return salida

    def test_every_example_runs_and_matches_its_contract(self):
        for connector in BIBLIOTECA:
            with self.subTest(conector=connector.key):
                ejemplo = connector.definition["examples"][0]
                self.completo(connector.connector_key, ejemplo["inputs"], ejemplo["parameters"])

    def test_library_is_keyless_composable_and_well_described(self):
        for connector in BIBLIOTECA:
            with self.subTest(conector=connector.key):
                self.assertIsNone(connector.credential)
                self.assertEqual(connector.version, 1)
                self.assertTrue(connector.definition["description"].startswith("Conector externo ("))
                for spec in connector.definition["input_schema"]["properties"].values():
                    self.assertFalse({"minLength", "maxLength", "minimum", "maximum"} & set(spec))
        # Solo los que mandan tu texto completo a un tercero piden el «Acepto» de contenido.
        self.assertEqual({c.key for c in BIBLIOTECA if c.sends_content}, {"corregir_ortografia", "traducir_frase"})

    def test_values_are_parsed(self):
        self.assertEqual(self.completo("wikipedia_resumen@1", {"tema": "García Márquez"})["titulo"], "Gabriel García Márquez")
        ortografia = self.completo("corregir_ortografia@1", {"texto": "Hola, mañana boy a la reunion."}, {"idioma": "es"})
        self.assertEqual(ortografia["texto_corregido"], "Hola, mañana voy a la reunión.")
        self.assertEqual(ortografia["total"], 2)
        sismos = self.completo("sismos_recientes@1", {"lugar": "colombia"}, {"magnitud_minima": 4, "dias": 7})
        self.assertEqual([f["magnitud"] for f in sismos["resultados"]], [4.8])
        indicador = self.completo("indicadores_pais@1", {"pais": "Colombia"}, {"indicador": "inflacion"})
        self.assertEqual(indicador["resultados"], [{"anio": "2023", "valor": 11.7}, {"anio": "2024", "valor": 6.6}])
        oms = self.completo("indicadores_salud_oms@1", {"pais": "Colombia"}, {"indicador": "esperanza_de_vida"})
        self.assertEqual([f["valor"] for f in oms["resultados"]], [77.1, 76.8])
        cerca = self.completo("lugares_cercanos@1", {"lugar": "Plaza Alfonso López"}, {"que": "farmacia", "radio_metros": 1000})
        self.assertEqual(cerca["resultados"][0]["nombre"], "Droguería Central")
        self.assertEqual(cerca["total"], 1)  # el lugar sin nombre no cuenta: la IA lo volvía «otro de la zona»
        self.assertEqual(self.completo("buscar_iconos@1", {"tema": "coffee"})["total"], 1)
        self.assertEqual(self.completo("tendencias_tecnologia@1", {"tema": "ai"})["resultados"][0]["titulo"], "Open & AI")
        self.assertEqual(self.completo("vuelos_en_vivo@1", {"ciudad": "Bogotá"})["resultados"][0]["vuelo"], "AVA123")
        leche = self.completo("info_nutricional@1", {"producto": "7702007012345"})["resultados"][0]
        self.assertEqual((leche["producto"], leche["nutriscore"]), ("Leche", "sin dato"))
        pais = self.completo("datos_pais@1", {"pais": "Colombia"})
        self.assertEqual((pais["codigo"], pais["region"], pais["ingresos"]), ("CO", "América Latina y el Caribe", "medianos altos"))
        self.assertEqual(self.completo("info_equipo_deportivo@1", {"equipo": "Junior"})["resultados"][0]["fundado"], "1924")

    def test_empty_results_are_not_failures(self):
        vacios = {**PROVEEDORES, "openlibrary.org": {"docs": []}, "api.gdeltproject.org": {},
                  "earthquake.usgs.gov": {"features": []}}
        for key, inputs in (("buscar_libros@1", {"busqueda": "zzzz"}), ("noticias_recientes@1", {"tema": "zzzz"}),
                            ("sismos_recientes@1", {})):
            with self.subTest(conector=key):
                self.assertEqual(self.completo(key, inputs, proveedores=vacios)["total"], 0)

    def test_overpass_query_never_contains_user_text(self):
        vistas = []
        self.completo("lugares_cercanos@1", {"lugar": 'Calle 1"];out;node["x'}, {"que": "cajero"}, vistas=vistas)
        consulta = parse_qs(urlsplit(str(vistas[1].url)).query)["data"][0]
        self.assertNotIn("Calle", consulta)
        self.assertIn('["amenity"="atm"]', consulta)

    def test_bad_inputs_never_reach_the_provider(self):
        casos = (("info_medicamento@1", {"medicamento": "ibuprofen\"; drop"}, {}),
                 ("traducir_frase@1", {"texto": "hola"}, {"de": "es", "a": "es"}),
                 ("precio_cripto@1", {"monedas": "bit/coin"}, {}),
                 ("diccionario_ingles@1", {"palabra": "a1b2"}, {}))
        for key, inputs, parameters in casos:
            with self.subTest(conector=key):
                vistas = []
                estado, reporte, _ = ejecutar(key, inputs, parameters, vistas=vistas)
                self.assertEqual(estado, "failed")
                self.assertIn(reporte["error"], ("connector_input", "input_contract"))
                self.assertEqual(vistas, [])

    def test_translation_quota_warning_is_reported(self):
        cupo = {**PROVEEDORES, "api.mymemory.translated.net": {"responseData": {"translatedText": "MYMEMORY WARNING: YOU USED ALL"},
                                                               "responseStatus": 429}}
        estado, reporte, _ = ejecutar("traducir_frase@1", {"texto": "hola"}, {"de": "es", "a": "en"}, proveedores=cupo)
        self.assertEqual((estado, reporte.get("detail")), ("failed", "cupo_traduccion"))


if __name__ == "__main__":
    unittest.main()


class ResumenDeListasTests(unittest.TestCase):
    def test_el_resumen_nombra_los_primeros_resultados_no_solo_uno(self):
        """El plan suele conectar «resumen» a la IA que escribe: si solo nombra el primero, la IA rellena."""
        from connectors.biblioteca_base import respuesta
        filas = [{"nombre": f"Restaurante {n}", "direccion": "", "distancia_m": n * 100, "mapa": "https://osm.org/x"}
                 for n in range(1, 8)]
        salida = respuesta(filas, lambda n: f"{n} lugares.", "Nada.")
        lineas = salida["resumen"].split("\n")
        self.assertEqual(lineas[0], "7 lugares.")
        self.assertEqual(lineas[1:4], ["1. Restaurante 1 · 100 m", "2. Restaurante 2 · 200 m", "3. Restaurante 3 · 300 m"])
        self.assertEqual(len(lineas), 6)  # como mucho 5 en el resumen; la lista completa sigue en «resultados»
        self.assertNotIn("http", salida["resumen"])
        self.assertEqual(respuesta([], lambda n: "x", "Nada."), {"resumen": "Nada.", "total": 0, "resultados": []})
