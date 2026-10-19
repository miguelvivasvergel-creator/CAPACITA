# backend/repositories/memoria.py
"""
Almacén en memoria para desarrollo (mismo enfoque que MOCK_DB de capacidades).
Permite probar perfiles y ejecuciones sin depender de Supabase.
Se reemplaza por consultas reales cuando las tablas estén listas en la base de datos.
"""
from datetime import datetime, timedelta, timezone

AHORA = datetime.now(timezone.utc)

PERFILES: list[dict] = [
    {
        "id": "usr-demo-1",
        "username": "franklin_dev",
        "display_name": "Franklin",
        "bio": "Me gusta automatizar todo lo que tenga que ver con imágenes y documentos.",
        "avatar_url": None,
        "created_at": datetime(2026, 9, 20, tzinfo=timezone.utc),
    },
    {
        "id": "usr-demo-2",
        "username": "miguel_ui",
        "display_name": "Miguel",
        "bio": "Diseño interfaces y traduzco cosas en mis ratos libres.",
        "avatar_url": None,
        "created_at": datetime(2026, 9, 18, tzinfo=timezone.utc),
    },
    {
        "id": "usr-demo-3",
        "username": "fahida",
        "display_name": "Fahida",
        "bio": "Me encargo de que los workflows se ejecuten bien y de forma segura.",
        "avatar_url": None,
        "created_at": datetime(2026, 9, 22, tzinfo=timezone.utc),
    },
]

CAPACIDADES: list[dict] = [
    {
        "id": "cap-001",
        "owner_id": "usr-demo-1",
        "name": "Quitar fondo de imagen",
        "description": "Elimina el fondo de una fotografía JPG o PNG y devuelve un PNG con transparencia.",
        "input_type": "imagen",
        "output_type": "imagen",
        "visibility": "public",
        "permissions": ["Procesar la imagen que subas"],
        "adapter_key": "mock",
        "uses_count": 142,
        "clones_count": 18,
    },
    {
        "id": "cap-002",
        "owner_id": "usr-demo-1",
        "name": "Extraer texto de PDF",
        "description": "Extrae todo el contenido de texto de un PDF digital.",
        "input_type": "pdf",
        "output_type": "texto",
        "visibility": "public",
        "permissions": ["Procesar el documento que subas"],
        "adapter_key": "mock",
        "uses_count": 89,
        "clones_count": 12,
    },
    {
        "id": "cap-003",
        "owner_id": "usr-demo-2",
        "name": "Traducir texto multilingüe",
        "description": "Traduce texto a inglés, español, francés o alemán manteniendo el sentido.",
        "input_type": "texto",
        "output_type": "texto",
        "visibility": "public",
        "permissions": ["Enviar el texto a un servicio de traducción"],
        "adapter_key": "mock",
        "uses_count": 230,
        "clones_count": 45,
    },
    {
        "id": "cap-004",
        "owner_id": "usr-demo-3",
        "name": "Resumir texto",
        "description": "Genera un resumen corto con los puntos importantes de un texto.",
        "input_type": "texto",
        "output_type": "texto",
        "visibility": "public",
        "permissions": ["Generar un resumen con inteligencia artificial"],
        "adapter_key": "mock",
        "uses_count": 18,
        "clones_count": 4,
    },
    {
        "id": "cap-005",
        "owner_id": "usr-demo-3",
        "name": "Limpiar CSV",
        "description": "Quita filas vacías y espacios sobrantes de una tabla CSV.",
        "input_type": "datos",
        "output_type": "datos",
        "visibility": "private",
        "permissions": [],
        "adapter_key": "mock",
        "uses_count": 3,
        "clones_count": 0,
    },
]

WORKFLOWS: list[dict] = [
    {
        "id": "wf-001",
        "owner_id": "usr-demo-1",
        "name": "PDF a resumen en español",
        "description": "Extrae el texto de un PDF, lo traduce al español y genera un resumen corto.",
        "visibility": "public",
        "steps": ["cap-002", "cap-003", "cap-004"],
        "uses_count": 64,
        "clones_count": 12,
    },
    {
        "id": "wf-002",
        "owner_id": "usr-demo-1",
        "name": "Fotos de producto limpias",
        "description": "Quita el fondo de una foto de producto para usarla en la tienda.",
        "visibility": "public",
        "steps": ["cap-001"],
        "uses_count": 21,
        "clones_count": 0,
    },
    {
        "id": "wf-003",
        "owner_id": "usr-demo-2",
        "name": "Traducir y resumir",
        "description": "Traduce un texto al español y luego genera un resumen corto.",
        "visibility": "public",
        "steps": ["cap-003", "cap-004"],
        "uses_count": 15,
        "clones_count": 3,
    },
    {
        "id": "wf-010",
        "owner_id": "usr-demo-3",
        "name": "Contrato a resumen",
        "description": "Lee un contrato en PDF y devuelve un resumen con los puntos importantes.",
        "visibility": "public",
        "steps": ["cap-002", "cap-004"],
        "uses_count": 9,
        "clones_count": 0,
    },
]

# Ejecuciones de ejemplo. input_text y output_text son PRIVADOS:
# nunca deben aparecer en la actividad pública de un perfil.
RUNS: list[dict] = [
    {
        "id": "run-101",
        "user_id": "usr-demo-1",
        "workflow_id": "wf-001",
        "capability_id": None,
        "status": "completed",
        "steps": [
            {"name": "Extraer texto", "status": "completed"},
            {"name": "Traducir texto multilingüe", "status": "completed"},
            {"name": "Resumir texto", "status": "completed"},
        ],
        "accepted_permissions": [],
        "input_file_id": "archivo-privado-1",
        "input_text": None,
        "output_text": "Resumen privado de Franklin.",
        "output_file_path": None,
        "error": None,
        "started_at": AHORA - timedelta(hours=5),
        "finished_at": AHORA - timedelta(hours=5) + timedelta(seconds=8.4),
    },
    {
        "id": "run-102",
        "user_id": "usr-demo-1",
        "workflow_id": "wf-002",
        "capability_id": None,
        "status": "failed",
        "steps": [{"name": "Quitar fondo de imagen", "status": "failed"}],
        "accepted_permissions": [],
        "input_file_id": "archivo-privado-2",
        "input_text": None,
        "output_text": None,
        "output_file_path": None,
        "error": "La imagen está dañada.",
        "started_at": AHORA - timedelta(days=1),
        "finished_at": AHORA - timedelta(days=1) + timedelta(seconds=3.1),
    },
]


# Archivos subidos ({ id, owner_id, name, type }). Los registra POST /files (Módulo B)
# para que POST /runs pueda comprobar que el archivo de entrada es del usuario.
ARCHIVOS: list[dict] = []


def buscar_por_id(lista: list[dict], item_id: str) -> dict | None:
    """Devuelve el elemento con ese id o None."""
    return next((item for item in lista if item["id"] == item_id), None)
