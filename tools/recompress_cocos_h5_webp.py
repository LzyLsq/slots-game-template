#!/usr/bin/env python3
"""Convert Cocos Web native textures and top-level loader art to WebP."""

from __future__ import annotations

import argparse
import concurrent.futures
import re
import subprocess
from pathlib import Path


IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg"}
TEXT_SUFFIXES = {".html", ".css", ".js", ".mjs", ".json"}


def encode(cwebp: Path, source: Path, quality: int) -> tuple[Path, Path]:
    target = source.with_suffix(".webp")
    temporary = target.with_suffix(".webp.tmp")
    subprocess.run(
        [
            str(cwebp),
            "-quiet",
            "-mt",
            "-m",
            "6",
            "-q",
            str(quality),
            "-alpha_q",
            "100",
            "-metadata",
            "none",
            str(source),
            "-o",
            str(temporary),
        ],
        check=True,
    )
    if not temporary.is_file() or temporary.stat().st_size == 0:
        raise RuntimeError(f"WebP output is empty: {source}")
    temporary.replace(target)
    return source, target


def update_native_metadata(source: Path) -> None:
    import_file = Path(str(source).replace("/native/", "/import/")).with_suffix(".json")
    if not import_file.is_file():
        raise RuntimeError(f"Missing Cocos import metadata: {import_file}")
    original = import_file.read_text(encoding="utf-8")
    updated, count = re.subn(r'("fmt"\s*:\s*)"0"', r'\1"4"', original)
    if count != 1:
        raise RuntimeError(f"Expected one PNG format marker in {import_file}, found {count}")
    import_file.write_text(updated, encoding="utf-8")


def update_top_level_references(h5: Path, replacements: dict[str, str]) -> None:
    for path in h5.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        try:
            original = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        updated = original
        for old_name, new_name in replacements.items():
            updated = updated.replace(old_name, new_name)
        if updated != original:
            path.write_text(updated, encoding="utf-8")


def convert_h5(cwebp: Path, h5: Path, quality: int, workers: int) -> tuple[int, int]:
    native_images = sorted(
        path
        for path in h5.glob("assets/*/native/**/*")
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )
    top_images = sorted(
        path
        for path in h5.iterdir()
        if path.is_file() and path.suffix.lower() in IMAGE_SUFFIXES
    )
    images = native_images + top_images
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        futures = [executor.submit(encode, cwebp, path, quality) for path in images]
        converted = [future.result() for future in futures]

    for source in native_images:
        update_native_metadata(source)

    replacements = {source.name: target.name for source, target in converted if source in top_images}
    update_top_level_references(h5, replacements)

    for source, target in converted:
        if not target.is_file():
            raise RuntimeError(f"Missing converted image: {target}")
        source.unlink()
    return len(native_images), len(top_images)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    parser.add_argument("--cwebp", type=Path, required=True)
    parser.add_argument("--quality", type=int, default=82)
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()

    h5_directories = sorted(args.root.glob("*/*_H5"))
    if not h5_directories:
        raise SystemExit(f"No *_H5 directories found below {args.root}")
    for h5 in h5_directories:
        native_count, top_count = convert_h5(
            args.cwebp, h5, args.quality, args.workers
        )
        print(f"{h5.name}: native={native_count}, loader={top_count}", flush=True)


if __name__ == "__main__":
    main()
