"""Install only registered eyelid patches; preserve original silhouette and face pixels."""
from pathlib import Path
import json, uuid
import numpy as np
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2]
work=Path(__file__).parent
registration=json.loads((work/'registration.json').read_text())
reference=Image.open(work/'eye-reference.png').convert('RGB')
result=Image.open(work/'output/imagegen/closed-eyelids.png').convert('RGB').resize(reference.size,Image.Resampling.LANCZOS)
preview=Image.new('RGB',(3*420,2*390),'#303c38')
draw=ImageDraw.Draw(preview)
audit=[]
for i,name in enumerate(registration['ids']):
    source=root/'assets/resources/art'/f'{name}-guardian-skin.png'
    original=Image.open(source).convert('RGBA')
    orig=np.array(original); closed=orig.copy()
    crop=registration['crops'][i]; origin=registration['origins'][i]
    mask=Image.new('L',original.size); md=ImageDraw.Draw(mask)
    for box in registration['eyeBoxes'][i]:
        bx=tuple(v*2 for v in box)
        md.rounded_rectangle(bx,radius=14,fill=255)
    # Smooth inside the boundary; no feather may spill beyond the authored eye patch.
    import cv2
    m=np.array(mask)
    inside=cv2.distanceTransform(m,cv2.DIST_L2,5)
    blend=np.clip(inside/7,0,1);blend=blend*blend*(3-2*blend)
    for box in registration['eyeBoxes'][i]:
        x0,y0,x1,y1=[v*2 for v in box]
        sx=origin[0]+x0-crop[0]; sy=origin[1]+y0-crop[1]
        edit=np.array(result.crop((sx,sy,sx+x1-x0,sy+y1-y0)))
        a=blend[y0:y1,x0:x1,None]
        closed[y0:y1,x0:x1,:3]=np.rint(orig[y0:y1,x0:x1,:3]*(1-a)+edit*a).astype(np.uint8)
    assert np.array_equal(closed[:,:,3],orig[:,:,3])
    changed=np.any(closed[:,:,:3]!=orig[:,:,:3],axis=2)
    assert not changed[m==0].any()
    destination=source.with_name(f'{name}-guardian-eyelids.png')
    Image.fromarray(closed).save(destination,optimize=True)
    meta=json.loads(source.with_suffix('.png.meta').read_text());old=meta['uuid'];new=str(uuid.uuid4())
    meta=json.loads(json.dumps(meta).replace(old,new).replace(f'{name}-guardian-skin',f'{name}-guardian-eyelids'))
    destination.with_suffix('.png.meta').write_text(json.dumps(meta,indent=2)+'\n')
    for row,im in enumerate([original,Image.fromarray(closed)]):
        face=im.crop(crop).convert('RGB');face.thumbnail((410,350),Image.Resampling.LANCZOS)
        preview.paste(face,(i*420+5,row*390+28))
        draw.text((i*420+8,row*390+8),name+(' OPEN' if row==0 else ' CLOSED'),fill='white')
    audit.append({'mode':name,'sourceSize':original.size,'changedPixels':int(changed.sum()),'outsideEyePatchesChanged':0,'alphaChanged':False,'eyeBoxes':registration['eyeBoxes'][i]})
preview.save(work/'installed-eye-comparison.jpg',quality=96)
(work/'installation-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print(json.dumps(audit,indent=2))
