"""Prepare CC Switch commissions: continuous room overscan and real frame alpha."""
from pathlib import Path
from PIL import Image
import cv2,numpy as np,json
cv2.setNumThreads(2)
P=Path(__file__).resolve().parents[1];ART=P/'assets/resources/art';WORK=P/'art-source/registered'
report={}
for id in ['golden-strings','sapphire-harp','ruby-brass','pearl-rhythm']:
 im=Image.open(WORK/(id+'-full-room.png')).convert('RGB').resize((2048,3072),Image.Resampling.LANCZOS)
 im.save(ART/(id+'-room-full.png'))
 report[id]={'source':'CC Switch registered outpaint, no hard rectangular re-paste','size':[2048,3072]}
# Only neutral checker colours connected to the canvas edge are discarded.
# The sealed ivory paper interior is kept intact.
src=np.array(Image.open(P/'art-source/raw/ledger-frame-room.png').convert('RGBA'))
rgb=src[:,:,:3];neutral=(rgb.max(2).astype('int16')-rgb.min(2)<19)&(rgb.min(2)>100)
_,labels=cv2.connectedComponents(neutral.astype('uint8'),connectivity=8)
outer=np.unique(np.r_[labels[0,:],labels[-1,:],labels[:,0],labels[:,-1]])
outer=outer[outer!=0];background=np.isin(labels,outer)
distance=cv2.distanceTransform((~background).astype('uint8'),cv2.DIST_L2,5)
src[:,:,3]=(np.clip(distance/1.4,0,1)*255).astype('uint8')
# Fill transparent RGB from the nearest painted edge before linear sampling.
solid=src[:,:,3]>=8
_,nearest=cv2.distanceTransformWithLabels((~solid).astype('uint8'),cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
palette=np.zeros((int(nearest.max())+1,3),dtype='uint8');palette[nearest[solid]]=src[:,:,:3][solid]
src[:,:,:3][~solid]=palette[nearest[~solid]]
Image.fromarray(src).save(ART/'ledger-frame-room.png',optimize=True)
report['folio']={'transparentPixels':int((src[:,:,3]==0).sum()),'interiorAlpha':int(src[src.shape[0]//2,src.shape[1]//2,3]),'method':'Exterior-connected neutral background removal; no paper or gold redraw'}
(P/'docs/registered-resource-preparation.json').write_text(json.dumps(report,indent=2)+'\n')
print('Prepared four continuous rooms and transparent folio',flush=True)
