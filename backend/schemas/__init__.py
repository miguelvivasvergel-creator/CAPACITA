"""
Módulo schemas: define los modelos Pydantic utilizados para validar
las solicitudes de entrada y serializar las respuestas de salida de la API.
"""
from schemas.health import HealthData

__all__ = ["HealthData"]
