"""Conectores: pasos del taller que consultan un servicio externo ya revisado.

A diferencia de las herramientas fabricadas por la IA, un conector es código escrito y revisado
por el equipo. No corre en el sandbox: lo ejecuta el trabajador mediante el broker
(services/connector_broker.py), que solo habla con los hosts declarados aquí. El código generado
nunca recibe red ni credenciales.

La base de datos solo guarda un puntero (connector_key + hashes). El trabajador vuelve a
calcular el manifiesto desde este registro y rechaza cualquier diferencia: lo que se ejecuta es
siempre lo que está revisado en el repositorio.
"""
import copy
import hashlib
import json
from typing import Any, Callable
from uuid import UUID, uuid5

PROFILE = "connector-v1"
# Espacio fijo para que capacidad y versión de cada conector tengan siempre el mismo id.
NAMESPACE = UUID("6f1c2d7e-5b8a-4c3e-9d21-0c4a7b9e3f10")


class ConnectorInputError(ValueError):
    """Datos de la persona que el conector no puede usar (ciudad inexistente, fecha inválida…)."""


def canonical(value) -> str:
    return json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":"))


def sha256(value) -> str:
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


class Connector:
    """key + version identifican el conector publicado. Subir version cuando cambie algo del
    manifiesto (contratos, nombre, descripción, hosts, proveedor): los hashes guardados dejan de
    coincidir. Mejoras internas que respetan los mismos contratos (por ejemplo, la redacción del
    resumen) no lo exigen."""

    def __init__(self, *, key: str, version: int, provider: str, provider_url: str, hosts: list[str],
                 name: str, description: str, category: str, input_type: str, output_type: str,
                 input_schema: dict, parameter_schema: dict, output_schema: dict,
                 example_inputs: dict, example_parameters: dict, constraints: list[str],
                 run: Callable[[Any, dict, dict], dict], max_requests: int = 3,
                 credential: str | None = None, sends_content: bool = False, needs: tuple = ()):
        self.key, self.version = key, version
        self.provider, self.provider_url, self.hosts = provider, provider_url, sorted(hosts)
        self.max_requests = max_requests
        # credential: nombre de la clave del sistema que el broker añade (el código del conector
        # nunca la lee). sends_content: envía el contenido de la persona (texto, fotos) a un
        # tercero; exige un «Acepto» explícito al aprobar el proceso.
        self.credential, self.sends_content = credential, sends_content
        # needs: datos del contexto del trabajo que pone el trabajador (por ejemplo, el chat de
        # Telegram del dueño). No entra al manifiesto y nunca viene de la persona ni de otro paso.
        self.needs = tuple(needs)
        self._run = run
        self.definition = {
            "name": name, "description": description, "category": category,
            "input_type": input_type, "output_type": output_type,
            "input_schema": input_schema, "parameter_schema": parameter_schema, "output_schema": output_schema,
            "constraints": constraints, "required_permissions": [], "resources": [],
            "examples": [{"inputs": example_inputs, "parameters": example_parameters}],
        }

    @property
    def connector_key(self) -> str:
        return f"{self.key}@{self.version}"

    @property
    def capability_id(self) -> UUID:
        return uuid5(NAMESPACE, f"capability:{self.key}")

    @property
    def version_id(self) -> UUID:
        return uuid5(NAMESPACE, f"version:{self.connector_key}")

    @property
    def definition_hash(self) -> str:
        return sha256(self.definition)

    def manifest(self) -> dict:
        manifest = {"format_version": 1, "kind": "connector", "connector_key": self.connector_key,
                    "provider": self.provider, "provider_url": self.provider_url, "hosts": self.hosts,
                    "definition_hash": self.definition_hash, "definition": self.definition}
        # Solo si existen: los conectores ya publicados conservan exactamente su manifiesto y hash.
        if self.credential:
            manifest["credential"] = self.credential
        if self.sends_content:
            manifest["sends_content"] = True
        return manifest

    @property
    def artifact_hash(self) -> str:
        return sha256(self.manifest())

    def run(self, http, inputs: dict, parameters: dict, context: dict | None = None) -> dict:
        if self.needs:
            return self._run(http, inputs, parameters, {clave: (context or {}).get(clave) for clave in self.needs})
        return self._run(http, inputs, parameters)

    def componible(self, version):
        """Misma lógica en una versión nueva cuyas entradas no tienen límites de largo ni de rango.

        El validador de conexiones solo une puertos con límites demostrablemente compatibles; una
        entrada con minLength/maximum no puede recibir la salida de otro paso que no los declare.
        El conector sigue validando esos límites en su código.
        """
        nuevo = copy.copy(self)
        nuevo.version = version
        nuevo.definition = copy.deepcopy(self.definition)
        for spec in nuevo.definition["input_schema"].get("properties", {}).values():
            for limite in LIMITES:
                spec.pop(limite, None)
        return nuevo


LIMITES = ("minLength", "maxLength", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum")
