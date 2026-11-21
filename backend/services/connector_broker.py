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
import time
from urllib.parse import urlsplit

import httpx

USER_AGENT = "Capacita/0.1 (conector)"


def agente():
    """User-Agent con el contacto público del responsable si está configurado (lo piden Wikipedia y otros)."""
    try:
        from core.config import settings
        contacto = settings.CONECTORES_CONTACTO
    except Exception:  # configuración no disponible (por ejemplo, en pruebas aisladas)
        contacto = ""
    return f"Capacita/0.1 (conector; {contacto})" if contacto else USER_AGENT
TIMEOUT_SECONDS = 45  # Crossref tarda a veces más de 12 s; la IA con una foto, hasta ~40 s
MAX_RESPONSE_BYTES = 1_048_576
MAX_REQUEST_BYTES = 6_000_000  # una foto de ~2,8 MB en base64 más instrucciones
TOKEN_EN_RUTA = "@ruta"  # modo de credencial: el token va en la ruta (Telegram), no en una cabecera


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


ESPERAS = (1.5, 4.0)  # segundos antes del 2.º y 3.er intento
SIN_EFECTOS = {"generativelanguage.googleapis.com"}  # POST sin efectos fuera: se puede repetir
# Tope de toda la petición con sus reintentos: tras un tiempo agotado (45 s) cabe a lo sumo uno más,
# para que una consulta lenta no deje a la persona esperando minutos.
ESPERA_TOTAL = 50
FALLAS = {401: "provider_rejected", 403: "provider_rejected", 404: "not_found",
          429: "provider_busy",  # límite de frecuencia del proveedor
          400: "provider_rejected", 422: "provider_rejected"}


def _espera(cabecera, normal):
    """Respeta Retry-After si el proveedor pide esperar poco (hasta 10 s); si no, la pausa normal."""
    try:
        return min(max(float(cabecera), 0.5), 10.0) if cabecera else normal
    except ValueError:
        return normal


class SafeHttp:
    """auth: (host, cabecera, valor) de la clave del sistema; solo viaja a ese host exacto."""

    def __init__(self, hosts, max_requests, transport=None, resolver=socket.getaddrinfo, auth=None, sleep=time.sleep,
                 clock=time.monotonic):
        self.hosts, self.remaining = frozenset(hosts), max_requests
        self.transport, self.resolver, self.sleep, self.clock = transport, resolver, sleep, clock
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

    def post_bytes(self, url, contenido, tipo):
        """Cuerpo binario con su tipo (por ejemplo multipart/related para subir a Drive)."""
        if not isinstance(contenido, (bytes, bytearray)) or len(contenido) > MAX_REQUEST_BYTES:
            raise ConnectorFailure("invalid_request")
        return self._request("POST", url, content=bytes(contenido), content_type=tipo)

    def post_form(self, url, data, files=None):
        """Formulario multipart (por ejemplo, un documento para Telegram). files: {campo: (nombre, bytes, tipo)}."""
        tamano = sum(len(str(valor)) for valor in data.values()) + sum(len(f[1]) for f in (files or {}).values())
        if tamano > MAX_REQUEST_BYTES:
            raise ConnectorFailure("invalid_request")
        return self._request("POST", url, data=data, files=files)

    def _request(self, method, url, params=None, content=None, data=None, files=None, content_type="application/json"):
        parts = urlsplit(url)
        if parts.scheme != "https" or parts.hostname not in self.hosts or parts.port not in (None, 443) \
                or parts.username or parts.password or parts.fragment:
            raise ConnectorFailure("host_not_allowed")
        if self.remaining <= 0:
            raise ConnectorFailure("request_limit")
        self.remaining -= 1
        self.calls += 1
        public_host(parts.hostname, self.resolver)
        headers = {"User-Agent": agente(), "Accept": "application/json"}
        if content is not None:
            headers["Content-Type"] = content_type
        # La credencial vale para un host o para varios (Google usa gmail.googleapis.com y www.googleapis.com).
        hosts_auth = self._auth[0] if self._auth and isinstance(self._auth[0], (tuple, list, frozenset, set)) else \
            ((self._auth[0],) if self._auth else ())
        if self._auth and parts.hostname in hosts_auth:
            if self._auth[1] == TOKEN_EN_RUTA:
                # Telegram lleva el token en la ruta: el conector escribe «/bot/…» y aquí se completa.
                base = f"https://{parts.hostname}/bot/"
                if not url.startswith(base):
                    raise ConnectorFailure("invalid_request")
                url = f"https://{parts.hostname}/bot{self._auth[2]}/" + url[len(base):]
            else:
                headers[self._auth[1]] = self._auth[2]
        # Reintentos de lo pasajero (antes una sola respuesta «ocupado» de Open-Meteo, OpenStreetMap o
        # Gemini tumbaba toda la solución). Sin duplicar envíos: en un envío solo se repite el 429 (el
        # proveedor pide esperar y no hizo nada) y no poder conectar; 5xx y tiempo agotado solo en
        # lecturas (GET) o en la IA, que no tiene efectos fuera (un 503 de Gmail no garantiza que no
        # saliera). Todo con un tope de ESPERA_TOTAL. No gastan el tope de peticiones del conector.
        lectura = method == "GET" or parts.hostname in SIN_EFECTOS
        inicio = self.clock()
        for intento in range(len(ESPERAS) + 1):
            pausa_normal = ESPERAS[min(intento, len(ESPERAS) - 1)]
            espera, falla = None, None
            try:
                with httpx.Client(transport=self.transport, timeout=TIMEOUT_SECONDS, follow_redirects=False,
                                  headers=headers) as client:
                    with client.stream(method, url, params=params, content=content, data=data, files=files) as response:
                        codigo = response.status_code
                        if codigo == 200:
                            cuerpo = bytearray()
                            for chunk in response.iter_bytes():
                                cuerpo.extend(chunk)
                                if len(cuerpo) > MAX_RESPONSE_BYTES:
                                    raise ConnectorFailure("invalid_response")
                        else:
                            falla = FALLAS.get(codigo, "provider_unavailable")
                            if codigo == 429 or (lectura and codigo in (500, 502, 503, 504)):
                                espera = _espera(response.headers.get("Retry-After"), pausa_normal)
            except (httpx.ConnectError, httpx.ConnectTimeout, httpx.PoolTimeout):
                falla, espera = "provider_unavailable", pausa_normal
            except httpx.TimeoutException:
                falla, espera = "provider_unavailable", (pausa_normal if lectura else None)
            except httpx.HTTPError:
                raise ConnectorFailure("provider_unavailable") from None
            if falla is None:
                break
            # Sin más intentos, sin permiso para repetir o sin tiempo: se informa la falla de este intento.
            if espera is None or intento >= len(ESPERAS) or self.clock() - inicio + espera > ESPERA_TOTAL:
                raise ConnectorFailure(falla)
            self.sleep(espera)
        try:
            return json.loads(bytes(cuerpo), parse_constant=_reject_constant)
        except (ValueError, RecursionError):
            raise ConnectorFailure("invalid_response") from None
