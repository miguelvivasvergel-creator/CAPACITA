"""Ajuste seguro de valores a su contrato antes de validarlos: lo que la IA o un paso anterior
entregan CASI bien («300» donde va un número, «Cajeros» donde la opción es «cajero», una lista
donde va un texto, «usd» donde va «USD», una opción que falta y tiene valor por defecto). Antes eso
hacía fallar el plan («Opciones incompatibles en el paso…») o la ejecución («input_contract»).

Solo convierte cuando no hay ambigüedad; si no puede, deja el valor como estaba y la validación
de siempre lo rechaza con el campo exacto (primer_error). Nunca inventa datos: un dato obligatorio
que falta sigue faltando."""
import json
import re
import unicodedata

from jsonschema import Draft202012Validator

NUMERO = re.compile(r"^-?\d+(?:[.,]\d+)?$")
MILES = re.compile(r"^-?[1-9]\d{0,2}(?:\.\d{3})+$")  # 300.000 · 1.500.000 (punto de miles, como en Colombia)
MILES_Y_DECIMAL = re.compile(r"^-?[1-9]\d{0,2}(?:\.\d{3})+,\d+$")  # 1.500,50
AMBIGUO = re.compile(r"^-?[1-9]\d{0,2}(?:,\d{3})+$")  # 1,500: ¿mil quinientos o 1,5? No se adivina.


def numero_de(texto):
    """El número de un texto escrito como en Colombia (o None si es dudoso o no es un número):
    «300.000» → 300000, «1.500,50» → 1500.5, «2,5» → 2.5, «2.5» → 2.5, «$ 300.000» → 300000.
    «1,500» se deja sin convertir: la validación lo explica en vez de adivinar mal un monto."""
    limpio = texto.strip().replace(" ", "").lstrip("$")
    if MILES.match(limpio):
        return float(limpio.replace(".", ""))
    if MILES_Y_DECIMAL.match(limpio):
        return float(limpio.replace(".", "").replace(",", "."))
    if AMBIGUO.match(limpio) or not NUMERO.match(limpio):
        return None
    return float(limpio.replace(",", "."))
VERDADERO, FALSO = {"true", "si", "yes", "1", "verdadero"}, {"false", "no", "0", "falso"}


def _plano(texto):
    return unicodedata.normalize("NFD", str(texto)).encode("ascii", "ignore").decode().lower().strip()


def _opcion(valor, opciones):
    """La opción del enum que corresponde al valor sin importar mayúsculas, tildes ni plural."""
    if valor in opciones:
        return valor
    buscado = _plano(valor)
    for candidato in (buscado, buscado[:-2] if buscado.endswith("es") else None, buscado[:-1] if buscado.endswith("s") else None):
        if not candidato:
            continue
        for opcion in opciones:
            if isinstance(opcion, str) and _plano(opcion) == candidato:
                return opcion
    return valor


def texto_legible(valor):
    """Una lista o un objeto como texto que se lee bien (para un campo de texto)."""
    if isinstance(valor, list):
        lineas = []
        for fila in valor[:50]:
            if isinstance(fila, dict):
                lineas.append("- " + " · ".join(f"{k}: {v}" for k, v in fila.items() if v not in (None, "", [], {})))
            else:
                lineas.append(f"- {fila}")
        return "\n".join(lineas)
    if isinstance(valor, dict):
        return "\n".join(f"{k}: {texto_legible(v) if isinstance(v, (list, dict)) else v}" for k, v in valor.items())
    return json.dumps(valor, ensure_ascii=False)


def ajustar(valor, schema):
    if not isinstance(schema, dict) or valor is None:
        return valor
    tipo = schema.get("type")
    if tipo == "string":
        if isinstance(valor, bool):
            valor = "sí" if valor else "no"
        elif isinstance(valor, (int, float)):
            valor = str(valor)
        elif isinstance(valor, (list, dict)):
            valor = texto_legible(valor)
        if isinstance(valor, str):
            valor = valor.strip()
            # Códigos de largo fijo (moneda USD, país CO) se escriben en mayúsculas.
            largo = schema.get("maxLength")
            if largo and largo <= 3 and schema.get("minLength") == largo and valor.isalpha():
                valor = valor.upper()
    elif tipo in ("number", "integer") and isinstance(valor, str):
        numero = numero_de(valor)
        if numero is not None:
            valor = int(numero) if tipo == "integer" and numero.is_integer() else numero
    elif tipo == "integer" and isinstance(valor, float) and valor.is_integer():
        valor = int(valor)
    elif tipo == "boolean" and isinstance(valor, str):
        plano = _plano(valor)
        valor = True if plano in VERDADERO else False if plano in FALSO else valor
    elif tipo == "object" and isinstance(valor, dict):
        valor = ajustar_objeto(schema, valor)
    elif tipo == "array" and isinstance(valor, list) and isinstance(schema.get("items"), dict):
        valor = [ajustar(item, schema["items"]) for item in valor]
    if "enum" in schema and isinstance(valor, str):
        valor = _opcion(valor, schema["enum"])
    return valor


def ajustar_objeto(schema, valores, defaults=False, quitar_extra=True):
    """Ajusta cada campo conocido; quita los que el contrato no admite (additionalProperties false) y,
    con defaults, completa las opciones que faltan con su valor por defecto. Al ejecutar no se quitan
    (quitar_extra=False): una entrada que el conector no tiene («chat_id», «para» en el correo v1) se
    sigue rechazando, para que nadie pueda apuntar un envío a otra persona sin que se note."""
    if not isinstance(valores, dict) or not isinstance(schema, dict):
        return valores
    propiedades = schema.get("properties", {})
    salida = {}
    for campo, valor in valores.items():
        if campo not in propiedades and schema.get("additionalProperties") is False and quitar_extra:
            continue
        salida[campo] = ajustar(valor, propiedades.get(campo, {}))
    if defaults:
        for campo, spec in propiedades.items():
            if campo not in salida and isinstance(spec, dict) and "default" in spec:
                salida[campo] = spec["default"]
    return salida


def primer_error(schema, valor):
    """(campo, qué se esperaba) del primer error de validación, o None si es válido."""
    errores = sorted(Draft202012Validator(schema).iter_errors(valor), key=lambda e: len(e.path))
    if not errores:
        return None
    error = errores[0]
    campo = ".".join(str(parte) for parte in error.path)
    if not campo and error.validator == "required" and "'" in error.message:
        campo = error.message.split("'")[1]
    regla = error.schema if isinstance(error.schema, dict) else {}
    if "enum" in regla:
        esperado = "una de: " + ", ".join(map(str, regla["enum"]))[:300]
    elif error.validator == "required":
        esperado = "un valor (es obligatorio)"
    elif "type" in regla:
        esperado = {"string": "un texto", "integer": "un número entero", "number": "un número",
                    "boolean": "sí o no", "array": "una lista", "object": "un objeto"}.get(regla["type"], str(regla["type"]))
        for clave, nombre in (("minimum", "mínimo"), ("maximum", "máximo"), ("minLength", "largo mínimo"),
                              ("maxLength", "largo máximo")):
            if clave in regla:
                esperado += f", {nombre} {regla[clave]}"
    else:
        esperado = str(error.validator)
    return campo or "entrada", esperado
