from pathlib import Path

import numpy as np
import pytest
from PIL import Image

from app.config import settings
from app.model import MockModel, OnnxModel, load_model, preprocess

FIXTURES = Path(__file__).parent / "fixtures"
HAS_MODEL = (settings.models_dir / "tamper.onnx").exists()


def test_preprocess_makes_a_square_rgb_tensor():
    x = preprocess(Image.new("RGB", (400, 300), (255, 0, 0)), 224)
    assert x.shape == (1, 3, 224, 224)
    assert x.dtype == np.float32
    assert x.max() <= 1.0
    assert np.allclose(x[0, 0], 1.0)  # red channel full
    assert np.allclose(x[0, 1], 0.0)


def test_mock_mode_uses_the_mock():
    assert isinstance(load_model("mock", settings.models_dir), MockModel)


def test_real_mode_without_model_falls_back_to_mock(tmp_path):
    assert isinstance(load_model("real", tmp_path), MockModel)


@pytest.mark.skipif(not HAS_MODEL, reason="no trained model in models/")
@pytest.mark.parametrize("name", ["real", "tampered"])
def test_trained_model_spots_tampered_stickers(name):
    model = load_model("real", settings.models_dir)
    assert isinstance(model, OnnxModel)
    image = Image.open(FIXTURES / f"{name}.jpg")
    result = model.predict(image, b"", None)
    assert result.label == name
    assert 0.5 <= result.confidence <= 1.0
