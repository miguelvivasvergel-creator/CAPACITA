"""Reglas generales de sentido de un plan (no de tipos): valen para cualquier proceso."""
import unittest
from types import SimpleNamespace

from fastapi import HTTPException
from uuid import uuid4

from connectors import PROFILE, REGISTRY
from services.workflow_validation import compile_workflow
from schemas.workflows import WorkflowDefinition
from services.planner_service import conectores_relacionados, elegir_piezas, revision_logica, usos_incompletos


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

    def test_varios_datos_sueltos_piden_componer(self):
        definicion = plan(CLIMA, ("festivos", v("festivos_pais@2"), {"pais": "CO", "anio": 2026}, {}),
                          ("ia", v("redactar_texto@1"), {"indicaciones": "Itinerario"}, {}),
                          ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("ia", "texto")}))
        error = revision_logica(definicion)
        self.assertIn("«clima», «festivos»", error)
        self.assertIn("Escribir con IA usando varios datos", error)

    def test_componer_sin_instruccion(self):
        definicion = plan(CLIMA, ("ia", v("componer_texto@1"), {}, {"dato_1": ("clima", "resumen")}),
                          ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("ia", "resultado")}))
        self.assertIn("no tiene instrucción", revision_logica(definicion))

    def test_texto_en_el_archivo_de_telegram(self):
        definicion = plan(CLIMA, ("ia", v("tarea_texto@1"), {"instruccion": "Itinerario"}, {"texto": ("clima", "resumen")}),
                          ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("ia", "resultado"), "archivo": ("ia", "resultado")}))
        self.assertIn("conéctalo a mensaje", revision_logica(definicion))
        en_drive = plan(CLIMA, ("ia", v("tarea_texto@1"), {"instruccion": "Itinerario"}, {"texto": ("clima", "resumen")}),
                        ("fin", v("guardar_drive@1"), {}, {"archivo": ("ia", "resultado")}))
        self.assertIsNone(revision_logica(en_drive))

    def test_fecha_del_calendario_no_sale_de_un_texto(self):
        definicion = plan(CLIMA, ("fin", v("agendar_evento@1"), {"titulo": "Viaje"},
                                  {"fecha": ("clima", "resumen"), "descripcion": ("clima", "resumen")}))
        self.assertIn("values.fecha", revision_logica(definicion))

    def test_sin_envios_no_exige_conexiones(self):
        self.assertIsNone(revision_logica(plan(CLIMA, salida=("clima", "resumen"))))

    def test_escribir_con_ia_ofrece_tambien_pedirle_algo(self):
        nombres = {str(c.capability_id): c.key for c in REGISTRY.values()}
        elegidos = {nombres[i] for i in conectores_relacionados("redacta una publicación con IA para mis clientes")}
        self.assertIn("tarea_texto", elegidos)

    def test_pedido_largo_no_deja_fuera_los_envios(self):
        # Con la biblioteca de APIs este pedido tocaba 24 conectores y el chat solo manda 12: el correo
        # quedaba fuera y el plan terminaba en «no hay conector para enviar correos».
        pedido = ('Soy dueña del restaurante "Sabor Vallenato" en Valledupar. Revisa el pronóstico del clima de '
                  'Valledupar para esta semana y, con esos datos, pídele a la IA que escriba un plan semanal: qué '
                  'días conviene lanzar una promoción según la lluvia, un texto corto para cada día y cuánto '
                  'preparar. Mándame el plan por Telegram, envíamelo por correo y guárdalo en mi Drive.')
        nombres = {str(c.capability_id): c.key for c in REGISTRY.values()}
        elegidos = [nombres[i] for i in conectores_relacionados(pedido)]
        self.assertLessEqual(len(elegidos), 9)
        self.assertEqual(set(elegidos[:3]), {"enviar_correo", "enviar_telegram", "guardar_drive"})
        self.assertTrue({"clima_pronostico", "tarea_texto"} <= set(elegidos))


class EleccionDePiezasTests(unittest.IsolatedAsyncioTestCase):
    """Paso 1 del planner: la IA elige del catálogo completo qué piezas usar y cuántas veces."""

    def opciones(self):
        claves = ["lugares_cercanos@1", "redactar_texto@1", "traducir_texto@1", "enviar_correo@2", "clima_pronostico@2"]
        conectores = [REGISTRY[clave] for clave in claves]
        return [{"id": str(c.version_id), "name": c.definition["name"], "description": c.definition["description"],
                 "profile": "connector-v1", **{k: c.definition[k] for k in ("input_schema", "parameter_schema", "output_schema")}}
                for c in conectores]

    async def test_la_ia_elige_piezas_y_cuantas_veces(self):
        opciones = self.opciones()
        ids = {row["name"]: row["id"] for row in opciones}
        enviado = {}

        async def select(objetivo, catalogo):
            enviado["catalogo"] = catalogo
            return {"piezas": [{"id": ids["Redactar un texto con IA"], "usos": 1, "para_que": "la carta"},
                               {"id": ids["Traducir un texto con IA"], "usos": 3, "para_que": "italiano, francés, portugués"},
                               {"id": ids["Enviar por correo"], "usos": 3, "para_que": "un correo por idioma"},
                               {"id": "inventado", "usos": 1, "para_que": "no existe"}], "falta": ""}
        elegidas, usos, falta = await elegir_piezas("carta en tres idiomas a tres correos", opciones, SimpleNamespace(select=select))
        self.assertEqual([row["name"] for row in elegidas], ["Redactar un texto con IA", "Traducir un texto con IA", "Enviar por correo"])
        self.assertEqual(sorted(usos.values()), [1, 3, 3])
        self.assertEqual(falta, "")
        # La IA ve el catálogo COMPLETO en versión corta (sin contratos completos).
        self.assertEqual(len(enviado["catalogo"]), len(opciones))
        self.assertNotIn("input_schema", enviado["catalogo"][0])
        self.assertIn("recibe", enviado["catalogo"][0])

    async def test_escribir_con_varios_datos_agrega_componer(self):
        claves = ["clima_pronostico@2", "festivos_pais@2", "lugares_cercanos@1", "tarea_texto@1",
                  "componer_texto@1", "enviar_telegram@1"]
        opciones = [{"id": v(clave), "name": REGISTRY[clave].definition["name"], "description": ""} for clave in claves]

        async def select(objetivo, catalogo):
            return {"piezas": [{"id": v(clave), "usos": 2 if clave.startswith("lugares") else 1, "para_que": ""}
                               for clave in claves if not clave.startswith(("componer", "festivos"))], "falta": ""}
        elegidas, usos, _ = await elegir_piezas("viaje", opciones, SimpleNamespace(select=select))
        self.assertEqual(usos[v("componer_texto@1")], 1)  # clima + 2 lugares: tres datos que juntar
        self.assertNotIn(v("tarea_texto@1"), usos)  # la reemplaza: no suma un paso (máximo 12)
        self.assertIn("Escribir con IA usando varios datos", [row["name"] for row in elegidas])

        async def uno(objetivo, catalogo):
            return {"piezas": [{"id": v("clima_pronostico@2"), "usos": 1, "para_que": ""},
                               {"id": v("tarea_texto@1"), "usos": 1, "para_que": ""}], "falta": ""}
        _, usos, _ = await elegir_piezas("promo", opciones, SimpleNamespace(select=uno))
        self.assertNotIn(v("componer_texto@1"), usos)  # un solo dato: basta «Pedirle algo»

    async def test_respaldo_falta_y_cuota(self):
        opciones = self.opciones()

        async def falla(*_):
            raise HTTPException(502, "selección inválida")
        self.assertEqual((await elegir_piezas("x", opciones, SimpleNamespace(select=falla)))[0], opciones[:12])

        async def sin_cuota(*_):
            raise HTTPException(503, "Gemini alcanzó su cuota. Revisa el nivel gratuito; no se reintentó la generación")
        with self.assertRaises(HTTPException):
            await elegir_piezas("x", opciones, SimpleNamespace(select=sin_cuota))

        # Gemini ocupado en el paso 1: no corta el pedido, sigue con el respaldo (el plan lo intenta).
        async def ocupado(*_):
            raise HTTPException(503, "Gemini está muy ocupado en este momento. Intenta de nuevo en un minuto; no se generó nada")
        self.assertEqual((await elegir_piezas("x", opciones, SimpleNamespace(select=ocupado)))[0], opciones[:12])

        async def nada(*_):
            return {"piezas": [], "falta": "No hay forma de enviar WhatsApp"}
        # Sin piezas no se ofrece «crear» desde aquí: decide el paso 2 con el respaldo.
        self.assertEqual((await elegir_piezas("intenta de nuevo", opciones, SimpleNamespace(select=nada)))[0], opciones[:12])

    def test_plan_que_usa_menos_veces_una_pieza_se_corrige(self):
        traducir, correo = REGISTRY["traducir_texto@1"], REGISTRY["enviar_correo@2"]
        nodos = [{"id": f"t{n}", "version_id": str(traducir.version_id), "label": "Traducir",
                  "values": {"texto": "Carta"}, "parameters": {"idioma": idioma}} for n, idioma in enumerate(["italiano", "francés"])]
        nodos += [{"id": f"c{n}", "version_id": str(correo.version_id), "label": "Correo",
                   "values": {"asunto": "Disculpa"}, "bindings": {"mensaje": {"source": f"t{n}", "field": "traduccion"}}}
                  for n in range(2)]
        definicion = WorkflowDefinition.model_validate({"name": "Carta", "input_schema": {"type": "object", "properties": {}},
                                                        "nodes": nodos, "outputs": {"r": {"source": "c0", "field": "resumen"}}})
        usos = {str(traducir.version_id): 3, str(correo.version_id): 3}
        opciones = [{"id": str(traducir.version_id), "name": "Traducir"}, {"id": str(correo.version_id), "name": "Correo"}]
        error = usos_incompletos(definicion, usos, opciones)
        self.assertIn("«Traducir» debía usarse 3 veces y aparece 2", error)
        self.assertIn("«Correo» debía usarse 3 veces y aparece 2", error)
        self.assertIsNone(usos_incompletos(definicion, {str(traducir.version_id): 2}, opciones))


if __name__ == "__main__":
    unittest.main()


class ItinerarioDeViajeTests(unittest.TestCase):
    """El pedido de la demo (Valledupar → Cartagena): 8 consultas que una sola IA debe juntar y 3 envíos.
    Antes no tenía arreglo: cada entrada recibe una sola salida y la IA dijo que faltaba una pieza."""

    def test_doce_pasos_validos_y_con_sentido(self):
        datos = [("clima", "clima_pronostico@2", {"ciudad": "Cartagena"}, "resumen"),
                 ("sol", "amanecer_atardecer@1", {"ciudad": "Cartagena"}, "resumen"),
                 ("aire", "calidad_aire@1", {"ciudad": "Cartagena"}, "resumen"),
                 ("festivos", "festivos_pais@2", {"anio": 2026}, "resumen"),
                 ("trm", "trm_colombia@2", {}, "resumen"),
                 ("dinero", "cambio_moneda@2", {"monto": 300, "moneda_origen": "USD", "moneda_destino": "COP"}, "resumen"),
                 ("farmacias", "lugares_cercanos@1", {"lugar": "Centro Histórico, Cartagena"}, "resultados"),
                 ("cajeros", "lugares_cercanos@1", {"lugar": "Centro Histórico, Cartagena"}, "resultados")]
        nodos = [(i, v(k), vals, {}) for i, k, vals, _ in datos]
        nodos.append(("itinerario", v("componer_texto@1"), {"instruccion": "Itinerario bonito de 3 días en Cartagena"},
                      {f"dato_{n}": (i, campo) for n, (i, _, _, campo) in enumerate(datos, 1)}))
        nodos += [("drive", v("guardar_drive@1"), {"nombre_archivo": "Viaje"}, {"archivo": ("itinerario", "resultado")}),
                  ("agenda", v("agendar_evento@1"), {"titulo": "Viaje a Cartagena", "fecha": "2026-11-27"},
                   {"descripcion": ("itinerario", "resultado")}),
                  ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("itinerario", "resultado")})]
        definicion = plan(*nodos)
        por_version = {v(k): k for k in REGISTRY}
        for nodo in definicion.nodes:  # las opciones de ejemplo de cada conector (país, días, radio…)
            nodo.parameters = dict(REGISTRY[por_version[str(nodo.version_id)]].definition["examples"][0]["parameters"])
        self.assertIsNone(revision_logica(definicion))
        claves = {k for _, k, _, _ in datos} | {"componer_texto@1", "guardar_drive@1", "agendar_evento@1", "enviar_telegram@1"}
        versiones = {v(k): {"status": "enabled", "publication_id": "p", "manifest": REGISTRY[k].manifest(), "profile": PROFILE,
                            "artifact_hash": REGISTRY[k].artifact_hash, "definition_hash": REGISTRY[k].definition_hash}
                     for k in claves}
        _, orden = compile_workflow(definicion.model_dump(mode="json"), versiones)
        self.assertEqual(orden.index("itinerario"), 8)  # después de las 8 consultas, antes de los envíos
