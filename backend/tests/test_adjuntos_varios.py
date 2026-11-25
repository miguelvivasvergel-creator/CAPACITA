"""Varios archivos adjuntos: la IA debe tomarlos como entradas, nunca volver a pedirlos.

Antes el chat guardaba un solo adjunto y decía «Adjunté un PDF»; con dos versiones la IA
respondía «sube los dos documentos». La regla vale para cualquier cantidad y tipo de archivos,
así que se comprueba que llegue a las dos decisiones de la IA: diseñar una herramienta y armar un plan.
"""
import asyncio
import unittest

from providers.gemini import ADJUNTOS_INFO, GeminiProvider
from schemas.objectives import ObjectiveRequest


class _Capturada(Exception):
    pass


class AdjuntosVariosTests(unittest.TestCase):
    def _instruccion(self, llamada):
        provider = GeminiProvider()
        vistas = []

        async def falsa(instruction, content, schema, **_):
            vistas.append((instruction, content))
            raise _Capturada

        provider._structured = falsa
        with self.assertRaises(_Capturada):
            asyncio.run(llamada(provider))
        return vistas[0]

    def test_regla_general_en_diseno_y_en_plan(self):
        objetivo = "Compara estos documentos y subraya lo que cambió\n(Adjunté 2 PDF como entrada, en este orden; ya están todos.)"
        diseno, contenido = self._instruccion(lambda p: p.interpret(ObjectiveRequest(objective=objetivo), None))
        plan, _ = self._instruccion(lambda p: p.plan(objetivo, []))
        for instruccion in (diseno, plan):
            self.assertIn(ADJUNTOS_INFO, instruccion)
        self.assertIn("Adjunté 2 PDF", contenido["objective"])

    def test_la_regla_no_depende_de_un_tipo_ni_de_una_cantidad(self):
        self.assertIn("Nunca elijas clarify para pedirlos", ADJUNTOS_INFO)
        self.assertIn("una entrada por archivo", ADJUNTOS_INFO)
        self.assertIn("foto y un Excel", ADJUNTOS_INFO)


if __name__ == "__main__":
    unittest.main()
