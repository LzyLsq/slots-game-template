"""Crop CC Switch-generated transparent cabinet button and movement atlases.

Only extracts source artwork; does not draw or synthesize any pixels.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'art-prompts'
DEST = ROOT / 'assets/resources/art'


def extract(source: str, columns: int, rows: int, prefix: str, directions=None, threshold=40, pad=4):
    image = Image.open(ART / source).convert('RGBA')
    cell_w, cell_h = image.width // columns, image.height // rows
    for row in range(rows):
        for col in range(columns):
            cell = image.crop((col*cell_w, row*cell_h, (col+1)*cell_w, (row+1)*cell_h))
            silhouette = cell.getchannel('A').point(lambda alpha: 255 if alpha > threshold else 0)
            bbox = silhouette.getbbox()
            if not bbox:
                raise ValueError(f'Empty cell {row}, {col} in {source}')
            l,t,r,b = bbox
            crop = cell.crop((max(0,l-pad),max(0,t-pad),min(cell_w,r+pad),min(cell_h,b+pad)))
            name = f'{prefix}{directions[col]}-{row}' if directions else f'{prefix}{row}'
            crop.save(DEST / f'{name}.png', optimize=True)
            print(name, crop.size)

extract('cabinet-controls-v3.source.png', 2, 4, 'bet-', ('minus', 'plus'), threshold=80, pad=3)
# Above generic row naming would overwrite columns; extract FX quadrants explicitly.
source=Image.open(ART / 'cabinet-motion-v1.source.png').convert('RGBA')
for mode,(row,col) in enumerate(((0,0),(0,1),(1,0),(1,1))):
    cell=source.crop((col*768,row*512,(col+1)*768,(row+1)*512))
    bbox=cell.getchannel('A').point(lambda alpha: 255 if alpha>30 else 0).getbbox()
    l,t,r,b=bbox
    cell.crop((l-9,t-9,r+9,b+9)).save(DEST / f'fx-cabinet-{mode}.png',optimize=True)
    print('fx-cabinet',mode,(r-l+18,b-t+18))
