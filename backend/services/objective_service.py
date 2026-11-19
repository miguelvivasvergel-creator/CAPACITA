"""Busca antes de interpretar; devuelve borradores para revisión sin guardado automático."""
import asyncio
import json
import re

from fastapi import HTTPException
from jsonschema import Draft202012Validator

from repositories.capabilities import CapabilityRepository
from schemas.objectives import (
    AdjustRequest, AdjustResponse, ObjectiveRequest, ObjectiveResponse, ResearchResult, draft_to_definition,
)
from services.candidate_generation import GenerationLimiter, limiter
from services.contract_validation import validate_definition

STOP_WORDS = set("quiero necesito favor ayuda hacer crear capacidad para desde sobre como cómo que qué con sin una uno unos unas los las del por mis sus esto esta este tengo tiene debe pueda puede recibir devuelve obtener datos texto please want need help create with from this that into the and for".split())


# Librerías que ya trae la caja de herramientas del sandbox: no son recursos externos.
# Gemini a veces las declara como recurso y eso bloqueaba herramientas que sí se pueden crear.
LIBRERIA_INSTALADA = re.compile(
    r"pillow|\bpil\b|pypdf|python-docx|openpyxl|reportlab"
    r"|(librer[ií]a|biblioteca|paquete)s?\b.*\b(est[aá]ndar|im[aá]gen|color|pdf|word|excel|hoja|documento)",
    re.IGNORECASE)
EXTERNO = re.compile(
    r"\bred\b|internet|\bapi\b|cuenta|servicio|credencial|token|clave|hardware|c[aá]mara|micr[oó]fono"
    r"|nube|https?:|correo|e-?mail|base de datos|conector|ocr|tesseract|opencv|ffmpeg",
    re.IGNORECASE)


def quitar_librerias_instaladas(draft):
    """Quita de recursos/permisos solo las librerías ya instaladas; lo externo se conserva."""
    def externo(texto: str) -> bool:
        return not LIBRERIA_INSTALADA.search(texto) or bool(EXTERNO.search(texto))
    return draft.model_copy(update={campo: [t for t in getattr(draft, campo) if externo(t)]
                                    for campo in ("resources", "required_permissions")})


def search_terms(objective: str):
    words = re.findall(r"[^\W\d_]{4,}", objective.lower(), flags=re.UNICODE)
    words = sorted(dict.fromkeys(word for word in words if word not in STOP_WORDS), key=len, reverse=True)
    return list(dict.fromkeys([objective[:200], *words[:3]]))


async def search_catalog(queries, repository: CapabilityRepository):
    pages = await asyncio.gather(*(repository.list(q=query, limit=6) for query in queries))
    rows = {row["id"]: row for page in pages for row in page["items"]}
    return list(rows.values()), any(page["next_cursor"] for page in pages)


# Ajustes conversados («ponle 30 %»): turno propio para no gastar el de crear herramientas.
adjust_limiter = GenerationLimiter(hourly_limit=60, min_gap=3)
# La investigación va antes del planner y del diseño: su propio turno para no chocar con ellos.
research_limiter = GenerationLimiter(hourly_limit=60, min_gap=3)


async def research_objective(request: ObjectiveRequest, user_id, provider, limits=research_limiter) -> ResearchResult | None:
    """Busca en Google cómo se hace bien lo pedido, antes de hacer nada. None si no se pudo."""
    if not request.consent_to_provider:
        raise HTTPException(422, "Confirma que autorizas enviar tu necesidad a Gemini")
    if not hasattr(provider, "research"):
        return None
    limits.start(user_id)
    try:
        return await provider.research(request)
    finally:
        limits.finish(user_id)


async def adjust_parameters(request: AdjustRequest, user_id, provider, limits=adjust_limiter) -> AdjustResponse:
    if not request.consent_to_provider:
        raise HTTPException(422, "Confirma que autorizas enviar tu ajuste a Gemini")
    limits.start(user_id)
    try:
        proposal = await provider.adjust(request)
    finally:
        limits.finish(user_id)
    parameters = None
    if proposal.decision == "adjust":
        try:
            parameters = json.loads(proposal.parameters_json)
        except ValueError:
            parameters = None
        if not isinstance(parameters, dict) or not Draft202012Validator(request.parameter_schema).is_valid(parameters):
            raise HTTPException(502, "La IA propuso valores que no cumplen las opciones de la herramienta; no se cambió nada")
    return AdjustResponse(decision=proposal.decision, explanation=proposal.explanation, parameters=parameters)


async def interpret_objective(request: ObjectiveRequest, repository: CapabilityRepository, provider, limits=limiter):
    if not request.consent_to_provider:
        raise HTTPException(422, "Confirma que el objetivo y aclaraciones no contienen datos privados y autorizas enviarlos a Gemini")
    queries = search_terms(request.objective)
    matches, truncated = await search_catalog(queries, repository)
    # Nunca enviar catálogo privado/público al proveedor: solo objetivo y respuestas consentidos.
    limits.start(repository.user_id)
    try:
        # Investigación web: la que ya hizo el chat al empezar o, si no llegó, una búsqueda nueva.
        # Si falla o está apagada, el diseño sigue igual que antes.
        if request.research_summary:
            research, mostrar = ResearchResult(summary=request.research_summary), False
        else:
            research = await provider.research(request) if hasattr(provider, "research") else None
            mostrar = True
        interpreted = await (provider.interpret(request, research) if research else provider.interpret(request))
    finally:
        limits.finish(repository.user_id)
    definition, definition_hash = None, None
    if interpreted.decision == "define":
        interpreted = interpreted.model_copy(update={"draft": quitar_librerias_instaladas(interpreted.draft)})
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
        interpretation=interpreted, research=research if mostrar else None, definition=definition, definition_hash=definition_hash,
        matches={"items": matches[:20], "next_cursor": None}, search_queries=queries,
        search_truncated=truncated or len(matches) > 20,
    )
