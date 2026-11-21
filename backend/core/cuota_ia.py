"""Tope GLOBAL de llamadas a Gemini en este proceso, además de los límites por persona.

Los limitadores por persona (planner, diseño, bot…) no impiden que varias cuentas juntas, un asistente
mal configurado o alguien con muchas cuentas agoten la cuota gratuita del día y dejen a TODOS sin IA.
Aquí se cuentan las llamadas que de verdad salen a Google (un pedido del planner puede hacer varias),
con dos ventanas: por minuto (si está lleno se espera unos segundos, como pide el nivel gratuito) y por
día de Colombia (al llegar al tope se avisa con claridad en vez del 429 de Google a mitad de algo).

Es por proceso (la API y el trabajador llevan cada uno el suyo): sus topes juntos deben quedar por
debajo de la cuota del proyecto en Google. Se ajustan en backend/.env; no activa facturación.
"""
from collections import deque
from datetime import datetime, timedelta, timezone
import threading
import time

COLOMBIA = timezone(timedelta(hours=-5))


class CuotaIA:
    def __init__(self, por_minuto, por_dia, reloj=time.monotonic, dia=lambda: datetime.now(COLOMBIA).date()):
        self.por_minuto, self.por_dia, self.reloj, self.dia = por_minuto, por_dia, reloj, dia
        self.minuto, self.hoy, self.usadas_hoy = deque(), None, 0
        self.candado = threading.Lock()  # la usan el bucle async y los hilos que ejecutan soluciones

    def tomar(self):
        """0 si la llamada puede salir ya (y queda contada); segundos que faltan si el minuto está lleno;
        None si se acabó el tope del día."""
        with self.candado:
            ahora, hoy = self.reloj(), self.dia()
            if hoy != self.hoy:
                self.hoy, self.usadas_hoy = hoy, 0
            if self.usadas_hoy >= self.por_dia:
                return None
            while self.minuto and ahora - self.minuto[0] >= 60:
                self.minuto.popleft()
            if len(self.minuto) >= self.por_minuto:
                return max(0.5, 60 - (ahora - self.minuto[0]))
            self.minuto.append(ahora)
            self.usadas_hoy += 1
            return 0


ESPERA_MAXIMA = 20  # segundos que vale la pena esperar un turno; más que eso se le dice a la persona
AGOTADA = "Capacita llegó al tope de usos de la IA de hoy (cuida la cuota gratuita). Vuelve a intentarlo mañana."
OCUPADA = "La IA está recibiendo muchas peticiones en este momento. Espera un minuto y vuelve a intentarlo."


def _crear():
    from core.config import settings
    return CuotaIA(settings.GEMINI_TOPE_POR_MINUTO, settings.GEMINI_TOPE_POR_DIA)


CUOTA = _crear()
