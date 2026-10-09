"""Prepare commissioned F37 bitmap art: chroma cleanup, tight crops, isolated atlases.
Never paints replacement artwork. Actual generated dimensions are preserved in manifest.
"""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np, json,uuid,copy
SRC=Path('art-source');OUT=Path('assets/resources/art');IDS=['caravan-gold','sapphire-oasis','ruby-bazaar','crown-voyage']
manifest={}
template=json.loads((OUT/'caravan-brand.png.meta').read_text())
def save(im,name):
 # Resampling can reintroduce green RGB in semi-transparent edge texels.
 a=np.asarray(im.convert('RGBA')).copy();rgb=a[:,:,:3].astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
 edge=(a[:,:,3]>0)&(a[:,:,3]<128)&(g>155)&(g>r*1.75+28)&(g>b*1.65+28)
 a[:,:,1]=np.where(edge,np.minimum(g,np.maximum(r,b)*1.1+18),g).astype(np.uint8)
 im=Image.fromarray(a)
 path=OUT/(name+'.png');im.save(path,optimize=True)
 meta=path.with_suffix('.png.meta')
 if not meta.exists():
  m=copy.deepcopy(template);u=str(uuid.uuid4());old=m['uuid'];m=json.loads(json.dumps(m).replace(old,u));m['subMetas']['6c48a']['displayName']=name;meta.write_text(json.dumps(m,indent=2)+'\n')
 manifest[name]={'width':im.width,'height':im.height}
def key(im):
 a=np.asarray(im.convert('RGBA')).copy();rgb=a[:,:,:3].astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
 # Saturated chroma background is distinct from the shaded green parrot feathers.
 green=(g>155)&(g>r*1.75+28)&(g>b*1.65+28)
 a[:,:,3]=np.where(green,0,255)
 # Feather a single pixel inward and remove chroma spill ONLY at transparent borders.
 mask=Image.fromarray(a[:,:,3]);er=np.asarray(mask.filter(ImageFilter.MinFilter(3)))
 edge=(er<a[:,:,3])&(~green)
 a[:,:,1]=np.where(edge,np.minimum(g,np.maximum(r,b)*1.1+18),g).astype(np.uint8)
 a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)
def tight(im,pad=8):
 b=im.getbbox();assert b,'empty crop';im=im.crop(b);o=Image.new('RGBA',(im.width+pad*2,im.height+pad*2));o.alpha_composite(im,(pad,pad));return o
def cell(im,i,cols,rows):
 return im.crop((round((i%cols)*im.width/cols),round((i//cols)*im.height/rows),round((i%cols+1)*im.width/cols),round((i//cols+1)*im.height/rows)))
def pack(images,size=384,margin=30):
 out=Image.new('RGBA',(size*4,size*4))
 for i,im in enumerate(images):
  im=tight(im,0);im.thumbnail((size-margin*2,size-margin*2),Image.Resampling.LANCZOS);out.alpha_composite(im,((i%4)*size+(size-im.width)//2,(i//4)*size+(size-im.height)//2))
 return out
for n in ['hall','caravan-gold','sapphire-oasis','ruby-bazaar','crown-voyage']:
 if (SRC/(n+'.png')).exists():
  im=Image.open(SRC/(n+'.png'));name='caravan-hall' if n=='hall' else n+'-tall';save(im.resize((1024,2304),Image.Resampling.LANCZOS),name)
  if n=='hall':
   save(im.resize((1024,2304),Image.Resampling.LANCZOS),'salon');save(im.resize((1024,2304),Image.Resampling.LANCZOS),'caravan-services')
im=key(Image.open(SRC/'titles.png'));names=['caravan-brand','caravan-title-0','caravan-title-1','caravan-title-2','caravan-title-3','heading-shop','heading-rewards','heading-rank','heading-account','award-title-big','award-title-super','heading-login']
for i,n in enumerate(names):save(tight(cell(im,i,2,6)),n)
for n in ['mega','epic']:save(tight(cell(im,10,2,6)),'award-title-'+n)
im=key(Image.open(SRC/'guardians.png'));portraits=[]
# Exact cell bounds, no duplicate characters or black rectangles.
for i,id in enumerate(IDS):
 character=tight(cell(im,i,2,2));save(character,'guardian-'+id)
 head=character.crop((int(character.width*.24),0,int(character.width*.75),int(character.height*.39)));portraits.append(head)
save(pack((portraits*4),256,18),'portraits');save(tight(cell(im,0,2,2)),'caravan-guardian')
im=key(Image.open(SRC/'buttons.png'));xs=[(18,294),(337,579),(611,849),(865,1241)];ys=[(17,303),(315,608),(614,907),(915,1223)]
for i in range(16):
 x0,x1=xs[i%4];y0,y1=ys[i//4];save(tight(im.crop((x0,y0,x1,y1)),4),'caravan-button-'+str(i))
im=key(Image.open(SRC/'treasures.png'))
for i,id in enumerate(IDS):save(tight(cell(im,i,2,2)), 'prize-'+id)
if (SRC/'symbols.png').exists():
 im=key(Image.open(SRC/'symbols.png'));bounds=[(5,25,308,310),(365,0,585,327),(632,40,944,308),(970,0,1254,315),(0,326,313,626),(314,328,621,627),(628,307,945,630),(945,316,1254,619),(0,633,313,918),(315,634,621,920),(629,629,948,920),(949,626,1254,916),(0,923,309,1230),(320,921,619,1230),(624,912,945,1254),(949,918,1254,1240)];items=[im.crop(b) for b in bounds];atlas=pack(items)
 for name in ['symbols']:
  save(atlas,name);save(atlas.filter(ImageFilter.GaussianBlur(6)),name+'-blur')
 save(tight(items[0]),'award-coin-detail')
 save(pack([items[i] for i in [8,7,2,8,5,15,0,6,3,9,11,10,12,4,14,1]]),'interfaces')
if (SRC/'panels.png').exists():
 im=key(Image.open(SRC/'panels.png'));frame=tight(im.crop((100,18,524,548)));plate=tight(im.crop((628,189,1254,388)));scroll=tight(im.crop((10,567,615,1160)));medal=tight(im.crop((629,550,1254,1162)));save(scroll,'route-scroll');save(medal,'route-medallion')
 for i in range(4):
  save(frame,'caravan-frame-'+str(i));save(frame,'win-frame-'+str(i));save(plate,'caravan-soft-plate-'+str(i))
(SRC/'prepared-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared',len(manifest),'assets')
