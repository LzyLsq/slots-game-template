"""Register complete commissioned treasury poses and bake 48-frame Cocos atlases.
Whole portraits are regenerated; no puppet parts, symbols or drawn icon stand-ins.
Original title, aperture and controls are protected byte-for-byte.
"""
from pathlib import Path
import cv2,numpy as np,json,math,hashlib,uuid
from PIL import Image,ImageDraw,ImageFilter
P=Path(__file__).resolve().parent;ROOT=P.parents[1];ART=ROOT/'assets/resources/art'
characters=json.loads((P/'characters.json').read_text());reports=[]
def rgb(path):return np.asarray(Image.open(path).convert('RGB')).copy()
def resized(a,w,h):return cv2.resize(a,(w,h),interpolation=cv2.INTER_LANCZOS4)
def mix(a,b,m):return np.clip(np.rint(a*(1-m[:,:,None])+b*m[:,:,None]),0,255).astype(np.uint8)
def feather(w,h,margin=12):
 yy,xx=np.mgrid[:h,:w];return np.minimum(np.minimum(np.clip(xx/margin,0,1),np.clip((w-1-xx)/margin,0,1)),np.minimum(np.clip(yy/margin,0,1),np.clip((h-1-yy)/margin,0,1))).astype(np.float32)
def inverse_map(flow,t,x,y):
 mx,my=x.copy(),y.copy()
 for _ in range(3):
  f=cv2.remap(flow,mx,my,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
  mx,my=x-t*f[:,:,0],y-t*f[:,:,1]
 return mx,my
for mode,(_,top,_) in characters.items():
 height=1440-top;w=768
 sheet=rgb(P/'output/imagegen'/f'{mode}-poses.png');sh,sw=sheet.shape[:2]
 raw=[]
 for i in range(12):
  x0=round(i%4*sw/4);x1=round((i%4+1)*sw/4);y0=round(i//4*sh/3);y1=round((i//4+1)*sh/3)
  raw.append(resized(sheet[y0:y1,x0:x1],w,height))
 # Register to static fascia edges; central anatomy is excluded from alignment.
 static=np.ones((height,w),np.uint8)*255;static[8:height-40,95:w-95]=0
 template=cv2.cvtColor(raw[0],cv2.COLOR_RGB2GRAY).astype('float32')/255
 registered=[raw[0]];alignment=[]
 for i in range(1,12):
  gray=cv2.cvtColor(raw[i],cv2.COLOR_RGB2GRAY).astype('float32')/255
  matrix=np.eye(2,3,dtype=np.float32)
  try:
   cc,matrix=cv2.findTransformECC(template,gray,matrix,cv2.MOTION_TRANSLATION,(cv2.TERM_CRITERIA_COUNT|cv2.TERM_CRITERIA_EPS,100,1e-5),static,3)
   if abs(matrix[0,2])>18 or abs(matrix[1,2])>18:matrix=np.eye(2,3,dtype=np.float32)
  except cv2.error:matrix=np.eye(2,3,dtype=np.float32)
  alignment.append({'pose':i,'translation':matrix[:,2].tolist()})
  registered.append(cv2.warpAffine(raw[i],matrix,(w,height),flags=cv2.INTER_LINEAR|cv2.WARP_INVERSE_MAP,borderMode=cv2.BORDER_REFLECT))
 # Install one entire coherent neutral panel. Exact old outer pixels protect seams.
 old=rgb(P/f'{mode}-before-environment.png');original=old[top:1440,128:896]
 neutral=mix(original,registered[0],feather(w,height,18))
 # All fixed surfaces remain from neutral. Only the complete portrait area changes.
 region=Image.new('L',(w,height),0);ImageDraw.Draw(region).rounded_rectangle((100,12,w-100,height-38),radius=32,fill=255)
 motion_mask=np.asarray(region.filter(ImageFilter.GaussianBlur(10)),dtype=np.float32)/255
 motion_mask[:8]=0;motion_mask[-12:]=0;motion_mask[:,:12]=0;motion_mask[:,-12:]=0
 poses=[mix(neutral,f,motion_mask) for f in registered]
 poses[0]=neutral;poses[-1]=neutral.copy()
 # Keep original upper cabinet and all surrounding/outpaint coordinates exact.
 installed=old.copy();installed[top:1440,128:896]=neutral
 assert np.array_equal(installed[:top],old[:top])
 Image.fromarray(installed).save(ART/f'{mode}-environment.png')
 room=rgb(P/f'{mode}-before-extended.png');room[256:1792]=installed
 Image.fromarray(room).save(ART/f'{mode}-extended.png')
 # Flow interpolation redraws in-between positions; it does not scale the picture.
 fw=512;fh=round(height*fw/w);poses=[resized(f,fw,fh) for f in poses]
 small_mask=resized(motion_mask,fw,fh);mask3=small_mask[:,:,None]
 neutral_small=poses[0];flows=[]
 solver=cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
 solver.setUseSpatialPropagation(True);solver.setFinestScale(0)
 for a,b in zip(poses[:-1],poses[1:]):
  ga=cv2.cvtColor(a,cv2.COLOR_RGB2GRAY);gb=cv2.cvtColor(b,cv2.COLOR_RGB2GRAY)
  ab=solver.calc(ga,gb,None)*mask3;ba=solver.calc(gb,ga,None)*mask3
  flows.append((ab,ba))
 yy,xx=np.mgrid[:fh,:fw];xx=xx.astype(np.float32);yy=yy.astype(np.float32)
 frames=[]
 for n in range(48):
  phase=n/47*11;i=min(10,int(phase));t=phase-i
  if n in (0,47):frame=neutral_small.copy()
  elif t<1e-6:frame=poses[i].copy()
  else:
   ab,ba=flows[i];ax,ay=inverse_map(ab,t,xx,yy);bx,by=inverse_map(ba,1-t,xx,yy)
   a=cv2.remap(poses[i],ax,ay,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
   b=cv2.remap(poses[i+1],bx,by,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
   frame=np.clip(np.rint(a*(1-t)+b*t),0,255).astype(np.uint8)
   # Freeze borders after interpolation, retaining one registered physical object.
   frame=mix(neutral_small,frame,small_mask)
  frames.append(frame)
 atlas=Image.new('RGB',(fw*8,fh*6));overview=Image.new('RGB',(fw*4,fh*3))
 for i,f in enumerate(frames):atlas.paste(Image.fromarray(f),((i%8)*fw,(i//8)*fh))
 for i in range(12):overview.paste(Image.fromarray(frames[round(i*47/11)]),((i%4)*fw,(i//4)*fh))
 name=mode+'-fortune-motion';dest=ART/(name+'.png');atlas.save(dest,optimize=True)
 overview.save(P/(mode+'-installed-motion-review.png'))
 frames_dir=P/'baked-frames'/mode;frames_dir.mkdir(parents=True,exist_ok=True)
 for i,f in enumerate(frames):Image.fromarray(f).save(frames_dir/f'{i:02}.png')
 meta=json.loads((ART/'sun-lion-extended.png.meta').read_text());uid=str(uuid.uuid4())
 meta['uuid']=uid;meta['subMetas']['6c48a']['uuid']=uid+'@6c48a';meta['subMetas']['6c48a']['displayName']=name
 meta['subMetas']['6c48a']['userData']['imageUuidOrDatabaseUri']=uid
 meta['subMetas']['6c48a']['userData']['wrapModeS']='clamp-to-edge';meta['subMetas']['6c48a']['userData']['wrapModeT']='clamp-to-edge'
 meta['userData']['redirect']=uid+'@6c48a';(ART/(name+'.png.meta')).write_text(json.dumps(meta,indent=2)+'\n')
 border_equal=all(np.array_equal(f[:8],neutral_small[:8]) and np.array_equal(f[-8:],neutral_small[-8:]) for f in frames)
 # The final neutral pose is exact, including the cabinet and coins.
 assert np.array_equal(frames[0],frames[-1]);assert border_equal
 reports.append({'mode':mode,'sourcePoseSheetSize':[sw,sh],'rectInOriginal':[128,top,768,height],'extendedOffsetY':256,'frames':48,'frameSize':[fw,fh],'atlasSize':list(atlas.size),'textureBytesRGBA':atlas.width*atlas.height*4,'fileBytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'upperCabinetUnchanged':True,'staticBorderEqualAllFrames':border_equal,'loopNeutralIdentical':True,'registration':alignment,'method':'12 commissioned actual anatomical poses; static scene registration and offline bidirectional optical-flow in-between frames; 24 fps Cocos SpriteFrame playback'})
 print(mode,'installed',atlas.size,dest.stat().st_size,flush=True)
# Protect the entire hall center; add only newly commissioned foreground wealth.
old=rgb(P/'salon-hall-before.png');new=resized(rgb(P/'output/imagegen/hall.png'),1024,1536)
mask=Image.open(P/'hall-mask.png').getchannel('A').point(lambda v:255-v).filter(ImageFilter.GaussianBlur(8))
alpha=np.asarray(mask,dtype=np.float32)/255;alpha[:,330:694]=0
hall=mix(old,new,alpha);assert np.array_equal(hall[:,330:694],old[:,330:694]);Image.fromarray(hall).save(ART/'salon-hall.png')
(P/'installation-manifest.json').write_text(json.dumps({'date':'2026-10-10','provider':'CC Switch selected Codex provider (read only)','model':'gpt-image-2','cabinetPoses':reports,'hallCenterUnchanged':True},indent=2)+'\n')
