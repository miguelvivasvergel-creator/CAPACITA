# backend/adapters/mock.py
import time
from typing import Any

from adapters.base import Adapter


class MockAdapter(Adapter):
    """Adaptador de prueba: espera 1 segundo y devuelve texto falso."""
    key = "mock"
    input_type = "texto"
    output_type = "texto"

    def run(self, entrada: Any) -> str:
        time.sleep(1)
        return "Resultado de prueba: el workflow se ejecutó correctamente paso a paso."
