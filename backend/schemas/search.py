from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from schemas.capabilities import CapabilityResponse, TipoDato
from schemas.users import UserProfile


class SearchRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    query: str = Field(min_length=2, max_length=200)
    mode: Literal['text', 'semantic'] = 'text'
    scope: Literal['available', 'mine', 'community'] = 'available'
    kind: Literal['all', 'capabilities', 'profiles'] = 'all'
    limit: int = Field(default=20, ge=1, le=50)
    capabilities_cursor: str | None = Field(default=None, max_length=512)
    profiles_cursor: UUID | None = None
    category: str | None = Field(default=None, min_length=1, max_length=50)
    owner: str | None = Field(default=None, min_length=1, max_length=50)
    data_type: TipoDato | None = None


class SearchCapability(CapabilityResponse):
    similarity: float | None = None


class CapabilitiesPage(BaseModel):
    items: list[SearchCapability] = Field(default_factory=list)
    next_cursor: str | None = None


class ProfilesPage(BaseModel):
    items: list[UserProfile] = Field(default_factory=list)
    next_cursor: str | None = None


class SearchResponse(BaseModel):
    mode: Literal['text', 'semantic']
    capabilities: CapabilitiesPage = Field(default_factory=CapabilitiesPage)
    profiles: ProfilesPage = Field(default_factory=ProfilesPage)
    workflow_search_available: Literal[False] = False
    semantic_available: bool
    semantic_scanned: int = 0
    semantic_truncated: bool = False
