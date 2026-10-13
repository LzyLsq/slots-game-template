"""Extract the commissioned enamel ledger, removing its rectangular room backdrop.
The measured silhouette retains the original brass ornament and ivory material;
no new art is drawn. Coordinates are in the CC Switch source pixels.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
P=Path(__file__).resolve().parents[1]
source=Image.open(P/'art-source/raw/ledger-frame-room.png').convert('RGBA')
points=[(61,120),(94,130),(122,121),(157,122),(188,131),(488,130),(512,116),(538,130),(831,130),(868,120),(915,119),(953,107),(952,128),(938,153),(923,169),(921,215),(926,1324),(953,1337),(965,1361),(954,1384),(926,1395),(871,1396),(832,1389),(537,1389),(512,1401),(489,1389),(187,1389),(155,1395),(107,1394),(61,1381),(60,1354),(87,1326),(100,1293),(99,212),(84,169),(68,148)]
mask=Image.new('L',source.size); ImageDraw.Draw(mask).polygon(points,fill=255)
source.putalpha(ImageChops.multiply(source.getchannel('A'),mask))
source=source.crop((58,106,966,1402))
# Transparent gutters hold neighbouring RGB, preventing dark filtered edges.
import numpy as np
pix=np.asarray(source).copy(); filled=pix[:,:,3]>0
for _ in range(8):
    sums=np.zeros(pix[:,:,:3].shape,dtype=np.float32); counts=np.zeros(filled.shape,dtype=np.float32)
    for dy,dx in ((0,1),(0,-1),(1,0),(-1,0)):
        valid=np.roll(filled,(dy,dx),(0,1)); color=np.roll(pix[:,:,:3],(dy,dx),(0,1))
        if dy>0:valid[0,:]=False
        if dy<0:valid[-1,:]=False
        if dx>0:valid[:,0]=False
        if dx<0:valid[:,-1]=False
        sums+=color*valid[:,:,None];counts+=valid
    add=(~filled)&(counts>0)
    pix[:,:,:3][add]=(sums[add]/counts[add,None]).astype(np.uint8);filled|=add
Image.fromarray(pix).save(P/'assets/resources/art/ledger-frame-room.png',optimize=True)
print('Ledger silhouette extracted',source.size)
