from typing import Generic, TypeVar, Optional, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """
    Estructura de respuesta estándar para todos los endpoints de la API.
    Asegura consistencia en las respuestas hacia el frontend y clientes externos.
    """
    success: bool = Field(
        default=True,
        description="Indica si la solicitud fue exitosa"
    )
    message: str = Field(
        default="Operación exitosa",
        description="Mensaje descriptivo del resultado de la operación"
    )
    data: Optional[T] = Field(
        default=None,
        description="Contenido o payload de la respuesta"
    )
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Fecha y hora de la respuesta en formato UTC"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "success": True,
                "message": "Operación exitosa",
                "data": {},
                "timestamp": "2026-09-24T18:00:00Z"
            }
        }
    }
