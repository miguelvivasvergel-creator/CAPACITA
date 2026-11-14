"""Busca antes de interpretar; devuelve borradores para revisión sin guardado automático."""
import asyncio
import re

from fastapi import HTTPException

from repositories.capabilities import CapabilityRepository
from schemas.objectives import ObjectiveRequest, ObjectiveResponse, draft_to_definition
from services.candidate_generation import limiter
from services.contract_validation import validate_definition

STOP_WORDS = set("quiero necesito favor ayuda hacer crear capacidad para desde sobre como cómo que qué con sin una uno unos unas los las del por mis sus esto esta este tengo tiene debe pueda puede recibir devuelve obtener datos texto please want need help create with from this that into the and for".split())


def search_terms(objective: str):
    words = re.findall(r"[^\W\d_]{4,}", objective.lower(), flags=re.UNICODE)
    words = sorted(dict.fromkeys(word for word in words if word not in STOP_WORDS), key=len, reverse=True)
    return list(dict.fromkeys([objective[:200], *words[:3]]))


async def search_catalog(queries, repository: CapabilityRepository):
    pages = await asyncio.gather(*(repository.list(q=query, limit=6) for query in queries))
    rows = {row["id"]: row for page in pages for row in page["items"]}
    return list(rows.values()), any(page["next_cursor"] for page in pages)


async def interpret_objective(request: ObjectiveRequest, repository: CapabilityRepository, provider, limits=limiter):
    if not request.consent_to_provider:
        raise HTTPException(422, "Confirma que el objetivo y aclaraciones no contienen datos privados y autorizas enviarlos a Gemini")
    queries = search_terms(request.objective)
    matches, truncated = await search_catalog(queries, repository)
    # Nunca enviar catálogo privado/público al proveedor: solo objetivo y respuestas consentidos.
    limits.start(repository.user_id)
    try:
        interpreted = await provider.interpret(request)
    finally:
        limits.finish(repository.user_id)
    definition, definition_hash = None, None
    if interpreted.decision == "define":
        try:
            definition = draft_to_definition(interpreted.draft)
            definition_hash = validate_definition(definition)
        except (ValueError, TypeError, RecursionError):
            raise HTTPException(502, "La propuesta IA no cumple sus contratos o ejemplos; no se guardó") from None
        extra, extra_truncated = await search_catalog([definition.name], repository)
        matches = list({row["id"]: row for row in [*matches, *extra]}.values())
        queries = list(dict.fromkeys([*queries, definition.name]))
        truncated = truncated or extra_truncated
    return ObjectiveResponse(
        interpretation=interpreted, definition=definition, definition_hash=definition_hash,
        matches={"items": matches[:20], "next_cursor": None}, search_queries=queries,
        search_truncated=truncated or len(matches) > 20,
    )
