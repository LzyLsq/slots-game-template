from pathlib import Path
import json,uuid
import numpy as np
from PIL import Image, ImageDraw

root=Path(__file__).resolve().parents[1]
for name in ['premium-controls-v2','premium-ledgers-v2']:
 image=Image.open(root/'tools/art-sources'/f'{name.replace("v2","v3")}.png').convert('RGBA')
 controls='controls' in name
 xs=[0,350,630,930,1254] if controls else [0,314,628,942,1254]
 ys=[0,315,612,910,1254] if controls else [0,314,628,942,1254]
 tw,th=(256,256) if controls else (512,128)
 atlas=Image.new('RGBA',(tw*4,th*4))
 for r in range(4):
  for c in range(4):
   a=np.array(image.crop((xs[c],ys[r],xs[c+1],ys[r+1])))
   rgb=a[:,:,:3].astype(float);lum=rgb.max(axis=2)
   candidate=(lum<65)&((rgb.max(axis=2)-rgb.min(axis=2))<48)
   mask=Image.fromarray(candidate.astype('uint8')*255).copy();ImageDraw.floodfill(mask,(0,0),128);bg=np.array(mask)==128
   if bg.sum()<candidate.size*.05:raise ValueError('Background extraction failed')
   a[bg,3]=0
   tile=Image.fromarray(a);bounds=tile.getchannel('A').getbbox()
   if not bounds:raise ValueError(name)
   tile=tile.crop(bounds)
   if controls:
    tile.thumbnail((240,240),Image.Resampling.LANCZOS)
    atlas.alpha_composite(tile,(c*tw+(tw-tile.width)//2,r*th+(th-tile.height)//2))
   else:
    # Keep a transparent gutter around every cell. Linear filtering otherwise
    # samples the neighboring theme at small cabinet sizes.
    tile=tile.resize((500,116),Image.Resampling.LANCZOS)
    atlas.alpha_composite(tile,(c*tw+6,r*th+6))
 path=root/'assets/resources/art'/f'{name}.png';atlas.save(path,optimize=True)
 template=json.loads((root/'assets/resources/art/ledgers.png.meta').read_text());old=template['uuid'];meta_path=Path(str(path)+'.meta');new=json.loads(meta_path.read_text())['uuid'] if meta_path.exists() else str(uuid.uuid4());template=json.loads(json.dumps(template).replace(old,new).replace('"ledgers"',json.dumps(name)))
 template['userData']['fixAlphaTransparencyArtifacts']=True
 template['subMetas']['6c48a']['userData']['wrapModeS']='clamp-to-edge'
 template['subMetas']['6c48a']['userData']['wrapModeT']='clamp-to-edge'
 Path(str(path)+'.meta').write_text(json.dumps(template,indent=2)+'\n')
 print(path,atlas.size)
