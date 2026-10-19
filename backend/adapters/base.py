# backend/adapters/base.py
"""
Interfaz común de todos los adaptadores.
Un adaptador es el código Python que hace el trabajo real de una capacidad
(por ejemplo, extraer texto de un PDF o traducir).
"""
from abc import ABC, abstractmethod
from typing import Any


class Adapter(ABC):
    key: str          # Debe coincidir con capabilities.adapter_key
    input_type: str   # pdf | texto | imagen | audio | datos
    output_type: str  # pdf | texto | imagen | audio | datos

    @abstractmethod
    def run(self, entrada: Any) -> Any:
        """Recibe la salida del paso anterior (o la entrada del usuario) y devuelve su resultado."""
