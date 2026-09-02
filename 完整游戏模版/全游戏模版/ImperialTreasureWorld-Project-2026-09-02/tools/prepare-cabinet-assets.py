#!/usr/bin/env python3
"""Split a CC Switch cabinet atlas and remove connected cobalt keying."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT / "assets" / "resources" / "generated" / "common"
ORIGINALS = PROJECT / "generated-assets" / "cc-switch"

SECTION_RATIOS_BY_VERSION = {
    "v02": ((0.35, 0.60), (0.34, 0.58), (0.32, 0.58), (0.36, 0.59)),
    "v03": ((0.35, 0.60), (0.34, 0.58), (0.32, 0.58), (0.36, 0.59)),
    "v04": ((0.27, 0.61), (0.27, 0.61), (0.25, 0.60), (0.25, 0.61)),
}
CELL_BOXES_BY_VERSION = {
    "v02": ((0, 0, 627, 627), (627, 0, 1254, 627), (0, 627, 627, 1254), (627, 627, 1254, 1254)),
    # v03 intentionally contains a white separator. Excluding it lets the
    # connected cobalt matte grow inward from each real cell edge.
    "v03": ((0, 0, 618, 618), (634, 0, 1254, 618), (0, 634, 618, 1254), (634, 634, 1254, 1254)),
    "v04": ((0, 0, 619, 621), (635, 0, 1254, 621), (0, 638, 619, 1254), (635, 638, 1254, 1254)),
}


def is_cobalt(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    return blue > 92 and blue - red > 38 and blue - green > 28


def remove_cobalt(image: Image.Image) -> Image.Image:
    """Remove only blue pixels connected to a cell edge.

    The v02 pearl cabinet intentionally contains sapphire buttons and a crown
    jewel. A global blue-dominance key would erase them, so the matte grows
    inward from the atlas cell boundary and cannot cross the metal silhouette.
    """

    rgba = image.convert("RGBA")
    width, height = rgba.size
    source = rgba.load()
    connected = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if connected[index] or not is_cobalt(source[x, y]):
            return
        connected[index] = 1
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

    result = list(rgba.getdata())
    for index, background in enumerate(connected):
        if background:
            result[index] = (0, 0, 0, 0)
    rgba.putdata(result)
    bounds = rgba.getchannel("A").getbbox()
    if bounds is None:
        raise RuntimeError("cobalt removal produced an empty image")
    left, top, right, bottom = bounds
    padding = 4
    return rgba.crop((max(0, left - padding), max(0, top - padding), min(rgba.width, right + padding), min(rgba.height, bottom + padding)))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", choices=tuple(SECTION_RATIOS_BY_VERSION), default="v02")
    args = parser.parse_args()
    version = args.version
    source = PROJECT.parents[1] / "work" / "generated" / f"wealth_cabinet_atlas_{version}.png"
    cells = tuple(
        (f"cabinet_{name}_{version}.png", box)
        for name, box in zip(("ruby", "golden", "classic", "pearl"), CELL_BOXES_BY_VERSION[version])
    )
    section_ratios = SECTION_RATIOS_BY_VERSION[version]
    if not source.exists():
        raise SystemExit(f"missing CC Switch atlas: {source}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    ORIGINALS.mkdir(parents=True, exist_ok=True)
    original_copy = ORIGINALS / source.name
    if not original_copy.exists():
        original_copy.write_bytes(source.read_bytes())
    atlas = Image.open(source)
    for index, (filename, box) in enumerate(cells):
        destination = OUTPUT / filename
        cutout = remove_cobalt(atlas.crop(box))
        cutout.save(destination, optimize=True)
        top_ratio, lower_ratio = section_ratios[index]
        stem = destination.stem
        top = cutout.crop((0, 0, cutout.width, round(cutout.height * top_ratio)))
        lower = cutout.crop((0, round(cutout.height * lower_ratio), cutout.width, cutout.height))
        top_path = OUTPUT / f"{stem}_top.png"
        lower_path = OUTPUT / f"{stem}_lower.png"
        top.save(top_path, optimize=True)
        lower.save(lower_path, optimize=True)
        print(f"{filename}: {cutout.width}x{cutout.height}; top {top.width}x{top.height}; lower {lower.width}x{lower.height}")


if __name__ == "__main__":
    main()
