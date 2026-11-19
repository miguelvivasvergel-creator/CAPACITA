"""Las muestras de la fábrica deben decir lo mismo que el prompt que las describe a Gemini.

Si el contenido de public/muestras cambia sin actualizar MUESTRAS_INFO, los ejemplos que diseña
la IA esperan resultados imposibles y la herramienta falla siempre en el entorno aislado.
"""
import difflib
from pathlib import Path
import re
import unittest
import zipfile

from providers.gemini import MUESTRAS_INFO, SYSTEM_INSTRUCTION

MUESTRAS = Path(__file__).resolve().parents[2] / "public" / "muestras"
plano = lambda texto: " ".join(texto.split())


def parrafos(nombre):
    xml = zipfile.ZipFile(MUESTRAS / nombre).read("word/document.xml").decode()
    textos = ["".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)) for p in re.findall(r"<w:p[ >].*?</w:p>", xml)]
    return [texto for texto in textos if texto.strip()]


def contar(originales, nuevos):
    """Regla de conteo que el prompt pide al código generado."""
    modificados = agregados = eliminados = 0
    for etiqueta, a1, a2, b1, b2 in difflib.SequenceMatcher(None, originales, nuevos, autojunk=False).get_opcodes():
        n, m = a2 - a1, b2 - b1
        if etiqueta == "replace":
            modificados += min(n, m)
            agregados += m - min(n, m)
            eliminados += n - min(n, m)
        elif etiqueta == "insert":
            agregados += m
        elif etiqueta == "delete":
            eliminados += n
    return modificados, agregados, eliminados


class SamplePairTests(unittest.TestCase):
    def test_word_pair_matches_prompt_description(self):
        original, nuevo = parrafos("documento.docx"), parrafos("documento_v2.docx")
        self.assertEqual((len(original), len(nuevo)), (3, 4))
        for texto in original + nuevo:
            self.assertIn(f"«{texto}»", plano(MUESTRAS_INFO))
        self.assertEqual(contar(original, nuevo), (1, 1, 0))
        self.assertIn("1 párrafo modificado, 1 agregado y 0 eliminados", plano(MUESTRAS_INFO))

    def test_same_document_has_no_changes(self):
        documento = parrafos("documento.docx")
        self.assertEqual(contar(documento, documento), (0, 0, 0))

    def test_samples_and_recipe_reach_code_generation(self):
        self.assertIn("MUESTRA:word2", SYSTEM_INSTRUCTION)
        self.assertIn("parrafos_modificados", SYSTEM_INSTRUCTION)


if __name__ == "__main__":
    unittest.main()
