#!/usr/bin/env python3
"""Turn a black-backed additive VFX render into a straight-alpha PNG."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


def remove_black_matte(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    output: list[tuple[int, int, int, int]] = []

    for red, green, blue, source_alpha in image.getdata():
        peak = max(red, green, blue)
        if peak <= 7 or source_alpha == 0:
            output.append((0, 0, 0, 0))
            continue

        # The source is an additive render over black. Recover straight-alpha
        # color so dark canvas pixels disappear while cyan water and sparkles
        # retain their original perceived brightness over any game background.
        alpha = round(peak * source_alpha / 255)
        scale = 255.0 / peak
        output.append((
            min(255, round(red * scale)),
            min(255, round(green * scale)),
            min(255, round(blue * scale)),
            alpha,
        ))

    image.putdata(output)
    image.save(path, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: remove-black-matte.py PNG [PNG ...]")
    for item in sys.argv[1:]:
        remove_black_matte(Path(item))
