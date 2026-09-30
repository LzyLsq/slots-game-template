"""Make cabinet plates with their existing separately masked mascot removed.

The authored *-tall.png remains untouched. Run create-cabinet-motion.py first
if the four *-animal.png masks are missing. Requires numpy and OpenCV.
"""
from pathlib import Path
import sys

import cv2
import numpy as np


ART = Path(__file__).resolve().parents[1] / 'assets/resources/art'
# These are the measured crop boxes in create-cabinet-motion.py, half resolution.
CROPS = {
    'golden-hour': (337, 351, 640, 616),
    'jade-treasury': (405, 394, 620, 636),
    'pearl-palace': (351, 431, 681, 633),
    'ruby-revel': (355, 337, 671, 537),
}

requested = sys.argv[1:] or list(CROPS)
if any(name not in CROPS for name in requested):
    raise ValueError(f'Unknown cabinet; choose from {list(CROPS)}')

for name in requested:
    left, top, right, bottom = CROPS[name]
    source = cv2.imread(str(ART / f'{name}-tall.png'), cv2.IMREAD_COLOR)
    sprite = cv2.imread(str(ART / f'{name}-animal.png'), cv2.IMREAD_UNCHANGED)
    if source is None or sprite is None or sprite.shape[2] != 4:
        raise RuntimeError(f'Missing source or masked animal: {name}')
    if source.shape[:2] != (4096, 2048) or sprite.shape[:2] != ((bottom-top)*2, (right-left)*2):
        raise RuntimeError(f'Unexpected artwork dimensions: {name}')

    # Inpaint at half resolution. Only the masked creature is repaired, not the
    # surrounding frame, ornaments, reels or background outside its silhouette.
    plate = cv2.resize(source, (1024, 2048), interpolation=cv2.INTER_AREA)
    alpha = cv2.resize(sprite[:, :, 3], (right-left, bottom-top), interpolation=cv2.INTER_AREA)
    mask = np.zeros(plate.shape[:2], np.uint8)
    mask[top:bottom, left:right] = (alpha > 12).astype(np.uint8) * 255
    mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
    repaired = cv2.inpaint(plate, mask, 12, cv2.INPAINT_TELEA)
    # Retain full source resolution everywhere but the cut-out itself.
    full_mask = cv2.resize(mask, (2048, 4096), interpolation=cv2.INTER_NEAREST)
    full_repair = cv2.resize(repaired, (2048, 4096), interpolation=cv2.INTER_CUBIC)
    background = np.where(full_mask[:, :, None] > 0, full_repair, source)
    target = ART / f'{name}-motion-bg.png'
    if not cv2.imwrite(str(target), background):
        raise RuntimeError(f'Could not write {target}')
    print(f'{name}: repaired {cv2.countNonZero(mask)} half-resolution pixels')
