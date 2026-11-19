"""Interpretación editable de una necesidad; no es un workflow ni un plan ejecutable."""
import json
from typing import Annotated, Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from schemas.capabilities import CapabilityListResponse, TipoDato
from schemas.definitions import CapabilityDefinition, TextItem
from services.contract_validation import validate_definition

FieldType = Literal["string", "number", "integer", "boolean", "array", "object"]
ItemType = Literal["string", "number", "integer", "boolean", "object"]
# Un campo archivo viaja como texto base64; el tipo indica el formato.
FileType = Literal["", "foto", "png", "pdf", "word", "excel"]
MEDIA_TYPES = {
    "foto": "image/jpeg", "png": "image/png", "pdf": "application/pdf",
    "word": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


class ClarificationAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    question: str = Field(min_length=1, max_length=500)
    answer: str = Field(min_length=1, max_length=1000)


class ObjectiveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    objective: str = Field(min_length=10, max_length=2000)
    clarifications: list[ClarificationAnswer] = Field(default_factory=list, max_length=6)
    consent_to_provider: bool = False
    # Lo que ya investigó el chat al empezar (POST /objectives/research): se usa sin buscar de nuevo.
    research_summary: str | None = Field(default=None, min_length=1, max_length=4000)


class DraftField(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(pattern=r"^[A-Za-z][A-Za-z0-9_]{0,63}$")
    description: str = Field(default="", max_length=500)
    type: FieldType
    required: bool = True
    items_type: ItemType = "string"
    file: FileType = ""
    # Personalización: valores fijos para elegir (plantilla, estilo…) y escalas numéricas.
    options: list[Annotated[str, Field(min_length=1, max_length=60)]] = Field(default_factory=list, max_length=12)
    minimum: float | None = None
    maximum: float | None = None


class DefinitionDraft(BaseModel):
    """Formato visual acotado: no se pierden reglas al cargar el editor existente."""
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=5, max_length=500)
    category: str = Field(min_length=1, max_length=50)
    input_type: TipoDato
    output_type: TipoDato
    inputs: list[DraftField] = Field(max_length=16)
    parameters: list[DraftField] = Field(max_length=16)
    outputs: list[DraftField] = Field(max_length=16)
    constraints: list[TextItem] = Field(default_factory=list, max_length=20)
    required_permissions: list[TextItem] = Field(default_factory=list, max_length=20)
    resources: list[TextItem] = Field(default_factory=list, max_length=20)
    failure_cases: list[TextItem] = Field(default_factory=list, max_length=20)
    example_inputs_json: str = Field(max_length=16000)
    example_parameters_json: str = Field(max_length=16000)
    example_output_json: str = Field(max_length=16000)


class ObjectiveInterpretation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    decision: Literal["clarify", "define", "blocked"]
    explanation: str = Field(min_length=1, max_length=500)
    questions: list[Annotated[str, Field(min_length=1, max_length=500)]] = Field(default_factory=list, max_length=3)
    draft: DefinitionDraft | None = None

    @model_validator(mode="after")
    def consistent_decision(self):
        if self.decision == "define":
            if self.draft is None or self.questions:
                raise ValueError("Define requiere borrador sin preguntas pendientes")
        elif self.draft is not None or (self.decision == "clarify" and not self.questions):
            raise ValueError("Aclarar/bloquear no puede inventar una definición completa")
        return self


class AdjustRequest(BaseModel):
    """Ajuste conversado de las opciones de una herramienta ya creada («ponle 30 %»).

    Solo viajan la frase, el contrato de opciones y sus valores actuales: nunca los
    archivos ni las entradas de la persona.
    """
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    request: str = Field(min_length=1, max_length=500)
    tool_name: str = Field(min_length=1, max_length=80)
    tool_description: str = Field(default="", max_length=500)
    parameter_schema: dict
    current: dict = Field(default_factory=dict)
    consent_to_provider: bool = False

    @model_validator(mode="after")
    def bounded_contract(self):
        from jsonschema import Draft202012Validator
        from jsonschema.exceptions import SchemaError
        if len(json.dumps(self.parameter_schema)) > 16000 or len(json.dumps(self.current)) > 16000:
            raise ValueError("Opciones demasiado grandes")
        schema = self.parameter_schema
        if schema.get("type") != "object" or not isinstance(schema.get("properties"), dict) or not schema["properties"]:
            raise ValueError("La herramienta no tiene opciones ajustables")
        try:
            Draft202012Validator.check_schema(schema)
        except SchemaError:
            raise ValueError("Contrato de opciones inválido") from None
        if any(isinstance(spec, dict) and spec.get("contentEncoding") for spec in schema["properties"].values()):
            raise ValueError("Las opciones no pueden ser archivos")
        return self


class AdjustProposal(BaseModel):
    """Lo que devuelve la IA; los valores se validan después contra el contrato."""
    model_config = ConfigDict(extra="forbid")
    decision: Literal["adjust", "improve", "new"]
    explanation: str = Field(min_length=1, max_length=300)
    parameters_json: str = Field(default="{}", max_length=16000)


class AdjustResponse(BaseModel):
    decision: Literal["adjust", "improve", "new"]
    explanation: str
    parameters: dict | None = None


class ResearchSource(BaseModel):
    title: str = Field(max_length=300)
    uri: str = Field(max_length=2000, pattern=r"^https://")


class ResearchResult(BaseModel):
    """Lo que encontró la búsqueda web para hacer bien la tarea; se muestra tal cual y no se guarda."""
    summary: str = Field(min_length=1, max_length=4000)
    queries: list[Annotated[str, Field(max_length=300)]] = Field(default_factory=list, max_length=10)
    sources: list[ResearchSource] = Field(default_factory=list, max_length=10)
    # HTML de «Search Suggestions» que Google exige mostrar junto a resultados con búsqueda.
    suggestions_html: str = Field(default="", max_length=60000)


class ObjectiveResponse(BaseModel):
    interpretation: ObjectiveInterpretation
    research: ResearchResult | None = None
    definition: CapabilityDefinition | None = None
    definition_hash: str | None = None
    matches: CapabilityListResponse
    search_kind: Literal["text"] = "text"
    search_queries: list[str]
    search_truncated: bool = False
    implementation_verified: Literal[False] = False


def draft_to_definition(draft: DefinitionDraft) -> CapabilityDefinition:
    def contract(fields):
        names = [field.name for field in fields]
        if len(names) != len(set(names)):
            raise ValueError("Nombres de campo repetidos")
        return {
            "type": "object",
            "properties": {field.name: {
                "type": "string" if field.file else field.type,
                **({"description": field.description} if field.description else {}),
                **({"items": {"type": field.items_type}} if field.type == "array" and not field.file else {}),
                **({"contentEncoding": "base64", "contentMediaType": MEDIA_TYPES[field.file]} if field.file else {}),
                **({"enum": list(dict.fromkeys(field.options))} if field.options and field.type == "string" and not field.file else {}),
                **({key: getattr(field, key) for key in ("minimum", "maximum") if getattr(field, key) is not None}
                   if field.type in ("number", "integer") and not field.file else {}),
            } for field in fields},
            "required": [field.name for field in fields if field.required],
            "additionalProperties": False,
        }
    inputs, parameters = list(draft.inputs), list(draft.parameters)
    example_inputs, example_parameters = json.loads(draft.example_inputs_json), json.loads(draft.example_parameters_json)
    # Un archivo (logo, plantilla…) nunca es una opción: se pasa a entradas opcionales para que
    # la persona lo pueda subir y la prueba lo use con un archivo de muestra.
    if isinstance(example_inputs, dict) and isinstance(example_parameters, dict):
        for field in [field for field in parameters if field.file]:
            parameters.remove(field)
            inputs.append(field.model_copy(update={"required": False}))
            if field.name in example_parameters:
                example_inputs[field.name] = example_parameters.pop(field.name)
    data = draft.model_dump(exclude={"inputs", "parameters", "outputs", "example_inputs_json", "example_parameters_json", "example_output_json"})
    data.update(
        input_schema=contract(inputs), parameter_schema=contract(parameters),
        output_schema=contract(draft.outputs), examples=[{
            "inputs": example_inputs,
            "parameters": example_parameters,
            "expected_output": json.loads(draft.example_output_json),
        }],
    )
    try:
        definition = CapabilityDefinition(**data)
        validate_definition(definition)
    except HTTPException:
        raise ValueError("El borrador no cumple sus contratos") from None
    return definition
