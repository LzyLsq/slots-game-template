"""Generate original F33 art with the locally configured CC Switch image provider.
No credentials are stored in the project. Each successful asset replaces its inherited scaffold counterpart.
"""
from __future__ import annotations
import base64,concurrent.futures,json,re,sqlite3,time,urllib.request,urllib.error
from io import BytesIO
from pathlib import Path
from PIL import Image,ImageOps,ImageFilter
ROOT=Path(__file__).resolve().parents[1]; ART=ROOT/'assets/resources/art'; RAW=ROOT/'art-source/raw'; PROMPTS=ROOT/'art-source/prompts'
STYLE='Premium original illustrated mobile treasure game, GOLDEN LIBRARY, a magical gilded bibliotheca of wealth. Rich tactile carved walnut, embossed antique gold leaf, deep lapis enamel, velvet red, luminous ivory, softly glowing amber jewels and heaps of beautifully minted coins. Crisp intricate but controlled details, coherent perspective, cinematic warm light, polished material highlights, joyful and luxurious, not a website, not flat color, no watermark. '
THEMES=[('GILDED INDEX','gilded index of lucky coins','carved walnut and honey-gold brass','ledger, embossed coin, bookmark, seal, quill, chest, wild open book'),('SAPPHIRE CIPHER','sapphire lock and vault keys','blue enamel, dark lapis and brushed gold','sapphire key, lock, gold seal, encoded tablet, coin, jeweled chest, wild cipher wheel'),('FORTUNE ATLAS','illuminated map of golden realms','ivory vellum, gold leaf, turquoise stone','compass, map scroll, globe, coin, golden ship token, amber vial, wild atlas'),('ROYAL FOLIO','royal secret manuscript treasury','burgundy morocco leather, antique gold and ruby jewels','royal book, ruby brooch, coin, crown seal, velvet purse, gilded chest, wild illuminated page')]
TASKS={
'salon':('portrait','Portrait welcoming entrance to the Golden Library, a monumental vaulted reading room with ornate shelves, arched amber-glass windows and tangible treasure coins at the bottom corners. Central lower third is a naturally illuminated empty ivory-and-walnut signing lectern surface for sign-in buttons; open architecture behind; no text, no UI, no figures.'),
'canopy-hall-soft':('portrait','Portrait grand Golden Library main hall, majestic golden rosette skylight, endless ornate curved shelves and carved walnut columns; a single raised central illuminated display lectern in middle and inviting passage to four archive wings. Coins glint along the bases, very clear central focal point with open foreground for entrance prompt, no text, no UI, no cards.'),
'canopy-services':('portrait','Portrait intimate Golden Library consultation gallery with carved walnut shelves, brass railings, hanging amber reading lamps and tangible treasure coins. Elegant empty central ivory parchment reading desk occupies much of central/lower frame for overlaid account, store, ranking, rewards text. Seamless full scene, no letters, no UI cards.'),
'canopy-destinations':('atlas','Four distinct standalone miniature magical archive exhibits in an exact 2 by 2 grid, each centered with transparent gutters between quadrants. Top-left GILDED INDEX a coin ledger lectern; top-right SAPPHIRE CIPHER a blue enamel lock vault; bottom-left FORTUNE ATLAS an illuminated map globe; bottom-right ROYAL FOLIO a burgundy jewel manuscript. Each is a sculpted physical doorway within a richly decorated library alcove, joyful inviting gold coin illumination. Strict separate quadrants; no text, no surrounding scene.'),
'interfaces':('atlas16','Sixteen premium tiny physical library navigation icons arranged exactly 4 by 4, each isolated in its own square cell on transparent ground, safe inset margins: golden back arrow, rule parchment, music bell, purse, coin, medal, book, avatar, arrow, settings key, sparkle, checkmark, star, gift, plus, minus. Engraved gold and sapphire material, consistent silhouettes, no text.'),
'portraits':('atlas16','Sixteen distinct storybook visitor portrait cameos arranged exactly 4 by 4, one face centered in each isolated transparent square with generous clean gutters. Friendly adults with diverse appearances, fine jewel-colored outfits and naturally warm expressions, gold cameo rim, no cropped heads, no text.'),
'optics':('atlas','Four subtle transparent cinematic material-light overlays, exact 2 by 2 separate quadrants, isolated on transparent ground: warm caustic glint, amber bokeh specks, soft gold edge reflection, delicate stained-glass highlight. No solid bands, no text.'),
'frames':('atlas','Four separate ornate game plaques exact 2 by 2 transparent grid, each isolated with clean gutters; gold-and-walnut, lapis-and-brass, ivory-vellum-and-gold, burgundy-leather-and-gold. Large EMPTY softly lit ivory or blue center for legible text, engraved corners. Front facing physical plaques, no text.'),
'plates':('atlas','Four separate long horizontal luxury mobile game physical button plates exact 2 by 2 transparent grid, each plate entirely contained in quadrant, generous gutters. One carved walnut/gold, one sapphire enamel/brass, one ivory vellum/gold, one burgundy leather/gold. Wide bright EMPTY center for clear dark button label, filigree only on ends, no text.'),
'apple-mark':('square','A single crisp classic black apple silhouette suitable as a Sign in with Apple identity mark, centered transparent background, no text, no surrounding decoration.'),
}
for i,(title,concept,material,symbols) in enumerate(THEMES):
 cabinet=('Portrait 1:2 full-bleed standalone slot cabinet mechanically built into a luxurious magical library alcove, theme '+title+'. '+material+'. '
 'A huge WIDE BLANK dark charcoal reel glass window as a straight rectangle occupies x=10%-90%, y=36%-60% of the full picture. Exact parallel horizontal and vertical edges, fully inside its metal bezel, no symbols, no writing or objects crossing the glass. '
 'Above it an ornate physical title marquee at y=26%-34% with EMPTY center, no words. Beneath it y=62%-78% a substantial sculpted integrated console with one large central circular SPIN button seat, two smaller pairs of side controls, three small inset meter areas. '
 'Strong depth and joins between cabinet, glass, control console and rear room, continuous high-resolution material detail. Scene fills entire frame from floor to ceiling, no text, no UI labels, no floating objects. '+concept+'.')
 TASKS[['golden-hour-tall','jade-treasury-tall','pearl-palace-tall','ruby-revel-tall'][i]]=('portrait',cabinet)
 TASKS[f'canopy-title-{i}']=('wide',f'Isolated horizontal physical gold-leaf illuminated manuscript title insignia reading exactly "{title}", deep {material} base and tiny coins at corners, clear centered uppercase letters, crisp and readable, front facing, transparent margins, no extra words.')
 TASKS[f'prize-{["golden-hour","jade-treasury","pearl-palace","ruby-revel"][i]}']=('square',f'Isolated ornate 3D treasure award centerpiece for {title}: a glorious open enchanted book atop a decorated chest with tumbling genuine gold coins, a {material} crown-like arch and warm lens-glints, physically grounded, joyful polished luxury, transparent background, no text.')
 TASKS[f'symbols-{["golden-hour","jade-treasury","pearl-palace","ruby-revel"][i]}']=('atlas16',f'EXACT 4 by 4 grid of sixteen DIFFERENT finely modeled premium slot symbol artifacts from {concept}: {symbols}; include a gold bullion bar, coin purse, jeweled ring, treasure chest and meaningful wild and scatter artifacts. Every symbol is one complete centered object on transparent background within its OWN square cell, ample empty gutters, no joined elements, no words or UI, consistent object scale and light direction. {material}.')
 TASKS[f'controls-{i}']=('atlas',f'EXACT 2 by 2 grid of four separate tactile physical slot machine buttons for {title}. Each button isolated and centered inside its OWN equal transparent quadrant with generous gutters. Upper left a luxurious primary round SPIN wheel with clockwise arrow and gold coin; upper right smaller sculpted MINUS button with clear minus; lower left matching PLUS; lower right separate AUTO button with two looping arrows. Distinct {material} material, real bevel and pressed depth, no written labels.')

def provider():
 con=sqlite3.connect(Path.home()/'.cc-switch/cc-switch.db');row=con.execute('select settings_config from providers where app_type=? and is_current=1',('codex',)).fetchone();con.close()
 if not row:raise RuntimeError('No active CC Switch Codex provider')
 d=json.loads(row[0]);url=re.search(r'base_url\s*=\s*"([^"]+)"',d['config']).group(1).rstrip('/');return url,d['auth']['OPENAI_API_KEY']
def background(p):
 a=p.getchannel('A');return a.getbbox()
def save_piece(im,name,size):
 box=background(im)
 if box:im=im.crop(box)
 fitted=ImageOps.contain(im,(int(size[0]*.88),int(size[1]*.88)),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',size);canvas.alpha_composite(fitted,((size[0]-fitted.width)//2,(size[1]-fitted.height)//2));canvas.save(ART/(name+'.png'),optimize=True)
def process(name,im,kind):
 old=Image.open(ART/(name+'.png'));size=old.size;old.close()
 if kind=='portrait':im=ImageOps.fit(im,size,Image.Resampling.LANCZOS,centering=(.5,.5)).convert('RGB')
 elif kind=='wide':
  box=background(im)
  if box:im=im.crop(box)
  im=ImageOps.contain(im,size,Image.Resampling.LANCZOS)
 elif kind in ('atlas','atlas16'):
  canvas=Image.new('RGBA',size);count=2 if kind=='atlas' else 4
  for r in range(count):
   for c in range(count):
    cell=im.crop((c*im.width//count,r*im.height//count,(c+1)*im.width//count,(r+1)*im.height//count));box=background(cell)
    if box:cell=cell.crop(box)
    cell=ImageOps.contain(cell,(int(size[0]/count*.84),int(size[1]/count*.84)),Image.Resampling.LANCZOS)
    canvas.alpha_composite(cell,(int(c*size[0]/count+(size[0]/count-cell.width)/2),int(r*size[1]/count+(size[1]/count-cell.height)/2)))
  im=canvas
 else:
  canvas=Image.new('RGBA',size);im=ImageOps.contain(im,(int(size[0]*.94),int(size[1]*.94)),Image.Resampling.LANCZOS);canvas.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2));im=canvas
 im.save(ART/(name+'.png'),optimize=True)
 if name.startswith('symbols-'):
  blur=im.filter(ImageFilter.GaussianBlur(5));blur.save(ART/(name+'-blur.png'),optimize=True)
 if name.startswith('controls-'):
  i=int(name[-1]);src=im
  for j in range(4):save_piece(src.crop(((j%2)*src.width//2,(j//2)*src.height//2,(j%2+1)*src.width//2,(j//2+1)*src.height//2)),f'canopy-button-{i*4+j}',Image.open(ART/(f'canopy-button-{i*4+j}.png')).size)
 if name in ('frames','plates'):
  for j in range(4):save_piece(im.crop(((j%2)*im.width//2,(j//2)*im.height//2,(j%2+1)*im.width//2,(j//2+1)*im.height//2)),f'canopy-{"frame" if name=="frames" else "soft-plate"}-{j}',Image.open(ART/(f'canopy-{"frame" if name=="frames" else "soft-plate"}-{j}.png')).size)
def generate(item,url,key):
 name,(kind,prompt)=item;raw=RAW/(name+'.png');PROMPTS.mkdir(parents=True,exist_ok=True);RAW.mkdir(parents=True,exist_ok=True);(PROMPTS/(name+'.txt')).write_text(STYLE+prompt)
 if raw.exists():im=Image.open(raw).convert('RGBA');process(name,im,kind);return name+' from cache'
 size='1024x1536' if kind=='portrait' else '1536x1024' if kind=='wide' else '1024x1024'
 body={'model':'gpt-image-2.5','prompt':STYLE+prompt,'size':size,'n':1,'quality':'high','background':'opaque' if kind=='portrait' else 'transparent'}
 req=urllib.request.Request(url+'/images/generations',json.dumps(body).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+key})
 for attempt in range(4):
  try:
   with urllib.request.urlopen(req,timeout=300) as resp:d=json.load(resp)['data'][0]
   im=Image.open(BytesIO(base64.b64decode(d['b64_json']))).convert('RGBA');im.save(raw);process(name,im,kind);return name+' OK'
  except Exception as e:
   if attempt==3:return name+' FAILED '+type(e).__name__+' '+str(e)[:80]
   time.sleep(4*(attempt+1))
if __name__=='__main__':
 import sys
 url,key=provider();group=sys.argv[1] if len(sys.argv)>1 else 'all'
 selected=list(TASKS.items())
 if group=='core':selected=[x for x in selected if x[0] in ('salon','canopy-hall-soft','canopy-services','canopy-destinations') or x[0].endswith('-tall')]
 if group=='ui':selected=[x for x in selected if x[0] not in ('salon','canopy-hall-soft','canopy-services','canopy-destinations') and not x[0].endswith('-tall')]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  for out in pool.map(lambda item:generate(item,url,key),selected):print(out,flush=True)
