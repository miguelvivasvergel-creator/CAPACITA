"""Una corrección explícita crea otro candidato; no ejecuta ni hereda evidencia B."""
from fastapi import HTTPException
from core.config import settings
from services.build_validation import validate_manifest
from services.candidate_generation import GenerationLimiter, limiter, owned_definition
from services.candidate_preparation import prepare_candidate

repair_limiter = GenerationLimiter(hourly_limit=settings.CANDIDATE_REPAIR_LIMIT)


async def repair_candidate(identity, payload, candidates, provider, model,
                           limits=limiter, repairs=repair_limiter):
    original = await candidates.get(identity)
    if not payload.consent_to_provider:
        raise HTTPException(422, "Autoriza enviar definición, ejemplos, código anterior y observación a Gemini")
    manifest = validate_manifest(original['manifest'])
    if str(manifest.candidate_id) != str(identity) or str(manifest.capability_id) != original['capability_id']:
        raise HTTPException(409, "El candidato no coincide con su definición de origen")
    definition, current_hash = await owned_definition(manifest.capability_id, candidates)
    if current_hash != manifest.definition_hash:
        raise HTTPException(409, "La definición cambió; genera un candidato desde la definición actual")
    owner = candidates.capabilities.user_id
    repairs.start(owner)
    try:
        limits.start(owner)
        try:
            proposal = await provider.repair(definition, manifest.proposal.source, payload.feedback)
            updated = prepare_candidate(manifest.capability_id, definition, proposal)
            if updated.artifact_hash == manifest.artifact_hash:
                raise HTTPException(409, "La reparación no cambió el código; revisa la observación antes de intentarlo de nuevo")
            _, latest = await owned_definition(manifest.capability_id, candidates)
            if latest != current_hash:
                raise HTTPException(409, "La definición cambió durante la reparación; no se guardó")
            # INSERT de un candidato nuevo; el anterior y su evidencia son inmutables.
            return await candidates.create(updated, model)
        finally:
            limits.finish(owner)
    finally:
        repairs.finish(owner)
