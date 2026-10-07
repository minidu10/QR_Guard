"""Settings for the AI service, read from environment variables."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", protected_namespaces=())

    # "mock" returns fixed answers. "real" loads the trained model from models_dir.
    model_mode: str = "mock"

    # Where training/train.py saves tamper.onnx and tamper.json.
    models_dir: Path = Path(__file__).resolve().parent.parent / "models"

    # Largest photo we accept.
    max_upload_mb: int = 5


settings = Settings()
