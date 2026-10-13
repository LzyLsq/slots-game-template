"""CC Switch edits for registered room outpainting and localized closed eyelids.
Original cabinet paint and every alpha silhouette are reinserted byte-for-byte.
"""
from pathlib import Path
from io import BytesIO
import sys,json,uuid,base64,urllib.request,concurrent.futures
from PIL import Image,ImageOps,ImageDraw,ImageFilter
import numpy as np
sys.path.insert(0,str(Path(__file__).parent));from generate_ccswitch import provider
P=Path(__file__).resolve().parents[1];ART=P/'assets/resources/art';WORK=P/'art-source/registered';WORK.mkdir(exist_ok=True)
IDS=['golden-strings','sapphire-harp','ruby-brass','pearl-rhythm']
EYES=[[[440,310,503,365],[550,335,613,393]],[[385,275,483,378],[558,319,662,429]],[[406,263,506,355],[559,311,665,403]],[[414,377,504,463],[578,407,664,497]]]
ARMS=[([(165,160),(330,160),(335,405),(410,490),(378,579),(308,567),(236,535),(194,457),(174,389)],(375,524)), ([(74,222),(302,209),(316,412),(393,473),(376,641),(303,656),(154,592),(82,475)],(363,532)), ([(80,223),(299,223),(305,471),(370,511),(340,639),(286,694),(194,691),(117,607),(100,500)],(329,560)), ([(190,275),(357,269),(345,530),(417,567),(390,653),(343,684),(266,647),(220,580),(192,496)],(378,602))]
def edit(name,image,prompt,size='1024x1536',mask=None):
 out=WORK/(name+'.png')
 if out.exists():return Image.open(out).convert('RGBA')
 url,key=provider();boundary='F43'+uuid.uuid4().hex
 fields={'model':'gpt-image-2.5','size':size,'quality':'high','n':'1','prompt':prompt}
 payload=b''
 for k,v in fields.items():payload+=f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
 buffer=BytesIO();image.save(buffer,format='PNG')
 payload+=f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="reference.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+buffer.getvalue()+b'\r\n'
 if mask is not None:
  mask_buffer=BytesIO();mask.save(mask_buffer,format='PNG')
  payload+=f'--{boundary}\r\nContent-Disposition: form-data; name="mask"; filename="mask.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+mask_buffer.getvalue()+b'\r\n'
 payload+=f'--{boundary}--\r\n'.encode()
 request=urllib.request.Request(url+'/images/edits',payload,{'Authorization':'Bearer '+key,'Content-Type':'multipart/form-data; boundary='+boundary})
 with urllib.request.urlopen(request,timeout=300) as response:data=json.load(response)['data'][0]
 out.write_bytes(base64.b64decode(data['b64_json']));print(name+' commissioned',flush=True)
 return Image.open(out).convert('RGBA')
def room(id):
 source=Image.open(ART/(id+'-panorama.png')).convert('RGBA');center=source.crop((440,0,1864,1536)).resize((1024,1104),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(1024,1536));canvas.alpha_composite(center,(0,320));canvas.save(WORK/(id+'-outpaint-reference.png'))
 result=edit(id+'-room-outpaint',canvas,'OUTPAINT ONLY the transparent top 320 pixels and bottom 112 pixels of this exact premium musical palace cabinet portrait. Keep every original visible pixel unchanged and in precisely the same position. Extend the upper architectural wall and chandelier of this same room naturally, no additional cabinet, no lettering, no mascot, no duplicate objects. Bottom extends the same reflective ivory marble floor with warm gold light. Match camera perspective, edges and illumination seamlessly, bright cheerful opulent concert palace. Complete opaque vertical room.').resize((1024,1536),Image.Resampling.LANCZOS)
 # Protect all gameplay apertures, title, furniture and full original artwork.
 result.alpha_composite(center,(0,320));result.convert('RGB').save(ART/(id+'-room-center.png'))
 print(id+' room installed',flush=True)
def eyes():
 ref=Image.new('RGB',(1024,1024),'#f5e8d0');maps=[]
 for i,id in enumerate(IDS):
  src=Image.open(ART/(id+'-guardian.png')).convert('RGBA');bounds=(280,170,740,550) if i<3 else (300,300,740,640);face=src.crop(bounds);face=ImageOps.contain(face,(480,450),Image.Resampling.LANCZOS)
  x=i%2*512+(512-face.width)//2;y=i//2*512+25;ref.paste(face,(x,y),face);maps.append((bounds,x,y,face.width/(bounds[2]-bounds[0])))
 ref.save(WORK/'eye-reference.png')
 result=edit('closed-eyelids',ref,'Edit this EXACT registered four-panel reference ONLY by gently closing BOTH eyes of each cartoon musician: ginger CAT upper left, OWL upper right, FOX bottom left, RABBIT bottom right. Preserve face outlines, nose, mouth, hat, fur, scale, head orientation, positions, background and all pixels outside each eye. Original open eyes become naturally relaxed closed eyelids with matching fur or feathers, softly curved closure and subtle lashes. No extra eyes, no new characters, no movement or changes to composition. Premium game animation registered eyelid patches.','1024x1024').convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
 for i,id in enumerate(IDS):
  src=Image.open(ART/(id+'-guardian.png')).convert('RGBA');closed=src.copy();bounds,ox,oy,scale=maps[i]
  for x,y,r,b in EYES[i]:
   patch=result.crop((round(ox+(x-bounds[0])*scale),round(oy+(y-bounds[1])*scale),round(ox+(r-bounds[0])*scale),round(oy+(b-bounds[1])*scale))).resize((r-x,b-y),Image.Resampling.LANCZOS)
   mask=Image.new('L',patch.size);d=ImageDraw.Draw(mask);d.rounded_rectangle((2,2,r-x-3,b-y-3),8,fill=255);mask=mask.filter(ImageFilter.GaussianBlur(2));closed.paste(patch,(x,y),mask)
  closed.putalpha(src.getchannel('A'));closed.save(ART/(id+'-guardian-eyelids.png'))
  # One rigid arm hinge; fixed body and pedestal retain source geometry.
  points,pivot=ARMS[i];mask=Image.new('L',src.size);ImageDraw.Draw(mask).polygon(points,fill=255)
  rgba=np.array(src);m=np.array(mask)/255;arm=rgba.copy();arm[:,:,3]=(rgba[:,:,3]*m).astype('uint8');body=rgba.copy();body[:,:,3]=(rgba[:,:,3]*(1-m)).astype('uint8')
  Image.fromarray(arm).save(ART/(id+'-guardian-arm.png'));Image.fromarray(body).save(ART/(id+'-guardian-base.png'))
 (WORK/'guardian-registration.json').write_text(json.dumps({'size':[1024,1024],'eyes':EYES,'armPolygonsAndPivots':ARMS,'motion':'Rigid hinged arm rotation; fixed body, face and crown; eye-only shader closure'},indent=2))
 print('Four articulated musician bodies and registered eyelids installed',flush=True)
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futures=[pool.submit(room,id) for id in IDS]+[pool.submit(eyes)]
  for future in concurrent.futures.as_completed(futures):future.result()
