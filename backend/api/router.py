from fastapi import APIRouter
from api.health import router as health_router

# Enrutador principal de la API
api_router = APIRouter()

# Registro de sub-enrutadores
api_router.include_router(health_router)
