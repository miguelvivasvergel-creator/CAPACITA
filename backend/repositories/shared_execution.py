"""RPC acotadas con JWT de usuario; sin credenciales administrativas."""
from uuid import UUID

from fastapi import HTTPException
from core.config import settings


class SharedExecutionRepository:
    def __init__(self, catalog):
        self.catalog = catalog

    async def rpc(self, name, **payload):
        return await self.catalog.gateway.request(
            "POST", f"/rest/v1/rpc/execution_{name}", self.catalog.token, json=payload,
        )

    async def enqueue(self, owner, manifest, cases, key, request_hash):
        return await self.rpc("enqueue", p_kind="build", p_key=key,
                              p_request={"candidate_id": str(manifest.candidate_id),
                                         "manifest": manifest.model_dump(mode="json"),
                                         "cases": [case.model_dump(mode="json") for case in cases]})

    async def get(self, owner, identity):
        return await self.rpc("get", p_kind="build", p_id=str(identity))

    async def list(self, owner, cursor=None, limit=20, candidate_id=None):
        return await self.rpc("list", p_kind="build", p_cursor=str(cursor) if cursor else None,
                              p_limit=limit, p_candidate_id=str(candidate_id) if candidate_id else None)

    async def versions(self, candidate_id=None, identity=None):
        return await self.rpc("versions", p_candidate_id=str(candidate_id) if candidate_id else None,
                              p_id=str(identity) if identity else None)

    async def version_for_execution(self, identity):
        # El RPC no devuelve el código. El catálogo original usa visible_to.
        data = await self.versions(identity=identity)
        if not data["items"]:
            if not settings.PUBLICATIONS_ENABLED:
                raise HTTPException(404, "Versión no encontrada")
            data = await self.rpc('publication_versions', p_version=str(identity))
            if not data['items']:
                raise HTTPException(404, 'Versión no encontrada')
        version = data["items"][0]
        await self.catalog.get(UUID(version["capability_id"]))
        if version["status"] != "enabled":
            raise HTTPException(409, "La versión está deshabilitada")
        return version
