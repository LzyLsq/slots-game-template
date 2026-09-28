#!/usr/bin/env python3
"""Remove disconnected CC Switch matte scraps from 4x4 reel atlases.

This only trims and rescales existing generated pixels, never paints replacement art.
Read the saved post-edge-clean baseline to make repeated runs deterministic.
The blurred atlas is derived from the refined CC Switch artwork.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import binary_dilation, label

art = Path(__file__).resolve().parents[1] / 'assets/resources/art'
baseline = Path('/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/reel-cutout-baseline')
baseline.mkdir(parents=True, exist_ok=True)
for game in ('coin-press', 'lantern-ledger', 'cloud-conveyor', 'jubilee-vault'):
    sharp_path = art / f'symbols-{game}.png'
    blur_path = art / f'symbols-{game}-blur.png'
    saved = baseline / sharp_path.name
    if not saved.exists():
        saved.write_bytes(sharp_path.read_bytes())
    sharp = np.asarray(Image.open(saved).convert('RGBA')).copy()
    cell = sharp.shape[0] // 4
    assembled = Image.new('RGBA', (cell * 4, cell * 4))
    removed = 0
    for index in range(16):
        y, x = divmod(index, 4)
        box = np.s_[y*cell:(y+1)*cell, x*cell:(x+1)*cell]
        tile = sharp[box].copy()
        clear_alpha = tile[:, :, 3]
        parts, count = label(clear_alpha > 40)
        if not count:
            continue
        counts = np.bincount(parts.ravel())
        counts[0] = 0
        main = parts == counts.argmax()
        keep = binary_dilation(main, iterations=3)
        removed += int(np.count_nonzero((clear_alpha > 40) & ~keep))
        clear_alpha[~keep] = 0
        # All sixteen generated objects receive a real transparent cell gutter.
        # Their source art is merely trimmed/resampled, never repainted. The
        # gutter prevents linear texture sampling from pulling the next cell's
        # metal flecks into the bottom of a symbol at fractional mobile scales.
        ys, xs = np.where(clear_alpha > 10)
        if not len(xs):
            continue
        cropped = Image.fromarray(tile).crop((max(0, xs.min()-2), max(0, ys.min()-2),
                                             min(cell, xs.max()+3), min(cell, ys.max()+3)))
        side = cell - 48
        scale = min(side / cropped.width, side / cropped.height)
        fitted = cropped.resize((round(cropped.width * scale), round(cropped.height * scale)),
                                 Image.Resampling.LANCZOS)
        assembled.alpha_composite(fitted, (x*cell+(cell-fitted.width)//2,
                                           y*cell+(cell-fitted.height)//2))
    assembled.save(sharp_path, optimize=True)
    # Spin blur is derived from the same generated painting after cutting, so
    # it cannot resurrect any matte remnants or cross-cell fragments.
    assembled.filter(ImageFilter.GaussianBlur(4.2)).save(blur_path, optimize=True)
    print(game, 'detached cutout pixels cleared:', removed)

# These aliases share the coin-press artwork, not a different generation.
(art / 'symbols.png').write_bytes((art / 'symbols-coin-press.png').read_bytes())
(art / 'symbols-blur.png').write_bytes((art / 'symbols-coin-press-blur.png').read_bytes())
