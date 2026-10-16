# backend/schemas/runs.py
from typing import List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field, model_validator

EstadoRun = Literal["queued", "running", "completed", "failed"]
EstadoPaso = Literal["pending", "running", "completed", "failed"]

MAX_TEXTO_ENTRADA = 20_000


class RunCreate(BaseModel):
    """Se ejecuta un workflow O una capacidad, con un archivo O un texto."""
    workflow_id: Optional[str] = None
    capability_id: Optional[str] = None
    file_id: Optional[str] = None
    text: Optional[str] = Field(None, max_length=MAX_TEXTO_ENTRADA)
    accepted_permissions: List[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validar_objetivo_y_entrada(self):
        if (self.workflow_id is None) == (self.capability_id is None):
            raise ValueError("Envía workflow_id o capability_id (solo uno)")
        if (self.file_id is None) == (not self.text):
            raise ValueError("Envía file_id o text (solo uno)")
        return self


class RunStep(BaseModel):
    name: str
    input_type: Optional[str] = None
    output_type: Optional[str] = None
    status: EstadoPaso = "pending"
    error: Optional[str] = None


class RunResponse(BaseModel):
    """Solo la recibe el dueño de la ejecución: incluye su resultado."""
    id: str
    workflow_id: Optional[str] = None
    capability_id: Optional[str] = None
    status: EstadoRun
    steps: List[RunStep]
    output_text: Optional[str] = None
    error: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None


class RunList(BaseModel):
    items: List[RunResponse] = Field(default_factory=list)
    next_cursor: Optional[str] = None
