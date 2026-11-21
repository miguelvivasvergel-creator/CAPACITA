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
        elegidas, usos, falta, _ = await elegir_piezas("carta en tres idiomas a tres correos", opciones, SimpleNamespace(select=select))
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
        elegidas, usos, _, _ = await elegir_piezas("viaje", opciones, SimpleNamespace(select=select))
        self.assertEqual(usos[v("componer_texto@1")], 1)  # clima + 2 lugares: tres datos que juntar
        self.assertNotIn(v("tarea_texto@1"), usos)  # la reemplaza: no suma un paso (máximo 12)
        self.assertIn("Escribir con IA usando varios datos", [row["name"] for row in elegidas])
        # …pero sigue disponible sin cantidad obligatoria: podía ser otra parte del pedido (la versión en inglés).
        opcional = next(row for row in elegidas if row["id"] == v("tarea_texto@1"))
        self.assertNotIn("usos", opcional)

        async def uno(objetivo, catalogo):
            return {"piezas": [{"id": v("clima_pronostico@2"), "usos": 1, "para_que": ""},
                               {"id": v("tarea_texto@1"), "usos": 1, "para_que": ""}], "falta": ""}
        _, usos, _, _ = await elegir_piezas("promo", opciones, SimpleNamespace(select=uno))
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


class ListaDeVerificacionTests(unittest.TestCase):
    """Nada del pedido se pierde en silencio, sea cual sea el pedido: cada requisito necesita sus pasos."""
    REQUISITOS = ["Consultar el clima", "Escribir el itinerario", "Escribir una versión corta en inglés",
                  "Enviar la versión en inglés a ana@example.com"]

    def cobertura(self, *pares):
        from schemas.planner import Cobertura
        return [Cobertura(n=n, pasos=list(pasos)) for n, pasos in pares]

    def test_la_version_en_ingles_que_falta_se_detecta(self):
        from services.planner_service import requisitos_sin_cubrir
        sin_ingles = plan(CLIMA, ("ia", v("componer_texto@1"), {"instruccion": "Itinerario"}, {"dato_1": ("clima", "dias")}),
                          ("correo", v("enviar_correo@2"), {"asunto": "Viaje", "para": "ana@example.com"},
                           {"mensaje": ("ia", "resultado")}))
        faltan = requisitos_sin_cubrir(sin_ingles, self.REQUISITOS, self.cobertura(
            (1, ["clima"]), (2, ["ia"]), (3, ["ia"]), (4, ["correo"])))
        self.assertEqual([n for n, _, _ in faltan], [3, 4])
        self.assertIn("ingles", faltan[0][2])

    def test_plan_completo_pasa(self):
        from services.planner_service import requisitos_sin_cubrir
        completo = plan(CLIMA, ("ia", v("componer_texto@1"), {"instruccion": "Itinerario"}, {"dato_1": ("clima", "dias")}),
                        ("ingles", v("tarea_texto@1"), {"instruccion": "Versión corta en inglés para Ana"}, {"texto": ("ia", "resultado")}),
                        ("correo", v("enviar_correo@2"), {"asunto": "Trip", "para": "ana@example.com"},
                         {"mensaje": ("ingles", "resultado")}))
        self.assertEqual(requisitos_sin_cubrir(completo, self.REQUISITOS, self.cobertura(
            (1, ["clima"]), (2, ["ia"]), (3, ["ingles"]), (4, ["correo"]))), [])
        # Un requisito sin pasos o un correo escrito en el pedido que nadie envía se detectan.
        faltan = requisitos_sin_cubrir(completo, self.REQUISITOS + ["Enviar copia a pepe@example.com"],
                                       self.cobertura((1, ["clima"]), (2, ["ia"]), (3, ["ingles"]), (4, ["correo"]), (5, ["correo"])))
        self.assertEqual([(n, "pepe@example.com" in motivo) for n, _, motivo in faltan], [(5, True)])
        faltan = requisitos_sin_cubrir(completo, self.REQUISITOS, self.cobertura((1, ["clima"]), (2, ["ia"]), (4, ["correo"])))
        self.assertEqual([(n, motivo) for n, _, motivo in faltan], [(3, "ningún paso lo cumple")])
        # Sin cobertura (la IA no la llenó) no se acusa todo: solo se revisan correos e idiomas del plan.
        self.assertEqual(requisitos_sin_cubrir(completo, self.REQUISITOS, []), [])

    def test_cada_paso_que_escribe_recibe_los_puntos_de_sus_datos(self):
        """La pregunta del pedido llega a la IA que escribe aunque el plan la resuma en «con todo eso»."""
        from services.planner_service import MARCA_PUNTOS, puntos_para_redactar
        requisitos = ["Consultar el clima", "Dime si el lunes es festivo", "Escribir el itinerario",
                      "Escribir una versión corta en inglés", "Enviar la versión en inglés a ana@example.com"]
        definicion = plan(CLIMA, ("festivos", v("festivos_pais@2"), {"anio": 2026}, {}),
                          ("ia", v("componer_texto@1"), {"instruccion": "Itinerario con todo eso"},
                           {"dato_1": ("clima", "dias"), "dato_2": ("festivos", "resumen")}),
                          ("ingles", v("tarea_texto@1"), {"instruccion": "Versión corta en inglés"}, {"texto": ("ia", "resultado")}),
                          ("correo", v("enviar_correo@2"), {"asunto": "Trip", "para": "ana@example.com"},
                           {"mensaje": ("ingles", "resultado")}))
        cobertura = self.cobertura((1, ["clima"]), (2, ["festivos"]), (3, ["ia"]), (4, ["ingles"]), (5, ["correo"]))
        puntos_para_redactar(definicion, requisitos, cobertura)
        pasos = {n.id: n.values.get("instruccion") for n in definicion.nodes}
        self.assertEqual(pasos["ia"], "Itinerario con todo eso\n\n" + MARCA_PUNTOS + "\n- Consultar el clima"
                         "\n- Dime si el lunes es festivo\n- Escribir el itinerario")
        # La traducción solo recibe lo suyo: lo del itinerario ya lo cumplió el paso anterior; el envío, nadie.
        self.assertEqual(pasos["ingles"], "Versión corta en inglés\n\n" + MARCA_PUNTOS + "\n- Escribir una versión corta en inglés")
        # Repetirlo no duplica la lista, sin cobertura no se toca nada y nunca pasa del largo del campo.
        puntos_para_redactar(definicion, requisitos, cobertura)
        self.assertEqual(pasos["ia"], definicion.nodes[2].values["instruccion"])
        otro = plan(CLIMA, ("ia", v("tarea_texto@1"), {"instruccion": "x" * 990}, {"texto": ("clima", "resumen")}))
        puntos_para_redactar(otro, requisitos, [])
        self.assertEqual(otro.nodes[1].values["instruccion"], "x" * 990)
        puntos_para_redactar(otro, requisitos, self.cobertura((1, ["clima"])))
        self.assertEqual(otro.nodes[1].values["instruccion"], "x" * 990)  # no cabía ni un punto: queda igual


class SinDatoTests(unittest.TestCase):
    """Una consulta que falla y solo alimenta a una IA no tumba la solución; con un envío directo sí."""

    def test_suplente_solo_si_lo_usa_una_ia(self):
        from services.workflow_engine import salida_suplente
        con_ia = plan(CLIMA, ("ia", v("componer_texto@1"), {"instruccion": "Itinerario"}, {"dato_1": ("clima", "dias")}),
                      ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("ia", "resultado")}))
        suplente = salida_suplente("clima", v("clima_pronostico@2"), "connector_provider_unavailable", con_ia)
        self.assertIn("Dato no disponible: el servicio no respondió", suplente["dias"])
        directo = plan(CLIMA, ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("clima", "resumen")}))
        self.assertIsNone(salida_suplente("clima", v("clima_pronostico@2"), "connector_provider_unavailable", directo))
        # Si el texto termina en un correo con destinatario elegido (clientes, terceros), no se sigue:
        # la persona aprobó el plan, no un texto con «dato no disponible».
        a_otros = plan(CLIMA, ("ia", v("componer_texto@1"), {"instruccion": "Carta"}, {"dato_1": ("clima", "dias")}),
                       ("fin", v("enviar_correo@2"), {"asunto": "Hola", "para": "cliente@example.com"},
                        {"mensaje": ("ia", "resultado")}))
        self.assertIsNone(salida_suplente("clima", v("clima_pronostico@2"), "connector_provider_unavailable", a_otros))
        # La IA misma (o un envío) que falla nunca se reemplaza.
        self.assertIsNone(salida_suplente("ia", v("componer_texto@1"), "connector_error", con_ia))


class AlertasTests(unittest.TestCase):
    def test_una_condicion_que_no_frena_ningun_envio_es_un_error(self):
        trm = ("trm", v("trm_colombia@2"), {}, {})
        cond = ("cond", v("revisar_condicion@1"), {"condicion": "pasa de 5000"}, {"dato": ("trm", "resumen")})
        directo = plan(trm, cond, ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("trm", "resumen")}))
        self.assertIn("Ningún envío depende de la condición", revision_logica(directo))
        bien = plan(trm, cond, ("fin", v("enviar_telegram@1"), {}, {"mensaje": ("cond", "dato")}))
        self.assertIsNone(revision_logica(bien))


class FechaDeHoyTests(unittest.TestCase):
    def test_la_fecha_opcional_de_hoy_se_deja_vacia_para_que_sirva_al_repetirse(self):
        from connectors.fechas import hoy_colombia
        from services.planner_service import reparar_plan
        hoy = hoy_colombia().isoformat()
        definicion = plan(("trm", v("trm_colombia@2"), {"fecha": hoy}, {}),
                          ("agenda", v("agendar_evento@1"), {"titulo": "Pago", "fecha": hoy}, {}),
                          ("ayer", v("trm_colombia@2"), {"fecha": "2026-01-02"}, {}), salida=("trm", "resumen"))
        opciones = [{"id": str(n.version_id), **{c: REGISTRY[k].definition[c] for c in ("input_schema", "parameter_schema")}}
                    for n, k in zip(definicion.nodes, ("trm_colombia@2", "agendar_evento@1", "trm_colombia@2"))]
        reparar_plan(definicion, opciones)
        valores = {n.id: n.values for n in definicion.nodes}
        self.assertNotIn("fecha", valores["trm"])  # «hoy» se calcula al ejecutar
        self.assertEqual(valores["agenda"]["fecha"], hoy)  # obligatoria: se queda
        self.assertEqual(valores["ayer"]["fecha"], "2026-01-02")  # otra fecha pedida: se queda
