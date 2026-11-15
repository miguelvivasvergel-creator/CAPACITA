from fastapi import APIRouter
from api.health import router as health_router
from api.capabilities import router as capabilities_router
from api.files import router as files_router
from api.users import router as users_router
from api.durable_runs import router as runs_router
from api.candidates import router as candidates_router
from api.objectives import router as objectives_router
from api.builds import router as builds_router
from api.versions import router as versions_router
from api.workflows import router as workflows_router

# Enrutador principal de la API
api_router = APIRouter()

# Registro de sub-enrutadores
api_router.include_router(health_router)
api_router.include_router(capabilities_router)
api_router.include_router(files_router)
api_router.include_router(users_router)
api_router.include_router(runs_router)
api_router.include_router(candidates_router)
api_router.include_router(objectives_router)
api_router.include_router(builds_router)
api_router.include_router(versions_router)
api_router.include_router(workflows_router)
