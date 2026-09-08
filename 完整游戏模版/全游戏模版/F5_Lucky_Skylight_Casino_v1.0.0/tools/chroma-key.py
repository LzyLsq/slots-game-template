#!/usr/bin/env python3
"""Deterministically remove a flat chroma background while preserving soft edges."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

from PIL import Image


def main() -> None:
    if len(sys.argv) not in (2, 5):
        raise SystemExit("usage: chroma-key.py IMAGE.png [R G B]")
    path = Path(sys.argv[1])
    key = tuple(map(int, sys.argv[2:5])) if len(sys.argv) == 5 else (0, 255, 0)
    image = Image.open(path).convert("RGBA")
    pixels = image.load()
    kr, kg, kb = key
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            distance = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
            alpha = max(0, min(255, round((distance - 55) * 5.5)))
            if alpha < 255:
                if kg > kr and kg > kb:
                    g = min(g, round(max(r, b) * 1.12))
                elif kr > kg and kb > kg:
                    shared = max(g, min(r, b))
                    r = min(r, round(shared * 1.12))
                    b = min(b, round(shared * 1.12))
            pixels[x, y] = (r, g, b, alpha)

    # Chroma spill can remain fully opaque along dark hair and tailored fabric
    # even after the green background has been removed. Limit de-spill to the
    # two-pixel silhouette boundary so real emerald costume details and dice
    # stay saturated in the subject interior.
    for _ in range(2):
        edge_pixels: list[tuple[int, int]] = []
        for y in range(1, image.height - 1):
            for x in range(1, image.width - 1):
                r, g, b, alpha = pixels[x, y]
                if alpha == 0 or g <= max(r, b) * 1.16:
                    continue
                if any(pixels[x + dx, y + dy][3] < 48 for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                    edge_pixels.append((x, y))
        for x, y in edge_pixels:
            r, g, b, alpha = pixels[x, y]
            pixels[x, y] = (r, min(g, round(max(r, b) * 1.08)), b, alpha)
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
