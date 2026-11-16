"""Busca en catálogo autorizado y valida propuesta con el contrato B existente."""
import hashlib
import json
from uuid import UUID
from fastapi import HTTPException
from pydantic import ValidationError
from repositories.candidates import CandidateRepository
from repositories.shared_execution import SharedExecutionRepository
from schemas.planner import PlannerProposal
from services.build_validation import validate_manifest
from services.candidate_generation import limiter
from services.objective_service import search_catalog, search_terms
from services.workflow_service import check_workflow
from services.workflow_validation import bounded_json


def review_hash(option):
    """Identifica los metadatos revisados, sin incluir código ni resultados."""
    content = {key: value for key, value in option.items() if key != "review_hash"}
    return hashlib.sha256(json.dumps(content, sort_keys=True, ensure_ascii=False,
                                     allow_nan=False, separators=(",", ":")).encode()).hexdigest()


def arrange_definition(definition, order):
    """Distribuye propuestas nuevas después de $input; conserva todos sus contratos."""
    nodes = {node.id: node for node in definition.nodes}
    levels, lanes, positioned = {}, {}, {}
    for identity in order:
        node = nodes[identity]
        parents = [binding.source for binding in node.bindings.values() if binding.source != "$input"]
        level = 1 + max((levels[parent] for parent in parents), default=0)
        lane = lanes.get(level, 0)
        levels[identity], lanes[level] = level, lane + 1
        positioned[identity] = node.model_copy(update={"x": level * 330, "y": lane * 240})
    return definition.model_copy(update={"nodes": [positioned[node.id] for node in definition.nodes]})


async def planner_options(objective, catalog):
    matches, truncated = await search_catalog(search_terms(objective), catalog)
    truncated = truncated or len(matches) > 20
    matches = matches[:20]
    allowed = {row["id"] for row in matches}
    shared = SharedExecutionRepository(catalog)
    options, cursor = [], None
    for _ in range(2):
        page = await shared.rpc("versions", p_cursor=cursor, p_limit=100)
        for version in page["items"]:
            if version["status"] != "enabled" or version["capability_id"] not in allowed:
                continue
            capability = await catalog.get(UUID(version["capability_id"]))
            row = await CandidateRepository(catalog).get(UUID(version["candidate_id"]))
            try:
                manifest = validate_manifest(row["manifest"])
            except (ValidationError, ValueError, RecursionError):
                raise HTTPException(409, "Una versión tiene un candidato inválido") from None
            if (str(manifest.candidate_id) != version["candidate_id"]
                    or str(manifest.capability_id) != version["capability_id"]
                    or manifest.artifact_hash != version["artifact_hash"]
                    or manifest.definition_hash != version["definition_hash"]):
                raise HTTPException(409, "Una versión no coincide con su candidato")
            option = {"id": version["id"], "capability_id": version["capability_id"],
                "name": manifest.definition.name, "description": manifest.definition.description,
                "visibility": capability["visibility"],
                **{key: getattr(manifest.definition, key) for key in ("input_schema", "parameter_schema", "output_schema")}}
            options.append(option | {"review_hash": review_hash(option)})
        cursor = page["next_cursor"]
        if not cursor:
            break
    bounded_json(options, 131072)
    return {"items": options, "next_cursor": None, "search_kind": "text",
            "search_truncated": bool(cursor) or truncated}


async def propose_plan(request, catalog, provider, limits=limiter):
    if not request.consent_to_provider:
        raise HTTPException(422, "Autoriza enviar el objetivo y los nombres, descripciones y contratos seleccionados a Gemini")
    available = await planner_options(request.objective, catalog)
    selected = set(map(str, request.version_ids))
    options = [row for row in available["items"] if row["id"] in selected]
    if len(options) != len(selected):
        raise HTTPException(409, "Una versión seleccionada ya no está disponible en la búsqueda; vuelve a buscar")
    reviewed = {str(identity): value for identity, value in request.version_hashes.items()}
    if any(reviewed[row["id"]] != review_hash(row) for row in options):
        raise HTTPException(409, "Los contratos o metadatos seleccionados cambiaron; vuelve a buscar y revisa antes de autorizar")
    options = [{key: value for key, value in row.items() if key != "review_hash"} for row in options]
    bounded_json({"objective": request.objective, "versions": options}, 65536)
    limits.start(catalog.user_id)
    try:
        proposal = PlannerProposal.model_validate(await provider.plan(request.objective, options))
    except ValidationError:
        raise HTTPException(502, "La IA devolvió un plan inválido; no se guardó ni ejecutó") from None
    finally:
        limits.finish(catalog.user_id)
    validation = None
    if proposal.definition:
        if any(str(node.version_id) not in selected for node in proposal.definition.nodes):
            raise HTTPException(502, "La propuesta incluye una versión no seleccionada; no se guardó")
        try:
            validation = await check_workflow(proposal.definition, catalog)
        except HTTPException as exc:
            if exc.status_code in {404, 409}:
                raise HTTPException(409, "Una versión cambió o dejó de estar disponible; vuelve a buscar") from None
            if exc.status_code == 422:
                raise HTTPException(502, "La propuesta no cumple los contratos del workflow; revisa el objetivo") from None
            raise
        proposal.definition = arrange_definition(proposal.definition, validation["order"])
    return {"proposal": proposal.model_dump(mode="json"), "validation": validation,
            "search_truncated": available["search_truncated"], "saved": False, "executed": False}
