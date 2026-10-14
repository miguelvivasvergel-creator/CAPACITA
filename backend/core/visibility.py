# backend/core/visibility.py
"""
Regla de privacidad: un usuario solo ve lo público o lo suyo.

TEMPORAL: Luis Miguel la conecta con las consultas reales a Supabase.
La firma visible_to(...) se mantiene, así que quien la usa no cambia.
"""


def visible_to(items: list[dict], user_id: str) -> list[dict]:
    """Filtra capacidades o workflows que el usuario puede ver."""
    return [
        item for item in items
        if item["visibility"] == "public" or item["owner_id"] == user_id
    ]
