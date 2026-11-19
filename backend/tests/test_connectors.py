"""Conectores: registro, broker seguro, cada conector con respuestas simuladas y el recorrido
del trabajador (validar y ejecutar una solución con un paso conector). Sin red real."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

import httpx
from fastapi import HTTPException
from jsonschema import Draft202012Validator

from connectors import CONNECTORS, PROFILE, REGISTRY, from_manifest
from services import connector_runtime
from services.connector_broker import ConnectorFailure, SafeHttp
from services.connector_runtime import run_connector
from services.contract_validation import validate_schema
from services.execution_engine import execute_job
from services.workflow_validation import compile_workflow

ROOT = Path(__file__).resolve().parents[2]
PUBLICA = lambda host, port, type=None: [(None, None, None, None, ("93.184.216.34", port))]
PRIVADA = lambda host, port, type=None: [(None, None, None, None, ("10.0.0.5", port))]

RESPUESTAS = {
    "geocoding-api.open-meteo.com": {"results": [{"name": "Bogotá", "admin1": "Bogotá D.C.", "country": "Colombia",
                                                  "latitude": 4.6, "longitude": -74.08}]},
    "api.open-meteo.com": {"daily": {"time": ["2026-11-20", "2026-11-21"], "temperature_2m_max": [20.0, 22.4],
                                     "temperature_2m_min": [10.2, 9.1], "precipitation_sum": [0.2, 4.4],
                                     "precipitation_probability_max": [31, 65], "weather_code": [51, 80]}},
    "archive-api.open-meteo.com": {"daily": {"time": ["2026-10-01", "2026-10-02", "2026-10-03"],
                                             "temperature_2m_max": [20.1, 17.9, None], "temperature_2m_min": [9.0, 8.5, None],
                                             "precipitation_sum": [1.6, 0.0, None], "weather_code": [61, 3, None]}},
    "date.nager.at": [{"date": "2026-01-01", "localName": "Año Nuevo"}, {"date": "2026-12-25", "localName": "Navidad"}],
    "www.datos.gov.co": [{"valor": "3326.96", "vigenciadesde": "2026-11-19T00:00:00.000"}],
    "open.er-api.com": {"result": "success", "rates": {"USD": 1, "COP": 3900.5},
                        "time_last_update_utc": "Thu, 19 Nov 2026 00:02:31 +0000"},
    "api.crossref.org": {"message": {"items": [
        {"DOI": "10.1/otro", "title": ["Un trabajo distinto sobre redes"]},
        {"DOI": "10.48550/arXiv.1706.03762", "title": ["Attention Is All You Need"],
         "author": [{"given": "Ashish", "family": "Vaswani"}, {"given": "Noam", "family": "Shazeer"}],
         "issued": {"date-parts": [[2017, 6, 12]]}, "container-title": ["Advances in Neural Information Processing Systems"],
         "volume": "30"}]}},
}


def transporte(respuestas=RESPUESTAS, vistas=None):
    def handler(request):
        if vistas is not None:
            vistas.append(request)
        return httpx.Response(200, json=respuestas[request.url.host])
    return httpx.MockTransport(handler)


def trabajo(connector, inputs, parameters):
    return {"kind": "run", "artifact_hash": connector.artifact_hash,
            "payload": {"manifest": connector.manifest(), "inputs": inputs, "parameters": parameters, "profile": PROFILE}}


def ejecutar(key, inputs, parameters, **kwargs):
    connector = REGISTRY[key]
    return run_connector(trabajo(connector, inputs, parameters), transport=kwargs.get("transport", transporte()),
                         resolver=kwargs.get("resolver", PUBLICA))


class RegistryTests(unittest.TestCase):
    def test_contracts_are_supported_and_examples_valid(self):
        ids = set()
        for connector in CONNECTORS:
            d = connector.definition
            for clave in ("input_schema", "parameter_schema", "output_schema"):
                validate_schema(d[clave], clave)
            ejemplo = d["examples"][0]
            self.assertTrue(Draft202012Validator(d["input_schema"]).is_valid(ejemplo["inputs"]), connector.key)
            self.assertTrue(Draft202012Validator(d["parameter_schema"]).is_valid(ejemplo["parameters"]), connector.key)
            self.assertTrue(connector.hosts and all("/" not in host for host in connector.hosts))
            ids |= {connector.capability_id, connector.version_id}
        self.assertEqual(len(ids), 2 * len(CONNECTORS))

    def test_seed_sql_matches_registry(self):
        spec = importlib.util.spec_from_file_location("seed", ROOT / "scripts" / "connectors" / "generate_seed_sql.py")
        seed = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(seed)
        actual = (ROOT / "db" / "15_conectores_iniciales.sql").read_text(encoding="utf-8")
        self.assertEqual(actual, seed.generar(), "Regenera db/15 con scripts/connectors/generate_seed_sql.py")

    def test_tampered_manifest_is_rejected(self):
        connector = REGISTRY["festivos_pais@1"]
        manifest = connector.manifest()
        self.assertIs(from_manifest(manifest, connector.artifact_hash), connector)
        alterado = json.loads(json.dumps(manifest))
        alterado["hosts"] = ["evil.example"]
        self.assertIsNone(from_manifest(alterado))
        self.assertIsNone(from_manifest(manifest, "0" * 64))
        estado, reporte, salida = run_connector({"kind": "run", "artifact_hash": connector.artifact_hash,
            "payload": {"manifest": alterado, "inputs": {"anio": 2026}, "parameters": {"pais": "CO"}, "profile": PROFILE}})
        self.assertEqual((estado, reporte["error"], salida), ("failed", "connector_mismatch", None))


class BrokerTests(unittest.TestCase):
    def http(self, **kwargs):
        return SafeHttp(["date.nager.at"], kwargs.pop("max_requests", 2), resolver=kwargs.pop("resolver", PUBLICA), **kwargs)

    def assertFalla(self, codigo, funcion):
        with self.assertRaises(ConnectorFailure) as contexto:
            funcion()
        self.assertEqual(contexto.exception.code, codigo)

    def test_only_declared_https_hosts(self):
        http = self.http(transport=transporte())
        self.assertFalla("host_not_allowed", lambda: http.get_json("https://evil.example/x"))
        self.assertFalla("host_not_allowed", lambda: http.get_json("http://date.nager.at/x"))
        self.assertFalla("host_not_allowed", lambda: http.get_json("https://user:pw@date.nager.at/x"))
        self.assertFalla("host_not_allowed", lambda: http.get_json("https://date.nager.at:8443/x"))

    def test_private_addresses_are_blocked(self):
        http = self.http(transport=transporte(), resolver=PRIVADA)
        self.assertFalla("host_not_allowed", lambda: http.get_json("https://date.nager.at/x"))

    def test_request_limit(self):
        http = self.http(transport=transporte(), max_requests=1)
        http.get_json("https://date.nager.at/x")
        self.assertFalla("request_limit", lambda: http.get_json("https://date.nager.at/x"))

    def test_redirects_are_not_followed(self):
        http = self.http(transport=httpx.MockTransport(lambda r: httpx.Response(302, headers={"Location": "https://evil.example"})))
        self.assertFalla("provider_unavailable", lambda: http.get_json("https://date.nager.at/x"))

    def test_response_size_and_json_are_bounded(self):
        grande = httpx.MockTransport(lambda r: httpx.Response(200, content=b"[" + b"1," * 600000 + b"1]"))
        self.assertFalla("invalid_response", lambda: self.http(transport=grande).get_json("https://date.nager.at/x"))
        roto = httpx.MockTransport(lambda r: httpx.Response(200, content=b"NaN"))
        self.assertFalla("invalid_response", lambda: self.http(transport=roto).get_json("https://date.nager.at/x"))

    def test_not_found_and_errors(self):
        no = httpx.MockTransport(lambda r: httpx.Response(404))
        self.assertFalla("not_found", lambda: self.http(transport=no).get_json("https://date.nager.at/x"))
        caido = httpx.MockTransport(lambda r: httpx.Response(503))
        self.assertFalla("provider_unavailable", lambda: self.http(transport=caido).get_json("https://date.nager.at/x"))
        ocupado = httpx.MockTransport(lambda r: httpx.Response(429))
        self.assertFalla("provider_busy", lambda: self.http(transport=ocupado).get_json("https://date.nager.at/x"))

    def test_generic_title_by_other_authors_is_not_a_match(self):
        respuestas = dict(RESPUESTAS, **{"api.crossref.org": {"message": {"items": [
            {"DOI": "10.22533/otro", "title": ["Metodología de la investigación"],
             "author": [{"given": "Carlos", "family": "García"}], "issued": {"date-parts": [[2023]]}}]}}})
        salida = ejecutar("verificar_referencia@1", {"referencia": "Hernández Sampieri, R. (2014). Metodología de la investigación."},
                          {}, transport=transporte(respuestas))[2]
        self.assertFalse(salida["encontrada"])

    def test_same_title_prefers_cited_year_and_journal(self):
        respuestas = dict(RESPUESTAS, **{"api.crossref.org": {"message": {"items": [
            {"DOI": "10.9/redeposito", "title": ["Deep learning"], "issued": {"date-parts": [[2025]]}},
            {"DOI": "10.1038/nature14539", "title": ["Deep learning"], "author": [{"given": "Yann", "family": "LeCun"}],
             "issued": {"date-parts": [[2015]]}, "container-title": ["Nature"]}]}}})
        salida = ejecutar("verificar_referencia@1", {"referencia": "LeCun, Y. (2015). Deep learning. Nature."}, {},
                          transport=transporte(respuestas))[2]
        self.assertEqual(salida["doi"], "10.1038/nature14539")
        self.assertNotIn("no coincide", salida["resumen"])


class ConnectorTests(unittest.TestCase):
    def assertCompleto(self, key, inputs, parameters):
        estado, reporte, salida = ejecutar(key, inputs, parameters)
        self.assertEqual(estado, "completed", reporte)
        self.assertTrue(Draft202012Validator(REGISTRY[key].definition["output_schema"]).is_valid(salida))
        self.assertEqual(reporte["profile"], PROFILE)
        return salida

    def test_forecast(self):
        vistas = []
        salida = run_connector(trabajo(REGISTRY["clima_pronostico@1"], {"ciudad": "Bogotá"}, {"dias": 2, "pais": "CO"}),
                               transport=transporte(vistas=vistas), resolver=PUBLICA)[2]
        self.assertEqual(salida["ciudad"], "Bogotá, Bogotá D.C., Colombia")
        self.assertEqual(salida["dias_con_lluvia"], 1)
        self.assertEqual(salida["dias"][1]["estado"], "Chubascos ligeros")
        # Solo la ciudad (y coordenadas) salen hacia el proveedor.
        self.assertEqual(vistas[0].url.params["name"], "Bogotá")
        self.assertNotIn("authorization", {key.lower() for key in vistas[0].headers})

    def test_forecast_summary_names_the_days(self):
        from datetime import date
        from connectors.clima import dias_humanos
        hoy = date(2026, 11, 19)
        self.assertEqual(dias_humanos(["2026-11-22", "2026-11-23"], hoy), "el domingo 22 y el lunes 23 de noviembre")
        self.assertEqual(dias_humanos(["2026-11-19"], hoy), "hoy")
        self.assertEqual(dias_humanos(["2026-11-19", "2026-11-20"], hoy), "hoy y el viernes 20 de noviembre")
        self.assertEqual(dias_humanos(["2026-11-30", "2026-12-01", "2026-12-02"], hoy),
                         "el lunes 30 de noviembre, el martes 1 y el miércoles 2 de diciembre")
        salida = ejecutar("clima_pronostico@1", {"ciudad": "Bogotá"}, {"dias": 2, "pais": "CO"})[2]
        self.assertIn("lluvia probable (50 % o más) el sábado 21 de noviembre", salida["resumen"])
        self.assertIn("Temperatura entre 9,1 y 22,4 °C.", salida["resumen"])

    def test_history_skips_unpublished_days(self):
        salida = self.assertCompleto("clima_historico@1", {"ciudad": "Bogotá", "fecha_inicio": "2026-10-01",
                                                          "fecha_fin": "2026-10-03"}, {"pais": "CO"})
        self.assertEqual(len(salida["dias"]), 2)
        self.assertEqual([dia["llovio"] for dia in salida["dias"]], [True, False])

    def test_history_rejects_bad_dates(self):
        estado, reporte, _ = ejecutar("clima_historico@1", {"ciudad": "Bogotá", "fecha_inicio": "2026-13-01",
                                                           "fecha_fin": "2026-10-03"}, {"pais": "CO"})
        self.assertEqual((estado, reporte["error"], reporte["detail"]), ("failed", "connector_input", "fecha_inicio"))

    def test_holidays(self):
        salida = self.assertCompleto("festivos_pais@1", {"anio": 2026}, {"pais": "CO"})
        self.assertEqual(salida["total"], 2)
        self.assertEqual(salida["festivos"][0], {"fecha": "2026-01-01", "dia_semana": "jueves", "nombre": "Año Nuevo"})

    def test_trm_and_exchange(self):
        trm = self.assertCompleto("trm_colombia@1", {}, {})
        self.assertEqual(trm["valor_cop_por_usd"], 3326.96)
        self.assertIn("3.326,96", trm["resumen"])
        cambio = self.assertCompleto("cambio_moneda@1", {"monto": 100, "moneda_origen": "usd", "moneda_destino": "COP"}, {})
        self.assertEqual(cambio["monto_convertido"], 390050.0)
        self.assertIn("ExchangeRate-API", cambio["fuente"])
        estado, reporte, _ = ejecutar("cambio_moneda@1", {"monto": 1, "moneda_origen": "USD", "moneda_destino": "XYZ"}, {})
        self.assertEqual(reporte["detail"], "moneda_destino")

    def test_reference_found_and_not_found(self):
        salida = self.assertCompleto("verificar_referencia@1", {"referencia": "Vaswani, A. (2017). Attention is all you need."}, {})
        self.assertTrue(salida["encontrada"])
        self.assertEqual(salida["doi"], "10.48550/arXiv.1706.03762")
        self.assertTrue(salida["cita_apa"].startswith("Vaswani, A., & Shazeer, N. (2017). Attention Is All You Need."))
        inventada = self.assertCompleto("verificar_referencia@1", {"referencia": "Pérez, J. (2021). Cocina cuántica para gatos."}, {})
        self.assertFalse(inventada["encontrada"])
        self.assertNotIn("inventada", inventada["resumen"].lower())

    def test_wrong_year_is_flagged(self):
        salida = self.assertCompleto("verificar_referencia@1", {"referencia": "Vaswani, A. (2019). Attention is all you need."}, {})
        self.assertIn("no coincide", salida["resumen"])

    def test_invalid_inputs_never_reach_provider(self):
        vistas = []
        estado, reporte, _ = run_connector(trabajo(REGISTRY["festivos_pais@1"], {"anio": "2026"}, {"pais": "CO"}),
                                           transport=transporte(vistas=vistas), resolver=PUBLICA)
        self.assertEqual((estado, reporte["error"], vistas), ("failed", "input_contract", []))

    def test_bad_provider_output_fails_contract(self):
        malo = dict(RESPUESTAS, **{"date.nager.at": {"no": "lista"}})
        estado, reporte, _ = ejecutar("festivos_pais@1", {"anio": 2026}, {"pais": "CO"}, transport=transporte(malo))
        self.assertEqual((estado, reporte["error"]), ("failed", "connector_input"))


class WorkerPathTests(unittest.TestCase):
    """Así llega un paso conector al trabajador: instantánea SQL con manifiesto, sin contract_only."""

    def snapshot(self, connector, **cambios):
        return {"status": "enabled", "publication_id": "p", "manifest": connector.manifest(),
                "artifact_hash": connector.artifact_hash, "definition_hash": connector.definition_hash,
                "profile": PROFILE} | cambios

    def definicion(self, connector):
        return {"name": "Festivos del año", "input_schema": {"type": "object", "additionalProperties": False,
                "required": ["anio"], "properties": {"anio": {"type": "integer", "minimum": 1975, "maximum": 2100}}},
                "nodes": [{"id": "festivos", "version_id": str(connector.version_id), "label": "Festivos",
                           "parameters": {"pais": "CO"}, "bindings": {"anio": {"source": "$input", "field": "anio"}}}],
                "outputs": {"resumen": {"source": "festivos", "field": "resumen"}}}

    def test_compile_accepts_registered_connector_and_rejects_tampering(self):
        connector = REGISTRY["festivos_pais@1"]
        versions = {str(connector.version_id): self.snapshot(connector)}
        _, orden = compile_workflow(self.definicion(connector), versions, {"anio": 2026})
        self.assertEqual(orden, ["festivos"])
        manifest = connector.manifest() | {"hosts": ["evil.example"]}
        with self.assertRaises(HTTPException) as contexto:
            compile_workflow(self.definicion(connector), {str(connector.version_id): self.snapshot(connector, manifest=manifest)})
        self.assertEqual(contexto.exception.status_code, 409)

    def test_workflow_with_connector_step_runs_without_sandbox(self):
        connector = REGISTRY["festivos_pais@1"]
        definicion = self.definicion(connector)
        job = {"kind": "run", "artifact_hash": "a" * 64, "workflow_revision": 1,
               "payload": {"execution_type": "workflow", "workflow_hash": "a" * 64, "revision": 1, "definition": definicion,
                           "versions": {str(connector.version_id): self.snapshot(connector)}, "inputs": {"anio": 2026}}}

        def sin_sandbox(_):
            raise AssertionError("un conector no debe usar el sandbox")

        seguro = lambda hosts, maximo, transport=None, **_: SafeHttp(hosts, maximo, transport=transporte(), resolver=PUBLICA)
        with patch.object(connector_runtime, "SafeHttp", seguro):
            estado, reporte, salida = execute_job(job, sin_sandbox)
        self.assertEqual(estado, "completed", reporte)
        self.assertEqual(reporte["steps"][0]["status"], "completed")
        self.assertTrue(salida["resumen"].startswith("CO 2026: 2 festivos."))


if __name__ == "__main__":
    unittest.main()
