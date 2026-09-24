import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from core.config import settings
from core.responses import APIResponse
from api import api_router

# Inicialización de la aplicación FastAPI con metadata para documentación automática
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    docs_url=settings.DOCS_URL,
    redoc_url=settings.REDOC_URL,
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# Configuración de CORS para permitir peticiones desde el frontend (React/Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de las rutas bajo el prefijo configurado (/api)
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get(
    "/",
    tags=["Root"],
    summary="Información de la API",
    description="Endpoint raíz que redirige a la documentación o entrega información básica.",
)
async def root() -> APIResponse[dict]:
    return APIResponse(
        success=True,
        message=f"Bienvenido a la API de {settings.PROJECT_NAME}",
        data={
            "docs": settings.DOCS_URL,
            "redoc": settings.REDOC_URL,
            "health": f"{settings.API_PREFIX}/health",
        },
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
