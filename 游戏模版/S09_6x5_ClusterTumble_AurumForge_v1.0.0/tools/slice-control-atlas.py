#!/usr/bin/env python3
"""Slice the fixed 3x2 Aurum Forge control atlas into Cocos-ready PNGs."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


CONTROLS = ("home", "rules", "sound", "add", "auto", "spin")


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: slice-control-atlas.py ATLAS.png OUTPUT_DIR")
    source = Image.open(sys.argv[1]).convert("RGBA")
    if source.width % 3 or source.height % 2:
        raise SystemExit(f"atlas must divide evenly into 3x2 cells: {source.size}")
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)
    width = source.width // 3
    height = source.height // 2
    for index, name in enumerate(CONTROLS):
        column = index % 3
        row = index // 3
        cell = source.crop((column * width, row * height, (column + 1) * width, (row + 1) * height))
        if cell.getchannel("A").getbbox() is None:
            raise SystemExit(f"control cell is empty: {name}")
        cell.save(output_dir / f"{name}.png", optimize=True)


if __name__ == "__main__":
    main()
