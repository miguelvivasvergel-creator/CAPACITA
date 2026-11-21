"""DAG privado, puertos nombrados y versiones fijas. Sin código en la definición."""
from typing import Annotated, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Port = Annotated[str, Field(pattern=r"^[A-Za-z_][A-Za-z0-9_]{0,63}$")]


class Binding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(pattern=r"^(\$input|[A-Za-z_][A-Za-z0-9_]{0,63})$")
    field: Port


class WorkflowNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: Port
    version_id: UUID
    label: str = Field(min_length=1, max_length=80)
    parameters: dict[str, Any] = Field(default_factory=dict)
    values: dict[Port, Any] = Field(default_factory=dict)
    bindings: dict[Port, Binding] = Field(default_factory=dict)
    x: float = Field(default=0, ge=-10000, le=10000, allow_inf_nan=False)
    y: float = Field(default=0, ge=-10000, le=10000, allow_inf_nan=False)


# Pasos por solución. Debe coincidir con db/20_limite_20_pasos.sql (execution_workflow_save): un pedido
# completo (datos + textos en varios idiomas + envíos) llegaba a 14 pasos y con 12 se perdían partes.
MAX_NODOS = 20


class WorkflowDefinition(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    format_version: Literal[1] = 1
    name: str = Field(min_length=3, max_length=80)
    description: str = Field(default="", max_length=500)
    input_schema: dict
    nodes: list[WorkflowNode] = Field(min_length=1, max_length=MAX_NODOS)
    outputs: dict[Port, Binding] = Field(min_length=1, max_length=32)


class WorkflowSave(BaseModel):
    model_config = ConfigDict(extra="forbid")
    definition: WorkflowDefinition
    expected_revision: int | None = Field(default=None, ge=1)


class WorkflowApproval(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=1)
    definition_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    inputs: dict[str, Any]
    # «Acepto» explícito: obligatorio si algún paso envía el contenido a un tercero (IA externa).
    content_consent: bool = False


class WorkflowRun(BaseModel):
    model_config = ConfigDict(extra="forbid")
    approval_id: UUID
