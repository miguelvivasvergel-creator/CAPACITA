"""Contrato de entrega A/B de un candidato; no es una versión habilitada."""
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from schemas.definitions import CapabilityDefinition


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
