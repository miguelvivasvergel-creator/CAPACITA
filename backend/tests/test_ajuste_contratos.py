"""Ajuste seguro de lo que la IA o un paso entregan casi bien, y reparación del plan antes de validarlo."""
import unittest

from connectors import REGISTRY
from schemas.workflows import WorkflowDefinition
from services.ajuste_contratos import ajustar, ajustar_objeto, primer_error
from services.planner_service import reparar_plan


class AjusteTests(unittest.TestCase):
    def test_tipos_y_opciones(self):
        self.assertEqual(ajustar("300", {"type": "number"}), 300.0)
        self.assertEqual(ajustar("2026", {"type": "integer"}), 2026)
        self.assertEqual(ajustar("3,5", {"type": "number"}), 3.5)
        self.assertEqual(ajustar("300 dólares", {"type": "number"}), "300 dólares")  # ambiguo: no se toca
        # Punto de miles como en Colombia: «300.000» son trescientos mil, no 300.
        for escrito, esperado in (("300.000", 300000), ("1.500.000", 1500000), ("$ 300.000", 300000),
                                  ("1.500,50", 1500.5), ("2.5", 2.5), ("0.500", 0.5), ("-12.000", -12000)):
            self.assertEqual(ajustar(escrito, {"type": "number"}), esperado, escrito)
        self.assertEqual(ajustar("1.500", {"type": "integer"}), 1500)
        self.assertEqual(ajustar("1,500", {"type": "number"}), "1,500")  # ¿mil quinientos o 1,5? No se adivina
        self.assertEqual(ajustar(2026, {"type": "string"}), "2026")
        self.assertEqual(ajustar("usd", {"type": "string", "minLength": 3, "maxLength": 3}), "USD")
        self.assertEqual(ajustar("sí", {"type": "boolean"}), True)
        opciones = {"type": "string", "enum": ["farmacia", "cajero", "cafe"]}
        for escrito, esperado in (("Cajeros", "cajero"), ("FARMACIAS", "farmacia"), ("café", "cafe"), ("hotel", "hotel")):
            self.assertEqual(ajustar(escrito, opciones), esperado)

    def test_lista_donde_va_texto_se_lee_bien(self):
        texto = ajustar([{"nombre": "Droguería", "distancia_m": 120}], {"type": "string"})
        self.assertEqual(texto, "- nombre: Droguería · distancia_m: 120")

    def test_objeto_con_defaults_y_extras(self):
        schema = {"type": "object", "additionalProperties": False,
                  "properties": {"que": {"type": "string", "enum": ["cajero"], "default": "cajero"},
                                 "radio": {"type": "integer", "default": 1000}}}
        self.assertEqual(ajustar_objeto(schema, {"radio": "500", "otro": 1}, defaults=True), {"radio": 500, "que": "cajero"})
        self.assertEqual(ajustar_objeto(schema, {"otro": 1}, quitar_extra=False), {"otro": 1})

    def test_primer_error_dice_el_campo_y_lo_esperado(self):
        schema = {"type": "object", "required": ["anio"], "properties": {"anio": {"type": "integer", "minimum": 1900}}}
        self.assertEqual(primer_error(schema, {}), ("anio", "un valor (es obligatorio)"))
        self.assertEqual(primer_error(schema, {"anio": "x"}), ("anio", "un número entero, mínimo 1900"))
        self.assertIsNone(primer_error(schema, {"anio": 2026}))


class RecortarUsosTests(unittest.TestCase):
    def test_nunca_pide_mas_del_maximo_ni_quita_los_envios(self):
        from services.planner_service import MAX_PASOS, recortar_usos
        v = lambda clave: str(REGISTRY[clave].version_id)
        usos = {v("traducir_texto@1"): 9, v("enviar_correo@2"): 9, v("redactar_texto@1"): 1, v("clima_pronostico@2"): 1,
                v("festivos_pais@2"): 1}
        quitadas = recortar_usos(usos)
        self.assertEqual(MAX_PASOS, 20)
        self.assertLessEqual(sum(usos.values()), MAX_PASOS)
        self.assertGreaterEqual(usos[v("enviar_correo@2")], 8)
        self.assertEqual(quitadas, set())  # solo bajó repeticiones: ninguna pieza dejó de estar disponible
        # 21 piezas de un uso y el envío: no caben en 20; se quitan las últimas, nunca el envío.
        sueltos = {f"pieza-{n}": 1 for n in range(21)} | {v("enviar_telegram@1"): 1}
        quitadas = recortar_usos(sueltos)
        self.assertEqual(sum(sueltos.values()), MAX_PASOS)
        self.assertIn(v("enviar_telegram@1"), sueltos)
        self.assertEqual(quitadas, {"pieza-19", "pieza-20"})  # se devuelven: siguen disponibles y se avisa si falta


class RepararPlanTests(unittest.TestCase):
    def test_repara_opciones_valores_y_conexiones(self):
        cerca, tg = REGISTRY["lugares_cercanos@1"], REGISTRY["enviar_telegram@1"]
        definicion = WorkflowDefinition.model_validate({
            "name": "Cajeros", "input_schema": {"type": "object", "properties": {}},
            "nodes": [{"id": "cajeros", "version_id": str(cerca.version_id), "label": "Cajeros",
                       "values": {"lugar": "Centro Histórico", "inventado": 1}, "parameters": {"que": "Cajeros"}},
                      {"id": "fin", "version_id": str(tg.version_id), "label": "Telegram", "values": {"mensaje": "x"},
                       "bindings": {"mensaje": {"source": "cajeros", "field": "resumen"},
                                    "chat": {"source": "cajeros", "field": "resumen"}}}],
            "outputs": {"r": {"source": "fin", "field": "resumen"}}})
        opciones = [{"id": str(c.version_id), **{k: c.definition[k] for k in ("input_schema", "parameter_schema")}}
                    for c in (cerca, tg)]
        reparar_plan(definicion, opciones)
        cajeros, fin = definicion.nodes
        self.assertEqual(cajeros.parameters, {"que": "cajero", "radio_metros": 1000})
        self.assertEqual(cajeros.values, {"lugar": "Centro Histórico"})
        self.assertEqual((fin.values, set(fin.bindings)), ({}, {"mensaje"}))  # gana la conexión; «chat» no existe
