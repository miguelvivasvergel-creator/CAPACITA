# backend/api/files.py
import uuid
import os
from fastapi import APIRouter, UploadFile, File, HTTPException, status
from core.responses import APIResponse
from schemas.capabilities import FileUploadResponse

router = APIRouter(prefix="/files", tags=["Archivos"])

MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
EXTENSIONES_PERMITIDAS = {
    ".pdf", ".png", ".jpg", ".jpeg",
    ".mp3", ".wav", ".csv", ".txt", ".json"
}


@router.post(
    "",
    response_model=APIResponse[FileUploadResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Subir archivo de entrada para capacidades o workflows",
    description="Valida tipo de archivo, tamaño máximo (10MB) y retorna un file_id para su procesamiento.",
)
async def upload_file(
    file: UploadFile = File(..., description="Archivo a subir (PDF, PNG, JPG, MP3, WAV, CSV, TXT, JSON)"),
) -> APIResponse[FileUploadResponse]:
    # 1. Sanitizar el nombre del archivo (prevenir path traversal ../)
    nombre_seguro = os.path.basename(file.filename or "archivo_sin_nombre")
    extension = os.path.splitext(nombre_seguro)[1].lower()

    # 2. Validación de extensión permitida
    if extension not in EXTENSIONES_PERMITIDAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensión '{extension}' no permitida. Formatos válidos: {', '.join(sorted(EXTENSIONES_PERMITIDAS))}",
        )

    # 3. Leer contenido y verificar tamaño (máx 10 MB)
    contenido = await file.read()
    tamano = len(contenido)

    if tamano > MAX_SIZE_BYTES:
        tamano_mb = tamano / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo supera el límite de 10 MB ({tamano_mb:.1f} MB)",
        )

    # 4. Generar file_id único (UUID)
    file_id = str(uuid.uuid4())

    # (En la fase de producción, aquí se guarda en Supabase Storage en uploads/{user_id}/{file_id})
    payload = FileUploadResponse(
        file_id=file_id,
        name=nombre_seguro,
        size=tamano,
        type=extension.replace(".", ""),
    )

    return APIResponse(
        success=True,
        message="Archivo subido y verificado correctamente",
        data=payload,
    )
