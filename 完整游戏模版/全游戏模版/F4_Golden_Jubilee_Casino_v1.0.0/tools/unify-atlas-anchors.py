#!/usr/bin/env python3
"""Paste the exact shared Ava and eclipse emblem into every theme atlas."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


def fitted(source: Image.Image, width: int, height: int) -> Image.Image:
    alpha = source.getchannel("A")
    box = alpha.getbbox()
    if box:
        source = source.crop(box)
    source.thumbnail((width, height), Image.Resampling.LANCZOS)
    return source


def fitted_ava_portrait(source: Image.Image, width: int, height: int) -> Image.Image:
    alpha = source.getchannel("A")
    box = alpha.getbbox()
    if box:
        source = source.crop(box)
    # The shared source is full-body for the lobby. Reel cells need the same
    # face and jacket rendered as a readable host portrait, not a tiny figure.
    portrait_height = max(1, round(source.height * 0.53))
    return fitted(source.crop((0, 0, source.width, portrait_height)), width, height)


def paste_cell(atlas: Image.Image, art: Image.Image, index: int, columns: int = 3, rows: int = 4) -> None:
    cell_w = atlas.width // columns
    cell_h = atlas.height // rows
    item = fitted(art.copy(), round(cell_w * 0.78), round(cell_h * 0.78))
    left = index % columns * cell_w + (cell_w - item.width) // 2
    top = index // columns * cell_h + (cell_h - item.height) // 2
    atlas.alpha_composite(item, (left, top))


def paste_ava_cell(atlas: Image.Image, art: Image.Image, index: int, columns: int = 3, rows: int = 4) -> None:
    cell_w = atlas.width // columns
    cell_h = atlas.height // rows
    item = fitted_ava_portrait(art.copy(), round(cell_w * 0.88), round(cell_h * 0.88))
    left = index % columns * cell_w + (cell_w - item.width) // 2
    top = index // columns * cell_h + (cell_h - item.height) // 2
    atlas.alpha_composite(item, (left, top))


def normalize_grid(atlas: Image.Image, columns: int = 3, rows: int = 4) -> Image.Image:
    """Keep the generated art square while enforcing the runtime's 3x4 grid."""
    cell = atlas.width // columns
    expected_height = cell * rows
    if atlas.height == expected_height:
        return atlas
    if atlas.height == cell * 3:
        normalized = Image.new("RGBA", (atlas.width, expected_height), (0, 0, 0, 0))
        normalized.alpha_composite(atlas, (0, 0))
        return normalized
    raise ValueError(
        f"unsupported atlas geometry {atlas.width}x{atlas.height}; expected a 3x3 or 3x4 square-cell grid"
    )


def remove_generated_cell_art(atlas: Image.Image, index: int, columns: int = 3) -> Image.Image:
    """Remove a generated symbol by component, including art spilled across a cell edge."""
    source_rows = 3 if atlas.height == atlas.width else 4
    cell_w = atlas.width / columns
    cell_h = atlas.height / source_rows
    column = index % columns
    row = index // columns
    left = column * cell_w
    right = (column + 1) * cell_w
    top = row * cell_h
    pixels = np.asarray(atlas).copy()
    labels, count = ndimage.label(pixels[:, :, 3] > 28)
    if count == 0:
        return atlas
    slices = ndimage.find_objects(labels)
    remove_labels: list[int] = []
    for label_index, bounds in enumerate(slices, start=1):
        if bounds is None:
            continue
        ys, xs = bounds
        area = int(np.count_nonzero(labels[bounds] == label_index))
        center_x = (xs.start + xs.stop) / 2
        center_y = (ys.start + ys.stop) / 2
        if area > 80 and left <= center_x < right and top - cell_h * 0.25 <= center_y < top + cell_h * 1.5:
            remove_labels.append(label_index)
    if remove_labels:
        pixels[np.isin(labels, remove_labels)] = 0
    return Image.fromarray(pixels)


def clear_scatter_band(atlas: Image.Image, index: int, columns: int = 3) -> Image.Image:
    """Clear the generated scatter below the neighbouring row without clipping that row."""
    source_rows = 3 if atlas.height == atlas.width else 4
    cell_w = atlas.width / columns
    cell_h = atlas.height / source_rows
    column = index % columns
    row = index // columns
    left = round(column * cell_w)
    right = round((column + 1) * cell_w)
    top = row * cell_h
    overlap = 0.45 if source_rows == 3 else 0.08
    split = max(0, round(top - cell_h * overlap))
    atlas.paste((0, 0, 0, 0), (left, split, right, atlas.height))
    return atlas


def main() -> None:
    if len(sys.argv) < 4:
        raise SystemExit("usage: unify-atlas-anchors.py AVA.png EMBLEM.png ATLAS.png...")
    ava = Image.open(sys.argv[1]).convert("RGBA")
    emblem = Image.open(sys.argv[2]).convert("RGBA")
    for raw in sys.argv[3:]:
        path = Path(raw)
        atlas = Image.open(path).convert("RGBA")
        atlas = remove_generated_cell_art(atlas, 7)
        atlas = clear_scatter_band(atlas, 8)
        atlas = normalize_grid(atlas)
        for index, art in ((7, ava), (8, emblem)):
            if index == 7:
                paste_ava_cell(atlas, art, index)
            else:
                paste_cell(atlas, art, index)
        atlas.save(path, optimize=True)


if __name__ == "__main__":
    main()
