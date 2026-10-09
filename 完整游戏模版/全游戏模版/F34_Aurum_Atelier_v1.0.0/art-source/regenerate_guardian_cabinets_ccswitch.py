"""Commission the four F34 cabinet-room paintings through the configured CC Switch provider.

The existing image is used as a *geometry* reference only. New scenes have an
empty built-in mascot niche. Review each generated raw painting before running
--install; alignment is measured against CabinetGeometry.ts, not guessed from
text prompts. Credentials remain in CC Switch and never enter project files.
"""
from __future__ import annotations
import argparse, base64, json, time, uuid, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path
from PIL import Image
from generate_ccswitch import provider

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/resources/art'
RAW=ROOT/'art-source/raw'
GEOMETRY={
 'golden-hour': ((293,462,438,322),(263,432,499,321)),
 'jade-treasury': ((302,468,420,396),None),
 'pearl-palace': ((284,498,455,320),None),
 'ruby-revel': ((298,516,427,306),None),
}
BASE=('Create a NEW fully integrated portrait illustration for an exquisite commercial Cocos slot cabinet in a ceremonial jewelry atelier. '
 'Use the input image only as a precise PLACEMENT BLUEPRINT: keep the relative size and location of its one large black reel-glass aperture, blank upper title plaque, three separate blank dark meter windows immediately under the screen, and physical three-key control console. '
 'Reimagine all visible materials, relief sculpture, cabinetry and room as NEW artwork. The cabinet is a substantial physical piece structurally joined to the room by shared stone floor, rear architectural pilasters, correct contact shadows and natural reflected light. '
 'Its large dark glass aperture must remain fully blank, with a thin, complete fitted metal bezel. All meter windows and title marquee are empty for live overlays. No writing, numbers, fake reels, symbols, characters, animals, or UI cards. '
 'Below the control console, sculpt a generous EMPTY recessed alcove and broad marble-and-metal foot platform INTO the cabinet SAME central base on the {side} half, to house a separate full-body mascot later. The WHOLE CABINET remains centered and entirely within the central 50% of portrait canvas, including the alcove. Do not add a side throne, a separate arch beside the cabinet, or move the screen to one side. Keep the integrated niche below the left/right meter inside the already existing width, with 40%-cabinet-width clear character space from arch to platform; molding runs behind the alcove, never in front. '
 'The alcove and cabinet must have identical inlay material, perspective and lighting, not a pasted-on box. Keep central and opposite base relief balanced. Bright refined natural illumination, crisp gemstone and metallic micro-detail, no plastic bloom or busy floating effects. '
 'The whole scene is one uninterrupted illustration edge to edge, with room continuing naturally on both sides. Smartphone portrait 2:3, fully opaque, no watermark. ')
THEMES={
 'golden-hour':('LEFT','COIN ENGRAVER: chased champagne brass, deep malachite enamel, carved coin relief, milled gold edges, tiny amber stones; a minting atelier flooded by warm amber window light. Coins are embedded in the architecture and gathered near the feet, never covering the screen.'),
 'jade-treasury':('RIGHT','SAPPHIRE FACETER: architectural cut-sapphire shoulders, blue lapis enamel, champagne-gold gem prongs, deep cobalt glass glints and finely carved radial facets, in a gem-cutting pavilion with soft blue and gold light. A sapphire-feathered owl will occupy the empty right alcove later; do not draw the owl.'),
 'pearl-palace':('RIGHT','PEARL LOOM: lustrous ivory nacre, pearl strings anchored naturally into the curved cabinet architecture, satin rose-gold filigree and warm pink reflected light, in a pearl atelier with shell relief columns. A pearlescent swan will occupy the empty right alcove later; do not draw the swan.'),
 'ruby-revel':('LEFT','CROWN FOUNDRY: deep crimson enamel, finely hammered rose-gold crown arch, ruby settings and an elegant ceremonial forge room in warm red-gold light, no harsh fire effects. A joyful royal lion will occupy the empty left alcove later; do not draw the lion.'),
}
def generate_one(name:str,url:str,key:str)->str:
 output=RAW/(name+'-guardian-room.png')
 if output.exists():return f'{name}: existing raw painting'
 ref_path=RAW/'golden-hour-guardian-room.png' if name!='golden-hour' else ART/(name+'-environment.png')
 ref=Image.open(ref_path).convert('RGB').resize((1024,1536),Image.Resampling.LANCZOS)
 buffer=BytesIO();ref.save(buffer,format='PNG');reference=buffer.getvalue()
 side,theme=THEMES[name];prompt=BASE.format(side=side)+theme+' Retain the reference CENTRAL cabinet footprint and blank mechanical openings, but reimagine the entire surface design and room with this theme; no original coin-face relief if this is not the coin theme.'
 boundary='----f34'+uuid.uuid4().hex
 data=[]
 for field,value in [('model','gpt-image-2.5'),('prompt',prompt),('size','1024x1536'),('quality','high'),('background','opaque')]:
  data.append((f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"\r\n\r\n{value}\r\n').encode())
 data.append((f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="geometry-reference.png"\r\nContent-Type: image/png\r\n\r\n').encode()+reference+b'\r\n')
 data.append((f'--{boundary}--\r\n').encode())
 req=urllib.request.Request(url+'/images/edits',b''.join(data),{'Content-Type':f'multipart/form-data; boundary={boundary}','Authorization':'Bearer '+key})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=360) as response:datum=json.load(response)['data'][0]
   image=Image.open(BytesIO(base64.b64decode(datum['b64_json']))).convert('RGB')
   image.save(output,optimize=True)
   return f'{name}: generated {image.size}'
  except Exception as exc:
   if attempt==2:return f'{name}: FAILED {type(exc).__name__} {str(exc)[:100]}'
   time.sleep(3*(attempt+1))
 return f'{name}: failed'
def align(name:str,source:tuple[int,int,int,int]):
 target,_=GEOMETRY[name]
 sx=target[2]/source[2];ox=target[0]-source[0]*sx
 im=Image.open(RAW/(name+'-guardian-room.png')).convert('RGB')
 # Stretch the dark glass to the live reel aperture. Map the architecture above
 # and below it separately so the mascot plinth stays on-screen, rather than
 # dragging the entire cabinet foot beyond a small phone's safe bounds.
 stops=((0,source[1],0,target[1]),
        (source[1],source[1]+source[3],target[1],target[1]+target[3]),
        (source[1]+source[3],1536,target[1]+target[3],1536))
 calibrated=Image.new('RGB',(1024,1536))
 for a,b,c,d in stops:
  sy=(d-c)/(b-a)
  band=im.transform((1024,d-c),Image.Transform.AFFINE,
       (1/sx,0,-ox/sx,0,1/sy,a),resample=Image.Resampling.BICUBIC)
  calibrated.paste(band,(0,c))
 calibrated.resize((2048,3072),Image.Resampling.LANCZOS).save(ART/(name+'-environment.png'),optimize=True)
 print(f'{name}: fitted {source} -> {target}; integrated plinth retained')
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--install',action='store_true');parser.add_argument('--name',choices=THEMES);parser.add_argument('--screen',help='Measured x,y,w,h in the generated 1024x1536 image')
 args=parser.parse_args()
 names=[args.name] if args.name else list(THEMES)
 if args.install:
  for name in names:
   source=tuple(map(int,args.screen.split(','))) if args.screen else GEOMETRY[name][1]
   if source is None:raise SystemExit(f'Measure {name} screen and pass --screen x,y,w,h')
   align(name,source)
 else:
  url,key=provider()
  with ThreadPoolExecutor(max_workers=2) as pool:
   for result in pool.map(lambda n:generate_one(n,url,key),names):print(result,flush=True)
