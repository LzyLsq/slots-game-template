# -*- coding: utf-8 -*-
"""Rebuild all four symbol atlases from REAL studio assets only.

Sources:
- Crowns of Kemet pack: ankh / eye / scarab / necklace / wild (1024^2 framed art)
- CC_Slots_Generated pearl atlas (1024x1536, 3x4 transparent cells): 12 gold-set gems
No programmatically drawn symbols are used in the reels any more.
"""
from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from PIL import Image, ImageEnhance

from kemet_common import OUT, PIPE_OUT, KEMET_PNG, alpha_bounds
from gen_symbols import build_atlas, symbol_sheet

CELL = 362
RENDER = 724

PEARL_ATLAS = "/Users/xzkj/Desktop/图片/CC_Slots_Generated/game01/symbols/symbol_atlas_v02.png"


def largest_blob(img: Image.Image, thresh: int = 24) -> Image.Image:
    """Keep only the largest connected alpha component (drops neighbour bleed)."""
    import numpy as np
    from collections import deque

    a = img.getchannel("A")
    mask = (a.point(lambda p: 255 if p > thresh else 0))
    arr = __import__("numpy").array(mask) // 255
    h, w = arr.shape
    labels = np.zeros((h, w), dtype=np.int32)
    current = 0
    best_label, best_size = 0, 0
    for y in range(h):
        for x in range(w):
            if arr[y, x] and labels[y, x] == 0:
                current += 1
                size = 0
                q = deque([(y, x)])
                labels[y, x] = current
                while q:
                    cy, cx = q.popleft()
                    size += 1
                    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < h and 0 <= nx < w and arr[ny, nx] and labels[ny, nx] == 0:
                            labels[ny, nx] = current
                            q.append((ny, nx))
                if size > best_size:
                    best_size, best_label = size, current
    keep = (labels == best_label)
    alpha = img.getchannel("A").point(lambda p: 0)
    import numpy as np2
    alpha_arr = np2.array(img.getchannel("A"))
    alpha_arr[~keep] = 0
    out = img.copy()
    out.putalpha(Image.fromarray(alpha_arr))
    return out


def slice_pearl() -> Dict[str, Image.Image]:
    """Cut the 3x4 pearl atlas into named transparent cells (largest blob only)."""
    atlas = Image.open(PEARL_ATLAS).convert("RGBA")
    names = [
        "amethyst", "sapphire", "emerald",
        "ruby", "moon", "sun",
        "wand", "orrery", "crown",
        "chalice", "star", "gate",
    ]
    out: Dict[str, Image.Image] = {}
    cw, chh = atlas.width / 3, atlas.height / 4
    for i, name in enumerate(names):
        col, row = i % 3, i // 3
        box = (int(col * cw), int(row * chh), int((col + 1) * cw), int((row + 1) * chh))
        cell = atlas.crop(box)
        cell = largest_blob(cell)
        bbox = alpha_bounds(cell, 6)
        out[name] = cell.crop(bbox)
    return out


def pack_cell(art: Image.Image, fill: float = 0.94) -> Image.Image:
    """Fit art into a square RENDER canvas, centered, with slight glow padding."""
    canvas = Image.new("RGBA", (RENDER, RENDER), (0, 0, 0, 0))
    target = int(RENDER * fill)
    scale = min(target / art.width, target / art.height)
    art = art.resize((max(1, int(art.width * scale)), max(1, int(art.height * scale))), Image.LANCZOS)
    canvas.alpha_composite(art, ((RENDER - art.width) // 2, (RENDER - art.height) // 2))
    return canvas


def hue_shift(art: Image.Image, degrees: float, sat: float = 1.0, bright: float = 1.0) -> Image.Image:
    """Quality-preserving hue rotation for gem variants (alpha kept)."""
    converted = art.convert("RGBA")
    alpha = converted.getchannel("A")
    rgb = converted.convert("RGB")
    hsv = rgb.convert("HSV")
    channels = list(hsv.split())
    h = channels[0].point(lambda p: (p + int(degrees * 255 / 360)) % 256)
    if sat != 1.0:
        channels[1] = channels[1].point(lambda p: max(0, min(255, int(p * sat))))
    hsv = Image.merge("HSV", [h, channels[1], channels[2]])
    rgb = hsv.convert("RGB")
    if bright != 1.0:
        rgb = ImageEnhance.Brightness(rgb).enhance(bright)
    out = rgb.convert("RGBA")
    out.putalpha(alpha)
    return out


def pack(path: str) -> Image.Image:
    im = Image.open(f"{KEMET_PNG}/{path}").convert("RGBA")
    return im


def game01_cells(p: Dict[str, Image.Image]) -> List[Tuple[str, Optional[Image.Image]]]:
    return [
        ("sapphire", pack_cell(p["sapphire"])),
        ("ruby", pack_cell(p["ruby"])),
        ("emerald", pack_cell(p["emerald"])),
        ("amethyst", pack_cell(p["amethyst"])),
        ("sun", pack_cell(p["sun"])),
        ("crown", pack_cell(p["crown"])),
        ("ankh", pack_cell(pack("symbols/high/high_ankh.png"))),
        ("eye", pack_cell(pack("symbols/high/high_eye.png"))),
        ("scarab", pack_cell(pack("symbols/high/high_scarab.png"))),
        ("necklace", pack_cell(pack("symbols/high/high_necklace.png"))),
        ("wild", pack_cell(pack("symbols/wild/wild.png"))),
        ("gate", pack_cell(p["gate"])),
    ]


def game02_cells(p: Dict[str, Image.Image]) -> List[Tuple[str, Optional[Image.Image]]]:
    return [
        ("sapphire", pack_cell(hue_shift(p["sapphire"], 40, 1.06))),   # teal-shifted
        ("ruby", pack_cell(hue_shift(p["ruby"], 42, 1.05))),           # magenta-shifted
        ("emerald", pack_cell(hue_shift(p["emerald"], 24, 1.04))),     # spring-shifted
        ("amethyst", pack_cell(hue_shift(p["amethyst"], 350, 1.05))),  # rose-shifted
        ("chalice", pack_cell(p["chalice"])),
        ("orrery", pack_cell(p["orrery"])),
        ("eye", pack_cell(pack("symbols/high/high_eye.png"))),
        ("scarab", pack_cell(pack("symbols/high/high_scarab.png"))),
        ("necklace", pack_cell(pack("symbols/high/high_necklace.png"))),
        ("wild", pack_cell(pack("symbols/wild/wild.png"))),
        ("moon", pack_cell(p["moon"])),
        (None, None),
    ]


def game03_cells(p: Dict[str, Image.Image]) -> List[Tuple[str, Optional[Image.Image]]]:
    return [
        ("amethyst", pack_cell(hue_shift(p["amethyst"], 8, 1.04))),
        ("sapphire", pack_cell(p["sapphire"])),
        ("emerald", pack_cell(p["emerald"])),
        ("ruby", pack_cell(p["ruby"])),
        ("sun", pack_cell(hue_shift(p["sun"], 14, 1.05))),
        ("crown", pack_cell(p["crown"])),
        ("scarab", pack_cell(pack("symbols/high/high_scarab.png"))),
        ("wild", pack_cell(pack("symbols/wild/wild.png"))),
        (None, None),
        (None, None),
        (None, None),
        (None, None),
    ]


def game04_cells(p: Dict[str, Image.Image]) -> List[Tuple[str, Optional[Image.Image]]]:
    return [
        ("sapphire", pack_cell(hue_shift(p["sapphire"], 328, 1.05))),  # indigo
        ("ruby", pack_cell(hue_shift(p["ruby"], 10, 1.06))),           # warm crimson
        ("emerald", pack_cell(hue_shift(p["emerald"], 350, 1.03))),    # jade
        ("amethyst", pack_cell(hue_shift(p["amethyst"], 26, 1.06))),   # violet
        ("wand", pack_cell(p["wand"])),
        ("chalice", pack_cell(p["chalice"])),
        ("ankh", pack_cell(pack("symbols/high/high_ankh.png"))),
        ("eye", pack_cell(pack("symbols/high/high_eye.png"))),
        ("necklace", pack_cell(pack("symbols/high/high_necklace.png"))),
        ("suncoin", pack_cell(p["sun"])),
        ("wild", pack_cell(pack("symbols/wild/wild.png"))),
        ("star", pack_cell(p["star"])),
    ]


if __name__ == "__main__":
    pearl = slice_pearl()
    for g, fn in (("game01", game01_cells), ("game02", game02_cells), ("game03", game03_cells), ("game04", game04_cells)):
        cells = fn(pearl)
        build_atlas([c[1] for c in cells], g)
        symbol_sheet(cells, f"{PIPE_OUT}/symbols_{g}.jpg")
    print("REAL ATLASES DONE")
