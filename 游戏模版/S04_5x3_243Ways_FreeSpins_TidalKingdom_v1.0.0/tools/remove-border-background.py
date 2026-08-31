#!/usr/bin/env python3
"""Remove the connected dark-teal generation canvas around UI artwork."""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, alpha = pixel
    return alpha > 0 and red < 72 and green < 132 and blue < 154 and blue >= green * 0.78


def remove_connected_border(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.load()
    queue: deque[tuple[int, int]] = deque()
    seen = bytearray(width * height)

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if seen[index] or not is_background(pixels[x, y]):
            return
        seen[index] = 1
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

    matte = Image.new("L", image.size, 255)
    matte_data = matte.load()
    for y in range(height):
        row = y * width
        for x in range(width):
            if seen[row + x]:
                matte_data[x, y] = 0
    matte = matte.filter(ImageFilter.GaussianBlur(1.0))
    source_alpha = image.getchannel("A")
    image.putalpha(Image.composite(source_alpha, matte, matte))
    image.save(path, optimize=True)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("usage: remove-border-background.py PNG [PNG ...]")
    for item in sys.argv[1:]:
        remove_connected_border(Path(item))
