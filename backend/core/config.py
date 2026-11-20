from pathlib import Path
from typing import List, Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, SecretStr


class Settings(BaseSettings):
    """
    Configuración central de la aplicación.
    Carga variables desde el entorno o archivo .env si existe.
    """
    PROJECT_NAME: str = "CAPACITA API"
    VERSION: str = "0.1.0"
    DESCRIPTION: str = "API Backend para CAPACITA - Plataforma de Intercambio de Capacidades"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Servidor y Rutas
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    API_PREFIX: str = "/api"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # La autorización procede del JWT del usuario, no de una service key.
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    # Transición explícita: no importar ni borrar los reportes SQLite anteriores.
    LABORATORY_STORAGE: Literal["sqlite", "supabase"] = "supabase"

    GEMINI_API_KEY: SecretStr = SecretStr("")
    GEMINI_MODEL: str = Field(default="gemini-4-hydrogen", pattern=r"^gemini-[a-z0-9.-]+$")
    GEMINI_TIMEOUT_SECONDS: float = Field(default=45, ge=1, le=60)
    # Herramientas personalizables (plantillas, opciones, logo) necesitan código más largo.
    GEMINI_MAX_OUTPUT_TOKENS: int = Field(default=8192, ge=256, le=8192)
    CANDIDATE_REPAIR_LIMIT: int = Field(default=4, ge=0, le=5)
    # Investigación web antes de diseñar una herramienta (Grounding with Google Search).
    # gemini-2.5-flash la tiene gratis (500/día) hasta que Google lo redirija el 01/12/2026;
    # si falla, el diseño sigue sin fuentes. Lo encontrado no se guarda (términos de Google).
    RESEARCH_ENABLED: bool = True
    RESEARCH_MODEL: str = Field(default="gemini-2.5-flash", pattern=r"^gemini-[a-z0-9.-]+$")
    RESEARCH_TIMEOUT_SECONDS: float = Field(default=30, ge=1, le=60)
    PUBLICATIONS_ENABLED: bool = False  # Activar solo despues de SQL 09 verificado.
    # Telegram (fase 3, SQL 16): bot de @BotFather. Vacío = la vinculación y el envío no están
    # disponibles. El token solo lo usan el broker y el trabajador; nunca el código generado.
    TELEGRAM_BOT_TOKEN: SecretStr = SecretStr("")
    TELEGRAM_BOT_USERNAME: str = Field(default="", pattern=r"^$|^[A-Za-z0-9_]{5,32}$")
    # Google (fase 6, SQL 19): cliente OAuth web de Google Cloud y clave Fernet con que se cifra el
    # token de cada persona en la base de datos. Vacíos = conectar Google no está disponible.
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: SecretStr = SecretStr("")
    GOOGLE_TOKEN_KEY: SecretStr = SecretStr("")
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/google/callback"
    FRONTEND_URL: str = "http://localhost:5173"
    # Biblioteca de APIs: contacto público (web https o correo) que el broker añade al User-Agent.
    # Algunos proveedores abiertos (Wikipedia) rechazan peticiones sin un contacto del responsable.
    CONECTORES_CONTACTO: str = Field(default="", max_length=120,
                                     pattern=r"^$|^https://[^\s()]{4,110}$|^[^\s@()]{1,60}@[^\s@()]{1,50}\.[A-Za-z]{2,}$")

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
