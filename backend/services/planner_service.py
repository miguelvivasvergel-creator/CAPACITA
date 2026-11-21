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
from schemas.workflows import MAX_NODOS
from services.ajuste_contratos import ajustar_objeto
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


# Raíces que aparecen en casi cualquier pedido o descripción y no dicen qué herramienta hace falta.
GENERICAS = {"conect", "extern", "sirve", "para", "como", "desde", "esta", "este", "cada", "dias",
             "segun", "cuanto", "convie", "corto", "revisa", "sobre", "todos", "todas", "tiene",
             "puede", "hacer", "quier", "neces", "ayuda", "favor", "mismo", "entre", "otro", "otra"}
MAX_CONECTORES = 9  # el chat manda a la IA solo las 12 primeras opciones: deja sitio a las propias


def conectores_relacionados(objective):
    """Capacidades de conectores que comparten palabras con el pedido, de la más a la menos relevante
    ({capability_id: puntaje}, ordenado). Con la biblioteca de APIs un pedido largo tocaba más de 20
    conectores por palabras comunes («texto», «datos») y, como el chat solo manda 12, el correo podía
    quedar fuera. Pesa más la palabra que está en el nombre y la que tienen pocos conectores; un envío
    nombrado por la persona («Telegram», «correo», «Drive») entra siempre."""
    pedido = _raices(objective) - GENERICAS
    ultimos = {}
    for connector in BY_VERSION.values():
        if connector.key not in ultimos or connector.version > ultimos[connector.key].version:
            ultimos[connector.key] = connector
    textos = {key: (_raices(c.definition["name"]), _raices(c.definition["description"]))
              for key, c in ultimos.items()}
    frecuencia = {}
    for nombre, descripcion in textos.values():
        for raiz in nombre | descripcion:
            frecuencia[raiz] = frecuencia.get(raiz, 0) + 1
    puntajes = {}
    for key, (nombre, descripcion) in textos.items():
        en_nombre, en_descripcion = pedido & nombre, (pedido & descripcion) - nombre
        if not en_nombre and not en_descripcion:
            continue
        puntaje = sum(3 / frecuencia[r] for r in en_nombre) + sum(1 / frecuencia[r] for r in en_descripcion)
        puntajes[key] = puntaje + (100 if key in ACCIONES and en_nombre else 0)
    # Si hay que escribir con IA, va también «Pedirle algo a la IA sobre un texto»: es el que recibe
    # la orden de la persona Y los datos de otro paso (revision_logica lo exige en ese caso).
    # Y «Escribir con IA usando varios datos», que junta las salidas de varios pasos.
    escribir = [puntajes[k] for k in ("redactar_texto", "resumir_texto") if k in puntajes]
    for clave in ("tarea_texto", "componer_texto"):
        if escribir and clave in ultimos:
            puntajes[clave] = max(puntajes.get(clave, 0), max(escribir) + 0.01)
    orden = sorted(puntajes, key=lambda k: -puntajes[k])[:MAX_CONECTORES]
    return {str(ultimos[k].capability_id): puntajes[k] for k in orden}


def antecesores(paso_id, pasos):
    """Todos los pasos de los que depende `paso_id` (directa o indirectamente), sin él mismo."""
    vistos, pendientes = set(), [b.source for b in pasos[paso_id].bindings.values()]
    while pendientes:
        actual = pendientes.pop()
        if actual in vistos or actual not in pasos:
            continue
        vistos.add(actual)
        pendientes.extend(b.source for b in pasos[actual].bindings.values())
    return vistos


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
        if (conector.key in {"tarea_texto", "componer_texto"} and "instruccion" not in node.bindings
                and not str(node.values.get("instruccion") or "").strip()):
            return (f"El paso «{node.id}» ({conector.definition['name']}) no tiene instrucción: escribe en "
                    "values.instruccion la orden completa del objetivo.")
    # La fecha del calendario sale del pedido (la IA la calcula con «hoy»), no de un texto de otro
    # paso: conectada al itinerario, el calendario no encontraba una fecha y fallaba.
    for node in definition.nodes:
        origen = node.bindings.get("fecha")
        if (getattr(BY_VERSION.get(str(node.version_id)), "key", None) == "agendar_evento" and origen
                and origen.source != "$input" and "fecha" not in origen.field.lower()):
            return (f"El paso «{node.id}» (calendario) recibe la fecha de «{origen.source}.{origen.field}», que no "
                    "es una fecha: calcúlala con hoy y escríbela AAAA-MM-DD en values.fecha.")
    # Un texto conectado a «archivo» de Telegram o del correo (el itinerario de la IA) no es un archivo:
    # va en «mensaje». Drive sí lo acepta (lo guarda como documento de Google Docs).
    pasos = {node.id: node for node in definition.nodes}
    for node in definition.nodes:
        if getattr(BY_VERSION.get(str(node.version_id)), "key", None) not in {"enviar_telegram", "enviar_correo"}:
            continue
        origen = node.bindings.get("archivo")
        fuente = origen and pasos.get(origen.source) and BY_VERSION.get(str(pasos[origen.source].version_id))
        if fuente:
            campo = fuente.definition["output_schema"].get("properties", {}).get(origen.field, {})
            if "contentEncoding" not in campo:
                return (f"El paso «{node.id}» recibe en archivo un texto («{origen.source}.{origen.field}»), no un "
                        "archivo: conéctalo a mensaje y deja archivo sin conectar (solo lleva PDF, fotos u otros "
                        "archivos).")
    # Vale para cualquier proceso (conectores o herramientas propias): si hay envíos, todo lo que se
    # calcula debe llegar a otro paso; si no, se consulta para nada y el envío sale sin esos datos.
    usados = {b.source for node in definition.nodes for b in node.bindings.values()}
    tipo = {node.id: getattr(BY_VERSION.get(str(node.version_id)), "key", None) for node in definition.nodes}
    # Dos pasos idénticos (misma pieza, mismos datos, opciones y conexiones) dan el mismo resultado: o sobra
    # uno o esconden algo que no se puede hacer. Caso real: «cuánto eran 50 euros hace un año» con el mismo
    # conversor de hoy (no hay tasas históricas): el texto habría dicho que el valor de hace un año es el de hoy.
    firmas = {}
    for node in definition.nodes:
        firma = json.dumps([str(node.version_id), node.values, node.parameters,
                            {k: [b.source, b.field] for k, b in node.bindings.items()}], sort_keys=True, default=str)
        if firma in firmas:
            return (f"Los pasos «{firmas[firma]}» y «{node.id}» son idénticos (misma pieza y mismos datos): dan el mismo "
                    "resultado. Quita el que sobra. Si querías algo distinto (por ejemplo, un dato de una fecha pasada) "
                    "y ninguna versión lo permite, no lo simules: ponlo en pendientes y dilo en explanation.")
        firmas[firma] = node.id
    # Alertas («avísame SOLO si…»): el motor omite lo que depende de la condición cuando no se cumple. Si
    # ningún envío depende de ella, la condición no frena nada y el aviso saldría SIEMPRE. (Un envío aparte
    # sin condición puede ser legítimo: «mándame el clima y avísame solo si llueve».)
    condiciones = {node.id for node in definition.nodes if tipo[node.id] == "revisar_condicion"}
    envios = [node.id for node in definition.nodes if tipo[node.id] in ACCIONES]
    if condiciones and envios and not any(antecesores(envio, pasos) & condiciones for envio in envios):
        condicion = sorted(condiciones)[0]
        return (f"Ningún envío depende de la condición «{condicion}»: el aviso saldría aunque no se cumpla. Conecta "
                f"el mensaje del envío a «{condicion}.dato» (pasa el dato solo si se cumple) o a un paso que dependa "
                "de la condición. En la condición conecta dato al resumen legible de la consulta.")
    if any(tipo[node.id] in ACCIONES for node in definition.nodes):
        sueltos = [node.id for node in definition.nodes if tipo[node.id] not in ACCIONES and node.id not in usados]
        suelto = sueltos[0] if sueltos else None
        if len(sueltos) > 1:
            return (f"Los pasos {', '.join('«' + s + '»' for s in sueltos)} producen datos que no llegan a ningún "
                    "paso. Para juntarlos usa «Escribir con IA usando varios datos»: la orden completa en "
                    "values.instruccion y cada salida en su propio dato_1, dato_2… (puede ser el resumen o la lista "
                    "de filas); después conecta su resultado a los envíos.")
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


def destinatarios_no_escritos(definition, objective):
    """Quita el destinatario (y toda entrada solo_persona) que no esté escrito tal cual en el pedido:
    la IA no decide a quién le escribe la persona, solo copia la dirección que ella dio. Devuelve lo
    quitado para avisarle."""
    escrito, quitados = str(objective or "").lower(), []
    for node in definition.nodes:
        for campo in getattr(BY_VERSION.get(str(node.version_id)), "solo_persona", ()):
            valor = node.values.get(campo)
            if valor is None:
                continue
            if not isinstance(valor, str) or not valor.strip() or valor.strip().lower() not in escrito:
                node.values.pop(campo)
                quitados.append(str(valor))
            else:
                node.values[campo] = valor.strip()
    return quitados


ESCRIBEN = {"redactar_texto", "tarea_texto", "resumir_texto", "traducir_texto", "componer_texto"}
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


async def planner_options(objective, catalog, mode='text', completo=False):
    """Versiones que la IA puede usar. Sin completo: las que encontró la búsqueda y los conectores
    relacionados con el pedido. Con completo (chat): además TODOS los conectores, para que la IA
    elija en el paso 1 (elegir_piezas) en vez de depender de un buscador por palabras."""
    if mode == 'semantic':
        result = await search_authorized(SearchRequest(query=objective[:200], mode='semantic', kind='capabilities', limit=20), catalog)
        matches = result['capabilities']['items']
        truncated = result['semantic_truncated'] or bool(result['capabilities']['next_cursor']) or len(objective) > 200
    else:
        matches, truncated = await search_catalog(search_terms(objective), catalog)
    truncated = truncated or len(matches) > 20
    matches = matches[:20]
    relevancia = conectores_relacionados(objective)
    allowed = {row["id"] for row in matches} | set(relevancia)
    if completo:
        allowed |= {str(connector.capability_id) for connector in BY_VERSION.values()}
    shared = SharedExecutionRepository(catalog)
    options, cursor = [], None
    conectores = {}  # capability_id → (orden, opción) de la versión más nueva
    for _ in range(2):
        page = await shared.rpc('publication_versions' if settings.PUBLICATIONS_ENABLED else 'versions', p_cursor=cursor, p_limit=100)
        for version in page["items"]:
            if version["status"] != "enabled" or version["capability_id"] not in allowed:
                continue
            # De un conector solo se ofrece su versión más nueva (las viejas siguen sirviendo a las
            # soluciones guardadas, pero a la IA la confundirían como duplicados). Su visibilidad se
            # comprueba después, en una sola consulta para todos: una por conector eran ~60 viajes.
            if version.get('contract_only') and version.get('profile') == CONNECTOR_PROFILE:
                option = {key: version[key] for key in ('id', 'capability_id', 'name', 'description')}
                option.update(publication_id=version.get('publication_id'), license=version.get('license'),
                              profile=version.get('profile'))
                option.update(version['contracts'], visibility='public')
                registrado = BY_VERSION.get(str(version['id']))
                orden = (registrado.version if registrado else 0, str(version.get('created_at')))
                previa = conectores.get(version['capability_id'])
                if previa is None or orden > previa[0]:
                    conectores[version['capability_id']] = (orden, option)
                continue
            capability = await catalog.get(UUID(version["capability_id"]))
            if version.get('contract_only'):
                option = {key: version[key] for key in ('id', 'capability_id', 'name', 'description')}
                option.update(publication_id=version.get('publication_id'), license=version.get('license'),
                              profile=version.get('profile'))
                option.update(version['contracts'], visibility=capability['visibility'])
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
    if conectores:
        # visible_to también para los conectores (son públicos), en una sola consulta.
        visibles = await catalog.visible_ids(conectores)
        conectores = {cid: valor for cid, valor in conectores.items() if str(cid) in visibles}
    # Primero los conectores, del más al menos relevante: sin auto, el chat envía solo las primeras.
    ordenados = sorted(conectores.items(), key=lambda par: -relevancia.get(par[0], 0))
    options[:0] = [option | {'review_hash': review_hash(option)} for _, (_, option) in ordenados]
    bounded_json(options, 262144 if completo else 131072)
    return {"items": options, "next_cursor": None, "search_kind": mode,
            "search_truncated": bool(cursor) or truncated}


def _campos(schema):
    return list((schema or {}).get("properties", {}))[:8]


async def elegir_piezas(objective, options, provider):
    """Paso 1: la IA ve el catálogo completo en versión corta (nombre, qué hace, qué recibe y qué
    entrega) y elige qué piezas sirven y cuántas veces. Devuelve (opciones elegidas con sus usos,
    usos por id, lo que falta). Si la selección falla, se sigue con las primeras 12 (respaldo)."""
    respaldo = options[:12], {}, "", []
    if len(options) <= 1 or not hasattr(provider, "select"):
        return respaldo
    corto = [{"id": row["id"], "nombre": row.get("name", ""), "hace": str(row.get("description") or "")[:240],
              "recibe": _campos(row.get("input_schema")), "entrega": _campos(row.get("output_schema")),
              "tipo": "conector" if row.get("profile") == CONNECTOR_PROFILE else "herramienta"} for row in options]
    try:
        eleccion = await provider.select(objective, corto)
    except HTTPException as exc:
        # Sin cuota o con la clave/modelo mal configurados, el plan tampoco podría hacerse: se informa.
        # Si Gemini solo estaba ocupado o respondió mal, se sigue con el respaldo y el plan lo intenta.
        if exc.status_code == 429 or any(motivo in str(exc.detail) for motivo in ("cuota", "configuración", "GEMINI_API_KEY")):
            raise
        return respaldo
    por_id = {row["id"]: row for row in options}
    usos, para_que = {}, {}
    for pieza in eleccion.get("piezas") or []:
        if not isinstance(pieza, dict) or pieza.get("id") not in por_id:
            continue
        identidad, cantidad = pieza["id"], pieza.get("usos")
        if not isinstance(cantidad, int) or isinstance(cantidad, bool):
            cantidad = 1
        usos[identidad] = max(1, min(MAX_NODOS, usos.get(identidad, 0) + cantidad))
        para_que[identidad] = str(pieza.get("para_que") or "")[:300]
    falta = str(eleccion.get("falta") or "").strip()[:1000]
    # La lista de verificación del pedido (cada dato, texto, idioma y envío): el plan debe cubrirla.
    requisitos = [str(r).strip()[:300] for r in (eleccion.get("requisitos") or []) if str(r).strip()][:30]
    if not usos:
        # Sin piezas (un pedido que no es una tarea, como «intenta de nuevo», o algo que no se
        # entendió): decide el paso 2 con el respaldo, que puede preguntar (clarify) o proponer crear.
        return respaldo
    # Lo que deja de exigirse (para caber en MAX_PASOS) sigue disponible, sin cantidad obligatoria.
    opcionales = (agregar_componer(usos, para_que, por_id) or set()) | recortar_usos(usos)
    elegidas = [por_id[identidad] | {"usos": usos[identidad], "para_que": para_que[identidad]}
                for identidad in list(usos)[:MAX_PASOS]]
    exigidas = {row["id"]: row["usos"] for row in elegidas}
    elegidas += [por_id[identidad] | {"para_que": para_que.get(identidad, "")}
                 for identidad in opcionales if identidad not in exigidas]
    return elegidas, exigidas, falta, requisitos


def agregar_componer(usos, para_que, por_id):
    """Regla por estructura (no por palabras): si la IA eligió escribir con IA y hay dos o más piezas
    que consultan datos, «Pedirle algo» o «Redactar» solo reciben UN dato y el resto se perdería
    (pasó con el itinerario de viaje: clima + atardecer + aire + festivos + dólar + lugares). Se
    agrega «Escribir con IA usando varios datos» para que el paso 2 pueda juntarlos."""
    clave = lambda identidad: getattr(BY_VERSION.get(identidad), "key", None)
    elegidas = [clave(identidad) for identidad in usos]
    if "componer_texto" in elegidas or not set(elegidas) & ESCRIBEN:
        return
    datos = sum(usos[identidad] for identidad in usos
                if identidad in BY_VERSION and clave(identidad) not in ESCRIBEN | ACCIONES
                and not BY_VERSION[identidad].sends_content)
    componer = next((identidad for identidad in por_id if clave(identidad) == "componer_texto"), None)
    if datos < 2 or not componer:
        return
    # El «Pedirle algo» o «Redactar» de un solo uso probablemente era el que iba a juntar los datos: ya no
    # se exige (no suma un paso: hay un máximo), pero sigue disponible. Antes se borraba, y si era otra parte
    # del pedido (la versión en inglés para la amiga) esa parte se perdía en silencio.
    sobra = next((identidad for identidad in usos if clave(identidad) in {"tarea_texto", "redactar_texto"}
                  and usos[identidad] == 1), None)
    if sobra:
        usos.pop(sobra)
    usos[componer] = 1
    para_que[componer] = "Juntar en un solo texto los datos de los otros pasos"
    return {sobra} if sobra else set()


MAX_PASOS = MAX_NODOS  # WorkflowDefinition y db/20 (execution_workflow_save)


def recortar_usos(usos):
    """Si la IA eligió más usos de los que caben (cinco idiomas × tres envíos), el plan no se podía
    armar y usos_incompletos exigía pasos imposibles. Se baja de a uno la pieza más repetida hasta
    que quepan; si aun así sobran piezas de un uso, se quitan las últimas elegidas. Solo se deja de
    EXIGIR: lo quitado se devuelve y sigue disponible para el plan, y la lista de verificación
    (requisitos_sin_cubrir) avisa si por eso queda algo del pedido sin cumplir."""
    quitadas = set()
    while sum(usos.values()) > MAX_PASOS:
        mayor = max(usos, key=usos.get)
        if usos[mayor] > 1:
            usos[mayor] -= 1
            continue
        # Nunca se quitan los envíos ni la IA que junta los datos: son lo que la persona pidió recibir.
        clave = lambda identidad: getattr(BY_VERSION.get(identidad), "key", None)
        prescindibles = [i for i in usos if clave(i) not in ACCIONES | {"componer_texto"}] or list(usos)
        usos.pop(prescindibles[-1])
        quitadas.add(prescindibles[-1])
    return quitadas


def reparar_plan(definition, options):
    """Arreglos seguros antes de revisar el plan, con los contratos de cada pieza: opciones que faltan
    con su valor por defecto, «Cajeros» → «cajero», «300» → 300, entradas que la pieza no tiene fuera y,
    si un campo tiene valor fijo y además conexión, gana la conexión. Lo que no se puede arreglar sin
    adivinar se deja: la validación lo explica y la IA lo corrige en el siguiente intento."""
    contratos = {str(row["id"]): row for row in options}
    for node in definition.nodes:
        row = contratos.get(str(node.version_id))
        if not row:
            continue
        entrada = row.get("input_schema") or {}
        node.parameters = ajustar_objeto(row.get("parameter_schema") or {}, dict(node.parameters or {}), defaults=True)
        if entrada.get("additionalProperties") is False:
            node.bindings = {campo: b for campo, b in node.bindings.items() if campo in entrada.get("properties", {})}
        node.values = ajustar_objeto(entrada, {k: v for k, v in node.values.items() if k not in node.bindings})
        # Una fecha OPCIONAL vacía es «hoy» al ejecutar. Si la IA escribe la de hoy («2026-11-21» en «avísame si
        # el dólar pasa de 5.000 hoy»), al repetirse cada día consultaría siempre el día en que se planeó.
        from connectors.fechas import hoy_colombia
        hoy = hoy_colombia().isoformat()
        requeridos = set(entrada.get("required") or [])
        for campo in [c for c in node.values if "fecha" in c and c not in requeridos]:
            if str(node.values[campo]).strip()[:10] == hoy:
                node.values.pop(campo)


VERSIONES_POSTER = ("poster", "poster_alternativo")
ENVIOS_DE_ARCHIVO = {"enviar_telegram", "enviar_correo", "guardar_drive"}


def entregar_versiones(definition):
    """Lo que la persona ve en Capacita y lo que le llega debe ser lo mismo. El póster sale en dos
    versiones: cada envío que lleva la versión 1 (Telegram, correo, Drive) recibe un gemelo con la
    versión 2, y las salidas se nombran poster_version_1 y poster_version_2 (en ese orden también en
    la web, que ordena por nombre: antes «alternativo» salía primero y a Telegram llegaba la otra)."""
    from schemas.workflows import Binding
    clave = lambda nodo: getattr(BY_VERSION.get(str(nodo.version_id)), "key", None)
    posters = {nodo.id for nodo in definition.nodes if clave(nodo) == "poster_promocional"}
    if not posters:
        return
    ids = {nodo.id for nodo in definition.nodes}
    nuevos = []
    for nodo in list(definition.nodes):
        origen = nodo.bindings.get("archivo")
        if clave(nodo) not in ENVIOS_DE_ARCHIVO or not origen or origen.source not in posters or origen.field != "poster":
            continue
        ya = any(clave(otro) == clave(nodo) and (otro.bindings.get("archivo") or origen).source == origen.source
                 and (otro.bindings.get("archivo") or origen).field == "poster_alternativo" for otro in definition.nodes)
        if ya or len(definition.nodes) + len(nuevos) >= MAX_NODOS:
            continue
        gemelo = nodo.model_copy(deep=True)
        base = f"{nodo.id[:58]}_v2"
        gemelo.id = base if base not in ids else f"{nodo.id[:55]}_v2_{len(nuevos)}"
        ids.add(gemelo.id)
        gemelo.label = f"{nodo.label[:66]} (versión 2)"
        gemelo.bindings["archivo"] = Binding(source=origen.source, field="poster_alternativo")
        mensaje = gemelo.bindings.get("mensaje")
        if mensaje and mensaje.source in posters:  # la leyenda del gemelo no repite el resumen
            gemelo.bindings.pop("mensaje")
            gemelo.values["mensaje"] = "Versión 2 del póster: elige la que más te guste."
        for campo in ("nombre_archivo", "asunto"):
            if isinstance(gemelo.values.get(campo), str):
                gemelo.values[campo] = f"{gemelo.values[campo][:180]} (versión 2)"
        nuevos.append((nodo.id, gemelo))
    for anterior, gemelo in nuevos:
        definition.nodes.insert(next(i for i, n in enumerate(definition.nodes) if n.id == anterior) + 1, gemelo)
    # Salidas: las dos versiones con nombres fijos y ordenados; el resto se conserva.
    poster = sorted(posters)[0]
    salidas = {k: b for k, b in definition.outputs.items()
               if not (b.source in posters and b.field in VERSIONES_POSTER)}
    for numero, campo in enumerate(VERSIONES_POSTER, 1):
        salidas[f"poster_version_{numero}"] = Binding(source=poster, field=campo)
    definition.outputs = dict(list(salidas.items())[-32:])


def errores_del_plan(error):
    """Los errores de esquema del plan en frases cortas para devolvérselos a la IA."""
    frases = []
    for detalle in error.errors()[:6]:
        lugar = ".".join(str(parte) for parte in detalle.get("loc", ()))
        frases.append(f"{lugar}: {detalle.get('msg', '')}")
    texto = "; ".join(frases)
    if "nodes" in texto and f"at most {MAX_PASOS}" in texto:
        texto += (f". Máximo {MAX_PASOS} pasos: quita consultas redundantes (por ejemplo, si ya conviertes el monto no hace "
                  "falta otro paso de TRM) o junta los textos en un solo paso de IA.")
    return texto[:1500]


def usos_incompletos(definition, usos, options):
    """Piezas que el paso 1 eligió N veces y el plan usa menos: el error para que la IA lo corrija."""
    conteo = {}
    for node in definition.nodes:
        conteo[str(node.version_id)] = conteo.get(str(node.version_id), 0) + 1
    nombres = {row["id"]: row.get("name", "una pieza") for row in options}
    faltan = [f"«{nombres.get(identidad, identidad)}» debía usarse {cantidad} veces y aparece {conteo.get(identidad, 0)}"
              for identidad, cantidad in usos.items() if conteo.get(identidad, 0) < cantidad]
    if not faltan:
        return None
    return ("El plan no cubre todo el pedido: " + "; ".join(faltan) + ". Agrega los pasos que faltan, cada uno "
            "con su propio id y conectado a lo que le corresponde (por ejemplo, cada traducción a su correo).")


CORREO = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
# Idiomas que un requisito puede pedir (sin tildes) y cómo pueden aparecer en el plan.
IDIOMAS = {"ingles": ("ingles", "english"), "frances": ("frances", "french", "francais"),
           "italiano": ("italiano", "italian"), "portugues": ("portugues", "portuguese"),
           "aleman": ("aleman", "german", "deutsch"), "chino": ("chino", "chinese", "mandarin"),
           "japones": ("japones", "japanese"), "coreano": ("coreano", "korean"), "ruso": ("ruso", "russian"),
           "arabe": ("arabe", "arabic"), "neerlandes": ("neerlandes", "holandes", "dutch")}


def _plano(texto):
    return unicodedata.normalize("NFD", str(texto)).encode("ascii", "ignore").decode().lower()


def requisitos_sin_cubrir(definition, requisitos, cobertura):
    """Lista de verificación revisada sin IA, válida para cualquier pedido: cada requisito debe tener al
    menos un paso real que lo cumpla; si nombra un correo, entre sus pasos debe estar el envío con ese
    «para»; si nombra un idioma, ese idioma debe aparecer en sus pasos o en los que les dan el texto.
    Devuelve [(n, requisito, qué falta)]."""
    pasos = {node.id: node for node in definition.nodes}
    por_numero = {}
    for item in cobertura:
        por_numero.setdefault(item.n, set()).update(p for p in item.pasos if p in pasos)
    if not por_numero:
        # La IA no llenó cobertura: no se acusa todo de faltar; se revisan correos e idiomas en el plan entero.
        por_numero = {n: set(pasos) for n in range(1, len(requisitos) + 1)}
    correos_del_plan = {str(node.values.get("para") or "").lower() for node in definition.nodes
                        if getattr(BY_VERSION.get(str(node.version_id)), "key", None) == "enviar_correo"}
    faltan = []
    for n, requisito in enumerate(requisitos, 1):
        cubren = por_numero.get(n, set())
        if not cubren:
            faltan.append((n, requisito, "ningún paso lo cumple"))
            continue
        # Los pasos que lo cumplen y los anteriores que les dan datos (la traducción antes del correo).
        cadena, pendientes = set(), list(cubren)
        while pendientes:
            actual = pendientes.pop()
            if actual in cadena or actual not in pasos:
                continue
            cadena.add(actual)
            pendientes.extend(b.source for b in pasos[actual].bindings.values() if b.source != "$input")
        for correo in CORREO.findall(requisito):
            if correo.lower() not in correos_del_plan:
                faltan.append((n, requisito, f"falta el paso de correo con values.para = {correo}"))
        texto_req = _plano(requisito)
        contenido = _plano(json.dumps([[pasos[p].label, pasos[p].parameters, pasos[p].values] for p in cadena],
                                      ensure_ascii=False, default=str))
        for idioma, formas in IDIOMAS.items():
            if re.search(rf"\b{idioma}\b", texto_req) and not any(forma in contenido for forma in formas):
                faltan.append((n, requisito, f"ningún paso escribe o traduce en {idioma}"))
    return faltan


# Pasos de IA que escriben el texto final y el campo donde va su orden (con el largo que acepta al ejecutar).
REDACTORES = {"componer_texto": ("instruccion", 2000), "tarea_texto": ("instruccion", 1000),
              "redactar_texto": ("indicaciones", 4000)}
MARCA_PUNTOS = ("Puntos del pedido que este texto debe cubrir (responde de forma directa los que piden un dato o una "
                "respuesta; intégralos de forma natural, sin copiar esta lista):")
# Pasos que ya entregan un texto escrito: lo que cubren es de ellos, no del paso que recibe su texto.
ESCRITORES = set(REDACTORES) | {"resumir_texto", "traducir_texto"}


def puntos_para_redactar(definition, requisitos, cobertura):
    """Cada paso que escribe recibe, junto a su orden, los requisitos que cumplen él mismo o los pasos que le
    dan datos. La IA del plan resumía «si el lunes es festivo» como «arma un itinerario con todo eso» y la
    pregunta se perdía al escribir aunque el dato llegara. Los requisitos de pasos posteriores (el envío, la
    traducción) no se le pasan: no son tarea de ese texto. El recorrido se detiene en otro paso que escribe:
    la traducción recibe «escribe la versión en inglés», no «arma el itinerario» (ya lo hizo el anterior).
    Sin cobertura no se adivina nada."""
    pasos = {node.id: node for node in definition.nodes}
    clave = lambda paso: getattr(BY_VERSION.get(str(paso.version_id)), "key", None)
    por_numero = {}
    for item in cobertura:
        por_numero.setdefault(item.n, set()).update(p for p in item.pasos if p in pasos)
    if not por_numero:
        return
    for node in definition.nodes:
        campo, maximo = REDACTORES.get(clave(node), (None, 0))
        orden = node.values.get(campo) if campo else None
        if not isinstance(orden, str) or campo in node.bindings or MARCA_PUNTOS in orden:
            continue
        antes, pendientes = set(), [node.id]
        while pendientes:
            actual = pendientes.pop()
            if actual in antes or actual not in pasos or (actual != node.id and clave(pasos[actual]) in ESCRITORES):
                continue
            antes.add(actual)
            pendientes.extend(b.source for b in pasos[actual].bindings.values() if b.source != "$input")
        # Fuera los envíos («envíalo por Telegram» es tarea del envío) y lo que solo cumple una condición
        # («revisar si llueve» es un control, no contenido): una promoción no debe responderlos como lista.
        puntos = [requisito for n, requisito in enumerate(requisitos, 1)
                  if not any(clave(pasos[p]) in ACCIONES for p in por_numero.get(n, set()))
                  and any(clave(pasos[p]) != "revisar_condicion" for p in por_numero.get(n, set()) & antes)]
        texto = orden.rstrip() + "\n\n" + MARCA_PUNTOS
        agregados = 0
        for punto in puntos:
            linea = f"\n- {punto}"
            if len(texto) + len(linea) > maximo:
                break
            texto, agregados = texto + linea, agregados + 1
        if agregados:
            node.values[campo] = texto


PALABRA = re.compile(r"[a-z0-9@.]{4,}")


def declarado_pendiente(requisito, pendientes):
    """¿La IA ya dijo que ese requisito no se puede? (sus pendientes son texto libre: se comparan las
    palabras de 4+ letras, sin tildes; basta con que la mayoría del requisito aparezca en un pendiente)."""
    palabras = set(PALABRA.findall(_plano(requisito)))
    return bool(palabras) and any(len(palabras & set(PALABRA.findall(_plano(p)))) >= 0.6 * len(palabras)
                                  for p in pendientes)


def exigibles(faltan, pendientes):
    """Lo que falta y SÍ se debe exigir. Un requisito sin pasos que la IA ya declaró imposible en pendientes
    no se le vuelve a exigir: hacerlo la presionaba a simular el dato (el mismo conversor de hoy para «hace
    un año») o a bloquear todo el pedido. Los correos e idiomas siempre se exigen: tienen pieza."""
    return [f for f in faltan if not (f[2] == "ningún paso lo cumple" and declarado_pendiente(f[1], pendientes))]


def sin_cubrir_como_error(faltan):
    lineas = "; ".join(f"requisito {n} «{texto}»: {motivo}" for n, texto, motivo in faltan[:8])
    return ("El plan no cumple todo lo que pidió la persona: " + lineas + ". Agrega los pasos que faltan (cada uno con "
            "su id, conectado a lo que le corresponde) y ponlos en cobertura. Si no caben en 20 pasos, quita "
            "primero consultas redundantes; si aun así no cabe, ponlo en pendientes y dilo en explanation.")[:1500]


async def planear(objective, options, provider, validar, user_id, auto=True, limits=limiter):
    """Núcleo del planner, igual para la web y para el bot de Telegram: paso 1 (elegir piezas y la lista de
    verificación), paso 2 (plan) con hasta tres intentos corregidos y la revisión de que nada del pedido
    se pierda. validar(definition) devuelve {"order": [...]} o lanza HTTPException (404/409/422)."""
    selected = {row["id"] for row in options}
    validation, feedback, usos, requisitos, parcial = None, None, {}, [], False
    # Gemini a veces conecta mal los puertos: se le devuelve el error exacto y se reintenta una
    # vez, dentro del mismo turno del limitador (un pedido de la persona = un intento).
    limits.start(user_id)
    try:
        if auto:
            # Paso 1: la IA elige entre TODO lo disponible qué piezas sirven y cuántas veces.
            options, usos, _, requisitos = await elegir_piezas(objective, options, provider)
            selected = {row["id"] for row in options}
        bounded_json({"objective": objective, "versions": options}, 65536)
        for attempt in range(3):
            try:
                extra = ({"feedback": feedback} if feedback else {}) | ({"requisitos": requisitos} if requisitos else {})
                raw = await provider.plan(objective, options, **extra)
                proposal = PlannerProposal.model_validate(raw)
            except ValidationError as error:
                # Antes se cortaba aquí sin reintentar (un plan de 13 pasos terminaba en la fábrica).
                if attempt < 2:
                    feedback = "El plan no cumple el formato: " + errores_del_plan(error)
                    continue
                raise HTTPException(502, "La IA devolvió un plan inválido; no se guardó ni ejecutó") from None
            if not proposal.definition:
                # «blocked» en un pedido de varias partes suele bloquear TODO por una sola parte imposible
                # (los 50 euros de hoy sí se pueden; los de hace un año no). Una vez se le pide hacer lo
                # posible. «create» no se toca: es el camino para crear la herramienta que falta.
                partes = requisitos or proposal.requisitos
                if proposal.decision == "blocked" and len(partes) > 1 and attempt < 2 and not parcial:
                    parcial = True
                    feedback = ("Elegiste blocked, pero el pedido tiene varias partes y algunas sí se pueden hacer con "
                                "las versiones. Haz compose con las partes posibles y pon SOLO lo imposible en "
                                "pendientes" + (f" ({'; '.join(proposal.pendientes)[:300]})" if proposal.pendientes else "")
                                + ", diciéndolo en explanation. Si de verdad no se puede nada, vuelve a elegir blocked.")
                    continue
                break
            ajenas = {str(node.version_id) for node in proposal.definition.nodes} - selected
            if ajenas:
                if attempt < 2:
                    # Suele pasar cuando falta una pieza (un dato histórico, un servicio sin conector): la IA
                    # inventa un id en vez de admitirlo. Se le dice qué hacer con esa parte.
                    feedback = ("Usaste version_id que no están en versions: " + ", ".join(sorted(ajenas))[:400]
                                + ". Usa solo los id de versions. Si ninguna versión sirve para una parte del pedido, "
                                "quita esa parte del plan, ponla en pendientes y dilo en explanation.")
                    continue
                raise HTTPException(502, "No pude armar un plan con las piezas disponibles: una parte de tu pedido "
                                         "necesita algo que Capacita aún no tiene. Pídelo por partes o de otra forma.")
            reparar_plan(proposal.definition, options)
            entregar_versiones(proposal.definition)  # lo que ves en Capacita = lo que te llega
            if destinatarios_no_escritos(proposal.definition, objective):
                aviso = "No vi esa dirección de correo escrita en tu pedido, así que el correo te llega a ti. "
                proposal.explanation = (aviso + proposal.explanation)[:1200]
            # Lista de verificación: la del paso 1 o, si no hubo, la que escribió la IA al planear.
            lista = requisitos or proposal.requisitos
            faltan = requisitos_sin_cubrir(proposal.definition, lista, proposal.cobertura) if lista else []
            # Con lista de verificación, ella manda: el conteo de usos del paso 1 es solo una guía. Exigirlo
            # aparte hacía que, si el paso 1 contaba de más, el plan inventara pasos («convertir a pesos
            # mexicanos» en un pedido de euros y pesos colombianos) para llegar al número.
            exigir_usos = None if lista else usos_incompletos(proposal.definition, usos, options)
            por_exigir = exigibles(faltan, proposal.pendientes)  # lo declarado imposible se avisa, no se exige
            logica = (revision_logica(proposal.definition) or exigir_usos
                      or (sin_cubrir_como_error(por_exigir) if por_exigir else None))
            if logica and attempt < 2:
                feedback = logica
                continue
            puntos_para_redactar(proposal.definition, lista, proposal.cobertura)
            try:
                validation = await validar(proposal.definition)
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
            # Lo que no se pudo cumplir se le dice a la persona antes de aprobar, nunca se calla.
            proposal.requisitos = lista
            # Sin repetir: lo que la IA ya declaró con sus palabras no se agrega otra vez con las del requisito.
            pendientes = list(dict.fromkeys(proposal.pendientes + [texto for _, texto, _ in faltan
                                                                   if not declarado_pendiente(texto, proposal.pendientes)]))[:30]
            proposal.pendientes = pendientes
            if pendientes:
                aviso = "Ojo: este plan no cumple todo lo que pediste. Falta: " + "; ".join(pendientes)
                proposal.explanation = (aviso[:600] + ". " + proposal.explanation)[:1200]
            break
    finally:
        limits.finish(user_id)
    return proposal, validation


async def propose_plan(request, catalog, provider, limits=limiter):
    if not request.consent_to_provider:
        raise HTTPException(422, "Autoriza enviar el objetivo y los nombres, descripciones y contratos seleccionados a Gemini")
    available = await planner_options(request.objective, catalog, mode=request.mode, completo=request.auto)
    selected = set(map(str, request.version_ids))
    options = [row for row in available["items"] if row["id"] in selected]
    if len(options) != len(selected):
        raise HTTPException(409, "Una versión seleccionada ya no está disponible en la búsqueda; vuelve a buscar")
    reviewed = {str(identity): value for identity, value in request.version_hashes.items()}
    if any(reviewed[row["id"]] != review_hash(row) for row in options):
        raise HTTPException(409, "Los contratos o metadatos seleccionados cambiaron; vuelve a buscar y revisa antes de autorizar")
    options = [{key: value for key, value in row.items() if key != "review_hash"} for row in options]
    proposal, validation = await planear(request.objective, options, provider, lambda d: check_workflow(d, catalog),
                                         catalog.user_id, auto=request.auto, limits=limits)
    return {"proposal": proposal.model_dump(mode="json"), "validation": validation,
            "search_truncated": available["search_truncated"], "saved": False, "executed": False}
