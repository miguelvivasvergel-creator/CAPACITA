"""Resuelve versiones mediante el catálogo autorizado existente, sin IA."""
from uuid import UUID

from fastapi import HTTPException

from repositories.candidates import CandidateRepository
from repositories.shared_execution import SharedExecutionRepository
from services.build_validation import validate_manifest
from services.workflow_validation import compile_workflow


async def resolve_versions(definition, catalog):
    shared = SharedExecutionRepository(catalog)
    versions = {}
    for node in definition.nodes:
        identity = str(node.version_id)
        if identity in versions:
            continue
        version = await shared.version_for_execution(node.version_id)
        row = await CandidateRepository(catalog).get(UUID(version["candidate_id"]))
        manifest = validate_manifest(row["manifest"])
        if str(manifest.candidate_id) != row["id"] or str(manifest.capability_id) != version["capability_id"]:
            raise HTTPException(409, "La versión no coincide con su candidato")
        versions[identity] = version | {"manifest": manifest.model_dump(mode="json")}
    return versions


async def check_workflow(definition, catalog, inputs=None):
    versions = await resolve_versions(definition, catalog)
    _, order = compile_workflow(definition, versions, inputs)
    return {"valid": True, "order": order, "required_permissions": [],
            "versions": {identity: {key: value for key, value in row.items() if key != "manifest"}
                         for identity, row in versions.items()}}
