"""Extract a pixel-aligned limb and occlusion plate; never repaint unselected scene.
The complete original character remains the fallback and reduced-motion scene.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import json
import numpy as np
R=Path(__file__).resolve().parents[1]; S=R/'art-source'; O=R/'assets/art'
spec=json.loads((S/'guardian-rig.json').read_text()); manifest=json.loads((O/'manifest.json').read_text()); geometry=json.loads((O/'geometry.json').read_text())
patch=(640,0,1024,370)
for name,rig in spec.items():
 original=Image.open(O/f'{name}-cabinet.webp').convert('RGB').crop((0,256,1024,1792))
 repair=Image.open(S/rig['repairSource']).convert('RGB').resize(original.size,Image.Resampling.LANCZOS)
 matte=Image.new('L',(4096,6144)); ImageDraw.Draw(matte).polygon([(round(x*4),round(y*4)) for x,y in rig['points']],fill=255)
 matte=matte.resize(original.size,Image.Resampling.LANCZOS)
 # Only the authored occlusion needs a repair. Keep the shoulder socket intact.
 blend=matte.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(.5))
 base=Image.composite(repair,original,blend).crop(patch)
 limb=original.convert('RGBA'); limb.putalpha(matte); limb=limb.crop(patch)
 a=np.array(limb); a[a[:,:,3]==0,:3]=0; limb=Image.fromarray(a)
 for suffix,im,source in [('base',base,rig['repairSource']),('limb',limb,rig['source'])]:
  key=f'{name}-guardian-{suffix}'; im.save(O/f'{key}.webp','WEBP',lossless=True,method=6,exact=True)
  manifest[key]={'source':source,'protectedSource':rig['source'],'rig':'guardian-rig.json','width':im.width,'height':im.height,'transparent':suffix=='limb','trim':list(patch)}
 geometry[f'{name}-cabinet']['guardian']={'patch':[640,0,384,370],'pivot':rig['pivot'],'wrist':rig['wrist'],'rootLock':12,'wristBlend':25}
(O/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)); (O/'geometry.json').write_text(json.dumps(geometry,indent=2))
print('Prepared four matched occlusion plates and exact-alpha limbs.')
