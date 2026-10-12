"""Pixel regression for the bull's source horn, native alpha and avatar crop.
Derives the expected cutout independently; no RGB-key or inferred dark overlay.
"""
from pathlib import Path
from PIL import Image
import numpy as np
import json, sys
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'assets/resources/art'
def main_component(im):
 a=np.asarray(im.convert('RGBA')).copy();mask=a[:,:,3]>=8;seen=np.zeros(mask.shape,bool);best=[]
 for y,x in zip(*np.where(mask)):
  if seen[y,x]:continue
  seen[y,x]=True;stack=[(int(y),int(x))];component=[]
  while stack:
   yy,xx=stack.pop();component.append((yy,xx))
   for ny,nx in ((yy-1,xx),(yy+1,xx),(yy,xx-1),(yy,xx+1)):
    if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:
     seen[ny,nx]=True;stack.append((ny,nx))
  if len(component)>len(best):best=component
 keep=np.zeros(mask.shape,bool)
 for y,x in best:keep[y,x]=True
 a[~keep]=0
 return Image.fromarray(a)
def padded(im):
 im=im.crop(im.getbbox());out=Image.new('RGBA',(im.width+20,im.height+20));out.alpha_composite(im,(10,10));return out
source=Image.open(ROOT/'art-source/guardians.png').convert('RGBA')
assert source.size==(1254,1254)
raw=main_component(source.crop((627,565,1254,1254)))
assert raw.getbbox()==(101,22,558,665),'Measured complete silhouette moves only after re-inspecting source'
expected=padded(raw);actual=Image.open(ART/'guardian-vault-reserve.png').convert('RGBA')
assert actual.size==(477,663)
assert np.array_equal(np.asarray(expected),np.asarray(actual)), 'Recover native horn pixels, never paint a replacement or cover dark shading'
legacy=padded(main_component(source.crop((627,627,1254,1254))))
assert legacy.size==(477,623)
assert np.array_equal(np.asarray(legacy)[10:-10],np.asarray(actual)[50:-10]), 'Body is byte-identical after adding the 40 missing rows'
a=np.asarray(actual);assert int((a[10:50,:,3]>=8).sum())>100,'Restored source horn tip is present'
assert not a[:10,:,3].any() and not a[-10:,:,3].any() and not a[:,:10,3].any() and not a[:,-10:,3].any()
head=main_component(actual.crop((126,0,434,270)))
# Both authored horn tips must be included, with no detached key beside the ear.
h=np.asarray(head);assert int((h[:55,:120,3]>=8).sum())>100
assert int((h[45:115,230:,3]>=8).sum())>100
head=head.crop(head.getbbox());head.thumbnail((216,216),Image.Resampling.LANCZOS)
tile=Image.new('RGBA',(256,256));tile.alpha_composite(head,((256-head.width)//2,(256-head.height)//2))
atlas=Image.open(ART/'portraits.png').convert('RGBA')
for row in range(4):
 assert np.array_equal(np.asarray(tile),np.asarray(atlas.crop((768,row*256,1024,(row+1)*256)))),'All account/rank/picker bull heads retain the same complete horns'
assert np.array_equal(np.asarray(tile)[0,:,3],np.zeros(256)), 'No opaque black avatar backdrop'
report={'date':'2026-10-12','status':'PASS','scope':'Independent native-alpha source/pixel regression, not GPU/device verification','sourceBox':[627,565,1254,1254],'fullCutout':[477,663],'restoredTopRows':40,'bodyPixelsUnchanged':True,'completeHornAvatarCells':4,'sourcePreserved':True}
if len(sys.argv)>1:Path(sys.argv[1]).write_text(json.dumps(report,indent=2)+'\n')
print('PASS bull cutout: original complete horn pixels, 40 restored rows, unchanged body, transparent gutters and four matching full-horn avatars')
