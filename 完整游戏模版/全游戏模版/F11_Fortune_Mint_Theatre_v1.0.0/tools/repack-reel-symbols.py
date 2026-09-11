"""Extract whole symbols before packing; never slice through generated art."""
import argparse
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

p = argparse.ArgumentParser()
p.add_argument('source', type=Path)
p.add_argument('output', type=Path)
p.add_argument('--remove-checker', action='store_true')
a = p.parse_args()
rgba = np.array(Image.open(a.source).convert('RGBA'))
if a.remove_checker:
    rgb = rgba[:, :, :3].astype(np.int16)
    neutral = (rgb.max(axis=2)-rgb.min(axis=2) < 24) & (rgb.min(axis=2) > 170)
    regions, count = ndimage.label(neutral)
    sizes = np.bincount(regions.ravel())
    # Checker squares are part of the pixels, not real transparency.
    # Only broad connected neutral regions are background, not tiny highlights.
    same_region = regions[:, 1:] == regions[:, :-1]
    edges = np.abs(np.diff(rgb[:, :, 0], axis=1)) > 20
    pairs = np.bincount(regions[:, :-1][same_region].ravel(), minlength=count+1)
    transitions = np.bincount(regions[:, :-1][same_region & edges].ravel(), minlength=count+1)
    # Smooth ivory and metal highlights must remain opaque. Checkerboard
    # regions contain repeated hard luminance transitions unlike highlights.
    remove = (sizes > 1000) & (transitions / np.maximum(1, pairs) > 0.06)
    remove[0] = False
    rgba[remove[regions], 3] = 0

labels, count = ndimage.label(rgba[:, :, 3] > 24)
objects = ndimage.find_objects(labels)
chosen = {}
source_cell = rgba.shape[1] / 3
for label_id, box in enumerate(objects, 1):
    if box is None:
        continue
    ys, xs = box
    region = labels[box] == label_id
    area = int(region.sum())
    if area < 2000:
        continue
    cy, cx = ndimage.center_of_mass(region)
    col = min(2, int((xs.start+cx)/source_cell))
    row = int((ys.start+cy)/source_cell)
    if row > 2:
        continue
    index = row*3+col
    if index not in chosen or area > chosen[index][0]:
        chosen[index] = (area, label_id, box)
if len(chosen) != 9:
    raise SystemExit(f'Expected 9 complete objects, found slots {sorted(chosen)}')

cell = 384
atlas = Image.new('RGBA', (cell*3, cell*4))
report = []
for index in range(9):
    area, label_id, box = chosen[index]
    ys, xs = box
    pixels = rgba[box].copy()
    keep = labels[box] == label_id
    pixels[~keep] = 0
    item = Image.fromarray(pixels)
    item.thumbnail((320, 320), Image.Resampling.LANCZOS)
    x, y = index%3*cell+(cell-item.width)//2, index//3*cell+(cell-item.height)//2
    atlas.alpha_composite(item, (x, y))
    report.append({'index':index, 'source':[xs.start,ys.start,xs.stop,ys.stop], 'packed':[x,y,item.width,item.height]})

# Transparent gutters prevent neighbour fragments and filtering bleed.
for index in range(12):
    tile = atlas.crop((index%3*cell,index//3*cell,index%3*cell+cell,index//3*cell+cell))
    bounds = tile.getchannel('A').getbbox()
    if index < 9:
        assert bounds and min(bounds[0],bounds[1],cell-bounds[2],cell-bounds[3]) >= 30
    else:
        assert bounds is None
a.output.parent.mkdir(parents=True, exist_ok=True)
atlas.save(a.output, optimize=True)
print(json.dumps(report, indent=2))
