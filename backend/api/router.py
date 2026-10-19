from fastapi import APIRouter
from api.health import router as health_router
from api.capabilities import router as capabilities_router
from api.files import router as files_router
from api.users import router as users_router
from api.runs import router as runs_router

# Enrutador principal de la API
api_router = APIRouter()

# Registro de sub-enrutadores
api_router.include_router(health_router)
api_router.include_router(capabilities_router)
api_router.include_router(files_router)
api_router.include_router(users_router)
api_router.include_router(runs_router)
