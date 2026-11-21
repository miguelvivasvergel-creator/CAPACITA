"""Póster promocional: reglas de diseño, imágenes de la persona y uso dentro de un proceso."""
import base64
import io
import random
import unittest

from PIL import Image, ImageDraw

from connectors import REGISTRY
from connectors.base import ConnectorInputError
from connectors.poster import POSTER, limpio, mejor_esquina, sin_fondo
from services.planner_service import revision_logica
from services.workflow_validation import compile_workflow
from schemas.workflows import WorkflowDefinition


def b64(imagen, formato):
    salida = io.BytesIO()
    imagen.save(salida, formato)
    return base64.b64encode(salida.getvalue()).decode()


def abrir(texto):
    return Image.open(io.BytesIO(base64.b64decode(texto)))


def logo_con_letras_blancas():
    """Círculo azul con un cuadro BLANCO adentro, sobre fondo blanco: el blanco interno debe quedarse."""
    logo = Image.new("RGB", (400, 400), (255, 255, 255))
    trazo = ImageDraw.Draw(logo)
    trazo.ellipse((50, 50, 350, 350), fill=(0, 120, 215))
    trazo.rectangle((170, 170, 230, 230), fill=(255, 255, 255))
    return logo


class PosterTests(unittest.TestCase):
    def test_dos_versiones_jpg_del_tamano_pedido(self):
        foto = Image.new("RGB", (600, 800), (250, 250, 250))
        ImageDraw.Draw(foto).ellipse((150, 200, 450, 600), fill=(200, 60, 60))
        for formato, tamano in (("cuadrado", (1080, 1080)), ("historia", (1080, 1920))):
            salida = POSTER.run(None, {"negocio": "Frío Rico", "oferta": "2x1 en conos", "titular": "Refréscate al doble",
                                       "foto_producto": b64(foto, "JPEG"), "logo": b64(logo_con_letras_blancas(), "PNG")},
                                {"formato": formato, "estilo": "automatico"})
            for campo in ("poster", "poster_alternativo"):
                imagen = abrir(salida[campo])
                self.assertEqual((imagen.format, imagen.size), ("JPEG", tamano))
            self.assertIn("le quité el fondo al producto", salida["resumen"])
            self.assertIn("limpié el fondo del logo", salida["resumen"])
        sin_fotos = POSTER.run(None, {"negocio": "Café Aroma", "oferta": "-20 %"}, {"formato": "cuadrado", "estilo": "calido"})
        self.assertEqual(abrir(sin_fotos["poster"]).size, (1080, 1080))

    def test_el_logo_pierde_el_fondo_pero_no_sus_blancos_internos(self):
        recorte, quitado = sin_fondo(logo_con_letras_blancas().convert("RGBA"), tolerancia=48)
        self.assertTrue(quitado)
        self.assertEqual(recorte.getpixel((0, 0))[3], 0)  # la esquina (fondo) quedó transparente
        centro = recorte.getpixel((recorte.width // 2, recorte.height // 2))
        self.assertEqual((centro[3] > 200, centro[:3] == (255, 255, 255)), (True, True))  # el blanco interno sigue

    def test_un_fondo_complejo_no_se_destroza_va_enmarcado(self):
        random.seed(3)
        ruido = Image.new("RGB", (300, 300))
        ruido.putdata([(random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)) for _ in range(300 * 300)])
        _, quitado = sin_fondo(ruido.convert("RGBA"))
        self.assertFalse(quitado)
        salida = POSTER.run(None, {"negocio": "X", "oferta": "2x1", "foto_producto": b64(ruido, "JPEG")},
                            {"formato": "cuadrado", "estilo": "fresco"})
        self.assertIn("la enmarqué", salida["resumen"])

    def test_textos_limpios_sin_perder_lo_que_importa(self):
        self.assertEqual(limpio("-20 % en capuchinos", 40), "-20 % en capuchinos")
        self.assertEqual(limpio("Cra 9 #15-20", 70), "Cra 9 #15-20")
        self.assertEqual(limpio("## **Ven hoy** 🍦", 40), "Ven hoy")
        largo = "Este sábado hace calor. Ven por tu helado favorito con 2x1 en conos todo el día en la tienda."
        self.assertEqual(limpio(largo, 40), "Este sábado hace calor.")  # de un párrafo, la primera frase

    def test_imagenes_invalidas_se_rechazan_con_el_campo(self):
        for valor in ("no-es-base64!!", base64.b64encode(b"%PDF-1.4 hola").decode()):
            with self.assertRaises(ConnectorInputError) as error:
                POSTER.run(None, {"negocio": "X", "oferta": "2x1", "logo": valor}, {"formato": "cuadrado", "estilo": "fresco"})
            self.assertEqual(str(error.exception), "logo")
        with self.assertRaises(ConnectorInputError):
            POSTER.run(None, {"negocio": "X", "oferta": "  "}, {"formato": "cuadrado", "estilo": "fresco"})

    def test_el_sello_nunca_pisa_el_texto_y_elige_la_esquina_que_menos_tapa(self):
        producto = Image.new("RGBA", (300, 500), (0, 0, 0, 0))
        ImageDraw.Draw(producto).rectangle((0, 0, 299, 250), fill=(200, 0, 0, 255))  # lleno arriba, vacío abajo
        sello = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        ImageDraw.Draw(sello).ellipse((0, 0, 159, 159), fill=(255, 255, 0, 255))
        texto = (0, 0, 1080, 300)
        (x, y), tapado = mejor_esquina(sello, producto, (500, 320), (420, 300, 1050, 900), texto, (1080, 950), 70)
        self.assertLess(tapado, 0.05)  # casi nada del producto queda bajo el sello
        self.assertGreaterEqual(y, 300)  # debajo del texto
        self.assertGreater(y, 320 + 250 - 160)  # en la mitad vacía de abajo, no sobre lo lleno


class PosterEnUnProcesoTests(unittest.TestCase):
    def test_poster_a_telegram_y_drive_es_un_plan_valido(self):
        claves = {"poster": "poster_promocional@1", "tg": "enviar_telegram@1", "drive": "guardar_drive@1"}
        v = lambda k: str(REGISTRY[k].version_id)
        definicion = WorkflowDefinition.model_validate({
            "name": "Póster Frío Rico",
            "input_schema": {"type": "object", "additionalProperties": False, "required": ["foto_producto"], "properties": {
                "foto_producto": {"type": "string", "contentEncoding": "base64", "contentMediaType": "image/jpeg"}}},
            "nodes": [{"id": "poster", "version_id": v(claves["poster"]), "label": "Póster",
                       "values": {"negocio": "Frío Rico", "oferta": "2x1 en conos", "titular": "Refréscate al doble"},
                       "parameters": {"formato": "cuadrado", "estilo": "automatico"},
                       "bindings": {"foto_producto": {"source": "$input", "field": "foto_producto"}}},
                      {"id": "tg", "version_id": v(claves["tg"]), "label": "Telegram", "values": {}, "parameters": {},
                       "bindings": {"archivo": {"source": "poster", "field": "poster"},
                                    "mensaje": {"source": "poster", "field": "resumen"}}},
                      {"id": "drive", "version_id": v(claves["drive"]), "label": "Drive",
                       "values": {"nombre_archivo": "Póster Frío Rico"}, "parameters": {},
                       "bindings": {"archivo": {"source": "poster", "field": "poster"}}}],
            "outputs": {"r": {"source": "tg", "field": "resumen"}}})
        self.assertIsNone(revision_logica(definicion))
        versiones = {v(k): {"status": "enabled", "publication_id": "p", "manifest": REGISTRY[k].manifest(),
                            "profile": "connector-v1", "artifact_hash": REGISTRY[k].artifact_hash,
                            "definition_hash": REGISTRY[k].definition_hash} for k in claves.values()}
        parametros = {nodo.id: nodo.parameters for nodo in definicion.nodes}
        for nodo in definicion.nodes:  # opciones por defecto de cada conector, como hace el planner
            ejemplo = REGISTRY[next(k for k in claves.values() if v(k) == str(nodo.version_id))].definition["examples"][0]
            nodo.parameters = {**ejemplo["parameters"], **parametros[nodo.id]}
        _, orden = compile_workflow(definicion.model_dump(mode="json"), versiones)
        self.assertEqual(orden[0], "poster")


class UnSoloPosterTests(unittest.TestCase):
    def test_se_entrega_un_solo_poster_el_mismo_en_la_web_y_en_los_envios(self):
        """Antes salían dos y a Telegram llegaba uno distinto del que la web mostraba primero."""
        from services.planner_service import un_solo_poster
        v = lambda k: str(REGISTRY[k].version_id)
        definicion = WorkflowDefinition.model_validate({
            "name": "Póster", "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
            "nodes": [{"id": "poster", "version_id": v("poster_promocional@1"), "label": "Póster",
                       "values": {"negocio": "Frío Rico", "oferta": "2x1"}, "parameters": {}, "bindings": {}},
                      {"id": "tg", "version_id": v("enviar_telegram@1"), "label": "Telegram", "values": {}, "parameters": {},
                       "bindings": {"archivo": {"source": "poster", "field": "poster"},
                                    "mensaje": {"source": "poster", "field": "resumen"}}},
                      {"id": "tg2", "version_id": v("enviar_telegram@1"), "label": "Telegram 2", "values": {}, "parameters": {},
                       "bindings": {"archivo": {"source": "poster", "field": "poster_alternativo"}}},
                      {"id": "drive", "version_id": v("guardar_drive@1"), "label": "Drive",
                       "values": {"nombre_archivo": "Póster"}, "parameters": {},
                       "bindings": {"archivo": {"source": "poster", "field": "poster_alternativo"}}}],
            "outputs": {"alternativo": {"source": "poster", "field": "poster_alternativo"},
                        "enviado": {"source": "tg", "field": "resumen"}}})
        un_solo_poster(definicion)
        nodos = {n.id: n for n in definicion.nodes}
        self.assertEqual(list(nodos), ["poster", "tg", "drive"])  # el segundo Telegram sobraba
        self.assertEqual(nodos["drive"].bindings["archivo"].field, "poster")  # Drive guarda el mismo
        self.assertEqual({k: f"{b.source}.{b.field}" for k, b in definicion.outputs.items()},
                         {"enviado": "tg.resumen", "poster": "poster.poster"})
        self.assertIsNone(revision_logica(definicion))

    def test_el_poster_entregado_es_el_mejor_de_los_dos_disenos(self):
        from connectors.poster import componer_poster, paleta
        producto = Image.new("RGBA", (200, 600), (0, 0, 0, 0))  # alto y angosto, como un cono o una botella
        ImageDraw.Draw(producto).rectangle((0, 0, 199, 599), fill=(200, 60, 60, 255))
        textos = {"negocio": "Frío Rico", "oferta": "2x1", "titular": "Refréscate al doble", "mensaje": "",
                  "llamada_accion": "Ven hoy", "contacto": ""}
        colores = paleta("fresco", None, "")
        puntajes = [componer_poster(1080, 1080, textos, producto, None, colores, centrado=c)[1] for c in (False, True)]
        salida = POSTER.run(None, {**{k: v for k, v in textos.items() if v}, "foto_producto": b64(producto.convert("RGB"), "JPEG")},
                            {"formato": "cuadrado", "estilo": "fresco"})
        self.assertEqual(len(puntajes), 2)
        self.assertNotEqual(salida["poster"], salida["poster_alternativo"])
        self.assertIn("está listo", salida["resumen"])


class LogosComoVienenTests(unittest.TestCase):
    """Cada logo según cómo venga (caso real: logo blanco sobre el turquesa de la marca se destrozaba)."""

    def test_logo_sobre_el_color_de_la_marca_se_conserva_y_da_el_color_del_poster(self):
        from connectors.poster import preparar_logo
        logo = Image.new("RGB", (400, 300), (120, 200, 208))  # turquesa de marca
        ImageDraw.Draw(logo).text((60, 120), "POSITANO soft cream", fill=(255, 255, 255))
        listo, marca, propia, nota = preparar_logo(logo.convert("RGBA"))
        self.assertTrue(propia)
        self.assertEqual(marca, (120, 200, 208))
        self.assertEqual(listo.getpixel((listo.width // 2, 5))[:3], (120, 200, 208))  # el fondo se conserva
        self.assertEqual(listo.getpixel((0, 0))[3], 0)  # esquinas redondeadas
        self.assertIn("color de tu marca", nota)

    def test_logo_sobre_blanco_pierde_el_fondo_y_uno_transparente_queda_igual(self):
        from connectors.poster import preparar_logo
        _, marca, propia, nota = preparar_logo(logo_con_letras_blancas().convert("RGBA"))
        self.assertEqual((marca, propia, nota), (None, False, "limpié el fondo del logo"))
        transparente = Image.new("RGBA", (300, 200), (0, 0, 0, 0))
        ImageDraw.Draw(transparente).ellipse((50, 50, 250, 150), fill=(210, 30, 40, 255))
        self.assertEqual(preparar_logo(transparente)[2:], (False, "usé tu logo con su transparencia"))

    def test_el_fondo_nunca_queda_en_luminosidad_media(self):
        from connectors.poster import fondo_legible, luminancia, mezclar
        for arriba, abajo in (((120, 200, 208), (60, 120, 130)), ((0, 198, 251), (0, 82, 212))):
            a, b = fondo_legible(arriba, abajo)
            self.assertFalse(0.1 < luminancia(mezclar(a, b, 0.35)) < 0.42)
        self.assertEqual(fondo_legible((255, 244, 214), (255, 230, 180)), ((255, 244, 214), (255, 230, 180)))  # claro: igual
