"""Normalize supplied bitmap art for the Aurelia F8 runtime.

The source atlases intentionally use a near-black studio background.  The
runtime needs transparent cells, but a global chroma/luma key would also erase
the dark enamel and shadow detail inside the authored buttons and symbols.
Only near-black pixels connected to an atlas edge are removed here; their
boundary receives a soft alpha ramp so the imported art remains clean at every
mobile scale.
"""
from pathlib import Path
import sys
from collections import deque
import json
from PIL import Image, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1] / 'assets/resources/art'
SOURCE = Path(__file__).resolve().parent / 'art-sources'

def key(image):
    pixels = np.array(image.convert('RGBA')).astype(np.float32)
    r, g, b = pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2]
    # Green-screen assets deliberately contain no green materials. Soft alpha
    # retains antialiased edges without leaving a neon-green halo.
    excess = g - np.maximum(r, b)
    alpha = 1 - np.clip((excess - 18) / 70, 0, 1)
    dark_green = (g > r * 1.3) & (g > b * 1.3) & (r < 36) & (b < 36)
    alpha[dark_green] = 0
    pixels[:, :, 3] *= alpha
    pixels[:, :, 1] = np.minimum(g, np.maximum(r, b) + 14)
    return Image.fromarray(pixels.astype('uint8'), 'RGBA')

def atlas(source, name, columns, rows, cellw, cellh, keyed=True):
    image = Image.open(SOURCE / source).convert('RGBA')
    if keyed:
        image = key(image)
    out = Image.new('RGBA', (columns * cellw, rows * cellh))
    for row in range(rows):
        for col in range(columns):
            y_edges = [0, .25, .50, .723, 1] if name == 'interfaces' else [i/rows for i in range(rows+1)]
            tile = image.crop((round(col*image.width/columns), round(y_edges[row]*image.height),
                               round((col+1)*image.width/columns), round(y_edges[row+1]*image.height)))
            if keyed:
                mask = tile.getchannel('A').point(lambda a: 255 if a > 80 else 0)
                bounds = mask.getbbox()
                if not bounds:
                    raise ValueError(f'Empty tile {source}: {col},{row}')
                tile = tile.crop(bounds)
                tile.thumbnail((int(cellw*.83), int(cellh*.83)), Image.Resampling.LANCZOS)
                out.alpha_composite(tile, (col*cellw+(cellw-tile.width)//2, row*cellh+(cellh-tile.height)//2))
            else:
                out.alpha_composite(tile.resize((cellw, cellh), Image.Resampling.LANCZOS), (col*cellw, row*cellh))
    out.save(ROOT / f'{name}.png', optimize=True)
    print(f'{name}: {out.size}')

def transparent_connected_dark(path: Path, threshold=88):
    """Remove only the studio-black region connected to the image perimeter."""
    image = Image.open(path).convert('RGBA')
    pixels = np.array(image).astype(np.float32)
    rgb = pixels[:, :, :3]
    luminance = rgb[:, :, 0] * .2126 + rgb[:, :, 1] * .7152 + rgb[:, :, 2] * .0722
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    candidate = (luminance < threshold) & (chroma < 52)
    height, width = candidate.shape
    connected = np.zeros((height, width), dtype=np.bool_)
    queue = deque()
    for x in range(width):
        if candidate[0, x]: queue.append((0, x))
        if candidate[height - 1, x]: queue.append((height - 1, x))
    for y in range(height):
        if candidate[y, 0]: queue.append((y, 0))
        if candidate[y, width - 1]: queue.append((y, width - 1))
    while queue:
        y, x = queue.popleft()
        if connected[y, x] or not candidate[y, x]:
            continue
        connected[y, x] = True
        if y: queue.append((y - 1, x))
        if y + 1 < height: queue.append((y + 1, x))
        if x: queue.append((y, x - 1))
        if x + 1 < width: queue.append((y, x + 1))

    # A small blur gives antialiased metal/glow edges without touching enclosed
    # black details such as button legends or the centre of a ring.
    mask = Image.fromarray((connected * 255).astype('uint8'), 'L').filter(ImageFilter.GaussianBlur(1.35))
    removed = np.array(mask).astype(np.float32) / 255
    alpha = pixels[:, :, 3] * (1 - removed)
    # Bright edge pixels stay opaque; dark edge pixels fade naturally.
    edge_ramp = np.clip((luminance - 5) / 34, 0, 1)
    boundary = (removed > 0) & (removed < 1)
    alpha[boundary] = np.minimum(alpha[boundary], 255 * edge_ramp[boundary])
    pixels[:, :, 3] = alpha
    Image.fromarray(np.clip(pixels, 0, 255).astype('uint8'), 'RGBA').save(path, optimize=True)

    meta_path = Path(str(path) + '.meta')
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())
        meta.setdefault('userData', {})['hasAlpha'] = True
        meta['userData']['fixAlphaTransparencyArtifacts'] = True
        meta_path.write_text(json.dumps(meta, indent=2) + '\n')
    print(f'transparency: {path.name}')

def main():
    jobs = [('symbols-source.png','symbols',4,4,256,256,True),
            ('interfaces-source.png','interfaces',4,4,256,256,True),
            ('titles-source.png','titles',2,3,768,342,True),
            ('portraits-source.png','portraits',4,4,256,256,False),
            ('exhibits-source.png','exhibits',2,2,768,512,False),
            ('optics-source.png','optics',2,2,512,512,False),
            ('surfaces-source.png','surfaces',2,2,512,512,False)]
    for job in jobs:
        if (SOURCE/job[0]).exists(): atlas(*job)
    path = SOURCE/'celebration-source.png'
    if path.exists():
        image = key(Image.open(path))
        image.save(ROOT/'celebration.png', optimize=True)
    from importlib.util import spec_from_file_location, module_from_spec
    spec = spec_from_file_location('refine_art', Path(__file__).with_name('refine-art.py'))
    refine = module_from_spec(spec)
    spec.loader.exec_module(refine)
    refine.main()

    # Web loader uses the same CC Switch-authored salon and wordmark as the game.
    web = ROOT.parents[2] / 'build-templates/web-mobile'
    Image.open(ROOT/'salon.png').convert('RGB').save(web/'aurelia-loader-bg.jpg', quality=88, optimize=True)
    Image.open(ROOT/'titles.png').crop((0,0,768,342)).save(web/'aurelia-wordmark.png', optimize=True)

if __name__ == '__main__': main()
