"""Install commissioned guardian sprites with independently beckoning limbs.

Coin/Sapphire retain their existing hidden-shoulder workflow. Pearl/Ruby
delegate to complete newly commissioned masters, with no old limbs or torsos.
The visible animation layers overlap beneath each character's own shoulder.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops
import json,uuid,sys
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'art-source/raw'; ART=ROOT/'assets/resources/art'
DATA={
 'coin':{'pivot':(302,535),'mask':[(48,175),(290,168),(317,326),(313,432),(372,515),(334,575),(224,574),(119,497),(64,388)],'edit':[(48,175),(290,168),(317,326),(313,432),(372,515),(352,598),(210,607),(101,522),(42,390)]},
 'sapphire':{'pivot':(860,576),'mask':[(917,145),(1145,137),(1145,830),(944,804),(850,693),(790,592),(849,490)],'edit':[(917,145),(1145,137),(1145,855),(947,804),(843,717),(766,599),(827,478)]},
}
TARGET=1024; INSET=36
selected=sys.argv[1:] or ['coin','sapphire','pearl','ruby']
if any(name not in ('coin','sapphire','pearl','ruby') for name in selected):raise SystemExit('Expected coin, sapphire, pearl or ruby')
for name in selected:
 if name in ('pearl','ruby'):
  # Use the new complete paintings and their own limbs, never the rejected v3.
  from prepare_guardian_coherent import prepare
  prepare(name)
  continue
 info=DATA[name]
 source=RAW/('guardian-'+name+'-prosperity.png')
 torso=RAW/('guardian-'+name+'-torso.png')
 if not source.exists() or not torso.exists():raise SystemExit(f'Missing commissioned sprite or torso: {name}')
 image=Image.open(source).convert('RGBA')
 scale=(TARGET-2*INSET)/max(image.size)
 dims=(round(image.width*scale),round(image.height*scale));pad=((TARGET-dims[0])//2,(TARGET-dims[1])//2)
 full=Image.new('RGBA',(TARGET,TARGET));full.alpha_composite(image.resize(dims,Image.Resampling.LANCZOS),pad)
 def canvas_mask(poly,blur):
  mask=Image.new('L',image.size,0);ImageDraw.Draw(mask).polygon(poly,fill=255)
  canvas=Image.new('L',(TARGET,TARGET));canvas.paste(mask.resize(dims,Image.Resampling.LANCZOS),pad)
  return canvas.filter(ImageFilter.GaussianBlur(blur))
 # Coin and Sapphire retain their existing paintings, masks and pivots.
 body=Image.composite(Image.open(torso).convert('RGBA').resize((TARGET,TARGET),Image.Resampling.LANCZOS),full,canvas_mask(info['edit'],2))
 wave=full.copy();wave.putalpha(ImageChops.multiply(full.getchannel('A'),canvas_mask(info['mask'],1.2)))
 px,py=info['pivot'];mapped=(pad[0]+px*scale,pad[1]+py*scale)
 for suffix,layer in (('',body),('-wave',wave)):
  final=ART/f'guardian-{name}{suffix}.png';layer.save(final,optimize=True)
  if suffix and not final.with_suffix('.png.meta').exists():
   meta=json.loads((ART/f'guardian-{name}.png.meta').read_text());new_uuid=str(uuid.uuid4())
   meta['uuid']=new_uuid;meta['subMetas']['6c48a']['uuid']=new_uuid+'@6c48a'
   meta['subMetas']['6c48a']['displayName']=f'guardian-{name}-wave'
   meta['subMetas']['6c48a']['userData']['imageUuidOrDatabaseUri']=new_uuid
   meta['userData']['redirect']=new_uuid+'@6c48a'
   final.with_suffix('.png.meta').write_text(json.dumps(meta,indent=2)+'\n')
 print(name,'solid shoulder and wave installed; normalized pivot:',round(mapped[0]/TARGET-.5,6),round(.5-mapped[1]/TARGET,6))
