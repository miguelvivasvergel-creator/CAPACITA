"""Avatares normalizados y persistentes; nunca conserva el archivo original."""
from io import BytesIO
import logging
import re
import warnings
from uuid import UUID, uuid4

from fastapi import HTTPException
import httpx
from PIL import Image, ImageOps, UnidentifiedImageError

logger = logging.getLogger(__name__)
MAX_BYTES = 2 * 1024 * 1024
MAX_PIXELS = 16_000_000


def normalize_avatar(raw: bytes, content_type: str) -> bytes:
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, 'La foto supera el límite de 2 MB')
    if content_type not in {'image/png', 'image/jpeg'}:
        raise HTTPException(422, 'La foto debe ser PNG o JPG')
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            with Image.open(BytesIO(raw)) as image:
                expected = 'PNG' if content_type == 'image/png' else 'JPEG'
                if image.format != expected or image.width * image.height > MAX_PIXELS or getattr(image, 'n_frames', 1) != 1:
                    raise ValueError('Formato o dimensiones no admitidos')
                image.verify()
            with Image.open(BytesIO(raw)) as image:
                image.load()
                reduced = ImageOps.exif_transpose(image).convert('RGBA')
                reduced.thumbnail((512, 512), Image.Resampling.LANCZOS)
                clean = Image.new('RGBA', reduced.size)
                clean.paste(reduced)
                output = BytesIO()
                clean.save(output, format='PNG')
                return output.getvalue()
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, 'La foto no es una imagen PNG/JPG válida o supera los límites') from None


class AvatarStorage:
    def __init__(self, catalog):
        self.catalog = catalog
        self.owner = str(UUID(catalog.user_id))
        self.base = str(catalog.gateway.client.base_url).rstrip('/')

    def public_url(self, path):
        return f'{self.base}/storage/v1/object/public/avatars/{path}'

    def owned_path(self, url):
        prefix = f'{self.base}/storage/v1/object/public/avatars/{self.owner}/'
        if not isinstance(url, str) or not url.startswith(prefix):
            return None
        filename = url[len(prefix):]
        if not re.fullmatch(r'[0-9a-f-]{36}\.png', filename):
            return None
        try:
            UUID(filename[:-4])
        except ValueError:
            return None
        return f'{self.owner}/{filename}'

    async def _request(self, method, path, **kwargs):
        headers = {'apikey': self.catalog.gateway.api_key, 'Authorization': f'Bearer {self.catalog.token}', **kwargs.pop('headers', {})}
        try:
            response = await self.catalog.gateway.client.request(method, path, headers=headers, **kwargs)
        except httpx.RequestError:
            raise HTTPException(503, 'No se pudo conectar con el almacenamiento de fotos') from None
        if not 200 <= response.status_code < 300:
            raise HTTPException(503, 'No se pudo guardar la foto. Comprueba el bucket avatars y sus permisos')

    async def upload(self, raw):
        path = f'{self.owner}/{uuid4()}.png'
        await self._request('POST', f'/storage/v1/object/avatars/{path}', content=raw,
                            headers={'Content-Type': 'image/png', 'x-upsert': 'false', 'Cache-Control': 'max-age=3600'})
        return self.public_url(path)

    async def discard(self, url):
        path = self.owned_path(url)
        if path:
            try:
                await self._request('DELETE', '/storage/v1/object/avatars', json={'prefixes': [path]})
            except HTTPException:
                logger.warning('No se pudo limpiar una foto de perfil anterior; requiere mantenimiento')


async def save_avatar(repository, storage, raw, content_type, changes):
    normalized = normalize_avatar(raw, content_type)
    previous = await repository.get()
    url = await storage.upload(normalized)
    try:
        updated = await repository.update({**changes, 'avatar_url': url})
    except Exception:
        # Una respuesta perdida puede ocultar un PATCH confirmado. No borrar su foto.
        try:
            current = await repository.get()
        except HTTPException:
            current = None
        if current is not None and current.avatar_url != url:
            await storage.discard(url)
        raise
    await storage.discard(previous.avatar_url)
    return updated
