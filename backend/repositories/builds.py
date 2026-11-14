"""Cola y reportes locales privados. SQLite del host, nunca accesible al invitado.

No es almacenamiento Supabase ni evidencia resistente a un administrador del host.
API y trabajador deben usar el mismo archivo en el mismo sistema operativo.
"""
from contextlib import contextmanager
from datetime import datetime, timezone
import json
from pathlib import Path
import sqlite3
from uuid import uuid4

from fastapi import HTTPException

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "output/laboratory/builds.sqlite3"


def now():
    return datetime.now(timezone.utc).isoformat()


class BuildRepository:
    def __init__(self, path=DEFAULT_PATH):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS builds (
                id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, candidate_id TEXT NOT NULL,
                artifact_hash TEXT NOT NULL, status TEXT NOT NULL,
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                payload TEXT NOT NULL, report TEXT,
                idempotency_key TEXT NOT NULL, request_hash TEXT NOT NULL,
                UNIQUE(owner_id, idempotency_key))""")
            db.execute("CREATE INDEX IF NOT EXISTS builds_owner ON builds(owner_id,id)")

    @contextmanager
    def connection(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    @staticmethod
    def public(row):
        return {key: row[key] for key in (
            "id", "candidate_id", "artifact_hash", "status", "created_at", "updated_at"
        )} | {"report": json.loads(row["report"]) if row["report"] else None,
             "implementation_enabled": False}

    def enqueue(self, owner, manifest, cases, key, request_hash):
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            existing = db.execute("SELECT * FROM builds WHERE owner_id=? AND idempotency_key=?", (owner, key)).fetchone()
            if existing:
                if existing["request_hash"] != request_hash:
                    raise HTTPException(409, "La clave de idempotencia ya identifica otra petición")
                return self.public(existing)
            if db.execute("SELECT COUNT(*) FROM builds WHERE owner_id=? AND status IN ('queued','testing')", (owner,)).fetchone()[0] >= 3:
                raise HTTPException(429, "Ya hay tres pruebas pendientes para esta cuenta")
            if db.execute("SELECT COUNT(*) FROM builds WHERE status IN ('queued','testing')").fetchone()[0] >= 20:
                raise HTTPException(429, "La cola local está llena")
            identity, timestamp = str(uuid4()), now()
            payload = {"manifest": manifest.model_dump(mode="json"),
                       "cases": [case.model_dump(mode="json") for case in cases]}
            db.execute("INSERT INTO builds VALUES (?,?,?,?,?,?,?,?,?,?,?)", (
                identity, owner, str(manifest.candidate_id), manifest.artifact_hash, "queued",
                timestamp, timestamp, json.dumps(payload, ensure_ascii=False, allow_nan=False), None, key, request_hash))
        return self.get(owner, identity)

    def get(self, owner, identity):
        with self.connection() as db:
            row = db.execute("SELECT * FROM builds WHERE id=? AND owner_id=?", (str(identity), owner)).fetchone()
        if row is None:
            raise HTTPException(404, "Prueba no encontrada")
        return self.public(row)

    def list(self, owner, cursor=None, limit=20, candidate_id=None):
        with self.connection() as db:
            rows = db.execute("SELECT * FROM builds WHERE owner_id=? AND id>? AND (? IS NULL OR candidate_id=?) ORDER BY id LIMIT ?",
                              (owner, str(cursor or ""), str(candidate_id) if candidate_id else None,
                               str(candidate_id) if candidate_id else None, limit + 1)).fetchall()
        return {"items": [self.public(row) for row in rows[:limit]],
                "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None}

    def claim(self):
        with self.connection() as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute("SELECT * FROM builds WHERE status='queued' ORDER BY created_at,id LIMIT 1").fetchone()
            if row is None:
                return None
            db.execute("UPDATE builds SET status='testing',updated_at=? WHERE id=?", (now(), row["id"]))
        return dict(row) | {"payload": json.loads(row["payload"])}

    def finish(self, identity, status, report):
        if status not in ("passed", "failed", "interrupted"):
            raise ValueError("Estado terminal inválido")
        with self.connection() as db:
            changed = db.execute("UPDATE builds SET status=?,report=?,updated_at=? WHERE id=? AND status='testing'",
                                (status, json.dumps(report, ensure_ascii=False, allow_nan=False), now(), identity)).rowcount
            if changed != 1:
                raise RuntimeError("La prueba no estaba en testing")

    def recover_interrupted(self):
        # Solo llamar bajo el lock exclusivo del trabajador, antes de aceptar tareas.
        with self.connection() as db:
            db.execute("UPDATE builds SET status='interrupted',report=?,updated_at=? WHERE status='testing'",
                       (json.dumps({"error": "worker_interrupted", "retry_requires_new_key": True}), now()))
