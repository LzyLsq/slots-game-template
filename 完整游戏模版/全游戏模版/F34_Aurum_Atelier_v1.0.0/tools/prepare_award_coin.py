"""Derive the moving coin from F34's original CC Switch raster.

The engraved source is preserved. A premultiplied Lanczos downsample removes
high-frequency aliasing when the coin rotates at a 25–45px phone display size;
no icon geometry, new artwork or source repainting is introduced.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/resources/art/award-coin.png'
TARGET = ROOT / 'assets/resources/art/award-coin-flight.png'
image = Image.open(SOURCE).convert('RGBA')
width = 192
image.resize((width, round(width * image.height / image.width)), Image.Resampling.LANCZOS).save(TARGET, optimize=True)
print(f'{SOURCE.name} {image.size} -> {TARGET.name} {Image.open(TARGET).size}')
