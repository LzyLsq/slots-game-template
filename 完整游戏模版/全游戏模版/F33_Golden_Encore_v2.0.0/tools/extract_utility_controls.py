"""Extract only generated pixels from the CC Switch transparent 3×4 atlas."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
source = Image.open(root/'art-prompts/cabinet-utility-controls-v1.source.png').convert('RGBA')
out = root/'assets/resources/art'
assert source.size == (1024, 1536)
for row in range(4):
    for col, role in enumerate(('home', 'auto', 'rules')):
        bands = ((280, 500), (540, 790), (820, 1080), (1100, 1380))
        l, t = col*1024//3, bands[row][0]
        r, b = (col+1)*1024//3 if col < 2 else 1024, bands[row][1]
        cell = source.crop((l,t,r,b))
        bounds = cell.getchannel('A').point(lambda a: 255 if a>40 else 0).getbbox()
        if not bounds: raise RuntimeError((row,col))
        left,top,right,bottom=bounds
        pad=5
        cropped=cell.crop((max(0,left-pad),max(0,top-pad),min(cell.width,right+pad),min(cell.height,bottom+pad)))
        cropped.save(out/f'utility-{role}-{row}.png',optimize=True)
        print(f'utility-{role}-{row}', cropped.size)
