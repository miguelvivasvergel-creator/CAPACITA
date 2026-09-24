from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
