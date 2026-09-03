#!/usr/bin/env python3
"""Slice the fixed 4x2 Sovereign Treasury control atlas."""

from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image


CONTROLS = ("home", "rules", "sound", "add", "minus", "plus", "auto", "spin")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: slice-control-atlas.py ATLAS.png OUTPUT_DIR")
    source = Image.open(sys.argv[1]).convert("RGBA")
    width = source.width - source.width % 4
    height = source.height - source.height % 2
    source = source.crop((0, 0, width, height))
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)
    cell_width = width // 4
    cell_height = height // 2
    for index, name in enumerate(CONTROLS):
        column = index % 4
        row = index // 4
        cell = source.crop((column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height))
        if cell.getchannel("A").getbbox() is None:
            raise SystemExit(f"control cell is empty: {name}")
        cell.save(output_dir / f"{name}.png", optimize=True)


if __name__ == "__main__":
    main()
