from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
if not (ROOT/'assets').exists(): ROOT=Path('/Users/mengjunzhu/Desktop/slots/slots-game-template/完整游戏模版/全游戏模版/F34_Aurum_Atelier_v1.0.0')
source=Image.open(ROOT/'assets/resources/art/interfaces.png').convert('RGBA')
a=source.getchannel('A'); w,h=source.size; px=a.load(); seen=bytearray(w*h); groups=[[] for _ in range(16)]
for y in range(h):
 for x in range(w):
  start=y*w+x
  if seen[start] or px[x,y]<8: continue
  seen[start]=1; queue=deque([start]); points=[]
  while queue:
   at=queue.popleft(); points.append(at); cy,cx=divmod(at,w)
   for nx,ny in ((cx-1,cy),(cx+1,cy),(cx,cy-1),(cx,cy+1)):
    if 0<=nx<w and 0<=ny<h:
     k=ny*w+nx
     if not seen[k] and px[nx,ny]>=8: seen[k]=1;queue.append(k)
  if len(points)<20: continue
  xs=[n%w for n in points];ys=[n//w for n in points]
  col=min(3,int((min(xs)+max(xs))/2/256));row=min(3,int((min(ys)+max(ys))/2/256))
  groups[row*4+col].extend(points)
for i,points in enumerate(groups):
 mask=Image.new('L',(w,h)); mp=mask.load()
 for n in points: mp[n%w,n//w]=255
 # The component mask selects original paint rather than redrawing the icon.
 # Include the antialiased fringe but keep disconnected neighbouring artwork out.
 from PIL import ImageFilter, ImageChops
 mask=mask.filter(ImageFilter.MaxFilter(5));mask=ImageChops.multiply(mask,a)
 bounds=mask.getbbox(); art=source.copy(); art.putalpha(mask); crop=art.crop(bounds)
 output=Image.new('RGBA',(crop.width+24,crop.height+24));output.paste(crop,(12,12))
 output.save(ROOT/f'assets/resources/art/interface-{i}.png')
 print(i,bounds,output.size)
