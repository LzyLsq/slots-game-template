"""Install commissioned cartoon crown poses without moving cabinet coordinates.
Registration, masks and bidirectional flow are asset preparation; runtime is
Cocos SpriteFrame playback. The aperture, title plaques and controls stay exact.
"""
from pathlib import Path
import cv2,numpy as np,json,hashlib,uuid
from PIL import Image,ImageDraw,ImageFilter
P=Path(__file__).resolve().parent;ROOT=P.parents[1];ART=ROOT/'assets/resources/art'
chars=json.loads((P/'characters.json').read_text());reports=[]
# Actual geometry from CabinetGeometry, before the 256px room extension.
protected={
 'sun-lion':[(230,135,564,155),(210,320,610,688)],
 'emerald-elephant':[(242,167,538,176),(220,374,610,714)],
 'lotus-koi':[(240,106,546,161),(218,300,600,692)],
 'moon-fox':[(255,121,530,158),(231,313,600,775)],
}
def rgb(path):return np.asarray(Image.open(path).convert('RGB')).copy()
def resized(a,w,h):return cv2.resize(a,(w,h),interpolation=cv2.INTER_LANCZOS4)
def mix(a,b,m):return np.clip(np.rint(a*(1-m[:,:,None])+b*m[:,:,None]),0,255).astype(np.uint8)
def inverse_map(flow,t,x,y):
 mx,my=x.copy(),y.copy()
 for _ in range(3):
  f=cv2.remap(flow,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE);mx,my=x-t*f[:,:,0],y-t*f[:,:,1]
 return mx,my
w,h,left,top=736,448,144,0
for mode,c in chars.items():
 old=rgb(P/f'{mode}-before-extended.png');installed=old.copy()
 new=rgb(P/f'{mode}-normalized.png')
 # New coherent upper room, feathered into the preserved cabinet well above reels.
 end=protected[mode][0][1]+256
 alpha=np.ones((end,1024),np.float32);alpha[-24:]*=np.linspace(1,0,24)[:,None]
 installed[:end]=mix(old[:end],new[:end],alpha)
 # Compact physical treasury replaces old animal frontage. Never resize the base
 # to fit a shorter UI box; keep the commissioned image's original proportions.
 lower=resized(rgb(P/'output/imagegen'/f'{mode}-lower.png'),1024,1024)
 start=c['lower']+256
 lm=np.ones((2048-start,1024),np.float32);lm[:24]*=np.linspace(0,1,24)[:,None]
 installed[start:]=mix(old[start:],lower[start-1024:],lm)
 sheet=rgb(P/'output/imagegen'/f'{mode}-poses.png');sh,sw=sheet.shape[:2];raw=[]
 for i in range(12):
  x0=round(i%4*sw/4);x1=round((i%4+1)*sw/4);y0=round(i//4*sh/3);y1=round((i//4+1)*sh/3)
  raw.append(resized(sheet[y0:y1,x0:x1],w,h))
 static=np.ones((h,w),np.uint8)*255;static[15:h-42,120:w-100]=0
 template=cv2.cvtColor(raw[0],cv2.COLOR_RGB2GRAY).astype('float32')/255
 registered=[raw[0]];alignment=[]
 for i in range(1,12):
  gray=cv2.cvtColor(raw[i],cv2.COLOR_RGB2GRAY).astype('float32')/255;matrix=np.eye(2,3,dtype=np.float32)
  try:
   _,matrix=cv2.findTransformECC(template,gray,matrix,cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_COUNT|cv2.TERM_CRITERIA_EPS,100,1e-5),static,3)
   if abs(matrix[0,2])>9 or abs(matrix[1,2])>9:matrix=np.eye(2,3,dtype=np.float32)
  except cv2.error:matrix=np.eye(2,3,dtype=np.float32)
  alignment.append({'pose':i,'translation':matrix[:,2].tolist()})
  registered.append(cv2.warpAffine(raw[i],matrix,(w,h),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REFLECT))
 # The full neutral crown includes the character's throne, material and shadows.
 # Restore all title/aperture/console pixels after composing the crown.
 yy,xx=np.mgrid[:h,:w]
 edge=np.minimum(np.minimum(np.clip(xx/22,0,1),np.clip((w-1-xx)/22,0,1)),np.minimum(np.clip(yy/14,0,1),np.clip((h-1-yy)/18,0,1))).astype(np.float32)
 installed[:h,left:left+w]=mix(installed[:h,left:left+w],registered[0],edge)
 for x,y,pw,ph in protected[mode]:installed[y+256:y+256+ph,x:x+pw]=old[y+256:y+256+ph,x:x+pw]
 neutral=installed[:h,left:left+w].copy()
 # Actual right forearm / face / left ingot motion. Freeze the crown and gold
 # crest, which should not change shape or wobble during a gesture.
 region=Image.new('L',(w,h),0);d=ImageDraw.Draw(region)
 if mode=='sun-lion':boxes=[(165,164,346,346),(263,136,453,277),(427,197,583,335)];bottom=368
 elif mode=='emerald-elephant':boxes=[(169,159,344,351),(256,134,459,301),(426,195,599,350)];bottom=370
 elif mode=='lotus-koi':boxes=[(170,188,344,360),(267,165,460,321),(436,214,605,344)];bottom=366
 else:boxes=[(172,221,344,375),(260,183,455,333),(429,240,585,370)];bottom=380
 for b in boxes:d.rounded_rectangle(b,radius=24,fill=255)
 motion=np.asarray(region.filter(ImageFilter.GaussianBlur(7)),dtype=np.float32)/255
 motion[bottom:]=0;motion[:16]=0;motion[-16:]=0;motion[:,:16]=0;motion[:,-16:]=0
 # Protect any plaque pixels even if a blurred anatomy mask reaches them.
 for x,y,pw,ph in protected[mode]:
  x0=max(0,x-left);x1=min(w,x+pw-left);y0=max(0,y+256);y1=min(h,y+256+ph)
  if x1>x0 and y1>y0:motion[y0:y1,x0:x1]=0
 poses=[mix(neutral,f,motion) for f in registered];poses[0]=neutral;poses[-1]=neutral.copy()
 # 460×280 is exactly the authored aspect ratio, no stretched art. Four mode
 # atlases consume 94.3MiB RGBA if all four stay decoded after visits.
 fw,fh=460,280;poses=[resized(f,fw,fh) for f in poses];small_mask=cv2.resize(motion,(fw,fh),interpolation=cv2.INTER_AREA)
 small_mask[:10]=0;small_mask[-10:]=0;small_mask[:,:10]=0;small_mask[:,-10:]=0
 neutral_small=poses[0].copy();mask3=small_mask[:,:,None];flows=[]
 solver=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM);solver.setUseSpatialPropagation(True);solver.setFinestScale(0)
 for a,b in zip(poses[:-1],poses[1:]):
  ab=solver.calc(cv2.cvtColor(a,cv2.COLOR_RGB2GRAY),cv2.cvtColor(b,cv2.COLOR_RGB2GRAY),None)*mask3
  ba=solver.calc(cv2.cvtColor(b,cv2.COLOR_RGB2GRAY),cv2.cvtColor(a,cv2.COLOR_RGB2GRAY),None)*mask3
  flows.append((ab,ba))
 yy,xx=np.mgrid[:fh,:fw];xx=xx.astype(np.float32);yy=yy.astype(np.float32);frames=[]
 for n in range(48):
  phase=n/47*11;i=min(10,int(phase));t=phase-i
  if n in (0,47):frame=neutral_small.copy()
  else:
   ab,ba=flows[i];ax,ay=inverse_map(ab,t,xx,yy);bx,by=inverse_map(ba,1-t,xx,yy)
   a=cv2.remap(poses[i],ax,ay,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE);b=cv2.remap(poses[i+1],bx,by,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
   frame=mix(neutral_small,np.clip(np.rint(a*(1-t)+b*t),0,255).astype(np.uint8),small_mask)
  frames.append(frame)
 atlas=Image.new('RGB',(fw*8,fh*6));overview=Image.new('RGB',(fw*4,fh*3));fd=P/'baked-frames'/mode;fd.mkdir(parents=True,exist_ok=True)
 for i,f in enumerate(frames):
  img=Image.fromarray(f);atlas.paste(img,((i%8)*fw,(i//8)*fh));img.save(fd/f'{i:02}.png')
 for i in range(12):overview.paste(Image.fromarray(frames[round(i*47/11)]),((i%4)*fw,(i//4)*fh))
 name=mode+'-fortune-motion';dest=ART/(name+'.png');atlas.save(dest,optimize=True);overview.save(P/(mode+'-installed-motion-review.png'))
 Image.fromarray(installed).save(ART/f'{mode}-extended.png');Image.fromarray(installed[256:1792]).save(ART/f'{mode}-environment.png')
 meta_path=ART/(name+'.png.meta');meta=json.loads((ART/'sun-lion-extended.png.meta').read_text())
 uid=json.loads(meta_path.read_text())['uuid'] if meta_path.exists() else str(uuid.uuid4())
 meta['uuid']=uid;meta['subMetas']['6c48a']['uuid']=uid+'@6c48a';meta['subMetas']['6c48a']['displayName']=name
 meta['subMetas']['6c48a']['userData'].update(imageUuidOrDatabaseUri=uid,wrapModeS='clamp-to-edge',wrapModeT='clamp-to-edge')
 meta['userData']['redirect']=uid+'@6c48a';meta_path.write_text(json.dumps(meta,indent=2)+'\n')
 borders=all(np.array_equal(f[:10],neutral_small[:10]) and np.array_equal(f[-10:],neutral_small[-10:]) and np.array_equal(f[:,:10],neutral_small[:,:10]) and np.array_equal(f[:,-10:],neutral_small[:,-10:]) for f in frames)
 assert borders and np.array_equal(frames[0],frames[-1])
 for x,y,pw,ph in protected[mode]:assert np.array_equal(installed[y+256:y+256+ph,x:x+pw],old[y+256:y+256+ph,x:x+pw])
 reports.append({'mode':mode,'rectInOriginal':[144,-256,736,448],'frames':48,'frameSize':[fw,fh],'atlasSize':list(atlas.size),'fileBytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'staticBorderEqualAllFrames':borders,'loopNeutralIdentical':True,'protectedRects':protected[mode],'registration':alignment})
 print(mode,'installed',atlas.size,dest.stat().st_size,flush=True)
# Foreground hall treasure, retaining every original center pixel.
H=P.parent/'fortune-guardians-20261010';old=rgb(H/'salon-hall-before.png');new=resized(rgb(H/'output/imagegen/hall.png'),1024,1536)
mask=Image.open(H/'hall-mask.png').getchannel('A').point(lambda v:255-v).filter(ImageFilter.GaussianBlur(8));alpha=np.asarray(mask,dtype=np.float32)/255;alpha[:,330:694]=0
hall=mix(old,new,alpha);assert np.array_equal(hall[:,330:694],old[:,330:694]);Image.fromarray(hall).save(ART/'salon-hall.png')
(P/'installation-manifest.json').write_text(json.dumps({'date':'2026-10-10','provider':'CC Switch selected Codex provider (read only)','model':'gpt-image-2','method':'12 commissioned cartoon poses, registered static scene, offline bidirectional optical flow, 48 frames played in Cocos','cabinetPoses':reports,'hallCenterUnchanged':True},indent=2)+'\n')
