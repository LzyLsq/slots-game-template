"""Crop CC Switch's 4×4 control sheet; key only its magenta studio backing."""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import binary_fill_holes, label

source = Path('/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/images/button-atlas-v2.png')
output = Path(__file__).resolve().parents[1] / 'assets/resources/art'
sheet = Image.open(source).convert('RGB')
for row in range(4):
    for col in range(4):
        left = round(col * sheet.width / 4); upper = round(row * sheet.height / 4)
        right = round((col + 1) * sheet.width / 4); lower = round((row + 1) * sheet.height / 4)
        rgb = np.array(sheet.crop((left, upper, right, lower)), dtype=np.uint8)
        r, g, b = [rgb[..., n].astype(np.int16) for n in range(3)]
        studio = (r > 160) & (b > 160) & (g < 150) & (abs(r-b) < 110)
        components, count = label(studio)
        edge = np.unique(np.concatenate([components[0], components[-1], components[:,0], components[:,-1]]))
        background = np.isin(components, edge[edge != 0])
        # Keep tiny gold loops inside the button; only external connected magenta
        # belongs to the studio backdrop. The raster content is never repainted.
        alpha = np.where(background, 0, 255).astype(np.uint8)
        rgba = Image.fromarray(np.dstack([rgb,alpha]), 'RGBA')
        rgba.resize((300,300), Image.Resampling.LANCZOS).save(output/f'foundry-button-{row*4+col}.png',optimize=True)
print('Installed 16 CC Switch control faces')
