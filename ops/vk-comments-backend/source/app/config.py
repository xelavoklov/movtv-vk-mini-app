from functools import lru_cache
from typing import List

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Database
    POSTGRES_USER: str = "vkapp"
    POSTGRES_PASSWORD: str = "changeme"
    POSTGRES_DB: str = "vkapp"
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    @computed_field  # type: ignore[misc]
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @computed_field  # type: ignore[misc]
    @property
    def SYNC_DATABASE_URL(self) -> str:
        """Used by Alembic for migrations."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # VK
    VK_APP_SECRET: str = ""

    # JWT
    JWT_SECRET: str = "change_me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_SECONDS: int = 604800  # 7 days

    # App
    APP_ENV: str = "development"
    DEBUG: bool = False
    CORS_ORIGINS: str = "https://vk.com,https://m.vk.com"

    @computed_field  # type: ignore[misc]
    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
