"""Bot de Telegram completo (SQL 21) con un bot y una base falsos: sin Telegram, Gemini ni Supabase reales."""
import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from connectors import REGISTRY
from schemas.planner import PlannerProposal
from schemas.workflows import WorkflowDefinition
from services import telegram_bot as tb
from services.workflow_validation import compile_workflow

CHAT = 42


class Bot:
    def __init__(self, eventos=(), archivo=b""):
        self.eventos, self.archivo, self.dichos, self.editados, self.archivos = list(eventos), archivo, [], [], []
        self.avisos, self.sin_botones = [], []

    def novedades(self, espera=0):
        eventos, self.eventos = self.eventos, []
        return eventos

    def responder(self, chat_id, texto, botones=None, html_=False):
        self.dichos.append({"chat": chat_id, "texto": texto, "botones": botones, "html": html_})
        return len(self.dichos)

    def editar(self, chat_id, mensaje_id, texto, html_=False):
        self.editados.append((mensaje_id, texto))

    def contestar(self, callback_id, texto=""):
        self.avisos.append(texto)

    def quitar_botones(self, chat_id, mensaje_id):
        self.sin_botones.append(mensaje_id)

    def descargar(self, file_id, maximo):
        if len(self.archivo) > maximo:
            raise RuntimeError("telegram_file_too_large")
        return self.archivo

    def enviar_archivo(self, *datos):
        self.archivos.append(datos)


class Base:
    """Las funciones SQL 21 en memoria, con las mismas reglas: el chat manda y los botones vencen al usarse."""

    def __init__(self, vinculado=True, consent=True, workflows=()):
        self.vinculado, self.consent, self.workflows = vinculado, consent, list(workflows)
        self.pendientes, self.llamadas = {}, []

    async def __call__(self, nombre, **datos):
        self.llamadas.append((nombre, datos))
        if nombre == "telegram_owner":
            return {"linked": self.vinculado, "consent": self.consent, "username": "fahida"}
        if nombre == "telegram_set_consent":
            self.consent = datos["p_consent"]
            return {"saved": True}
        if nombre == "telegram_pending_put":
            if datos["p_kind"] == "conversacion":
                self.pendientes = {k: v for k, v in self.pendientes.items() if v["kind"] != "conversacion"}
            ident = str(uuid4())
            self.pendientes[ident] = {"chat": datos["p_chat"], "kind": datos["p_kind"], "payload": datos["p_payload"]}
            return {"id": ident}
        if nombre == "telegram_pending_take":
            ident = datos["p_id"] or next((k for k, v in self.pendientes.items() if v["kind"] == "conversacion"), None)
            fila = self.pendientes.get(ident) if ident else None
            if not fila or fila["chat"] != datos["p_chat"]:
                return {"found": False}
            if datos["p_consume"]:
                self.pendientes.pop(ident)
            return {"found": True, "id": ident, "kind": fila["kind"], "payload": fila["payload"]}
        if nombre == "telegram_workflows":
            return {"items": self.workflows}
        if nombre == "telegram_planner_versions":
            return {"items": []}
        if nombre in ("telegram_save_and_run", "telegram_run_workflow"):
            return {"job_id": str(uuid4()), "status": "queued"}
        return {}

    def ultima(self, nombre):
        return next(datos for n, datos in reversed(self.llamadas) if n == nombre)


def mensaje(texto=None, **extra):
    return (CHAT, {"chat": {"id": CHAT, "type": "private"}, **({"text": texto} if texto is not None else {}), **extra})


def boton(bot, indice=0):
    """El callback del botón número `indice` del último mensaje con botones (con su message_id, como Telegram)."""
    numero, ultimo = next((n, d) for n, d in reversed(list(enumerate(bot.dichos, 1))) if d["botones"])
    return (CHAT, {"_boton": {"id": "cb", "data": ultimo["botones"][indice][0]["callback_data"],
                              "message": {"message_id": numero, "chat": {"id": CHAT, "type": "private"}}}})


def servicios():
    return SimpleNamespace(provider=SimpleNamespace(transcribir=AsyncMock(return_value="farmacias cerca de mí")),
                           limits=None, limite=tb.Limite(), candados={})


def plan_telegram():
    return {"name": "Clima a Telegram", "input_schema": {"type": "object", "properties": {}, "required": [],
                                                          "additionalProperties": False},
            "nodes": [{"id": "clima", "version_id": str(REGISTRY["clima_pronostico@2"].version_id), "label": "Clima",
                       "values": {"ciudad": "Valledupar"}, "parameters": {}, "bindings": {}},
                      {"id": "enviar", "version_id": str(REGISTRY["enviar_telegram@1"].version_id), "label": "Enviar <b>",
                       "values": {}, "parameters": {}, "bindings": {"mensaje": {"source": "clima", "field": "resumen"}}}],
            "outputs": {"r": {"source": "enviar", "field": "resumen"}}}


class BotTests(unittest.IsolatedAsyncioTestCase):
    async def atender(self, bot, base, extra=None):
        await tb.atender(bot, base, "sesion", asyncio.to_thread, extra or servicios())

    async def test_pedido_plan_aprobar_y_encolar(self):
        propuesta = PlannerProposal.model_validate({"decision": "compose", "explanation": "Consulto y te lo envío",
                                                    "definition": plan_telegram(),
                                                    "requisitos": ["Consultar el clima", "Enviarlo por Telegram"]})
        bot, base = Bot([mensaje("dime el clima de Valledupar por Telegram")]), Base()
        with patch("services.telegram_planner.planear_pedido", AsyncMock(return_value=(propuesta, {}))):
            await self.atender(bot, base)
        tarjeta = next(d for d in bot.dichos if d["botones"])
        self.assertTrue(tarjeta["html"])
        self.assertIn("✓ Consultar el clima", tarjeta["texto"])
        self.assertIn("Enviar &lt;b&gt;", tarjeta["texto"])  # lo que viene de la IA se escapa
        self.assertIn("💬 Este chat", tarjeta["texto"])
        self.assertNotIn("telegram_save_and_run", [n for n, _ in base.llamadas])  # nada sin aprobar
        aprobar = boton(bot, 0)
        bot.eventos = [aprobar]
        await self.atender(bot, base)
        datos = base.ultima("telegram_save_and_run")
        self.assertEqual(datos["p_chat"], CHAT)
        self.assertEqual(datos["p_definition"]["name"], "Clima a Telegram")
        self.assertTrue(datos["p_key"].startswith("telegram:") and isinstance(datos["p_message"], int))
        # Al tocarlo, la tarjeta pierde TODOS sus botones: no queda nada a la vista que se pueda repetir.
        self.assertEqual(bot.sin_botones, [aprobar[1]["_boton"]["message"]["message_id"]])
        self.assertEqual(bot.avisos, [""])
        # Si aun así llega otra vez (doble toque rápido): no se encola dos veces y solo hay un aviso
        # flotante, sin mensaje nuevo en medio de la conversación.
        dichos = len(bot.dichos)
        bot.eventos = [aprobar]
        await self.atender(bot, base)
        self.assertEqual([n for n, _ in base.llamadas].count("telegram_save_and_run"), 1)
        self.assertEqual(len(bot.dichos), dichos)
        self.assertIn("ya se usó", bot.avisos[-1])
        # Un callback sin message_id ni datos válidos tampoco rompe nada.
        bot.eventos = [(CHAT, {"_boton": {"id": "cb", "data": "basura"}})]
        await self.atender(bot, base)
        self.assertEqual(len(bot.dichos), dichos)

    async def test_sin_permiso_no_llama_a_la_ia_y_lo_pide(self):
        bot, base = Bot([mensaje("haz un resumen")]), Base(consent=False)
        planear = AsyncMock()
        with patch("services.telegram_planner.planear_pedido", planear):
            await self.atender(bot, base)
            planear.assert_not_called()
            self.assertIn("Gemini", bot.dichos[-1]["texto"])
            bot.eventos = [boton(bot, 1)]  # «No por ahora»
            await self.atender(bot, base)
            planear.assert_not_called()
        self.assertFalse(base.consent)

    async def test_chat_no_vinculado_y_vincular(self):
        bot, base = Bot([mensaje("hola")]), Base(vinculado=False)
        await self.atender(bot, base)
        self.assertEqual(bot.dichos[-1]["texto"], tb.AYUDA)
        bot.eventos = [mensaje("/start ABCDEF123456")]
        await self.atender(bot, base)
        self.assertEqual(base.ultima("telegram_link_complete")["p_code"], "ABCDEF123456")
        # Un pedido que trae un código por casualidad no intenta vincular.
        base.vinculado, base.llamadas = True, []
        bot.eventos = [mensaje("busca el pedido ABCDEF123456 en mi correo")]
        with patch("services.telegram_planner.planear_pedido", AsyncMock(side_effect=RuntimeError("x"))):
            await self.atender(bot, base)
        self.assertNotIn("telegram_link_complete", [n for n, _ in base.llamadas])

    async def test_solucion_guardada_pide_datos_y_corre_la_revision_vista(self):
        definicion = plan_telegram() | {"input_schema": {"type": "object", "required": ["ciudad"], "additionalProperties": False,
                                                          "properties": {"ciudad": {"type": "string", "title": "Ciudad"}}}}
        definicion["nodes"][0] |= {"values": {}, "bindings": {"ciudad": {"source": "$input", "field": "ciudad"}}}
        base = Base(workflows=[{"id": "w1", "revision": 3, "definition_hash": "h" * 64, "definition": definicion}])
        bot = Bot([mensaje("/soluciones")])
        await self.atender(bot, base)
        bot.eventos = [boton(bot, 0)]
        await self.atender(bot, base)
        self.assertIn("¿Ciudad?", bot.dichos[-1]["texto"])
        bot.eventos = [mensaje("Santa Marta")]
        await self.atender(bot, base)
        bot.eventos = [boton(bot, 0)]
        await self.atender(bot, base)
        datos = base.ultima("telegram_run_workflow")
        self.assertEqual((datos["p_workflow"], datos["p_revision"], datos["p_inputs"]), ("w1", 3, {"ciudad": "Santa Marta"}))

    async def test_archivo_raro_o_grande_se_rechaza(self):
        bot, base = Bot([mensaje(document={"file_id": "f", "file_size": 10})], archivo=b"MZ\x90\x00 ejecutable"), Base()
        await self.atender(bot, base)
        self.assertIn("Solo puedo trabajar con fotos", bot.dichos[-1]["texto"])
        bot.eventos = [mensaje(document={"file_id": "f", "file_size": tb.MAX_ARCHIVO + 1})]
        await self.atender(bot, base)
        self.assertIn("muy grande", bot.dichos[-1]["texto"])

    async def test_foto_sin_texto_ofrece_acciones(self):
        bot, base = Bot([mensaje(photo=[{"file_id": "p", "file_size": 10}])], archivo=b"\xff\xd8\xff foto"), Base()
        await self.atender(bot, base)
        etiquetas = [fila[0]["text"] for fila in bot.dichos[-1]["botones"]]
        self.assertIn("✂️ Quitar el fondo", etiquetas)
        guardado = next(v for v in base.pendientes.values() if v["kind"] == "botones")
        self.assertEqual(guardado["payload"]["archivo"]["tipo"], "image/jpeg")  # el archivo se guarda una vez

    async def test_nota_de_voz_se_transcribe_y_sigue_como_pedido(self):
        extra = servicios()
        bot, base = Bot([mensaje(voice={"file_id": "v", "file_size": 100, "mime_type": "audio/ogg"})], archivo=b"OggS"), Base()
        with patch("services.telegram_planner.planear_pedido", AsyncMock(side_effect=RuntimeError("x"))) as planear:
            await self.atender(bot, base, extra)
        extra.provider.transcribir.assert_awaited_once()
        self.assertIn("farmacias cerca de mí", planear.await_args.args[0])

    async def test_notas_de_voz_cuentan_en_el_limite_por_chat(self):
        """Transcribir usa la IA: sin cupo en la hora no se descarga ni se transcribe nada."""
        extra = servicios()
        extra.limite = tb.Limite(por_hora=0)
        bot, base = Bot([mensaje(voice={"file_id": "v", "file_size": 100, "mime_type": "audio/ogg"})], archivo=b"OggS"), Base()
        await self.atender(bot, base, extra)
        extra.provider.transcribir.assert_not_awaited()
        self.assertIn("muchas cosas esta hora", bot.dichos[-1]["texto"])

    async def test_ubicacion_arma_un_plan_valido_sin_ia(self):
        bot, base = Bot([mensaje(location={"latitude": 10.4631, "longitude": -73.2532})]), Base()
        await self.atender(bot, base)
        bot.eventos = [boton(bot, 0)]  # farmacias
        await self.atender(bot, base)
        self.assertIn("Aprobar", bot.dichos[-1]["botones"][0][0]["text"])
        definicion = tb.plan_cerca("farmacia", "10.46310,-73.25320")
        conector = REGISTRY["lugares_cercanos@1"]
        versiones = {str(conector.version_id): {"status": "enabled", "manifest": conector.manifest(), "profile": "connector-v1",
                                                "artifact_hash": conector.artifact_hash,
                                                "definition_hash": conector.definition_hash, "publication_id": "p"}}
        WorkflowDefinition.model_validate(definicion)
        compile_workflow(definicion, versiones)

    async def test_avance_edita_un_mensaje_y_escapa(self):
        bot = Bot()
        reloj = iter([0.0, 0.5, 5.0])
        avance = tb.Avance(bot, CHAT, 7, "Itinerario <x>", reloj=lambda: next(reloj))
        pasos = {"steps": [{"label": "Clima", "status": "completed"}, {"label": "Juntar", "status": "running"}]}
        avance(pasos)
        avance(pasos | {"steps": pasos["steps"][:1]})  # muy pronto: no edita
        avance(pasos | {"steps": [{"label": "Clima", "status": "completed"}, {"label": "Juntar", "status": "completed"}]})
        self.assertEqual(len(bot.editados), 2)
        self.assertIn("Itinerario &lt;x&gt;", bot.editados[0][1])

    async def test_resultado_con_condicion_falsa_no_envia_texto(self):
        bot = Bot()
        await tb.enviar_resultado(bot, CHAT, "Dólar", "completed", {"condicion": {"cumple": False, "motivo": "4.100 < 4.200"}},
                                  {"r": "no se envía"})
        self.assertEqual(len(bot.dichos), 1)
        self.assertIn("no se cumplió la condición", bot.dichos[0]["texto"])


class CondicionTests(unittest.TestCase):
    def test_comparacion_numerica_sin_ia(self):
        from connectors.ia import revisar_condicion
        casos = [("1 USD = 4.215,30 COP", "más de 4.200", True), ("TRM: 4.150", "si pasa de 4.200", False),
                 ("Máxima de 33 °C", "> 30", True), ("Temperatura: 28", "al menos 30", False)]
        for dato, condicion, esperado in casos:
            self.assertIs(revisar_condicion(None, {"dato": dato, "condicion": condicion}, {})["cumple"], esperado, dato)

    def test_si_no_se_cumple_no_se_envia_nada(self):
        from services.workflow_engine import execute_workflow
        claves = {"trm": "trm_colombia@2", "cond": "revisar_condicion@1", "fin": "enviar_telegram@1"}
        definicion = {"name": "Alerta del dólar", "input_schema": {"type": "object", "properties": {}, "additionalProperties": False},
                      "nodes": [{"id": "trm", "version_id": str(REGISTRY[claves["trm"]].version_id), "label": "TRM", "values": {},
                                 "parameters": {}, "bindings": {}},
                                {"id": "cond", "version_id": str(REGISTRY[claves["cond"]].version_id), "label": "Condición",
                                 "values": {"condicion": "más de 4.200"}, "parameters": {},
                                 "bindings": {"dato": {"source": "trm", "field": "resumen"}}},
                                {"id": "fin", "version_id": str(REGISTRY[claves["fin"]].version_id), "label": "Telegram",
                                 "values": {}, "parameters": {}, "bindings": {"mensaje": {"source": "cond", "field": "dato"}}}],
                      "outputs": {"r": {"source": "fin", "field": "resumen"}}}
        versiones = {str(c.version_id): {"status": "enabled", "manifest": c.manifest(), "profile": "connector-v1",
                                         "artifact_hash": c.artifact_hash, "definition_hash": c.definition_hash,
                                         "publication_id": "p"} for c in (REGISTRY[k] for k in claves.values())}
        trabajo = {"artifact_hash": "h", "workflow_revision": 1, "context": {},
                   "payload": {"definition": definicion, "versions": versiones, "inputs": {}, "workflow_hash": "h", "revision": 1}}
        ejecutados = []

        def ejecutar(subjob, _runner):
            clave = subjob["payload"]["manifest"]["connector_key"]
            ejecutados.append(clave)
            salida = {"trm_colombia@2": {"resumen": "TRM de hoy: 4.150,20", "valor": 4150.2, "fecha": "2026-11-21"},
                      "revisar_condicion@1": {"cumple": False, "motivo": "4.150,2 no cumple «> 4.200».", "dato": "x"}}[clave]
            return "completed", {}, salida
        with patch("services.execution_engine.execute_job", ejecutar):
            estado, reporte, resultado = execute_workflow(trabajo, None)
        self.assertEqual(estado, "completed")
        self.assertNotIn("enviar_telegram@1", ejecutados)
        self.assertEqual(reporte["steps"][-1]["status"], "skipped")
        self.assertTrue(reporte["steps"][-1]["omitido"])
        self.assertFalse(reporte["condicion"]["cumple"])
        self.assertIn("Sin novedades", resultado["r"])


class RutasPermitidasTests(unittest.TestCase):
    def test_todas_las_funciones_sql_del_bot_estan_permitidas(self):
        # Fallo real del 21/11: las funciones del SQL 21 no estaban en la lista del gateway y el bot
        # respondía «Algo falló» a todo. La base falsa de estas pruebas no lo veía.
        import pathlib
        import re
        from core.supabase import EXECUTION_RPCS
        fuente = "".join(pathlib.Path(ruta).read_text(encoding="utf-8")
                         for ruta in ("services/telegram_bot.py", "services/shared_worker.py"))
        # Solo los nombres pasados a sql(…)/rpc(…): los códigos de error («telegram_no_vinculado») no son funciones.
        usadas = set(re.findall(r'(?:sql|rpc|rpc_raw)\(\s*"(telegram_[a-z_]+)"', fuente))
        self.assertTrue(usadas)
        self.assertEqual(usadas - EXECUTION_RPCS, set())


class OpcionesTests(unittest.TestCase):
    def test_solo_conectores_publicados_y_la_version_mas_nueva(self):
        from services.telegram_planner import opciones_y_versiones
        v1, v2, tg = REGISTRY["clima_pronostico@1"], REGISTRY["clima_pronostico@2"], REGISTRY["enviar_telegram@1"]

        def fila(c, hash_=None):
            return {"id": str(c.version_id), "capability_id": str(c.capability_id), "manifest": c.manifest(),
                    "profile": "connector-v1", "artifact_hash": hash_ or c.artifact_hash,
                    "definition_hash": c.definition_hash, "publication_id": "p"}
        opciones, versiones = opciones_y_versiones([fila(v1), fila(v2), fila(tg, "0" * 64)])
        self.assertEqual([o["id"] for o in opciones], [str(v2.version_id)])  # la nueva; Telegram no coincide
        self.assertEqual(len(versiones), 3)


if __name__ == "__main__":
    unittest.main()


class TextosParaLaPersonaTests(unittest.TestCase):
    def test_fechas_en_hora_de_colombia(self):
        self.assertEqual(tb.cuando("2026-11-23T12:00:00+00:00"), "23/11 07:00")
        self.assertEqual(tb.cuando("2026-11-23T12:00:00Z"), "23/11 07:00")
        self.assertEqual(tb.cuando(None), "")
        self.assertEqual(tb.cuando("no es fecha"), "")

    def test_un_fallo_nunca_muestra_codigos_internos(self):
        paso = lambda **x: {"steps": [{"label": "Clima", "status": "completed"}, {"label": "Enviar", "status": "failed", **x}],
                            "error": "workflow_step_failed"}
        self.assertEqual(tb.motivo_fallo(paso(error="connector_provider_unavailable")),
                         "el servicio externo no respondió; intenta de nuevo en unos minutos (paso «Enviar»)")
        self.assertIn("conecta tu Telegram", tb.motivo_fallo(paso(error="connector_input", detail="telegram_no_vinculado")))
        self.assertEqual(tb.motivo_fallo(paso(error="input_contract", detail="radio_metros")),
                         "revisa «radio metros» en el paso «Enviar»")
        self.assertEqual(tb.motivo_fallo(paso(error="algo_nuevo")), "falló el paso «Enviar»")
        self.assertEqual(tb.motivo_fallo({"error": "execution_failure"}), "hubo un error al ejecutar")
        for texto in (tb.motivo_fallo(paso(error=c)) for c in ("connector_quota", "algo_nuevo", "step_failed")):
            self.assertNotRegex(texto, r"\b[a-z]+_[a-z_]+\b")


class CharlaTests(unittest.IsolatedAsyncioTestCase):
    async def test_saludos_y_gracias_no_gastan_la_ia_pero_un_pedido_si_llega(self):
        for texto, respuesta in (("hola", "Dime qué necesitas"), ("¡Buenos días!", "Dime qué necesitas"),
                                 ("muchas", None), ("gracias!!", "Con gusto"), ("👍", "Con gusto"), ("jajaja", "Dime qué")):
            bot, base = Bot([mensaje(texto)]), Base()
            planear = AsyncMock(side_effect=RuntimeError("x"))
            with patch("services.telegram_planner.planear_pedido", planear):
                await tb.atender(bot, base, "sesion", asyncio.to_thread, servicios())
            if respuesta is None:
                planear.assert_awaited_once()  # «muchas» no es charla: sigue como pedido
            else:
                planear.assert_not_awaited()
                self.assertIn(respuesta, bot.dichos[-1]["texto"], texto)
        bot, base = Bot([mensaje("hola, dime el clima de mañana en Valledupar")]), Base()
        planear = AsyncMock(side_effect=RuntimeError("x"))
        with patch("services.telegram_planner.planear_pedido", planear):
            await tb.atender(bot, base, "sesion", asyncio.to_thread, servicios())
        planear.assert_awaited_once()


class NumeroDecisivoTests(unittest.TestCase):
    """La condición solo decide sin IA cuando no hay duda de cuál número es «el dato»."""

    def test_fechas_horas_y_tasas_no_se_confunden_con_el_dato(self):
        from connectors.ia import numero_decisivo
        casos = {"TRM vigente desde el 2026-11-21: $4.123,45 pesos por dólar": 4123.45,  # antes leía 2026
                 "TRM del 21/11/2026: $4.123,45 por dólar": 4123.45,
                 "El 21 de noviembre de 2026 el dólar está en 4.123,45 pesos": 4123.45,
                 "300.000,00 COP = 89,70 USD (1 COP = 0.000299 USD).": 89.7,  # antes tomaba la tasa
                 "1 USD = 4.215,30 COP": 4215.3, "A las 14:30 la máxima es 33 °C": 33.0, "4123.45": 4123.45}
        for texto, esperado in casos.items():
            self.assertAlmostEqual(numero_decisivo(texto), esperado, msg=texto)
        # Dos cifras posibles: no se adivina (decide la IA con el texto completo).
        self.assertIsNone(numero_decisivo("Bogotá mañana: 19 °C máx; hoy 21 °C"))
        self.assertIsNone(numero_decisivo("sin cifras"))

    def test_el_motivo_se_entiende(self):
        from connectors.ia import revisar_condicion
        salida = revisar_condicion(None, {"dato": "TRM vigente desde el 2026-11-21: $5.123,45 pesos por dólar",
                                          "condicion": "pasa de 5.000"}, {})
        self.assertTrue(salida["cumple"])
        self.assertEqual(salida["motivo"], "Se cumple «pasa de 5.000»: el valor es 5.123,45, que es mayor que 5.000.")
        self.assertIn("2026-11-21", salida["dato"])  # el aviso lleva el texto legible, no solo el número
