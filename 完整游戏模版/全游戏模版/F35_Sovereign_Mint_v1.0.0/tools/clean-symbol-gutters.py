#!/usr/bin/env python3
"""Extract all 16 complete F35 symbols before packing their 4x4 atlas.

The original CC Switch sheets are illustrations, not exact grid exports. Their
objects cross nominal row/column boundaries. Never cut those sources into equal
rectangles: identify full connected silhouettes on the whole source instead.
Requires the project's existing Pillow/NumPy art-processing environment.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
THEMES = ('golden-hour', 'jade-treasury', 'pearl-palace', 'ruby-revel')
CELL = 256
OBJECT_SIDE = 208
GUARD = 4
BLUR_RADIUS = 7
# Measured points inside real apertures, relative to the complete source object
# plus its 4px border. Other enclosed white regions are specular highlights and
# must stay opaque: the old area<=512 heuristic filled key holes but punched
# holes through larger gemstone reflections.
OPENING_ANCHORS = {
    'golden-hour': {7: ((.0984, .3110), (.4291, .1413), (.2165, .3816),
                         (.4882, .2261), (.7874, .7633))},
    'jade-treasury': {3: ((.4686, .1023),),
                      9: ((.5055, .7127), (.4244, .7799))},
    'pearl-palace': {3: ((.5161, .1010),),
                     7: ((.8836, .3495), (.6000, .1315), (.8909, .1938),
                         (.8000, .1003), (.5855, .3253), (.6691, .4152)),
                     9: ((.5616, .7313), (.5217, .8582))},
    'ruby-revel': {3: ((.4480, .1216), (.5627, .1216)),
                   7: ((.8381, .3487), (.5683, .2237), (.3417, .8289),
                       (.4029, .7632)),
                   9: ((.6050, .6868),)},
}


def matte_edges(pixels: np.ndarray, solid: np.ndarray) -> Image.Image:
    """Remove the white photographic matte only in a narrow boundary band.

    Foreground colors come from the nearby opaque interior, not from a global
    color key. This retains white pearl/gold highlights while recovering alpha
    and decontaminating both outside edges and the edges of real openings.
    """
    pixels = pixels.astype(np.float32)
    mask = Image.fromarray(solid.astype('uint8') * 255)
    core = np.asarray(mask.filter(ImageFilter.MinFilter(5))) > 0
    expanded = np.asarray(mask.filter(ImageFilter.MaxFilter(5))) > 0
    coverage = np.asarray(Image.fromarray(core.astype('uint8') * 255)
                          .filter(ImageFilter.GaussianBlur(2))).astype(np.float32) / 255
    nearby = np.asarray(Image.fromarray(np.where(core[:, :, None], pixels, 0).astype('uint8'))
                        .filter(ImageFilter.GaussianBlur(2))).astype(np.float32)
    foreground = np.where(coverage[:, :, None] > 0,
                          nearby / np.maximum(coverage[:, :, None], .001), pixels)
    background = np.median(pixels[~expanded], axis=0)
    direction = background - foreground
    projected = ((background - pixels) * direction).sum(axis=2)
    fitted = np.clip(projected / np.maximum((direction * direction).sum(axis=2), 1), 0, 1)
    # Outside the detected silhouette, background paper noise is not an edge.
    fitted[~solid & (fitted < .18)] = 0
    alpha = np.where(core, 1, np.where(expanded, fitted, 0))
    alpha[alpha < .025] = 0
    # Keep only the intended coherent silhouette; isolated paper/shadow specks
    # must not survive as little bright fragments around the icon.
    labels, objects = components(alpha > 32 / 255)
    assert objects, 'Matting removed the complete symbol'
    coherent = labels == objects[0]['label']
    support = np.asarray(Image.fromarray(coherent.astype('uint8') * 255)
                         .filter(ImageFilter.MaxFilter(3))) > 0
    alpha[~support] = 0
    partial = (alpha > 0) & (alpha < 1)
    pixels[partial] = np.clip((pixels[partial] - background * (1 - alpha[partial, None]))
                              / alpha[partial, None], 0, 255)
    pixels[alpha == 0] = 0
    return Image.fromarray(np.dstack([pixels.astype('uint8'),
                                     (alpha * 255).round().astype('uint8')]))


def bleed_rgb(image: Image.Image, radius: int = 2) -> Image.Image:
    """Extrude edge color into zero-alpha texels for GPU linear filtering.

    Alpha and silhouette dimensions stay unchanged. Transparent black RGB
    would otherwise become a dark outline as the sprite scales or turns.
    """
    pixels = np.array(image)
    for _ in range(radius):
        known = pixels[:, :, 3] > 0 if _ == 0 else known | fill
        weight = np.zeros(known.shape, np.float32)
        color = np.zeros(pixels.shape[:2] + (3,), np.float32)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            source = np.roll(known, (dy, dx), (0, 1))
            if dy < 0: source[dy:] = False
            if dy > 0: source[:dy] = False
            if dx < 0: source[:, dx:] = False
            if dx > 0: source[:, :dx] = False
            color += np.roll(pixels[:, :, :3], (dy, dx), (0, 1)) * source[:, :, None]
            weight += source
        fill = ~known & (weight > 0)
        pixels[fill, :3] = (color[fill] / weight[fill, None]).round().astype('uint8')
    return Image.fromarray(pixels)


def blur_rgba(image: Image.Image, radius: float) -> Image.Image:
    # Blur premultiplied color and alpha together, then return straight RGBA.
    # Filtering straight RGB introduces black/color-fringed ghost edges.
    return image.convert('RGBa').filter(ImageFilter.GaussianBlur(radius)).convert('RGBA')


def components(mask: np.ndarray) -> tuple[np.ndarray, list[dict]]:
    """8-connected scanline labeling, without another imaging dependency."""
    height, width = mask.shape
    labels = np.zeros((height, width), dtype=np.int32)
    parents = [0]
    previous = []

    def root(label):
        while parents[label] != label:
            parents[label] = parents[parents[label]]
            label = parents[label]
        return label

    for y in range(height):
        edges = np.flatnonzero(np.diff(np.r_[False, mask[y], False]))
        current = []
        p = 0
        for start, end in zip(edges[::2], edges[1::2]):
            while p < len(previous) and previous[p][1] < start:
                p += 1
            j = p
            neighbors = []
            while j < len(previous) and previous[j][0] <= end:
                neighbors.append(root(previous[j][2]))
                j += 1
            if neighbors:
                label = min(neighbors)
                for neighbor in neighbors:
                    parents[neighbor] = label
            else:
                label = len(parents)
                parents.append(label)
            labels[y, start:end] = label
            current.append((start, end, label))
        previous = current

    labels = np.array([root(i) for i in range(len(parents))])[labels]
    counts = np.bincount(labels.ravel())
    objects = []
    for label in np.argsort(counts[1:])[::-1] + 1:
        if not counts[label]:
            continue
        ys, xs = np.where(labels == label)
        objects.append({'label': int(label), 'area': int(counts[label]),
                        'bounds': [int(xs.min()), int(ys.min()),
                                   int(xs.max() + 1), int(ys.max() + 1)]})
    return labels, objects


def isolate(rgb: np.ndarray, labels: np.ndarray, obj: dict,
            openings: tuple = (), evidence: dict | None = None) -> Image.Image:
    x0, y0, x1, y1 = obj['bounds']
    height, width = labels.shape
    x0, y0 = max(0, x0 - 4), max(0, y0 - 4)
    x1, y1 = min(width, x1 + 4), min(height, y1 + 4)
    pixels = rgb[y0:y1, x0:x1]
    solid = labels[y0:y1, x0:x1] == obj['label']
    hole_labels, holes = components(~solid)
    open_labels, points = set(), []
    for x, y in openings:
        px, py = round(x * solid.shape[1]), round(y * solid.shape[0])
        label = int(hole_labels[py, px])
        assert label > 0, f'Opening anchor misses background: {(x, y)}'
        open_labels.add(label)
        points.append((px, py))
    for hole in holes:
        hx0, hy0, hx1, hy1 = hole['bounds']
        enclosed = hx0 > 0 and hy0 > 0 and hx1 < solid.shape[1] and hy1 < solid.shape[0]
        if enclosed and hole['label'] not in open_labels:
            solid |= hole_labels == hole['label']
    image = matte_edges(pixels, solid)
    alpha = np.asarray(image.getchannel('A'))
    for px, py in points:
        assert alpha[py, px] < 16, 'A real opening was filled or contaminated'
    if evidence is not None:
        evidence.update({'realOpenings': len(open_labels),
                         'openingAlpha': [int(alpha[py, px]) for px, py in points]})
    bounds = image.getchannel('A').getbbox()
    assert bounds is not None, 'Empty symbol'
    return image.crop(bounds)


def validate_atlas(image: Image.Image, blurred: bool = False) -> list[dict]:
    assert image.size == (CELL * 4, CELL * 4) and image.mode == 'RGBA'
    evidence = []
    for index in range(16):
        x, y = index % 4 * CELL, index // 4 * CELL
        alpha = np.asarray(image.crop((x, y, x + CELL, y + CELL)).getchannel('A'))
        border = np.r_[alpha[:GUARD].ravel(), alpha[-GUARD:].ravel(),
                       alpha[:, :GUARD].ravel(), alpha[:, -GUARD:].ravel()]
        assert not border.any(), f'Cell {index}: atlas bleed through transparent guard'
        bounds = Image.fromarray(alpha).getbbox()
        assert bounds is not None
        if not blurred:
            assert min(bounds[:2]) >= 23 and max(bounds[2:]) <= CELL - 23
            _, objects = components(alpha > 32)
            # Retained tiny photographic highlights are allowed; a detached
            # neighboring icon fragment is not. All significant alpha must be
            # in the intended single silhouette.
            assert len([o for o in objects if o['area'] > 32]) == 1, f'Cell {index}: detached fragment'
        evidence.append({'index': index, 'alphaBounds': list(bounds), 'guardPixels': GUARD})
    return evidence


def build_theme(theme: str, source_dir: Path, art_dir: Path) -> dict:
    source = source_dir / f'symbols-{theme}.png'
    image = Image.open(source).convert('RGB')
    rgb = np.asarray(image)
    low = rgb.min(axis=2).astype(np.int16)
    neutral = rgb.max(axis=2).astype(np.int16) - low < 32
    labels, all_objects = components(~(neutral & (low > 235)))
    objects = [o for o in all_objects if o['area'] > 1000]
    assert len(objects) == 16, f'{theme}: expected 16 complete objects, got {len(objects)}'
    by_index = {}
    for obj in objects:
        x0, y0, x1, y1 = obj['bounds']
        col = min(3, int((x0 + x1) / 2 / image.width * 4))
        row = min(3, int((y0 + y1) / 2 / image.height * 4))
        index = row * 4 + col
        assert index not in by_index, f'{theme}: ambiguous silhouette placement {index}'
        by_index[index] = obj
    assert set(by_index) == set(range(16))
    sharp = Image.new('RGBA', (CELL * 4, CELL * 4))
    blur = Image.new('RGBA', sharp.size)
    sources = []
    for index in range(16):
        obj = by_index[index]
        matte_qa = {}
        piece = isolate(rgb, labels, obj, OPENING_ANCHORS.get(theme, {}).get(index, ()), matte_qa)
        original = piece.size
        piece.thumbnail((OBJECT_SIDE, OBJECT_SIDE), Image.Resampling.LANCZOS)
        # Clear sub-visible Lanczos ringing outside the true antialiased edge.
        pixels = np.array(piece)
        pixels[pixels[:, :, 3] < 3] = 0
        piece = Image.fromarray(pixels)
        tile = Image.new('RGBA', (CELL, CELL))
        tile.alpha_composite(piece, ((CELL - piece.width) // 2, (CELL - piece.height) // 2))
        alpha = tile.getchannel('A')
        assert alpha.getbbox() is not None
        blurred = blur_rgba(tile, BLUR_RADIUS)
        pixels = np.array(blurred)
        pixels[pixels[:, :, 3] < 2] = 0
        pixels[:GUARD] = 0
        pixels[-GUARD:] = 0
        pixels[:, :GUARD] = 0
        pixels[:, -GUARD:] = 0
        blurred = Image.fromarray(pixels)
        pos = (index % 4 * CELL, index // 4 * CELL)
        sharp.paste(bleed_rgb(tile), pos)
        blur.paste(bleed_rgb(blurred), pos)
        sources.append({'index': index, 'sourceBounds': obj['bounds'],
                        'sourceArea': obj['area'], 'isolatedSize': list(original),
                        'fittedSize': list(piece.size), 'matte': matte_qa})
    sharp_qa, blur_qa = validate_atlas(sharp), validate_atlas(blur, True)
    art_dir.mkdir(parents=True, exist_ok=True)
    paths = [art_dir / f'symbols-{theme}.png', art_dir / f'symbols-{theme}-blur.png']
    for output, path in zip([sharp, blur], paths):
        output.save(path, optimize=True)
    return {'theme': theme, 'sourceHash': hashlib.sha256(source.read_bytes()).hexdigest(),
            'silhouettes': sources, 'sharp': sharp_qa, 'blur': blur_qa,
            'files': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}}


def build_all(source_dir: Path = ROOT / 'art-source/master',
              art_dir: Path = ROOT / 'assets/resources/art') -> list[dict]:
    return [build_theme(theme, source_dir, art_dir) for theme in THEMES]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate delivered atlases without writing them')
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if args.check:
        results = [{'theme': theme,
                    'sharp': validate_atlas(Image.open(ROOT / f'assets/resources/art/symbols-{theme}.png').convert('RGBA')),
                    'blur': validate_atlas(Image.open(ROOT / f'assets/resources/art/symbols-{theme}-blur.png').convert('RGBA'), True)}
                   for theme in THEMES]
    else:
        results = build_all()
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps({'source': 'complete connected silhouettes, not equal source rectangles',
                                          'cellSide': CELL, 'objectMaxSide': OBJECT_SIDE,
                                          'blurRadius': BLUR_RADIUS, 'edgeTreatment': 'local white-matte recovery, measured apertures, 2px RGB bleed',
                                          'themes': results}, indent=2) + '\n')
    print(f'PASS symbols: {len(results) * 16} full silhouettes, decontaminated edges, real openings, isolated premultiplied blur')


if __name__ == '__main__':
    main()
