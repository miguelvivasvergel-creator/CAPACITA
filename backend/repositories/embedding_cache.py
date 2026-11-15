"""Caché local por usuario/contenido/modelo; no guarda textos ni consultas."""
import json
from contextlib import closing
from pathlib import Path
import sqlite3
import time

DEFAULT_PATH = Path(__file__).resolve().parents[2] / 'output/search/embeddings.sqlite3'


class EmbeddingCache:
    def __init__(self, path=DEFAULT_PATH):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(self.path)) as db, db:
            db.execute('''CREATE TABLE IF NOT EXISTS embeddings (
                owner_id TEXT NOT NULL, capability_id TEXT NOT NULL, model_id TEXT NOT NULL,
                content_hash TEXT NOT NULL, vector TEXT NOT NULL, used_at REAL NOT NULL,
                PRIMARY KEY(owner_id,capability_id,model_id))''')

    def get(self, owner, identity, model, digest):
        with closing(sqlite3.connect(self.path, timeout=10)) as db:
            row = db.execute('SELECT vector FROM embeddings WHERE owner_id=? AND capability_id=? AND model_id=? AND content_hash=?',
                             (owner, identity, model, digest)).fetchone()
        if not row:
            return None
        try:
            return json.loads(row[0])
        except (ValueError, TypeError):
            return None

    def put(self, owner, identity, model, digest, vector):
        self.put_many(owner, model, [(identity, digest, vector)])

    def get_many(self, owner, model, hashes):
        if not hashes:
            return {}
        placeholders = ','.join('?' for _ in hashes)
        with closing(sqlite3.connect(self.path, timeout=10)) as db:
            rows = db.execute(f'SELECT capability_id,content_hash,vector FROM embeddings WHERE owner_id=? AND model_id=? AND capability_id IN ({placeholders})',
                              [owner, model, *hashes]).fetchall()
        result = {}
        for identity, digest, raw in rows:
            if digest == hashes.get(identity):
                try:
                    result[identity] = json.loads(raw)
                except (ValueError, TypeError):
                    pass
        return result

    def put_many(self, owner, model, rows):
        if not rows:
            return
        with closing(sqlite3.connect(self.path, timeout=10)) as db, db:
            db.executemany('INSERT INTO embeddings VALUES (?,?,?,?,?,?) ON CONFLICT(owner_id,capability_id,model_id) DO UPDATE SET content_hash=excluded.content_hash,vector=excluded.vector,used_at=excluded.used_at',
                           [(owner, identity, model, digest, json.dumps(vector, allow_nan=False), time.time()) for identity, digest, vector in rows])
            db.execute('DELETE FROM embeddings WHERE owner_id=? AND rowid NOT IN (SELECT rowid FROM embeddings WHERE owner_id=? ORDER BY used_at DESC,rowid DESC LIMIT 2000)', (owner, owner))
