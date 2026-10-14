# backend/core/auth.py
"""
Usuario actual de la petición.

TEMPORAL: Luis Miguel reemplaza esta función por la validación real del token
de Supabase (Authorization: Bearer <token>). Mientras tanto devuelve un usuario
de prueba para que los módulos puedan avanzar sin bloquearse.
Las rutas ya dependen de get_current_user, así que el cambio no las afecta.
"""
from repositories.memoria import PERFILES

USUARIO_DEMO_ID = "usr-demo-3"


def get_current_user() -> dict:
    """Devuelve el perfil del usuario que hace la petición."""
    return next(perfil for perfil in PERFILES if perfil["id"] == USUARIO_DEMO_ID)
