"""
Módulo core: contiene configuraciones centrales, constantes, seguridad
y utilidades transversales a toda la aplicación.
"""
from core.config import settings
from core.responses import APIResponse

__all__ = ["settings", "APIResponse"]
