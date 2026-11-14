"""Borrador del intérprete para pruebas; no es una respuesta real ni fallback."""


def objective_draft():
    return {
        "name": "Normalizar espacios", "description": "Quita espacios exteriores y conserva interiores y acentos.",
        "category": "Texto", "input_type": "texto", "output_type": "texto",
        "inputs": [{"name": "texto", "description": "Texto recibido", "type": "string", "required": True}],
        "parameters": [],
        "outputs": [{"name": "resultado", "description": "Texto limpio", "type": "string", "required": True}],
        "constraints": ["Conservar espacios interiores y acentos"],
        "required_permissions": [], "resources": [], "failure_cases": ["Rechazar entrada sin texto"],
        "example_inputs_json": '{"texto":"  Árbol  azul "}',
        "example_parameters_json": '{}', "example_output_json": '{"resultado":"Árbol  azul"}',
    }
