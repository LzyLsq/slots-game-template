"""Generate original F30 raster art with the image provider configured in local CC Switch.

No credential is copied to this project or printed. The CC Switch Codex proxy does
not expose /images/generations; this script uses the configured provider endpoint.
Run: python3 art-source/generate_ccswitch.py core [or: atlas, finish]
"""
from __future__ import annotations
import base64
import concurrent.futures
import json
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
from io import BytesIO

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/resources/art'
RAW = ROOT / 'art-source/raw'
CC_DB = Path.home() / '.cc-switch/cc-switch.db'
REFERENCE = Path('/Users/mengjunzhu/Desktop/slots/slots-game-template/完整游戏模版/全游戏模版/F20_Golden_Canopy_v1.0.0/assets/resources/art')
STYLE = ('Original luxury mobile game illustration, sharply detailed polished gilded brass and warm copper, '
         'deep sapphire enamel and honey amber glass, joyful refined clockwork treasury, realistic material reflections, '
         'soft celebratory lighting, coherent ornamental engraving, precise silhouette, no forest, no animals, no sea, '
         'no leaves, no web UI, no flat colors, no watermark. ')
CABINET = ('Portrait art for one large free-standing slot cabinet physically built into a magical clockwork treasury room. '
           'Large wide rectangular unadorned dark graphite reel glass aperture spanning 86% width at 36%-67% of full height; '
           'a finely fitted bevel surrounds the aperture on all four sides. Above the aperture, a raised metal marquee without words; '
           'beneath it, a single curved solid brass control console with a large empty central circular button seat, '
           'smaller side button seats and three inset meter windows. Avoid symbols or UI inside the dark screen. '
           'Cabinet fills the frame and feels deep, heavy and tactile, clean screen and aligned geometry, vertical 1:2 composition. ')
TASKS: dict[str, tuple[str, str]] = {
 'canopy-hall-soft': ('core', 'Portrait central hall: opulent CLOCKWORK FORTUNE treasury of time, monumental golden mechanical clock arch at top, huge central exhibition plinth for one game portal, deep sapphire inlays, warm amber light through gearwork windows, rich coins at the corners, empty central foreground reserved for selectable exhibit, harmonious perspective, no cards, no letters.'),
 'salon': ('core', 'Portrait login scene in a bright clockwork treasury vestibule, warm golden light from hanging pendulum lanterns, a large refined empty inset brass-and-ivory surface in lower middle for sign-in controls, etched coin vault door in background, corners with tangible clock gears and gold coins, no lettering or icons.'),
 'canopy-services': ('core', 'Portrait service scene inside a clockmaker treasury, ivory engraved metal wall with rich edge ornament, brass filigree, amber glass pendulums at upper sides, piles of gold coins low in corners, broad evenly lit clean center for readable account and shop panels, no lettering.'),
 'golden-hour-tall': ('core', CABINET+'Theme: giant polished pendulum crown with honey amber glass and golden chimes, warmly illuminated ticking escapement behind the marquee. Woven brass guilloché and gold coin motifs. No people.'),
 'jade-treasury-tall': ('core', CABINET+'Theme: imposing antique coin-press machine with hammered bronze pistons, minted coins, sapphire enamel guardrails and warm glowing dies. Distinct squarer industrial silhouette. No people.'),
 'pearl-palace-tall': ('core', CABINET+'Theme: tall golden hourglass machine, translucent amber sand chambers, graceful curved ivory-and-gold supports and polished convex glass. Distinct tapering silhouette. No people.'),
 'ruby-revel-tall': ('core', CABINET+'Theme: playful rotating jeweled clock tower vault, multiple brass gear crowns, ruby cabochons, enamel clockwork and a broader heavy base. Distinct cathedral-like silhouette. No people.'),
 'canopy-brand': ('core', 'Transparent isolated ornate luxury game logo with accurate large readable words CLOCKWORK FORTUNE in elegant embossed gold lettering, deep sapphire enamel shadows, a small precious amber clock and minted coins worked into the wordmark, front-on, clean alpha transparency, no extra words.'),
 'canopy-title-0': ('core', 'Transparent isolated elegant embossed golden title plaque reading PENDULUM VAULT, large legible type, small amber pendulum details, tasteful sapphire enamel, long horizontal wordmark, no other text.'),
 'canopy-title-1': ('core', 'Transparent isolated elegant embossed golden title plaque reading COIN PRESS, large legible type, tiny minted gold coin details, tasteful sapphire enamel, long horizontal wordmark, no other text.'),
 'canopy-title-2': ('core', 'Transparent isolated elegant embossed golden title plaque reading HOURGLASS HOARD, large legible type, tiny amber sandglass details, tasteful sapphire enamel, long horizontal wordmark, no other text.'),
 'canopy-title-3': ('core', 'Transparent isolated elegant embossed golden title plaque reading CROWN GEARS, large legible type, tiny ruby clockwork details, tasteful sapphire enamel, long horizontal wordmark, no other text.'),
 'canopy-destinations': ('atlas', 'Transparent image atlas as a strict 2 by 2 evenly spaced grid of four separate lavish miniature clockwork treasure exhibits, each fully contained in its own quadrant with clear transparent gutters: TOP LEFT amber pendulum crown and treasure coins, TOP RIGHT sapphire coin press and minted gold, BOTTOM LEFT gold hourglass and gem sand, BOTTOM RIGHT ruby gear vault and crowns. Polished toy realism, four visually distinct compositions; no text, no frames crossing cell boundaries.'),
 'interfaces': ('atlas', 'Transparent image atlas strict 4 by 4 separated grid, sixteen glossy high-quality miniature gold-and-sapphire game interface icons. In reading order: minted coin, small ornate chest, wrapped gift, champion trophy, elegant avatar portrait, sealed envelope, vault building, open gilded book, gear, back arrow, speaker, muted speaker, question mark, refresh arrow, check seal, cross seal. Every icon centered in its own cell, large transparent gaps between cells, no text, no extra symbols.'),
 'portraits': ('atlas', 'Transparent image atlas strict 4 by 4 separated grid of sixteen distinct charming clockwork storybook character portraits, friendly tiny toy-like inventors, collectors, and travelers of varied skin tones and clothes, each bust in their own circular gilded cameo, independent cell boundaries with generous transparency, expressive premium mobile game art, no letters, no cut-off faces.'),
 'optics': ('atlas', 'Transparent image atlas strict 2 by 2 grid of luminous optical effects: subtle amber glass reflection arc, soft gold diffused bloom, narrow diagonal champagne metal sweep, tiny ruby glint. Isolated transparent soft edges, no objects, no letters.'),
 'symbols-golden-hour': ('atlas', 'Transparent 4 by 4 icon atlas of 16 premium clockwork fortune symbols, equal cells, each distinct object exactly centered in its cell with generous transparent gutters, no overlapping objects or text. Reading order: gold coin with clock, stacked gold bars, amber jewel, tiny sandglass, jeweled ring, small bronze treasure coffer, pendulum crown, golden key, chime bell, chain pocket watch, mint die, velvet purse, ornate wild gear, safe vault door, ruby ribbon, ornate gear. Crisp sculpted metal, warm reflections, luxurious yet playful.'),
 'symbols-jade-treasury': ('atlas', 'Transparent 4 by 4 icon atlas of 16 premium minted treasure symbols, exact separate cells, each distinct object centered with transparent gutters, no crossing cell boundaries or letters. Reading order: minted gold coin, bright gold bullion, ruby die, hourglass, coin wreath ring, gold coin chest, gear crown, brass press lever, bronze mint bell, engraved coin pouch, royal medallion, velvet ribbon, ornate wild mint gear, bonus coin seal, press key, golden cog. Sharp rich metal and enamel.'),
 'symbols-pearl-palace': ('atlas', 'Transparent 4 by 4 icon atlas of 16 premium timekeeper treasure symbols, separate equal cells, centered objects with clean transparent gutters, no overlapping or lettering. Reading order: golden clock coin, gold ingots, ruby, amber hourglass, jeweled ring, ornate safe chest, golden clock crown, glass time vial, chime bell, coin purse, minted medallion, velvet ribbon, wild jeweled gear, sealed scatter clock, brass key, rotating cog. Brilliant sculpted gold, glass and enamel.'),
 'symbols-ruby-revel': ('atlas', 'Transparent 4 by 4 icon atlas of 16 premium crown gear treasure symbols, separate equal cells with centered objects and clean transparent margins, no overlap or text. Reading order: gear coin, gold bullion, sculpted ruby, amber jewel, clockwork ring, heavy treasure chest, ruby crown, vault key, chime bell, coin purse, embossed medallion, ruby ribbon, wild clock gear, bonus safe seal, golden key, decorative cog. Premium soft cartoon realism.'),
 'symbols': ('finish', 'Transparent 4 by 4 separate-cell atlas of classic clockwork treasury premium objects: gold coin, gold bullion, ruby, hourglass, jeweled ring, treasure chest, crown, key, bell, velvet coin pouch, medallion, ribbon, golden wild gear, vault safe, bronze press lever, cog. Each cell isolated with transparent gutters, crisp mobile game icon art.'),
 'prize-golden-hour': ('finish', 'Transparent isolated celebratory golden clockwork pendulum trophy framed by cascading minted coins and amber rays, center open for win text, elegant glossy mobile game reward art, no lettering.'),
 'prize-jade-treasury': ('finish', 'Transparent isolated celebratory sapphire coin press trophy framed by cascading minted coins and soft warm glints, center open for win text, premium mobile game reward art, no lettering.'),
 'prize-pearl-palace': ('finish', 'Transparent isolated celebratory golden hourglass trophy with softly arcing ruby jewels and gold coins, center open for win text, refined mobile game reward art, no lettering.'),
 'prize-ruby-revel': ('finish', 'Transparent isolated ruby clock gear crown reward trophy with flowing gold coins and a soft amber glow, center open for win text, elegant mobile game reward art, no lettering.'),
 'controls-0': ('controls', 'Transparent strict 2 by 2 atlas of four separate luxurious small physical buttons for an amber pendulum slot machine. TOP LEFT circular gold SPIN button embossed with one clear clockwise curved arrow. TOP RIGHT ivory brass MINUS button with a single horizontal minus. BOTTOM LEFT ivory brass PLUS button with one plus sign. BOTTOM RIGHT darker sapphire gold AUTO button embossed with two looping arrows. Each center aligned inside its own cell with empty gutters, distinct tactile metal and glass, no words, no adjoining ornaments.'),
 'controls-1': ('controls', 'Transparent strict 2 by 2 atlas of four separate physical coin press machine buttons. TOP LEFT embossed rotating mint die SPIN with one clockwise curved arrow. TOP RIGHT compact sapphire MINUS with one horizontal minus. BOTTOM LEFT compact sapphire PLUS with one plus. BOTTOM RIGHT octagonal bronze AUTO with two looping arrows. Hammered copper, milled coin edges and enamel, centered isolated buttons and clean generous alpha gutters, no words.'),
 'controls-2': ('controls', 'Transparent strict 2 by 2 atlas of four separate physical hourglass treasure machine buttons. TOP LEFT amber glass golden SPIN dial with one clockwise curved arrow. TOP RIGHT ivory hourglass MINUS button with one horizontal minus. BOTTOM LEFT ivory hourglass PLUS button with one plus. BOTTOM RIGHT sapphire sandglass AUTO button with two looping arrows. Shaped polished gold and ivory filigree, objects isolated within each quadrant and transparent gutters, no letters.'),
 'controls-3': ('controls', 'Transparent strict 2 by 2 atlas of four separate physical clockwork crown machine buttons. TOP LEFT ruby inlaid gold crown SPIN with one clockwise curved arrow. TOP RIGHT compact gold gear MINUS with one minus. BOTTOM LEFT compact gold gear PLUS with one plus. BOTTOM RIGHT cobalt ruby AUTO with two looping arrows. Distinct solid metal profiles, front on, isolated transparent gutters, no words.'),
 'frames': ('controls', 'Transparent strict 2 by 2 atlas of four separate square ornate interface frames, each with warm readable ivory parchment center and textured gold border, corner details of a pendulum, mint die, hourglass and crown respectively. Each independent square exactly contained in one quadrant with transparent separation. Flat front view suitable for scalable framed mobile game dialogue, no text.'),
 'plates': ('controls', 'Transparent strict 2 by 2 atlas of four separate wide horizontal polished brass-and-ivory game control plaques with readable luminous light center, delicate amber and blue enamel corner detail, pendulum, minted coin, hourglass and crown theme respectively. Each plaque in its own equal quadrant with ample transparent separation, no words.'),
 'apple-mark': ('controls', 'One isolated simple crisp black Apple logo silhouette for a Sign in with Apple control, front on transparent background, no words, no surrounding decoration.'),
}

def provider():
 con=sqlite3.connect(CC_DB)
 row=con.execute('select settings_config from providers where app_type=? and is_current=1',('codex',)).fetchone()
 if not row: raise RuntimeError('No current Codex provider configured in CC Switch')
 d=json.loads(row[0]); match=re.search(r'base_url\s*=\s*"([^"]+)"',d['config'])
 if not match or not d.get('auth',{}).get('OPENAI_API_KEY'): raise RuntimeError('CC Switch image provider configuration incomplete')
 return match.group(1).rstrip('/'),d['auth']['OPENAI_API_KEY']

def output_size(name):
 p=REFERENCE/(name+'.png')
 return Image.open(p).size if p.exists() else (1024,1024)

def generate(name, prompt, url, key):
 raw=RAW/(name+'.png'); final=ART/(name+'.png')
 if final.exists():return name+' already present'
 portrait = name in ('salon','canopy-hall-soft','canopy-services') or name.endswith('-tall')
 body={'model':'gpt-image-2.5','prompt':STYLE+prompt,'size':'1024x1536' if portrait else '1024x1024','n':1,'quality':'high','background':'opaque' if portrait else 'transparent'}
 req=urllib.request.Request(url+'/images/generations',json.dumps(body).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+key})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=180) as resp: datum=json.load(resp)['data'][0]
   im=Image.open(BytesIO(base64.b64decode(datum['b64_json']))).convert('RGBA');raw.parent.mkdir(parents=True,exist_ok=True); im.save(raw)
   size=output_size(name)
   if portrait:
    im=ImageOps.fit(im,size,method=Image.Resampling.LANCZOS,centering=(.5,.5)).convert('RGB')
   else:
    canvas=Image.new('RGBA',size,(0,0,0,0)); fitted=ImageOps.contain(im,(int(size[0]*.96),int(size[1]*.96)),method=Image.Resampling.LANCZOS)
    canvas.alpha_composite(fitted,((size[0]-fitted.width)//2,(size[1]-fitted.height)//2));im=canvas
   ART.mkdir(parents=True,exist_ok=True); im.save(final,optimize=True)
   if name.startswith('controls-') or name in ('frames','plates'):
    source=Image.open(raw).convert('RGBA')
    for k in range(4):
     cell=source.crop(((k%2)*source.width//2,(k//2)*source.height//2,(k%2+1)*source.width//2,(k//2+1)*source.height//2))
     if name.startswith('controls-'):
      theme=int(name[-1]);target=f'canopy-button-{theme*4+k}';target_size=output_size(target)
     elif name=='frames':target=f'canopy-frame-{k}';target_size=output_size(target)
     else:target=f'canopy-soft-plate-{k}';target_size=output_size(target)
     pad=cell.getchannel('A').getbbox()
     if pad:cell=cell.crop(pad)
     fitted=ImageOps.contain(cell,(int(target_size[0]*.96),int(target_size[1]*.96)),method=Image.Resampling.LANCZOS)
     tile=Image.new('RGBA',target_size);tile.alpha_composite(fitted,((target_size[0]-fitted.width)//2,(target_size[1]-fitted.height)//2))
     tile.save(ART/(target+'.png'),optimize=True)
   return f'{name} {size[0]}x{size[1]}'
  except urllib.error.HTTPError as err:
   if err.code not in (429,500,502,503,504) or attempt==2: return f'FAILED {name}: HTTP {err.code} {err.read(200).decode(errors="replace")}'
  except Exception as err:
   if attempt==2:return f'FAILED {name}: {type(err).__name__}: {str(err)[:100]}'
  time.sleep((attempt+1)*4)
 return 'FAILED '+name

def main():
 group=sys.argv[1] if len(sys.argv)>1 else 'core'; url,key=provider()
 selected=[(n,p) for n,(g,p) in TASKS.items() if g==group]
 with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
  futures={pool.submit(generate,n,p,url,key):n for n,p in selected}
  for future in concurrent.futures.as_completed(futures):print(future.result(),flush=True)

if __name__=='__main__':main()
