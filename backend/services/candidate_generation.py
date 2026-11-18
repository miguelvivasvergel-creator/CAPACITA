"""Orquestación autorizada: búsqueda, una generación y guardado privado, sin ejecución."""
from collections import deque
from time import monotonic
from uuid import UUID

from fastapi import HTTPException
from pydantic import ValidationError

from providers.gemini import CodeGenerationProvider
from repositories.candidates import CandidateRepository
from schemas.candidates import CandidateGenerateRequest
from schemas.definitions import CapabilityDefinition
from services.candidate_preparation import prepare_candidate
from services.contract_validation import validate_definition


class GenerationLimiter:
    """Límite por proceso local: 10 intentos/hora y uno simultáneo por usuario.

    No es cuota distribuida ni límite de facturación. Antes de múltiples workers,
    trasladar contadores a almacenamiento compartido con operaciones atómicas.
    """
    def __init__(self, clock=monotonic, hourly_limit=10, min_gap=30):
        self.clock, self.attempts, self.active = clock, {}, set()
        self.hourly_limit, self.min_gap = hourly_limit, min_gap

    def start(self, user_id):
        now = self.clock()
        # Eliminar usuarios vencidos para no acumular memoria indefinidamente.
        self.attempts = {key: deque(t for t in values if now - t < 3600) for key, values in self.attempts.items() if values and now - values[-1] < 3600}
        times = self.attempts.setdefault(user_id, deque())
        if user_id in self.active or len(times) >= self.hourly_limit or (times and now - times[-1] < self.min_gap):
            raise HTTPException(429, f"Límite de generación: espera {self.min_gap} segundos; máximo {self.hourly_limit} intentos por hora")
        if len(self.attempts) > 10000:
            raise HTTPException(503, "Generación ocupada; inténtalo más tarde")
        times.append(now)
        self.active.add(user_id)

    def finish(self, user_id):
        self.active.discard(user_id)


# 30/hora: «Créalas todas» encadena diseño, código y correcciones de varias herramientas.
# Es un tope propio (el nivel gratuito de Gemini admite más); no activa facturación.
limiter = GenerationLimiter(hourly_limit=30)


async def owned_definition(capability_id: UUID, candidates: CandidateRepository):
    catalog = candidates.capabilities
    source = await catalog.get(capability_id)
    if source["owner_id"] != catalog.user_id:
        raise HTTPException(404, "Capacidad no encontrada")
    if source["visibility"] != "private" or source["status"] != "draft":
        raise HTTPException(409, "Generar requiere una definición privada en borrador")
    config = source.get("config")
    saved = config.get("definition") if isinstance(config, dict) else None
    if not isinstance(saved, dict) or saved.get("format_version") != 1:
        raise HTTPException(409, "Guarda primero una definición estructurada completa")
    try:
        definition = CapabilityDefinition(
            **{key: source[key] for key in ("name", "description", "category", "input_type", "output_type", "input_schema", "output_schema")},
            **{key: saved[key] for key in ("parameter_schema", "constraints", "resources", "failure_cases", "examples")},
            required_permissions=source["permissions"],
        )
        current_hash = validate_definition(definition)
    except (KeyError, TypeError, ValidationError):
        raise HTTPException(409, "Guarda primero una definición estructurada completa") from None
    if current_hash != saved.get("definition_hash"):
        raise HTTPException(409, "La definición guardada cambió; revisa y guarda sus contratos antes de generar")
    return definition, current_hash


async def review_generation(capability_id: UUID, candidates: CandidateRepository):
    definition, definition_hash = await owned_definition(capability_id, candidates)
    # Búsqueda textual autorizada; no implica equivalencia funcional.
    matches = await candidates.capabilities.list(q=definition.name, limit=20)
    matches["items"] = [item for item in matches["items"] if item["id"] != str(capability_id)]
    await candidates.preflight()
    return {"definition_hash": definition_hash, "matches": matches, "search_kind": "text"}


async def generate_candidate(capability_id: UUID, payload: CandidateGenerateRequest, candidates: CandidateRepository, provider: CodeGenerationProvider, model: str, limits=limiter):
    if not payload.consent_to_provider:
        raise HTTPException(422, "Confirma el envío de la definición y ejemplos al proveedor IA")
    checked = await review_generation(capability_id, candidates)
    if checked["definition_hash"] != payload.definition_hash:
        raise HTTPException(409, "La definición cambió; revisa antes de generar")
    if checked["matches"]["items"] and not payload.acknowledge_similar:
        raise HTTPException(409, "Revisa coincidencias del catálogo antes de generar una implementación distinta")
    definition, _ = await owned_definition(capability_id, candidates)
    if definition.required_permissions or definition.resources:
        raise HTTPException(409, "El primer entorno Python no admite permisos ni recursos externos; requieren un ejecutor compatible")
    limits.start(candidates.capabilities.user_id)
    try:
        proposal = await provider.generate(definition)
        manifest = prepare_candidate(capability_id, definition, proposal)
        # No asociar una respuesta a una definición modificada durante la llamada IA.
        _, current_hash = await owned_definition(capability_id, candidates)
        if current_hash != payload.definition_hash:
            raise HTTPException(409, "La definición cambió durante la generación; no se guardó el candidato")
        return await candidates.create(manifest, model)
    finally:
        limits.finish(candidates.capabilities.user_id)
