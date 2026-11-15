"""Validación compartida y acotada de contratos y ejemplos, sin red ni ejecución."""
import hashlib
import json

from fastapi import HTTPException
from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError

from schemas.definitions import CapabilityDefinition

# Subconjunto acotado: sin referencias, regex, composición recursiva ni consultas de red.
# Ampliar este contrato requiere revisar límites y compatibilidad con el ejecutor de B.
SCHEMA_KEYS = {
    "$schema", "type", "title", "description", "properties", "required",
    "additionalProperties", "items", "enum", "const", "default", "minimum",
    "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf",
    "minLength", "maxLength", "minItems", "maxItems", "uniqueItems",
    "minProperties", "maxProperties",
}
TYPES = {"object", "array", "string", "number", "integer", "boolean", "null"}


def _bounded_json(value):
    try:
        encoded = json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True, separators=(",", ":"))
    except (ValueError, TypeError, RecursionError):
        raise HTTPException(422, "La definición debe contener valores JSON válidos") from None
    if len(encoded.encode("utf-8")) > 65536:
        raise HTTPException(422, "La definición supera el límite de 64 KiB")
    pending, count = [(value, 0)], 0
    while pending:
        node, depth = pending.pop()
        count += 1
        if depth > 20 or count > 2048:
            raise HTTPException(422, "La definición es demasiado compleja; reduce campos, profundidad o ejemplos")
        children = node.values() if isinstance(node, dict) else node if isinstance(node, list) else ()
        pending.extend((child, depth + 1) for child in children)
    return encoded


def _check_supported_schema(schema, label):
    if schema.get("type") != "object":
        raise HTTPException(422, f"El contrato de {label} debe tener type=object")
    pending = [schema]
    while pending:
        node = pending.pop()
        if isinstance(node, bool):
            continue
        if not isinstance(node, dict):
            raise HTTPException(422, f"Contrato de {label} no válido")
        if set(node) - SCHEMA_KEYS:
            raise HTTPException(422, f"El contrato de {label} contiene reglas no admitidas; no se permiten referencias, patrones ni composición")
        node_type = node.get("type")
        if node_type is not None and (not isinstance(node_type, str) or node_type not in TYPES):
            raise HTTPException(422, f"Tipo no admitido en el contrato de {label}")
        if "$schema" in node and node["$schema"] != Draft202012Validator.META_SCHEMA["$id"]:
            raise HTTPException(422, "Solo se admite JSON Schema 2020-12")
        properties = node.get("properties", {})
        if not isinstance(properties, dict) or len(properties) > 64:
            raise HTTPException(422, f"El contrato de {label} admite hasta 64 propiedades por objeto")
        pending.extend(properties.values())
        for key in ("items", "additionalProperties"):
            if key in node:
                pending.append(node[key])
    try:
        Draft202012Validator.check_schema(schema)
    except SchemaError:
        raise HTTPException(422, f"Contrato de {label} no válido según JSON Schema 2020-12") from None
    return Draft202012Validator(schema)


def validate_schema(schema, label="entrada del proceso"):
    _bounded_json(schema)
    return _check_supported_schema(schema, label)


def validate_definition(definition: CapabilityDefinition) -> str:
    encoded = _bounded_json(definition.model_dump(mode="json"))
    contracts = (
        ("entrada", "inputs", definition.input_schema),
        ("parámetros", "parameters", definition.parameter_schema),
        ("salida", "expected_output", definition.output_schema),
    )
    for label, field, schema in contracts:
        validator = _check_supported_schema(schema, label)
        for index, example in enumerate(definition.examples, start=1):
            error = next(validator.iter_errors(getattr(example, field)), None)
            if error is not None:
                # No devolver el valor recibido ni la salida esperada en mensajes de error.
                raise HTTPException(422, f"Ejemplo {index}: {label} no cumple su contrato (regla: {error.validator})")
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()
