from fastapi import APIRouter, status
from core.config import settings
from core.responses import APIResponse
from schemas.health import HealthData

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=APIResponse[HealthData],
    status_code=status.HTTP_200_OK,
    summary="Verificar estado de salud del servicio",
    description="Retorna el estado operativo, versión y entorno en el que se ejecuta la API.",
)
async def get_health() -> APIResponse[HealthData]:
    """
    Endpoint de verificación de disponibilidad y salud del backend FastAPI.
    """
    health_payload = HealthData(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )
    return APIResponse(
        success=True,
        message="El servicio se encuentra operativo",
        data=health_payload,
    )
