"""Install reviewed matched cabinets and alpha guardians into Cocos resources.
The cabinet, its recess and the occluding lip all come from one render.
"""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art-source/rebuild-20260930'
OUT=ROOT/'assets/resources/art'
IDS=('golden-hour','jade-treasury','pearl-palace','ruby-revel')
for name in IDS:
    cabinet=Image.open(SRC/f'cabinet-{name}.png').convert('RGB')
    if cabinet.size!=(1024,1536): raise ValueError((name,cabinet.size))
    # The authored 1024×1536 cabinet remains exactly 1:1 in both axes.
    # Only surrounding architecture/floor extends the portrait room canvas.
    plane=Image.new('RGB',(1024,2304))
    top_color=cabinet.getpixel((6,0))
    top=Image.new('RGB',(1024,384),top_color)
    # Architectural headspace recedes softly toward the actual painted top.
    edge=cabinet.crop((0,0,1024,28))
    transition=edge.resize((1024,84),Image.Resampling.BICUBIC)
    top.paste(transition,(0,300))
    plane.paste(top,(0,0))
    plane.paste(cabinet,(0,384))
    floor=cabinet.crop((0,1440,1024,1536)).resize((1024,384),Image.Resampling.BICUBIC)
    plane.paste(floor,(0,1920))
    plane.save(OUT/f'{name}-tall.png',optimize=True)
    guardian=Image.open(SRC/f'mascot-{name}.png').convert('RGBA')
    alpha=guardian.getchannel('A')
    bounds=alpha.point(lambda v:255 if v>6 else 0).getbbox()
    if not bounds: raise ValueError('No alpha guardian: '+name)
    guardian=guardian.crop(bounds)
    guardian.save(OUT/f'guardian-{name}.png',optimize=True)
    # Exactly the same painted ledge from exactly the same cabinet, in its
    # coordinate position. Alpha outside the architectural niche is clear.
    ledge=Image.new('RGBA',(1024,70))
    patch=plane.crop((585,790,965,860)).convert('RGBA')
    ledge.alpha_composite(patch,(585,0))
    ledge.save(OUT/f'cabinet-foreground-{name}.png',optimize=True)
    print(name, 'cabinet',plane.size,'guardian',guardian.size,'ledge',ledge.size)
