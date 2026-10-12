"""Crop a CC Switch-generated rig; derive a registered, single-layer smile sequence.

No illustrative content is drawn: every visible pixel originates in the generated
sheet. The mask only feathers the mouth patch into the unchanged original muzzle.
"""
import argparse
from pathlib import Path
import json
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
BODY_BOX = (62, 10, 652, 742)
ARM_BOX = (738, 280, 1280, 620)
PATCH_BOX = (303, 173, 524, 271)
FRAMES = 16
COLUMNS = 8

def dark_center(image, box):
    left, top, right, bottom = box
    a = np.asarray(image.crop(box))
    dark = (a[:, :, :3].mean(axis=2) < 78) & (a[:, :, 3] > 220)
    yy, xx = np.where(dark)
    if len(xx) < 5:
        raise ValueError(f'Could not register generated facial landmark: {box}')
    return np.array([left + xx.mean(), top + yy.mean()], dtype=np.float64)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    source = Image.open(args.source).convert('RGBA')
    if source.size != (1312, 1199):
        raise ValueError(f'This authored registration expects 1312×1199, not {source.size}')
    destination = ROOT / 'assets/resources/art'
    body = source.crop(BODY_BOX)
    arm = source.crop(ARM_BOX)
    body.save(destination / 'task-gold-keeper.png')
    arm.save(destination / 'task-gold-held-arm.png')
    # Only the mouth is replaced. The original eyes, nose, head and ears never
    # cross-fade or move independently, preventing the old face/hand ghosting.
    source_points = np.array([
        dark_center(source, (864, 900, 924, 945)),
        dark_center(source, (1042, 850, 1093, 910)),
        dark_center(source, (974, 915, 1050, 967)),
    ])
    target_points = np.array([
        dark_center(source, (305, 128, 360, 177)),
        dark_center(source, (436, 84, 483, 136)),
        dark_center(source, (371, 130, 445, 180)),
    ])
    # Pillow affine coefficients map output positions back to the source.
    transform = np.linalg.solve(np.column_stack([target_points, np.ones(3)]), source_points)
    affine = tuple(transform[:, 0]) + tuple(transform[:, 1])
    smile = source.transform(source.size, Image.Transform.AFFINE, affine, Image.Resampling.BICUBIC).crop(PATCH_BOX)
    neutral = source.crop(PATCH_BOX)
    width, height = neutral.size
    mask = Image.new('L', (width, height), 0)
    ImageDraw.Draw(mask).ellipse((24, 8, width - 28, height - 20), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(5))
    mask = ImageChops.multiply(mask, neutral.getchannel('A'))
    # Fill source transparency with the existing muzzle rather than introducing
    # a notch at the cheek. The mouth mask never changes the head silhouette.
    filled = neutral.copy(); filled.alpha_composite(smile); smile = filled
    # Morph an authored grid instead of dissolving two mouths. One mouth image
    # is visible per frame; the original smile corners stay visually registered.
    atlas = Image.new('RGBA', (width * COLUMNS, height * math.ceil(FRAMES / COLUMNS)))
    for index in range(FRAMES):
        if index == 0:
            patch = neutral.copy()
        else:
            progress = index / (FRAMES - 1)
            # Compress just the lip/chin band in early frames. Eyes/nose are not
            # part of this patch. The fully opened grin is the generated image.
            knots = [0, 13, 26, 45, 65, height]
            target_knots = [0, 13, 26, 26 + 19 * (0.28 + .72 * progress),
                            65 - 8 * (1 - progress), height]
            mesh = []
            for y0, y1, sy0, sy1 in zip(target_knots, target_knots[1:], knots, knots[1:]):
                for x0, x1 in zip([0, width // 2, width], [width // 2, width]):
                    mesh.append(((x0, round(y0), x1, round(y1)),
                                 (x0, sy0, x0, sy1, x1, sy1, x1, sy0)))
            patch = smile.transform((width, height), Image.Transform.MESH, mesh, Image.Resampling.BICUBIC)
        patch.putalpha(mask)
        atlas.alpha_composite(patch, (index % COLUMNS * width, index // COLUMNS * height))
    atlas.save(destination / 'task-gold-smile-atlas.png')
    metadata = {
        'source': 'CC Switch image generation',
        'sourceSize': list(source.size), 'bodyBox': list(BODY_BOX), 'armBox': list(ARM_BOX),
        'mouthBox': list(PATCH_BOX), 'mouthFrames': FRAMES, 'mouthColumns': COLUMNS,
        'shoulderSource': [565, 367], 'armPivotSource': [821, 380],
        'armScale': .64, 'goldSource': [1155, 449],
    }
    (args.source.parent / 'rig-registration.json').write_text(json.dumps(metadata, indent=2) + '\n')
    # Diagnostic contact sheet is not an imported game resource.
    preview = Image.new('RGBA', (body.width * 3, body.height), (30, 62, 55, 255))
    for i, frame in enumerate([0, 7, 15]):
        tile = body.copy()
        mouth = atlas.crop((frame % COLUMNS * width, frame // COLUMNS * height,
                           (frame % COLUMNS + 1) * width, (frame // COLUMNS + 1) * height))
        tile.alpha_composite(mouth, (PATCH_BOX[0] - BODY_BOX[0], PATCH_BOX[1] - BODY_BOX[1]))
        preview.alpha_composite(tile, (i * body.width, 0))
    preview.convert('RGB').save(args.source.parent / 'registered-smile-preview.jpg')
    print('Prepared 3 generated rig assets; 16 registered mouth frames, unchanged eyes/nose.')

if __name__ == '__main__':
    main()
