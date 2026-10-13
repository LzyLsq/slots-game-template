"""Native-pixel measurements of the selected festive cabinet plates.
Never derive slot geometry from the resampled wide environmental continuation.
"""
from pathlib import Path
from PIL import Image
import json
R=Path(__file__).resolve().parents[1]
rigs=json.loads((R/'art-source/guardian-rig.json').read_text())
spec={
 'tiger':{'screen':[182,478,838,864],'title':[278,344,444,43],'deck':[151,974,719,156]},
 'koi':{'screen':[181,440,828,820],'title':[336,316,341,43],'deck':[154,916,710,137]},
 'crane':{'screen':[164,411,856,786],'title':[345,252,329,43],'deck':[136,895,748,135]},
 'tortoise':{'screen':[185,492,826,861],'title':[282,365,448,47],'deck':[167,975,692,150]}
}
out={}
for name,s in spec.items():
 source=f'{name}-festive-mobile.png';w,h=Image.open(R/'art-source'/source).size
 assert (w,h)==(1024,1536)
 def pct(v,dim):return f'{100*v/dim:.5f}%'
 x,y,x2,y2=s['screen'];layout={'ratio':f'{w} / {h}','reel-x':pct(x,w),'reel-y':pct(y,h),'reel-w':pct(x2-x,w),'reel-h':pct(y2-y,h),'feature-y':pct(y2,h)}
 for section in ['title','deck']:
  for key,value,dimension in zip(['x','y','w','h'],s[section],[w,h,w,h]):layout[section+'-'+key]=pct(value,dimension)
 rig=rigs[name]
 out[name+'-cabinet']={'ratio':w/h,'width':w,'height':h,'scene':{'width':3072,'height':2560,'cabinet':[0,256,w,h]},'screenPixels':s['screen'],'measurementSource':source,'guardian':{'patch':[640,0,384,370],'pivot':rig['pivot'],'wrist':rig['wrist'],'rootLock':12,'wristBlend':25},'layout':layout}
(R/'assets/art/geometry.json').write_text(json.dumps(out,indent=2))
print('Saved selected festive native-pixel geometry')
