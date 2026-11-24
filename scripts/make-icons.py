#!/usr/bin/env python3
"""Generate PWA icons. Run from anywhere: python3 scripts/make-icons.py"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"
FONT = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
BG = "#1B6B56"
FG = "#F4F0E6"


def draw_icon(size: int, glyph_ratio: float, path: Path, plus: bool = False) -> None:
    image = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(image)
    if plus:
        thickness = max(2, int(size * 0.1))
        length = int(size * 0.42)
        cx = cy = size / 2
        radius = thickness / 2
        draw.rounded_rectangle(
            [cx - thickness / 2, cy - length / 2, cx + thickness / 2, cy + length / 2],
            radius=radius,
            fill=FG,
        )
        draw.rounded_rectangle(
            [cx - length / 2, cy - thickness / 2, cx + length / 2, cy + thickness / 2],
            radius=radius,
            fill=FG,
        )
    else:
        font = ImageFont.truetype(FONT, int(size * glyph_ratio))
        text = "记"
        bbox = draw.textbbox((0, 0), text, font=font)
        x = (size - (bbox[2] - bbox[0])) / 2 - bbox[0]
        y = (size - (bbox[3] - bbox[1])) / 2 - bbox[1]
        draw.text((x, y), text, font=font, fill=FG)
    image.save(path, "PNG")


def main() -> None:
    ROOT.mkdir(parents=True, exist_ok=True)
    draw_icon(192, 0.5, ROOT / "icon-192.png")
    draw_icon(512, 0.5, ROOT / "icon-512.png")
    draw_icon(512, 0.36, ROOT / "icon-512-maskable.png")
    draw_icon(180, 0.5, ROOT / "apple-touch-icon.png")
    draw_icon(192, 0.42, ROOT / "shortcut-add.png", plus=True)
    print(f"wrote icons to {ROOT}")


if __name__ == "__main__":
    main()
