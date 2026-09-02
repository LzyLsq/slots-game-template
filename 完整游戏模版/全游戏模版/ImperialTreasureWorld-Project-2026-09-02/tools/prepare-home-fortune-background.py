#!/usr/bin/env python3
"""Crop the CC Switch home artwork to the game's 9:16 design aspect."""

from pathlib import Path

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = PROJECT.parents[1] / "work" / "generated" / "home_fortune_welcome_v05.png"
ORIGINAL = PROJECT / "generated-assets" / "cc-switch" / SOURCE.name
OUTPUT = PROJECT / "assets" / "resources" / "generated" / "home" / SOURCE.name


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"missing CC Switch source: {SOURCE}")
    ORIGINAL.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    if not ORIGINAL.exists():
        ORIGINAL.write_bytes(SOURCE.read_bytes())
    image = Image.open(SOURCE).convert("RGB")
    target_width = round(image.height * 9 / 16)
    left = (image.width - target_width) // 2
    image.crop((left, 0, left + target_width, image.height)).save(OUTPUT, optimize=True)
    print(f"{SOURCE.name}: {image.width}x{image.height} -> {target_width}x{image.height}")


if __name__ == "__main__":
    main()
