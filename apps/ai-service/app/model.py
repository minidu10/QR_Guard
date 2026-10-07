"""Tamper check: does the QR sticker in this photo look real or tampered?"""

import hashlib
import json
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Protocol

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

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


def preprocess(image: Image.Image, size: int) -> np.ndarray:
    """Same steps as YOLO classification: shorter side to `size`, centre crop,
    RGB values 0-1, shape (1, 3, size, size)."""
    w, h = image.size
    scale = size / min(w, h)
    image = image.convert("RGB").resize(
        (max(size, round(w * scale)), max(size, round(h * scale))), Image.BILINEAR
    )
    left, top = (image.width - size) // 2, (image.height - size) // 2
    image = image.crop((left, top, left + size, top + size))
    arr = np.asarray(image, dtype=np.float32) / 255.0
    return arr.transpose(2, 0, 1)[None]


def softmax(x: np.ndarray) -> np.ndarray:
    e = np.exp(x - x.max())
    return e / e.sum()


class OnnxModel:
    """The trained YOLOv8 classification model, run with ONNX Runtime (no PyTorch needed)."""

    mode: Literal["mock", "real"] = "real"

    def __init__(self, model_path: Path, info_path: Path):
        import onnxruntime as ort

        info = json.loads(info_path.read_text())
        self.labels: list[str] = info["labels"]
        self.imgsz: int = info["imgsz"]
        self.val_top1: float | None = info.get("val_top1")
        self.session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    def probabilities(self, image: Image.Image) -> np.ndarray:
        out = self.session.run(None, {self.input_name: preprocess(image, self.imgsz)})[0][0]
        # The exported model already gives probabilities. Be safe if it gives raw scores.
        return out if out.min() >= 0 and abs(float(out.sum()) - 1) < 1e-3 else softmax(out)

    def predict(self, image: Image.Image, data: bytes, filename: str | None) -> Prediction:
        probs = self.probabilities(image)
        i = int(np.argmax(probs))
        label: Label = "tampered" if self.labels[i] == "tampered" else "real"
        return Prediction(label, round(float(probs[i]), 3))


def load_model(mode: str, models_dir: Path) -> TamperModel:
    """The trained model when MODEL_MODE=real and the files exist. Otherwise the mock."""
    if mode == "real":
        model_path, info_path = models_dir / "tamper.onnx", models_dir / "tamper.json"
        if model_path.exists() and info_path.exists():
            return OnnxModel(model_path, info_path)
        logger.warning(
            "MODEL_MODE=real but %s is missing, so the mock is used. Run training/train.py.",
            model_path,
        )
    return MockModel()
