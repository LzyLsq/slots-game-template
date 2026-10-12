"""Scene-native paw animation from the four CC Switch-generated integrated halls.
The neutral hall contains the whole character, with matching light, physical foot
contact and foreground occlusion. Only generated forearm pixels are articulated
in a small fixed source-space patch. No character cutout, body inflation, head
morphing or backdrop movement. Masks are preprocessing mattes, not painted art.
Usage: python3 tools/process-hall-keepers.py /absolute/generation-work-folder
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from skimage.restoration import inpaint_biharmonic
import numpy as np
import sys, json
ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]).resolve()
W, H, N, G = 128, 160, 64, 2
# Source-space shoulder/paw masks, below each face and away from feet/ingot.
RIGS = {
 'otter': ('hero-otter-ferry', (535,590), [(562,623),(573,624),(585,638),(602,653),(613,666),(607,674),(595,674),(580,660),(570,646)], (569,627), 18),
 'rabbit': ('hero-pearl-garden', (560,594), [(599,659),(615,656),(627,662),(630,675),(625,687),(617,694),(606,694),(599,686),(595,672)], (607,659), 22),
 'fox': ('hero-ember-foundry', (550,564), [(593,635),(610,634),(622,641),(637,653),(644,668),(639,678),(628,681),(614,675),(604,662)], (603,636), 18),
 'dragon': ('hero-celestial-vault', (465,579), [(529,654),(546,650),(558,657),(567,670),(566,683),(557,693),(543,695),(534,687),(525,674)], (537,655), 18),
}
def smooth(t):
 t = max(0.,min(1.,t)); return t*t*t*(t*(t*6-15)+10)
def lift(t):
 if t <= .06 or t >= .94: return 0.
 if t < .45: return smooth((t-.06)/.39)
 if t <= .55: return 1.
 return 1-smooth((t-.55)/.39)
records = []
for animal,(art,(x,y),poly,(px,py),angle) in RIGS.items():
 scene=Image.open(SOURCE/f'{animal}-generated.png').convert('RGBA')
 assert scene.size == (1024,1536)
 scene.save(ROOT/'assets/resources/art'/f'{art}.png',optimize=True)
 original=np.array(scene.crop((x,y,x+W,y+H))).astype(np.float32)/255
 matte=Image.new('L',(W,H)); ImageDraw.Draw(matte).polygon([(a-x,b-y) for a,b in poly],fill=255)
 matte=matte.filter(ImageFilter.GaussianBlur(.65))
 mask=np.array(matte).astype(np.float32)/255
 # Shoulder seam stays at the joint, never pulling the entire sleeve/coat.
 yy,xx=np.mgrid[:H,:W]; joint=np.clip((yy-(py-y)+2)/7,0,1); mask*=joint
 hidden=inpaint_biharmonic(original[:,:,:3],mask>.03,channel_axis=-1)
 base=original.copy(); base[:,:,:3]=original[:,:,:3]*(1-mask[:,:,None])+hidden*mask[:,:,None]
 paw=original*mask[:,:,None]
 def rotate(deg,dx=0,dy=0):
  return np.stack([np.asarray(Image.fromarray(paw[:,:,c]).resize((W*2,H*2),Image.Resampling.LANCZOS)
    .rotate(deg,Image.Resampling.BICUBIC,center=((px-x)*2,(py-y)*2))
    .transform((W*2,H*2),Image.Transform.AFFINE,(1,0,-dx*2,0,1,-dy*2),Image.Resampling.BICUBIC)
    .resize((W,H),Image.Resampling.LANCZOS)) for c in range(4)],axis=-1)
 def compose(p): return p+base*(1-p[:,:,3:4])
 neutral=compose(rotate(0))
 atlas=Image.new('RGBA',((W+G*2)*8,(H+G*2)*8)); frames=[]; max_diff=0
 for k in range(N):
  t=k/(N-1); a=lift(t); degrees=angle*a; dx=dy=0.
  # Four scene-native personalities, no shared wave with a speed multiplier.
  if animal=='otter': degrees=20*a; dx=3*a; dy=-2*a
  elif animal=='rabbit': degrees=-16*a; dx=-2*a
  elif animal=='fox':
   a=lift(t*2 if t<.5 else (t-.5)*2); degrees=16*a
  else: degrees=18*a; dx=3*np.sin(t*np.pi*2)*a; dy=-2*a
  out=original if a==0 else np.clip(original+compose(rotate(degrees,dx,dy))-neutral,0,1)
  out[:,:,3]=1
  # Pin the entire patch boundary exactly, including atlas sample gutters.
  out[:3]=original[:3]; out[-3:]=original[-3:]; out[:,:3]=original[:,:3]; out[:,-3:]=original[:,-3:]
  pixels=np.rint(out*255).astype(np.uint8)
  if frames:max_diff=max(max_diff,float(np.abs(pixels.astype(np.int16)-frames[-1].astype(np.int16)).mean()))
  frames.append(pixels)
  pad=np.pad(pixels,((G,G),(G,G),(0,0)),mode='edge')
  atlas.paste(Image.fromarray(pad),(k%8*(W+G*2),k//8*(H+G*2)))
 assert np.array_equal(frames[0],frames[-1])
 assert np.array_equal(frames[0],np.array(scene.crop((x,y,x+W,y+H)))), 'rest is exact generated scene'
 atlas.save(ROOT/'assets/resources/art'/f'hall-{animal}-paw-motion.png',optimize=True)
 audit_frames=[Image.fromarray(f).convert('RGB').resize((W*2,H*2)) for f in frames]
 audit_frames[0].save(SOURCE/f'{animal}-paw.gif',save_all=True,append_images=audit_frames[1:]+[audit_frames[-1]]*60,duration=33,loop=0)
 records.append({'animal':animal,'source':f'{animal}-generated.png','scene':f'{art}.png','atlas':f'hall-{animal}-paw-motion.png','sourcePatch':[x,y,W,H],'frames':N,'cellWithGutter':[W+G*2,H+G*2],'exactNeutralSeam':True,'exactPatchBoundary':True,'maxAdjacentMeanChannelDelta':max_diff,'onlyLocalForearmArticulated':True})
(SOURCE/'paw-processing-audit.json').write_text(json.dumps(records,indent=2))
# The generation model chose a 1254px square atlas; derive actual halves
# rather than assuming the requested 1024px canvas. Trim by meaningful alpha.
arrows=Image.open(SOURCE/'arrows.png').convert('RGBA'); aw,ah=arrows.size
arrow_audit=[]
for k,side in enumerate(('previous','next')):
 box=(k*aw//2,0,(k+1)*aw//2,ah)
 tile=arrows.crop(box)
 bounds=tile.getchannel('A').point(lambda v:255 if v>=24 else 0).getbbox()
 assert bounds, 'Generated arrow silhouette missing'
 tile=tile.crop(bounds)
 tile.putalpha(tile.getchannel('A').point(lambda v:0 if v<12 else v))
 assert .95<tile.width/tile.height<1.05, 'Do not squeeze a malformed crop into a button'
 tile.save(ROOT/'assets/resources/art'/f'hall-room-{side}.png',optimize=True)
 arrow_audit.append({'side':side,'source_half':box,'trim_bbox':bounds,'size':tile.size,'alpha_noise_cutoff':12})
(SOURCE/'arrow-processing-audit.json').write_text(json.dumps(arrow_audit,indent=2))
print('Prepared four scene-integrated halls, source-pixel registered 64-frame paw atlases, and two alpha-trimmed generated arrows')
