"""Cliente HTTP acotado para conectores. Corre en el trabajador, nunca dentro del sandbox.

Reglas (todas obligatorias):
- solo https y solo los hosts que declara el conector (nada que venga de la persona);
- el host debe resolver a IP pública (defensa adicional contra SSRF / redes internas);
- sin redirecciones, sin cookies, sin credenciales, tiempo y tamaño máximos;
- un número máximo de peticiones por ejecución.
Los errores son códigos fijos: nunca incluyen la respuesta del proveedor ni datos de la persona.
"""
import ipaddress
import json
import socket
from urllib.parse import urlsplit

import httpx

USER_AGENT = "Capacita/0.1 (conector)"
TIMEOUT_SECONDS = 20  # Crossref a veces tarda más de 12 s
MAX_RESPONSE_BYTES = 1_048_576


class ConnectorFailure(Exception):
    """code es uno de: provider_unavailable, provider_rejected, invalid_response, host_not_allowed,
    request_limit, not_found, provider_busy."""

    def __init__(self, code):
        super().__init__(code)
        self.code = code


def public_host(host, resolver=socket.getaddrinfo):
    try:
        addresses = {info[4][0] for info in resolver(host, 443, type=socket.SOCK_STREAM)}
    except OSError:
        raise ConnectorFailure("provider_unavailable") from None
    if not addresses or not all(ipaddress.ip_address(address.split("%")[0]).is_global for address in addresses):
        raise ConnectorFailure("host_not_allowed")


def _reject_constant(_):
    raise ValueError("nonfinite_json")


class SafeHttp:
    def __init__(self, hosts, max_requests, transport=None, resolver=socket.getaddrinfo):
        self.hosts, self.remaining = frozenset(hosts), max_requests
        self.transport, self.resolver = transport, resolver
        self.calls = 0

    def get_json(self, url, params=None):
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.hostname not in self.hosts or parts.port not in (None, 443) \
                or parts.username or parts.password or parts.fragment:
            raise ConnectorFailure("host_not_allowed")
        if self.remaining <= 0:
            raise ConnectorFailure("request_limit")
        self.remaining -= 1
        self.calls += 1
        public_host(parts.hostname, self.resolver)
        try:
            with httpx.Client(transport=self.transport, timeout=TIMEOUT_SECONDS, follow_redirects=False,
                              headers={"User-Agent": USER_AGENT, "Accept": "application/json"}) as client:
                with client.stream("GET", url, params=params) as response:
                    if response.status_code == 404:
                        raise ConnectorFailure("not_found")
                    if response.status_code == 429:
                        raise ConnectorFailure("provider_busy")  # límite de frecuencia del proveedor
                    if response.status_code in (400, 422):
                        raise ConnectorFailure("provider_rejected")
                    if response.status_code != 200:
                        raise ConnectorFailure("provider_unavailable")
                    data = bytearray()
                    for chunk in response.iter_bytes():
                        data.extend(chunk)
                        if len(data) > MAX_RESPONSE_BYTES:
                            raise ConnectorFailure("invalid_response")
        except httpx.HTTPError:
            raise ConnectorFailure("provider_unavailable") from None
        try:
            return json.loads(bytes(data), parse_constant=_reject_constant)
        except (ValueError, RecursionError):
            raise ConnectorFailure("invalid_response") from None
