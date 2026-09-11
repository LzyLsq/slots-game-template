#!/usr/bin/env python3
"""Normalize a generated 3x3/3x4 symbol sheet to a transparent 3x4 atlas."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

from PIL import Image


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: normalize-symbol-atlas.py IMAGE.png")

    path = Path(sys.argv[1])
    atlas = Image.open(path).convert("RGBA")
    cell_width = atlas.width // 3
    expected_height = cell_width * 4
    if atlas.height == expected_height:
        return
    if atlas.height != cell_width * 3:
        raise SystemExit(
            f"unsupported geometry {atlas.width}x{atlas.height}; expected square 3x3 or 3x4"
        )

    normalized = Image.new("RGBA", (atlas.width, expected_height), (0, 0, 0, 0))
    normalized.alpha_composite(atlas, (0, 0))
    descriptor, temporary = tempfile.mkstemp(
        prefix=f".{path.stem}-", suffix=".png", dir=path.parent
    )
    os.close(descriptor)
    try:
        normalized.save(temporary, optimize=True)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


if __name__ == "__main__":
    main()
