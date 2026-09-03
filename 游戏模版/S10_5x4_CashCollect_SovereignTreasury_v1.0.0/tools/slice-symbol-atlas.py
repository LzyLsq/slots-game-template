#!/usr/bin/env python3
"""Slice the fixed 3x3 Sovereign Treasury atlas into Cocos-ready PNGs."""

from __future__ import annotations

import sys
from pathlib import Path
from PIL import Image


SYMBOLS = (
    "gold-ingots",
    "ruby-signet",
    "sapphire-watch",
    "emerald-lockbox",
    "diamond-key",
    "platinum-lion",
    "vault-wild",
    "sovereign-coin",
    "collector-chest",
)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: slice-symbol-atlas.py ATLAS.png OUTPUT_DIR")
    source = Image.open(sys.argv[1]).convert("RGBA")
    width = source.width - source.width % 3
    height = source.height - source.height % 3
    source = source.crop((0, 0, width, height))
    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)
    cell_width = width // 3
    cell_height = height // 3
    for index, name in enumerate(SYMBOLS):
        column = index % 3
        row = index // 3
        cell = source.crop((column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height))
        if cell.getchannel("A").getbbox() is None:
            raise SystemExit(f"symbol cell is empty: {name}")
        cell.save(output_dir / f"{name}.png", optimize=True)


if __name__ == "__main__":
    main()
