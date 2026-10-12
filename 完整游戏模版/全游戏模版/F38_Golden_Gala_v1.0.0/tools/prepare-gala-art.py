"""Build native-alpha F38 bitmap assets. Preserve perspective and aspect ratios.
No replacement drawings: all decorations are cropped from generated source art.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
import numpy as np, json, uuid, copy, sys
SRC=Path('art-source'); OUT=Path('assets/resources/art'); OUT.mkdir(exist_ok=True)
IDS=['crown-club','emerald-fortune','ruby-royale','vault-reserve']; manifest={}
template=json.loads((OUT/'gala-brand.png.meta').read_text())
def clean(im):
 a=np.asarray(im.convert('RGBA')).copy(); a[a[:,:,3]<8]=0
 # Native alpha supplied by provider; do NOT key green jewels or black pupils.
 return Image.fromarray(a)
def save(im,name,preserve_alpha=False):
 im=im.convert('RGBA') if preserve_alpha else clean(im);path=OUT/(name+'.png')
 # Retain native antialiasing after resampling and don't re-encode unaffected assets.
 if not path.exists() or not np.array_equal(np.asarray(im),np.asarray(Image.open(path).convert('RGBA'))):im.save(path,optimize=True)
 meta=path.with_suffix('.png.meta')
 if not meta.exists():
  m=copy.deepcopy(template);u=str(uuid.uuid4());old=m['uuid'];m=json.loads(json.dumps(m).replace(old,u));m['subMetas']['6c48a']['displayName']=name;meta.write_text(json.dumps(m,indent=2)+'\n')
 manifest[name]={'width':im.width,'height':im.height}
def character(im):
 a=np.asarray(im.convert('RGBA')).copy();mask=a[:,:,3]>=8;seen=np.zeros(mask.shape,dtype=bool);best=[]
 # Four-neighbour component extraction removes spill from adjacent sheet cells.
 # It never keys by RGB and therefore preserves dark pupils and coloured jewels.
 for y,x in zip(*np.where(mask)):
  if seen[y,x]:continue
  seen[y,x]=True;stack=[(int(y),int(x))];comp=[]
  while stack:
   yy,xx=stack.pop();comp.append((yy,xx))
   for ny,nx in ((yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)):
    if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;stack.append((ny,nx))
  if len(comp)>len(best):best=comp
 keep=np.zeros(mask.shape,dtype=bool)
 for y,x in best:keep[y,x]=True
 a[~keep]=0;return Image.fromarray(a)
def tight(im,pad=10):
 b=im.getbbox();assert b;im=im.crop(b);o=Image.new('RGBA',(im.width+pad*2,im.height+pad*2));o.alpha_composite(im,(pad,pad));return o
def cell(im,i,c,r):return im.crop((round(i%c*im.width/c),round(i//c*im.height/r),round((i%c+1)*im.width/c),round((i//c+1)*im.height/r)))
def pack(items,size=384,margin=32):
 out=Image.new('RGBA',(size*4,size*4))
 for i,item in enumerate(items):
  im=tight(item,0);im.thumbnail((size-margin*2,size-margin*2),Image.Resampling.LANCZOS);out.alpha_composite(im,(i%4*size+(size-im.width)//2,i//4*size+(size-im.height)//2))
 return out
def build_guardians():
 im=clean(Image.open(SRC/'guardians.png'));portraits=[]
 # Original native-alpha silhouettes cross the 2x2 midline. The bull's left
 # horn starts at source y=587, above y=627; a grid cell loses its entire tip.
 guardian_boxes={"vault-reserve":(627,565,1254,1254)}
 head_boxes=[(.22,.00,.80,.40),(.20,.00,.83,.41),(.245,.00,.67,.275),
             (126/477,0,434/477,270/663)]
 for i,id in enumerate(IDS):
  override=SRC/('guardian-'+id+'.png')
  if override.exists():
   raw=clean(Image.open(override));raw=raw.crop(raw.getbbox());raw.thumbnail((780,1020),Image.Resampling.LANCZOS);ch=tight(raw)
  else:
   raw=im.crop(guardian_boxes[id]) if id in guardian_boxes else cell(im,i,2,2)
   ch=tight(character(raw))
  save(ch,'guardian-'+id,preserve_alpha=True)
  u,v,U,V=head_boxes[i]
  head=ch.crop((round(ch.width*u),round(ch.height*v),round(ch.width*U),round(ch.height*V)))
  # Remove the disconnected key fragment beside the bull's ear, not dark
  # pupils or horn shading. No RGB key, dark overlay, stretch or feather mask.
  if id=='vault-reserve':head=character(head)
  portraits.append(tight(head))
 save(pack(portraits*4,256,20),'portraits',preserve_alpha=True)
 save(tight(character(cell(im,0,2,2))),'gala-guardian')

if '--guardians-only' in sys.argv:
 manifest_path=Path('docs/art-manifest.json')
 if manifest_path.exists():manifest.update(json.loads(manifest_path.read_text()))
 build_guardians()
 manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
 print(json.dumps({k:v for k,v in manifest.items() if k.startswith('guardian-')},indent=2))
 sys.exit(0)

# Generated edits slightly moved their central cabinet. Exclude its entire
# silhouette before packing the side architecture; never copy those stray rails.
# Bounds measured on the ACTUAL 1448x1086 files (not the requested dimensions).
SCENIC_JOIN={'crown-club':(435,1043),'emerald-fortune':(403,1094),
             'ruby-royale':(398,974),'vault-reserve':(434,974)}
for id in IDS:
 expanded=Image.open(SRC/'expanded'/(id+'.png')).convert('RGBA')
 factor=1152/expanded.height
 wide=expanded.resize((round(expanded.width*factor),1152),Image.Resampling.LANCZOS)
 left,right=[round(x*expanded.width/1448*factor) for x in SCENIC_JOIN[id]]
 # A small reflection at the OUTERMOST extent is needed only beyond the source.
 # It is never stretched and never reaches the cabinet-side joins.
 pad=max(0,512-left,right+512-wide.width)
 pixels=np.pad(np.asarray(wide),((0,0),(pad,pad),(0,0)),mode='reflect')
 scenery=Image.new('RGBA',(1024,1152))
 scenery.paste(Image.fromarray(pixels[:,left+pad-512:left+pad]),(0,0))
 scenery.paste(Image.fromarray(pixels[:,right+pad:right+pad+512]),(512,0))
 save(scenery,id+'-scenery')

# Room photographs use uniform cover scaling (less than 1% horizontal crop), NEVER stretch.
for id in IDS:
 save(ImageOps.fit(Image.open(SRC/'portrait'/(id+'.png')).convert('RGBA'),(1024,2304),Image.Resampling.LANCZOS),id+'-tall')
for src,name in [('hall','gala-hall'),('salon','salon'),('services','gala-services')]:
 save(ImageOps.fit(Image.open(SRC/(src+'.png')).convert('RGBA'),(1024,1920),Image.Resampling.LANCZOS),name)
im=clean(Image.open(SRC/'titles.png'))
names=['gala-brand','gala-title-0','gala-title-1','gala-title-2','gala-title-3','heading-shop','heading-rewards','heading-rank','heading-account','award-title-big','award-title-super','heading-login','award-title-mega','award-title-epic','heading-collection','heading-rules']
# Generated titles are not an evenly spaced 2x8 atlas. Equal rows clipped
# crowns and carried the next title's ornaments into the bottom gutter.
# Use measured native-alpha object seats; retain the original lettering/relief.
title_boxes=[(46,11,480,187),(558,7,970,187),(42,197,485,362),(556,196,972,365),
 (42,370,484,553),(563,380,964,555),(44,560,482,738),(546,563,983,740),
 (45,745,481,925),(548,744,970,925),(45,925,481,1110),(548,925,970,1112),
 (56,1112,471,1296),(561,1116,963,1300),(38,1306,487,1503),(567,1315,960,1505)]
for n,b in zip(names,title_boxes):save(tight(character(im.crop(b))),n)
build_guardians()
im=clean(Image.open(SRC/'buttons.png'))
for i in range(16):save(tight(character(cell(im,i,4,4)),6),'gala-button-'+str(i))
im=clean(Image.open(SRC/'treasures.png'))
for i,id in enumerate(IDS):save(tight(cell(im,i,2,2)),'prize-'+id)
im=clean(Image.open(SRC/'symbols.png'));items=[character(cell(im,i,4,4)) for i in range(16)];atlas=pack(items,384,12);save(atlas,'symbols');save(atlas.filter(ImageFilter.GaussianBlur(5)),'symbols-blur');save(tight(items[15]),'award-coin-detail');save(pack(items,384,12),'interfaces')
# Authored relief crosses the sheet midlines; crop by measured object bounds.
# Using a 2x2 grid would cut the right frame and the ledger ornament.
im=clean(Image.open(SRC/'panels.png'))
frame=tight(im.crop((35,20,799,466)));plate=tight(im.crop((815,80,1536,390)))
ledger=tight(im.crop((10,475,863,965)));medal=tight(im.crop((890,438,1465,964)))
save(ledger,'route-scroll');save(medal,'route-medallion')
# Tint only the inset ivory fabric to burgundy; retain its texture and all gold relief.
a=np.asarray(frame).copy();r,g,b=a[:,:,:3].astype(float).transpose(2,0,1);sel=(b>110)&(r-b<90)&(g-b<70)&(a[:,:,3]>0)
a[sel,0]=(r[sel]*.29).astype('uint8');a[sel,1]=(g[sel]*.075).astype('uint8');a[sel,2]=(b[sel]*.09).astype('uint8');dark=Image.fromarray(a)
# A reading panel has velvet; a reel highlight must have an open centre.
# Measured inner-fabric bounds of this exact generated frame (not an RGB key).
# Preserve the sculpted gold rim, never hide the awarded symbols underneath it.
win_a=np.asarray(dark).copy();win_a[93:348,75:678,3]=0
win_frame=Image.fromarray(win_a)
for i in range(4):
 save(dark,'gala-frame-'+str(i));save(win_frame,'win-frame-'+str(i));save(plate,'gala-soft-plate-'+str(i));save(plate,'gala-plate-'+str(i))
save(tight(clean(Image.open(SRC/'award-stage.png'))),'gala-award-stage')
controls={
 'crown-club':[(334,1207,169,150),(535,1235,101,98),(222,1235,95,98),(113,1243,78,73)],
 'emerald-fortune':[(350,1210,162,148),(560,1235,91,89),(226,1235,93,89),(101,1252,81,59)],
 'ruby-royale':[(363,1186,147,144),(546,1216,93,80),(244,1216,89,80),(115,1238,69,40)],
 'vault-reserve':[(359,1235,169,165),(572,1262,96,104),(242,1262,96,104),(98,1284,81,53)]}
k=2304/1881;dx=(836*k-1024)/2
for id,boxes in controls.items():
 im=Image.open(OUT/(id+'-tall.png'))
 for i,(x,y,w,h) in enumerate(boxes):save(im.crop((round(x*k-dx),round(y*k),round((x+w)*k-dx),round((y+h)*k))),'cabinet-control-'+id+'-'+str(i))
Path('docs/art-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({k:v for k,v in manifest.items() if k.startswith('guardian-')},indent=2))
