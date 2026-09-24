from pydantic import BaseModel, Field


class HealthData(BaseModel):
    """
    Esquema de datos para el estado del servicio en el endpoint de health check.
    """
    status: str = Field(
        default="healthy",
        description="Estado operativo del servicio"
    )
    service: str = Field(
        ...,
        description="Nombre del servicio o API"
    )
    version: str = Field(
        ...,
        description="Versión actual de la API"
    )
    environment: str = Field(
        ...,
        description="Entorno de ejecución (development, staging, production)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "healthy",
                "service": "CAPACITA API",
                "version": "0.1.0",
                "environment": "development"
            }
        }
    }
