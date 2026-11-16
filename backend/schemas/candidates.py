"""Contrato de entrega A/B de un candidato; no es una versión habilitada."""
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from schemas.definitions import CapabilityDefinition
from datetime import datetime


class PythonSourceProposal(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source: str = Field(min_length=1, max_length=65536)
    # Primer entorno: biblioteca estándar; paquetes adicionales requieren acuerdo A/B.
    dependencies: list[str] = Field(default_factory=list, max_length=0)


class CandidateManifest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)
    format_version: Literal[1] = 1
    candidate_id: UUID
    capability_id: UUID
    definition_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    artifact_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    runtime: Literal["python"] = "python"
    entrypoint: Literal["main.run"] = "main.run"
    definition: CapabilityDefinition
    proposal: PythonSourceProposal
    status: Literal["draft"] = "draft"
    implementation_verified: Literal[False] = False


class CandidateGenerateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    definition_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    acknowledge_similar: bool = False
    consent_to_provider: bool = False


class CandidateRepairRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    feedback: str = Field(min_length=10, max_length=1500)
    consent_to_provider: bool = False


class CandidateResponse(BaseModel):
    id: UUID
    capability_id: UUID
    manifest: CandidateManifest
    provider: Literal["gemini"]
    model: str
    created_at: datetime


class CandidateListResponse(BaseModel):
    items: list[CandidateResponse]
    next_cursor: str | None = None
