"""Workflow privado: RLS/RPC en origen y visible_to también en resultados."""
from fastapi import HTTPException

from core.visibility import visible_to
from repositories.shared_execution import SharedExecutionRepository


class WorkflowRepository(SharedExecutionRepository):
    async def get(self, identity):
        row = await self.rpc("workflow_get", p_id=str(identity))
        rows = visible_to([row], self.catalog.user_id)
        if not rows or rows[0]["owner_id"] != self.catalog.user_id or row["archived"]:
            raise HTTPException(404, "Proceso no encontrado")
        return rows[0]

    async def listing(self, cursor=None, limit=20):
        page = await self.rpc("workflow_list", p_cursor=str(cursor) if cursor else None, p_limit=limit)
        page["items"] = [row for row in visible_to(page["items"], self.catalog.user_id)
                         if row["owner_id"] == self.catalog.user_id and not row["archived"]]
        return page
