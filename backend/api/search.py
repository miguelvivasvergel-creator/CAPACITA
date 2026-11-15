from fastapi import APIRouter, Depends
from typing import Annotated

from api.capabilities import Repository
from core.responses import APIResponse
from providers.local_embeddings import local_embeddings
from schemas.search import SearchRequest, SearchResponse
from services.search_service import search, POOL_LIMIT

router = APIRouter(prefix='/search', tags=['Búsqueda autorizada'])


def get_encoder():
    return local_embeddings


Encoder = Annotated[object, Depends(get_encoder)]


@router.get('/status')
async def search_status(repository: Repository, encoder: Encoder):
    return APIResponse(data={'semantic_available': encoder.available(), 'semantic_local': True, 'semantic_pool_limit': POOL_LIMIT})


@router.post('', response_model=APIResponse[SearchResponse])
async def search_catalog(payload: SearchRequest, repository: Repository, encoder: Encoder):
    # POST evita incluir las consultas en los logs de acceso de URLs.
    return APIResponse(data=await search(payload, repository, encoder))
