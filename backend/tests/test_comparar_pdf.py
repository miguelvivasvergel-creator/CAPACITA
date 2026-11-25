"""Comparar PDF: muestras con texto, receta comprobada y planner que no bloquea en falso.

Antes: documento.pdf era una imagen (sin texto), la comparación de PDF probaba un archivo contra sí
mismo y salía «0 cambios», la herramienta rehacía el PDF desde cero y el planner respondía
«no llego a todo» para un trabajo de archivos que una herramienta nueva sí hace.
La receta misma (pypdf/reportlab) se probó en la imagen del sandbox: aquí no están esas librerías.
"""
import ast
import base64
import difflib
from pathlib import Path
import re
import unittest
import zlib

from schemas.definitions import CapabilityDefinition
from providers.gemini import MUESTRAS_INFO, RECETA_COMPARAR_PDF, RESEARCH_INSTRUCTION, protocolo_codigo
from services.candidate_generation import GenerationLimiter
from services.candidate_preparation import unavailable_imports
from services.planner_service import planear

MUESTRAS = Path(__file__).resolve().parents[2] / "public" / "muestras"
plano = lambda texto: " ".join(texto.split())


def textos_pdf(nombre):
    """Las frases que el PDF dibuja con Tj (reportlab comprime cada página con Flate)."""
    datos = (MUESTRAS / nombre).read_bytes()
    frases = []
    for flujo in re.findall(rb"stream\r?\n(.*?)endstream", datos, re.S):
        crudo = flujo.strip()
        if crudo.endswith(b"~>"):  # reportlab: ASCII85 sobre Flate
            crudo = base64.a85decode(crudo[:-2], adobe=False)
        try:
            contenido = zlib.decompress(crudo)
        except zlib.error:
            contenido = crudo
        frases += [f.decode("latin-1") for f in re.findall(rb"\((.*?)\) Tj", contenido)]
    return frases


def definicion(tipo):
    archivo = {"type": "string", "contentEncoding": "base64", "contentMediaType": tipo}
    return CapabilityDefinition.model_validate({
        "name": "comparar", "description": "Compara dos versiones de un documento", "category": "documentos",
        "input_type": "pdf", "output_type": "pdf",
        "input_schema": {"type": "object", "properties": {"original": archivo, "nueva": archivo},
                         "required": ["original", "nueva"], "additionalProperties": False},
        "parameter_schema": {"type": "object", "properties": {}, "additionalProperties": False},
        "output_schema": {"type": "object", "properties": {"cambios": {"type": "integer"}},
                          "required": ["cambios"], "additionalProperties": False},
        "constraints": [], "required_permissions": [], "resources": [],
        "examples": [{"inputs": {"original": "x", "nueva": "y"}, "parameters": {}, "expected_output": {"cambios": 1}}],
    })


class MuestrasPdfTests(unittest.TestCase):
    def test_los_pdf_de_muestra_tienen_texto_y_los_cambios_descritos(self):
        original, nuevo = textos_pdf("documento.pdf"), textos_pdf("documento_v2.pdf")
        self.assertIn("Las ventas subieron un 12 por ciento.", original)
        self.assertIn("Las ventas subieron un 18 por ciento.", nuevo)
        self.assertIn("Desde el lunes el almuerzo cuesta $18.000.", nuevo)
        # La misma regla que la receta: palabras en orden.
        a, b = " ".join(original).split(), " ".join(nuevo).split()
        bloques = [op for op in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes() if op[0] != "equal"]
        self.assertEqual(len(bloques), 2)
        self.assertEqual(sum(j2 - j1 for _, _, _, j1, j2 in bloques), 8)
        self.assertEqual(sum(i2 - i1 for _, i1, i2, _, _ in bloques), 1)
        self.assertIn("MUESTRA:pdf2", MUESTRAS_INFO)
        self.assertIn("2 cambios", plano(MUESTRAS_INFO))
        self.assertIn("8 palabras agregadas y 1 eliminada", plano(MUESTRAS_INFO))
        self.assertNotIn("compara MUESTRA:pdf consigo mismo", plano(MUESTRAS_INFO))


class RecetaTests(unittest.TestCase):
    def test_la_receta_solo_usa_lo_que_hay_en_el_sandbox(self):
        arbol = ast.parse(RECETA_COMPARAR_PDF)
        self.assertEqual(unavailable_imports(arbol), [])
        funciones = {n.name for n in arbol.body if isinstance(n, ast.FunctionDef)}
        self.assertTrue({"palabras_pdf", "comparar_pdf"} <= funciones)

    def test_la_receta_llega_solo_cuando_se_comparan_pdf(self):
        self.assertIn("def comparar_pdf", protocolo_codigo(definicion("application/pdf")))
        palabra = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        self.assertNotIn("def comparar_pdf", protocolo_codigo(definicion(palabra)))

    def test_la_investigacion_no_recomienda_otros_programas(self):
        self.assertIn("nunca recomiendes programas", plano(RESEARCH_INSTRUCTION))


class Proveedor:
    """Primero bloquea (como pasó con «comparar dos PDF»); al recordarle qué cubre create, crea."""
    def __init__(self, respuestas):
        self.respuestas, self.feedbacks = list(respuestas), []

    async def plan(self, objective, versions, feedback=None, requisitos=None):
        self.feedbacks.append(feedback)
        return self.respuestas.pop(0)


class PlannerNoBloqueaEnFalsoTests(unittest.IsolatedAsyncioTestCase):
    async def correr(self, respuestas):
        proveedor = Proveedor(respuestas)
        propuesta, _ = await planear("Compara estos dos PDF y subraya las diferencias", [], proveedor,
                                     None, "persona", auto=False, limits=GenerationLimiter())
        return propuesta, proveedor

    async def test_blocked_se_reconsidera_una_vez_y_pasa_a_crear(self):
        propuesta, proveedor = await self.correr([
            {"decision": "blocked", "explanation": "No hay piezas para PDF"},
            {"decision": "create", "explanation": "Te creo una herramienta", "missing": ["Comparar dos PDF"]}])
        self.assertEqual(propuesta.decision, "create")
        self.assertIn("create) puede leer, comparar", proveedor.feedbacks[1])

    async def test_si_insiste_en_blocked_se_respeta(self):
        bloqueo = {"decision": "blocked", "explanation": "Necesita tu cuenta del banco"}
        propuesta, proveedor = await self.correr([bloqueo, bloqueo])
        self.assertEqual(propuesta.decision, "blocked")
        self.assertEqual(len(proveedor.feedbacks), 2)


if __name__ == "__main__":
    unittest.main()
