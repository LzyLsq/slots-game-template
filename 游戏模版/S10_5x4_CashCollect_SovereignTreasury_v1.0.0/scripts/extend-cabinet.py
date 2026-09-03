from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/resources/theme/sovereign-treasury/cabinet-v1.png"
OUTPUT = ROOT / "assets/resources/theme/sovereign-treasury/cabinet-portrait-v3.png"
EXTENSION = 340
TOP_SAMPLE = 72
BOTTOM_SAMPLE = 120


def darken_outward(image: Image.Image, top: bool) -> Image.Image:
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    for y in range(image.height):
        distance = 1 - y / max(1, image.height - 1) if top else y / max(1, image.height - 1)
        draw.line((0, y, image.width, y), fill=(25, 6, 12, round(150 * distance)))
    return Image.alpha_composite(image.convert("RGBA"), overlay)


source = Image.open(SOURCE).convert("RGBA")
width, height = source.size

top = source.crop((0, 0, width, TOP_SAMPLE)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
top = top.resize((width, EXTENSION), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(0.7))
top = darken_outward(ImageEnhance.Contrast(ImageEnhance.Color(top).enhance(0.82)).enhance(0.96), top=True)

bottom = source.crop((0, height - BOTTOM_SAMPLE, width, height)).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
bottom = bottom.resize((width, EXTENSION), Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(0.7))
bottom = darken_outward(ImageEnhance.Contrast(ImageEnhance.Color(bottom).enhance(0.76)).enhance(0.94), top=False)

portrait = Image.new("RGBA", (width, height + EXTENSION * 2))
portrait.alpha_composite(top, (0, 0))
portrait.alpha_composite(source, (0, EXTENSION))
portrait.alpha_composite(bottom, (0, EXTENSION + height))
portrait.convert("RGB").save(OUTPUT, format="PNG", optimize=True)
print(f"Created {OUTPUT} ({portrait.width}x{portrait.height})")
