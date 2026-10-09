"""Prepare Pearl/Ruby from one newly commissioned complete character each.

Every visible animated pixel comes from that character's own master painting.
Extraction extends beneath the existing breast/mane. The two masks overlap at
that concealed joint, rather than joining unrelated torso and appendage art.
The pearl offering is a static object on the plinth, separate from breathing.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops, ImageFilter, ImageOps
import json,sys,uuid
ROOT=Path(__file__).resolve().parents[1]
RAW=ROOT/'art-source/raw'; ART=ROOT/'assets/resources/art'
SPECS={
 'ruby':{
  'source':'guardian-ruby-coherent-v4.png','mirror':False,'pivot':(462,565),'contact':(650,977),'seed':(600,600),'wave_seed':(350,410),
  'extract':[(248,337),(302,337),(323,324),(345,316),(367,317),(386,324),(405,340),(418,360),(422,390),(414,413),(417,434),(429,459),(442,484),(453,510),(468,545),(490,578),(489,609),(463,624),(369,618),(317,573),(301,509),(296,459),(251,438)],
  'remove':[(248,337),(302,337),(323,324),(345,316),(367,317),(386,324),(405,340),(418,360),(422,390),(414,413),(417,434),(426,459),(431,487),(439,518),(453,550),(468,580),(457,614),(359,625),(306,575),(295,499),(289,453),(251,437)],
 },
 'pearl':{
  'source':'guardian-pearl-coherent-refined-v4.png','mirror':True,'pivot':(515,526),'contact':(355,977),'seed':(440,600),'wave_seed':(760,450),'offering':(620,880),
  'extract':[(474,470),(562,408),(606,292),(778,64),(987,66),(987,714),(552,733),(526,672),(530,614),(510,560),(484,531)],
  'remove':[(513,501),(557,414),(603,282),(777,60),(990,64),(990,745),(548,747),(551,678),(557,621),(542,568),(522,522)],
 }
}
def connected(image, seeds):
 alpha=image.getchannel('A');support=alpha.point(lambda v:255 if v>=8 else 0)
 for seed in seeds:ImageDraw.floodfill(support,seed,128)
 support=support.point(lambda v:255 if v==128 else 0).filter(ImageFilter.MaxFilter(3))
 out=image.copy();out.putalpha(ImageChops.multiply(alpha,support));return out

def polygon(points):
 out=Image.new('L',(1024,1024));ImageDraw.Draw(out).polygon(points,fill=255)
 return out.filter(ImageFilter.GaussianBlur(.5))

def prepare(name,install=True):
 spec=SPECS[name];im=Image.open(RAW/spec['source']).convert('RGBA')
 bounds=im.getchannel('A').point(lambda v:255 if v>=16 else 0).getbbox();im=im.crop(bounds)
 if spec['mirror']:im=ImageOps.mirror(im)
 scale=940/max(im.size);dims=(round(im.width*scale),round(im.height*scale))
 master=Image.new('RGBA',(1024,1024));master.alpha_composite(im.resize(dims,Image.Resampling.LANCZOS),((1024-dims[0])//2,(1024-dims[1])//2))
 seeds=[spec['seed']]+([spec['offering']] if 'offering' in spec else [])
 master=connected(master,seeds);master.save(RAW/f'guardian-{name}-master-v4.png',optimize=True)
 main=connected(master,[spec['seed']])
 extract=polygon(spec['extract']);remove=polygon(spec['remove'])
 wave=main.copy();wave.putalpha(ImageChops.multiply(main.getchannel('A'),extract))
 wave=connected(wave,[spec['wave_seed']])
 body=main.copy();body.putalpha(ImageChops.multiply(main.getchannel('A'),ImageChops.invert(remove)))
 layers={'':body,'-wave':wave}
 if 'offering' in spec:
  layers['-offering']=connected(master,[spec['offering']])
 if install:
  for suffix,layer in layers.items():
   dest=ART/f'guardian-{name}{suffix}.png';layer.save(dest,optimize=True)
   meta=dest.with_suffix('.png.meta')
   if not meta.exists():
    data=json.loads((ART/f'guardian-{name}.png.meta').read_text());uid=str(uuid.uuid4());data['uuid']=uid
    data['subMetas']['6c48a']['uuid']=uid+'@6c48a';data['subMetas']['6c48a']['displayName']=f'guardian-{name}{suffix}'
    data['subMetas']['6c48a']['userData']['imageUuidOrDatabaseUri']=uid;data['userData']['redirect']=uid+'@6c48a'
    meta.write_text(json.dumps(data,indent=2)+'\n')
  print(name,'same-source layers installed; shoulder',spec['pivot'],'contact',spec['contact'],flush=True)
 return master,layers,spec
if __name__=='__main__':
 for name in sys.argv[1:] or list(SPECS):prepare(name)
