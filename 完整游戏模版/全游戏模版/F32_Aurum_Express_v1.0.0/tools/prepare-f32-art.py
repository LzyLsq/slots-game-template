#!/usr/bin/env python3
"""Prepare the generated F32 casino art for the Cocos resource loader.

Requires Pillow. Source files are intentionally retained only in work/imagegen until
visual sign-off; output sprites contain transparency and an exact square atlas.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'work/imagegen'
DST=ROOT/'assets/resources/art'

def isolated(im):
    im=im.convert('RGBA')
    px=im.load()
    for y in range(im.height):
        for x in range(im.width):
            r,g,b,_=px[x,y]
            # Uniform midnight-blue studio backing; retain emerald/red enamel.
            brightness=max(r,g,b)
            keep=max(0,min(255,int((brightness-38)*8)))
            if g>b+5 and g>25: keep=max(keep,min(255,(g-b)*23))
            if r>b+8 and r>30: keep=max(keep,min(255,(r-b)*15))
            px[x,y]=(r,g,b,keep)
    a=im.getchannel('A').filter(ImageFilter.GaussianBlur(.6))
    im.putalpha(a)
    return im

symbol=Image.open(SRC/'casino-symbols.png').convert('RGBA')
w,h=symbol.size
out=Image.new('RGBA',(1024,1024))
for row in range(4):
    for col in range(4):
        tile=symbol.crop((round(col*w/4),round(row*h/4),round((col+1)*w/4),round((row+1)*h/4)))
        tile=isolated(tile).resize((256,256),Image.Resampling.LANCZOS)
        out.alpha_composite(tile,(col*256,row*256))
out.save(DST/'f32-casino-symbols.png',optimize=True)
out.filter(ImageFilter.GaussianBlur(8)).save(DST/'f32-casino-symbols-blur.png',optimize=True)

control=Image.open(SRC/'casino-controls.png').convert('RGBA')
boxes={'emerald':(36,192,593,424),'crimson':(665,192,1226,424),
       'ivory':(36,816,593,1045),'spin':(717,677,1156,1118)}
for name,rect in boxes.items():
    asset=control.crop(rect)
    w,h=asset.size
    # The source art was rendered on midnight-blue. Keying brightness made
    # the dark enamel translucent; use the physical bezel silhouette instead.
    aa=4
    mask=Image.new('L',(w*aa,h*aa))
    draw=ImageDraw.Draw(mask)
    if name=='spin':
        draw.ellipse((7*aa,5*aa,(w-7)*aa,(h-5)*aa),fill=255)
    else:
        top=12 if name!='ivory' else 13
        bottom=16 if name!='ivory' else 13
        draw.rounded_rectangle((8*aa,top*aa,(w-9)*aa,(h-bottom)*aa),radius=88*aa,fill=255)
    asset.putalpha(mask.resize((w,h),Image.Resampling.LANCZOS))
    asset.save(DST/f'f32-button-{name}.png',optimize=True)

for source,target in [('boarding-hall','f32-station'),('casino-lounge','f32-lounge'),
                      ('casino-cabinet','f32-cabinet'),('casino-jackpot','f32-jackpot')]:
    path=SRC/f'{source}.png'
    if path.exists():
        import shutil
        shutil.copyfile(path,DST/f'{target}.png')

# Lift the moving parts directly from the integrated cabinet photograph. At
# rest, these sprites match the painted cabinet pixel-for-pixel; pressing moves
# the photographed metal/gem itself rather than floating a synthetic button.
cabinet=Image.open(SRC/'casino-cabinet.png').convert('RGBA')
controls={
    'minus':(233,879,320,958),
    'plus':(621,879,708,958),
    'spin':(385,875,556,990),
}
for name,rect in controls.items():
    crop=cabinet.crop(rect)
    w,h=crop.size;aa=4
    mask=Image.new('L',(w*aa,h*aa));brush=ImageDraw.Draw(mask)
    if name=='spin':
        brush.ellipse((1*aa,1*aa,(w-1)*aa,(h-1)*aa),fill=255)
    else:
        brush.rounded_rectangle((3*aa,22*aa,(w-3)*aa,(h-3)*aa),radius=11*aa,fill=255)
        brush.ellipse((3*aa,2*aa,(w-3)*aa,45*aa),fill=255)
    crop.putalpha(mask.resize((w,h),Image.Resampling.LANCZOS))
    crop.save(DST/f'f32-cabinet-control-{name}.png',optimize=True)
print('prepared F32 art')
