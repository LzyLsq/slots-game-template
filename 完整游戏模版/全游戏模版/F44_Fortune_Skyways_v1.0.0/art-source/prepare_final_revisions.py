"""Apply only F44 optical, marquee and unlabelled-airship revisions.

Run after prepare_atlases.py. Retains registered rooms, articulated guardian art,
other symbol cells and interface/control assets. Requires Pillow/OpenCV/NumPy.
"""
from pathlib import Path
import json, importlib.util
from PIL import Image, ImageOps
import numpy as np

P = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('f44_atlas', P/'art-source/prepare_atlases.py')
prep = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prep)
ART = prep.ART

def clean(im):
    a = np.array(im.convert('RGBA'))
    a[:, :, 3][a[:, :, 3] < 4] = 0
    return Image.fromarray(a)

# Alpha-trim each of the four intentionally shallow title boards.
source = clean(Image.open(prep.RAW/'marquees-v2.png'))
limits = [0, 190, 360, 530, source.height]
for i in range(4):
    im = source.crop((0, limits[i], source.width, limits[i+1]))
    prep.save('canopy-title-'+str(i), im.crop(im.getchannel('A').getbbox()))
source = clean(Image.open(prep.RAW/'rays-v3.png'))
canvas = Image.new('RGBA', (1024, 1024))
source = ImageOps.contain(source, (976, 976), Image.Resampling.LANCZOS)
canvas.alpha_composite(source, ((1024-source.width)//2, (1024-source.height)//2))
prep.save('festival-gold-rays-v2', canvas)

# Renderer order is glint/aura/streak/twinkle; never put miniature scenery here.
source = clean(Image.open(prep.RAW/'optics-v2.png'))
w, h = source.size
objects = []
for k in [0, 1, 3, 2]:
    im = source.crop(((k%2)*w//2, (k//2)*h//2, (k%2+1)*w//2, (k//2+1)*h//2))
    b = im.getchannel('A').point(lambda a: 255 if a > 5 else 0).getbbox()
    objects.append(im.crop(b))
prep.report['optics'] = {'revision':'optics-v2','sourceSize':[w,h], 'semanticOrder':['glint','aura','streak','twinkle']}
optics_crops = prep.pack('optics', objects, 2, 2, 512, 18)

# Index seven is the mode's treasure airship. It has no SCATTER label: only the
# elephant cargo feature gives it a feature role; other three use it as art.
airships = prep.extract('airships-unlabelled-v2', 2, 2, 128)
crop_file = P/'assets/scripts/ui/SymbolCrop.ts'
text = crop_file.read_text()
head, body = text.split('export const ART_CROPS:', 1)
symbol_decl, symbol_js = head.split('=', 1)
symbols = json.loads(symbol_js.strip().rstrip(';'))
art_decl, art_js = body.split('=', 1)
art = json.loads(art_js.strip().rstrip(';'))
art['optics'] = optics_crops
revision_report = {}
for mode, ship in zip(prep.MODES, airships):
    fitted = ImageOps.contain(clean(ship), (220, 220), Image.Resampling.LANCZOS)
    tile = Image.new('RGBA', (256, 256))
    tile.alpha_composite(fitted, ((256-fitted.width)//2, (256-fitted.height)//2))
    box = tile.getchannel('A').point(lambda a: 255 if a > 6 else 0).getbbox()
    x0, y0, x1, y1 = box
    crop = [max(0,x0-10), max(0,y0-10), min(256,x1+10), min(256,y1+10)]
    crops = [crop[0],crop[1],crop[2]-crop[0],crop[3]-crop[1]]
    name = 'symbols-'+mode
    atlas = Image.open(ART/(name+'.png')).convert('RGBA')
    blurred = Image.open(ART/(name+'-blur.png')).convert('RGBA')
    atlas.paste(tile,(768,256))
    blurred.paste(prep.premultiplied_blur(tile),(768,256))
    prep.save(name,atlas)
    prep.save(name+'-blur',blurred)
    symbols[name][7] = crops
    revision_report[mode] = {'index':7,'crop':crops,'proportional':True,'gutterPixels':18,'label':None}
prep.save('symbols',Image.open(ART/'symbols-golden-otter.png').convert('RGBA'))
prep.save('symbols-blur',Image.open(ART/'symbols-golden-otter-blur.png').convert('RGBA'))
symbols['symbols'] = symbols['symbols-golden-otter']
crop_file.write_text(symbol_decl+'='+json.dumps(symbols)+';\nexport const ART_CROPS:'+art_decl+'='+json.dumps(art)+';\n')
(P/'docs/final-art-revisions.json').write_text(json.dumps({'revisions':['marquees-v2','rays-v3','optics-v2','airships-unlabelled-v2'],'airships':revision_report,'extraction':prep.report},indent=2)+'\n')
print('Four unlabelled ships, marquees and optical revisions ready')
