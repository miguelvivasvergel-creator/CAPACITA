# backend/core/visibility.py
"""
Regla de privacidad: un usuario solo ve lo público o lo suyo.

El filtro se aplica en origen para PostgREST y también a los resultados.
"""


def visible_to(items: list[dict] | None, user_id: str) -> list[dict] | dict[str, str]:
    """Filtra capacidades o workflows que el usuario puede ver."""
    if items is None:
        from uuid import UUID

        return {"or": f"(visibility.eq.public,owner_id.eq.{UUID(user_id)})"}
    return [
        item for item in items
        if item["visibility"] == "public" or item["owner_id"] == user_id
    ]
