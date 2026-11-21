"""Propuestas, nunca aprobaciones ni resultados de ejecución."""
from typing import Annotated, Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from schemas.workflows import MAX_NODOS, WorkflowDefinition


class PlannerSearch(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    objective: str = Field(min_length=10, max_length=2000)
    mode: Literal['text', 'semantic'] = 'text'
    # Catálogo completo: todos los conectores (no solo los que comparten palabras con el pedido),
    # para que la IA elija en el paso 1 (auto) qué piezas sirven.
    completo: bool = False


class PlannerRequest(PlannerSearch):
    version_ids: list[UUID] = Field(min_length=1, max_length=100)
    version_hashes: dict[UUID, Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]] = Field(min_length=1, max_length=100)
    consent_to_provider: bool = False
    # auto: la IA elige entre todas las versiones enviadas (paso 1) y arma el plan solo con esas.
    # Sin auto (modo desarrollador), la persona elige a mano y el límite sigue siendo 12.
    auto: bool = False

    @model_validator(mode="after")
    def reviewed_selection(self):
        if len(set(self.version_ids)) != len(self.version_ids):
            raise ValueError("Selecciona cada versión una sola vez")
        if not self.auto and len(self.version_ids) > 12:
            raise ValueError("Selecciona hasta 12 versiones")
        if set(self.version_hashes) != set(self.version_ids):
            raise ValueError("Revisa los contratos de todas las versiones seleccionadas")
        return self


MAX_REQUISITOS = 30


class Cobertura(BaseModel):
    """Qué pasos del plan cumplen el requisito número n (1, 2, 3… de la lista de requisitos)."""
    model_config = ConfigDict(extra="ignore")
    n: int = Field(ge=1, le=MAX_REQUISITOS)
    pasos: list[str] = Field(default_factory=list, max_length=MAX_NODOS)


class PlannerProposal(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    decision: Literal["reuse", "compose", "create", "clarify", "blocked"]
    explanation: str = Field(min_length=1, max_length=1200)
    questions: list[str] = Field(default_factory=list, max_length=3)
    missing: list[str] = Field(default_factory=list, max_length=12)
    definition: WorkflowDefinition | None = None
    # Lista de verificación: cada cosa que pidió la persona (un dato, un texto, un idioma, un envío y su
    # destino) y qué pasos la cumplen. El backend la revisa: nada del pedido se pierde en silencio, y lo
    # que no se pudo incluir va en pendientes para decírselo a la persona.
    requisitos: list[str] = Field(default_factory=list)
    cobertura: list[Cobertura] = Field(default_factory=list)
    pendientes: list[str] = Field(default_factory=list)

    @field_validator("requisitos", "pendientes", mode="before")
    @classmethod
    def lista_corta(cls, valor):
        # La IA a veces escribe frases largas o de más: se recortan en vez de rechazar todo el plan.
        if not isinstance(valor, list):
            return []
        return [str(item).strip()[:300] for item in valor if str(item).strip()][:MAX_REQUISITOS]

    @field_validator("cobertura", mode="before")
    @classmethod
    def cobertura_corta(cls, valor):
        if not isinstance(valor, list):
            return []
        return [item for item in valor if isinstance(item, dict) and isinstance(item.get("n"), int)
                and not isinstance(item.get("n"), bool) and 1 <= item["n"] <= MAX_REQUISITOS][:MAX_REQUISITOS]

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
