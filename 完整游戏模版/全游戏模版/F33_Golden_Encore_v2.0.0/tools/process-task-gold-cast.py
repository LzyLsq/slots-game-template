"""Register CC Switch-generated reward forearms, preserving image proportions.

No character pixels are painted. Left sleeve cuts sit underneath each intact
body sleeve; the independent forearm pivots at the elbow, not the whole image.
"""
import argparse
import json
from pathlib import Path
import uuid
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/resources/art'
CAST = {
    'rabbit': {'cut': 1175, 'elbow': (1240, 520), 'bodyElbow': (680, 530), 'scale': .48, 'gold': (1472, 425)},
    'fox': {'cut': 1250, 'elbow': (1320, 550), 'bodyElbow': (616, 500), 'scale': .48, 'gold': (1595, 338)},
    'dragon': {'cut': 1200, 'elbow': (1290, 535), 'bodyElbow': (680, 520), 'scale': .48, 'gold': (1575, 418)},
}

def clean(image):
    rgba = np.array(image)
    labels, count = ndimage.label(rgba[:, :, 3] >= 24)
    sizes = np.bincount(labels.ravel()); sizes[0] = 0
    if count == 0: raise ValueError('No generated silhouette')
    silhouette = labels == sizes.argmax()
    keep = ndimage.binary_dilation(silhouette, iterations=3)
    rgba[:, :, 3] *= keep
    result = Image.fromarray(rgba)
    bbox = result.getchannel('A').getbbox()
    return result, bbox

def meta(name):
    path = ART / f'{name}.png.meta'
    if path.exists(): return
    template = json.loads((ART / 'task-gold-keeper.png.meta').read_text())
    old = template['uuid']; new = str(uuid.uuid4())
    text = json.dumps(template, indent=2).replace(old, new).replace('task-gold-keeper', name)
    path.write_text(text + '\n')

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('source_dir', type=Path)
    args = parser.parse_args(); registration = {}
    for animal, rig in CAST.items():
        source = Image.open(args.source_dir / f'{animal}-generated.png').convert('RGBA')
        if source.size != (1774, 887): raise ValueError(f'Unexpected sheet size for {animal}: {source.size}')
        left, bbox = clean(source.crop((0, 0, 887, 887)))
        body_raw = left.crop(bbox)
        s = min(586 / body_raw.width, 730 / body_raw.height)
        size = (round(body_raw.width * s), round(body_raw.height * s))
        body = Image.new('RGBA', (590, 732))
        offset = ((590 - size[0]) // 2, 732 - size[1])
        body.alpha_composite(body_raw.resize(size, Image.Resampling.LANCZOS), offset)
        # Cut only excess shoulder cloth. The original torso covers this seam at
        # every pose, while the actual connected cuff, paw and treasure remain.
        right, local = clean(source.crop((rig['cut'], 0, 1774, 887)))
        arm_box = (local[0] + rig['cut'], local[1], local[2] + rig['cut'], local[3])
        arm = right.crop(local)
        body_name = f'task-gold-{animal}-body'; arm_name = f'task-gold-{animal}-arm'
        body.save(ART / f'{body_name}.png'); arm.save(ART / f'{arm_name}.png')
        meta(body_name); meta(arm_name)
        elbow = [offset[0] + (rig['bodyElbow'][0] - bbox[0]) * s - 295,
                 732 - offset[1] - (rig['bodyElbow'][1] - bbox[1]) * s]
        arm_center = [(arm_box[0] + arm.width / 2 - rig['elbow'][0]) * rig['scale'],
                      (rig['elbow'][1] - arm_box[1] - arm.height / 2) * rig['scale']]
        gold = [(rig['gold'][0] - rig['elbow'][0]) * rig['scale'],
                (rig['elbow'][1] - rig['gold'][1]) * rig['scale']]
        registration[animal] = {
            'bodyBox': list(bbox), 'bodyScale': s, 'bodyOffset': list(offset),
            'armBox': list(arm_box), 'elbowSource': list(rig['elbow']),
            'elbow': [round(x, 3) for x in elbow],
            'armCenter': [round(x, 3) for x in arm_center],
            'armSize': [round(arm.width * rig['scale'], 3), round(arm.height * rig['scale'], 3)],
            'gold': [round(x, 3) for x in gold],
        }
    (args.source_dir / 'cast-registration.json').write_text(json.dumps(registration, indent=2) + '\n')
    layouts = [{'elbow': [208, 375], 'armCenter': [120.32, -44.8], 'armSize': [346.88, 217.6], 'gold': [213.76, -44.16], 'lightSize': [52, 52], 'soleX': 41.5}]
    for animal in CAST:
        data = registration[animal]
        layouts.append({key: data[key] for key in ['elbow', 'armCenter', 'armSize', 'gold']} | {'lightSize': [44, 44], 'soleX': {'rabbit': 41.5, 'fox': 76.5, 'dragon': 103.5}[animal]})
    code = '/** Generated source-pixel registration; reproduce with process-task-gold-cast.py. */\n'
    code += 'export const TASK_GOLD_RIGS = ' + json.dumps(layouts, indent=2) + ' as const;\n'
    code += 'export const TASK_GOLD_STAGE = { width: 1024, height: 1536, footX: 600, footY: 801, actorScale: .568, maxActorTop: 500 } as const;\n'
    (ROOT / 'assets/scripts/ui/TaskGoldRigLayout.ts').write_text(code)
    print('Registered three distinct generated treasure rigs; image pixels unchanged.')

if __name__ == '__main__': main()
