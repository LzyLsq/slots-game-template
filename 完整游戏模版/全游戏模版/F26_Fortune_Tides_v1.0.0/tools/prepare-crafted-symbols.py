"""Crop approved 4x2 artwork; remove neutral atlas backing, retain alpha padding."""
from PIL import Image, ImageFilter
from pathlib import Path
from collections import deque
import json
root=Path(__file__).resolve().parents[1]
crops={}
for mode in ['mint','pearl','reef','beacon']:
 atlas=Image.open(root/f'output/imagegen/{mode}-symbols29.png').convert('RGB')
 crops[mode]=[]
 for i in range(8):
  x,y=i%4,i//4
  tile=atlas.crop((round(x*atlas.width/4),round(y*atlas.height/2),round((x+1)*atlas.width/4),round((y+1)*atlas.height/2)))
  w,h=tile.size;px=list(tile.getdata());seen=bytearray(w*h);bg=bytearray(w*h)
  candidates=bytearray(1 if max(p)-min(p)<=9 and 219<=min(p) and max(p)<=249 else 0 for p in px)
  for start in range(w*h):
   if seen[start] or not candidates[start]:continue
   seen[start]=1;q=deque([start]);component=[];edge=False
   while q:
    k=q.popleft();component.append(k);xx,yy=k%w,k//w
    edge|=xx==0 or yy==0 or xx==w-1 or yy==h-1
    for n in (k-1 if xx else -1,k+1 if xx<w-1 else -1,k-w if yy else -1,k+w if yy<h-1 else -1):
     if n>=0 and not seen[n] and candidates[n]:seen[n]=1;q.append(n)
   # Include large interior holes (wheel spokes / necklace), never tiny highlights.
   if edge or len(component)>180:
    for k in component:bg[k]=1
  alpha=Image.new('L',(w,h));alpha.putdata([0 if v else 255 for v in bg]);alpha=alpha.filter(ImageFilter.GaussianBlur(.35))
  tile=tile.convert('RGBA');tile.putalpha(alpha)
  bbox=alpha.point(lambda v:255 if v>127 else 0).getbbox()
  if not bbox:raise ValueError(mode)
  tile=tile.crop(bbox);out=Image.new('RGBA',(tile.width+12,tile.height+12));out.paste(tile,(6,6))
  out.save(root/f'public/art/symbols/{mode}/{i}-crafted29.png')
  crops[mode].append([6,6,tile.width,tile.height])
(root/'src/symbol-crops.js').write_text('// Crops for refined transparent symbols, with six-pixel safety padding.\nexport const modeSymbolCrops = '+json.dumps(crops)+';\n')
# Contact sheet on darker material reveals opaque backing or contaminated edges.
contact=Image.new('RGB',(1024,1024),'#30464e')
for row,mode in enumerate(crops):
 for i in range(8):
  s=Image.open(root/f'public/art/symbols/{mode}/{i}-crafted29.png');s.thumbnail((116,208))
  contact.paste(s,(i*128+(128-s.width)//2,row*256+(256-s.height)//2),s)
contact.save(root/'output/imagegen/symbols29-contact.png')
