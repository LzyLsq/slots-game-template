#!/usr/bin/env python3
"""Merge an AI outpaint with the pixel-exact authored cabinet center."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def feather_mask(width: int, height: int, feather: int) -> Image.Image:
    mask = Image.new("L", (width, height), 255)
    pixels = mask.load()
    for y in range(feather):
        alpha = round(255 * y / max(1, feather - 1))
        for x in range(width):
            pixels[x, y] = alpha
            pixels[x, height - 1 - y] = alpha
    return mask


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("generated", type=Path)
    parser.add_argument("original", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--top", type=int, required=True)
    parser.add_argument("--feather", type=int, default=48)
    args = parser.parse_args()

    generated = Image.open(args.generated).convert("RGB")
    original = Image.open(args.original).convert("RGB")
    if original.width != args.width:
        raise SystemExit(f"original width {original.width} != target width {args.width}")
    if args.top < 0 or args.top + original.height > args.height:
        raise SystemExit("original does not fit inside target canvas")

    base = generated.resize((args.width, args.height), Image.Resampling.LANCZOS)
    mask = feather_mask(original.width, original.height, args.feather)
    base.paste(original, (0, args.top), mask)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    base.save(args.output, format="PNG", optimize=True)
    print(f"composed {args.output} ({args.width}x{args.height})")


if __name__ == "__main__":
    main()
