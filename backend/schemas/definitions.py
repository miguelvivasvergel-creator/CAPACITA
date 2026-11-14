"""Especificación manual de una capacidad; no es un candidato ni una versión activa."""
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, JsonValue

from schemas.capabilities import CapabilityListResponse, TipoDato

TextItem = Annotated[str, Field(min_length=1, max_length=500)]


class DefinitionExample(BaseModel):
    model_config = ConfigDict(extra="forbid")
    inputs: dict[str, JsonValue]
    parameters: dict[str, JsonValue] = Field(default_factory=dict)
    expected_output: dict[str, JsonValue]


class CapabilityDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=3, max_length=80)
    description: str = Field(min_length=5, max_length=500)
    category: str = Field(min_length=1, max_length=50)
    input_type: TipoDato
    output_type: TipoDato
    input_schema: dict[str, JsonValue]
    parameter_schema: dict[str, JsonValue] = Field(default_factory=lambda: {
        "type": "object", "properties": {}, "additionalProperties": False,
    })
    output_schema: dict[str, JsonValue]
    constraints: list[TextItem] = Field(default_factory=list, max_length=20)
    required_permissions: list[TextItem] = Field(default_factory=list, max_length=20)
    resources: list[TextItem] = Field(default_factory=list, max_length=20)
    failure_cases: list[TextItem] = Field(default_factory=list, max_length=20)
    examples: list[DefinitionExample] = Field(min_length=1, max_length=10)


class DefinitionCheckResponse(BaseModel):
    definition: CapabilityDefinition
    definition_hash: str
    matches: CapabilityListResponse
    search_kind: Literal["text"] = "text"
    implementation_verified: Literal[False] = False


class DefinitionSaveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    definition: CapabilityDefinition
    acknowledge_similar: bool = False
