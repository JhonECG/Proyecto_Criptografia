"""Settings (Pydantic BaseSettings) — variables de entorno del backend."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    mongo_url: str
    db_name: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    cors_origins: str = "http://localhost:3000"
    max_blob_size_kb: int = 512
    # HTTPS asumido en producción (sección 8); en dev local sobre http:// las
    # cookies "Secure" nunca se reenvían, así que esto debe ser overrideable.
    cookie_secure: bool = True

    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def max_blob_size_bytes(self) -> int:
        return self.max_blob_size_kb * 1024


@lru_cache
def get_settings() -> Settings:
    return Settings()
