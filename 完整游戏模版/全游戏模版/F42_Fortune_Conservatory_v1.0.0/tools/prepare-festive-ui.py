"""Selected carved UI atlas: edge-connected white removal, no drawn stand-ins.
All frames use nine-slicing in CSS so the authored carvings never stretch.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,json,collections
R=Path(__file__).resolve().parents[1];S=R/'art-source';O=R/'assets/art'
manifest=json.loads((O/'manifest.json').read_text())
def extract(name,source,box,matte=True,pad=2):
 im=Image.open(S/source).convert('RGBA').crop(box);a=np.array(im)
 if matte:
  rgb=a[:,:,:3].astype(float);m=(rgb.min(2)>243)&((rgb.max(2)-rgb.min(2))<12)
  h,w=m.shape;seen=np.zeros_like(m);q=collections.deque()
  for x,y in [(x,y)for x in range(w)for y in (0,h-1)]+[(x,y)for y in range(h)for x in (0,w-1)]:
   if m[y,x] and not seen[y,x]:seen[y,x]=True;q.append((x,y))
  while q:
   x,y=q.popleft()
   for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
    nx,ny=x+dx,y+dy
    if 0<=nx<w and 0<=ny<h and m[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((nx,ny))
  a[seen,3]=0
  # Preserve ivory fur/feathers. Only edge-connected background is removed.
  neighbours=np.zeros_like(seen)
  for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):neighbours|=np.roll(np.roll(seen,dy,0),dx,1)
  fringe=neighbours&~seen&(rgb.min(2)>218)&((rgb.max(2)-rgb.min(2))<18)
  a[fringe,3]=np.minimum(a[fringe,3],np.clip((255-rgb[fringe].min(1))*7,0,255)).astype('uint8')
 a[a[:,:,3]==0,:3]=0;im=Image.fromarray(a)
 bounds=im.getchannel('A').point(lambda n:255 if n>24 else 0).getbbox();im=im.crop(bounds)
 canvas=Image.new('RGBA',(im.width+2*pad,im.height+2*pad));canvas.paste(im,(pad,pad));canvas.save(O/(name+'.webp'),'WEBP',quality=96,method=6,exact=True)
 manifest[name]={'source':source,'atlasCell':list(box),'trim':list(bounds),'width':canvas.width,'height':canvas.height,'transparent':matte,'matte':'edge-connected-white'if matte else None}
 return canvas
for name,box in {'panel-frame':(0,0,512,512),'panel-row':(512,0,1024,512),'panel-note':(1024,0,1536,512),'panel-input':(512,512,1024,1024),'slider-track':(1024,630,1536,742),'slider-knob':(1180,744,1390,880)}.items():extract(name,'panels-festive.png',box)
extract('silk','panels-festive.png',(48,548,460,960),False,0)
(O/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('Prepared seven native carved material assets.')
