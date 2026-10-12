"""Separate the four cabinet mascots without changing the authored plates.

Run with a Python environment containing numpy and opencv-python-headless.
Polygons use the 1024x2048 preview coordinates (half the source resolution).
Each sprite keeps the original source pixels and its alpha is feathered.
The original plate stays beneath it; no artificial scenery is introduced.
"""
from pathlib import Path
import sys

import cv2
import numpy as np


ART = Path(__file__).resolve().parents[1] / 'assets/resources/art'
PREVIEW = Path('/tmp/f20-cabinet-motion-preview')
PREVIEW.mkdir(exist_ok=True)

# Outline, definitely-foreground ellipses, source crop, pivot (in full pixels).
MASCOTS = {
    'golden-hour': (
        [(350, 414), (359, 391), (382, 372), (414, 363), (448, 370),
         (476, 394), (484, 416), (499, 390), (498, 373), (510, 365),
         (525, 386), (546, 383), (560, 393), (578, 379), (582, 393),
         (581, 405), (576, 417), (583, 421), (590, 447),
         (583, 461), (607, 459), (630, 476), (625, 494), (606, 499),
         (589, 490), (563, 491), (548, 497), (524, 506), (510, 525),
         (486, 543), (482, 580), (461, 607), (425, 604), (407, 579),
         (410, 536), (429, 500), (437, 479), (397, 479), (364, 458)],
        [(422, 414, 45, 42), (451, 537, 31, 49),
         (526, 440, 39, 48), (497, 484, 24, 18),
         # The far ear is narrow and bright, so GrabCut mistakes it for sky
         # unless its inner fur is marked as definite foreground.
         (574, 397, 3, 9)],
        (337, 351, 640, 616), (450, 595),
    ),
    'jade-treasury': (
        [(415, 421), (431, 409), (454, 416), (480, 454), (495, 483),
         (511, 487), (526, 445), (552, 409), (574, 401), (589, 415),
         (582, 454), (573, 493), (586, 514), (604, 548), (612, 591),
         (602, 618), (570, 628), (543, 612), (512, 611), (478, 628),
         (444, 623), (426, 605), (435, 548), (454, 512), (437, 483)],
        [(450, 449, 13, 22), (562, 445, 13, 22),
         (516, 547, 58, 43), (460, 597, 17, 11), (572, 598, 18, 12)],
        (405, 394, 620, 636), (515, 615),
    ),
    'pearl-palace': (
        [(363, 607), (378, 566), (405, 531), (433, 489), (474, 465),
         (509, 459), (536, 446), (571, 441), (607, 452), (632, 475),
         (646, 511), (640, 539), (657, 564), (670, 608), (657, 620),
         (615, 606), (574, 597), (538, 610), (509, 624), (473, 609),
         (433, 608), (398, 621)],
        [(453, 524, 39, 32), (562, 495, 41, 40),
         (421, 585, 23, 14), (620, 581, 22, 14)],
        (351, 431, 681, 633), (508, 595),
    ),
    'ruby-revel': (
        [(367, 403), (383, 392), (410, 414), (434, 442), (456, 429),
         (463, 390), (459, 373), (478, 369), (494, 349), (510, 346),
         (527, 361), (546, 354), (561, 376), (564, 414), (585, 437),
         (619, 415), (652, 410), (660, 430), (633, 459), (602, 482),
         (596, 510), (582, 525), (447, 526), (427, 511), (418, 477),
         (392, 463)],
        [(504, 438, 51, 53), (478, 375, 14, 8),
         (550, 380, 11, 11), (408, 438, 13, 12), (624, 445, 11, 9)],
        (355, 337, 671, 537), (512, 518),
    ),
}


requested = sys.argv[1:] or list(MASCOTS)
if any(name not in MASCOTS for name in requested):
    raise ValueError(f'Unknown cabinet; choose from {list(MASCOTS)}')

for name in requested:
    outline, foreground, (left, top, right, bottom), pivot = MASCOTS[name]
    source = cv2.imread(str(ART / f'{name}-tall.png'), cv2.IMREAD_COLOR)
    if source is None or source.shape[:2] != (4096, 2048):
        raise RuntimeError(f'Expected 2048x4096 original: {name}')
    small = cv2.resize(source, (1024, 2048), interpolation=cv2.INTER_AREA)
    mask = np.full(small.shape[:2], cv2.GC_BGD, np.uint8)
    cv2.fillPoly(mask, [np.asarray(outline, np.int32)], cv2.GC_PR_FGD)
    for x, y, rx, ry in foreground:
        cv2.ellipse(mask, (x, y), (rx, ry), 0, 0, 360, cv2.GC_FGD, -1)
    cv2.grabCut(small, mask, None, np.zeros((1, 65), np.float64),
                np.zeros((1, 65), np.float64), 7, cv2.GC_INIT_WITH_MASK)
    selected = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD),
                        255, 0).astype(np.uint8)
    # Filter stray specks without changing the hand-drawn outer contour.
    count, labels, stats, _ = cv2.connectedComponentsWithStats(selected)
    selected = np.where(np.isin(labels, [i for i in range(1, count)
                                             if stats[i, cv2.CC_STAT_AREA] > 60]), 255, 0).astype(np.uint8)
    selected = cv2.morphologyEx(selected, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    cv2.imwrite(str(PREVIEW / f'{name}-mask.png'), selected)
    full_mask = cv2.resize(selected, (2048, 4096), interpolation=cv2.INTER_LINEAR)
    full_mask = cv2.GaussianBlur(full_mask, (5, 5), 1)
    # Keep the exact painting pixels in the foreground.
    sprite = np.dstack((source, full_mask))[top * 2:bottom * 2,
                                             left * 2:right * 2]
    if not cv2.imwrite(str(ART / f'{name}-animal.png'), sprite):
        raise RuntimeError(f'Cannot write sprite: {name}')

    # +1° exceeds the in-game swing and exposes possible double edges at 1:1.
    for angle in (0, 1):
        canvas = source[top * 2 - 48:bottom * 2 + 48,
                        left * 2 - 48:right * 2 + 48].copy()
        layer = np.zeros((*canvas.shape[:2], 4), np.uint8)
        layer[48:48 + sprite.shape[0], 48:48 + sprite.shape[1]] = sprite
        center = (pivot[0] * 2 - left * 2 + 48,
                  pivot[1] * 2 - top * 2 + 48)
        matrix = cv2.getRotationMatrix2D(center, angle, 1)
        layer = cv2.warpAffine(layer, matrix, (canvas.shape[1], canvas.shape[0]),
                               flags=cv2.INTER_LINEAR)
        alpha = layer[:, :, 3:4].astype(np.float32) / 255
        combined = (layer[:, :, :3] * alpha + canvas * (1 - alpha)).astype(np.uint8)
        cv2.imwrite(str(PREVIEW / f'{name}-{angle}deg.png'), combined)
    cv2.imwrite(str(PREVIEW / f'{name}-source.png'),
                source[top * 2 - 48:bottom * 2 + 48,
                       left * 2 - 48:right * 2 + 48])
    print(f'{name}: crop {left, top, right, bottom}, pivot {pivot}')
