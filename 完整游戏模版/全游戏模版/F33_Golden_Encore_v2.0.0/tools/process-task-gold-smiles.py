"""Register CC Switch smile edits to each mascot's unchanged eyes and nose.

Only generated mouth pixels are resampled; masks feather the small patch into
its original muzzle. No mouth, teeth, face or FX is procedurally illustrated.
"""
import argparse
import json
from pathlib import Path
import uuid
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/resources/art'
FRAMES, COLUMNS = 16, 8
CAST = {
    'rabbit': {
        'landmarks': [(260, 211, 298, 239), (352, 180, 376, 213), (328, 227, 351, 245)],
        'noseRed': True, 'box': (308, 241, 374, 279),
        'mask': [(3, 10), (12, 5), (57, 4), (62, 14), (56, 32), (14, 34)],
        'lipBand': (9, 22), 'tooth': (343, 255), 'toothSize': 15,
    },
    'fox': {
        'landmarks': [(377, 122, 409, 151), (450, 146, 477, 171), (425, 172, 452, 194)],
        'box': (370, 157, 467, 218),
        'mask': [(3, 4), (15, 4), (66, 28), (85, 27), (89, 40), (56, 53), (20, 32)],
        'lipBand': (20, 43), 'tooth': (428, 191), 'toothSize': 18,
    },
    'dragon': {
        'landmarks': [(344, 175, 391, 211), (454, 151, 476, 181), (425, 205, 443, 221)],
        'box': (389, 219, 481, 257),
        'mask': [(11, 6), (28, 6), (84, 3), (89, 15), (76, 32), (25, 32)],
        'lipBand': (9, 24), 'tooth': (453, 236), 'toothSize': 17,
    },
}

def landmark(image, box, red=False):
    a = np.asarray(image.crop(box)).astype(float)
    rgb = a[:, :, :3]
    weights = np.maximum(0, rgb[:, :, 0] - rgb[:, :, 1] - 65) if red else np.maximum(0, 90 - rgb.mean(axis=2))
    weights *= a[:, :, 3] > 220
    yy, xx = np.indices(weights.shape)
    if weights.sum() < 20: raise ValueError(f'Unregistered landmark {box}')
    return [box[0] + (xx * weights).sum() / weights.sum(), box[1] + (yy * weights).sum() / weights.sum()]

def meta(name):
    path = ART / f'{name}.png.meta'
    if path.exists(): return
    m = json.loads((ART / 'task-gold-smile-atlas.png.meta').read_text())
    path.write_text(json.dumps(m, indent=2).replace(m['uuid'], str(uuid.uuid4())).replace('task-gold-smile-atlas', name) + '\n')

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('source_dir', type=Path)
    args = parser.parse_args(); registrations = {}; configs = [
        {'width': 221, 'height': 98, 'center': [56.5, 520], 'tooth': [61, 542], 'toothSize': 24},
    ]
    previews = Image.new('RGB', (590 * 3, 732 * 3), (35, 62, 53))
    for row, (animal, rig) in enumerate(CAST.items()):
        body = Image.open(ART / f'task-gold-{animal}-body.png').convert('RGBA')
        generated = Image.open(args.source_dir / f'{animal}-generated.png').convert('RGBA')
        generated = generated.resize(body.size, Image.Resampling.LANCZOS)
        target_points = np.array([landmark(body, b, rig.get('noseRed', False) and i == 2) for i, b in enumerate(rig['landmarks'])])
        source_points = np.array([landmark(generated, b, rig.get('noseRed', False) and i == 2) for i, b in enumerate(rig['landmarks'])])
        transform = np.linalg.solve(np.column_stack([target_points, np.ones(3)]), source_points)
        affine = tuple(transform[:, 0]) + tuple(transform[:, 1])
        registered = generated.transform(body.size, Image.Transform.AFFINE, affine, Image.Resampling.BICUBIC)
        box = rig['box']; neutral = body.crop(box); smile = registered.crop(box); width, height = neutral.size
        # The feather never crosses the outer silhouette or enters the eyes/nose.
        mask = Image.new('L', neutral.size, 0)
        ImageDraw.Draw(mask).polygon(rig['mask'], fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(2))
        mask = ImageChops.multiply(mask, neutral.getchannel('A'))
        filled = neutral.copy(); filled.alpha_composite(smile); smile = filled
        atlas = Image.new('RGBA', (width * COLUMNS, height * 2))
        top, bottom = rig['lipBand']; center = (top + bottom) / 2
        for index in range(FRAMES):
            if not index: patch = neutral.copy()
            else:
                progress = index / (FRAMES - 1)
                # One mouth per frame: compress the generated lip band rather
                # than dissolving two faces or changing the character's eyes.
                half = (bottom - top) / 2 * (.16 + .84 * progress)
                target_knots = [0, center - half, center + half, height]
                source_knots = [0, top, bottom, height]
                mesh = [((0, round(y0), width, round(y1)), (0, sy0, 0, sy1, width, sy1, width, sy0))
                        for y0, y1, sy0, sy1 in zip(target_knots, target_knots[1:], source_knots, source_knots[1:])]
                patch = smile.transform(neutral.size, Image.Transform.MESH, mesh, Image.Resampling.BICUBIC)
            patch.putalpha(mask)
            atlas.alpha_composite(patch, (index % COLUMNS * width, index // COLUMNS * height))
            if index in [0, 7, 15]:
                tile = body.copy(); tile.alpha_composite(patch, box[:2])
                col = [0, 7, 15].index(index)
                previews.paste(tile, (col * 590, row * 732), tile.getchannel('A'))
        name = f'task-gold-{animal}-smile-atlas'; atlas.save(ART / f'{name}.png'); meta(name)
        config = {'width': width, 'height': height,
                  'center': [(box[0] + box[2]) / 2 - 295, 732 - (box[1] + box[3]) / 2],
                  'tooth': [rig['tooth'][0] - 295, 732 - rig['tooth'][1]], 'toothSize': rig['toothSize']}
        configs.append(config)
        registrations[animal] = {'mouthBox': box, 'targetLandmarks': target_points.tolist(), 'generatedLandmarks': source_points.tolist(), 'affine': affine, **config}
    code = '/** Each tiny mouth is registered to its own CC Switch-generated face; eyes/nose never change. */\n'
    code += 'export const TASK_GOLD_FACES = ' + json.dumps(configs, indent=2) + ' as const;\n'
    (ROOT / 'assets/scripts/ui/TaskGoldFaceLayout.ts').write_text(code)
    (args.source_dir / 'registration.json').write_text(json.dumps(registrations, indent=2) + '\n')
    previews.save(args.source_dir / 'registered-smiles.jpg')
    print('Registered three independent gentle smiles; unchanged full faces, 16 frames each.')

if __name__ == '__main__': main()
