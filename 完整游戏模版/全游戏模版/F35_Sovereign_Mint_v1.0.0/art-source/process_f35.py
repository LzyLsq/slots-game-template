"""Post-process commissioned CC Switch F35 bitmap renders; no generated UI code.

Re-running is safe. Cocos .meta files remain untouched. Atlas cells are individually
keyed/cropped so neither white prompt canvas nor a neighbouring cell leaks into UI.
"""
from pathlib import Path
from PIL import Image, ImageFilter
import math
import importlib.util

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'art-source/master'
ART=ROOT/'assets/resources/art'
WEB=ROOT/'build-templates/web-mobile'
IDS=['golden-hour','jade-treasury','pearl-palace','ruby-revel']
RESAMPLE=Image.Resampling.LANCZOS

def key_white(source):
    im=source.convert('RGBA')
    data=bytearray(im.tobytes())
    for i in range(0,len(data),4):
        r,g,b=data[i:i+3]
        # Graded chroma-aware key: antialiased white canvas is transparent,
        # saturated brass, cream stone and bright silver details remain solid.
        m=min(r,g,b)
        neutral=max(r,g,b)-m<32
        if neutral and m>225:
            a=max(0,min(255,int((249-m)*255/24)))
            if a<255:
                data[i+3]=min(data[i+3],a)
                if a<6:data[i:i+3]=bytes((0,0,0))
    return Image.frombytes('RGBA',im.size,bytes(data))

def fitted(im,size,margin=.045):
    alpha=im.getchannel('A');bounds=alpha.point(lambda a: 255 if a>9 else 0).getbbox()
    if bounds:im=im.crop(bounds)
    maxw,maxh=int(size[0]*(1-margin*2)),int(size[1]*(1-margin*2))
    im.thumbnail((maxw,maxh),RESAMPLE)
    dest=Image.new('RGBA',size)
    dest.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2))
    return dest

def save(im,name):im.save(ART/name,optimize=True)

def grid(name,cols,rows,target,size=1024,margin=.06):
    source=Image.open(SRC/name).convert('RGB')
    out=Image.new('RGBA',(size,size));cell=size//cols
    for i in range(cols*rows):
        x0=round(i%cols*source.width/cols);x1=round((i%cols+1)*source.width/cols)
        y0=round(i//cols*source.height/rows);y1=round((i//cols+1)*source.height/rows)
        inset=int(min(x1-x0,y1-y0)*.018)
        piece=source.crop((x0+inset,y0+inset,x1-inset,y1-inset))
        piece=fitted(key_white(piece),(cell,cell),margin)
        out.alpha_composite(piece,((i%cols)*cell,(i//cols)*cell))
    save(out,target)
    return out

def artifact(name,target,size=None,margin=.015):
    im=key_white(Image.open(SRC/name))
    if size:im=fitted(im,size,margin)
    else:
        b=im.getchannel('A').point(lambda v:255 if v>10 else 0).getbbox()
        if b:im=im.crop(b)
    save(im,target)
    return im

def cabinet(source,target):
    # Per-cabinet measured glass bounds in source pixels. All four map their
    # actual dark openings to the same practical 5-row aperture.
    dark={'golden-hour':(665,808),'jade-treasury':(505,647),
          'pearl-palace':(592,723),'ruby-revel':(539,676)}
    id=source.replace('-tall.png','');top,bottom=dark[id]
    im=Image.open(SRC/source).convert('RGB')
    out=Image.new('RGB',(1024,2304))
    a=top-20;b=bottom+20;c=min(1536,b+265)
    seams=[(0,a,0,930),(a,b,930,1370),(b,c,1370,1800),(c,1536,1800,2304)]
    for start,stop,y0,y1 in seams:
        out.paste(im.crop((0,start,1024,stop)).resize((1024,y1-y0),RESAMPLE),(0,y0))
    # Stretch the central glass from its physical narrow phone rendition to
    # a legible 600px opening; compress peripheral architecture symmetrically.
    left,right={'golden-hour':(226,798),'jade-treasury':(246,787),
        'pearl-palace':(235,789),'ruby-revel':(261,764)}[id]
    widened=Image.new('RGB',(1024,2304))
    for sx0,sx1,dx0,dx1 in ((0,left,0,210),(left,right,210,814),(right,1024,814,1024)):
        widened.paste(out.crop((sx0,0,sx1,2304)).resize((dx1-dx0,2304),RESAMPLE),(dx0,0))
    save(widened,target)

for id in IDS:
    if not (SRC/(id+'-tall.png')).exists():continue
    cabinet(id+'-tall.png',id+'-tall.png')
    artifact('prize-'+id+'.png','prize-'+id+'.png',(1024,1024),.02)
# Symbols in the commissioned illustrations cross nominal grid lines. Extract
# whole silhouettes first; independently blur each cell before atlas packing.
# Keep one implementation for rebuilds and the standalone asset QA command.
symbol_spec=importlib.util.spec_from_file_location('f35_symbols',ROOT/'tools/clean-symbol-gutters.py')
symbol_processor=importlib.util.module_from_spec(symbol_spec)
symbol_spec.loader.exec_module(symbol_processor)
symbol_processor.build_all(SRC,ART)

for i in range(4):
    if not (SRC/f'controls-{i}.png').exists():continue
    out=grid(f'controls-{i}.png',2,2,f'controls-{i}.png')
    for j in range(4):
        piece=out.crop(((j%2)*512,(j//2)*512,(j%2+1)*512,(j//2+1)*512))
        save(piece,f'canopy-button-{i*4+j}.png')
    if (SRC/f'title-{i}.png').exists():artifact(f'title-{i}.png',f'canopy-title-{i}.png',(1000,280),.018)
if (SRC/'destinations.png').exists():grid('destinations.png',2,2,'canopy-destinations.png',margin=.045)
if (SRC/'interfaces.png').exists():grid('interfaces.png',4,4,'interfaces.png',margin=.12)
if (SRC/'frames.png').exists():
    frame=grid('frames.png',2,2,'frames.png',margin=.03)
    for i in range(4):
        piece=frame.crop(((i%2)*512,(i//2)*512,(i%2+1)*512,(i//2+1)*512))
        save(piece,f'canopy-frame-{i}.png')
        # Separate prize frame asset preserves the independently themed stage.
        save(piece,f'win-frame-{i}.png')
if (SRC/'plates.png').exists():
    source=Image.open(SRC/'plates.png').convert('RGB')
    # This render is two full-width carved plates stacked vertically (not 2×2).
    # Keep their proportions; derive four material variants without painting UI.
    for i in range(4):
        upper=i%2==0
        a=0 if upper else source.height//2
        b=source.height//2 if upper else source.height
        plate=fitted(key_white(source.crop((0,a,source.width,b))),(820,260),.025)
        if i>=2:
            r,g,blue,alpha=plate.split()
            # Darker bronze/emerald patina pair, preserving the commissioned relief.
            plate=Image.merge('RGBA',(r.point(lambda v:int(v*.91)),g.point(lambda v:int(v*.97)),blue.point(lambda v:int(v*.89)),alpha))
        save(plate,f'canopy-soft-plate-{i}.png')
if (SRC/'brand.png').exists():
    brand=artifact('brand.png','canopy-brand.png',(1100,470),.015)
    brand.save(WEB/'sovereign-brand.png',optimize=True)
if (SRC/'entry.png').exists():Image.open(SRC/'entry.png').save(WEB/'sovereign-arrival.png',optimize=True)
print('F35 commissioned art processed:',len(list(SRC.glob('*.png'))),'source images')
