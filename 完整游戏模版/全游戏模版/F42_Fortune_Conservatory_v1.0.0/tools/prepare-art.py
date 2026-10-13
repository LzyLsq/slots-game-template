"""Deterministic atlas extraction; preserve native alpha and edge-connected matte removal."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np,json,collections
ROOT=Path(__file__).resolve().parents[1];SRC=ROOT/'art-source';OUT=ROOT/'assets/art';OUT.mkdir(exist_ok=True,parents=True)
manifest={}
def flood(mask,seeds):
 h,w=mask.shape; seen=np.zeros((h,w),bool);q=collections.deque()
 for x,y in seeds:
  if 0<=x<w and 0<=y<h and mask[y,x] and not seen[y,x]:seen[y,x]=True;q.append((x,y))
 while q:
  x,y=q.popleft()
  for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
   xx,yy=x+dx,y+dy
   if 0<=xx<w and 0<=yy<h and mask[yy,xx] and not seen[yy,xx]:seen[yy,xx]=True;q.append((xx,yy))
 return seen

def export(name,source,box=None,white=False,controls=False,pad=8,clean=False,edge_white=False):
 im=Image.open(SRC/source).convert('RGBA');im=im.crop(box) if box else im
 a=np.array(im);rgb=a[:,:,:3].astype(float)
 if white:
  neutral=(rgb.min(2)>225)&((rgb.max(2)-rgb.min(2))<18)
  # White mattes, including intentional blank stage opening, are not art.
  alpha=np.minimum(a[:,:,3],np.clip((255-rgb.min(2))*12,0,255));alpha[neutral]=0;a[:,:,3]=alpha.astype('uint8')
 else:
  a[:,:,3]=np.clip((a[:,:,3].astype(float)-6)*255/246,0,255).astype('uint8')
 if edge_white:
  neutral=(rgb.min(2)>244)&((rgb.max(2)-rgb.min(2))<10)
  h,w=neutral.shape
  seeds=[(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)]
  background=flood(neutral,seeds)
  # Coin aperture in this approved original, distinct from ivory body highlights.
  if name=='tortoise':background|=flood(neutral,[(1000,225)])
  a[background,3]=0
  # Remove matte fringe only immediately adjacent to the cutout edge.
  edge=np.zeros_like(background)
  for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:edge|=np.roll(np.roll(background,dy,0),dx,1)
  partial=edge&~background&(rgb.min(2)>180)&((rgb.max(2)-rgb.min(2))<24)
  a[partial,3]=np.minimum(a[partial,3],np.clip((255-rgb[partial].min(1))*8,0,255)).astype('uint8')
 if controls:
  neutral=(rgb.min(2)>90)&((rgb.max(2)-rgb.min(2))<24)
  mask=neutral|(a[:,:,3]==0);h,w=mask.shape
  seeds=[(x,y) for x in range(w) for y in (0,h-1)]+[(x,y) for y in range(h) for x in (0,w-1)]
  a[flood(mask,seeds),3]=0
 if clean:
  mask=a[:,:,3]>24;h,w=mask.shape;seen=np.zeros((h,w),bool);largest=[]
  for yy,xx in zip(*np.where(mask)):
   if seen[yy,xx]:continue
   q=collections.deque([(xx,yy)]);seen[yy,xx]=True;part=[]
   while q:
    x,y=q.popleft();part.append((x,y))
    for dx in (-1,0,1):
     for dy in (-1,0,1):
      nx,ny=x+dx,y+dy
      if 0<=nx<w and 0<=ny<h and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
   if len(part)>len(largest):largest=part
  keep=np.zeros((h,w),bool)
  for x,y in largest:keep[max(0,y-1):min(h,y+2),max(0,x-1):min(w,x+2)]=True
  a[~keep,3]=0
 # Native transparent RGB must not remain as black fringe.
 a[a[:,:,3]==0,:3]=0;im=Image.fromarray(a)
 bbox=im.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox()
 if not bbox:raise ValueError(name)
 if name.endswith('cabinet') or name=='lobby':bbox=(0,0,im.width,im.height);pad=0
 im=im.crop(bbox);canvas=Image.new('RGBA',(im.width+pad*2,im.height+pad*2));canvas.paste(im,(pad,pad))
 canvas.save(OUT/(name+'.webp'),'WEBP',quality=94,method=6,exact=True)
 manifest[name]={'source':source,'atlasCell':box,'trim':bbox,'width':canvas.width,'height':canvas.height,'transparent':canvas.getchannel('A').getextrema()[0]==0}
 return canvas
export('lobby','lobby.png')
# Protected outpainting; the cabinet/mascot native pixels stay intact.
import runpy
prepare_scene=runpy.run_path(str(ROOT/'tools/prepare-scenes.py'))['prepare_scene']
for n in ['tiger','koi','crane','tortoise']:
 manifest[n+'-cabinet']=prepare_scene(n,SRC,OUT)
for i,n in enumerate(['coin','ingot','emerald','ruby','pearl','chest','lotus','wild','lantern','crown','bell','fan']):
 x=i%4*362;row=i//4;y,y2=[(0,344),(344,695),(695,1086)][row];
 if n=='lantern':y=689
 if n=='pearl':y2=690
 export(n,'symbols.png',(x,y,x+362,y2),clean=True)
# Complete matched festive cast. Clean native alpha without deleting white fur.
# Erode just 1px to break atlas fringe noise, keep the largest body component,
# then restore its contour using the original alpha. No separate artificial limbs.
from PIL import ImageFilter
atlas=Image.open(SRC/'guardians-festive.png').convert('RGBA')
assert atlas.size==(1254,1254)
heads={'tiger':(173,0,510,269),'koi':(114,0,395,297),'crane':(280,4,492,185),'tortoise':(245,3,494,261)}
for i,n in enumerate(['tiger','koi','crane','tortoise']):
 x=i%2*627;y=i//2*627;cell=atlas.crop((x,y,x+627,y+627));a=np.array(cell)
 core=np.array(cell.getchannel('A').point(lambda v:255 if v>190 else 0).filter(ImageFilter.MinFilter(3)))>0
 largest=None;seen=np.zeros_like(core)
 for yy,xx in zip(*np.where(core)):
  if seen[yy,xx]:continue
  component=flood(core&~seen,[(xx,yy)]);seen|=component
  if largest is None or component.sum()>largest.sum():largest=component
 keep=np.array(Image.fromarray((largest*255).astype('uint8')).filter(ImageFilter.MaxFilter(5)))>0
 a[~keep,3]=0;a[:,:,3]=np.clip((a[:,:,3].astype(float)-10)*255/240,0,255).astype('uint8');a[a[:,:,3]==0,:3]=0
 clean=Image.fromarray(a)
 for key,box,pad in [(n,None,24),('portrait-'+n,heads[n],14)]:
  im=clean.crop(box)if box else clean;bounds=im.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox();im=im.crop(bounds)
  canvas=Image.new('RGBA',(im.width+2*pad,im.height+2*pad));canvas.paste(im,(pad,pad));canvas.save(OUT/(key+'.webp'),'WEBP',quality=96,method=6,exact=True)
  manifest[key]={'source':'guardians-festive.png','atlasCell':[x,y,x+627,y+627],'headCrop':box,'trim':list(bounds),'width':canvas.width,'height':canvas.height,'transparent':True,'matte':'native-alpha, largest eroded-connected body, original edge restored'}
export('title-tortoise','tortoise-title.png',white=True)
for n,(y0,y1) in zip(['tiger','koi','crane','tortoise'],[(130,290),(450,620),(785,949),(1105,1252)]):
 export('nameplate-'+n,'cabinet-nameplates.png',(0,y0,1145,y1),white=True,pad=1)
# Wallet/amount plaque is a separate authored metal recess, not a button.
export('plaque','controls.png',(374,854,1226,1283),controls=True,pad=4)
for i,n in enumerate(['brand','tiger','koi','crane','big','super','mega','club','ledger']):
 x=i%3*512;y=i//3*1024//3;y2=(i//3+1)*1024//3;export('title-'+n,'titles.png',(x,y,x+512,y2),white=True)
for i,n in enumerate(['shop','daily','rank','profile','rules','settings']):
 x=i%3*512;y=i//3*512;export('title-'+n,'page-titles.png',(x,y,x+512,y+512),white=True)
export('award-stage','award-stage.png',white=True)
icon=Image.new('RGB',(512,512),'#e8d8ad');im=Image.open(OUT/'portrait-tiger.webp');im.thumbnail((380,380));icon.paste(im,((512-im.width)//2,(512-im.height)//2),im);icon.save(OUT/'app-icon.png')
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Extracted',len(manifest),'assets')

# Rebuild the authored local animation overlays after the scene rasters.
import runpy
runpy.run_path(str(ROOT/'tools/prepare-guardian-rig.py'))

# Selected refined mechanical controls supersede the early flat controls.
runpy.run_path(str(ROOT/'tools/prepare-controls.py'))

# Sculpted red-gold / jade panel materials and native audio-slider controls.
runpy.run_path(str(ROOT/'tools/prepare-festive-ui.py'))
