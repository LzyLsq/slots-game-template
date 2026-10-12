"""Create a coherent four-cabinet/guardian art family with the active local CC Switch provider.
Source renders are staged separately; only reviewed assets are promoted by postprocess.
"""
from pathlib import Path
import base64, concurrent.futures, json, sys, urllib.error, urllib.request
from io import BytesIO
from PIL import Image
from generate_guardians_ccswitch import provider
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'art-source'/'rebuild-20260930';OUT.mkdir(parents=True,exist_ok=True)
THEMES={
 'golden-hour':('the ceremonial Fortune Lion of the imperial coin foundry','warm aged gold and dark green enamel, hammered brass, ivory limestone','a seated guardian lion, heavy mane, one gold paw lifted in a gentle beckoning gesture; carved gold and deep-green enamel on a low brass base'),
 'jade-treasury':('the Emerald Qilin of the jade bullion vault','translucent emerald green jade, champagne brass, ivory stone','an elegant jade qilin, deer-dragon silhouette with branching antlers, one hoof raised in a fortune-inviting gesture; emerald nephrite and fine brass inlay on a low jade-brass base'),
 'pearl-palace':('the Pearl Seahorse of the tide treasury','warm ivory, nacre, champagne gold and muted teal','an upright pearl seahorse guardian with sculptural shell fins, one fin raised to beckon; nacre and champagne gold on a low sculpted pearl-and-gold base'),
 'ruby-revel':('the Ruby Phoenix of the crown treasury','deep ruby enamel, red garnet, dark gold and pale stone','a stately ruby phoenix with distinct broad wings, one wing raised to welcome fortune; carved red garnet and gold leaf on a low gilded ruby base'),
}
CABINET=("Create a NEW original front-facing vertical 3D-rendered premium slot cabinet, physically sculpted architectural machine, highly polished but softly lit, not a collage, not flat graphic. Frame fills the portrait canvas edge to edge, integrated architectural environment and cabinet are painted together, no blur. "
 "Exact front orthographic view, symmetry, clear commercial visual hierarchy. TOP 0-33%: a deep inset coin-mint medallion and a purpose-built EMPTY pedestal / recessed alcove at upper RIGHT for a separate moving guardian sculpture, with convincing stone/metal lip along its bottom; alcove must be empty, no animal. At 33-40%: a wide blank engraved metal title marquee with quiet readable center, no text. CENTRAL 42-58%: a large clean very DARK BLACK GLASS wide horizontal rectangular reel aperture, gold frame, EMPTY interior, no symbols, no grids, no lettering. At 60-74%: one sculpted console with four DISTINCT recessed physical round buttons, one central large spin socket and three smaller sockets, on material-matched enamel; no icon letters. At 75-85%: three quiet low inset coin counters, no numbers. BOTTOM 85-100%: heavily crafted plinth showing gold coins and gemstones. All regions precisely aligned on the same physical machine. No character, no mascot, no people, no text, no lettering, no UI cards, no stickers, no additional side cabinets. Mature festive casino treasure theme, rich but soft, tactile believable 3D, no harsh bloom. ")
MASCOT=("A new original premium 3D physical guardian sculpture designed SPECIFICALLY to inhabit the matching cabinet's upper-right inset alcove, viewed frontal-three-quarter facing inward to center. Full body cleanly separated, luxurious but mature, celebratory wealth and auspicious fortune, physical weight on a low architectural base. The gesture should read as a gentle fortune beckon, not a raised violent claw. Compact silhouette with enough empty alpha margin for hinged animation. Material and warm soft lighting match its cabinet. Transparent alpha background, no environment, no letters, no frame, no coins floating around character. ")
def create(task,url,key):
 kind,ident=task;name,material,character=THEMES[ident]
 path=OUT/f'{kind}-{ident}.png'
 if path.exists():return f'{kind} {ident}: cached'
 if kind=='cabinet':prompt=CABINET+f'Theme: {name}. Material palette: {material}. Distinctive relief language: minted coin wreaths, bullion and treasure motifs, custom carved crest and metal supports.';size='1024x1536';background='opaque'
 else:prompt=MASCOT+f'Theme: {name}. The sculpture is {character}. Materials: {material}.';size='1024x1024';background='transparent'
 request=urllib.request.Request(url+'/images/generations',json.dumps({'model':'gpt-image-2.5','prompt':prompt,'size':size,'n':1,'quality':'high','background':background}).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+key})
 try:
  with urllib.request.urlopen(request,timeout=360) as response: datum=json.load(response)['data'][0]
  im=Image.open(BytesIO(base64.b64decode(datum['b64_json']))).convert('RGBA')
  if kind=='mascot' and im.getchannel('A').getextrema()[0]>15:raise ValueError('missing transparency')
  im.save(path,optimize=True)
  return f'{kind} {ident}: {im.size} saved'
 except Exception as exc:return f'{kind} {ident}: FAILED {type(exc).__name__} {str(exc)[:100]}'
if __name__=='__main__':
 url,key=provider()
 tasks=[(kind,ident) for ident in THEMES for kind in ('cabinet','mascot')]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for value in concurrent.futures.as_completed([pool.submit(create,t,url,key) for t in tasks]):print(value.result(),flush=True)
