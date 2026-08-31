#!/usr/bin/env python3
"""Convert the flat magenta generation matte to clean PNG alpha."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def remove_magenta(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    output: list[tuple[int, int, int, int]] = []
    for red, green, blue, source_alpha in image.getdata():
        alpha = source_alpha
        if source_alpha < 255:
            alpha = round(255 * min(1.0, max(0.0, (source_alpha - 24.0) / 231.0)))

        # The model can shade the requested flat matte into a magenta vignette.
        # Key by hue as well as exact color so no rectangular halo survives.
        low = max(1, min(red, blue))
        magenta_excess = min(red, blue) - green
        channel_balance = max(red, blue) / low
        if magenta_excess > 5 and channel_balance < 2.05:
            hue_alpha = round(255 * min(1.0, max(0.0, (24.0 - magenta_excess) / 19.0)))
            alpha = min(alpha, hue_alpha)

        if alpha < 255:
            spill = (255 - alpha) / 255.0
            shared = min(red, blue)
            red = round(red - max(0, shared - green) * spill * 0.7)
            blue = round(blue - max(0, shared - green) * spill * 0.7)
        output.append((max(0, red), green, max(0, blue), alpha))
    image.putdata(output)
    image.save(path, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: remove-chroma.py PNG [PNG ...]")
    for item in sys.argv[1:]:
        remove_magenta(Path(item))
