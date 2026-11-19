"""Registro de conectores revisados. Agregar uno: escribir su módulo, sumarlo aquí, probarlo en
tests/test_connectors.py y regenerar db/15 con scripts/connectors/generate_seed_sql.py."""
from connectors.academico import REFERENCIA
from connectors.base import PROFILE, Connector, ConnectorInputError
from connectors.calendario import FESTIVOS
from connectors.clima import HISTORICO, PRONOSTICO
from connectors.dinero import CAMBIO, TRM_COLOMBIA

CONNECTORS: list[Connector] = [PRONOSTICO, HISTORICO, FESTIVOS, TRM_COLOMBIA, CAMBIO, REFERENCIA]
REGISTRY: dict[str, Connector] = {connector.connector_key: connector for connector in CONNECTORS}
assert len(REGISTRY) == len(CONNECTORS), "connector_key repetido"


def from_manifest(manifest, artifact_hash=None):
    """El conector revisado que corresponde a un manifiesto guardado, o None si no coincide."""
    if not isinstance(manifest, dict) or manifest.get("kind") != "connector":
        return None
    connector = REGISTRY.get(manifest.get("connector_key"))
    if connector is None or manifest != connector.manifest():
        return None
    if artifact_hash is not None and artifact_hash != connector.artifact_hash:
        return None
    return connector


__all__ = ["CONNECTORS", "REGISTRY", "PROFILE", "Connector", "ConnectorInputError", "from_manifest"]
