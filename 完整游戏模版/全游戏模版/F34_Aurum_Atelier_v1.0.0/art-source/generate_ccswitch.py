"""Commission original F34 art through the locally configured CC Switch image provider.
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
# Output canvas sizes are taken from assets already commissioned for F34.
STYLE=('Original premium mobile slot game illustration for AURUM ATELIER, an exquisite jewelry maker’s palace. '
       'Pearl-white carved stone, satin champagne gold, deep malachite enamel, warm ruby and sapphire accents, believable metal bevels and cut gemstones, '
       'bright elegant reflected light, careful spatial composition, crisp intricate detail at small scale, refined joy and abundant gold coins. '
       'Art directed as one coherent handcrafted game, no library, no books, no clockwork, no gears, no ocean, no forest, no flat web design, no watermark. ')
CABINET=('Tall portrait illustration of one complete physical luxury slot cabinet in a jewelry atelier, front-facing symmetrical. '
         'A LARGE clean dark rectangular reel glass aperture across 78 percent of total width, occupying vertical 38 to 62 percent; polished fitted metal bezel on all four sides. '
         'Above it a shaped raised marquee left EMPTY for separate art title; below it a single solid physical control console with three recessed meters and button sockets, no text or icons in these empty zones. '
         'Cabinet and surrounding room are one continuous three-dimensional scene; enough rim clearance around opening; realistic material reflections. ')
TASKS={
 'canopy-hall-soft':('core','Portrait grand entrance to an elite jewelry atelier: faceted glass ceiling catches golden sunset; central empty sculpted stone-and-brass exhibition pedestal for a selectable jewel cabinet; side alcoves with goldsmith tools and locked gem displays, gold coins in low corners. Deep perspective, inviting warm light; clear center and lower area for interface, no cards, no words.'),
 'salon':('core','Portrait login scene in the welcoming reception vestibule of a royal jewelry atelier, grand gold-framed windows, a cut gemstone chandelier above, pale carved stone and malachite inlay, coins and small gemstone cases at the edges, clear even-lit central zone for sign-in controls, no writing.'),
 'canopy-services':('core','Portrait service gallery of the royal jewelry atelier: polished marble, pearl shell inlays, jewel showcase edges and soft gold lamps; a broad bright clean ivory center for readable account shop ranking and rewards; coherent with the entrance, no words.'),
 'golden-hour-tall':('core',CABINET+'Distinct motif: the COIN ENGRAVER, heavy circular milled brass minting dies, ridged gold coin edges, cabochon amber setting, strong round shoulders and warm gilded light.'),
 'jade-treasury-tall':('core',CABINET+'Distinct motif: the SAPPHIRE FACETER, elegant angular sapphire glass architecture and precise gold prongs, cool blue beam refractions, cut-diamond shoulders; no coin press or gears.'),
 'pearl-palace-tall':('core',CABINET+'Distinct motif: the PEARL LOOM, graceful ivory nacre shell wings, string of lustrous pearls, braided satin gold and pearlescent curves; warm rose reflections, broad screen.'),
 'ruby-revel-tall':('core',CABINET+'Distinct motif: the CROWN FOUNDRY, theatrical yet refined royal ruby crown arch with hammered rose gold columns and molten gold shine, weighty carved base, deep crimson enamel; broad screen.'),
 'canopy-brand':('core','Isolated transparent premium wordmark, exactly AURUM ATELIER in large highly legible elegant embossed champagne-gold lettering, jewelry engraving, tiny faceted gemstone over first A, warm glint, no other text.'),
 'canopy-title-0':('core','Isolated transparent artistic title plaque with exactly COIN ENGRAVER in clear large gold lettering, small stamped gold coin and chasing-tool detail, premium jewelry atelier style, no other words.'),
 'canopy-title-1':('core','Isolated transparent artistic title plaque with exactly SAPPHIRE FACETER in clear large gold lettering, framed by tiny cut sapphire facets and gold prongs, premium jewelry atelier style, no other words.'),
 'canopy-title-2':('core','Isolated transparent artistic title plaque with exactly PEARL LOOM in clear large gold lettering, delicate nacre swirls and pearl string at edges, premium jewelry atelier style, no other words.'),
 'canopy-title-3':('core','Isolated transparent artistic title plaque with exactly CROWN FOUNDRY in clear large gold lettering, small ruby crown and forged gold motifs, premium jewelry atelier style, no other words.'),
 'canopy-destinations':('atlas','Transparent strict 2x2 evenly divided atlas of four miniature independent jewel atelier exhibitions, one contained in each quadrant with ample transparent gutter: top left engraved coin coffer, top right sapphire-cutting display, bottom left luminous pearl loom, bottom right ruby crown forge. Beautiful gold craftsmanship, no frames crossing cells, no text.'),
 'symbols-golden-hour':('atlas','Transparent STRICT 4x4 grid of 16 separately centered luxury gold engraving symbols, reading order: gold coin, engraved coin, gold bullion, jeweler loupe, amber stone, wax seal, golden ring, minting die, clasp, coin purse, gold key, gemstone, wild golden sun seal, blue crystal, treasure case, royal crown. No text, no touching cell edges.'),
 'symbols-jade-treasury':('atlas','Transparent STRICT 4x4 grid of 16 separately centered sapphire lapidary symbols, reading order: blue sapphire, gold coin, facet rough stone, tiny sapphire prism, gold bullion, cutters loupe, jewel necklace, jeweler caliper, velvet purse, sapphire case, royal brooch, blue crystal, wild diamond star, bonus sapphire, golden clasp, crown. No text, no touching cell edges.'),
 'symbols-pearl-palace':('atlas','Transparent STRICT 4x4 grid of 16 separately centered pearl jewelry symbols, reading order: bright pearl, gold coin, gold bullion, rose shell, pearl pendant, silk cord, jeweled comb, nacre bowl, ivory charm, pearl crown, pearl case, oyster, wild luminous pearl star, pearl bracelet, gold key, pearl tiara. No text, no touching cell edges.'),
 'symbols-ruby-revel':('atlas','Transparent STRICT 4x4 grid of 16 separately centered ruby crown forge symbols, reading order: gold coin, ruby jewel, gold bullion, red velvet cushion, gemstone ring, gold chest, ruby crown, forging hammer, gold filigree, molten jewel, ruby pendant, royal medallion, wild glowing crown, fire opal, jewel case, diadem. No text, no touching cell edges.'),
 'interfaces':('atlas','Transparent strict 4x4 separate-cell atlas of luxury jewelry atelier game icons, reading order: gold coin, jewel coffer, wrapped gift, engraved trophy, portrait cameo, sealed mail, boutique door, rules book, settings jewel, back arrow, speaker, muted speaker, question, refresh, check, cross. Centered, clear gutters, no text.'),
 'portraits':('atlas','Transparent strict 4x4 separate-cell atlas of sixteen distinct friendly jeweler and collector character portrait cameos, varied skin tones and ages, beautifully painted faces, clothing in malachite sapphire ivory and ruby, each portrait fully enclosed in its own oval gold frame with clear gutters, no text.'),
 'optics':('atlas','Transparent strict 2x2 separate optical effects atlas: small soft champagne glint, translucent glass reflection sweep, pearl shimmer, warm soft gold starburst, each contained in its cell, no solid backdrop.'),
 'symbols':('finish','Transparent strict 4x4 separate-cell atlas of classic jewel atelier treasure objects, gold coin, sapphire, pearl, ruby, gold bullion, crown, ring, jewel chest, velvet purse, seal, key, brooch, wild gold gem, bonus crystal, ribbon, trophy. Crisp 3D object art, transparent gutters, no words.'),
 'prize-golden-hour':('finish','Isolated transparent grand prize sculpture of finely engraved gold coin medallion on carved pedestal, softly arcing loose coins at edges, visually open center for separate amount text, no words.'),
 'prize-jade-treasury':('finish','Isolated transparent grand prize sculpture of multifaceted royal sapphire in golden jewel setting, gold coins framing lower sides, visually open center for separate amount text, no words.'),
 'prize-pearl-palace':('finish','Isolated transparent grand prize sculpture of radiant oversized pearl cradled by nacre shell and champagne gold, coins at outer edges, open center for separate amount text, no words.'),
 'prize-ruby-revel':('finish','Isolated transparent grand prize sculpture of forged ruby crown with rich realistic gold and scattered coins, center open for separate amount text, no words.'),
 'apple-mark':('finish','One isolated crisp white official Apple logo silhouette suitable for a Sign in with Apple identity control, centered on transparent background, no text or decoration.'),
 'controls-0':('controls','Transparent strict 2x2 atlas of FOUR SEPARATE physical jewelry atelier buttons: top left large round gold coin SPIN with curved arrow, top right compact minus with one horizontal mark, bottom left compact plus, bottom right darker oval AUTO with loop arrows. Finely milled engraved brass, aligned, separate alpha gutters, no words.'),
 'controls-1':('controls','Transparent strict 2x2 atlas of FOUR SEPARATE sapphire faceter cabinet buttons: top left large sapphire-and-gold faceted SPIN with curved arrow, top right minus, bottom left plus, bottom right loop AUTO. Gold claws and translucent blue enamel, all distinct physical shapes, separate alpha gutters, no words.'),
 'controls-2':('controls','Transparent strict 2x2 atlas of FOUR SEPARATE pearl loom cabinet buttons: top left large nacre pearl SPIN with curved arrow, top right minus, bottom left plus, bottom right loop AUTO. Carved ivory shell and rose gold trim, each independent centered physical object, alpha gutters, no words.'),
 'controls-3':('controls','Transparent strict 2x2 atlas of FOUR SEPARATE ruby crown forge cabinet buttons: top left large engraved ruby gold SPIN with curved arrow, top right minus, bottom left plus, bottom right loop AUTO. Forged gold, ruby enamel and angular crown detailing, separate alpha gutters, no words.'),
 'frames':('controls','Transparent strict 2x2 atlas of four distinct jewelry atelier square dialogue frames, each bright ivory luminous center with readable space and gold edge details, corner themes coin, sapphire, pearl, ruby respectively; separate alpha gutters; no words.'),
 'plates':('controls','Transparent strict 2x2 atlas of four horizontal jewelry atelier button plaques: milled coin, sapphire facet, pearl nacre, ruby forged gold. Each wide with bright clean readable center and fine crafted outline, isolated transparent gutters, no words.'),
}
def provider():
 con=sqlite3.connect(CC_DB)
 row=con.execute('select settings_config from providers where app_type=? and is_current=1',('codex',)).fetchone()
 if not row: raise RuntimeError('No current Codex provider in CC Switch')
 d=json.loads(row[0]);match=re.search(r'base_url\s*=\s*"([^"]+)"',d['config'])
 if not match or not d.get('auth',{}).get('OPENAI_API_KEY'):raise RuntimeError('CC Switch image provider unavailable')
 return match.group(1).rstrip('/'),d['auth']['OPENAI_API_KEY']
def output_size(name):
 p=ART/(name+'.png');return Image.open(p).size if p.exists() else ((2048,4096) if name.endswith('-tall') else ((1024,1536) if name.endswith('-room') else (1024,1024)))
def generate(name,prompt,url,key):
 raw=RAW/(name+'.png');final=ART/(name+'.png')
 if final.exists():return name+' already present'
 portrait=name in ('salon','canopy-hall-soft','canopy-services') or name.endswith('-tall') or name.endswith('-room')
 body={'model':'gpt-image-2.5','prompt':STYLE+prompt,'size':'1024x1536' if portrait else '1024x1024','n':1,'quality':'high','background':'opaque' if portrait else 'transparent'}
 req=urllib.request.Request(url+'/images/generations',json.dumps(body).encode(),{'Content-Type':'application/json','Authorization':'Bearer '+key})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=240) as resp: datum=json.load(resp)['data'][0]
   im=Image.open(BytesIO(base64.b64decode(datum['b64_json']))).convert('RGBA');raw.parent.mkdir(parents=True,exist_ok=True);im.save(raw)
   size=output_size(name)
   if portrait:im=ImageOps.fit(im,size,method=Image.Resampling.LANCZOS).convert('RGB')
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
 selected=[(n,p) for n,(g,p) in TASKS.items() if group=='all' or g==group or n==group]
 with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
  futures=[pool.submit(generate,n,p,url,key) for n,p in selected]
  for future in concurrent.futures.as_completed(futures):print(future.result(),flush=True)
if __name__=='__main__':main()
