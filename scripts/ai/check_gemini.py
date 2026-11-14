"""Comprueba acceso al modelo sin generar contenido ni imprimir credenciales."""
from pathlib import Path
import sys
import argparse
import asyncio
from uuid import uuid4

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "backend"))
from core.config import settings
from fastapi import HTTPException
from providers.gemini import GeminiProvider
from schemas.definitions import CapabilityDefinition
from services.candidate_preparation import prepare_candidate
from schemas.objectives import ObjectiveRequest, draft_to_definition
from services.contract_validation import validate_definition


async def interpret_example():
    request = ObjectiveRequest(
        objective="Recibir un texto, quitar espacios de los extremos y conservar espacios interiores y acentos. Devolver el texto limpio, sin parámetros configurables.",
        consent_to_provider=True,
    )
    try:
        result = await GeminiProvider().interpret(request)
        print(f"Interpretación real de ejemplo público: {result.decision}; modelo={settings.GEMINI_MODEL}")
        if result.decision == "define":
            definition = draft_to_definition(result.draft)
            print(f"Contratos/ejemplo consistentes; SHA-256 definición: {validate_definition(definition)}")
        else:
            print(f"Preguntas pendientes: {len(result.questions)}")
        print("Prueba aislada del proveedor: sin consultar catálogo, guardar ni ejecutar código.")
        return 0
    except HTTPException as error:
        print(f"Interpretación no completada: HTTP {error.status_code}; {error.detail}")
    except (ValueError, TypeError, RecursionError):
        print("Interpretación no completada: contratos/ejemplo no válidos; respuesta oculta.")
    return 1


async def generate_example():
    definition = CapabilityDefinition(
        name="Normalizar espacios", description="Elimina espacios de los extremos y conserva acentos e interiores.",
        category="Texto", input_type="texto", output_type="texto",
        input_schema={"type": "object", "properties": {"texto": {"type": "string"}}, "required": ["texto"], "additionalProperties": False},
        output_schema={"type": "object", "properties": {"resultado": {"type": "string"}}, "required": ["resultado"], "additionalProperties": False},
        constraints=["Conservar espacios interiores y acentos"],
        examples=[{"inputs": {"texto": "  Árbol  azul "}, "expected_output": {"resultado": "Árbol  azul"}}],
    )
    try:
        proposal = await GeminiProvider().generate(definition)
        candidate = prepare_candidate(uuid4(), definition, proposal)
        print(f"OK: generación real y preparación estática; modelo={settings.GEMINI_MODEL}")
        print(f"Código UTF-8: {len(proposal.source.encode('utf-8'))} bytes; SHA-256: {candidate.artifact_hash}")
        print("Ejemplo público sin datos privados. No se ejecutó código ni se guardó un candidato persistente.")
        return 0
    except HTTPException as error:
        print(f"Generación no completada: HTTP {error.status_code}; {error.detail}")
        return 1


def main():
    key = settings.GEMINI_API_KEY.get_secret_value()
    if not key:
        print("Falta GEMINI_API_KEY en backend/.env")
        return 1
    try:
        response = httpx.get(
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}",
            headers={"x-goog-api-key": key}, timeout=15, follow_redirects=False,
        )
        print(f"Consulta de modelo Gemini: HTTP {response.status_code}")
        if response.status_code == 200:
            methods = response.json().get("supportedGenerationMethods", [])
            print(f"Modelo configurado: {settings.GEMINI_MODEL}; generateContent: {'generateContent' in methods}")
            print("Esto comprueba acceso a metadatos; no confirma cuota de generación ni nivel de facturación.")
            return 0
        print("No se muestran cuerpos del proveedor. Revisar clave, restricciones y disponibilidad del modelo.")
        error = response.json().get("error", {})
        known_reasons = {"API_KEY_INVALID", "API_KEY_EXPIRED", "API_KEY_SERVICE_BLOCKED", "API_KEY_HTTP_REFERRER_BLOCKED", "SERVICE_DISABLED", "BILLING_DISABLED"}
        for detail in error.get("details", []):
            reason = detail.get("reason") if isinstance(detail, dict) else None
            if reason in known_reasons:
                print(f"Motivo del proveedor: {reason}")
    except (httpx.RequestError, ValueError):
        print("No se pudo consultar Gemini: fallo de conexión o respuesta inválida. Valor de clave oculto.")
    return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    examples = parser.add_mutually_exclusive_group()
    examples.add_argument("--generate-example", action="store_true", help="Una generación acotada con ejemplo público; consume cuota del proveedor, sin ejecutar código")
    examples.add_argument("--interpret-example", action="store_true", help="Una interpretación acotada con ejemplo público; consume cuota, sin guardado ni código")
    args = parser.parse_args()
    sys.exit(asyncio.run(interpret_example()) if args.interpret_example else asyncio.run(generate_example()) if args.generate_example else main())
