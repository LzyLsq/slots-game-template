#!/usr/bin/env python3
"""Remove a neutral studio background connected to the image edge.

CC Switch may return an opaque studio-black canvas for a requested cut-out.
It may also render a light grey/white transparency checkerboard into the RGB
pixels.  This conservative flood fill removes either kind of edge-connected
background while preserving enclosed highlights and dark details inside the
subject, then feathers the outer silhouette for Cocos alpha blending.
"""

from __future__ import annotations

import os
import sys
import tempfile
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: remove-edge-background.py IMAGE.png")
    path = Path(sys.argv[1])
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def edge_background(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        high = max(r, g, b)
        low = min(r, g, b)
        chroma = high - low
        dark_studio = high < 72 and chroma < 34
        baked_checkerboard = low > 168 and chroma < 24
        return dark_studio or baked_checkerboard

    for x in range(width):
        if edge_background(x, 0): queue.append((x, 0))
        if edge_background(x, height - 1): queue.append((x, height - 1))
    for y in range(height):
        if edge_background(0, y): queue.append((0, y))
        if edge_background(width - 1, y): queue.append((width - 1, y))

    mask = Image.new("L", image.size, 255)
    mask_pixels = mask.load()
    while queue:
        x, y = queue.popleft()
        offset = y * width + x
        if seen[offset] or not edge_background(x, y):
            continue
        seen[offset] = 1
        mask_pixels[x, y] = 0
        if x: queue.append((x - 1, y))
        if x + 1 < width: queue.append((x + 1, y))
        if y: queue.append((x, y - 1))
        if y + 1 < height: queue.append((x, y + 1))

    mask = mask.filter(ImageFilter.GaussianBlur(1.25))
    image.putalpha(mask)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.stem}-", suffix=".png", dir=path.parent)
    os.close(descriptor)
    try:
        image.save(temporary, optimize=True)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == "__main__":
    main()
