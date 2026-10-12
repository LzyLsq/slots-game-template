"""Read-only audit of F38's native-alpha assets, not RGB-keyed legacy recrops.
Usage: python3 tools/symbol-cutout-test.py [REPORT_JSON]
"""
from pathlib import Path
from PIL import Image
import numpy as np
import json,sys,hashlib
from datetime import date
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/resources/art'
results=[]
def inspect(name,cols=1,rows=1,minimum=2):
 path=ART/(name+'.png'); im=Image.open(path).convert('RGBA'); a=np.asarray(im)
 assert im.width%cols==0 and im.height%rows==0,name
 w,h=im.width//cols,im.height//rows
 bounds=[]
 for i in range(cols*rows):
  tile=a[(i//cols)*h:(i//cols+1)*h,(i%cols)*w:(i%cols+1)*w]
  visible=tile[:,:,3]>8; ys,xs=np.where(visible);assert len(xs)>40,(name,i,'empty artwork')
  gutters=[int(xs.min()),int(ys.min()),int(w-1-xs.max()),int(h-1-ys.max())]
  assert min(gutters)>=minimum,(name,i,'art touches crop edge',gutters)
  # Emerald symbols intentionally contain saturated green. Assets have native
  # alpha, so RGB chroma-key tests would destroy the jewel rather than detect
  # background residue. Verify real alpha coverage/perimeters instead.
  assert float(visible.mean())<.94,(name,i,'opaque rectangular backdrop')
  assert np.all(tile[:minimum,:,3]<=8) and np.all(tile[-minimum:,:,3]<=8)
  assert np.all(tile[:,:minimum,3]<=8) and np.all(tile[:,-minimum:,3]<=8)
  # A portrait must not contain an opaque dark rectangular background.
  if name=='portraits':
   edge=np.concatenate([visible[0],visible[-1],visible[:,0],visible[:,-1]])
   assert not edge.any(),('opaque portrait background',i)
  if name.startswith(('heading-','award-title-','gala-title-')) or name=='gala-brand':
   # A title is a single authored connected relief, not fragments from a
   # neighboring row. This caught actual screenshot artifacts in the first atlas.
   seen=np.zeros(visible.shape,dtype=bool);components=[]
   for yy,xx in zip(*np.where(visible)):
    if seen[yy,xx]:continue
    seen[yy,xx]=True;stack=[(int(yy),int(xx))];pixels=0
    while stack:
     cy,cx=stack.pop();pixels+=1
     for ny,nx in ((cy-1,cx),(cy+1,cx),(cy,cx-1),(cy,cx+1)):
      if 0<=ny<h and 0<=nx<w and visible[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;stack.append((ny,nx))
    components.append(pixels)
   assert sum(n>80 for n in components)==1,(name,'neighboring-title spill',components)
  bounds.append({'cell':i,'transparentGutters':gutters,'visiblePixels':int(visible.sum())})
 results.append({'name':name,'width':im.width,'height':im.height,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'cells':bounds})
inspect('symbols',4,4,30)
inspect('symbols-blur',4,4,12)
inspect('interfaces',4,4,30)
inspect('portraits',4,4,18)
for id in ['crown-club','emerald-fortune','ruby-royale','vault-reserve']:inspect('guardian-'+id,minimum=7)
for i in range(16):inspect('gala-button-'+str(i),minimum=3)
for name in ['gala-brand','heading-login','heading-shop','heading-rewards','heading-rank','heading-account','award-title-big','award-title-super','award-title-mega','award-title-epic','heading-collection','heading-rules']:inspect(name,minimum=7)
for i in range(4):inspect('gala-title-'+str(i),minimum=7)
# Regression: decorative win rims may not mask the symbol or its central glyph.
for i in range(4):
 im=np.asarray(Image.open(ART/f'win-frame-{i}.png').convert('RGBA'));h,w=im.shape[:2]
 centre=im[round(h*.24):round(h*.76),round(w*.14):round(w*.86),3]
 assert np.max(centre)<=8,('opaque awarded-symbol overlay',i)
 results.append({'name':f'win-frame-{i}','transparentCentre':True,'width':w,'height':h})
report={'date':date.today().isoformat(),'test':'Actual native-alpha gutters, no opaque rectangular backdrop, transparent portrait perimeter. Emerald green preserved by design. This pixel audit supplements, not replaces, final render inspection.','assets':results}
if len(sys.argv)>1:
 output=Path(sys.argv[1]);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n')
print('PASS',len(results),'actual PNG assets, 16 isolated reel cells, blur gutters, transparent portraits, clean guardian/button/title crops')
