"""Proveedor simulado compartido: no certifica RLS remoto."""
import json

import httpx

MIGUEL = "11111111-1111-4111-8111-111111111111"
FAHIDA = "22222222-2222-4222-8222-222222222222"
PRIVATE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
PUBLIC_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
PAYLOAD = {"name": "Limpiar datos", "description": "Elimina espacios de un texto", "input_type": "texto", "output_type": "texto"}


def record(capability_id, owner_id, visibility):
    return {
        **PAYLOAD, "id": capability_id, "owner_id": owner_id, "visibility": visibility,
        "category": "Texto", "status": "draft", "version": "1.0.0", "permissions": [],
        "adapter_key": None, "config": {}, "cloned_from": None, "uses_count": 0,
        "input_schema": {}, "output_schema": {},
        "clones_count": 0, "created_at": "2026-11-13T12:00:00Z", "updated_at": None,
    }


class SupabaseFixture:
    def __init__(self):
        self.rows = [record(PRIVATE_ID, MIGUEL, "private"), record(PUBLIC_ID, FAHIDA, "public")]
        self.requests = []
        self.fail = None

    def handle(self, request):
        self.requests.append(request)
        if self.fail:
            return httpx.Response(self.fail, json={"detail": "PRIVATE SQL SECRET"})
        identities = {"Bearer miguel-token": MIGUEL, "Bearer fahida-token": FAHIDA}
        user_id = identities.get(request.headers.get("Authorization"))
        if not user_id:
            return httpx.Response(401, json={"message": "invalid token"})
        if request.url.path == "/auth/v1/user":
            return httpx.Response(200, json={"id": user_id})
        if request.url.path == "/rest/v1/profiles":
            return httpx.Response(200, json=[{"id": user_id, "username": "miguel" if user_id == MIGUEL else "fahida", "display_name": "Nombre real", "bio": "Biografía real"}])
        if request.url.path != "/rest/v1/capabilities":
            return httpx.Response(404, json={"code": "PGRST205"})
        query = request.url.params
        if request.method == "GET":
            # No simular RLS: se devuelven incluso filas privadas para comprobar el filtro de defensa.
            rows = list(self.rows)
            for column in ("id", "owner_id", "visibility"):
                value = query.get(column)
                if value:
                    op, value = value.split(".", 1)
                    if op == "eq":
                        rows = [row for row in rows if row[column] == value]
                    elif op == "neq":
                        rows = [row for row in rows if row[column] != value]
                    elif op == "gt":
                        rows = [row for row in rows if row[column] > value]
            rows.sort(key=lambda row: row["id"])
            return httpx.Response(200, json=rows[:int(query.get("limit", "100"))])
        if request.method == "POST":
            data = json.loads(request.content)
            row = record(data["id"], user_id, "private") | data
            self.rows.append(row)
            return httpx.Response(201, json=[row])
        targets = [row for row in self.rows if f'eq.{row["id"]}' == query.get("id") and row["owner_id"] == user_id]
        if request.method == "PATCH":
            for row in targets:
                row.update(json.loads(request.content))
        elif request.method == "DELETE":
            self.rows = [row for row in self.rows if row not in targets]
        return httpx.Response(200, json=targets)
