"""Biblioteca de APIs abiertas: piezas comunes para declarar muchos conectores con el mismo patrón.

Todos los conectores de la biblioteca:
- usan servicios gratuitos sin clave (o con clave pública de prueba) y sin facturación;
- reciben entradas sin límites de largo en el contrato (se pueden encadenar con otros pasos)
  y validan esos límites en su código antes de llamar al proveedor;
- devuelven un «resumen» legible (sirve para enviarlo por Telegram o guardarlo) y, cuando hay
  varias filas, «total» + «resultados» (sirve para tablas y gráficos).
Si no hay resultados no fallan: responden total 0 y un resumen que lo explica.
"""
from connectors.base import Connector, ConnectorInputError


def campo(titulo, descripcion="", tipo="string", **extra):
    spec = {"type": tipo, "title": titulo, **extra}
    if descripcion:
        spec["description"] = descripcion
    return spec


def objeto(propiedades, requeridos=()):
    spec = {"type": "object", "additionalProperties": False, "properties": propiedades}
    if requeridos:
        spec["required"] = list(requeridos)
    return spec


SIN_PARAMETROS = objeto({})


def salida_lista(filas, maximo=20):
    """Contrato estándar de lista: resumen + total + resultados (cada fila con todos sus campos)."""
    return objeto({"resumen": campo("Resumen"), "total": campo("Total", tipo="integer"),
                   "resultados": {"type": "array", "title": "Resultados", "maxItems": maximo,
                                  "items": objeto(filas, list(filas))}},
                  ["resumen", "total", "resultados"])


def salida_ficha(campos):
    """Contrato de una sola ficha: sus campos + resumen, todos obligatorios."""
    return objeto({**campos, "resumen": campo("Resumen")}, [*campos, "resumen"])


def texto(inputs, clave, maximo=200, requerido=True):
    """Texto de la persona ya limpio; nunca llega vacío ni gigante al proveedor."""
    valor = inputs.get(clave)
    valor = "" if valor is None else " ".join(str(valor).split())
    if (requerido and not valor) or len(valor) > maximo:
        raise ConnectorInputError(clave)
    return valor


def entero(valor, minimo, maximo, defecto, clave):
    if valor is None or valor == "":
        return defecto
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or int(valor) != valor \
            or not minimo <= valor <= maximo:
        raise ConnectorInputError(clave)
    return int(valor)


def opcion(parameters, clave, opciones, defecto):
    valor = parameters.get(clave, defecto)
    if valor not in opciones:
        raise ConnectorInputError(clave)
    return valor


def corto(valor, maximo=300):
    """Texto de una sola línea, recortado con «…»."""
    limpio = " ".join(str(valor or "").split())
    return limpio if len(limpio) <= maximo else limpio[:maximo - 1].rstrip() + "…"


def cadena(valor):
    return "" if valor is None else corto(valor, 500)


def numero(valor, defecto=0.0):
    try:
        resultado = float(valor)
    except (TypeError, ValueError):
        return defecto
    return resultado if resultado == resultado and abs(resultado) != float("inf") else defecto


def lista_de(data, *claves):
    """data[c1][c2]… si es una lista; si no, lista vacía (respuestas incompletas del proveedor)."""
    for clave in claves:
        data = data.get(clave) if isinstance(data, dict) else None
    return data if isinstance(data, list) else []


def dic(valor):
    return valor if isinstance(valor, dict) else {}


# Campos que son enlaces o imágenes: sirven en «resultados», no en el resumen que lee una persona o la IA.
SIN_RESUMEN = ("mapa", "enlace", "imagen", "pagina", "url", "foto", "icono", "codigo")
EN_RESUMEN = 5


UNIDADES = {"_m": " m", "_km": " km"}


def linea_de(fila):
    partes = []
    for k, v in fila.items():
        if k.startswith(SIN_RESUMEN) or not isinstance(v, (str, int, float)) or isinstance(v, bool):
            continue
        valor = str(v).strip()
        if valor and not valor.startswith(("http://", "https://")):
            partes.append(valor + next((u for sufijo, u in UNIDADES.items() if k.endswith(sufijo)), ""))
    return corto(" · ".join(partes), 200)


def respuesta(filas, encontrado, vacio):
    """Lista estándar. encontrado: función(total) → texto del resumen, al que se suman los primeros
    resultados. El plan suele conectar «resumen» (es el texto) y antes solo nombraba el primero: en la
    prueba de Santa Marta pidieron 3 restaurantes, a la IA le llegó uno y rellenó los otros dos."""
    if not filas:
        return {"resumen": vacio, "total": 0, "resultados": filas}
    lineas = [f"{n}. {linea}" for n, linea in enumerate((linea_de(f) for f in filas[:EN_RESUMEN]), 1) if linea]
    resumen = encontrado(len(filas)) + ("\n" + "\n".join(lineas) if lineas else "")
    return {"resumen": resumen, "total": len(filas), "resultados": filas}


def pesos(valor, decimales=2):
    """3326.96 → «3.326,96» (formato colombiano)."""
    return f"{valor:,.{decimales}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def conector(*, key, proveedor, url, hosts, nombre, descripcion, categoria, entradas, requeridos=(),
             ejemplo, run, salida, restricciones, parametros=SIN_PARAMETROS, ejemplo_parametros=None,
             input_type="texto", output_type="datos", max_requests=1, envia_contenido=False):
    return Connector(
        key=key, version=1, provider=proveedor, provider_url=url, hosts=hosts, name=nombre,
        description=f"Conector externo ({proveedor}): {descripcion}", category=categoria,
        input_type=input_type, output_type=output_type, input_schema=objeto(entradas, requeridos),
        parameter_schema=parametros, output_schema=salida, example_inputs=ejemplo,
        example_parameters=ejemplo_parametros or {}, constraints=restricciones, run=run,
        max_requests=max_requests, sends_content=envia_contenido)


__all__ = ["ConnectorInputError", "campo", "objeto", "SIN_PARAMETROS", "salida_lista", "salida_ficha", "texto",
           "entero", "opcion", "corto", "cadena", "numero", "lista_de", "dic", "respuesta", "pesos", "conector"]
