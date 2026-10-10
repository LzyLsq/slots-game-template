"""Keep measured upper artwork unchanged; install the commissioned lower cabinet.
The outside room and outpaint remain the same continuous perspective. No redraw.
"""
from pathlib import Path
from PIL import Image
import numpy as np, json, hashlib
ROOT=Path(__file__).resolve().parents[2]
ART=ROOT/'assets/resources/art'
SRC=Path(__file__).resolve().parent
bounds={'sun-lion':1008,'emerald-elephant':1080,'lotus-koi':990,'moon-fox':1090}
report=[]
for mode,y0 in bounds.items():
 base=SRC/(mode+'-source-environment.png');extended=SRC/(mode+'-source-extended.png')
 if not base.exists():base.write_bytes((ART/(mode+'-environment.png')).read_bytes())
 if not extended.exists():extended.write_bytes((ART/(mode+'-extended.png')).read_bytes())
 old=Image.open(base).convert('RGB');new=Image.open(SRC/(mode+'-integrated.png')).convert('RGB')
 assert old.size==new.size==(1024,1536)
 # Translate the intact lower fox fascia; never squash the character.
 offset=40 if mode=='moon-fox' else 0
 if offset:
  shifted=old.copy();shifted.paste(new.crop((108,1050,916,1396)),(108,1090));new=shifted
 yy,xx=np.mgrid[0:1536,0:1024]
 alpha=np.minimum(np.clip((yy-y0)/12,0,1),np.clip((1436-yy)/30,0,1))
 alpha*=np.minimum(np.clip((xx-108)/30,0,1),np.clip((916-xx)/30,0,1))
 a=alpha[:,:,None]
 merged=Image.fromarray(np.rint(np.asarray(old)*(1-a)+np.asarray(new)*a).astype('uint8'))
 # Exact unchanged pixels protect title, screen, register and button geometry.
 assert np.array_equal(np.asarray(old)[:y0],np.asarray(merged)[:y0])
 merged.save(ART/(mode+'-environment.png'))
 room=Image.open(extended).convert('RGB');assert room.size==(1024,2048)
 room.paste(merged,(0,256));room.save(ART/(mode+'-extended.png'))
 report.append({'mode':mode,'originalUnchangedAboveRow':y0,'installedRegion':[108,y0,916,1436],'extendedOffsetY':256,'lowerFasciaTranslationY':offset,'sha256':hashlib.sha256((ART/(mode+'-extended.png')).read_bytes()).hexdigest()})
(SRC/'integration-manifest.json').write_text(json.dumps(report,indent=2)+'\n')
print('Installed four integrated guardians; upper geometry and room extension preserved.')
