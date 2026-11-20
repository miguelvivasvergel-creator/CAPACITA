"""Reglas generales de sentido de un plan (no de tipos): valen para cualquier proceso."""
import unittest
from uuid import uuid4

from connectors import REGISTRY
from schemas.workflows import WorkflowDefinition
from services.planner_service import conectores_relacionados, revision_logica


def v(key):
    return str(REGISTRY[key].version_id)


def plan(*nodos, salida=("fin", "resumen")):
    return WorkflowDefinition.model_validate({
        "name": "Plan de prueba", "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
        "nodes": [{"id": i, "version_id": ver, "label": i, "values": vals, "bindings": {
            puerto: {"source": s, "field": f} for puerto, (s, f) in con.items()}} for i, ver, vals, con in nodos],
        "outputs": {"r": {"source": salida[0], "field": salida[1]}}})


CLIMA = ("clima", v("clima_pronostico@2"), {"ciudad": "Valledupar"}, {})


class RevisionLogicaTests(unittest.TestCase):
    def test_bien_conectado_pasa(self):
        definicion = plan(CLIMA,
                          ("ia", v("tarea_texto@1"), {"instruccion": "Escribe una promoción 2x1"}, {"texto": ("clima", "resumen")}),
                          ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("ia", "resultado")}))
        self.assertIsNone(revision_logica(definicion))

    def test_redactar_con_datos_de_otro_paso_pierde_la_orden(self):
        definicion = plan(CLIMA, ("ia", v("redactar_texto@1"), {}, {"indicaciones": ("clima", "resumen")}),
                          ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("ia", "texto")}))
        self.assertIn("Pedirle algo a la IA", revision_logica(definicion))

    def test_tarea_sin_instruccion(self):
        definicion = plan(CLIMA, ("ia", v("tarea_texto@1"), {}, {"texto": ("clima", "resumen")}),
                          ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("ia", "resultado")}))
        self.assertIn("no tiene instrucción", revision_logica(definicion))

    def test_ia_a_ciegas_con_datos_sueltos(self):
        definicion = plan(CLIMA, ("ia", v("redactar_texto@1"), {"indicaciones": "Promoción"}, {}),
                          ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("ia", "texto")}))
        self.assertIn("escribe sin ellos", revision_logica(definicion))

    def test_cualquier_resultado_suelto_con_envios(self):
        definicion = plan(CLIMA, ("festivos", v("festivos_pais@2"), {"pais": "CO", "anio": 2026}, {}),
                          ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("clima", "resumen")}))
        self.assertIn("«festivos» no llega", revision_logica(definicion))

    def test_sin_envios_no_exige_conexiones(self):
        self.assertIsNone(revision_logica(plan(CLIMA, salida=("clima", "resumen"))))

    def test_escribir_con_ia_ofrece_tambien_pedirle_algo(self):
        nombres = {str(c.capability_id): c.key for c in REGISTRY.values()}
        elegidos = {nombres[i] for i in conectores_relacionados("redacta una publicación con IA para mis clientes")}
        self.assertIn("tarea_texto", elegidos)


if __name__ == "__main__":
    unittest.main()
