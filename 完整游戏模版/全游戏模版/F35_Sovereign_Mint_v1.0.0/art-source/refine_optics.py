"""Isolate and feather the CC Switch-generated light art for animated use.

The raw atlas includes white matte and a complete stained-glass window in
its fourth quadrant. Those are visible as rectangular stripes when sampled
as glints. This keeps only the authored light details on transparent tiles.
"""
from pathlib import Path
from PIL import Image
import math

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'assets/resources/art/optics.png').convert('RGBA')
output = Image.new('RGBA', source.size)
side = source.width // 2
for index in range(4):
    tile = source.crop(((index % 2) * side, (index // 2) * side,
                        ((index % 2) + 1) * side, ((index // 2) + 1) * side))
    if index == 3:
        # A warm glint from the generated bokeh quadrant replaces the window
        # motif, which reads as a rectangular pane when used as a tiny light.
        bokeh = source.crop((554, 56, 1024, 470))
        tile = bokeh.crop((54, 84, 234, 264)).resize((side, side), Image.Resampling.LANCZOS)
    pixels = tile.load()
    center = (side - 1) / 2
    radius = side * (0.44 if index != 3 else 0.40)
    for y in range(side):
        for x in range(side):
            r = math.hypot(x - center, y - center) / radius
            feather = max(0, 1 - r * r) ** 2
            red, green, blue, alpha = pixels[x, y]
            new_alpha = int(alpha * feather)
            pixels[x, y] = (red, green, blue, new_alpha) if new_alpha else (0, 0, 0, 0)
    output.paste(tile, ((index % 2) * side, (index // 2) * side))
output.save(ROOT / 'assets/resources/art/optics.png', optimize=True)
