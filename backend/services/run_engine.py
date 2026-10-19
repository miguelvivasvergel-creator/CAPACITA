# backend/services/run_engine.py
"""
Motor de ejecución: corre los pasos de una ejecución uno por uno.
Se llama en segundo plano (BackgroundTasks) y va actualizando run["steps"]
para que la pantalla vea el avance consultando GET /runs/{id}.
"""
import logging
from datetime import datetime, timezone
from typing import Any

from adapters import ADAPTERS

logger = logging.getLogger(__name__)


def _terminar(run: dict, estado: str, error: str | None = None) -> None:
    run["status"] = estado
    run["error"] = error
    run["finished_at"] = datetime.now(timezone.utc)
    # Solo ids y estados en los logs: nunca el contenido de entradas o salidas
    logger.info("Ejecución %s terminó con estado %s", run["id"], estado)


def ejecutar_run(run: dict, capacidades: list[dict], entrada: Any) -> None:
    """Pasa la entrada por cada capacidad; la salida de un paso es la entrada del siguiente."""
    run["status"] = "running"
    dato = entrada

    for paso, capacidad in zip(run["steps"], capacidades):
        paso["status"] = "running"
        adaptador = ADAPTERS.get(capacidad.get("adapter_key"))

        if adaptador is None:
            paso["status"] = "failed"
            paso["error"] = "Esta capacidad todavía no tiene adaptador."
            _terminar(run, "failed", f"No se pudo ejecutar el paso «{paso['name']}».")
            return

        try:
            dato = adaptador.run(dato)
        except Exception:
            logger.exception("Falló el paso %s de la ejecución %s", paso["name"], run["id"])
            paso["status"] = "failed"
            paso["error"] = "Ocurrió un error al procesar este paso."
            _terminar(run, "failed", f"Falló el paso «{paso['name']}».")
            return

        paso["status"] = "completed"

    run["output_text"] = dato if isinstance(dato, str) else None
    _terminar(run, "completed")
