"""Commission original F43 art through the locally configured CC Switch image provider.
Credentials stay in CC Switch and are neither logged nor stored with the project.
Usage: python3 art-source/generate_ccswitch.py core|atlas|controls|finish
"""
from __future__ import annotations
import base64, concurrent.futures, json, re, sqlite3, sys, time, urllib.error, urllib.request
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageOps, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/resources/art'; RAW=ROOT/'art-source/raw'
CC_DB=Path.home()/'.cc-switch/cc-switch.db'
# Output canvas sizes are taken from assets already commissioned for F43.
STYLE=''
TASKS=json.loads((ROOT/'art-source/original-commissions.json').read_text())
def provider():
 con=sqlite3.connect(CC_DB)
 row=con.execute('select settings_config from providers where app_type=? and is_current=1',('codex',)).fetchone()
 if not row: raise RuntimeError('No current Codex provider in CC Switch')
 d=json.loads(row[0]);match=re.search(r'base_url\s*=\s*"([^"]+)"',d['config'])
 if not match or not d.get('auth',{}).get('OPENAI_API_KEY'):raise RuntimeError('CC Switch image provider unavailable')
 return match.group(1).rstrip('/'),d['auth']['OPENAI_API_KEY']
def output_size(name):
 return (2304,1536) if TASKS.get(name,[''])[0]=='wide' else (1024,1536) if TASKS.get(name,[''])[0]=='portrait' else (1024,1024)
def generate(name,prompt,url,key):
 raw=RAW/(name+'.png');final=ART/(name+'.png')
 if final.exists():return name+' already present'
 kind=TASKS[name][0];portrait=kind=='portrait';wide=kind=='wide'
 body={'model':'gpt-image-2.5','prompt':STYLE+prompt,'size':'1536x1024' if wide else '1024x1536' if portrait else '1024x1024','n':1,'quality':'high','background':'opaque' if portrait or wide else 'transparent'}
 req=urllib.request.Request(url+'/images/generations',json.dumps(body).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+key})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=240) as resp: datum=json.load(resp)['data'][0]
   im=Image.open(BytesIO(base64.b64decode(datum['b64_json']))).convert('RGBA');raw.parent.mkdir(parents=True,exist_ok=True);im.save(raw)
   size=(2304,1536) if wide else output_size(name)
   if portrait or wide:im=ImageOps.fit(im,size,method=Image.Resampling.LANCZOS).convert('RGB')
   else:
    canvas=Image.new('RGBA',size);fitted=ImageOps.contain(im,(int(size[0]*.96),int(size[1]*.96)),method=Image.Resampling.LANCZOS)
    canvas.alpha_composite(fitted,((size[0]-fitted.width)//2,(size[1]-fitted.height)//2));im=canvas
   ART.mkdir(parents=True,exist_ok=True);im.save(final,optimize=True)
   if name.startswith('symbols'):
    im.filter(ImageFilter.GaussianBlur(11)).save(ART/(name+'-blur.png'))
   if name.startswith('controls-') or name in ('frames','plates'):
    source=Image.open(raw).convert('RGBA')
    for k in range(4):
     cell=source.crop(((k%2)*source.width//2,(k//2)*source.height//2,(k%2+1)*source.width//2,(k//2+1)*source.height//2));bbox=cell.getchannel('A').getbbox()
     if bbox:cell=cell.crop(bbox)
     target=('canopy-button-'+str(int(name[-1])*4+k)) if name.startswith('controls-') else ('canopy-frame-'+str(k) if name=='frames' else 'canopy-soft-plate-'+str(k))
     size=output_size(target);fitted=ImageOps.contain(cell,(int(size[0]*.96),int(size[1]*.96)),method=Image.Resampling.LANCZOS)
     tile=Image.new('RGBA',size);tile.alpha_composite(fitted,((size[0]-fitted.width)//2,(size[1]-fitted.height)//2));tile.save(ART/(target+'.png'),optimize=True)
   return name+' generated'
  except urllib.error.HTTPError as err:
   if err.code not in (429,500,502,503,504) or attempt==2:return f'FAILED {name}: HTTP {err.code}'
  except Exception as err:
   if attempt==2:return f'FAILED {name}: {type(err).__name__}'
  time.sleep((attempt+1)*5)
 return 'FAILED '+name
def main():
 group=sys.argv[1] if len(sys.argv)>1 else 'core';url,key=provider()
 selected=[(n,p) for n,(g,p) in TASKS.items() if group=='all' or g==group or n==group or (group=='scenes' and (g in ('wide','portrait') or n.endswith('-guardian') or n=='canopy-brand')) or (group=='details' and not(g in ('wide','portrait') or n.endswith('-guardian') or n=='canopy-brand'))]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futures=[pool.submit(generate,n,p,url,key) for n,p in selected]
  for future in concurrent.futures.as_completed(futures):print(future.result(),flush=True)
 # Finish after all source commissions land; never leave the legacy whole-atlas
 # fitting/equal-cell outputs installed as production artwork.
 from prepare_atlases import prepare as prepare_atlases
 required=['symbols-'+mode for mode in ['golden-strings','sapphire-harp','ruby-brass','pearl-rhythm']]+['interfaces','canopy-destinations','optics','frames','plates','win-frames','award-titles']+['controls-'+str(i) for i in range(4)]
 if all((RAW/(name+'.png')).exists() for name in required):prepare_atlases()
if __name__=='__main__':main()
