"""Install single-drawing wildlife and its clean fixed architectural plate.
Only the four upper guardian panels change; the room, UI and reels stay intact.
"""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,json,uuid,hashlib
P=Path(__file__).resolve().parent;ROOT=P.parent.parent;ART=ROOT/'assets/resources/art'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def meta(file,alpha):
 template=json.loads((ART/'sun-lion-extended.png.meta').read_text())
 u=str(uuid.uuid4());template['uuid']=u;template['userData'].update(hasAlpha=alpha,redirect=u+'@6c48a')
 sub=template['subMetas']['6c48a'];sub['uuid']=u+'@6c48a';sub['displayName']=file.stem;sub['userData']['imageUuidOrDatabaseUri']=u
 target=Path(str(file)+'.meta')
 if target.exists():template=json.loads(target.read_text())
 # A cropped panel is a fixed painting, not a tiling texture. Repeating its
 # opposite border creates a one-pixel seam under linear sampling.
 template['subMetas']['6c48a']['userData'].update(wrapModeS='clamp-to-edge',wrapModeT='clamp-to-edge')
 target.write_text(json.dumps(template,indent=2)+'\n')
reports=[]
for mode in ['sun-lion','emerald-elephant','lotus-koi','moon-fox']:
 original=Image.open(P/'output/imagegen'/(mode+'-wildlife.png')).convert('RGB').resize((1472,896),Image.Resampling.LANCZOS)
 plate=Image.open(P/'output/imagegen'/(mode+'-underpaint.png')).convert('RGB').resize(original.size,Image.Resampling.LANCZOS)
 hole=Image.eval(Image.open(P/(mode+'-underpaint-mask.png')).getchannel('A').resize(original.size),lambda x:255-x).filter(ImageFilter.GaussianBlur(2))
 base=Image.composite(plate,original,hole)
 # Preserve exact registration at the existing cabinet/room perimeter.
 reference=Image.open(P/(mode+'-reference.png')).convert('RGB').resize(base.size)
 w,h=base.size;yy,xx=np.mgrid[:h,:w];edge=np.minimum.reduce([xx,w-1-xx,yy,h-1-yy]);mix=np.clip(edge/26,0,1);mix=mix*mix*(3-2*mix)
 base=Image.composite(base,reference,Image.fromarray((mix*255).astype('uint8')))
 dest=ART/(mode+'-guardian-base.png');base.save(dest);meta(dest,False)
 skin=ART/(mode+'-guardian-skin.png');Image.open(P/(mode+'-rig.png')).resize(original.size,Image.Resampling.LANCZOS).save(skin);meta(skin,True)
 reports.append({'mode':mode,'source':mode+'-wildlife.png','plate':mode+'-underpaint.png','baseSha256':sha(dest),'skinSha256':sha(skin),'size':[w,h],'registration':'fixed 736 x 448 panel; 2x source texture; preserved perimeter; no room/reel/control edits'})
(P/'installation-manifest.json').write_text(json.dumps(reports,indent=2)+'\n')
# New script importer identity is local to this project.
f=ROOT/'assets/scripts/vfx/GuardianMesh.ts.meta'
if not f.exists():f.write_text(json.dumps({'ver':'4.0.24','importer':'typescript','imported':True,'uuid':str(uuid.uuid4()),'files':[],'subMetas':{},'userData':{}},indent=2)+'\n')
print('Installed four fixed plates and four transparent skin textures')
