"""Commission registered closed eyelids through local CC Switch; retain original body/alpha."""
from pathlib import Path
from PIL import Image,ImageDraw
from io import BytesIO
import base64,json,urllib.request,uuid,concurrent.futures
from generate_ccswitch import provider
P=Path(__file__).resolve().parents[1];A=P/'assets/resources/art';D=P/'art-source/eyelid-commissions';D.mkdir(exist_ok=True)
BOXES=[[[342,74,376,108],[408,96,443,131]],[[337,118,377,157],[401,140,441,180]],[[380,93,411,128],[441,111,478,145]],[[342,80,375,116],[403,101,438,140]]]
IDS=['golden-otter','moon-rabbit','star-fox','cloud-elephant']
def one(theme):
 id=IDS[theme];src=Image.open(A/(id+'-guardian.png')).convert('RGBA');ox,oy=280,45;size=240
 crop=src.crop((ox*2,oy*2,(ox+size)*2,(oy+size)*2)).resize((1024,1024),Image.Resampling.LANCZOS)
 back=Image.new('RGBA',crop.size,'#d2dfeb');back.alpha_composite(crop);back.save(D/(id+'-open.png'))
 out=D/(id+'-closed.png')
 if not out.exists():
  url,key=provider();boundary='F44Eyes'+uuid.uuid4().hex
  prompt='Precise tiny facial animation edit. Keep the entire framing, head, hat, face anatomy, fur, tusks, trunk, ears, smile, lighting, colors and exact registration of this same cartoon captain unchanged. Change ONLY the TWO open eyes to naturally gently CLOSED eyes during a friendly blink: eyelids of same skin/fur cover the irises, with delicate curved dark lash creases exactly at each original eye position. No new eyes, no dark goggles, no eye patches, no extra eyelids or eyebrows. Do not move or redraw the face. Keep both original eye centers and eyelid shapes. Premium game sprite blink frame; this edit must exactly overlay this image.'
  fields={'model':'gpt-image-2.5','size':'1024x1024','quality':'high','n':'1','prompt':prompt};body=b''
  for k,v in fields.items():body+=f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
  body+=f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="eye.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+(D/(id+'-open.png')).read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
  req=urllib.request.Request(url+'/images/edits',body,{'Authorization':'Bearer '+key,'Content-Type':'multipart/form-data; boundary='+boundary})
  with urllib.request.urlopen(req,timeout=360) as r:data=json.load(r)['data'][0]
  out.write_bytes(base64.b64decode(data['b64_json']))
 closed=Image.open(out).convert('RGBA').resize((size*2,size*2),Image.Resampling.LANCZOS)
 result=src.copy();result.paste(closed,(ox*2,oy*2));result.putalpha(src.getchannel('A'));result.save(A/(id+'-guardian-eyelids.png'),optimize=True)
 print(id+' closed eyes registered',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as ex:list(ex.map(one,range(4)))
(P/'docs/guardian-eyelid-registration.json').write_text(json.dumps({'source':'Local CC Switch image edits','boxes736x448':BOXES,'registration':'Original skin and alpha remain authoritative; only per-eye shader boxes replace pixels'},indent=2))
