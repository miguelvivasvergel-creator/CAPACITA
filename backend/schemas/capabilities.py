# backend/schemas/capabilities.py
from typing import List, Optional, Literal, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict, model_validator

TipoDato = Literal['pdf', 'texto', 'imagen', 'audio', 'datos']
Visibilidad = Literal['public', 'private']
EstadoCapacidad = Literal['draft', 'published']


class CapabilityBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    name: str = Field(..., min_length=3, max_length=80, description="Nombre descriptivo de la capacidad")
    description: str = Field(..., min_length=5, max_length=500, description="Descripción del funcionamiento")
    category: str = Field(default="Texto", min_length=1, max_length=50, description="Categoría temática")
    input_type: TipoDato = Field(..., description="Tipo de entrada permitido")
    output_type: TipoDato = Field(..., description="Tipo de salida generado")
    input_schema: Dict[str, Any] = Field(default_factory=dict, description="Contrato de entrada; conservar no equivale a validarlo para ejecución")
    output_schema: Dict[str, Any] = Field(default_factory=dict, description="Contrato de salida; conservar no equivale a validarlo para ejecución")
    visibility: Visibilidad = Field(default="private", description="Visibilidad de la capacidad")
    status: EstadoCapacidad = Field(default="draft", description="Estado de publicación")
    version: str = Field(default="1.0.0", min_length=1, max_length=20, description="Versión semántica")
    permissions: List[str] = Field(default_factory=list, description="Lista de permisos que requiere la ejecución")
    adapter_key: Optional[str] = Field(default=None, max_length=50, description="Clave del adaptador Python encargado de ejecutar")
    config: Dict[str, Any] = Field(default_factory=dict, description="Configuración adicional del motor o prompt")


class CapabilityCreate(CapabilityBase):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class CapabilityUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: Optional[str] = Field(None, min_length=3, max_length=80)
    description: Optional[str] = Field(None, min_length=5, max_length=500)
    category: Optional[str] = Field(None, min_length=1, max_length=50)
    input_type: Optional[TipoDato] = None
    output_type: Optional[TipoDato] = None
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    visibility: Optional[Visibilidad] = None
    status: Optional[EstadoCapacidad] = None
    permissions: Optional[List[str]] = None
    adapter_key: Optional[str] = Field(None, max_length=50)
    config: Optional[Dict[str, Any]] = None

    @model_validator(mode="after")
    def reject_null_required_fields(self):
        for field in self.model_fields_set - {"adapter_key"}:
            if getattr(self, field) is None:
                raise ValueError(f"{field} no puede ser null")
        return self


class CapabilityResponse(CapabilityBase):
    id: str = Field(..., description="Identificador único UUID de la capacidad")
    owner_id: str = Field(..., description="ID del usuario propietario")
    owner_username: Optional[str] = Field(default="usuario", description="Nombre de usuario del creador")
    cloned_from: Optional[str] = Field(default=None, description="ID de la capacidad original si fue clonada")
    uses_count: int = Field(default=0, description="Número de ejecuciones totales")
    clones_count: int = Field(default=0, description="Número de veces que ha sido clonada")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


class CapabilityListResponse(BaseModel):
    items: List[CapabilityResponse] = Field(default_factory=list, description="Listado de capacidades")
    next_cursor: Optional[str] = Field(default=None, description="Cursor para paginación")


class FileUploadResponse(BaseModel):
    file_id: str = Field(..., description="Identificador único del archivo almacenado")
    name: str = Field(..., description="Nombre original del archivo sanitizado")
    size: int = Field(..., description="Tamaño del archivo en bytes")
    type: str = Field(..., description="Tipo o extensión del archivo")
