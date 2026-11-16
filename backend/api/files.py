"""Ruta heredada: no simular carga sin almacenamiento privado implementado."""
from typing import Annotated
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from core.auth import get_current_user

router = APIRouter(prefix="/files", tags=["Archivos"])


@router.post("", summary="Archivos privados pendientes de integrar")
async def upload_file(user: Annotated[dict, Depends(get_current_user)], file: UploadFile = File(...)):
    # El cliente heredado generaba un UUID y descartaba el contenido. No acreditar
    # una carga que no pueda recuperarse ni protegerse por propietario.
    raise HTTPException(501, "Archivos privados pendientes de integrar; no se guardo ni proceso el archivo")
