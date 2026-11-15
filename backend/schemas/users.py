# backend/schemas/users.py
from typing import List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, model_validator

EstadoRun = Literal["queued", "running", "completed", "failed"]


class UserStats(BaseModel):
    public_capabilities: int | None = Field(None, description="Nulo si no se ha calculado")
    public_workflows: int | None = None
    runs: int | None = None
    clones: int | None = None


class UserProfile(BaseModel):
    id: str
    username: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime | None = None
    stats: UserStats = Field(default_factory=UserStats)


class UserUpdate(BaseModel):
    """Solo se pueden cambiar el nombre visible y la bio."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    display_name: Optional[str] = Field(None, min_length=1, max_length=60)
    bio: Optional[str] = Field(None, max_length=300)

    @model_validator(mode='after')
    def require_changes(self):
        if not self.model_fields_set or any(getattr(self, name) is None for name in self.model_fields_set):
            raise ValueError('Indica nombre o biografía; usa texto vacío para borrar la biografía')
        return self


class ActivityItem(BaseModel):
    """Una ejecución pública. Nunca incluye entradas, salidas ni ids de archivos."""
    id: str
    workflow_id: str
    workflow_name: str
    steps: List[str]
    status: EstadoRun
    started_at: datetime
    duration_ms: Optional[int] = Field(None, description="Nulo mientras la ejecución sigue en curso")


class ActivityList(BaseModel):
    items: List[ActivityItem] = Field(default_factory=list)
    next_cursor: Optional[str] = None
