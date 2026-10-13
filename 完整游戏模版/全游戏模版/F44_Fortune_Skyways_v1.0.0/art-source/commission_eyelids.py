import sys,json,base64,urllib.request,uuid
from pathlib import Path
from io import BytesIO
import numpy as np
from PIL import Image,ImageOps,ImageDraw,ImageFilter
sys.path.insert(0,str(Path(__file__).parent));from generate_ccswitch import provider
root=Path(__file__).resolve().parents[1];art=root/'assets/resources/art';work=root/'art-source/eyelids';work.mkdir(exist_ok=True)
ids=['golden-otter','moon-rabbit','star-fox','cloud-elephant']
boxes=[[[307,91,376,162],[399,124,477,193]],[[299,109,363,172],[397,130,463,197]],[[292,113,360,180],[394,135,462,204]],[[306,94,362,144],[390,111,445,165]]]
ref=Image.new('RGB',(1024,1024),(245,232,208));maps=[]
for i,id in enumerate(ids):
 src=Image.open(art/(id+'-guardian-skin.png')).convert('RGBA');crop=(500,0,1100,560);face=src.crop(crop);face=ImageOps.contain(face,(480,460),Image.Resampling.LANCZOS)
 ox=i%2*512+(512-face.width)//2;oy=i//2*512+20
 ref.paste(face,(ox,oy),face);maps.append((crop,ox,oy,face.width/600))
ref.save(work/'eye-reference.png');out=work/'closed-eyelids.png'
if not out.exists():
 url,key=provider();boundary='F44EyeEdit'+uuid.uuid4().hex
 fields={'model':'gpt-image-2.5','size':'1024x1024','quality':'high','n':'1','prompt':'Edit this exact four-panel reference sheet only by gently closing BOTH EYES of EACH of the four cartoon festival characters: sun griffin upper left, moon rabbit upper right, star fox bottom left, cloud elephant bottom right. Preserve absolutely the exact head shapes, face positions, scale, colors, fur feathers and background, panel registration, every pixel outside the eyes. Each original open eye must become a naturally curved relaxed closed eyelid with the same colored upper lid, subtle lashes and existing surrounding fur or feathers. No moving the heads, no new decorations, no eye squashing, no other edits. Clean premium game animation eyelid texture. Four correctly registered panels.'}
 payload=b''
 for k,v in fields.items():payload+=f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
 payload+=f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="reference.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+(work/'eye-reference.png').read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
 req=urllib.request.Request(url+'/images/edits',payload,{'Authorization':'Bearer '+key,'Content-Type':'multipart/form-data; boundary='+boundary})
 try:
  with urllib.request.urlopen(req,timeout=300) as r:data=json.load(r)['data'][0]
  out.write_bytes(base64.b64decode(data['b64_json']))
 except Exception as e:print('Eyelid edit failed:',type(e).__name__);raise
result=Image.open(out).convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
comparison=Image.new('RGB',(1024,1024),(245,232,208));audit=[]
for i,id in enumerate(ids):
 src=Image.open(art/(id+'-guardian-skin.png')).convert('RGBA');original=np.array(src);closed=original.copy();crop,ox,oy,scale=maps[i]
 for x,y,r,b in boxes[i]:
  x,y,r,b=[v*2 for v in [x,y,r,b]];sx=ox+(x-crop[0])*scale;sy=oy+(y-crop[1])*scale
  patch=result.crop((round(sx),round(sy),round(sx+(r-x)*scale),round(sy+(b-y)*scale))).resize((r-x,b-y),Image.Resampling.LANCZOS)
  mask=Image.new('L',(r-x,b-y));d=ImageDraw.Draw(mask);d.rounded_rectangle((2,2,r-x-3,b-y-3),radius=10,fill=255);mask=mask.filter(ImageFilter.GaussianBlur(2));blend=np.array(mask)[:,:,None]/255
  closed[y:b,x:r,:3]=(original[y:b,x:r,:3]*(1-blend)+np.array(patch)*blend).round().astype(np.uint8)
 assert np.array_equal(original[:,:,3],closed[:,:,3]);Image.fromarray(closed).save(art/(id+'-guardian-eyelids.png'))
 face=Image.fromarray(closed).crop(crop);face=ImageOps.contain(face,(480,460),Image.Resampling.LANCZOS);comparison.paste(face,(ox,oy),face)
 audit.append({'id':id,'boxes':boxes[i],'alphaPreserved':True,'changedPixels':int(np.any(original[:,:,:3]!=closed[:,:,:3],2).sum())})
comparison.save(work/'installed-comparison.jpg',quality=95);(work/'audit.json').write_text(json.dumps(audit,indent=2));print('Four registered eyelids installed')
