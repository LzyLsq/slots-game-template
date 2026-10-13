"""Extract intact generated controls; separate fixed mounting sockets and press faces.
Only alpha masks / atlas extraction are procedural; every visible texture is raster art.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import numpy as np, json, collections
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'art-source';OUT=ROOT/'assets/art'
manifest=json.loads((OUT/'manifest.json').read_text())

def isolate(source):
    a=np.array(Image.open(SRC/source).convert('RGBA'));rgb=a[:,:,:3].astype(float)
    neutral=(rgb.min(2)>239)&((rgb.max(2)-rgb.min(2))<18);h,w=neutral.shape
    bg=np.zeros((h,w),bool);q=collections.deque()
    for x,y in [(x,y)for x in range(w)for y in(0,h-1)]+[(x,y)for y in range(h)for x in(0,w-1)]:
        if neutral[y,x]and not bg[y,x]:bg[y,x]=True;q.append((x,y))
    while q:
        x,y=q.popleft()
        for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
            xx,yy=x+dx,y+dy
            if 0<=xx<w and 0<=yy<h and neutral[yy,xx]and not bg[yy,xx]:bg[yy,xx]=True;q.append((xx,yy))
    a[bg,3]=0;a[a[:,:,3]==0,:3]=0
    seen=np.zeros((h,w),bool);parts=[]
    for y,x in zip(*np.where(a[:,:,3]>40)):
        if seen[y,x]:continue
        q=collections.deque([(x,y)]);seen[y,x]=True;part=[]
        while q:
            xx,yy=q.popleft();part.append((xx,yy))
            for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
                nx,ny=xx+dx,yy+dy
                if 0<=nx<w and 0<=ny<h and a[ny,nx,3]>40 and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
        if len(part)>w*h*.004:
            xs,ys=zip(*part);parts.append(tuple(map(int,(min(xs),min(ys),max(xs)+1,max(ys)+1))))
    return Image.fromarray(a),parts

def clean_plate_silhouette(image):
    """Discard atlas dust, not carving: retain the connected plate plus its AA fringe."""
    a=np.array(image);h,w=a.shape[:2];solid=a[:,:,3]>32;seen=np.zeros((h,w),bool)
    x,y=w//2,h//2
    assert solid[y,x], 'The plate center must seed the intact solid silhouette'
    q=collections.deque([(x,y)]);seen[y,x]=True
    while q:
        x,y=q.popleft()
        for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
            nx,ny=x+dx,y+dy
            if 0<=nx<w and 0<=ny<h and solid[ny,nx] and not seen[ny,nx]:
                seen[ny,nx]=True;q.append((nx,ny))
    fringe=np.array(Image.fromarray((seen*255).astype('uint8')).filter(ImageFilter.MaxFilter(5)))>0
    a[~fringe]=0
    return Image.fromarray(a)

sheet,parts=isolate('controls-mechanical-v3.png')
# The packed-sheet tiger / crane crowns touch; never cut either ornament short.
# Replace the complete pair with a separately generated two-object atlas.
parts=[b for b in parts if b[3]-b[1]<sheet.height*.42]
assert len(parts)==5,('Expected five intact packed controls',parts)
parts.sort(key=lambda b:(b[1]+b[3])/2)
parts=[parts[0]]+sorted(parts[1:3])+parts[3:]
objects={n:(sheet,b,'controls-mechanical-v3.png')for n,b in zip(['button-long','button-gold','button-jade','button-spin-koi','button-spin-tortoise'],parts)}
left,boxes=isolate('controls-spin-left-v4.png');assert len(boxes)==2,('Two isolated round controls required',boxes)
boxes.sort();objects.update({n:(left,b,'controls-spin-left-v4.png')for n,b in zip(['button-spin-tiger','button-spin-crane'],boxes)})
for name,(sheet,b,source)in objects.items():
    im=sheet.crop(b);padded=Image.new('RGBA',(im.width+8,im.height+8));padded.alpha_composite(im,(4,4));im=padded
    if name in ['button-long','button-gold','button-jade']:im=clean_plate_silhouette(im)
    W,H=im.size;mask=Image.new('L',im.size)
    if 'spin-'in name:
        box=(.21*W,.245*H,.79*W,.805*H);ImageDraw.Draw(mask).ellipse(box,fill=255)
    else:
        box=(.12*W,.30*H,.88*W,.75*H)if name!='button-long'else(.105*W,.30*H,.895*W,.75*H)
        ImageDraw.Draw(mask).rounded_rectangle(box,radius=H*.20,fill=255)
    mask=mask.filter(ImageFilter.GaussianBlur(.8));mask_a=np.minimum(np.array(mask),np.array(im.getchannel('A')))
    face=im.copy();face.putalpha(Image.fromarray(mask_a))
    # Darken only the original press cavity; moving the face exposes its inset seam,
    # not a second stationary copy of the original face. The gold mounting stays still.
    socket=np.array(im);socket[:,:,:3]=np.rint(socket[:,:,:3]*(1-.58*mask_a[:,:,None]/255)).astype('uint8')
    Image.fromarray(socket).save(OUT/(name+'.webp'),'WEBP',quality=96,method=6,exact=True)
    face.save(OUT/(name+'-face.webp'),'WEBP',quality=96,method=6,exact=True)
    entry={'source':source,'atlasCell':list(b),'trim':list(b),'width':W,'height':H,'transparent':True,'socketMask':list(box)}
    if name in ['button-long','button-gold','button-jade']:entry['alphaCleanup']='primary silhouette + 2px antialias fringe'
    manifest[name]=entry;manifest[name+'-face']={**entry,'faceMask':list(box)}
    print(name,b,im.size)
for old,new in [('button-spin','button-spin-tiger'),('button-spin-red','button-spin-crane')]:
    (OUT/(old+'.webp')).write_bytes((OUT/(new+'.webp')).read_bytes());manifest[old]={**manifest[new],'aliasOf':new}
# A whole sculpted round utility button; the previous atlas cropped its crown.
utility,parts=isolate('utility-festive.png')
assert len(parts)==1, ('Expected one complete circular utility button',parts)
box=parts[0];piece=utility.crop(box);W,H=piece.size
assert .94<W/H<1.06, 'Utility rim must be intact and circular'
small=Image.new('RGBA',(W+8,H+8));small.alpha_composite(piece,(4,4));W,H=small.size
mask=Image.new('L',small.size);press=(.19*W,.19*H,.81*W,.81*H)
ImageDraw.Draw(mask).ellipse(press,fill=255);mask=mask.filter(ImageFilter.GaussianBlur(.8))
alpha=np.minimum(np.array(mask),np.array(small.getchannel('A')))
face=small.copy();face.putalpha(Image.fromarray(alpha))
socket=np.array(small);socket[:,:,:3]=np.rint(socket[:,:,:3]*(1-.58*alpha[:,:,None]/255)).astype('uint8')
Image.fromarray(socket).save(OUT/'button-small.webp','WEBP',quality=96,method=6,exact=True)
face.save(OUT/'button-small-face.webp','WEBP',quality=96,method=6,exact=True)
entry={'source':'utility-festive.png','atlasCell':list(box),'trim':list(box),'width':W,'height':H,'transparent':True,'socketMask':list(press)}
manifest['button-small']=entry;manifest['button-small-face']={**entry,'faceMask':list(press)}
fx=Image.open(SRC/'wealth-effects-v2.png').convert('RGB');W,H=fx.size
for i,name in enumerate(['fx-aureole','fx-glint','fx-reflection','fx-dust']):
    b=(i%2*W//2,i//2*H//2,(i%2+1)*W//2,(i//2+1)*H//2);data=np.array(fx.crop(b)).astype(float)
    alpha=np.maximum(data.max(2)-2,0)/253;out=np.zeros((*alpha.shape,4),dtype='uint8')
    out[:,:,:3]=np.clip(data/np.maximum(alpha[:,:,None],1/255),0,255);out[:,:,3]=np.clip(alpha*255,0,255)
    Image.fromarray(out).save(OUT/(name+'.webp'),'WEBP',quality=95,method=6,exact=True)
    manifest[name]={'source':'wealth-effects-v2.png','atlasCell':list(b),'trim':list(b),'width':W//2,'height':H//2,'transparent':True,'matte':'radiance-alpha'}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
