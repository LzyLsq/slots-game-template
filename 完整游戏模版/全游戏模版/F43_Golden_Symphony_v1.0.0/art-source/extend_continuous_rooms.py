"""Extend each registered F43 room into one wide opaque Cocos background.

Uses the existing local CC Switch provider. No keys are logged or stored.
The old central cabinet pixels remain registered; only peripheral architecture
is outpainted and its edge transition flattened into the final single texture.
"""
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
import time
import urllib.error
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from finish_registered_art import ART, WORK, IDS, edit

P = Path(__file__).resolve().parents[1]
SIZE = (4096, 3072)
REFERENCE_SIZE = (1536, 1152)
LEFT = 1024
FEATHER = 192
PROMPT = (
    'OUTPAINT ONLY the unprotected left and right sides of the supplied reference '
    'into ONE continuous bright luxurious musical concert palace interior. '
    'The centered cabinet, screen aperture, registers, console, title panel, coins, '
    'floor and architecture are fixed: preserve their exact size, perspective, '
    'position, proportions and illumination. Continue the SAME ivory marble '
    'floor, gold columns, arches, side balconies and window light naturally '
    'across the left and right edges. One camera, one vanishing point, continuous '
    'marble patterns and reflections. No extra cabinet, no characters, no text, '
    'no vignette, no dark filler, no blur, no decorative border, no mirror copying, '
    'no collage and no seam. Premium detailed cheerful wealthy 3D cartoon game '
    'environment. Complete the full opaque 4:3 canvas. Do not crop or zoom the '
    'protected central portrait.'
)

def extend(mode):
    source = ART / (mode + '-room-full.png')
    destination = ART / (mode + '-room-continuous.png')
    original = Image.open(source).convert('RGB')
    assert original.size == (2048, 3072)
    reference = Image.new('RGBA', REFERENCE_SIZE)
    reference.alpha_composite(original.convert('RGBA').resize((768, 1152), Image.Resampling.LANCZOS), (384, 0))
    mask = Image.new('RGBA', REFERENCE_SIZE, (255, 255, 255, 0))
    ImageDraw.Draw(mask).rectangle((456, 0, 1079, 1151), fill=(255, 255, 255, 255))
    reference.save(WORK / (mode + '-continuous-reference.png'))
    mask.save(WORK / (mode + '-continuous-mask.png'))
    for attempt in range(3):
        try:
            result = edit(mode + '-continuous-room-v1', reference, PROMPT, '1536x1152', mask)
            break
        except urllib.error.URLError:
            if attempt == 2:
                raise
            print(f'{mode}: retrying CC Switch connection ({attempt + 1}/2)', flush=True)
            time.sleep(2)
    if result.width * 3 != result.height * 4:
        raise ValueError(f'{mode}: provider canvas {result.size} does not have the required 4:3 proportions')
    panorama = np.array(result.convert('RGB').resize(SIZE, Image.Resampling.LANCZOS), dtype=np.float32)
    central = np.array(original, dtype=np.float32)
    alpha = np.ones(2048, dtype=np.float32)
    ramp = .5 - .5 * np.cos(np.linspace(0, np.pi, FEATHER))
    alpha[:FEATHER] = ramp
    alpha[-FEATHER:] = ramp[::-1]
    crop = panorama[:, LEFT:LEFT + 2048]
    panorama[:, LEFT:LEFT + 2048] = crop * (1 - alpha[None, :, None]) + central * alpha[None, :, None]
    flattened = np.rint(panorama).clip(0, 255).astype('uint8')
    # The gameplay registration and central mobile composition are unchanged.
    assert np.array_equal(flattened[:, LEFT + FEATHER:LEFT + 2048 - FEATHER], np.array(original)[:, FEATHER:2048-FEATHER])
    Image.fromarray(flattened).save(destination)
    evidence = {
        'mode': mode, 'source': source.name,
        'sourceSha256': sha256(source.read_bytes()).hexdigest(),
        'output': destination.name, 'outputSha256': sha256(destination.read_bytes()).hexdigest(),
        'size': list(SIZE), 'providerOutputSize': list(result.size),
        'centralOffset': [LEFT, 0], 'untouchedCentralColumns': [LEFT + FEATHER, LEFT + 2048 - FEATHER],
        'edgeTransitionPixels': FEATHER, 'runtimeBackgroundSprites': 1,
        'provider': 'Current local CC Switch image provider; existing project edit helper',
        'prompt': PROMPT,
    }
    print(mode + ' continuous room installed', flush=True)
    return evidence

if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=2) as pool:
        report = list(pool.map(extend, IDS))
    (P / 'docs/continuous-room-art-20261013.json').write_text(json.dumps(report, indent=2) + '\n')
