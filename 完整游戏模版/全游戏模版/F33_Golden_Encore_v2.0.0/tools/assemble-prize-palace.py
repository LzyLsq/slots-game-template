"""Extract CC Switch generated prize sculptures, never repaint or stretch them.

Retains original UUIDs for replacements and records source/crop/hash provenance.
"""
from pathlib import Path
from datetime import datetime
import hashlib
import json
import uuid
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects, binary_dilation

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/resources/art'
GEN = ROOT / 'output/generation'
PROVENANCE = ROOT / 'docs/ART_PROVENANCE.json'
THEMES = ['jade', 'pearl', 'ember', 'celestial']
SIZES = [(1120, 364), (1360, 288), (380, 824), (380, 824)]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def contain(image, size):
    # Alpha is preserved; no artificial outline, painted glow or stretched art.
    image.thumbnail((size[0] - 12, size[1] - 12), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', size)
    canvas.alpha_composite(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return canvas

def component(source, part):
    image = Image.open(source).convert('RGBA')
    rgba = np.asarray(image).copy()
    labels, _ = label(rgba[:, :, 3] > 20)
    boxes = find_objects(labels)
    sizes = np.bincount(labels.ravel())
    components = sorted((int(sizes[i]), i, boxes[i - 1]) for i in range(1, len(sizes)))[-4:]
    components.sort(key=lambda c: c[2][0].start)
    # Two upper objects, two lower objects; sort the lower sculptures by x.
    lower = sorted(components[2:], key=lambda c: c[2][1].start)
    _, index, (sy, sx) = lower[part - 2]
    mask = binary_dilation(labels == index, iterations=4)
    rgba[:, :, 3] = np.where(mask, rgba[:, :, 3], 0)
    box = [max(0, sx.start - 5), max(0, sy.start - 5), min(image.width, sx.stop + 5), min(image.height, sy.stop + 5)]
    return Image.fromarray(rgba).crop(box), box

def row(source, part):
    image = Image.open(source).convert('RGBA')
    alpha = np.asarray(image)[:, :, 3]
    occupied = np.any(alpha > 6, axis=1)
    intervals = []
    start = None
    for y, present in enumerate(list(occupied) + [False]):
        if present and start is None:
            start = y
        if not present and start is not None:
            if y - start > 20:
                intervals.append((start, y))
            start = None
    assert len(intervals) == 2, (source, intervals)
    top, bottom = intervals[part]
    crop = image.crop((0, max(0, top - 5), image.width, min(image.height, bottom + 5)))
    bbox = crop.getchannel('A').getbbox()
    box = [bbox[0], max(0, top - 5) + bbox[1], bbox[2], max(0, top - 5) + bbox[3]]
    return image.crop(box), box

def meta(path):
    if path.with_suffix('.png.meta').exists():
        return
    template = json.loads((ART / 'prize-ornament-0-0.png.meta').read_text())
    value = str(uuid.uuid4())
    template['uuid'] = value
    template['userData']['redirect'] = value + '@6c48a'
    sub = template['subMetas']['6c48a']
    sub['uuid'] = value + '@6c48a'
    sub['displayName'] = path.stem
    sub['userData']['imageUuidOrDatabaseUri'] = value
    path.with_suffix('.png.meta').write_text(json.dumps(template, indent=2) + '\n')

provenance = json.loads(PROVENANCE.read_text())
sources = json.loads((ROOT / 'docs/prize-palace-sources.json').read_text())
entries = []
for mode, theme in enumerate(THEMES):
    for part in range(4):
        stem = f'prize-panorama-{theme}' if part < 2 else f'prize-palace-{theme}'
        source = GEN / f'{stem}.png'
        response = sources[stem]
        image, box = row(source, part) if part < 2 else component(source, part)
        out = ART / f'prize-ornament-{mode}-{part}.png'
        contain(image, SIZES[part]).save(out, optimize=True)
        meta(out)
        entries.append(dict(asset=out.name, sha256=digest(out), request_model='gpt-5.6-sol', image_tool='gpt-image-2',
            prompt=(ROOT / 'docs/prompts' / f'{stem}.txt').read_text(), response_id=response['response_id'],
            source=str(source.relative_to(ROOT)), source_sha256=digest(source), crop_box=box,
            generated_at=datetime.now().astimezone().isoformat(),
            derivation='Alpha-connected sculpture (threshold 20, four-pixel fringe) isolated from atlas' if part > 1 else 'Alpha-separated panorama row, tight crop',
            fit='Uniform aspect-preserving contain, 6px transparent canvas safety gutter; no repainting'))

source = GEN / 'prize-festival-light.png'
response = sources['prize-festival-light']
for part, name in enumerate(['fx-prize-firework', 'fx-prize-aureole']):
    image, box = row(source, part)
    out = ART / f'{name}.png'
    contain(image, (768, 768)).save(out, optimize=True)
    meta(out)
    entries.append(dict(asset=out.name, sha256=digest(out), request_model='gpt-5.6-sol', image_tool='gpt-image-2',
        prompt=(ROOT / 'docs/prompts/prize-festival-light.txt').read_text(), response_id=response['response_id'],
        source=str(source.relative_to(ROOT)), source_sha256=digest(source), crop_box=box,
        generated_at=datetime.now().astimezone().isoformat(),
        derivation='Separated alpha-light row; preserve soft original luminous alpha, uniform square contain, no hand-painted glow'))

names = {entry['asset'] for entry in entries}
# History is kept separately so current asset -> current hash remains unambiguous.
history = provenance.setdefault('superseded_assets', [])
for entry in provenance['assets']:
    if entry.get('asset') in names and entry.get('sha256') != next(new['sha256'] for new in entries if new['asset'] == entry.get('asset')):
        history.append({**entry, 'superseded_by': '2026-10-10 palace prize choreography'})
provenance['assets'] = [entry for entry in provenance['assets'] if entry.get('asset') not in names] + entries
PROVENANCE.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + '\n')
print('Extracted', len(entries), 'generated, true-alpha sprites; preserved existing UUIDs')
