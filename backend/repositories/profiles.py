"""Perfiles reales: columnas públicas y escritura propia con JWT/RLS."""
from uuid import UUID

from fastapi import HTTPException

from repositories.capabilities import CapabilityRepository
from schemas.users import UserProfile

FIELDS = 'id,username,display_name,bio,avatar_url,created_at'
PATH = '/rest/v1/profiles'


class ProfileRepository:
    def __init__(self, catalog: CapabilityRepository):
        self.catalog = catalog

    async def get(self, username='me'):
        catalog = self.catalog
        if username == 'me':
            filters = {'id': f'eq.{catalog.user_id}'}
        else:
            # Parámetro literal, como PostgREST .eq: httpx codifica el valor.
            # Añadir comillas las convierte en parte del username buscado.
            filters = {'username': f'eq.{username}'}
        rows = await catalog.gateway.request('GET', PATH, catalog.token, params={
            'select': FIELDS, 'limit': '1', **filters,
        })
        matches = [row for row in rows if (row.get('id') == catalog.user_id if username == 'me' else row.get('username') == username)]
        if not matches:
            raise HTTPException(404, 'Perfil no encontrado')
        return self.response(matches[0])

    @staticmethod
    def response(row):
        return UserProfile(**{key: row.get(key) for key in FIELDS.split(',')})

    async def update(self, changes):
        if not changes or set(changes) - {'display_name', 'bio', 'avatar_url'}:
            raise ValueError('Campos de perfil inválidos')
        catalog = self.catalog
        await self.get()
        rows = await catalog.gateway.request('PATCH', PATH, catalog.token, params={
            'id': f'eq.{catalog.user_id}', 'select': FIELDS,
        }, json=changes)
        if not rows:
            raise HTTPException(404, 'Perfil no encontrado o edición no permitida')
        if len(rows) != 1 or rows[0].get('id') != catalog.user_id:
            raise HTTPException(503, 'Respuesta inválida al guardar el perfil')
        return self.response(rows[0])

    async def public_capabilities(self, username, cursor=None, limit=20):
        profile = await self.get(username)
        filters = {'owner_id': f'eq.{UUID(profile.id)}', 'visibility': 'eq.public',
                   'order': 'id.asc', 'limit': str(limit + 1)}
        if cursor:
            filters['id'] = f'gt.{cursor}'
        # _read aplica visible_to en la consulta y en sus resultados.
        rows = await self.catalog._read(filters)
        rows = [row for row in rows if row.get('owner_id') == profile.id and row.get('visibility') == 'public']
        return {'items': rows[:limit], 'next_cursor': rows[limit - 1]['id'] if len(rows) > limit else None}
