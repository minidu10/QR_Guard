"""QRGuard AI service: checks photos of a shop's QR stand for tampered stickers."""

import io
from typing import Annotated, Literal

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

from app.config import settings
from app.model import OnnxModel, load_model

app = FastAPI(
    title="QRGuard AI Service",
    description="Says if a photo of a shop's QR stand looks real or tampered.",
    version="0.2.0",
)

model = load_model(settings.model_mode, settings.models_dir)

# Formats we accept, checked from the file itself (not the name or header).
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}


class PredictResponse(BaseModel):
    label: Literal["real", "tampered"]
    confidence: float = Field(ge=0, le=1)
    mode: Literal["mock", "real"]


@app.get("/health", tags=["health"])
def health() -> dict[str, str | float | None]:
    """Simple check that the service is running, and which model it uses."""
    accuracy = model.val_top1 if isinstance(model, OnnxModel) else None
    return {"status": "ok", "mode": model.mode, "val_accuracy": accuracy}


@app.post("/predict", response_model=PredictResponse, tags=["predict"])
async def predict(file: Annotated[UploadFile, File()]) -> PredictResponse:
    """Upload a photo of the QR stand. Returns "real" or "tampered" with a confidence."""
    max_bytes = settings.max_upload_mb * 1024 * 1024
    data = await file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(413, f"Image is too large (max {settings.max_upload_mb} MB).")

    try:
        image = Image.open(io.BytesIO(data))
        image.load()
    except (UnidentifiedImageError, OSError) as err:
        raise HTTPException(415, "This file is not a photo we can read.") from err
    if image.format not in ALLOWED_FORMATS:
        raise HTTPException(415, "Use a JPEG, PNG or WebP photo.")

    result = model.predict(image.convert("RGB"), data, file.filename)
    return PredictResponse(label=result.label, confidence=result.confidence, mode=model.mode)
