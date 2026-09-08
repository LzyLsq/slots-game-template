#!/usr/bin/env python3
"""Remove only a dark background connected to the image edge.

CC Switch may return an opaque studio-black canvas for a requested cut-out.
This conservative flood fill preserves dark details inside the subject while
feathering the outer silhouette for Cocos alpha blending.
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

    def dark(x: int, y: int) -> bool:
        r, g, b, _ = pixels[x, y]
        return max(r, g, b) < 72 and (max(r, g, b) - min(r, g, b)) < 34

    for x in range(width):
        if dark(x, 0): queue.append((x, 0))
        if dark(x, height - 1): queue.append((x, height - 1))
    for y in range(height):
        if dark(0, y): queue.append((0, y))
        if dark(width - 1, y): queue.append((width - 1, y))

    mask = Image.new("L", image.size, 255)
    mask_pixels = mask.load()
    while queue:
        x, y = queue.popleft()
        offset = y * width + x
        if seen[offset] or not dark(x, y):
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
