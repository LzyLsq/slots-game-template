from pathlib import Path
from PIL import Image, ImageChops
src=Image.open('output/imagegen/f26-ui-craft31.png').convert('RGBA')
out=Path('public/art/craft31-ui'); out.mkdir(parents=True,exist_ok=True)
# atlas coordinates tuned to generated 1254px sheet; each crop owns a separate cell.
boxes={
 'round-pearl':(25,25,425,390),
 'round-navy':(445,25,825,390),
 'round-teal':(845,25,1254,390),
 'balance':(0,410,490,615),
 'sound-pill':(465,410,805,615),
 'result-plaque':(795,405,1254,635),
 'footer-board':(0,665,485,895),
 'spin-base':(485,610,830,950),
 'bet-plaque':(810,665,1040,890),
 'history-plaque':(1020,665,1254,890),
 'icon-back':(0,930,225,1254),
 'icon-rules':(220,930,500,1254),
 'icon-sound':(490,930,760,1254),
 'icon-coins':(750,930,1030,1254),
 'icon-history':(1020,930,1254,1254),
}
for name,box in boxes.items():
 im=src.crop(box)
 # remove tiny low-alpha generation specks, then trim transparent border.
 a=im.getchannel('A').point(lambda v: 0 if v<72 else v)
 im.putalpha(a)
 bb=a.getbbox()
 if bb: im=im.crop(bb)
 # keep an anti-clipping transparent margin
 canvas=Image.new('RGBA',(im.width+20,im.height+20),(0,0,0,0)); canvas.alpha_composite(im,(10,10)); im=canvas
 if name.startswith('icon-'):
  im.thumbnail((192,192),Image.Resampling.LANCZOS)
  im.save(out/f'{name}.png',optimize=True)
 else:
  im.save(out/f'{name}.webp','WEBP',quality=94,method=6)
print('\n'.join(f'{p.name}: {Image.open(p).size}' for p in sorted(out.iterdir())))
