"""Repack F43 CC Switch gold glyphs into individually measured 4x4 cells.
The frozen commissioned source is preserved; no glyph is drawn or stretched.
Requires Pillow, NumPy and OpenCV.
"""
from pathlib import Path
import json, cv2
import numpy as np
from PIL import Image, ImageFilter, ImageChops
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/resources/art'
SOURCE = ROOT / 'art-source/award-glyph-source.png'
image = Image.open(SOURCE).convert('RGBA')
# Measured source rows are not evenly spaced. The last two symbols are punctuation.
columns = [45, 285, 513, 747, 985]
rows = [(180, 412), (412, 625), (625, 825)]
atlas = Image.new('RGBA', (1024, 1024))
crops, evidence = [], []
for i in range(12):
    x0, x1 = columns[i % 4:i % 4 + 2]
    y0, y1 = rows[i // 4]
    window = image.crop((x0, y0, x1, y1))
    alpha = np.array(window.getchannel('A'))
    count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 190).astype('uint8'), 8)
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    mask = Image.fromarray((labels == largest).astype('uint8') * 255).filter(ImageFilter.MaxFilter(5))
    window.putalpha(ImageChops.multiply(window.getchannel('A'), mask))
    bounds = window.getchannel('A').getbbox()
    assert bounds, f'Empty glyph {i}'
    glyph = window.crop(bounds)
    # Common numeral cap height, original aspect ratio, punctuation at the baseline.
    scale = 196 / glyph.height if i < 10 else 1
    glyph = glyph.resize((round(glyph.width * scale), round(glyph.height * scale)), Image.Resampling.LANCZOS)
    assert glyph.width <= 228 and glyph.height <= 216
    width, height = glyph.size
    atlas.alpha_composite(glyph, (i % 4 * 256 + 12, i // 4 * 256 + 12))
    crops.append([12, 12, width, height])
    evidence.append({'character': '0123456789,.'[i], 'source': [x0 + bounds[0], y0 + bounds[1], bounds[2] - bounds[0], bounds[3] - bounds[1]], 'packed': crops[-1]})
atlas.save(ART / 'festival-gold-digits-v2.png', optimize=True)
report = {'crops': crops, 'capWindow': 196, 'glyphs': evidence, 'method': 'Largest connected original glyph, proportional resize, transparent 256px cells; no neighboring glyph pixels'}
(ROOT / 'art-source/award-glyph-crops.json').write_text(json.dumps(report, indent=2) + '\n')
p = ROOT / 'assets/scripts/ui/SymbolCrop.ts'
lines = p.read_text().splitlines()
for i, line in enumerate(lines):
    if line.startswith('export const ART_CROPS:'):
        crops_map = json.loads(line.split('=', 1)[1].rstrip(';'))
        crops_map['festival-gold-digits-v2'] = crops
        lines[i] = 'export const ART_CROPS:Record<string,readonly (readonly number[])[]>=' + json.dumps(crops_map) + ';'
p.write_text('\n'.join(lines) + '\n')
print(json.dumps(evidence))
