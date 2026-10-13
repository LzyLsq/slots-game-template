"""Pack the measured CC Switch glyphs; retain every glyph's authored aspect."""
import json
from collections import deque
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter, ImageChops
ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'assets/resources/art'
RAW = ROOT / 'art-source/raw'
# Measured glyph windows from the commissioned image.
# isolate() uses alpha >220, removes detached fringe and retains antialiasing.
BOUNDS = [(77,184,235,379),(332,184,456,377),(558,184,709,375),(799,182,951,378),
          (67,422,233,613),(320,418,474,614),(555,418,716,615),(804,417,956,613),
          (71,648,234,841),(315,646,474,838),(605,766,669,844),(842,771,910,835)]
def fitted_source(name):
    raw=Image.open(RAW/(name+'.png')).convert('RGBA')
    fit=ImageOps.contain(raw,(983,983),method=Image.Resampling.LANCZOS)
    result=Image.new('RGBA',(1024,1024))
    result.alpha_composite(fit,((1024-fit.width)//2,(1024-fit.height)//2))
    return result
im = fitted_source('festival-gold-digits-v2')
def isolate(glyph):
    w,h=glyph.size
    solid=glyph.getchannel('A').point(lambda a:255 if a>220 else 0)
    solid=solid.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    data=bytearray(solid.tobytes())
    best=[]
    for k in range(w*h):
        if not data[k]:continue
        data[k]=0;queue=deque([k]);part=[]
        while queue:
            at=queue.popleft();part.append(at);x,y=at%w,at//w
            for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if 0<=nx<w and 0<=ny<h and data[ny*w+nx]:
                    data[ny*w+nx]=0;queue.append(ny*w+nx)
        if len(part)>len(best):best=part
    mask=bytearray(w*h)
    for at in best:mask[at]=255
    keep=Image.frombytes('L',(w,h),bytes(mask)).filter(ImageFilter.MaxFilter(3))
    glyph.putalpha(ImageChops.multiply(glyph.getchannel('A'),keep))
    return glyph
atlas = Image.new('RGBA', (1024,1024))
crops = []
for i,(x1,y1,x2,y2) in enumerate(BOUNDS):
    # Uniform cap/baseline windows. Punctuation retains its own short height.
    baseline = [379,615,841][i//4]
    top = baseline-196 if i<10 else y1
    bottom = baseline if i<10 else y2
    glyph = im.crop((x1-10,top-10,x2+10,bottom+10))
    glyph=isolate(glyph)
    atlas.paste(glyph,(i%4*256+12,i//4*256+12))
    crops.append([12,12,*glyph.size])
atlas.save(ART / 'festival-gold-digits-v2.png')
for name in ['festival-gold-rays-v2','festival-spark-plume-v2']:
    image=fitted_source(name)
    image.crop(image.getchannel('A').getbbox()).save(ART/(name+'.png'))
(ROOT/'art-source/award-glyph-crops.json').write_text(json.dumps({'crops':crops,'capWindow':216,'sourceBounds':BOUNDS},indent=2)+'\n')
print(json.dumps(crops))
