"""Ejecuciones privadas de versiones fijas; no workflows ni publicación."""
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class EnableVersionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    candidate_id: UUID
    build_id: UUID


class VersionResponse(BaseModel):
    id: UUID
    capability_id: UUID
    candidate_id: UUID
    build_id: UUID
    artifact_hash: str
    definition_hash: str
    status: Literal["enabled", "disabled"]
    created_at: str
    profile: str


class ExecutionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version_id: UUID
    inputs: dict[str, Any]
    parameters: dict[str, Any] = Field(default_factory=dict)


class ExecutionResponse(BaseModel):
    id: UUID
    version_id: UUID | None = None
    workflow_id: UUID | None = None
    workflow_revision: int | None = None
    artifact_hash: str
    status: Literal["queued", "running", "completed", "failed", "interrupted"]
    created_at: str
    updated_at: str
    output: dict | None = None
    report: dict | None = None
