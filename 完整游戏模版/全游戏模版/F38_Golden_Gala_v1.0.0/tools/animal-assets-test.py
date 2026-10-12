"""Prevent restored human artwork through the F38 character/portrait build path.
This is a pixel/provenance regression, not an AI semantic or browser audit.
"""
from pathlib import Path
from PIL import Image
import numpy as np, json, hashlib, sys
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/resources/art'
source=ROOT/'art-source'
ids=['crown-club','emerald-fortune','ruby-royale','vault-reserve']
record=json.loads((source/'animal-mascot.json').read_text())
assert hashlib.sha256((source/'guardian-ruby-royale.png').read_bytes()).hexdigest()==record['sourceSha256']
sheet=np.asarray(Image.open(source/'guardians.png').convert('RGBA'))
assert not sheet[sheet.shape[0]//2:,:sheet.shape[1]//2,3].any(),'Old human source cell must remain removed'
prepare=(ROOT/'tools/prepare-gala-art.py').read_text()
assert "override=SRC/('guardian-'+id+'.png')" in prepare and 'if override.exists()' in prepare
portraits=Image.open(ART/'portraits.png').convert('RGBA');tiles=[];results=[]
for i,id in enumerate(ids):
 im=Image.open(ART/('guardian-'+id+'.png')).convert('RGBA');a=np.asarray(im)
 assert (a[0,:,3]==0).all() and (a[-1,:,3]==0).all() and (a[:,0,3]==0).all() and (a[:,-1,3]==0).all()
 results.append({'id':id,'role':['lion','elephant','lucky fox','bull'][i],'size':list(im.size),'sha256':hashlib.sha256((ART/('guardian-'+id+'.png')).read_bytes()).hexdigest()})
 # Four rows repeat the same four current animal portraits, never stale rows.
 tile=portraits.crop((i*256,0,(i+1)*256,256));tiles.append(tile)
 for row in range(1,4):
  actual=portraits.crop((i*256,row*256,(i+1)*256,(row+1)*256));assert np.array_equal(np.asarray(tile),np.asarray(actual))
# Derive the ruby portrait from the CURRENT fox PNG, independently of atlas name.
fox=Image.open(ART/'guardian-ruby-royale.png').convert('RGBA');u,v,U,V=.245,.00,.67,.275
head=fox.crop((round(fox.width*u),round(fox.height*v),round(fox.width*U),round(fox.height*V)));head=head.crop(head.getbbox());head.thumbnail((216,216),Image.Resampling.LANCZOS)
expected=Image.new('RGBA',(256,256));expected.alpha_composite(head,((256-head.width)//2,(256-head.height)//2))
assert np.array_equal(np.asarray(expected),np.asarray(tiles[2])),'Account/ranking avatar must derive from the current fox, not the removed woman'
report={'date':'2026-10-12','scope':'Native-alpha/source/provenance/portrait pixel regression; animal identities manually inspected on source images, not browser or device verification','status':'PASS','assets':results,'avatarCells':16,'rubyFoxAvatarCells':4,'removedHumanSourceCell':True,'rebuildUsesAnimalOverride':True}
if len(sys.argv)>1:Path(sys.argv[1]).write_text(json.dumps(report,indent=2)+'\n')
print('PASS 4 animal cutouts, 16 current portrait cells, native transparent borders, removed old human source, and reproducible animal override')
