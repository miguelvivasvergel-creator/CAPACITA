"""Pruebas del backend de Capacita."""
# Los reintentos del broker esperan segundos de verdad; en las pruebas no hace falta esperar
# (test_connectors.ReintentosTests comprueba cuántas veces y cuánto pediría esperar).
import services.connector_broker as _broker

_broker.ESPERAS = (0, 0)
