"""Contratos propios del laboratorio local B; no habilitan versiones."""
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LaboratoryCase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=80)
    inputs: Any
    parameters: Any
    expected_output: dict | None = None
    expect_rejection: bool = False


class BuildRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    candidate_id: UUID
    artifact_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    # Casos aportados por quien prueba; no son evidencia independiente auditada.
    cases: list[LaboratoryCase] = Field(min_length=1, max_length=20)


class BuildResponse(BaseModel):
    id: UUID
    candidate_id: UUID
    artifact_hash: str
    status: Literal["queued", "testing", "passed", "failed", "interrupted"]
    created_at: str
    updated_at: str
    report: dict | None = None
    implementation_enabled: Literal[False] = False
    storage_backend: Literal["sqlite", "supabase"] = "sqlite"
