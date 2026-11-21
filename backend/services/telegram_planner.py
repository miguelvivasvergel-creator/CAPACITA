"""Planner del bot de Telegram: el MISMO núcleo que la web (planner_service.planear, con la lista de
verificación) sobre las versiones que el dueño del chat puede usar.

Las versiones llegan del SQL 21 (telegram_planner_versions: propias o publicadas y disponibles para ese
dueño, igual que los asistentes de db/17). Los conectores se toman del registro revisado y solo si su
artifact_hash coincide con el publicado; las herramientas propias pasan por validate_manifest. La
validación del plan es la de siempre (compile_workflow) con esa misma foto de versiones."""
from fastapi import HTTPException

from connectors import BY_VERSION, PROFILE as CONNECTOR_PROFILE
from services.build_validation import validate_manifest
from services.planner_service import planear
from services.workflow_validation import compile_workflow

CONTRATOS = ("input_schema", "parameter_schema", "output_schema")


def opciones_y_versiones(items):
    """(opciones para el planner, foto de versiones para compile_workflow) desde las filas del SQL 21.
    De cada conector se ofrece solo su versión más nueva (como en planner_options)."""
    conectores, propias, versiones = {}, [], {}
    for item in items or []:
        if not isinstance(item, dict) or not item.get("id"):
            continue
        identidad = str(item["id"])
        versiones[identidad] = {"status": "enabled", "publication_id": item.get("publication_id"),
                                "manifest": item.get("manifest"), "profile": item.get("profile"),
                                "artifact_hash": item.get("artifact_hash"), "definition_hash": item.get("definition_hash")}
        conector = BY_VERSION.get(identidad)
        if conector is not None:
            if conector.artifact_hash != item.get("artifact_hash"):
                continue  # el registro y lo publicado no coinciden: no se ofrece
            previa = conectores.get(str(conector.capability_id))
            if previa is None or conector.version > previa[0].version:
                conectores[str(conector.capability_id)] = (conector, identidad)
            continue
        try:
            definicion = validate_manifest(item.get("manifest")).definition
        except Exception:
            continue  # una versión que no valida no se ofrece (la web respondería 409)
        propias.append({"id": identidad, "capability_id": str(item.get("capability_id")), "name": definicion.name,
                        "description": definicion.description, "profile": item.get("profile"),
                        "visibility": "private" if item.get("own") else "public",
                        **{clave: getattr(definicion, clave) for clave in CONTRATOS}})
    opciones = [{"id": identidad, "capability_id": str(conector.capability_id), "name": conector.definition["name"],
                 "description": conector.definition["description"], "profile": CONNECTOR_PROFILE, "visibility": "public",
                 **{clave: conector.definition[clave] for clave in CONTRATOS}}
                for conector, identidad in conectores.values()]
    return opciones + propias, versiones


async def planear_pedido(objetivo, items, provider, chat_id, limits):
    """(propuesta, foto de versiones). Lanza HTTPException con mensajes en español (cuota, IA ocupada…)."""
    opciones, versiones = opciones_y_versiones(items)
    if not opciones:
        raise HTTPException(503, "No encontré piezas disponibles para tu cuenta. Revisa Capacita en la web.")

    async def validar(definition):
        _, orden = compile_workflow(definition.model_dump(mode="json"), versiones)
        return {"valid": True, "order": orden}

    propuesta, _ = await planear(str(objetivo)[:2000], opciones, provider, validar, f"telegram:{chat_id}",
                                 auto=True, limits=limits)
    return propuesta, versiones
