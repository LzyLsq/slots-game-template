#!/usr/bin/env python3
"""Soften atlas tile seams in the four generated mint-station previews.

This only attenuates existing CC Switch pixels near each tile's side scenery;
no replacement cabinet or decoration is drawn. The baseline remains external
review material so the shippable Creator project carries only final artwork.
"""
from pathlib import Path
import numpy as np
from PIL import Image

project = Path(__file__).resolve().parents[1]
source = Path('/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/station-baseline/foundry-win-machines.png')
target = project / 'assets/resources/art/foundry-win-machines.png'
image = np.asarray(Image.open(source).convert('RGBA')).copy()
cell = image.shape[0] // 2
if image.shape[:2] != (2048, 2048):
    raise ValueError('Unexpected generated station atlas dimensions')
# The generated atlas also contains a rectangular room behind each miniature
# cabinet. Alpha-trim only that scenery, following the actual silhouette; this
# preserves the CC Switch pixels of the center cabinet and its gilded foot.
y = np.arange(cell, dtype=np.float32)
x = np.arange(cell, dtype=np.float32)[None, :]
stations = [(0, 470, 554), (35, 415, 609), (120, 340, 684),
            (215, 295, 729), (450, 300, 724), (660, 285, 739),
            (780, 270, 754), (910, 275, 749), (985, 305, 719),
            (1023, 420, 604)]
left = np.interp(y, [v[0] for v in stations], [v[1] for v in stations])[:, None]
right = np.interp(y, [v[0] for v in stations], [v[2] for v in stations])[:, None]
# Soft rim avoids any newly introduced cut lines in the hand-painted metal.
inside = np.clip((x-left)/13, 0, 1)*np.clip((right-x)/13, 0, 1)
inside = inside*inside*(3-2*inside)
vertical = np.minimum(np.clip(y/22,0,1),np.clip((1023-y)/22,0,1))[:,None]
alpha = inside*vertical
for index in range(4):
    top, horizontal = divmod(index, 2)
    tile = image[top*cell:(top+1)*cell, horizontal*cell:(horizontal+1)*cell]
    tile[:, :, 3] = np.rint(tile[:, :, 3].astype(np.float32) * alpha).astype(np.uint8)
Image.fromarray(image).save(target, optimize=True)
print('Feathered four CC Switch cabinet preview cutouts:', target)
