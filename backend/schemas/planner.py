"""Propuestas, nunca aprobaciones ni resultados de ejecución."""
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator
from schemas.workflows import WorkflowDefinition


class PlannerSearch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    objective: str = Field(min_length=10, max_length=2000)
    mode: Literal['text', 'semantic'] = 'text'


class PlannerRequest(PlannerSearch):
    version_ids: list[UUID] = Field(min_length=1, max_length=12)
    version_hashes: dict[UUID, Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]] = Field(min_length=1, max_length=12)
    consent_to_provider: bool = False

    @model_validator(mode="after")
    def reviewed_selection(self):
        if len(set(self.version_ids)) != len(self.version_ids):
            raise ValueError("Selecciona cada versión una sola vez")
        if set(self.version_hashes) != set(self.version_ids):
            raise ValueError("Revisa los contratos de todas las versiones seleccionadas")
        return self


class PlannerProposal(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    decision: Literal["reuse", "compose", "create", "clarify", "blocked"]
    explanation: str = Field(min_length=1, max_length=1200)
    questions: list[str] = Field(default_factory=list, max_length=3)
    missing: list[str] = Field(default_factory=list, max_length=12)
    definition: WorkflowDefinition | None = None

    @model_validator(mode="after")
    def consistent(self):
        planned = self.decision in {"reuse", "compose"}
        if planned != (self.definition is not None):
            raise ValueError("Solo reuse/compose llevan definición")
        if self.decision == "clarify" and not self.questions:
            raise ValueError("Faltan preguntas")
        if planned and self.questions:
            raise ValueError("Plan con preguntas pendientes")
        if self.definition and ((self.decision == "reuse" and len(self.definition.nodes) != 1)
                                or (self.decision == "compose" and len(self.definition.nodes) < 2)):
            raise ValueError("Decisión incompatible con pasos")
        return self
