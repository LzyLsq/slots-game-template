#!/usr/bin/env python3
"""Split the CC Switch casino atlas into four production game backdrops."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageFilter


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parents[1] / "work" / "generated" / "game_casino_backdrops_atlas_v02.png"
ORIGINAL = PROJECT / "generated-assets" / "cc-switch" / SOURCE.name
OUTPUT = PROJECT / "assets" / "resources" / "generated"

CELLS = (
    ("game01", (0, 0, 510, 766)),
    ("game02", (514, 0, 1024, 766)),
    ("game03", (0, 770, 510, 1536)),
    ("game04", (514, 770, 1024, 1536)),
)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing CC Switch atlas: {SOURCE}")

    ORIGINAL.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(SOURCE, ORIGINAL)

    atlas = Image.open(SOURCE).convert("RGB")
    for game, box in CELLS:
        image = atlas.crop(box).resize((1024, 1536), Image.Resampling.LANCZOS)
        image = image.filter(ImageFilter.UnsharpMask(radius=1.1, percent=78, threshold=3))
        destination = OUTPUT / game / "base_bg_casino_v02.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, quality=97, optimize=True)
        print(destination)


if __name__ == "__main__":
    main()
