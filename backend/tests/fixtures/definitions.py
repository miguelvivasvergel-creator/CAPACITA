"""Definición de referencia compartida por pruebas de contratos y HTTP."""


def definition():
    return {
        "name": "Limpiar datos", "description": "Quita espacios sobrantes del texto recibido.",
        "category": "Texto", "input_type": "texto", "output_type": "texto",
        "input_schema": {"type": "object", "properties": {"texto": {"type": "string"}}, "required": ["texto"], "additionalProperties": False},
        "parameter_schema": {"type": "object", "properties": {"mayusculas": {"type": "boolean"}}, "additionalProperties": False},
        "output_schema": {"type": "object", "properties": {"resultado": {"type": "string"}}, "required": ["resultado"], "additionalProperties": False},
        "constraints": ["Conservar los acentos"], "required_permissions": [],
        "resources": [], "failure_cases": ["Rechazar entradas sin texto"],
        "examples": [{"inputs": {"texto": "  Árbol "}, "parameters": {"mayusculas": False}, "expected_output": {"resultado": "Árbol"}}],
    }
