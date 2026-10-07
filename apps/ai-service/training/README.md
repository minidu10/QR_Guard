# Training the tamper model

The AI service says if a photo of a shop's QR stand looks **real** or **tampered**
(a fake QR sticker stuck over the real one). It uses a small image classifier:
**YOLOv8n-cls**, trained here and saved as `models/tamper.onnx`.

The service runs the model with ONNX Runtime, so the Docker image does not need PyTorch.

## 1. Set up (once)

From `apps/ai-service`:

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-train.txt
```

## 2. Get photos

Put photos in this layout (the `dataset/` folder is not committed to git):

```
training/dataset/
├── train/
│   ├── real/        # normal QR stands
│   └── tampered/    # a different QR sticker stuck over the real one
└── val/
    ├── real/
    └── tampered/
```

**Best:** real phone photos from shops. Take photos at different angles and light.
For "tampered", print a different QR code, stick it over the real one, and take photos.
Put about 1 in 5 photos in `val/` (they check the model, they are not used to learn).

**To start quickly:** make synthetic photos (drawn by a script):

```bash
python training/generate_dataset.py             # 800 train + 200 val photos
```

You can mix both: real photos and synthetic photos in the same folders.

## 3. Train

```bash
python training/train.py                         # about 5 minutes on a laptop CPU
python training/train.py --epochs 40 --device 0  # more epochs on a GPU
```

This saves `models/tamper.onnx` and `models/tamper.json` (labels and accuracy).

## 4. Use it

Set `MODEL_MODE=real` (in `infra/.env` for Docker, or `apps/ai-service/.env`) and restart
the AI service. `GET /health` shows `"mode": "real"` and the validation accuracy.

With `MODEL_MODE=mock` (or if the model file is missing) the service gives fixed answers:
a photo whose file name has "tamper", "fake" or "scam" in it is "tampered", anything else is "real".

## Important

The model in this repo was trained on **synthetic** photos only. It is good for the demo,
but it has not seen real shops. Before real use, train it again with real photos.
