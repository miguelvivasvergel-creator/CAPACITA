"""El buscador del catálogo encuentra una herramienta aunque el pedido use otra forma de la palabra."""
import unittest

from services.objective_service import raiz, search_terms


class RaizTests(unittest.TestCase):
    def test_formas_de_una_palabra_comparten_raiz(self):
        for formas in (("comparar", "compara", "comparación"), ("documentos", "documento"),
                       ("traducir", "traducción", "traduce"), ("resumir", "resumen")):
            raices = {raiz(forma) for forma in formas}
            self.assertEqual(len(raices), 1, formas)

    def test_la_raiz_es_parte_de_cada_forma_para_buscar_con_ilike(self):
        # La base compara con ilike %raíz%: la raíz tiene que estar dentro de cada forma, con sus tildes.
        for forma in ("traducción", "comparación", "imágenes", "documentos", "música"):
            self.assertIn(raiz(forma), forma)

    def test_no_corta_palabras_cortas_ni_de_mas(self):
        # Nunca deja menos de 4 letras: una raíz muy corta encontraría casi todo.
        self.assertEqual(raiz("casa"), "casa")
        self.assertEqual(raiz("pdf"), "pdf")
        self.assertEqual(raiz("clima"), "clim")

    def test_search_terms_busca_por_raiz(self):
        terminos = search_terms("compara mis documentos")
        self.assertEqual(terminos[0], "compara mis documentos")
        self.assertIn("compar", terminos)
        self.assertIn("document", terminos)
        # «comparar_documento» contiene ambas raíces: la búsqueda la encuentra.
        self.assertTrue(all(t in "comparar_documento" for t in terminos[1:]))


if __name__ == "__main__":
    unittest.main()
