#!/usr/bin/env python3
"""Derive a softly edged plane from each generated cabinet room painting.

The full painting still covers the viewport behind the shared cabinet plane.
Fading only the plane's outer scenery prevents a hard scale seam on tablets;
the cabinet, reels and control placements remain pixels from the CC Switch art.
"""
from pathlib import Path
import numpy as np
from PIL import Image

art = Path(__file__).resolve().parents[1] / 'assets/resources/art'
for name in ('coin-press', 'lantern-ledger', 'cloud-conveyor', 'jubilee-vault'):
    source = Image.open(art / f'{name}-tall.png').convert('RGBA')
    image = np.asarray(source.resize((1024, 2048), Image.Resampling.LANCZOS)).copy()
    x = np.arange(1024, dtype=np.float32)
    left = np.clip(x / 105, 0, 1)
    right = np.clip((1023-x) / 105, 0, 1)
    mask = np.minimum(left*left*(3-2*left), right*right*(3-2*right))
    image[:, :, 3] = np.rint(image[:, :, 3].astype(np.float32) * mask[None, :]).astype(np.uint8)
    image[:, :, :3][image[:, :, 3] == 0] = 0
    Image.fromarray(image).save(art / f'{name}-tall-plane.png', optimize=True)
    print(name, 'generated painting side seam softened')
