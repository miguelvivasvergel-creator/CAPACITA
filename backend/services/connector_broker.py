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
TIMEOUT_SECONDS = 45  # Crossref tarda a veces más de 12 s; la IA con una foto, hasta ~40 s
MAX_RESPONSE_BYTES = 1_048_576
MAX_REQUEST_BYTES = 6_000_000  # una foto de ~2,8 MB en base64 más instrucciones


class ConnectorFailure(Exception):
    """code es uno de: provider_unavailable, provider_rejected, invalid_response, host_not_allowed,
    request_limit, not_found, provider_busy, invalid_request."""

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
    """auth: (host, cabecera, valor) de la clave del sistema; solo viaja a ese host exacto."""

    def __init__(self, hosts, max_requests, transport=None, resolver=socket.getaddrinfo, auth=None):
        self.hosts, self.remaining = frozenset(hosts), max_requests
        self.transport, self.resolver = transport, resolver
        self._auth = auth
        self.calls = 0

    def get_json(self, url, params=None):
        return self._request("GET", url, params=params)

    def post_json(self, url, body):
        try:
            contenido = json.dumps(body, ensure_ascii=False, allow_nan=False).encode()
        except (ValueError, TypeError, RecursionError):
            raise ConnectorFailure("invalid_request") from None
        if len(contenido) > MAX_REQUEST_BYTES:
            raise ConnectorFailure("invalid_request")
        return self._request("POST", url, content=contenido)

    def _request(self, method, url, params=None, content=None):
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.hostname not in self.hosts or parts.port not in (None, 443) \
                or parts.username or parts.password or parts.fragment:
            raise ConnectorFailure("host_not_allowed")
        if self.remaining <= 0:
            raise ConnectorFailure("request_limit")
        self.remaining -= 1
        self.calls += 1
        public_host(parts.hostname, self.resolver)
        headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
        if content is not None:
            headers["Content-Type"] = "application/json"
        if self._auth and parts.hostname == self._auth[0]:
            headers[self._auth[1]] = self._auth[2]
        try:
            with httpx.Client(transport=self.transport, timeout=TIMEOUT_SECONDS, follow_redirects=False,
                              headers=headers) as client:
                with client.stream(method, url, params=params, content=content) as response:
                    if response.status_code in (401, 403):
                        raise ConnectorFailure("provider_rejected")
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
