from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
P=Path(__file__).resolve().parents[1];rows=json.loads((P/'docs/blink-processing-audit.json').read_text());results=[]
arts=['hero-otter-ferry','hero-pearl-garden','hero-ember-foundry','hero-celestial-vault'];names=['otter','rabbit','fox','dragon']
assert len(rows)==12
for r in rows:
 path=P/'assets/resources/art'/f"{r['art']}.png";atlas=np.array(Image.open(path).convert('RGBA'));x,y,w,h=r['rect'];frames=[]
 assert atlas.shape[:2]==((h+4)*4,(w+4)*5)
 if r['scene']=='hall':original=np.array(Image.open(P/'assets/resources/art'/f"{arts[r['mode']]}.png").convert('RGBA'))
 else:original=np.array(Image.open(P/'assets/resources/art'/f"{r['scene']}-{names[r['mode']]}-roles-motion.png").convert('RGBA'))[2:202,2:162]
 base=original[y:y+h,x:x+w];eye=np.zeros((h,w),bool)
 for l,t,rt,b in r['eyes']:eye[t-y:b-y,l-x:rt-x]=True
 for i in range(20):
  px=i%5*(w+4);py=i//5*(h+4);frame=atlas[py+2:py+2+h,px+2:px+2+w];frames.append(frame)
  assert np.array_equal(atlas[py:py+h+4,px:px+w+4],np.pad(frame,((2,2),(2,2),(0,0)),mode='edge')),'sample gutter'
  assert np.array_equal(frame[~eye],base[~eye]),'nose/brow/fur outside two eyes changed'
  assert np.array_equal(frame[:,:,3],base[:,:,3]),'alpha/crop registration changed'
 assert np.array_equal(frames[0],base) and np.array_equal(frames[-1],base),'neutral scene differs'
 assert len(set(f.tobytes() for f in frames))>=15,'not just two blinking stickers'
 assert np.max(np.abs(frames[9].astype(int)-base.astype(int)))>40,'eyelids not visible'
 delta=max(float(np.abs(a.astype(float)-b.astype(float)).mean()) for a,b in zip(frames,frames[1:]));assert delta<13,(r['art'],delta)
 assert hashlib.sha256(path.read_bytes()).hexdigest()==r['sha256']
 results.append({'art':r['art'],'uniqueFrames':len(set(f.tobytes() for f in frames)),'maxAdjacentMeanDelta':delta,'exactAlphaNeutralAndOutsideEyes':True})
(P/'docs/blink-motion-regression.json').write_text(json.dumps(results,indent=2))
print('PASS twelve shipping eye atlases: only generated eyelids, exact alpha/neutral/nose/brows/scene, 15+ unique samples each, sample gutters and bounded intermediate changes')
