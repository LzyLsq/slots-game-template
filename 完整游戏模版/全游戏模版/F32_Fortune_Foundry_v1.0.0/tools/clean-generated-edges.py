"""Remove CC Switch magenta matte fringing at alpha edges of generated sprites.
Original authored paintings are retained outside the shipped assets for repeatability.
No outlines, icons, or replacement visual pixels are drawn by this processing.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

art = Path(__file__).resolve().parents[1] / 'assets/resources/art'
originals = Path('/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/alpha-originals')
originals.mkdir(parents=True, exist_ok=True)
files = sorted(set([*art.glob('symbols*.png'), *art.glob('foundry-button-*.png'),
                    *art.glob('foundry-frame-*.png'), art/'foundry-ui-components.png',
                    *art.glob('prize-*.png'), *art.glob('foundry-title-*.png'),
                    art/'interfaces.png', art/'portraits.png', art/'foundry-treasures.png']))
for path in files:
    original = originals/path.name
    if not original.exists(): original.write_bytes(path.read_bytes())
    rgba = np.asarray(Image.open(original).convert('RGBA')).copy()
    rgb = rgba[:,:,:3].astype(np.float32)
    r,g,b = rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    alpha = rgba[:,:,3].astype(np.float32)
    distance = distance_transform_edt(alpha>16)
    # Pure background-key magenta travels several pixels into cutout edges;
    # reject it only where the cutout meets transparent studio backing.
    magenta = np.clip((np.minimum(r,b)-g-12)/72,0,1) * np.clip((b/(r+1)-.42)/.36,0,1)
    magenta *= np.clip((6-distance)/4,0,1)
    edge = np.clip((distance-1)/1.8,0,1)
    alpha *= edge*(1-magenta)
    rgba[:,:,3]=np.clip(alpha,0,255).astype(np.uint8)
    Image.fromarray(rgba).save(path,optimize=True)
print('Cleaned',len(files),'generated sprite alpha mattes')
