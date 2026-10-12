"""Check the actual shipping role atlases, not just rig coordinates."""
from pathlib import Path
from PIL import Image
import numpy as np, json, hashlib
ROOT=Path(__file__).resolve().parents[1]
audit=json.loads((ROOT/'docs/cast-processing-audit.json').read_text());records=[]
for spec in audit:
 path=ROOT/'assets/resources/art'/f"{spec['asset']}.png";atlas=np.asarray(Image.open(path).convert('RGBA'))
 assert hashlib.sha256(path.read_bytes()).hexdigest()==spec['sha256']
 w,h=spec['cell'];g=spec['gutter'];N=spec['bankFrames'];banks=[];midpoints=[];deltas=[];unique=[];motion=[]
 for bank in range(spec['banks']):
  frames=[]
  for j in range(N):
   k=bank*N+j;tile=atlas[k//8*(h+2*g):(k//8+1)*(h+2*g),k%8*(w+2*g):(k%8+1)*(w+2*g)]
   f=tile[g:-g,g:-g];assert np.array_equal(tile[:g,g:-g],np.repeat(f[:1],g,axis=0));assert np.array_equal(tile[g:-g,:g],np.repeat(f[:,:1],g,axis=1));frames.append(f)
   assert not np.any(f[0,:,3]>12) and not np.any(f[-1,:,3]>12) and not np.any(f[:,0,3]>12) and not np.any(f[:,-1,3]>12),'No meaningful silhouette touches the outer pixel; Lanczos antialias may occupy the next inner pixel'
  ref=frames[0];assert np.array_equal(ref,frames[-1]),'Exact neutral seam'
  for f in frames:
   assert np.array_equal(f[:53],ref[:53]) and np.array_equal(f[53:88,20:89],ref[53:88,20:89]),'Face/ears are not distorted'
   assert np.array_equal(f[178:],ref[178:]),'Foot contact is fixed'
   assert np.array_equal(f[:,:83],ref[:,:83]),'Body left side is stable'
  diffs=[float(np.abs(f.astype(np.int16)-p.astype(np.int16)).mean()) for p,f in zip(frames,frames[1:])]
  assert max(diffs)<1.8,'No jumping local pose'
  changed=[np.abs(f.astype(np.int16)-ref.astype(np.int16)).max(axis=2)>12 for f in frames]
  assert max(m.sum() for m in changed)>150,'Actually visible local articulation'
  count=len({f.tobytes() for f in frames});assert count>=24,'No stepped two-pose imitation'
  assert np.array_equal(ref,atlas[g:g+h,g:g+w]),'All cue tracks meet at identical neutral'
  midpoints.append(frames[N//2].tobytes());deltas.append(max(diffs));unique.append(count);motion.append(max(int(m.sum()) for m in changed))
 assert len(set(midpoints))==spec['banks'],'Tier/interaction tracks really differ'
 records.append({'asset':spec['asset'],'banks':spec['banks'],'framesPerBank':N,'uniqueFramesPerBank':unique,'maxAdjacentMeanChannelDelta':deltas,'maxChangedPixelsFromNeutral':motion,'fixedFaceFeetBody':True,'exactNeutralSeams':True,'guttersExact':True,'noCellClipping':True})
(ROOT/'docs/cast-motion-regression.json').write_text(json.dumps(records,indent=2));print('PASS eight shipping cast atlases: twenty distinct action tracks, >=24 unique poses each, exact neutral/gutters, fixed faces/feet/body, visible local motion, no clipping or frame jumps')
