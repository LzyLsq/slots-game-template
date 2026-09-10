"""Prepare the authored F12 image set for Cocos Creator.

The image generator previewed transparency with a baked checkerboard.  This
script removes only checker pixels connected to each atlas cell's perimeter,
keeps pale highlights inside the authored objects, and normalises every atlas
to an exact 4 x 4 / 1024-square layout.  Motion-blur atlases are produced per
cell so a spinning reel can never sample a neighbouring symbol.
"""

from __future__ import annotations

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1] / "assets" / "resources" / "art"
ATLAS_NAMES = (
    "granary-symbols",
    "lantern-river-symbols",
    "jade-koi-symbols",
    "fortune-drum-symbols",
    "cabinet-controls",
)


def connected_checker_alpha(tile: Image.Image) -> Image.Image:
    rgba = np.asarray(tile.convert("RGBA"), dtype=np.float32).copy()
    rgb = rgba[:, :, :3]
    height, width, _ = rgb.shape

    # The baked preview alternates two neutral greys.  Low chroma plus the
    # characteristic mid/high luminance isolates those checks without keying
    # red enamel, jade, gold, or dark authored shadow detail.
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    luminance = rgb.mean(axis=2)
    candidate = (chroma < 11) & (luminance > 142)
    connected = np.zeros((height, width), dtype=np.bool_)
    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        if candidate[0, x]:
            queue.append((0, x))
        if candidate[height - 1, x]:
            queue.append((height - 1, x))
    for y in range(height):
        if candidate[y, 0]:
            queue.append((y, 0))
        if candidate[y, width - 1]:
            queue.append((y, width - 1))
    while queue:
        y, x = queue.popleft()
        if connected[y, x] or not candidate[y, x]:
            continue
        connected[y, x] = True
        if y:
            queue.append((y - 1, x))
        if y + 1 < height:
            queue.append((y + 1, x))
        if x:
            queue.append((y, x - 1))
        if x + 1 < width:
            queue.append((y, x + 1))

    outside = Image.fromarray((connected * 255).astype(np.uint8), "L")
    outside = outside.filter(ImageFilter.GaussianBlur(1.15))
    rgba[:, :, 3] *= 1.0 - np.asarray(outside, dtype=np.float32) / 255.0
    return Image.fromarray(np.clip(rgba, 0, 255).astype(np.uint8), "RGBA")


def fitted_cell(tile: Image.Image, size: int = 256) -> Image.Image:
    alpha = tile.getchannel("A").point(lambda value: 255 if value > 18 else 0)
    bounds = alpha.getbbox()
    output = Image.new("RGBA", (size, size))
    if not bounds:
        return output
    subject = tile.crop(bounds)
    subject.thumbnail((round(size * 0.88), round(size * 0.88)), Image.Resampling.LANCZOS)
    output.alpha_composite(subject, ((size - subject.width) // 2, (size - subject.height) // 2))
    return output


def normalise_atlas(name: str) -> None:
    source_path = ROOT / f"{name}.png"
    image = Image.open(source_path).convert("RGBA")
    output = Image.new("RGBA", (1024, 1024))
    for row in range(4):
        for column in range(4):
            tile = image.crop(
                (
                    round(column * image.width / 4),
                    round(row * image.height / 4),
                    round((column + 1) * image.width / 4),
                    round((row + 1) * image.height / 4),
                )
            )
            tile = fitted_cell(connected_checker_alpha(tile))
            output.alpha_composite(tile, (column * 256, row * 256))
    output.save(source_path, optimize=True)

    if "symbols" in name:
        blur = Image.new("RGBA", output.size)
        for row in range(4):
            for column in range(4):
                tile = output.crop((column * 256, row * 256, (column + 1) * 256, (row + 1) * 256))
                smear = tile.resize((256, 92), Image.Resampling.BILINEAR).resize((256, 256), Image.Resampling.BILINEAR)
                smear = smear.filter(ImageFilter.GaussianBlur((1.2, 3.2)))
                blur.alpha_composite(smear, (column * 256, row * 256))
        blur.save(ROOT / f"{name}-blur.png", optimize=True)
    print(f"prepared {source_path.name}: 1024x1024 RGBA")


def prepare_concierge() -> None:
    path = ROOT / "festival-concierge.png"
    image = connected_checker_alpha(Image.open(path))
    image.save(path, optimize=True)
    print(f"prepared {path.name}: {image.width}x{image.height} RGBA")


def main() -> None:
    for atlas_name in ATLAS_NAMES:
        normalise_atlas(atlas_name)
    prepare_concierge()


if __name__ == "__main__":
    main()
