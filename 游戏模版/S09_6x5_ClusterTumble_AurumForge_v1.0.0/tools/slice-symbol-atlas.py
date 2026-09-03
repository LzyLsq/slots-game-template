#!/usr/bin/env python3
"""Slice the fixed 3x3 Aurum Forge source atlas into Cocos-ready PNGs."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image


SYMBOLS = (
    "gold-ingots",
    "emerald-crucible",
    "ruby-gear",
    "sapphire-anvil",
    "diamond-tongs",
    "molten-wild",
    "mint-press-scatter",
    "liquid-coin",
    "furnace-bonus",
)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("usage: slice-symbol-atlas.py ATLAS.png OUTPUT_DIR")

    source = Image.open(sys.argv[1]).convert("RGBA")
    if source.width % 3 or source.height % 3:
        raise SystemExit(f"atlas must divide evenly into 3x3 cells: {source.size}")

    output_dir = Path(sys.argv[2])
    output_dir.mkdir(parents=True, exist_ok=True)
    cell_width = source.width // 3
    cell_height = source.height // 3

    for index, symbol in enumerate(SYMBOLS):
        column = index % 3
        row = index // 3
        box = (
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        )
        cell = source.crop(box)
        alpha_box = cell.getchannel("A").getbbox()
        if alpha_box is None:
            raise SystemExit(f"symbol cell is empty: {symbol}")
        cell.save(output_dir / f"{symbol}.png", optimize=True)


if __name__ == "__main__":
    main()
