"""Register CC Switch closed eyelids onto original generated faces.
No drawn eyes: intermediate samples morph ONLY generated open/half-closed/closed eye pixels.
Shipping patches retain exact neutral pixels and fixed noses/brows/costumes.
"""
from pathlib import Path
import json, hashlib, sys, uuid
from PIL import Image
import numpy as np
from scipy.ndimage import map_coordinates
from skimage.registration import optical_flow_tvl1
from skimage.color import rgb2gray
ROOT=Path(__file__).resolve().parents[1]; SOURCE=Path(sys.argv[1]).resolve()
N,G,C=20,2,5
ANIMALS=['otter','rabbit','fox','dragon']; HALL=['hero-otter-ferry','hero-pearl-garden','hero-ember-foundry','hero-celestial-vault']
# Eye-only rectangular support. 2px cosine feather, never brows/nose/mouth.
EYES={
'hall': [[(41,47,67,68),(83,35,105,55)],[(19,50,55,75),(73,38,96,63)],[(54,59,78,78),(91,70,111,87)],[(43,56,90,83),(112,46,134,74)]],
'cabinet':[[(55,39,73,53),(85,30,103,45)],[(53,45,77,60),(87,34,104,50)],[(83,47,104,63),(110,55,124,67)],[(72,56,95,72),(106,50,120,67)]],
'prize':[[(58,59,72,69),(83,54,96,64)],[(63,66,79,77),(91,61,102,73)],[(77,64,94,76),(102,71,112,81)],[(76,74,88,84),(100,72,110,81)]]}

def smooth(t):t=np.clip(t,0,1);return t*t*(3-2*t)
def closed_amount(i):
 t=i/(N-1)
 if t<=.10 or t>=.94:return 0.
 if t<.40:return float(smooth((t-.10)/.30))
 if t<.50:return 1.
 return float(1-smooth((t-.50)/.44))
records=[];configs={s:[] for s in EYES};contact=Image.new('RGB',(4*400,3*160),(50,47,43))
for mode,animal in enumerate(ANIMALS):
 reg=next(r for r in json.loads((SOURCE/'blink-source-registration.json').read_text()) if r['animal']==animal)
 generated=Image.open(SOURCE/f'blink-{animal}-generated.png').convert('RGBA').resize((1024,1024),Image.Resampling.LANCZOS)
 half_generated=Image.open(SOURCE/f'blink-half-{animal}-generated.png').convert('RGBA').resize((1024,1024),Image.Resampling.LANCZOS)
 for row,scene in enumerate(['hall','cabinet','prize']):
  item=next(i for i in reg['items'] if i['role']==scene);cx,cy,cr,cb=item['crop'];px,py,pw,ph=item['referencePlacement']
  closed=generated.crop((px,py,px+pw,py+ph)).resize((cr-cx,cb-cy),Image.Resampling.LANCZOS)
  half=half_generated.crop((px,py,px+pw,py+ph)).resize((cr-cx,cb-cy),Image.Resampling.LANCZOS)
  if scene=='hall':
   source=Image.open(ROOT/'assets/resources/art'/f'{HALL[mode]}.png').convert('RGBA');src=np.array(source)
   closed_src=source.copy();closed_src.paste(closed,(cx,cy));half_src=source.copy();half_src.paste(half,(cx,cy))
   eyes=[(x+cx-2,y+cy-2,r+cx+2,b+cy+2) for x,y,r,b in EYES[scene][mode]]
  else:
   source=Image.open(ROOT/'assets/resources/art'/f'{scene}-{animal}-roles-motion.png').convert('RGBA').crop((G,G,160+G,200+G));src=np.array(source)
   large=Image.open(SOURCE/f'{scene}-{animal}-neutral.png').convert('RGBA');half_large=large.copy();large.paste(closed,(cx,cy));half_large.paste(half,(cx,cy));closed_src=large.resize((160,200),Image.Resampling.LANCZOS);half_src=half_large.resize((160,200),Image.Resampling.LANCZOS)
   eyes=[(x-2,y-2,r+2,b+2) for x,y,r,b in EYES[scene][mode]]
  x0=min(e[0] for e in eyes)-2;y0=min(e[1] for e in eyes)-2;x1=max(e[2] for e in eyes)+2;y1=max(e[3] for e in eyes)+2
  width,height=x1-x0,y1-y0;base=src[y0:y1,x0:x1].copy();end=np.array(closed_src)[y0:y1,x0:x1].copy();mid=np.array(half_src)[y0:y1,x0:x1].copy();mask=np.zeros((height,width),np.float32);morphs=[]
  for x,y,r,b in eyes:
   x-=x0;r-=x0;y-=y0;b-=y0;oh,ow=b-y,r-x
   original=base[y:b,x:r].astype(np.float32)/255
   target=end[y:b,x:r].astype(np.float32)/255;middle=mid[y:b,x:r].astype(np.float32)/255
   yy,xx=np.mgrid[:oh,:ow]
   edge=(yy<2)|(yy>=oh-2)|(xx<2)|(xx>=ow-2)
   for image in [middle,target]:
    bias=np.median(original[:,:,:3][edge]-image[:,:,:3][edge],axis=0)
    image[:,:,:3]=np.clip(image[:,:,:3]+bias,0,1);image[:,:,3]=original[:,:,3]
   flows=[]
   for a,z in [(original,middle),(middle,target)]:
    f=optical_flow_tvl1(rgb2gray(a[:,:,:3]),rgb2gray(z[:,:,:3]),attachment=18,tightness=.22,num_warp=12)
    rev=optical_flow_tvl1(rgb2gray(z[:,:,:3]),rgb2gray(a[:,:,:3]),attachment=18,tightness=.22,num_warp=12)
    flows.append((a,z,f,rev))
   feather=smooth((xx+.5)/2)*smooth((ow-xx-.5)/2)*smooth((yy+.5)/2)*smooth((oh-yy-.5)/2)
   feather[0,:]=feather[-1,:]=0;feather[:,0]=feather[:,-1]=0
   mask[y:b,x:r]=feather;morphs.append((x,y,r,b,original,flows,feather,yy,xx))
  frames=[]
  for i in range(N):
   t=closed_amount(i);out=base.copy()
   if t>0:
    for x,y,r,b,original,flows,feather,yy,xx in morphs:
     amount=t*2 if t<=.5 else (t-.5)*2
     a,z,f,rev=flows[0 if t<=.5 else 1]
     op=np.stack([map_coordinates(a[:,:,c],[yy+rev[0]*amount,xx+rev[1]*amount],order=1,mode='nearest') for c in range(3)],axis=-1)
     cl=np.stack([map_coordinates(z[:,:,c],[yy+f[0]*(1-amount),xx+f[1]*(1-amount)],order=1,mode='nearest') for c in range(3)],axis=-1)
     mixed=op*(1-amount)+cl*amount;rgb=original[:,:,:3]*(1-feather[:,:,None])+mixed*feather[:,:,None]
     out[y:b,x:r,:3]=np.rint(np.clip(rgb,0,1)*255).astype('uint8')
   assert np.array_equal(out[mask==0],base[mask==0]);assert np.array_equal(out[:,:,3],base[:,:,3])
   frames.append(out)
  assert np.array_equal(frames[0],frames[-1]);name=f'blink-{scene}-{animal}';atlas=Image.new('RGBA',((width+G*2)*C,(height+G*2)*4))
  for i,frame in enumerate(frames):atlas.paste(Image.fromarray(np.pad(frame,((G,G),(G,G),(0,0)),mode='edge')),(i%C*(width+G*2),i//C*(height+G*2)))
  dest=ROOT/'assets/resources/art'/f'{name}.png';atlas.save(dest,optimize=True)
  meta=Path(str(dest)+'.meta')
  if not meta.exists():meta.write_text(json.dumps({'ver':'1.0.27','importer':'image','imported':True,'uuid':str(uuid.uuid4()),'files':['.json','.png'],'subMetas':{},'userData':{'type':'sprite-frame','hasAlpha':True}},indent=2))
  config={'art':name,'rect':[x0,y0,width,height]};configs[scene].append(config)
  rec={**config,'scene':scene,'mode':mode,'sources':[f'blink-{animal}-generated.png',f'blink-half-{animal}-generated.png'],'method':'source-registered three-key eyelid interpolation; fixed original alpha and exact outside-eye pixels','size':list(atlas.size),'frames':N,'fps':30,'gutter':G,'eyes':eyes,'uniqueFrames':len(set(f.tobytes() for f in frames)),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'maxAdjacentMeanChannelDelta':max(float(np.abs(a.astype(float)-b.astype(float)).mean()) for a,b in zip(frames,frames[1:])),'exactNeutral':True,'outsideEyesExact':True,'alphaExact':True};records.append(rec)
  # Composite contact evidence and loop: shipping art against its original face.
  comps=[]
  crop=(cx,cy,cr,cb) if scene=='hall' else (25,15,145,100)
  for frame in frames:
   image=source.copy();image.paste(Image.fromarray(frame),(x0,y0));comps.append(image.crop(crop).resize((200,160),Image.Resampling.LANCZOS))
  for col,k in enumerate([0,9]):contact.paste(comps[k],(mode*400+col*200,row*160),comps[k])
  comps[0].save(SOURCE/f'{name}.gif',save_all=True,append_images=[comps[0]]*32+comps+[comps[0]]*65,duration=33,loop=0,disposal=2)
contact.save(SOURCE/'blink-final-open-closed.jpg');(ROOT/'docs/blink-processing-audit.json').write_text(json.dumps(records,indent=2))
code="import type { KeeperMode } from './KeeperGesture';\nexport type BlinkScene = 'hall' | 'cabinet' | 'prize';\nexport type BlinkArt = { readonly art: string; readonly rect: readonly [number, number, number, number] };\n/** Tiny source-registered eye crops. All source art was edited by CC Switch. */\nexport const BLINK_ART: Readonly<Record<BlinkScene, readonly BlinkArt[]>> = "+json.dumps(configs,indent=2)+";\nexport function blinkArt(scene: BlinkScene, mode: KeeperMode): BlinkArt { return BLINK_ART[scene][mode]; }\n"
(ROOT/'assets/scripts/ui/BlinkArt.ts').write_text(code)
print('Prepared 12 generated-eye-only blink atlases',[(r['art'],r['uniqueFrames']) for r in records])
