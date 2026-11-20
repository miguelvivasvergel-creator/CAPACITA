"""Formato de lo que sale de Capacita y destinatario del correo escrito por la persona."""
import base64
import email
from email import policy
import json
import re
import unittest

import httpx
from fastapi import HTTPException

from connectors import PROFILE, REGISTRY
from connectors.formato import bloques, correo_html, elegir_estilo, telegram_html, texto_plano, trozos
from schemas.workflows import WorkflowDefinition
from services.connector_runtime import run_connector
from services.planner_service import destinatarios_no_escritos
from services.workflow_validation import compile_workflow

PUBLICA = lambda host, port, type=None: [(None, None, None, None, ("93.184.216.34", port))]
CONECTADA = {"google_access_token": "ya29.token-de-prueba", "google_email": "fahida@example.com"}

PLAN = """## Plan semanal Sabor Vallenato

Esta semana hace **mucho calor** y llueve el sábado.

### Jueves · 34 °C
- Promoción: bebidas frías
- Preparar: **+30 %** de limonada

> ¡Combate el calor con nuestra limonada de coco 2x1!

| Día | Clima | Promoción |
|---|---|---|
| Jueves | Soleado | Bebidas frías |
| Sábado | Lluvia | Domicilios |
"""

ACADEMICO = """## Resumen del artículo

El estudio de García et al. (2024) analiza la metodología de investigación en universidades.

## Referencias
1. García, L. (2024). *Revista de Educación*, 12(3). https://doi.org/10.1000/xyz
"""


def correo(inputs, parametros=None, version=2):
    vistas = []
    connector = REGISTRY[f"enviar_correo@{version}"]
    job = {"kind": "run", "artifact_hash": connector.artifact_hash, "context": CONECTADA,
           "payload": {"manifest": connector.manifest(), "inputs": inputs, "parameters": parametros or {}, "profile": PROFILE}}

    def handler(request):
        vistas.append(request)
        return httpx.Response(200, json={"id": "m1"})
    estado, reporte, salida = run_connector(job, transport=httpx.MockTransport(handler), resolver=PUBLICA)
    crudo = base64.urlsafe_b64decode(json.loads(vistas[0].content)["raw"]) if vistas else b""
    return estado, reporte, salida, crudo


def partes(crudo):
    """HTML, texto plano y cabeceras del correo (decodifica la codificación de cada parte)."""
    mensaje = email.message_from_bytes(crudo, policy=policy.default)
    return mensaje.get_body(("html",)).get_content(), mensaje.get_body(("plain",)).get_content(), mensaje


class LecturaTests(unittest.TestCase):
    def test_blocks(self):
        self.assertEqual([tipo for tipo, _ in bloques(PLAN)], ["titulo", "parrafo", "titulo", "lista", "cita", "tabla"])
        encabezado, filas = bloques(PLAN)[-1][1]
        self.assertEqual(encabezado, ["Día", "Clima", "Promoción"])
        self.assertEqual(filas[1], ["Sábado", "Lluvia", "Domicilios"])
        # «Lunes:» antes de una lista es un subtítulo aunque no lleve «##».
        self.assertEqual(bloques("Lunes:\n- sopa\n- jugo")[0], ("titulo", (3, "Lunes")))
        self.assertEqual(bloques("Hola:\nTe cuento algo")[0][0], "parrafo")

    def test_style_depends_on_content(self):
        self.assertEqual(elegir_estilo("Resumen para mi tesis", ACADEMICO), "academico")
        self.assertEqual(elegir_estilo("Plan semanal", PLAN), "promocional")
        self.assertEqual(elegir_estilo("Factura de octubre", "Proveedor: Lácteos SAS. Total del pago: $120.000"), "formal")
        self.assertEqual(elegir_estilo("Pronóstico", "Mañana llueve en Bogotá."), "general")
        self.assertEqual(elegir_estilo("Plan semanal", PLAN, "académico"), "academico")
        self.assertEqual(elegir_estilo("Plan semanal", PLAN, "automático"), "promocional")


class CorreoTests(unittest.TestCase):
    def test_academic_mail_is_sober_and_promo_has_color_and_cards(self):
        academico = correo_html("Resumen para mi tesis", ACADEMICO, estilo="academico")
        self.assertIn("Georgia", academico)
        self.assertNotIn("gradient", academico)
        for color in ("#ea580c", "#f97316", "#2563eb", "#4338ca"):
            self.assertNotIn(color, academico)
        self.assertIn("<em>Revista de Educación</em>", academico)
        promo = correo_html("Plan semanal", PLAN, estilo="promocional")
        self.assertIn("linear-gradient", promo)
        self.assertEqual(promo.count("border-left:5px solid"), 2)  # una tarjeta por sección
        self.assertIn("<th", promo)
        self.assertIn("●─●─●", promo)
        # El primer título que repite el asunto no sale dos veces.
        repetido = correo_html("Plan semanal Sabor Vallenato", PLAN, estilo="promocional")
        self.assertEqual(repetido.count("Plan semanal Sabor Vallenato"), 1)

    def test_content_never_injects_html(self):
        malo = '## <img src=x onerror=alert(1)>\n**<a href="https://evil.example">clic</a>**\n| <script>x</script> | b |'
        for salida in (correo_html("Asunto <b>", malo), telegram_html(malo)):
            self.assertNotIn("<img", salida)
            self.assertNotIn("<a ", salida)
            self.assertNotIn("<script", salida)
            self.assertIn("&lt;", salida)

    def test_mail_to_own_address_keeps_brand(self):
        estado, reporte, _, crudo = correo({"asunto": "Plan semanal Sabor Vallenato", "mensaje": PLAN})
        self.assertEqual(estado, "completed", reporte)
        cuerpo, plano, mensaje = partes(crudo)
        self.assertEqual(mensaje["To"], "fahida@example.com")
        self.assertIn("Capacita</td>", cuerpo)
        self.assertIn("border-left:5px solid", cuerpo)
        self.assertNotIn("**", plano)
        self.assertIn("PLAN SEMANAL SABOR VALLENATO", plano)
        self.assertIn("• Promoción: bebidas frías", plano)

    def test_mail_to_address_the_person_wrote(self):
        estado, reporte, salida, crudo = correo({"asunto": "Tu cotización", "mensaje": "Hola, te envío la cotización.",
                                                 "para": "cliente@empresa.co"})
        self.assertEqual(estado, "completed", reporte)
        cuerpo, _, mensaje = partes(crudo)
        self.assertEqual(mensaje["To"], "cliente@empresa.co")
        self.assertNotIn("Capacita</td>", cuerpo)  # al cliente le llega sin la marca de Capacita
        self.assertIn("Enviado por fahida@example.com con Capacita.", cuerpo)
        self.assertIn("cliente@empresa.co", salida["resumen"])
        for malo in ("a@x.com, b@y.com", "a@x.com\nBcc: c@d.com", "sin-arroba", "a@x"):
            estado, reporte, _, crudo = correo({"asunto": "a", "mensaje": "b", "para": malo})
            self.assertEqual((estado, reporte.get("detail"), crudo), ("failed", "para", b""), malo)

    def test_version_1_still_cannot_choose_recipient(self):
        estado, reporte, _, _ = correo({"asunto": "a", "mensaje": "b", "para": "otro@x.com"}, version=1)
        self.assertEqual(reporte["error"], "input_contract")
        estado, reporte, _, crudo = correo({"asunto": "Informe", "mensaje": "## Ventas\n- **+12 %**"}, version=1)
        self.assertEqual(estado, "completed", reporte)
        self.assertIn("<h2", partes(crudo)[0])

    def test_style_parameter(self):
        estado, _, _, crudo = correo({"asunto": "Plan semanal", "mensaje": PLAN}, {"estilo": "académico"})
        self.assertEqual(estado, "completed")
        self.assertNotIn("gradient", partes(crudo)[0])


class TelegramFormatoTests(unittest.TestCase):
    def test_telegram_renders_structure(self):
        salida = telegram_html(PLAN)
        self.assertIn("<b>Plan semanal Sabor Vallenato</b>", salida)
        self.assertIn("<b>mucho calor</b>", salida)
        self.assertIn("<blockquote>¡Combate el calor", salida)
        self.assertIn("• Jueves · Soleado · Bebidas frías", salida)

    def test_chunks_keep_tags_balanced(self):
        texto = "\n".join(f"- **Línea {n}** con algo de texto para llenar" for n in range(400))
        trozo = trozos(texto, 3800)
        self.assertGreater(len(trozo), 1)
        self.assertEqual("\n".join(trozo), texto)
        for parte in trozo:
            html = telegram_html(parte)
            self.assertEqual(html.count("<b>"), html.count("</b>"))
            self.assertLessEqual(len(parte), 3800)

    def test_plain_text_for_calendar(self):
        self.assertEqual(texto_plano("## Hoy\n- **sopa**\n> 2x1"), "HOY\n\n• sopa\n\n  » 2x1")


class DestinatarioTests(unittest.TestCase):
    tarea, correo_v2 = REGISTRY["tarea_texto@1"], REGISTRY["enviar_correo@2"]

    def snapshot(self, connector):
        return {"status": "enabled", "publication_id": "p", "manifest": connector.manifest(),
                "artifact_hash": connector.artifact_hash, "definition_hash": connector.definition_hash, "profile": PROFILE}

    def definicion(self, envio):
        return {"name": "Cotización al cliente", "input_schema": {"type": "object", "properties": {}},
                "nodes": [{"id": "ia", "version_id": str(self.tarea.version_id), "label": "IA",
                           "values": {"texto": "Productos", "instruccion": "Escribe la cotización"}},
                          {"id": "correo", "version_id": str(self.correo_v2.version_id), "label": "Correo", **envio}],
                "outputs": {"resumen": {"source": "correo", "field": "resumen"}}}

    def versions(self):
        return {str(c.version_id): self.snapshot(c) for c in (self.tarea, self.correo_v2)}

    def test_recipient_can_be_fixed_but_never_from_another_step(self):
        fijo = {"values": {"asunto": "Cotización", "para": "cliente@empresa.co"},
                "bindings": {"mensaje": {"source": "ia", "field": "resultado"}}}
        compile_workflow(self.definicion(fijo), self.versions())
        de_otro_paso = {"values": {"asunto": "Cotización"},
                        "bindings": {"mensaje": {"source": "ia", "field": "resultado"},
                                     "para": {"source": "ia", "field": "resultado"}}}
        with self.assertRaises(HTTPException) as contexto:
            compile_workflow(self.definicion(de_otro_paso), self.versions())
        self.assertEqual(contexto.exception.status_code, 422)
        self.assertIn("«para»", contexto.exception.detail)

    def test_planner_drops_address_the_person_did_not_write(self):
        def plan(para):
            return WorkflowDefinition.model_validate(self.definicion(
                {"values": {"asunto": "Cotización", "para": para}, "bindings": {"mensaje": {"source": "ia", "field": "resultado"}}}))
        definicion = plan("Cliente@Empresa.co ")
        self.assertEqual(destinatarios_no_escritos(definicion, "Envíale la cotización a cliente@empresa.co"), [])
        self.assertEqual(definicion.nodes[1].values["para"], "Cliente@Empresa.co")
        definicion = plan("inventado@otro.com")
        self.assertEqual(destinatarios_no_escritos(definicion, "Envíale la cotización a mi cliente"), ["inventado@otro.com"])
        self.assertNotIn("para", definicion.nodes[1].values)


class DriveFormatoTests(unittest.TestCase):
    def test_text_becomes_formatted_google_doc(self):
        vistas = []
        connector = REGISTRY["guardar_drive@1"]
        job = {"kind": "run", "artifact_hash": connector.artifact_hash, "context": CONECTADA,
               "payload": {"manifest": connector.manifest(), "inputs": {"archivo": PLAN, "nombre_archivo": "Plan semanal"},
                           "parameters": {}, "profile": PROFILE}}

        def handler(request):
            vistas.append(request)
            return httpx.Response(200, json={"id": "d1", "name": "Plan semanal"})
        estado, reporte, _ = run_connector(job, transport=httpx.MockTransport(handler), resolver=PUBLICA)
        self.assertEqual(estado, "completed", reporte)
        cuerpo = vistas[0].content.decode()
        self.assertIn("Content-Type: text/html; charset=UTF-8", cuerpo)
        self.assertIn('"mimeType": "application/vnd.google-apps.document"', cuerpo)
        self.assertTrue(re.search(r"<h3[^>]*>Jueves · 34 °C</h3>", cuerpo))
        self.assertIn("<table", cuerpo)


if __name__ == "__main__":
    unittest.main()
