"""Validate shipping two-joint greetings, registration, source texture and timing."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import map_coordinates
import numpy as np, json, re, importlib.util, sys
sys.dont_write_bytecode = True
ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('hall_arm',ROOT/'tools/process-hall-waves.py')
motion=importlib.util.module_from_spec(spec);spec.loader.exec_module(motion)
rows=json.loads((ROOT/'docs/hall-wave-processing-audit.json').read_text())
provenance={r['asset']:r for r in json.loads((ROOT/'docs/ART_PROVENANCE.json').read_text())['assets']}
config=(ROOT/'assets/scripts/ui/HallKeeperArt.ts').read_text()
assert len(rows)==4 and [r['animal'] for r in rows]==motion.ANIMALS
assert 'width: 224, height: 224' in config and 'frames: 64' in config
patches=json.loads(re.search(r'= (\[\[.*?\]\]);',config).group(1));assert patches==[r['rect'] for r in rows]
results=[]
for mode,r in enumerate(rows):
 animal,scene=r['animal'],r['art'];x,y,w,h=r['rect'];rig=r['rig']
 path=ROOT/'assets/resources/art'/f"{r['atlas']}.png";source=ROOT/'assets/resources/art'/f'{scene}.png'
 s=np.array(Image.open(source).convert('RGBA'));atlas=np.array(Image.open(path).convert('RGBA'));ref=s[y:y+h,x:x+w]
 assert motion.sha(path)==r['sha256'] and motion.sha(source)==r['sceneSha256']==rig['sourceHash']
 assert atlas.shape==((h+4)*8,(w+4)*8,4) and np.all(atlas[:,:,3]==255)
 frames=[]
 for i in range(64):
  tile=atlas[i//8*(h+4):(i//8+1)*(h+4),i%8*(w+4):(i%8+1)*(w+4)];f=tile[2:-2,2:-2];frames.append(f)
  assert np.array_equal(tile,np.pad(f,((2,2),(2,2),(0,0)),mode='edge')),'Exact sampling gutters'
  for a,b in ((f[:3],ref[:3]),(f[-3:],ref[-3:]),(f[:,:3],ref[:,:3]),(f[:,-3:],ref[:,-3:])):
   assert np.array_equal(a,b),'A rectangular patch boundary changed'
 assert np.array_equal(frames[0],ref) and np.array_equal(frames[-1],ref),'Exact neutral seam'
 support=np.zeros((h,w),bool)
 for row,left,right in r['supportRLE']:support[row,left:right]=True
 mask=Image.new('L',(w,h));d=ImageDraw.Draw(mask)
 for contour in (rig['contour'],rig['sleeveContour']):d.polygon([(a-x,b-y) for a,b in contour],fill=255)
 allowed=np.asarray(mask.filter(ImageFilter.MaxFilter(37)))>0
 changed=np.max(np.abs(np.array(frames).astype('int16')-ref.astype('int16')),axis=(0,3))>0
 assert not np.any(changed & ~allowed),'A second/ghost arm reached face, ingot or remote scene'
 assert all(np.array_equal(f[~support],ref[~support]) for f in frames),'Non-limb scene pixels altered'
 assert 800<int(changed.sum())<w*h*.25,'Visible local arm/sleeve, not inflated whole character'
 assert len({f.tobytes() for f in frames})>=60
 delta=max(float(np.abs(a.astype('int16')-b.astype('int16')).mean()) for a,b in zip(frames,frames[1:]))
 assert delta<.65 and abs(delta-r['maxAdjacentMeanDelta'])<1e-6
 assert max(float(np.abs(np.array(a)-np.array(b)).max()) for a,b in zip(r['angles'],r['angles'][1:]))<1.2
 wrist=np.array(rig['wrist'],float);axis=motion.axis_for(rig);root=np.array(rig['shoulder'],float)
 contours=np.array(rig['contour'],float);distal=contours[(contours-wrist)@axis>=rig['wristBlend']]
 assert len(distal)>=5
 before=np.linalg.norm(distal[:,None,:]-distal[None,:,:],axis=-1)
 min_jac=1.;max_residual=0.;forearm_travel=0.
 for i,angles in enumerate(r['angles']):
  assert np.max(np.abs(np.array(angles)-motion.angles_at(rig,i/63)))<1e-9
  ax,ay=motion.forward(root[0],root[1],rig,angles)
  assert np.linalg.norm(np.array([ax,ay])-root)<1e-9,'Shoulder attachment must not slide'
  fx,fy=motion.forward(distal[:,0],distal[:,1],rig,angles);pts=np.stack((fx,fy),axis=-1)
  assert np.max(np.abs(np.linalg.norm(pts[:,None,:]-pts[None,:,:],axis=-1)-before))<1e-9,'Digit shape melted'
  wx,wy=motion.forward(wrist[0],wrist[1],rig,angles);forearm_travel=max(forearm_travel,float(np.hypot(wx-wrist[0],wy-wrist[1])))
  m=motion.geometry_metrics(rig,angles);min_jac=min(min_jac,m['minimumJacobian']);max_residual=max(max_residual,m['maxInverseResidualPixels'])
  assert m['minimumJacobian']>.28,'Arm folded or reversed its surface'
  assert m['maxInverseResidualPixels']<.001,'Unconverged inverse produced a limb ghost'
 assert forearm_travel>3,'Wrist-only swivel left the forearm motionless'
 # Root initiates the greeting before the wrist, which follows after a small lag.
 delay=rig['phaseLag'];assert motion.angles_at(rig,delay*.9)[0]>0 and motion.angles_at(rig,delay*.9)[1]==0
 eps=1e-5
 for t in (0,1):
  center=np.array(motion.angles_at(rig,t));near=np.array(motion.angles_at(rig,eps if t==0 else 1-eps))
  assert np.max(np.abs(near-center))/eps<.001,'Abrupt start/return velocity'
 neutral_crossings=[]
 for n in range(1,6):
  t=delay+(1-delay)*n/(2*rig['waveCycles'])
  if .2<t<.8:
   v=(motion.angles_at(rig,t+eps)[1]-motion.angles_at(rig,t-eps)[1])/(2*eps)
   assert abs(v)>3,'Mechanical stop at every neutral crossing'
   neutral_crossings.append({'t':t,'angularVelocityDegreesPerNormalizedTime':v})
 assert neutral_crossings
 # Compare rigid interior palm/finger pixels in actual shipping frames.
 alpha=motion.skin_matte(rig,1);yy,xx=np.mgrid[:h,:w];gx,gy=xx+x,yy+y
 hand=Image.new('L',(w,h));ImageDraw.Draw(hand).polygon([(a-x,b-y) for a,b in rig['contour']],fill=255)
 inside=(np.asarray(hand)>0)&(alpha>.999)&(motion.weight_for(gx,gy,rig)>.999)&(motion.root_weight_for(gx,gy,rig)>.999)
 inner=np.asarray(Image.fromarray((inside*255).astype('uint8')).filter(ImageFilter.MinFilter(3)))>0
 px,py=gx[inner],gy[inner];assert len(px)>80;errors=[]
 for i in (16,26,36,48):
  fx,fy=motion.forward(px,py,rig,r['angles'][i])
  observed=np.stack([map_coordinates(frames[i][:,:,c].astype(float),[fy-y,fx-x],order=1,mode='nearest') for c in range(3)],-1)
  errors.extend(np.abs(observed-ref[inner,:3].astype(float)).flatten())
 texture_p95=float(np.percentile(errors,95));assert texture_p95<13,(animal,'Source texture replaced/blurred',texture_p95)
 meta=provenance[f"{r['atlas']}.png"]
 assert 'generated_pose_sources' not in meta and 'generated_arm_source' not in meta,'Retired incompatible pose source is still advertised'
 assert meta['sha256']==r['sha256'] and meta['generated_clean_plate_source']['source_sha256']==r['cleanPlateSha256']
 cp=meta['generated_clean_plate_source'];assert re.fullmatch(r'[0-9a-f]{64}',cp['source_sha256'])
 assert (ROOT/cp['prompt_file']).is_file() and cp['response_id'].startswith('resp_')
 raw=Path(r['cleanPlateSource'])
 if raw.is_file():assert motion.sha(raw)==cp['source_sha256']
 assert 'rigid distal paw' in r['method'] and 'no optical-flow texture blending' in r['method'] and 'continuous analytic timing' in r['method']
 results.append({'animal':animal,'uniqueFrames':len({f.tobytes() for f in frames}),'changedSourcePixels':int(changed.sum()),
   'maxAdjacentMeanDelta':delta,'minimumLocalJacobian':min_jac,'maximumInverseResidualPixels':max_residual,
   'distalSourceTextureErrorP95':texture_p95,'forearmTravelSourcePixels':forearm_travel,'neutralCrossings':neutral_crossings,
   'fixedShoulderRigidDigitsNoRemoteArmGhost':True,'delayedWristContinuousNeutralVelocity':True,'exactNeutralBoundaryGutters':True})
(ROOT/'docs/hall-connected-arm-regression.json').write_text(json.dumps(results,indent=2)+'\n')
print('PASS four two-joint greetings: fixed shoulder, moving forearm/sleeve, delayed rigid palm, continuous neutral velocity; positive Jacobian, source texture and no remote ghosts; exact registration/gutters')
for side in ('previous','next'):
 im=Image.open(ROOT/'assets/resources/art'/f'hall-room-{side}.png').convert('RGBA')
 assert .95<im.width/im.height<1.05 and im.getchannel('A').getextrema()==(0,255)
 assert im.width>500 and im.height>500
print('PASS unchanged generated manual-browse arrows: alpha-trimmed circular art, original aspect ratio, full-resolution silhouette')
