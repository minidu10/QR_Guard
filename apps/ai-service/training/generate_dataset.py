"""Makes a synthetic training set of QR stand photos: "real", and "tampered" (a fake QR
sticker stuck over the printed QR).

Real photos from shops are always better. Put them in the same folders and they are used
too. This script lets us start before there are enough real photos.

Run from apps/ai-service:
    python training/generate_dataset.py                 # 800 train + 200 val images
    python training/generate_dataset.py --samples out   # a few demo photos (not for training)
"""

import argparse
import io
import random
from pathlib import Path

import numpy as np
import qrcode
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent
CANVAS = 320  # we draw at this size...
FINAL = 256  # ...and save at this size.

STAND_COLOURS = [(200, 30, 45), (20, 70, 160), (0, 120, 80), (110, 40, 140), (230, 120, 0)]
HEADER_WORDS = ["SCAN & PAY", "LANKAQR", "PAY HERE", "SCAN TO PAY"]


def random_payload(rng: random.Random) -> str:
    """Text for a QR code (an EMV-like merchant string with a random id)."""
    merchant = "".join(rng.choices("0123456789", k=9))
    account = f"26{rng.randint(20, 40)}LK.DEMO{merchant}"
    return f"000201010211{account}5204599953031445802LK59{rng.randint(5, 9)}"


def qr_image(rng: random.Random, size: int) -> Image.Image:
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=4, border=2)
    qr.add_data(random_payload(rng))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    return img.resize((size, size), Image.NEAREST)


def background(rng: random.Random) -> Image.Image:
    """A counter top: plain, gradient, wood-like stripes or tiles, with a little noise."""
    np_rng = np.random.default_rng(rng.randint(0, 2**31))
    base = np.array([rng.randint(40, 230) for _ in range(3)], dtype=np.float32)
    kind = rng.choice(["plain", "gradient", "wood", "tiles"])
    y, x = np.mgrid[0:CANVAS, 0:CANVAS].astype(np.float32)
    if kind == "gradient":
        shade = (x * rng.uniform(-0.3, 0.3) + y * rng.uniform(-0.3, 0.3))[..., None]
    elif kind == "wood":
        shade = (np.sin(y / rng.uniform(3, 9) + np.sin(x / 40) * 2) * 18)[..., None]
    elif kind == "tiles":
        step = rng.randint(30, 70)
        lines = ((x % step) < 2) | ((y % step) < 2)
        shade = (lines * -40.0)[..., None]
    else:
        shade = np.zeros((CANVAS, CANVAS, 1), np.float32)
    noise = np_rng.normal(0, 6, (CANVAS, CANVAS, 3))
    arr = np.clip(base + shade + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def stand(rng: random.Random) -> tuple[Image.Image, tuple[int, int, int]]:
    """A printed QR stand (card). Returns the card and the QR's (x, y, size) on it."""
    w, h = rng.randint(170, 220), rng.randint(220, 270)
    card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(card)
    paper = tuple(rng.randint(235, 255) for _ in range(3))
    colour = rng.choice(STAND_COLOURS)
    draw.rounded_rectangle([0, 0, w - 1, h - 1], radius=rng.randint(6, 16), fill=(*paper, 255))
    band = rng.randint(28, 42)
    draw.rounded_rectangle([0, 0, w - 1, band], radius=8, fill=(*colour, 255))
    draw.text((10, band // 2 - 5), rng.choice(HEADER_WORDS), fill=(255, 255, 255, 255))
    draw.rectangle([0, h - 18, w - 1, h - 1], fill=(*colour, 255))

    size = int(min(w, h - band - 30) * rng.uniform(0.78, 0.9))
    qx, qy = (w - size) // 2, band + (h - band - 18 - size) // 2
    card.paste(qr_image(rng, size), (qx, qy))
    return card, (qx, qy, size)


def sticker(rng: random.Random, size: int) -> Image.Image:
    """A fake QR sticker: a different QR on its own white label, sometimes glossy."""
    pad = rng.randint(3, 10)
    tint = tuple(rng.randint(225, 255) for _ in range(3))
    label = Image.new("RGBA", (size + 2 * pad, size + 2 * pad), (*tint, 255))
    label.paste(qr_image(rng, size), (pad, pad))
    draw = ImageDraw.Draw(label, "RGBA")
    if rng.random() < 0.5:  # shiny plastic
        x0 = rng.randint(-size, size)
        draw.polygon(
            [(x0, 0), (x0 + 25, 0), (x0 + 25 + size, size + 2 * pad), (x0 + size, size + 2 * pad)],
            fill=(255, 255, 255, rng.randint(50, 110)),
        )
    if rng.random() < 0.35:  # a corner peeling up
        c = rng.randint(10, 22)
        draw.polygon([(0, 0), (c, 0), (0, c)], fill=(150, 150, 150, 220))
    return label


def harmless_label(rng: random.Random) -> Image.Image:
    """Something stuck on a REAL stand that is not a QR (a price or thank-you label)."""
    w, h = rng.randint(40, 90), rng.randint(18, 35)
    colour = tuple(rng.randint(150, 255) for _ in range(3))
    label = Image.new("RGBA", (w, h), (*colour, 255))
    ImageDraw.Draw(label).text(
        (4, h // 2 - 5), rng.choice(["THANK YOU", "Rs.", "OPEN", "SALE"]), fill=(20, 20, 20, 255)
    )
    return label


def with_shadow(rng: random.Random, card: Image.Image, item: Image.Image, at: tuple[int, int]):
    """Pastes `item` on `card` with a soft shadow (as if stuck on top)."""
    shadow = Image.new("RGBA", item.size, (0, 0, 0, rng.randint(70, 140)))
    shadow.putalpha(item.getchannel("A").point(lambda a: min(a, 120)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(rng.uniform(1, 3)))
    dx, dy = rng.randint(1, 5), rng.randint(1, 5)
    card.alpha_composite(shadow, (at[0] + dx, at[1] + dy))
    card.alpha_composite(item, at)


def tamper(rng: random.Random, card: Image.Image, qr: tuple[int, int, int]) -> None:
    qx, qy, size = qr
    s = int(size * rng.uniform(0.8, 1.12))
    label = sticker(rng, s).rotate(rng.uniform(-12, 12), expand=True, resample=Image.BICUBIC)
    # Stuck roughly over the printed QR, but rarely perfectly lined up.
    cx = qx + size // 2 + int(size * rng.uniform(-0.12, 0.12))
    cy = qy + size // 2 + int(size * rng.uniform(-0.12, 0.12))
    with_shadow(rng, card, label, (cx - label.width // 2, cy - label.height // 2))


def decorate_real(rng: random.Random, card: Image.Image, qr: tuple[int, int, int]) -> None:
    """Hard examples for "real": harmless labels, and smudges on the printed QR."""
    qx, qy, size = qr
    if rng.random() < 0.4:
        label = harmless_label(rng).rotate(rng.uniform(-15, 15), expand=True)
        corner = rng.choice(
            [(4, card.height - label.height - 22), (card.width - label.width - 4, 40)]
        )
        with_shadow(rng, card, label, corner)
    if rng.random() < 0.3:
        draw = ImageDraw.Draw(card, "RGBA")
        x, y = qx + rng.randint(0, size), qy + rng.randint(0, size)
        r = rng.randint(6, 18)
        draw.ellipse([x - r, y - r, x + r, y + r], fill=(90, 70, 50, rng.randint(30, 70)))


def perspective_coeffs(src, dst):
    """Coefficients for Image.transform(PERSPECTIVE) that map dst points to src points."""
    rows = []
    for (x, y), (u, v) in zip(dst, src, strict=True):
        rows.append([x, y, 1, 0, 0, 0, -u * x, -u * y])
        rows.append([0, 0, 0, x, y, 1, -v * x, -v * y])
    a = np.array(rows, dtype=np.float64)
    b = np.array(src, dtype=np.float64).reshape(8)
    return np.linalg.solve(a, b).tolist()


def place(rng: random.Random, bg: Image.Image, card: Image.Image) -> Image.Image:
    """Puts the card on the counter, a bit rotated and seen from an angle."""
    scale = rng.uniform(0.75, 1.15)
    card = card.resize((int(card.width * scale), int(card.height * scale)), Image.BICUBIC)
    card = card.rotate(rng.uniform(-18, 18), expand=True, resample=Image.BICUBIC)
    w, h = card.size
    j = lambda: rng.uniform(-0.08, 0.08)  # noqa: E731
    src = [(0, 0), (w, 0), (w, h), (0, h)]
    dst = [
        (w * j(), h * j()),
        (w * (1 + j()), h * j()),
        (w * (1 + j()), h * (1 + j())),
        (w * j(), h * (1 + j())),
    ]
    card = card.transform((w, h), Image.PERSPECTIVE, perspective_coeffs(src, dst), Image.BICUBIC)
    x = (CANVAS - w) // 2 + rng.randint(-30, 30)
    y = (CANVAS - h) // 2 + rng.randint(-30, 30)
    out = bg.convert("RGBA")
    out.alpha_composite(card, (max(-w // 4, x), max(-h // 4, y)))
    return out.convert("RGB")


def camera(rng: random.Random, img: Image.Image) -> Image.Image:
    """Phone camera effects, the same for both classes."""
    img = ImageEnhance.Brightness(img).enhance(rng.uniform(0.6, 1.3))
    img = ImageEnhance.Contrast(img).enhance(rng.uniform(0.7, 1.3))
    img = ImageEnhance.Color(img).enhance(rng.uniform(0.6, 1.3))
    if rng.random() < 0.35:  # glare from a light
        glare = Image.new("RGBA", img.size, (0, 0, 0, 0))
        x, y, r = rng.randint(0, CANVAS), rng.randint(0, CANVAS), rng.randint(30, 90)
        ImageDraw.Draw(glare).ellipse(
            [x - r, y - r, x + r, y + r], fill=(255, 255, 255, rng.randint(40, 110))
        )
        img = Image.alpha_composite(
            img.convert("RGBA"), glare.filter(ImageFilter.GaussianBlur(25))
        ).convert("RGB")
    img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0, 1.3)))
    arr = np.asarray(img, dtype=np.float32)
    arr += np.random.default_rng(rng.randint(0, 2**31)).normal(0, rng.uniform(0, 8), arr.shape)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).resize(
        (FINAL, FINAL), Image.BICUBIC
    )
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=rng.randint(40, 92))
    return Image.open(io.BytesIO(buf.getvalue())).convert("RGB")


def make_photo(rng: random.Random, tampered: bool) -> Image.Image:
    card, qr = stand(rng)
    if tampered:
        tamper(rng, card, qr)
    else:
        decorate_real(rng, card, qr)
    return camera(rng, place(rng, background(rng), card))


def write(folder: Path, count: int, seed: int, prefix: str = "syn") -> None:
    rng = random.Random(seed)
    for label in ("real", "tampered"):
        (folder / label).mkdir(parents=True, exist_ok=True)
    for i in range(count):
        label = "tampered" if i % 2 else "real"
        make_photo(rng, label == "tampered").save(
            folder / label / f"{prefix}_{i:05d}.jpg", quality=92
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--out", type=Path, default=ROOT / "dataset")
    parser.add_argument("--train", type=int, default=800)
    parser.add_argument("--val", type=int, default=200)
    parser.add_argument("--samples", type=Path, help="Only write 6 demo photos to this folder.")
    args = parser.parse_args()

    if args.samples:
        write(args.samples, 6, seed=999, prefix="sample")
        print(f"Wrote demo photos to {args.samples}")
        return
    write(args.out / "train", args.train, seed=1)
    write(args.out / "val", args.val, seed=2)
    print(f"Wrote {args.train} train and {args.val} val photos to {args.out}")


if __name__ == "__main__":
    main()
