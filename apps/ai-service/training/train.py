"""Trains the QR sticker tamper model (YOLOv8 image classification) and exports it
for the AI service.

Run from apps/ai-service (needs requirements-train.txt):
    python training/train.py                  # 20 epochs on the CPU
    python training/train.py --epochs 40 --device 0   # more epochs on a GPU

Output:
    models/tamper.onnx   the model the service loads (MODEL_MODE=real)
    models/tamper.json   labels, image size and validation accuracy
"""

import argparse
import json
import shutil
from pathlib import Path

from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
SERVICE = ROOT.parent


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--data", type=Path, default=ROOT / "dataset", help="has train/ and val/")
    parser.add_argument("--epochs", type=int, default=20)
    parser.add_argument("--imgsz", type=int, default=224)
    parser.add_argument("--batch", type=int, default=32)
    parser.add_argument(
        "--base", default="yolov8n-cls.pt", help="starting weights (small and fast)"
    )
    parser.add_argument("--device", default="cpu", help="cpu, or a GPU number like 0")
    args = parser.parse_args()

    for split in ("train", "val"):
        for label in ("real", "tampered"):
            if not any((args.data / split / label).glob("*")):
                raise SystemExit(
                    f"No photos in {args.data / split / label}. See training/README.md."
                )

    model = YOLO(args.base)
    model.train(
        data=str(args.data),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        project=str(SERVICE / "runs"),
        name="tamper",
        exist_ok=True,
        seed=42,
        deterministic=True,
        # Random erasing could hide the sticker itself, so keep it low.
        erasing=0.1,
        plots=False,
    )
    metrics = model.val(data=str(args.data), imgsz=args.imgsz, device=args.device, plots=False)
    onnx_file = Path(model.export(format="onnx", imgsz=args.imgsz, simplify=True))

    models = SERVICE / "models"
    models.mkdir(exist_ok=True)
    shutil.copy(onnx_file, models / "tamper.onnx")
    labels = [model.names[i] for i in sorted(model.names)]
    info = {"labels": labels, "imgsz": args.imgsz, "val_top1": round(float(metrics.top1), 4)}
    (models / "tamper.json").write_text(json.dumps(info, indent=2) + "\n")
    print(f"Saved models/tamper.onnx  labels={labels}  validation accuracy={info['val_top1']:.1%}")


if __name__ == "__main__":
    main()
