"""Registro de conectores revisados. Agregar uno: escribir su módulo, sumarlo aquí, probarlo en
tests/test_connectors.py y regenerar db/15 con scripts/connectors/generate_seed_sql.py."""
from connectors.academico import REFERENCIA
from connectors.base import PROFILE, Connector, ConnectorInputError
from connectors.calendario import FESTIVOS
from connectors.clima import HISTORICO, PRONOSTICO
from connectors.dinero import CAMBIO, TRM_COLOMBIA
from connectors.ia import IA
from connectors.telegram import ENVIAR as ENVIAR_TELEGRAM

# Versión 1 (aplicada en Supabase): sigue en el registro para las soluciones ya guardadas con ella.
# Versión 2: mismas reglas, pero sus entradas aceptan la salida de otros pasos (ver componible).
PRIMERA_VERSION = [PRONOSTICO, HISTORICO, FESTIVOS, TRM_COLOMBIA, CAMBIO, REFERENCIA]
CONNECTORS: list[Connector] = [*PRIMERA_VERSION, *IA, *(connector.componible(2) for connector in PRIMERA_VERSION),
                               ENVIAR_TELEGRAM]
REGISTRY: dict[str, Connector] = {connector.connector_key: connector for connector in CONNECTORS}
BY_VERSION: dict[str, Connector] = {str(connector.version_id): connector for connector in CONNECTORS}
assert len(REGISTRY) == len(CONNECTORS) == len(BY_VERSION), "connector_key repetido"


def sending_content(version_ids):
    """Conectores (de esas versiones) que envían el contenido de la persona a un tercero."""
    return [BY_VERSION[str(identity)] for identity in version_ids
            if str(identity) in BY_VERSION and BY_VERSION[str(identity)].sends_content]


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


__all__ = ["CONNECTORS", "REGISTRY", "BY_VERSION", "PROFILE", "Connector", "ConnectorInputError", "from_manifest",
           "sending_content"]
