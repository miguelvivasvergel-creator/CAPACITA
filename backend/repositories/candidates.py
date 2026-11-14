"""Candidatos privados e inmutables. Usa JWT de usuario y RLS, nunca service_role."""
from uuid import UUID

from fastapi import HTTPException

from repositories.capabilities import CapabilityRepository
from schemas.candidates import CandidateManifest

PATH = "/rest/v1/capability_candidates"


class CandidateRepository:
    def __init__(self, capabilities: CapabilityRepository):
        self.capabilities = capabilities

    async def _read(self, **filters):
        catalog = self.capabilities
        rows = await catalog.gateway.request(
            "GET", PATH, catalog.token,
            params={"select": "*", **filters, "owner_id": f"eq.{catalog.user_id}"},
        )
        return [row for row in rows if row.get("owner_id") == catalog.user_id]

    async def preflight(self):
        # Comprobar tabla/permisos antes de consumir cuota IA. Cero filas.
        await self._read(limit="0")

    async def create(self, manifest: CandidateManifest, model: str):
        catalog = self.capabilities
        payload = {
            "id": str(manifest.candidate_id), "owner_id": catalog.user_id,
            "capability_id": str(manifest.capability_id),
            "manifest": manifest.model_dump(mode="json"), "provider": "gemini", "model": model,
        }
        rows = await catalog.gateway.request("POST", PATH, catalog.token, json=payload)
        if not rows:
            raise HTTPException(503, "Gemini respondió, pero no se pudo guardar el candidato; no se reintentó")
        return rows[0]

    async def list(self, capability_id: UUID, cursor: UUID | None = None, limit: int = 20):
        filters = {"capability_id": f"eq.{capability_id}", "order": "id.asc", "limit": str(limit + 1)}
        if cursor:
            filters["id"] = f"gt.{cursor}"
        rows = await self._read(**filters)
        return {"items": rows[:limit], "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}

    async def get(self, candidate_id: UUID):
        rows = await self._read(id=f"eq.{candidate_id}", limit="1")
        if not rows:
            raise HTTPException(404, "Candidato no encontrado")
        row = rows[0]
        # La definición de origen también pasa por visible_to.
        source = await self.capabilities.get(UUID(row["capability_id"]))
        if source["owner_id"] != self.capabilities.user_id:
            raise HTTPException(404, "Candidato no encontrado")
        return row
