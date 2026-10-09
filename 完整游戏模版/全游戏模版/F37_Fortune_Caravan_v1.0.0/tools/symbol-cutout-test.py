"""Read-only audit of F37's actual chroma-keyed assets, not legacy F35 recrops.
Usage: python3 tools/symbol-cutout-test.py [REPORT_JSON]
"""
from pathlib import Path
from PIL import Image
import numpy as np
import json,sys,hashlib
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
  rgb=tile[:,:,:3].astype(float); r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
  spill=(g>155)&(g>r*1.75+28)&(g>b*1.65+28)&(tile[:,:,3]>8)
  assert not spill.any(),(name,i,'remaining key green',int(spill.sum()))
  # A portrait must not contain an opaque dark rectangular background.
  if name=='portraits':
   edge=np.concatenate([visible[0],visible[-1],visible[:,0],visible[:,-1]])
   assert not edge.any(),('opaque portrait background',i)
  bounds.append({'cell':i,'transparentGutters':gutters,'visiblePixels':int(visible.sum())})
 results.append({'name':name,'width':im.width,'height':im.height,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'cells':bounds})
inspect('symbols',4,4,30)
inspect('symbols-blur',4,4,12)
inspect('interfaces',4,4,30)
inspect('portraits',4,4,18)
for id in ['caravan-gold','sapphire-oasis','ruby-bazaar','crown-voyage']:inspect('guardian-'+id,minimum=7)
for i in range(16):inspect('caravan-button-'+str(i),minimum=3)
for name in ['caravan-brand','heading-login','heading-shop','heading-rewards','heading-rank','heading-account','award-title-big','award-title-super']:inspect(name,minimum=7)
for i in range(4):inspect('caravan-title-'+str(i),minimum=7)
report={'date':'2026-10-09','test':'Actual RGBA gutters, absence of saturated chroma-key residue, transparent portrait perimeter. This pixel audit supplements, not replaces, final render inspection.','assets':results}
if len(sys.argv)>1:
 output=Path(sys.argv[1]);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(report,indent=2)+'\n')
print('PASS',len(results),'actual PNG assets, 16 isolated reel cells, blur gutters, transparent portraits, clean guardian/button/title crops')
