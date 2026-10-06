#!/usr/bin/env python3
"""Generate the default Open Graph/Twitter share card for RankMyIncome."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "social-card.png"
W, H = 1200, 630

img = Image.new("RGB", (W, H), "#07111f")
d = ImageDraw.Draw(img)

# Subtle layered background without external artwork.
d.ellipse((650, -260, 1330, 420), fill="#102c47")
d.ellipse((-280, 300, 430, 1010), fill="#171f43")
d.rounded_rectangle((72, 72, W - 72, H - 72), radius=42, fill="#0b1928", outline="#284662", width=3)

try:
    bold = ImageFont.truetype("DejaVuSans-Bold.ttf", 76)
    medium = ImageFont.truetype("DejaVuSans-Bold.ttf", 31)
    small = ImageFont.truetype("DejaVuSans.ttf", 26)
except OSError:
    bold = medium = small = ImageFont.load_default()

# Simple original rank emblem.
cx, cy = 930, 315
poly = [(cx, cy - 116), (cx + 100, cy - 50), (cx + 78, cy + 92), (cx, cy + 130), (cx - 78, cy + 92), (cx - 100, cy - 50)]
d.polygon(poly, fill="#10283c", outline="#6ee7ff")
d.polygon([(cx, cy - 62), (cx + 54, cy), (cx, cy + 72), (cx - 54, cy)], fill="#172a4a", outline="#bda6ff")
d.text((cx, cy + 1), "R", font=medium, fill="#f7fbff", anchor="mm")

d.text((128, 126), "RankMyIncome", font=medium, fill="#6ee7ff")
d.text((128, 218), "What tier is", font=bold, fill="#f7fbff")
d.text((128, 300), "your income?", font=bold, fill="#bda6ff")
d.text((128, 420), "Compare your annual income by country and worldwide.", font=small, fill="#b5c6d5")
d.text((128, 474), "208 countries & territories · WID.world data", font=small, fill="#8ea7bc")

img.save(OUT, optimize=True)
print(f"Wrote {OUT}")
