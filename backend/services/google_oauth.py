"""OAuth de Google (fase 6): conectar la cuenta de cada persona sin que el código generado vea nada.

Flujo web con PKCE: la API arma el enlace, Google vuelve al callback, el navegador de la persona
(con su sesión) entrega código + state, y aquí se cambia por tokens. Solo se guarda el token de
actualización, CIFRADO con Fernet (GOOGLE_TOKEN_KEY); el de acceso se pide al momento de ejecutar.
Errores: códigos fijos, nunca el contenido de un token ni la respuesta de Google.
"""
import base64
import hashlib
import secrets
from urllib.parse import urlencode

import httpx
from cryptography.fernet import Fernet, InvalidToken

from core.config import settings

AUTH = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN = "https://oauth2.googleapis.com/token"
REVOKE = "https://oauth2.googleapis.com/revoke"
USERINFO = "https://openidconnect.googleapis.com/v1/userinfo"
# Permisos mínimos: enviar correo (solo a uno mismo, lo limita el conector), archivos que crea
# Capacita en Drive (no ve los demás) y crear eventos en el calendario.
SCOPES = ["openid", "email", "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/calendar.events"]


class GoogleError(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def disponible():
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET.get_secret_value()
                and settings.GOOGLE_TOKEN_KEY.get_secret_value())


def _fernet():
    try:
        return Fernet(settings.GOOGLE_TOKEN_KEY.get_secret_value().encode())
    except (ValueError, TypeError):
        raise GoogleError("google_key_invalid") from None


def cifrar(texto):
    return _fernet().encrypt(texto.encode()).decode()


def descifrar(texto):
    try:
        return _fernet().decrypt(str(texto).encode()).decode()
    except (InvalidToken, ValueError, TypeError):
        raise GoogleError("google_token_invalid") from None


def nuevo_inicio():
    """state y verificador PKCE aleatorios (URL-safe) y el enlace de Google para iniciar sesión."""
    state = secrets.token_urlsafe(32)
    verifier = secrets.token_urlsafe(48)
    reto = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")
    url = AUTH + "?" + urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID, "redirect_uri": settings.GOOGLE_REDIRECT_URI, "response_type": "code",
        "scope": " ".join(SCOPES), "state": state, "code_challenge": reto, "code_challenge_method": "S256",
        "access_type": "offline", "prompt": "consent", "include_granted_scopes": "true"})
    return state, verifier, url


def _post(url, data, transport=None):
    try:
        with httpx.Client(transport=transport, timeout=20, follow_redirects=False) as client:
            respuesta = client.post(url, data=data, headers={"Accept": "application/json"})
        cuerpo = respuesta.json() if respuesta.content else {}
    except (httpx.HTTPError, ValueError):
        raise GoogleError("google_unavailable") from None
    if respuesta.status_code != 200 or not isinstance(cuerpo, dict):
        raise GoogleError("google_rejected")
    return cuerpo


def canjear_codigo(code, verifier, transport=None):
    """Código + verificador → (token de actualización, correo, permisos concedidos)."""
    datos = _post(TOKEN, {"code": code, "client_id": settings.GOOGLE_CLIENT_ID,
                          "client_secret": settings.GOOGLE_CLIENT_SECRET.get_secret_value(),
                          "redirect_uri": settings.GOOGLE_REDIRECT_URI, "grant_type": "authorization_code",
                          "code_verifier": verifier}, transport)
    refresh, acceso = datos.get("refresh_token"), datos.get("access_token")
    if not refresh or not acceso:
        raise GoogleError("google_no_refresh")
    try:
        with httpx.Client(transport=transport, timeout=15, follow_redirects=False) as client:
            info = client.get(USERINFO, headers={"Authorization": f"Bearer {acceso}"}).json()
    except (httpx.HTTPError, ValueError):
        raise GoogleError("google_unavailable") from None
    email = str((info or {}).get("email") or "")
    if "@" not in email or not (info or {}).get("email_verified", True):
        raise GoogleError("google_no_email")
    return refresh, email, str(datos.get("scope") or "")


def token_de_acceso(refresh, transport=None):
    datos = _post(TOKEN, {"refresh_token": refresh, "client_id": settings.GOOGLE_CLIENT_ID,
                          "client_secret": settings.GOOGLE_CLIENT_SECRET.get_secret_value(),
                          "grant_type": "refresh_token"}, transport)
    if not datos.get("access_token"):
        raise GoogleError("google_rejected")
    return datos["access_token"]


def revocar(refresh, transport=None):
    """Al desconectar: Google invalida el permiso. Si falla, igual se borró de Capacita."""
    try:
        _post(REVOKE, {"token": refresh}, transport)
        return True
    except GoogleError:
        return False
