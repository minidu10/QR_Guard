import io

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


def photo(fmt: str = "PNG") -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (200, 200, 200)).save(buf, fmt)
    return buf.getvalue()


def test_mock_says_real_for_a_normal_photo():
    res = client.post("/predict", files={"file": ("stand.png", photo(), "image/png")})
    assert res.status_code == 200
    body = res.json()
    assert body["label"] == "real"
    assert 0 <= body["confidence"] <= 1
    assert body["mode"] == "mock"


def test_mock_says_tampered_when_the_name_says_so():
    res = client.post("/predict", files={"file": ("tampered-1.jpg", photo("JPEG"), "image/jpeg")})
    assert res.status_code == 200
    assert res.json()["label"] == "tampered"


def test_same_photo_gives_the_same_answer():
    data = photo()
    a = client.post("/predict", files={"file": ("a.png", data, "image/png")}).json()
    b = client.post("/predict", files={"file": ("a.png", data, "image/png")}).json()
    assert a == b


def test_rejects_files_that_are_not_photos():
    res = client.post("/predict", files={"file": ("x.png", b"not an image", "image/png")})
    assert res.status_code == 415


def test_rejects_unsupported_image_formats():
    buf = io.BytesIO()
    Image.new("RGB", (8, 8)).save(buf, "GIF")
    res = client.post("/predict", files={"file": ("x.gif", buf.getvalue(), "image/gif")})
    assert res.status_code == 415


def test_rejects_photos_that_are_too_big():
    big = b"\0" * (5 * 1024 * 1024 + 1)
    res = client.post("/predict", files={"file": ("big.png", big, "image/png")})
    assert res.status_code == 413
