"""Tamper check: does the QR sticker in this photo look real or tampered?"""

import hashlib
from dataclasses import dataclass
from typing import Literal, Protocol

from PIL import Image

Label = Literal["real", "tampered"]

# Mock mode: a file name with one of these words is treated as tampered.
TAMPER_HINTS = ("tamper", "fake", "scam")


@dataclass
class Prediction:
    label: Label
    confidence: float


class TamperModel(Protocol):
    mode: Literal["mock", "real"]

    def predict(self, image: Image.Image, data: bytes, filename: str | None) -> Prediction: ...


class MockModel:
    """Fixed answers, so the rest of QRGuard works before a model is trained."""

    mode: Literal["mock", "real"] = "mock"

    def predict(self, image: Image.Image, data: bytes, filename: str | None) -> Prediction:
        # Same photo -> same confidence, so results are repeatable.
        jitter = int(hashlib.sha256(data).hexdigest()[:4], 16) / 0xFFFF
        name = (filename or "").lower()
        if any(hint in name for hint in TAMPER_HINTS):
            return Prediction("tampered", round(0.88 + 0.1 * jitter, 3))
        return Prediction("real", round(0.85 + 0.12 * jitter, 3))


def load_model(mode: str) -> TamperModel:
    """The model to use. Only the mock exists until Phase 8."""
    return MockModel()
