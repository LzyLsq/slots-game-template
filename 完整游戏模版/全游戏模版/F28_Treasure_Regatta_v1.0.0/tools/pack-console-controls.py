"""Pack four genuinely different console-control families into runtime atlases.

Captain keeps the original component-detected sheet. The regenerated Pearl,
Cargo, and Reef sheets are authored as a strict 2 x 4 grid so each control can
have its own silhouette without a common stretched plaque skeleton.
"""
from pathlib import Path
import json

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
ROLES = ('spin', 'bet', 'auto', 'turbo', 'back', 'menu', 'rules', 'max')
SOURCES = {
    'captain': 'captain-console-alpha.png',
    'pearl': 'pearl-console-v2-alpha.png',
    'cargo': 'cargo-console-v2-alpha.png',
    'reef': 'reef-console-v2-alpha.png',
}


def padded_alpha_box(image: Image.Image, padding: int = 8) -> tuple[int, int, int, int]:
    alpha = np.asarray(image)[:, :, 3]
    ys, xs = np.where(alpha > 8)
    if not len(xs):
        raise ValueError('empty control cell')
    return (
        max(0, int(xs.min()) - padding),
        max(0, int(ys.min()) - padding),
        min(image.width, int(xs.max()) + 1 + padding),
        min(image.height, int(ys.max()) + 1 + padding),
    )


def component_boxes(source: Image.Image, mode: str) -> list[tuple[int, int, int, int]]:
    labels, _ = ndimage.label(np.asarray(source)[:, :, 3] > 100)
    sizes = np.bincount(labels.ravel())
    sizes[0] = 0
    components = np.argsort(sizes)[-8:]
    if any(sizes[i] < 1000 for i in components):
        raise ValueError(f'{mode}: expected eight substantial isolated controls')
    boxes = []
    for ident in components:
        ys, xs = np.where(labels == ident)
        boxes.append((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    columns = [
        sorted(
            [b for b in boxes if (((b[0] + b[2]) / 2 < source.width / 2) == (column == 0))],
            key=lambda box: box[1] + box[3],
        )
        for column in range(2)
    ]
    if any(len(column) != 4 for column in columns):
        raise ValueError(f'{mode}: expected two columns of four controls')
    return [columns[i % 2][i // 2] for i in range(8)]


manifest: dict[str, dict[str, dict[str, object]]] = {}
for mode, filename in SOURCES.items():
    source = Image.open(ROOT / 'output/imagegen' / filename).convert('RGBA')
    cuts = []
    for box in component_boxes(source, mode):
        x0, y0, x1, y1 = box
        crop = source.crop((max(0, x0 - 8), max(0, y0 - 8), min(source.width, x1 + 8), min(source.height, y1 + 8)))
        cuts.append(crop)

    atlas = Image.new('RGBA', (1024, 1024))
    manifest[mode] = {}
    for index, (role, cut) in enumerate(zip(ROLES, cuts)):
        # Each cell retains an 8 px atlas gutter after downsampling. Tall levers
        # and circular keys are contained, never distorted into long plaques.
        cut.thumbnail((480, 240), Image.Resampling.LANCZOS)
        x = index % 2 * 512 + (512 - cut.width) // 2
        y = index // 2 * 256 + (256 - cut.height) // 2
        atlas.alpha_composite(cut, (x, y))
        sliced = mode == 'captain' or role in ('rules', 'max')
        left = round(cut.width * (.36 if mode == 'captain' else .24)) if sliced else 0
        right = round(cut.width * (.12 if mode == 'captain' else .24)) if sliced else 0
        manifest[mode][role] = {
            'rect': [x, y, cut.width, cut.height],
            'left': left,
            'right': right,
        }
        print(mode, role, 'runtime', cut.size, 'sliced', sliced)
    atlas.save(ROOT / 'assets/resources/art' / f'{mode}-console.png', optimize=True)

(ROOT / 'assets/resources/art/console-frames.json').write_text(json.dumps(manifest, indent=2) + '\n')
