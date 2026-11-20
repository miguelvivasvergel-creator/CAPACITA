"""Busca en catálogo autorizado y valida propuesta con el contrato B existente."""
import hashlib
import json
import re
import unicodedata
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
from schemas.search import SearchRequest
from core.config import settings
from connectors import BY_VERSION, PROFILE as CONNECTOR_PROFILE
from services.search_service import search as search_authorized


def review_hash(option):
    """Identifica los metadatos revisados, sin incluir código ni resultados."""
    content = {key: value for key, value in option.items() if key != "review_hash"}
    return hashlib.sha256(json.dumps(content, sort_keys=True, ensure_ascii=False,
                                     allow_nan=False, separators=(",", ":")).encode()).hexdigest()


def _raices(texto):
    plano = unicodedata.normalize("NFD", str(texto)).encode("ascii", "ignore").decode().lower()
    return {palabra[:6] for palabra in re.findall(r"[a-z]{4,}", plano)}


def conectores_relacionados(objective):
    """Capacidades de los conectores que comparten alguna palabra con el pedido («lluvia» → pronóstico,
    «Telegram», «festivos», «calendario», «redacta»…). Son pocos y la búsqueda por las palabras más
    largas no siempre los encontraba, así que un pedido de varias piezas quedaba sin combinar."""
    pedido = _raices(objective) - {"conect", "extern", "sirve", "para", "como", "desde", "esta", "este"}
    elegidos = {connector.key: str(connector.capability_id) for connector in BY_VERSION.values()
                if pedido & _raices(f"{connector.definition['name']} {connector.definition['description']}")}
    # Si hay que escribir con IA, va también «Pedirle algo a la IA sobre un texto»: es el que recibe
    # la orden de la persona Y los datos de otro paso (revision_logica lo exige en ese caso).
    if elegidos.keys() & {"redactar_texto", "resumir_texto"}:
        tarea = next(c for c in BY_VERSION.values() if c.key == "tarea_texto")
        elegidos["tarea_texto"] = str(tarea.capability_id)
    return set(elegidos.values())


def revision_logica(definition):
    """Errores de lógica que el validador de contratos no ve (los tipos encajan, el sentido no).

    El caso típico: «Redactar» recibe en sus indicaciones solo la salida de otro paso (el resumen
    del clima) y pierde lo que la persona pidió (la promoción); el texto que llega a Telegram habla
    solo de la lluvia. Devuelve la corrección para la IA, o None si el plan tiene sentido."""
    for node in definition.nodes:
        conector = BY_VERSION.get(str(node.version_id))
        if not conector:
            continue
        origen = node.bindings.get("indicaciones")
        if conector.key == "redactar_texto" and origen and origen.source != "$input":
            return (f"El paso «{node.id}» (Redactar) recibe en indicaciones solo la salida de «{origen.source}» "
                    "y pierde lo que pidió la persona. Usa en su lugar «Pedirle algo a la IA sobre un texto»: "
                    "en values.instruccion escribe la orden completa del objetivo (qué escribir, para quién, "
                    "con qué tono y los datos del negocio que dio la persona) y conecta texto a esa salida.")
        if (conector.key == "tarea_texto" and "instruccion" not in node.bindings
                and not str(node.values.get("instruccion") or "").strip()):
            return (f"El paso «{node.id}» (Pedirle algo a la IA) no tiene instrucción: escribe en "
                    "values.instruccion la orden completa del objetivo.")
    # Vale para cualquier proceso (conectores o herramientas propias): si hay envíos, todo lo que se
    # calcula debe llegar a otro paso; si no, se consulta para nada y el envío sale sin esos datos.
    usados = {b.source for node in definition.nodes for b in node.bindings.values()}
    tipo = {node.id: getattr(BY_VERSION.get(str(node.version_id)), "key", None) for node in definition.nodes}
    if any(tipo[node.id] in ACCIONES for node in definition.nodes):
        suelto = next((node.id for node in definition.nodes
                       if tipo[node.id] not in ACCIONES and node.id not in usados), None)
        if suelto:
            ciega = next((node.id for node in definition.nodes if tipo[node.id] in ESCRIBEN
                          and not any(b.source != "$input" for b in node.bindings.values())), None)
            if ciega:
                return (f"El paso «{suelto}» produce datos que no llegan a ningún paso, y «{ciega}» escribe sin ellos. "
                        "Usa «Pedirle algo a la IA sobre un texto» con la orden completa en values.instruccion y "
                        f"conecta su texto a la salida de «{suelto}» (por ejemplo su resumen).")
            return (f"El resultado del paso «{suelto}» no llega a ningún otro paso ni a los envíos: conéctalo "
                    "(por ejemplo su resumen o su archivo al mensaje o archivo del envío) o quita ese paso.")
    return None


ESCRIBEN = {"redactar_texto", "tarea_texto", "resumir_texto", "traducir_texto"}
ACCIONES = {"enviar_telegram", "enviar_correo", "guardar_drive", "agendar_evento"}


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


async def planner_options(objective, catalog, mode='text'):
    if mode == 'semantic':
        result = await search_authorized(SearchRequest(query=objective[:200], mode='semantic', kind='capabilities', limit=20), catalog)
        matches = result['capabilities']['items']
        truncated = result['semantic_truncated'] or bool(result['capabilities']['next_cursor']) or len(objective) > 200
    else:
        matches, truncated = await search_catalog(search_terms(objective), catalog)
    truncated = truncated or len(matches) > 20
    matches = matches[:20]
    allowed = {row["id"] for row in matches} | conectores_relacionados(objective)
    shared = SharedExecutionRepository(catalog)
    options, cursor = [], None
    conectores = {}  # capability_id → (orden, opción) de la versión más nueva
    for _ in range(2):
        page = await shared.rpc('publication_versions' if settings.PUBLICATIONS_ENABLED else 'versions', p_cursor=cursor, p_limit=100)
        for version in page["items"]:
            if version["status"] != "enabled" or version["capability_id"] not in allowed:
                continue
            capability = await catalog.get(UUID(version["capability_id"]))
            if version.get('contract_only'):
                option = {key: version[key] for key in ('id', 'capability_id', 'name', 'description')}
                option.update(publication_id=version.get('publication_id'), license=version.get('license'),
                              profile=version.get('profile'))
                option.update(version['contracts'], visibility=capability['visibility'])
                # De un conector solo se ofrece su versión más nueva (las viejas siguen sirviendo a
                # las soluciones guardadas, pero a la IA la confundirían como duplicados).
                if version.get('profile') == CONNECTOR_PROFILE:
                    registrado = BY_VERSION.get(str(version['id']))
                    orden = (registrado.version if registrado else 0, str(version.get('created_at')))
                    previa = conectores.get(version['capability_id'])
                    if previa is None or orden > previa[0]:
                        conectores[version['capability_id']] = (orden, option)
                    continue
                options.append(option | {'review_hash': review_hash(option)})
                continue
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
    # Primero los conectores: el chat envía a la IA solo las primeras opciones.
    options[:0] = [option | {'review_hash': review_hash(option)} for _, option in conectores.values()]
    bounded_json(options, 131072)
    return {"items": options, "next_cursor": None, "search_kind": mode,
            "search_truncated": bool(cursor) or truncated}


async def propose_plan(request, catalog, provider, limits=limiter):
    if not request.consent_to_provider:
        raise HTTPException(422, "Autoriza enviar el objetivo y los nombres, descripciones y contratos seleccionados a Gemini")
    available = await planner_options(request.objective, catalog, mode=request.mode)
    selected = set(map(str, request.version_ids))
    options = [row for row in available["items"] if row["id"] in selected]
    if len(options) != len(selected):
        raise HTTPException(409, "Una versión seleccionada ya no está disponible en la búsqueda; vuelve a buscar")
    reviewed = {str(identity): value for identity, value in request.version_hashes.items()}
    if any(reviewed[row["id"]] != review_hash(row) for row in options):
        raise HTTPException(409, "Los contratos o metadatos seleccionados cambiaron; vuelve a buscar y revisa antes de autorizar")
    options = [{key: value for key, value in row.items() if key != "review_hash"} for row in options]
    bounded_json({"objective": request.objective, "versions": options}, 65536)
    validation, feedback = None, None
    # Gemini a veces conecta mal los puertos: se le devuelve el error exacto y se reintenta una
    # vez, dentro del mismo turno del limitador (un pedido de la persona = un intento).
    limits.start(catalog.user_id)
    try:
        for attempt in range(3):
            try:
                raw = await (provider.plan(request.objective, options, feedback=feedback) if feedback
                             else provider.plan(request.objective, options))
                proposal = PlannerProposal.model_validate(raw)
            except ValidationError:
                raise HTTPException(502, "La IA devolvió un plan inválido; no se guardó ni ejecutó") from None
            if not proposal.definition:
                break
            if any(str(node.version_id) not in selected for node in proposal.definition.nodes):
                raise HTTPException(502, "La propuesta incluye una versión no seleccionada; no se guardó")
            logica = revision_logica(proposal.definition)
            if logica and attempt < 2:
                feedback = logica
                continue
            try:
                validation = await check_workflow(proposal.definition, catalog)
            except HTTPException as exc:
                if exc.status_code in {404, 409}:
                    raise HTTPException(409, "Una versión cambió o dejó de estar disponible; vuelve a buscar") from None
                if exc.status_code == 422 and attempt < 2:
                    feedback = str(exc.detail)
                    continue
                if exc.status_code == 422:
                    raise HTTPException(502, "La propuesta no cumple los contratos del workflow; revisa el objetivo") from None
                raise
            proposal.definition = arrange_definition(proposal.definition, validation["order"])
            break
    finally:
        limits.finish(catalog.user_id)
    return {"proposal": proposal.model_dump(mode="json"), "validation": validation,
            "search_truncated": available["search_truncated"], "saved": False, "executed": False}
