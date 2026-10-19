# backend/schemas/users.py
from typing import List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field

EstadoRun = Literal["queued", "running", "completed", "failed"]


class UserStats(BaseModel):
    public_capabilities: int = Field(0, description="Capacidades públicas del usuario")
    public_workflows: int = Field(0, description="Workflows públicos del usuario")
    runs: int = Field(0, description="Ejecuciones realizadas")
    clones: int = Field(0, description="Veces que otros clonaron lo suyo")


class UserProfile(BaseModel):
    username: str
    display_name: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    stats: UserStats


class UserUpdate(BaseModel):
    """Solo se pueden cambiar el nombre visible y la bio."""
    display_name: Optional[str] = Field(None, min_length=1, max_length=60)
    bio: Optional[str] = Field(None, max_length=300)


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
