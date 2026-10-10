"""Commission original F36 art through the locally configured CC Switch image provider.
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
# Output canvas sizes are taken from assets already commissioned for F36.
STYLE='Original AAA mobile social slot game art for GOLDEN WILDS, a joyous wildlife fortune expedition. Sculpted champagne gold, refined red and emerald lacquer, luminous carved stone, rich satin highlights, exquisite jewel detail, cheerful warm reflected light, abundant REAL dimensional gold coins, delicate ornaments. Elegant theme-coherent 3D painted art, never flat vectors, never plastic, no watermark. '
TASKS={'salon': ('core',
           'Portrait luxury expedition reception in a SUNLIT golden wildlife conservatory, elegant carved '
           'wood and hammered gold columns, arched tropical glasshouse, leaf canopies at edges, welcoming '
           'small treasure fountain below, clear warm parchment-toned center for sign-in controls; no words '
           'or figures. Fully detailed warm daylight, no blur or blank dark gradients.'),
 'canopy-hall-soft': ('core',
                      'Portrait panoramic GOLDEN WILDLIFE EXPEDITION hall, an open airy golden conservatory '
                      'from foreground curved stone terrace to distant sun temple, jungle waterfall, lotus '
                      'lake and moon pavilion; lush painted landscape, shallow gold treasure basins in '
                      'bottom corners. Center clear for one destination portal and expedition compass. '
                      'Cohesive natural perspective, no cards, no lettering, no flat black background.'),
 'canopy-services': ('core',
                     'Portrait luxury explorer treasury reception pavilion, warm pale carved stone and teak, '
                     'polished brass desk around edges, rich gold foliage molding, expedition artifacts and '
                     'coins displayed to sides. Broad clean light parchment center for readable services, '
                     'continuous detailed jungle garden beyond arched windows. No text, no dark opaque empty '
                     'slabs.'),
 'sun-lion-environment': ('core',
                          'Portrait SINGLE complete physical luxury slot cabinet integrated into sun temple, '
                          'straight-on front view, honey gold, warm amber enamel, carved lion crest, '
                          'sandstone terraces and golden acacia trees. Perfectly symmetrical front cabinet, '
                          'photographic bevels and satin polished metal, not a floating sticker. Exact '
                          'normalized layout: empty sculptural marquee inside x20-80% y12-22%; ONE enormous '
                          'EMPTY DARK rectangular glass reel screen x10-90% y25-63%, no graphics inside; '
                          'thin bright fitted gold bezel; ONE broad physical console below x10-90% y67-84%, '
                          'clear flat dark lacquer recesses for three meters at y69% and three buttons at '
                          'y77%, NO painted buttons, NO writing. Full bottom pedestal y85-98% with '
                          'continuous carved gold fascia integrated into the cabinet architecture; visible '
                          'contact floor. Cabinet is embedded in a matching naturally lit architectural room '
                          'with landscape edges and coherent shadows. No animal anywhere in this painting, '
                          'no text, no symbols, no second screen. Carefully respect all proportions.'),
 'canopy-title-0': ('core',
                    'Transparent isolated shaped artistic title crest reading exactly "SUN LION" in '
                    'extremely crisp chunky gold sculpted lettering, huge easy-to-read two words, honey '
                    'gold, warm amber enamel, carved lion crest, sandstone terraces and golden acacia trees '
                    'detailing around ends, tiny lion crest above, coherent luxury wildlife theme. All '
                    'letters within central 80% width. No other words, wide horizontal layout.'),
 'symbols-sun-lion': ('atlas',
                      'Transparent 4x4 atlas, exactly 16 distinct isolated large luxury slot symbols, evenly '
                      'centered in their own square cells with broad alpha gutters 15% each. STRICT ORDER '
                      'left to right row by row: sun coin, acacia amber, gold bars, royal lion crown, temple '
                      'treasure chest, sun medallion, WILD lion golden shield, SCATTER sun idol, gold '
                      'anklet, acacia leaf, honey jar, red jewel, gold bell, small pyramid, golden lotus, '
                      'solar lantern. Consistent large 3D volume, crisp golden rims, correct single-object '
                      'anatomy, each tile distinct, no background or shadows outside objects; only WILD and '
                      'SCATTER/BONUS tiny integrated lettering allowed.'),
 'prize-sun-lion': ('atlas',
                    'Transparent isolated lavish treasure arrangement, sun temple ceremonial gold chest '
                    'opened with abundant gold coins and tiny lion crest, honey gold, warm amber enamel, '
                    'carved lion crest, sandstone terraces and golden acacia trees, wide rich cohesive '
                    'shape, beautiful realistic highlights, no text.'),
 'controls-0': ('controls',
                'Transparent strict 2x2 atlas of FOUR SEPARATE physical controls for SUN LION, honey gold, '
                'warm amber enamel, carved lion crest, sandstone terraces and golden acacia trees. Top left '
                'large raised gold domed SPIN button with small engraved curved arrow but NO letters, top '
                'right minus key, bottom left plus key, bottom right rectangular loop AUTO toggle with no '
                'letters. Each own fixed crafted gold base and lacquer inset, quiet dark readable center, '
                'tactile edges, evenly centered, at least 15% alpha gutters, no scenery. Different shapes '
                'for dome, rocker keys and toggle, coherent expensive cabinet hardware.'),
 'emerald-elephant-environment': ('core',
                                  'Portrait SINGLE complete physical luxury slot cabinet integrated into '
                                  'emerald jungle treasury, straight-on front view, emerald jade, gold '
                                  'elephant tusk-shaped arches, polished teak, rainforest waterfall. '
                                  'Perfectly symmetrical front cabinet, photographic bevels and satin '
                                  'polished metal, not a floating sticker. Exact normalized layout: empty '
                                  'sculptural marquee inside x20-80% y12-22%; ONE enormous EMPTY DARK '
                                  'rectangular glass reel screen x10-90% y25-63%, no graphics inside; thin '
                                  'bright fitted gold bezel; ONE broad physical console below x10-90% '
                                  'y67-84%, clear flat dark lacquer recesses for three meters at y69% and '
                                  'three buttons at y77%, NO painted buttons, NO writing. Full bottom '
                                  'pedestal y85-98% with continuous carved gold fascia integrated into the '
                                  'cabinet architecture; visible contact floor. Cabinet is embedded in a '
                                  'matching naturally lit architectural room with landscape edges and '
                                  'coherent shadows. No animal anywhere in this painting, no text, no '
                                  'symbols, no second screen. Carefully respect all proportions.'),
 'canopy-title-1': ('core',
                    'Transparent isolated shaped artistic title crest reading exactly "EMERALD ELEPHANT" in '
                    'extremely crisp chunky gold sculpted lettering, huge easy-to-read two words, emerald '
                    'jade, gold elephant tusk-shaped arches, polished teak, rainforest waterfall detailing '
                    'around ends, tiny elephant crest above, coherent luxury wildlife theme. All letters '
                    'within central 80% width. No other words, wide horizontal layout.'),
 'symbols-emerald-elephant': ('atlas',
                              'Transparent 4x4 atlas, exactly 16 distinct isolated large luxury slot '
                              'symbols, evenly centered in their own square cells with broad alpha gutters '
                              '15% each. STRICT ORDER left to right row by row: gold coin, jungle emerald, '
                              'gold bars, royal elephant crown, treasure basket, ivory lotus medal, WILD '
                              'elephant shield, BONUS leaf idol, jade anklet, tropical leaf, golden fruit, '
                              'red jewel, gold bell, decorated vase, lotus flower, emerald lantern. '
                              'Consistent large 3D volume, crisp golden rims, correct single-object anatomy, '
                              'each tile distinct, no background or shadows outside objects; only WILD and '
                              'SCATTER/BONUS tiny integrated lettering allowed.'),
 'prize-emerald-elephant': ('atlas',
                            'Transparent isolated lavish treasure arrangement, emerald jungle treasury '
                            'ceremonial gold chest opened with abundant gold coins and tiny elephant crest, '
                            'emerald jade, gold elephant tusk-shaped arches, polished teak, rainforest '
                            'waterfall, wide rich cohesive shape, beautiful realistic highlights, no text.'),
 'controls-1': ('controls',
                'Transparent strict 2x2 atlas of FOUR SEPARATE physical controls for EMERALD ELEPHANT, '
                'emerald jade, gold elephant tusk-shaped arches, polished teak, rainforest waterfall. Top '
                'left large raised gold domed SPIN button with small engraved curved arrow but NO letters, '
                'top right minus key, bottom left plus key, bottom right rectangular loop AUTO toggle with '
                'no letters. Each own fixed crafted gold base and lacquer inset, quiet dark readable center, '
                'tactile edges, evenly centered, at least 15% alpha gutters, no scenery. Different shapes '
                'for dome, rocker keys and toggle, coherent expensive cabinet hardware.'),
 'lotus-koi-environment': ('core',
                           'Portrait SINGLE complete physical luxury slot cabinet integrated into lotus lake '
                           'court, straight-on front view, ivory nacre, gold scallops, turquoise water '
                           'reflections, coral jade, lotus stone pavilion. Perfectly symmetrical front '
                           'cabinet, photographic bevels and satin polished metal, not a floating sticker. '
                           'Exact normalized layout: empty sculptural marquee inside x20-80% y12-22%; ONE '
                           'enormous EMPTY DARK rectangular glass reel screen x10-90% y25-63%, no graphics '
                           'inside; thin bright fitted gold bezel; ONE broad physical console below x10-90% '
                           'y67-84%, clear flat dark lacquer recesses for three meters at y69% and three '
                           'buttons at y77%, NO painted buttons, NO writing. Full bottom pedestal y85-98% '
                           'with continuous carved gold fascia integrated into the cabinet architecture; '
                           'visible contact floor. Cabinet is embedded in a matching naturally lit '
                           'architectural room with landscape edges and coherent shadows. No animal anywhere '
                           'in this painting, no text, no symbols, no second screen. Carefully respect all '
                           'proportions.'),
 'canopy-title-2': ('core',
                    'Transparent isolated shaped artistic title crest reading exactly "LOTUS KOI" in '
                    'extremely crisp chunky gold sculpted lettering, huge easy-to-read two words, ivory '
                    'nacre, gold scallops, turquoise water reflections, coral jade, lotus stone pavilion '
                    'detailing around ends, tiny koi fish crest above, coherent luxury wildlife theme. All '
                    'letters within central 80% width. No other words, wide horizontal layout.'),
 'symbols-lotus-koi': ('atlas',
                       'Transparent 4x4 atlas, exactly 16 distinct isolated large luxury slot symbols, '
                       'evenly centered in their own square cells with broad alpha gutters 15% each. STRICT '
                       'ORDER left to right row by row: gold coin, lotus bloom, gold bars, koi jade crown, '
                       'treasure shell, koi pearl medallion, WILD koi shield, SCATTER lotus idol, pearl '
                       'anklet, lotus leaf, pink shell, red jewel, gold bell, carved vase, lotus lantern, '
                       'water jewel. Consistent large 3D volume, crisp golden rims, correct single-object '
                       'anatomy, each tile distinct, no background or shadows outside objects; only WILD and '
                       'SCATTER/BONUS tiny integrated lettering allowed.'),
 'prize-lotus-koi': ('atlas',
                     'Transparent isolated lavish treasure arrangement, lotus lake court ceremonial gold '
                     'chest opened with abundant gold coins and tiny koi fish crest, ivory nacre, gold '
                     'scallops, turquoise water reflections, coral jade, lotus stone pavilion, wide rich '
                     'cohesive shape, beautiful realistic highlights, no text.'),
 'controls-2': ('controls',
                'Transparent strict 2x2 atlas of FOUR SEPARATE physical controls for LOTUS KOI, ivory nacre, '
                'gold scallops, turquoise water reflections, coral jade, lotus stone pavilion. Top left '
                'large raised gold domed SPIN button with small engraved curved arrow but NO letters, top '
                'right minus key, bottom left plus key, bottom right rectangular loop AUTO toggle with no '
                'letters. Each own fixed crafted gold base and lacquer inset, quiet dark readable center, '
                'tactile edges, evenly centered, at least 15% alpha gutters, no scenery. Different shapes '
                'for dome, rocker keys and toggle, coherent expensive cabinet hardware.'),
 'moon-fox-environment': ('core',
                          'Portrait SINGLE complete physical luxury slot cabinet integrated into moon '
                          'lantern pavilion, straight-on front view, deep warm plum lacquer, moon gold '
                          'filigree, crimson lanterns, carved apricot wood and fox crest. Perfectly '
                          'symmetrical front cabinet, photographic bevels and satin polished metal, not a '
                          'floating sticker. Exact normalized layout: empty sculptural marquee inside '
                          'x20-80% y12-22%; ONE enormous EMPTY DARK rectangular glass reel screen x10-90% '
                          'y25-63%, no graphics inside; thin bright fitted gold bezel; ONE broad physical '
                          'console below x10-90% y67-84%, clear flat dark lacquer recesses for three meters '
                          'at y69% and three buttons at y77%, NO painted buttons, NO writing. Full bottom '
                          'pedestal y85-98% with continuous carved gold fascia integrated into the cabinet '
                          'architecture; visible contact floor. Cabinet is embedded in a matching naturally '
                          'lit architectural room with landscape edges and coherent shadows. No animal '
                          'anywhere in this painting, no text, no symbols, no second screen. Carefully '
                          'respect all proportions.'),
 'canopy-title-3': ('core',
                    'Transparent isolated shaped artistic title crest reading exactly "MOON FOX" in '
                    'extremely crisp chunky gold sculpted lettering, huge easy-to-read two words, deep warm '
                    'plum lacquer, moon gold filigree, crimson lanterns, carved apricot wood and fox crest '
                    'detailing around ends, tiny fox crest above, coherent luxury wildlife theme. All '
                    'letters within central 80% width. No other words, wide horizontal layout.'),
 'symbols-moon-fox': ('atlas',
                      'Transparent 4x4 atlas, exactly 16 distinct isolated large luxury slot symbols, evenly '
                      'centered in their own square cells with broad alpha gutters 15% each. STRICT ORDER '
                      'left to right row by row: gold coin, moon amber, gold bars, fox gold crown, lantern '
                      'chest, moon jade medallion, WILD fox shield, SCATTER moon idol, gold bracelet, ginkgo '
                      'leaf, fortune pouch, red jewel, gold bell, lantern, lotus charm, moon lantern. '
                      'Consistent large 3D volume, crisp golden rims, correct single-object anatomy, each '
                      'tile distinct, no background or shadows outside objects; only WILD and SCATTER/BONUS '
                      'tiny integrated lettering allowed.'),
 'prize-moon-fox': ('atlas',
                    'Transparent isolated lavish treasure arrangement, moon lantern pavilion ceremonial gold '
                    'chest opened with abundant gold coins and tiny fox crest, deep warm plum lacquer, moon '
                    'gold filigree, crimson lanterns, carved apricot wood and fox crest, wide rich cohesive '
                    'shape, beautiful realistic highlights, no text.'),
 'controls-3': ('controls',
                'Transparent strict 2x2 atlas of FOUR SEPARATE physical controls for MOON FOX, deep warm '
                'plum lacquer, moon gold filigree, crimson lanterns, carved apricot wood and fox crest. Top '
                'left large raised gold domed SPIN button with small engraved curved arrow but NO letters, '
                'top right minus key, bottom left plus key, bottom right rectangular loop AUTO toggle with '
                'no letters. Each own fixed crafted gold base and lacquer inset, quiet dark readable center, '
                'tactile edges, evenly centered, at least 15% alpha gutters, no scenery. Different shapes '
                'for dome, rocker keys and toggle, coherent expensive cabinet hardware.'),
 'canopy-brand': ('core',
                  'Transparent isolated very premium art title reading exactly "GOLDEN WILDS", two-line '
                  'embossed sculpted champagne gold letters, restrained acacia leaf gold frame, small sun '
                  'coin in middle, richly legible at mobile size, no other writing.'),
 'canopy-destinations': ('core',
                         'Transparent strict 2x2 atlas of FOUR distinct large three-dimensional destination '
                         'portals, each contained in its own square with 12% alpha gutters: sun lion temple '
                         'with warm sun coin shrine, emerald elephant jungle arch with waterfall treasury, '
                         'lotus koi lake court with water treasure, moon fox lantern pavilion with gold moon '
                         'shrine. Each complete miniature architectural scene with broad pedestal, '
                         'perspective depth, exquisite gold and colored lacquer. No words, no buttons, no '
                         'surrounding plain rectangle, no characters.'),
 'interfaces': ('atlas',
                'Transparent strict 4x4 atlas of SIXTEEN individually centered premium 3D gold expedition '
                'interface icons with 20% transparent gutters. Exact reading order: avatar explorer '
                'portrait, gold coin stack, gift treasury, golden expedition compass, travel passport, music '
                'volume speaker, jungle landscape entrance, explorer supplies shop, mailbox with envelope, '
                'return curved arrow, sound-on bell, muted bell, open scroll rules, globe language, '
                'confirmation seal, lock account. Real crafted miniature objects, not line drawings, '
                'consistent champagne gold with jade and red accent, no lettering.'),
 'portraits': ('atlas',
               'Transparent strict 4x4 atlas of SIXTEEN welcoming diverse premium explorer avatar portraits, '
               'human adult travellers and natural four-legged lucky animals, lions, elephants, koi, foxes, '
               'pandas, rabbits; each in one circular gold passport bezel, distinct faces, lovely elegant '
               'smiling 3D art, correct anatomy, 15% alpha gutters, no text.'),
 'optics': ('atlas',
            'Transparent strict 2x2 atlas of FOUR high quality subtle VFX textures: top left soft warm '
            'diffuse light bloom, top right one irregular fine gold star glint, bottom left broad satin '
            'diagonal glass reflection, bottom right small soft luminous amber mote. Smooth feather alpha, '
            'no hard circles, no words, each within 15% gutters.'),
 'symbols': ('atlas',
             'Transparent strict 4x4 atlas of sixteen rich expedition treasury objects. First cells gold '
             'coin, gold bars, lucky red pouch, gold sun crest, then gem, coin chest, gold crown, carved '
             'lotus, compass, treasure key, lantern, scroll, gold gift, pearl, emerald, ruby. Each '
             'independently centered with 15% alpha gutters, 3D sculpted polished exquisite material, no '
             'words.'),
 'frames': ('controls',
            'Transparent strict 2x2 atlas of FOUR beautiful large portrait treasury dialogue frames, thin '
            'gold carved perimeter with square corners and bright even parchment stone center; wildlife '
            'expedition sun/emerald/lotus/moon corner motifs respectively. Empty readable warm ivory inside, '
            'separate alpha gutters, no words, no busy center decoration.'),
 'plates': ('controls',
            'Transparent strict 2x2 atlas of FOUR extremely WIDE thin expedition control plaques, each 3:1 '
            'horizontal ratio centered within own square cell: amber/gold, jade/teak, nacre/coral, '
            'plum/gold. Clean calm warm-dark lacquer central field for white labels, no icons, expensive '
            'carved ends and sculpted gold bevels, generous transparent gutters, no lettering. Exactly four '
            'isolated horizontal objects.'),
 'win-frames': ('finish',
                'Transparent strict 2x2 atlas of FOUR square winning-symbol gold PHOTO FRAMES with FULLY '
                'TRANSPARENT EMPTY center, exquisite thin beveled gold edge, four bright corner glints, '
                'sun/emerald/lotus/moon subtle accent respectively. Smooth natural metal no circles, no '
                'interior haze, no connecting lines, no letters. Separate isolated objects with 15% '
                'gutters.'),
 'award-titles': ('finish',
                  'Transparent strict 2x2 atlas of FOUR isolated wide grand celebratory artistic gold-letter '
                  'titles, exact words in order: "BIG WIN", "SUPER WIN", "MEGA WIN", "EPIC WIN". Large '
                  'highly readable sculpted gold letters with bright copper shadows, restrained diamond and '
                  'coin crest, different ornate grand shapes, no surrounding rectangle, each centered in its '
                  'own square with alpha gutters, no other text.')}
for name, theme in [('coin','sunlit lion temple'),('sapphire','emerald elephant jungle'),('pearl','golden koi lotus lake'),('ruby','moon fox lantern courtyard')]:
 TASKS['award-'+name+'-room']=('awardrooms','Portrait FULL architectural celebration stage inside the '+theme+', cheerful opulent wealth fantasy with flowing warm champagne light, coin fountains at outer sides, deep natural perspective, beautifully detailed carved gold ceremonial pillars and red silk banners, center broad illuminated empty sculpted ivory plaque x20-80% y62-74% for live reward number, spectacular chest of dimensional treasure below, space above for title x15-85% y10-25%. Integrated stage, not isolated sticker, not a flat wall, no letters or figures. Warm soft lights, no hard laser rings, no blurry background.')
TASKS['ledger-paper-room']=('service-materials','FULL FRAME warm ivory expedition ledger paper material, matte premium handmade parchment with subtle visible fine fibers and tiny natural mineral flecks, restrained embossed acacia leaves and tiny gold paw seal in four outer corners only. Beautiful natural soft ivory illumination, center 85% uninterrupted clean readable paper surface with very low contrast grain. Straight front view orthographic material, no perspective, no cast shadows across center, no gold frame, no writing, no letters, no figures, no animals, no dark vignette, no fold line. This is a refined real material surface for a luxury wildlife expedition ledger, not scenery.')
TASKS['ledger-frame-room']=('service-refinement','A single front-view rectangular luxurious expedition ledger page, full-frame portrait. Very thin exquisitely carved warm gold perimeter, subtle ruby and emerald corner inlays, coherent gold acacia leaf ornament ONLY within outer 5 percent of edges. Broad central 90 percent completely uninterrupted warm matte ivory parchment with refined visible soft paper fibers. NO animals, NO flowers, NO hanging banner, NO ornament jutting into center, NO words, NO letters, NO shadows across center. Precisely straight edges, square corners, orthographic flat view, expensive natural material, perfect symmetrical clean perimeter for text layout. Frame and parchment fill the image edge to edge. Center should stay calm and light.')
TASKS['interface-close']=('service-refinement','ONE single isolated premium three-dimensional exit cross for luxury wildlife expedition interface. Two short sculpted champagne-gold bars crossing at 90 degrees to form an unmistakable X, polished narrow bevel, warm reflected gold with deep amber edge shadow. Straight front view, symmetrical, no circle, no badge, no background, no extra objects, no leaves, no animals, no text, generous completely transparent margins.')
# Apple is a platform mark: preserve the system-font raster, never restyle it.
TASKS.pop('apple-mark',None)
def provider():
 con=sqlite3.connect(CC_DB)
 row=con.execute('select settings_config from providers where app_type=? and is_current=1',('codex',)).fetchone()
 if not row: raise RuntimeError('No current Codex provider in CC Switch')
 d=json.loads(row[0]);match=re.search(r'base_url\s*=\s*"([^"]+)"',d['config'])
 if not match or not d.get('auth',{}).get('OPENAI_API_KEY'):raise RuntimeError('CC Switch image provider unavailable')
 return match.group(1).rstrip('/'),d['auth']['OPENAI_API_KEY']
def output_size(name):
 p=ART/(name+'.png');return Image.open(p).size if p.exists() else ((1024,1536) if (name.endswith('-environment') or name.endswith('-room')) or name in ('salon','canopy-hall-soft','canopy-services') else (1024,1024))
def generate(name,prompt,url,key):
 raw=RAW/(name+'.png');final=ART/(name+'.png')
 if final.exists():return name+' already present'
 portrait=name in ('salon','canopy-hall-soft','canopy-services') or name.endswith('-environment') or name.endswith('-room')
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
