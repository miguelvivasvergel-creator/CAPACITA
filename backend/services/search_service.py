"""Búsqueda autorizada. Semántica local acotada, sin enviar catálogo a terceros."""
import asyncio
import base64
import hashlib
import json
import math
import threading
from uuid import UUID

from fastapi import HTTPException

from providers.local_embeddings import local_embeddings
from repositories.embedding_cache import EmbeddingCache
from repositories.profiles import ProfileRepository, FIELDS

POOL_LIMIT = 200
EMPTY = {'items': [], 'next_cursor': None}
admission = threading.Lock()


def catalog_filters(request):
    return {'category': request.category, 'owner': request.owner, 'data_type': request.data_type}


def descriptor(row):
    return '\n'.join(str(row.get(key) or '') for key in ('name', 'description', 'category'))


def digest(row):
    return hashlib.sha256(descriptor(row).encode()).hexdigest()


def normalized(raw, dimension):
    if not isinstance(raw, list) or len(raw) != dimension:
        return None
    if not all(type(value) in (int, float) and math.isfinite(value) for value in raw):
        return None
    norm = math.sqrt(sum(value * value for value in raw))
    return [value / norm for value in raw] if norm > 1e-12 else None


def rank(query, rows, owner, encoder, cache):
    if not admission.acquire(blocking=False):
        raise HTTPException(429, 'Hay una búsqueda semántica en curso. Vuelve a intentarlo.')
    try:
        missing, vectors = [], {}
        hashes = {row['id']: digest(row) for row in rows}
        stored = cache.get_many(owner, encoder.model_id, hashes)
        for row in rows:
            vector = normalized(stored.get(row['id']), encoder.dimension)
            if vector is None:
                missing.append(row)
            else:
                vectors[row['id']] = vector
        if missing:
            encoded = encoder.encode([descriptor(row) for row in missing])
            if len(encoded) != len(missing):
                raise HTTPException(503, 'El modelo local devolvió vectores inválidos')
            updates = []
            for row, raw in zip(missing, encoded):
                vector = normalized(raw, encoder.dimension)
                if vector is None:
                    raise HTTPException(503, 'El modelo local devolvió vectores inválidos')
                vectors[row['id']] = vector
                updates.append((row['id'], hashes[row['id']], vector))
            cache.put_many(owner, encoder.model_id, updates)
        encoded_query = encoder.encode([query], query=True)
        query_vector = normalized(encoded_query[0], encoder.dimension) if len(encoded_query) == 1 else None
        if query_vector is None:
            raise HTTPException(503, 'El modelo local devolvió vectores inválidos')
        ranked = [{**row, 'similarity': sum(a * b for a, b in zip(query_vector, vectors[row['id']]))} for row in rows]
        return sorted(ranked, key=lambda row: (-row['similarity'], row['id']))
    finally:
        admission.release()


async def search_profiles(request, catalog):
    term = request.query.replace('\\', '\\\\').replace('"', '\\"').replace('%', '\\%').replace('_', '\\_').replace('*', '\\*')
    filters = {'select': FIELDS, 'order': 'id.asc', 'limit': str(request.limit + 1),
               'or': '(' + ','.join(f'{field}.ilike."%{term}%"' for field in ('username', 'display_name', 'bio')) + ')'}
    if request.profiles_cursor:
        filters['id'] = f'gt.{request.profiles_cursor}'
    rows = await catalog.gateway.request('GET', '/rest/v1/profiles', catalog.token, params=filters)
    needle = request.query.casefold()
    # Defensa adicional si un proveedor devuelve más filas de las solicitadas.
    rows = [row for row in rows if any(needle in str(row.get(field) or '').casefold() for field in ('username', 'display_name', 'bio'))]
    return {'items': [ProfileRepository.response(row) for row in rows[:request.limit]],
            'next_cursor': rows[request.limit - 1]['id'] if len(rows) > request.limit else None}


async def semantic_capabilities(request, catalog, encoder, cache):
    if not encoder.available():
        raise HTTPException(503, 'La búsqueda semántica local no está instalada. Usa búsqueda textual.')
    rows, cursor = [], None
    while len(rows) < POOL_LIMIT:
        page = await catalog.list(scope=request.scope, cursor=cursor, limit=min(100, POOL_LIMIT - len(rows)), **catalog_filters(request))
        rows.extend(page['items'])
        cursor = page['next_cursor']
        if not cursor:
            break
    fingerprint = hashlib.sha256(json.dumps([request.query, request.scope, catalog_filters(request), catalog.user_id, encoder.model_id,
        [(row['id'], digest(row)) for row in rows]], ensure_ascii=False).encode()).hexdigest()
    offset = 0
    if request.capabilities_cursor:
        try:
            token = request.capabilities_cursor
            if not token.startswith('s.'):
                raise ValueError()
            data = json.loads(base64.urlsafe_b64decode(token[2:]))
            if set(data) != {'hash', 'offset'} or type(data['offset']) is not int or not 0 <= data['offset'] <= len(rows):
                raise ValueError()
            if data['hash'] != fingerprint:
                raise HTTPException(409, 'Cambió el catálogo o la consulta. Inicia una búsqueda nueva.')
            offset = data['offset']
        except (ValueError, TypeError, KeyError):
            raise HTTPException(422, 'Cursor de búsqueda inválido') from None
    if not rows:
        return dict(EMPTY), 0, bool(cursor)
    try:
        ranked = await asyncio.to_thread(rank, request.query, rows, catalog.user_id, encoder, cache)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503, 'No se pudo consultar el modelo local. Puedes usar búsqueda textual.') from None
    items = ranked[offset:offset + request.limit]
    if items:
        # Revalidar visibilidad/contenido tras inferencia, antes de devolver metadatos.
        fresh = await catalog._read({'id': 'in.(' + ','.join(str(UUID(row['id'])) for row in items) + ')', 'limit': str(request.limit)})
        by_id = {row['id']: row for row in fresh}
        if any(row['id'] not in by_id or digest(by_id[row['id']]) != digest(row) for row in items):
            raise HTTPException(409, 'Cambió el catálogo durante la búsqueda. Vuelve a buscar.')
        if any((request.owner and by_id[row['id']].get('owner_username') != request.owner)
               or (request.data_type and request.data_type not in {by_id[row['id']]['input_type'], by_id[row['id']]['output_type']})
               for row in items):
            raise HTTPException(409, 'Cambió el catálogo durante la búsqueda. Vuelve a buscar.')
        items = [{**by_id[row['id']], 'similarity': row['similarity']} for row in items]
    next_cursor = None
    if offset + len(items) < len(ranked):
        next_cursor = 's.' + base64.urlsafe_b64encode(json.dumps({'hash': fingerprint, 'offset': offset + len(items)}).encode()).decode()
    return {'items': items, 'next_cursor': next_cursor}, len(rows), bool(cursor)


async def search(request, catalog, encoder=local_embeddings, cache=None):
    profiles = dict(EMPTY)
    capabilities = dict(EMPTY)
    scanned, truncated = 0, False
    if request.kind != 'capabilities':
        profiles = await search_profiles(request, catalog)
    if request.kind != 'profiles':
        if request.mode == 'semantic':
            capabilities, scanned, truncated = await semantic_capabilities(request, catalog, encoder, cache or EmbeddingCache())
        else:
            try:
                cursor = UUID(request.capabilities_cursor) if request.capabilities_cursor else None
            except ValueError:
                raise HTTPException(422, 'Cursor de búsqueda inválido') from None
            capabilities = await catalog.list(scope=request.scope, q=request.query, cursor=cursor, limit=request.limit, **catalog_filters(request))
    return {'mode': request.mode, 'profiles': profiles, 'capabilities': capabilities,
            'semantic_available': encoder.available(), 'semantic_scanned': scanned, 'semantic_truncated': truncated}
