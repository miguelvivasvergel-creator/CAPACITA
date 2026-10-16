"""
Módulo adapters: registro de adaptadores disponibles.

Para agregar uno nuevo:
1. Crea adapters/mi_adaptador.py con una clase que herede de Adapter.
2. Regístrala aquí en ADAPTERS con su key.
"""
from adapters.base import Adapter
from adapters.mock import MockAdapter

ADAPTERS: dict[str, Adapter] = {
    adapter.key: adapter
    for adapter in [
        MockAdapter(),
    ]
}

__all__ = ["Adapter", "ADAPTERS"]
