"""Outpaint each F40 room through the user's local CC Switch. Keep existing cabinet pixels registered."""
from pathlib import Path
from PIL import Image,ImageDraw
from io import BytesIO
import sys,base64,json,urllib.request,uuid,concurrent.futures,time
sys.path.insert(0,str(Path(__file__).parent));from generate_ccswitch import provider
P=Path(__file__).resolve().parents[1];A=P/'assets/resources/art';D=P/'art-source/room-extension-v2';D.mkdir(exist_ok=True)
IDS=['golden-phoenix','jade-dragon','pearl-qilin','amber-panda']
def one(id):
 original=Image.open(P/('art-source/raw/'+id+'-panorama.png')).convert('RGB').resize((1536,1024),Image.Resampling.LANCZOS)
 ref=Image.new('RGB',(1536,2048),(240,223,192));ref.paste(original,(0,556));ref.save(D/(id+'-reference.png'))
 out=D/(id+'-extended.png')
 if not out.exists():
  url,key=provider();boundary='F40Room'+uuid.uuid4().hex
  fields={'model':'gpt-image-2.5','size':'1024x1536','quality':'high','n':'1','prompt':'OUTPAINT ONLY the empty top 556 pixels and bottom 468 pixels of this exact portrait image. The existing detailed festival casino room occupies x0..1536 y556..1580. Preserve its composition, perspective, exact size, placement and all details. Extend the architecture naturally upward: ornate gilded red Chinese palace ceiling, warm lanterns, soft warm sunlight, textured rafters and carved beams above the existing cabinet. Extend its polished floor downward with matching perspective and red gold carpet. This is ONE continuous luxurious riverside lantern festival room, not separate images. No characters, no animals, no new machine or duplicate machine, no text, no black background. Absolute registration: preserve the existing painted region in place; fill only the two plain cream empty strips at top and bottom. Premium smooth detailed cartoon game art.'}
  body=b''
  for k,v in fields.items():body+=f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
  body+=f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="room.png"\r\nContent-Type: image/png\r\n\r\n'.encode()+(D/(id+'-reference.png')).read_bytes()+f'\r\n--{boundary}--\r\n'.encode()
  req=urllib.request.Request(url+'/images/edits',body,{'Authorization':'Bearer '+key,'Content-Type':'multipart/form-data; boundary='+boundary})
  for attempt in range(4):
   try:
    with urllib.request.urlopen(req,timeout=360) as r:data=json.load(r)['data'][0]
    out.write_bytes(base64.b64decode(data['b64_json']));break
   except Exception as exc:
    print(id+' retry '+str(attempt+1)+' '+type(exc).__name__,flush=True)
    if attempt==3:raise
    time.sleep(3)
 result=Image.open(out).convert('RGB').resize((2304,3072),Image.Resampling.LANCZOS)
 # Original gameplay positions must stay exact. Keep all authored cabinet pixels.
 source=original.resize((2304,1536),Image.Resampling.LANCZOS)
 mask=Image.new('L',(2304,1536),255);draw=ImageDraw.Draw(mask)
 for y in range(30):
  draw.line((0,y,2303,y),fill=round(y/30*255));draw.line((0,1535-y,2303,1535-y),fill=round(y/30*255))
 result.paste(source,(0,834),mask);result.save(D/(id+'-installed.jpg'),quality=95)
 for suffix,box in [('center',(640,0,1664,3072)),('left',(0,0,640,3072)),('right',(1664,0,2304,3072))]:result.crop(box).save(A/(id+'-room-'+suffix+'.png'),optimize=True)
 print(id+' original registered room extended',flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(one,IDS))
