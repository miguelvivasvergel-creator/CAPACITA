"""Búsqueda previa y persistencia de definiciones privadas del catálogo."""
from fastapi import HTTPException

from repositories.capabilities import CapabilityRepository
from schemas.capabilities import CapabilityCreate
from schemas.definitions import CapabilityDefinition, DefinitionCheckResponse, DefinitionSaveRequest
from services.contract_validation import validate_definition


async def check_definition(definition: CapabilityDefinition, repository: CapabilityRepository) -> DefinitionCheckResponse:
    definition_hash = validate_definition(definition)
    matches = await repository.list(q=definition.name, limit=5)
    return DefinitionCheckResponse(definition=definition, definition_hash=definition_hash, matches=matches)


async def save_definition(request: DefinitionSaveRequest, repository: CapabilityRepository) -> dict:
    checked = await check_definition(request.definition, repository)
    if checked.matches.items and not request.acknowledge_similar:
        raise HTTPException(409, "Hay coincidencias textuales en el catálogo. Revísalas antes de guardar otro borrador")
    definition = request.definition
    payload = CapabilityCreate(
        name=definition.name, description=definition.description, category=definition.category,
        input_type=definition.input_type, output_type=definition.output_type,
        input_schema=definition.input_schema, output_schema=definition.output_schema,
        permissions=definition.required_permissions,
        # Espacio de nombres documentado; no contiene código, credenciales ni estado de pruebas.
        config={"definition": {
            "format_version": 1, "definition_hash": checked.definition_hash,
            "parameter_schema": definition.parameter_schema,
            "constraints": definition.constraints, "resources": definition.resources,
            "failure_cases": definition.failure_cases,
            "examples": [example.model_dump(mode="json") for example in definition.examples],
        }},
    )
    return await repository.create(payload.model_dump(mode="json"))
