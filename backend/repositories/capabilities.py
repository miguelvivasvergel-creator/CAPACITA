"""Catálogo persistente sobre la tabla existente; nunca utiliza service_role."""
from datetime import datetime, timezone
from uuid import UUID, uuid4

from fastapi import HTTPException

from core.supabase import SupabaseGateway
from core.visibility import visible_to

SELECT = "*,owner:profiles!capabilities_owner_id_fkey(username)"


class CapabilityRepository:
    def __init__(self, gateway: SupabaseGateway, token: str, user_id: str):
        self.gateway, self.token, self.user_id = gateway, token, user_id

    async def _read(self, filters=None) -> list[dict]:
        params = {"select": SELECT, **visible_to(None, self.user_id), **(filters or {})}
        rows = await self.gateway.request("GET", "/rest/v1/capabilities", self.token, params=params)
        return [self._normalize(row) for row in visible_to(rows, self.user_id)]

    @staticmethod
    def _normalize(row: dict) -> dict:
        row = dict(row)
        # El catálogo histórico admite NULL; la API presenta una etiqueta sin alterar la BD.
        if row.get("category") is None:
            row["category"] = "Sin categoría"
        owner = row.pop("owner", None) or {}
        row["owner_username"] = owner.get("username")
        return row

    async def list(self, *, scope="available", q=None, data_type=None, owner=None, category=None, cursor=None, limit=20):
        filters = {"order": "id.asc", "limit": str(limit + 1)}
        if scope == "mine":
            filters["owner_id"] = f"eq.{self.user_id}"
        elif scope == "community":
            filters.update({"owner_id": f"neq.{self.user_id}", "visibility": "eq.public"})
        conditions = []
        if q:
            # Quoted PostgREST values prevent punctuation from becoming filter syntax.
            term = q.replace("\\", "\\\\").replace('"', '\\"').replace("%", "\\%").replace("_", "\\_").replace("*", "\\*")
            conditions.append(f'or(name.ilike."%{term}%",description.ilike."%{term}%")')
        if data_type:
            conditions.append(f"or(input_type.eq.{data_type},output_type.eq.{data_type})")
        if category:
            filters["category"] = f"eq.{category}"
        if owner:
            filters["select"] = "*,owner:profiles!capabilities_owner_id_fkey!inner(username)"
            filters["owner.username"] = f'eq.{owner}'
        if cursor:
            filters["id"] = f"gt.{UUID(str(cursor))}"
        if conditions:
            filters["and"] = "(" + ",".join(conditions) + ")"
        rows = await self._read(filters)
        return {"items": rows[:limit], "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}

    async def visible_ids(self, capability_ids) -> set[str]:
        """Cuáles de esas capacidades ve el usuario, en una sola consulta (pasa por visible_to)."""
        ids = sorted({str(UUID(str(identity))) for identity in capability_ids})
        visible = set()
        # Lotes de 100 para no alargar demasiado la URL de PostgREST.
        for start in range(0, len(ids), 100):
            chunk = ids[start:start + 100]
            rows = await self._read({"id": f"in.({','.join(chunk)})", "select": "id,owner_id,visibility",
                                     "limit": str(len(chunk))})
            visible.update(str(row["id"]) for row in rows)
        return visible

    async def get(self, capability_id: UUID) -> dict:
        rows = await self._read({"id": f"eq.{capability_id}", "limit": "1"})
        if not rows:
            raise HTTPException(404, "Capacidad no encontrada")
        return rows[0]

    async def create(self, payload: dict, *, cloned_from=None) -> dict:
        data = {**payload, "id": str(uuid4()), "owner_id": self.user_id, "cloned_from": cloned_from}
        rows = await self.gateway.request("POST", "/rest/v1/capabilities", self.token, json=data)
        if not rows:
            raise HTTPException(503, "No se pudo guardar la capacidad")
        return self._normalize(rows[0])

    async def update(self, capability_id: UUID, changes: dict) -> dict:
        await self._owned(capability_id)
        rows = await self.gateway.request(
            "PATCH", "/rest/v1/capabilities", self.token,
            params={"id": f"eq.{capability_id}", "owner_id": f"eq.{self.user_id}"},
            json={**changes, "updated_at": datetime.now(timezone.utc).isoformat()},
        )
        if not rows:
            raise HTTPException(404, "Capacidad no encontrada")
        return self._normalize(rows[0])

    async def delete(self, capability_id: UUID):
        await self._owned(capability_id)
        rows = await self.gateway.request(
            "DELETE", "/rest/v1/capabilities", self.token,
            params={"id": f"eq.{capability_id}", "owner_id": f"eq.{self.user_id}"},
        )
        if not rows:
            raise HTTPException(404, "Capacidad no encontrada")

    async def _owned(self, capability_id: UUID):
        item = await self.get(capability_id)
        if item["owner_id"] != self.user_id:
            raise HTTPException(404, "Capacidad no encontrada")
