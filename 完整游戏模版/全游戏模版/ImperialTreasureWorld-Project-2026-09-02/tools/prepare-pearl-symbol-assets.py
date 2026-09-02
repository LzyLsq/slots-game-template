#!/usr/bin/env python3
"""Prepare the CC Switch Pearl Fortune atlas for Cocos without redrawing it."""

from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "generated-assets" / "cc-switch" / "pearl_fortune_symbols_atlas_v01.png"
RAW_TARGET = ROOT / "assets" / "resources" / "generated" / "game04" / "symbol_atlas_v02.png"
CUTOUT_TARGET = ROOT / "assets" / "resources" / "generated" / "game04" / "symbol_atlas_cutout_v02.png"


def connected_background_mask(image: Image.Image) -> Image.Image:
    """Find only dark pixels connected to the canvas edge.

    This keeps the enclosed dark body of the black pearl opaque while removing
    the uniform warm-charcoal atlas background and gutters.
    """

    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def candidate(x: int, y: int) -> bool:
        red, green, blue = pixels[x, y]
        return max(red, green, blue) <= 48 and max(red, green, blue) - min(red, green, blue) <= 28

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if visited[index] or not candidate(x, y):
            return
        visited[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    foreground = Image.new("L", (width, height), 255)
    foreground_pixels = foreground.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if visited[row + x]:
                foreground_pixels[x, y] = 0
    return foreground.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.55))


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing CC Switch atlas: {SOURCE}")
    source = Image.open(SOURCE).convert("RGBA")
    RAW_TARGET.parent.mkdir(parents=True, exist_ok=True)
    source.convert("RGB").save(RAW_TARGET, optimize=True)
    cutout = source.copy()
    cutout.putalpha(connected_background_mask(source))
    cutout.save(CUTOUT_TARGET, optimize=True)
    print(f"Pearl symbol atlas prepared: {source.width}x{source.height}")


if __name__ == "__main__":
    main()
