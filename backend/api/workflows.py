"""Procesos privados versionados; aprobación concreta y cola B3 compartida."""
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query

from api.capabilities import Repository
from api.versions import Shared
from core.responses import APIResponse
from repositories.candidates import CandidateRepository
from repositories.workflows import WorkflowRepository
from schemas.executions import ExecutionResponse
from schemas.workflows import WorkflowApproval, WorkflowDefinition, WorkflowRun, WorkflowSave
from services.build_validation import validate_manifest
from services.workflow_service import check_workflow

router = APIRouter(prefix="/workflows", tags=["Procesos privados"])


def get_workflow_repository(repository: Repository):
    return WorkflowRepository(repository)


Storage = Annotated[WorkflowRepository, Depends(get_workflow_repository)]


@router.get("/available-versions", response_model=APIResponse[dict])
async def available_versions(repository: Repository, shared: Shared, cursor: UUID | None = None,
                             limit: Annotated[int, Query(ge=1, le=100)] = 20):
    page = await shared.rpc("versions", p_cursor=str(cursor) if cursor else None, p_limit=limit)
    items = []
    for version in page["items"]:
        if version["status"] != "enabled":
            continue
        row = await CandidateRepository(repository).get(UUID(version["candidate_id"]))
        manifest = validate_manifest(row["manifest"])
        if manifest.artifact_hash != version["artifact_hash"]:
            raise HTTPException(409, "Una versión no coincide con su contenido")
        items.append(version | {"name": manifest.definition.name,
            "input_schema": manifest.definition.input_schema, "output_schema": manifest.definition.output_schema,
            "parameter_schema": manifest.definition.parameter_schema})
    return APIResponse(data={"items": items, "next_cursor": page["next_cursor"]})


@router.post("/validate", response_model=APIResponse[dict])
async def validate(payload: WorkflowDefinition, repository: Repository):
    return APIResponse(data=(await check_workflow(payload, repository)) | {"definition": payload.model_dump(mode="json")})


@router.post("", status_code=201, response_model=APIResponse[dict])
async def create(payload: WorkflowSave, repository: Repository, storage: Storage):
    await check_workflow(payload.definition, repository)
    return APIResponse(data=await storage.rpc("workflow_save", p_id=None, p_expected=None,
                                             p_definition=payload.definition.model_dump(mode="json")))


@router.get("", response_model=APIResponse[dict])
async def listing(storage: Storage, cursor: UUID | None = None,
                  limit: Annotated[int, Query(ge=1, le=100)] = 20):
    return APIResponse(data=await storage.listing(cursor, limit))


@router.get("/{id}", response_model=APIResponse[dict])
async def detail(id: UUID, storage: Storage):
    return APIResponse(data=await storage.get(id))


@router.put("/{id}", response_model=APIResponse[dict])
async def update(id: UUID, payload: WorkflowSave, repository: Repository, storage: Storage):
    await storage.get(id)
    if payload.expected_revision is None:
        raise HTTPException(422, "Incluye la revisión que estás editando")
    await check_workflow(payload.definition, repository)
    return APIResponse(data=await storage.rpc("workflow_save", p_id=str(id), p_expected=payload.expected_revision,
                                             p_definition=payload.definition.model_dump(mode="json")))


@router.delete("/{id}", response_model=APIResponse[dict])
async def archive(id: UUID, storage: Storage):
    await storage.get(id)
    return APIResponse(data=await storage.rpc("workflow_archive", p_id=str(id)))


@router.post("/{id}/approvals", status_code=201, response_model=APIResponse[dict])
async def approve(id: UUID, payload: WorkflowApproval, repository: Repository, storage: Storage):
    row = await storage.get(id)
    if row["revision"] != payload.revision or row["definition_hash"] != payload.definition_hash:
        raise HTTPException(409, "El proceso cambió; vuelve a revisarlo")
    await check_workflow(WorkflowDefinition.model_validate(row["definition"]), repository, payload.inputs)
    return APIResponse(data=await storage.rpc("workflow_approve", p_id=str(id), p_revision=payload.revision,
        p_hash=payload.definition_hash, p_inputs=payload.inputs))


@router.post("/{id}/runs", status_code=202, response_model=APIResponse[ExecutionResponse])
async def execute(id: UUID, payload: WorkflowRun, storage: Storage,
                  idempotency_key: Annotated[str, Header(min_length=1, max_length=128)]):
    await storage.get(id)
    return APIResponse(data=await storage.rpc("workflow_enqueue", p_id=str(id),
        p_approval=str(payload.approval_id), p_key=idempotency_key))
