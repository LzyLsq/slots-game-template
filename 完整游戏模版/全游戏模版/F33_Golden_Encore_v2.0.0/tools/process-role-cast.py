"""Bake separate generated cabinet assistants / prize heralds, never repaint.
Connected-component alpha isolation, a fixed-foot contain scale, and ONLY
small local wrist/forearm/prop articulation. Face/body/feet are source pixels.
Each role has two/three genuinely different gesture tracks, not speed variants.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import label, binary_dilation
from skimage.restoration import inpaint_biharmonic
import numpy as np, json, hashlib, uuid, sys
ROOT=Path(__file__).resolve().parents[1]; SOURCE=Path(sys.argv[1]).resolve(); W,H,G,N=192,240,2,48
OUT_W,OUT_H=160,200
RIGS={
'cabinet-otter':([(128,125),(141,115),(139,95),(166,94),(174,111),(169,134),(150,149),(133,151)],(128,139)),
'cabinet-rabbit':([(137,104),(148,81),(162,83),(153,110),(156,119),(154,136),(143,144),(132,127)],(135,127)),
'cabinet-fox':([(145,127),(156,115),(159,95),(173,94),(172,113),(172,129),(163,141),(149,145)],(146,135)),
'cabinet-dragon':([(136,130),(145,114),(146,98),(169,98),(181,115),(176,136),(162,149),(143,161),(132,150)],(137,146)),
'prize-otter':([(130,128),(137,111),(177,111),(184,122),(184,138),(155,142),(151,162),(130,170),(123,151)],(126,152)),
'prize-rabbit':([(141,124),(146,104),(165,102),(180,115),(175,132),(163,139),(160,168),(151,176),(146,150),(137,144)],(140,145)),
'prize-fox':([(142,136),(148,120),(173,116),(181,125),(178,144),(169,158),(150,161),(141,151)],(143,149)),
'prize-dragon':([(145,137),(156,123),(153,101),(169,98),(182,111),(179,128),(181,145),(172,164),(149,171),(141,150)],(146,151)),
}
def smooth(t):t=np.clip(t,0,1);return t*t*t*(t*(t*6-15)+10)
def envelope(t):
 if t<.08 or t>.92:return 0.
 if t<.40:return float(smooth((t-.08)/.32))
 if t<.58:return 1.
 return float(1-smooth((t-.58)/.34))
def normalise(animal,role):
 im=Image.open(SOURCE/f'{animal}-generated.png').convert('RGBA'); w,h=im.size; a=np.array(im)
 row=0 if role=='cabinet' else 1; region=np.zeros((h,w),bool); region[int(h*(0 if row==0 else .43)):int(h*(.55 if row==0 else 1)),:w//2]=True
 labs,n=label((a[:,:,3]>=36)&region); counts=np.bincount(labs.ravel());counts[0]=0;candidates=[]
 for j in np.argsort(counts)[-8:]:
  yy,xx=np.where(labs==j)
  if len(yy) and counts[j]>1000 and ((yy.mean()<h*.35)==(row==0)):candidates.append(j)
 j=max(candidates,key=lambda v:counts[v]); mask=binary_dilation(labs==j,iterations=3); a[:,:,3]=np.where(mask,a[:,:,3],0);a[a[:,:,3]<12]=0
 yy,xx=np.where(a[:,:,3]>=24); box=tuple(map(int,(xx.min(),yy.min(),xx.max()+1,yy.max()+1)))
 tile=Image.fromarray(a).crop(box); scale=min(168/tile.width,216/tile.height);tile=tile.resize((round(tile.width*scale),round(tile.height*scale)),Image.Resampling.LANCZOS)
 cell=Image.new('RGBA',(W,H));cell.paste(tile,((W-tile.width)//2,228-tile.height));return cell,box
records=[]
for mode,animal in enumerate(['otter','rabbit','fox','dragon']):
 for role in ['cabinet','prize']:
  key=f'{role}-{animal}'; original,box=normalise(animal,role); a=np.array(original).astype(np.float32)/255;ap=a.copy();ap[:,:,:3]*=ap[:,:,3:4]
  poly,pivot=RIGS[key];matte=Image.new('L',(W,H));ImageDraw.Draw(matte).polygon(poly,fill=255);matte=matte.filter(ImageFilter.GaussianBlur(.6));mask=np.array(matte).astype(float)/255
  # Alpha is inpainted too: the newly exposed transparent silhouette must not
  # carry an old floating hand underneath. RGB is always premultiplied.
  hidden=inpaint_biharmonic(ap,mask>.02,channel_axis=-1);base=ap*(1-mask[:,:,None])+hidden*mask[:,:,None];part=ap*mask[:,:,None]
  yy,xx=np.mgrid[:H,:W];x0,y0,x1,y1=(min(p[0] for p in poly)-12,min(p[1] for p in poly)-12,max(p[0] for p in poly)+12,max(p[1] for p in poly)+12)
  region=(smooth((xx-x0)/5)*smooth((x1-xx)/5)*smooth((yy-y0)/5)*smooth((y1-yy)/5))[:,:,None]
  def move(deg,dx,dy):
   channels=[]
   for c in range(4):
    high=Image.fromarray(part[:,:,c]).resize((W*3,H*3),Image.Resampling.BICUBIC).rotate(deg,Image.Resampling.BICUBIC,center=(pivot[0]*3,pivot[1]*3))
    high=high.transform(high.size,Image.Transform.AFFINE,(1,0,-dx*3,0,1,-dy*3),Image.Resampling.BICUBIC)
    channels.append(np.asarray(high.resize((W,H),Image.Resampling.LANCZOS)))
   p=np.stack(channels,axis=-1);return p+base*(1-p[:,:,3:4])
  neutral=move(0,0,0);banks=2 if role=='cabinet' else 3; frames=[];maxdiff=0
  for bank in range(banks):
   for k in range(N):
    t=k/(N-1);lift=envelope(t);angle=dx=dy=0.
    if role=='cabinet':
     if bank==0:angle=[12,-13,14,-10][mode]*lift;dx=[2,-1,1,2][mode]*lift;dy=[-2,-2,-1,-2][mode]*lift
     else:
      # shell offering, fan tilt, key turn, pearl rolling arc (four personalities)
      angle=[22,-20,-30,16][mode]*lift;dx=[3,-2,1,3][mode]*lift;dy=[-5,-3,2,-5][mode]*lift
      if mode==2:angle+=5*np.sin(t*np.pi*4)*lift
      if mode==3:dx+=1.5*np.sin(t*np.pi*2)*lift
    else:
     # Small acknowledge, ceremonial offering, broad (but slow) two-beat salute.
     amp=[.45,1.,1.25][bank];angle=[13,-15,-12,-19][mode]*lift*amp;dy=[-5,-7,-4,-5][mode]*lift*amp;dx=[3,0,2,-2][mode]*lift*amp
     if bank==2:
      angle+=3*np.sin(t*np.pi*4)*lift;dy-=1.5*np.sin(t*np.pi*4)**2*lift
     if mode==2:dx+=1.5*np.sin(t*np.pi*2)*lift
    if lift==0:out=a.copy()
    else:
     mixed=np.clip(ap+(move(angle,dx,dy)-neutral)*region,0,1);mixed[:,:,:3]=np.minimum(mixed[:,:,:3],mixed[:,:,3:4]);mixed[:,:,:3]/=np.maximum(mixed[:,:,3:4],1/255);mixed[mixed[:,:,3]<8/255]=0;out=mixed;out[region[:,:,0]==0]=a[region[:,:,0]==0]
    pixels=np.rint(out*255).astype(np.uint8)
    assert np.array_equal(pixels[region[:,:,0]==0],np.rint(a*255).astype(np.uint8)[region[:,:,0]==0]),'face/body/feet locked'
    assert not np.any(pixels[:,:2,3]>24) and not np.any(pixels[:,-2:,3]>24),'pose touches cell edge'
    if frames and k: maxdiff=max(maxdiff,float(np.abs(pixels.astype(np.int16)-frames[-1].astype(np.int16)).mean()))
    frames.append(pixels)
   assert np.array_equal(frames[-N],frames[-1]),'exact neutral seam'
  atlas=Image.new('RGBA',((OUT_W+G*2)*8,(OUT_H+G*2)*banks*6))
  for i,pixels in enumerate(frames):
   tile=Image.fromarray(pixels).resize((OUT_W,OUT_H),Image.Resampling.LANCZOS)
   atlas.paste(Image.fromarray(np.pad(np.array(tile),((G,G),(G,G),(0,0)),mode='edge')),(i%8*(OUT_W+G*2),i//8*(OUT_H+G*2)))
  name=f'{key}-roles-motion';path=ROOT/'assets/resources/art'/f'{name}.png';atlas.save(path,optimize=True)
  # Retain stable import UUIDs when rebuilding the same shipping source.
  meta=Path(str(path)+'.meta')
  if not meta.exists():
   meta.write_text(json.dumps({'ver':'1.0.27','importer':'image','imported':True,'uuid':str(uuid.uuid4()),'files':['.json','.png'],'subMetas':{},'userData':{'type':'sprite-frame','hasAlpha':True}},indent=2))
  preview=[Image.fromarray(f).resize((W*2,H*2)) for f in frames]
  preview[0].save(SOURCE/f'{key}-roles.gif',save_all=True,append_images=preview[1:],duration=33,loop=0,disposal=2)
  records.append({'asset':name,'role':role,'animal':animal,'source':f'{animal}-generated.png','sourceCrop':box,'size':list(atlas.size),'cell':[OUT_W,OUT_H],'gutter':G,'bankFrames':N,'banks':banks,'footY':190,'exactNeutralSeams':True,'outsideLocalArticulationExact':True,'maxAdjacentMeanChannelDelta':maxdiff,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(SOURCE/'cast-processing-audit.json').write_text(json.dumps(records,indent=2));(ROOT/'docs/cast-processing-audit.json').write_text(json.dumps(records,indent=2));print('Prepared eight distinct generated role characters, 20 dedicated local action tracks')
