"""Settings for the AI service, read from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # "mock" returns fixed answers. "real" will load trained models (Phase 8).
    model_mode: str = "mock"


settings = Settings()
