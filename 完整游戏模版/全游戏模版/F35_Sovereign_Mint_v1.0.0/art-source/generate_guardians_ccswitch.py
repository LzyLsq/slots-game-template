"""Generate four distinct F35 cabinet guardians through the local CC Switch image provider.
Never log credentials or raw provider replies.
"""
from pathlib import Path
import base64, concurrent.futures, json, os, re, sqlite3, urllib.request
from io import BytesIO
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/resources/art'
PROMPTS={
 'golden-hour':'an antique gold guardian LION, broad mane, powerful paws, right paw raised in a fortune-beckoning pose, on a low engraved brass plinth',
 'jade-treasury':'an elegant translucent EMERALD JADE QILIN, deer-dragon anatomy, gold antlers and scale accents, one forehoof lifted in a beckoning pose, on a low jade-and-brass plinth, not a lion',
 'pearl-palace':'a regal PEARLESCENT SEAHORSE, curved slender neck and shell fins, pearl-inlaid ivory and champagne gold, one fin extended to welcome fortune, on a low nacre-and-brass plinth, not a lion',
 'ruby-revel':'a majestic RUBY PHOENIX bird, faceted deep-red feathers with gold filigree, one wing raised gracefully in a beckoning pose, perched on a low ruby-and-brass plinth, not a lion',
}
STYLE=('Premium commercial 3D-rendered treasure slot cabinet sculpture. Mature museum-quality game art, harmonized antique brass and soft warm illumination, restrained luxury, physically believable relief and material depth. '
       'Full-figure three-quarter frontal view, feet/perch grounded into the plinth, clear readable silhouette at small mobile scale. Isolated true transparent-background character and plinth only. No environment, no text, no lettering, no rectangular frame, no sticker or excessive glow. ')
def provider():
 c=sqlite3.connect(os.path.expanduser('~/.cc-switch/cc-switch.db'))
 row=c.execute('select settings_config from providers where app_type=? and is_current=1',('codex',)).fetchone()
 if not row:raise RuntimeError('No active CC Switch provider')
 data=json.loads(row[0]); m=re.search(r'base_url\s*=\s*"([^\"]+)"',data.get('config',''))
 key=data.get('auth',{}).get('OPENAI_API_KEY')
 if not m or not key:raise RuntimeError('Current CC Switch provider has no image API configuration')
 return m.group(1).rstrip('/'),key

def render(item,url,key):
 ident,description=item
 request=urllib.request.Request(url+'/images/generations',json.dumps({'model':'gpt-image-2.5','prompt':STYLE+description,'size':'1024x1024','n':1,'quality':'high','background':'transparent'}).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+key})
 try:
  with urllib.request.urlopen(request,timeout=300) as response: payload=json.load(response)
  im=Image.open(BytesIO(base64.b64decode(payload['data'][0]['b64_json']))).convert('RGBA')
  if not im.getchannel('A').getextrema()[0]<250:raise RuntimeError('provider did not return transparent artwork')
  bbox=im.getchannel('A').point(lambda x: 255 if x>12 else 0).getbbox()
  if not bbox:raise RuntimeError('artwork is empty')
  im=im.crop(bbox);im.thumbnail((650,650),Image.Resampling.LANCZOS)
  canvas=Image.new('RGBA',(720,720));canvas.alpha_composite(im,((720-im.width)//2,690-im.height))
  path=OUT/('guardian-'+ident+'.png');canvas.save(path,optimize=True)
  return ident+' generated '+str(path)
 except Exception as exc:return ident+' FAILED '+type(exc).__name__+': '+str(exc)[:120]

if __name__=='__main__':
 url,key=provider()
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for result in pool.map(lambda item:render(item,url,key),PROMPTS.items()):print(result,flush=True)
