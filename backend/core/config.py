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
    GEMINI_MAX_OUTPUT_TOKENS: int = Field(default=4096, ge=256, le=8192)

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
