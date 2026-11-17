"""Valida planes como datos. Compatibilidad conservadora; no transforma valores."""
from graphlib import CycleError, TopologicalSorter
import json
from types import SimpleNamespace

from fastapi import HTTPException
from jsonschema import Draft202012Validator

from schemas.workflows import WorkflowDefinition
from services.build_validation import validate_manifest
from services.contract_validation import DATA_BYTES, validate_schema


def compatible(source, target):
    """Solo aceptar inclusiones demostrables del subconjunto de contratos usado."""
    if target is True:
        return True
    if source is False or target is False or source is True:
        return False
    if not target:
        return True
    source_type, target_type = source.get("type"), target.get("type")
    if source_type != target_type and not (source_type == "integer" and target_type == "number"):
        return False
    values = [source["const"]] if "const" in source else source.get("enum")
    if "const" in target or "enum" in target:
        if values is None or not all(Draft202012Validator(target).is_valid(value) for value in values):
            return False
    for low in ("minimum", "minLength", "minItems", "minProperties"):
        if low in target and source.get(low, float("-inf")) < target[low]:
            if values is None or not all(Draft202012Validator(target).is_valid(value) for value in values):
                return False
    for high in ("maximum", "maxLength", "maxItems", "maxProperties"):
        if high in target and source.get(high, float("inf")) > target[high]:
            if values is None or not all(Draft202012Validator(target).is_valid(value) for value in values):
                return False
    # Reglas menos comunes exigen igualdad; es preferible rechazar que adivinar.
    for key in ("exclusiveMinimum", "exclusiveMaximum", "multipleOf", "uniqueItems"):
        if key in target and source.get(key) != target[key]:
            return False
    if target_type == "array":
        return compatible(source.get("items", {}), target.get("items", {}))
    if target_type == "object":
        required = set(target.get("required", []))
        if not required <= set(source.get("required", [])):
            return False
        source_fields, target_fields = source.get("properties", {}), target.get("properties", {})
        source_extra, target_extra = source.get("additionalProperties", True), target.get("additionalProperties", True)
        if target_extra is False and source_extra is not False:
            return False
        if isinstance(target_extra, dict) and source_extra is not False:
            if source_extra is True and target_extra or isinstance(source_extra, dict) and not compatible(source_extra, target_extra):
                return False
        for name in set(source_fields) | set(target_fields):
            source_field = source_fields.get(name, source_extra)
            target_field = target_fields.get(name, target_extra)
            if source_field is False:
                continue
            if not compatible(source_field if source_field is not True else {}, target_field if target_field is not True else {}):
                return False
        return True
    return True


def bounded_json(value, limit=65536):
    try:
        if len(json.dumps(value, ensure_ascii=False, allow_nan=False).encode()) > limit:
            raise ValueError()
    except (ValueError, TypeError, RecursionError):
        raise HTTPException(422, "El plan o sus datos superan los límites de JSON") from None


def compile_workflow(raw, versions, inputs=None):
    definition = raw if isinstance(raw, WorkflowDefinition) else WorkflowDefinition.model_validate(raw)
    bounded_json(definition.model_dump(mode="json"))
    validate_schema(definition.input_schema)
    if definition.input_schema.get("type") != "object":
        raise HTTPException(422, "La entrada del proceso debe ser un objeto")
    nodes = {node.id: node for node in definition.nodes}
    if len(nodes) != len(definition.nodes):
        raise HTTPException(422, "Cada paso necesita un identificador distinto")
    manifests, dependencies = {}, {}
    for node in definition.nodes:
        version = versions.get(str(node.version_id))
        if not version:
            raise HTTPException(404, "Versión no encontrada")
        if version["status"] != "enabled":
            raise HTTPException(409, "Una versión del proceso está deshabilitada")
        if version.get('contract_only'):
            for schema in version['contracts'].values():
                validate_schema(schema)
            manifest = SimpleNamespace(artifact_hash=version['artifact_hash'], definition_hash=version['definition_hash'],
                                       definition=SimpleNamespace(**version['contracts']))
        else:
            manifest = validate_manifest(version["manifest"])
        if (manifest.artifact_hash != version["artifact_hash"]
                or manifest.definition_hash != version["definition_hash"]):
            raise HTTPException(409, "La versión no coincide con sus contratos")
        manifests[node.id] = manifest
        if not Draft202012Validator(manifest.definition.parameter_schema).is_valid(node.parameters):
            raise HTTPException(422, f"Opciones incompatibles en el paso {node.id}")
        dependencies[node.id] = {binding.source for binding in node.bindings.values() if binding.source != "$input"}
    if any(dep not in nodes for dependencies_ in dependencies.values() for dep in dependencies_):
        raise HTTPException(422, "Una conexión apunta a un paso inexistente")
    try:
        order = list(TopologicalSorter(dependencies).static_order())
    except CycleError:
        raise HTTPException(422, "El proceso contiene un ciclo") from None

    def port_schema(binding):
        schema = definition.input_schema if binding.source == "$input" else manifests[binding.source].definition.output_schema
        if binding.field not in schema.get("properties", {}) or binding.field not in schema.get("required", []):
            raise HTTPException(422, "La conexión necesita un campo declarado y obligatorio")
        return schema["properties"][binding.field]

    for node in definition.nodes:
        schema = manifests[node.id].definition.input_schema
        supplied = set(node.values) | set(node.bindings)
        if not schema.get("minProperties", 0) <= len(supplied) <= schema.get("maxProperties", 64):
            raise HTTPException(422, "La cantidad de entradas no cumple el contrato del paso")
        if node.bindings and ("enum" in schema or "const" in schema):
            raise HTTPException(422, "Ese contrato de objeto necesita entradas fijas completas")
        if set(node.values) & set(node.bindings):
            raise HTTPException(422, "Una entrada no puede recibir dos valores")
        if not set(schema.get("required", [])) <= supplied:
            raise HTTPException(422, f"Faltan entradas en el paso {node.id}")
        if schema.get("additionalProperties") is False and supplied - set(schema.get("properties", {})):
            raise HTTPException(422, "La conexión usa una entrada no declarada")
        for field, value in node.values.items():
            if not Draft202012Validator(schema.get("properties", {}).get(field, {})).is_valid(value):
                raise HTTPException(422, "Un valor fijo no cumple el contrato")
        if not node.bindings and not Draft202012Validator(schema).is_valid(node.values):
            raise HTTPException(422, "Las entradas fijas no cumplen el contrato completo")
        for field, binding in node.bindings.items():
            if not compatible(port_schema(binding), schema.get("properties", {}).get(field, {})):
                raise HTTPException(422, "Los campos conectados tienen contratos incompatibles")
    for binding in definition.outputs.values():
        if binding.source != "$input" and binding.source not in nodes:
            raise HTTPException(422, "La salida apunta a un paso inexistente")
        port_schema(binding)
    if inputs is not None:
        bounded_json(inputs, DATA_BYTES)
        if not Draft202012Validator(definition.input_schema).is_valid(inputs):
            raise HTTPException(422, "Los datos no cumplen la entrada del proceso")
    return definition, order
