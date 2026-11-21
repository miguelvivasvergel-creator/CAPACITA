"""Fechas y horas escritas como las escribe una persona (o la IA): «2026-11-27», «27/11/2026»,
«27 de noviembre», «el próximo viernes», «mañana», «5:30 p. m.», «17h». El calendario exigía
AAAA-MM-DD exacto y el itinerario de viaje falló con «revisa la fecha». Hora de Colombia (UTC-5,
sin horario de verano), sin depender de la base de zonas horarias del sistema."""
from datetime import date, datetime, timedelta, timezone
import re
import unicodedata

COLOMBIA = timezone(timedelta(hours=-5))
MESES = {"enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6, "julio": 7, "agosto": 8,
         "septiembre": 9, "setiembre": 9, "octubre": 10, "noviembre": 11, "diciembre": 12}
DIAS = {"lunes": 0, "martes": 1, "miercoles": 2, "jueves": 3, "viernes": 4, "sabado": 5, "domingo": 6}
NOMBRES_DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]


def hoy_colombia():
    return datetime.now(COLOMBIA).date()


def hoy_legible(hoy=None):
    hoy = hoy or hoy_colombia()
    return f"{hoy.isoformat()} ({NOMBRES_DIAS[hoy.weekday()]})"


def contexto_de_fecha(ahora=None):
    """Hoy y los 7 días siguientes con su nombre, para que la IA que escribe al EJECUTAR resuelva «el lunes»,
    «mañana» o «este fin de semana» (sin esto respondía «el próximo festivo» en vez de si el lunes lo es).
    Se calcula en cada ejecución: un asistente semanal no hereda la fecha del día en que se planeó."""
    ahora = ahora or datetime.now(COLOMBIA)
    hoy = ahora.date()
    siguientes = ", ".join(f"{NOMBRES_DIAS[d.weekday()]} {d.isoformat()}"
                           for d in (hoy + timedelta(days=n) for n in range(1, 8)))
    return (f"Hoy es {NOMBRES_DIAS[hoy.weekday()]} {hoy.isoformat()}, {ahora:%H:%M} (hora de Colombia). "
            f"Próximos días: {siguientes}.")


def _plano(texto):
    return unicodedata.normalize("NFD", str(texto)).encode("ascii", "ignore").decode().lower().strip()


def _fecha(anio, mes, dia):
    try:
        return date(int(anio), int(mes), int(dia))
    except ValueError:
        return None


def leer_fecha(texto, hoy=None):
    """La primera fecha que se entienda en el texto, o None."""
    hoy = hoy or hoy_colombia()
    t = _plano(texto)
    if not t or len(t) > 2000:
        return None
    if m := re.search(r"\b(\d{4})-(\d{1,2})-(\d{1,2})", t):
        return _fecha(*m.groups())
    if m := re.search(r"\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b", t):
        return _fecha(m[3], m[2], m[1])
    meses = "|".join(MESES)
    if m := re.search(rf"\b(\d{{1,2}})\s+(?:de\s+)?({meses})(?:\s+(?:de|del)?\s*(\d{{4}}))?", t):
        dia, mes, anio = int(m[1]), MESES[m[2]], m[3]
        fecha = _fecha(anio or hoy.year, mes, dia)
        if fecha and not anio and fecha < hoy:
            fecha = _fecha(hoy.year + 1, mes, dia)  # «27 de enero» escrito en noviembre es el del año siguiente
        return fecha
    if m := re.search(r"\b(" + "|".join(DIAS) + r")\b", t):
        adelante = (DIAS[m[1]] - hoy.weekday()) % 7
        return hoy + timedelta(days=adelante or 7)  # «el viernes» dicho un viernes es el de la otra semana
    if re.search(r"\bpasado\s+manana\b", t):
        return hoy + timedelta(days=2)
    if re.match(r"manana\b", t) or re.search(r"\b(?:para|desde|el|de)\s+manana\b", t):
        return hoy + timedelta(days=1)
    if re.search(r"\bhoy\b", t):
        return hoy
    return None


def leer_hora(texto):
    """«17:30», «5:30 p. m.», «5 pm», «17h30», «9.15» → «HH:MM», o None."""
    t = re.sub(r"\s+", "", _plano(texto))
    t = re.sub(r"a\.?m\.?$", "am", t)
    t = re.sub(r"p\.?m\.?$", "pm", t).replace(".", ":")
    m = re.fullmatch(r"(\d{1,2})(?:[:h](\d{2}))?h?(am|pm)?", t)
    if not m:
        return None
    hora, minutos, sufijo = int(m[1]), int(m[2] or 0), m[3]
    if sufijo == "pm" and hora < 12:
        hora += 12
    if sufijo == "am" and hora == 12:
        hora = 0
    if not (0 <= hora <= 23 and 0 <= minutos <= 59):
        return None
    return f"{hora:02d}:{minutos:02d}"
