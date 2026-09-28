#!/usr/bin/env python3
"""Key unwanted CC Switch studio-magenta from the generated UI atlas.

Only alpha is cut; gold/teal artwork is not repainted or reconstructed.
The source is the saved untrimmed CC Switch atlas outside the release folder.
"""
from pathlib import Path
import numpy as np
from PIL import Image

project = Path(__file__).resolve().parents[1]
source = Path('/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/alpha-originals/foundry-ui-components.png')
target = project / 'assets/resources/art/foundry-ui-components.png'
a = np.asarray(Image.open(source).convert('RGBA')).copy()
r, g, b = (a[:, :, i].astype(np.float32) for i in range(3))
# The backing is hue-distinct from brass, cream, turquoise and ruby red.
magenta = np.clip((np.minimum(r,b)-g-18)/34,0,1) * np.clip((b/(r+1)-.45)/.18,0,1)
key = magenta > .52
a[:, :, 3][key] = 0
# Low-alpha anti-alias pixels nearest the matte cannot glow pink on dark panels.
fringe = (magenta > .26) & (a[:, :, 3] < 160)
a[:, :, 3][fringe] = 0
a[:, :, :3][a[:, :, 3] == 0] = 0
Image.fromarray(a).save(target, optimize=True)
print('Removed generated magenta matte pixels:', int(np.count_nonzero(key|fringe)))
