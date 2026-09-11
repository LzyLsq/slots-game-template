"""Remove only the border-connected baked checkerboard, preserving ivory."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parents[1]
source = root / 'assets/resources/generated/common/fortune_mint_emblem_f11.png'
im = np.array(Image.open(source).convert('RGBA'))
rgb = im[:, :, :3].astype(np.int16)
neutral = (rgb.max(axis=2)-rgb.min(axis=2) < 28) & (rgb.min(axis=2) > 105)
labels, _ = ndimage.label(neutral)
border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
border = border[border != 0]
background = np.isin(labels, border)
im[background] = 0
assert background.mean() > .15, 'No broad checkerboard found; do not modify blindly'
out = root / 'output/imagegen/emblem-alpha-clean.png'
Image.fromarray(im).save(out)
print(f'{out}: removed {background.sum()} exterior checkerboard pixels')
