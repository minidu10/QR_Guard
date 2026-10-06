"""QRGuard AI service: tamper check and payment anomaly check."""

from fastapi import FastAPI

from app.config import settings

app = FastAPI(
    title="QRGuard AI Service",
    description="Image tamper check and payment drop check for QRGuard.",
    version="0.1.0",
)


@app.get("/health", tags=["health"])
def health() -> dict[str, str]:
    """Simple check that the service is running."""
    return {"status": "ok", "mode": settings.model_mode}
