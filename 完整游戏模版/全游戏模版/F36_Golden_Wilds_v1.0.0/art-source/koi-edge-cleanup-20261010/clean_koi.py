"""Repair extraction of the commissioned Koi; do not redraw the animal.
Use its original RGB pixels, a corrected silhouette, and its commissioned
clean background plate. Keep asset UUIDs and the architectural perimeter.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import cv2, numpy as np, json, hashlib
P=Path(__file__).resolve().parent
ROOT=P.parent.parent
SOURCE=ROOT/'art-source/wildlife-rig-20261010'
ART=ROOT/'assets/resources/art'
size=(1472,896)
original=Image.open(SOURCE/'output/imagegen/lotus-koi-wildlife.png').convert('RGB').resize(size,Image.Resampling.LANCZOS)
old=Image.open(P/'before-skin.png').convert('RGBA')
alpha=np.array(old.getchannel('A'))
# This clipping contour follows the actual white/orange fin borders. The
# previous broad extraction polygon included matching turquoise water and
# gold architecture within both sides of the curved tail.
tail=[(0,0),(743,0),(743,209),(748,229),(754,243),(763,254),
 (777,264),(794,269),(809,276),(821,282),(841,289),(858,292),
 (872,291),(884,290),(897,284),(909,285),(925,277),(938,269),
 (953,279),(963,269),(979,254),(988,239),(992,225),(990,210),
 (985,197),(986,183),(988,170),(987,157),(982,145),(975,134),
 (966,127),(956,124),(954,119),(958,115),
 (965,110),(980,107),(998,108),(1018,119),(1034,133),
 (1045,147),(1055,152),(1064,170),(1075,179),(1083,188),
 (1080,203),(1071,217),(1088,213),(1105,208),(1123,210),
 (1142,216),(1156,228),(1167,244),(1177,267),(1184,284),
 (1186,304),(1182,307),(1171,297),(1156,290),(1137,285),
 (1119,284),(1099,286),(1080,282),(1060,277),(1042,277),
 (1026,282),(1008,289),(992,300),(981,313),(970,327),
 (955,343),(940,355),(928,365),(938,369),(934,375),
 (925,382),(911,386),(898,385),(882,392),(864,398),
 (846,402),(829,408),(813,414),(794,415),(781,414),
 (768,416),(748,417),(743,415),(743,896),(0,896)]
def polygon(points):
 mask=Image.new('L',(size[0]*4,size[1]*4));ImageDraw.Draw(mask).polygon([(round(x*4),round(y*4)) for x,y in points],fill=255)
 return np.array(mask.resize(size,Image.Resampling.LANCZOS))
alpha=np.minimum(alpha,polygon(tail))
# Exclude the original temple lotus petals behind the small jewel crown.
# They share the same gold palette and therefore require a spatial contour.
crown=[(0,896),(0,0),(487,0),(487,181),(494,175),(506,172),
 (510,171),(516,166),(525,166),(532,169),(537,159),(546,146),
 (552,151),(558,160),(562,166),(569,163),(579,159),(588,156),
 (597,152),(606,149),(608,159),(612,168),(614,178),
 (628,176),(639,176),(638,184),(633,195),(647,191),
 (668,183),(687,179),(708,179),(728,189),(741,205),
 (770,212),(770,0),(1472,0),(1472,896)]
alpha=np.minimum(alpha,polygon(crown))
# The farther pectoral fin was previously left in the fixed base. Extract it
# into the same moving skin, preserving one complete fish silhouette.
rear_fin=[(486,376),(502,380),(523,389),(540,398),(549,410),
 (553,416),(549,425),(540,434),(531,441),(533,446),
 (527,448),(514,443),(503,436),(495,427),(490,416),
 (487,403),(485,389)]
alpha=np.maximum(alpha,polygon(rear_fin))
# The small ventral fin below the tail also belongs to the animal.
ventral_fin=[(899,368),(921,361),(934,366),(941,370),
 (934,377),(922,384),(910,388),(898,386),(887,390)]
alpha=np.maximum(alpha,polygon(ventral_fin))
# Remove only cyan/teal pixels carried in from the water. Warm fish RGB and
# pearl highlights remain untouched. Full opacity is preserved in the body.
rgb=np.array(original)
r,g,b=[rgb[:,:,i].astype('int16') for i in range(3)]
water=(g-r>14)|(b-r>18)
# Remove background cyan while protecting the genuine cool pearl shading
# inside the upper white fin. No colour change to opaque animal pixels.
yy,xx=np.mgrid[:size[1],:size[0]]
pearl_reflection=(xx>=978)&(xx<=1025)&(yy>=125)&(yy<=218)
alpha[water & ~pearl_reflection]=0
# Linear sampling at transparent borders must use animal edge colours,
# never the turquoise water hidden behind zero alpha.
solid=(alpha>=220).astype('uint8')
_,labels=cv2.distanceTransformWithLabels(1-solid,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
edge_rgb=rgb.copy();lookup=np.zeros((int(labels.max())+1,3),dtype=np.uint8)
lookup[labels[solid>0]]=rgb[solid>0]
fringe=(alpha<220)
edge_rgb[fringe]=lookup[labels[fringe]]
skin=Image.fromarray(np.dstack((edge_rgb,alpha)))
skin.save(ART/'lotus-koi-guardian-skin.png')
Image.fromarray(alpha).save(P/'corrected-alpha.png')
# Fill the missed rear-fin area from the already commissioned clean plate.
# This patch changes no room borders, cabinet, water perimeter, or controls.
plate=Image.open(SOURCE/'output/imagegen/lotus-koi-underpaint.png').convert('RGB').resize(size,Image.Resampling.LANCZOS)
patch=Image.new('L',size);draw=ImageDraw.Draw(patch)
draw.polygon([(474,365),(515,369),(564,396),(569,431),
 (542,459),(511,458),(479,439),(472,408)],fill=255)
patch=patch.filter(ImageFilter.GaussianBlur(4))
base=Image.composite(plate,Image.open(P/'before-base.png').convert('RGB'),patch)
base.save(ART/'lotus-koi-guardian-base.png')
patch.save(P/'fixed-base-patch-mask.png')
# Asset inspection views use ordinary compositing, no generated substitutes.
for colour,name in [('#25282e','dark'),('#ffffff','white')]:
 bg=Image.new('RGBA',size,colour);bg.alpha_composite(skin)
 bg.convert('RGB').crop((380,95,1220,470)).save(P/f'skin-on-{name}.png')
base_rgba=base.convert('RGBA');base_rgba.alpha_composite(skin)
base_rgba.convert('RGB').save(P/'corrected-rest-pose.png')
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
(P/'provenance.json').write_text(json.dumps({
 'source':'../wildlife-rig-20261010/output/imagegen/lotus-koi-wildlife.png',
 'cleanPlate':'../wildlife-rig-20261010/output/imagegen/lotus-koi-underpaint.png',
 'sourceMethod':'existing CC Switch commissioned artwork; no animal regeneration',
 'repair':'move omitted rear pectoral fin into single skin; replace its fixed-base residue with commissioned clean water; remove water/architecture trapped around tail; animal-colour padding for linear sampling',
 'size':list(size),'baseSha256':sha(ART/'lotus-koi-guardian-base.png'),
 'skinSha256':sha(ART/'lotus-koi-guardian-skin.png'),
 'meta':'existing UUID and clamp-to-edge sampler preserved'
},indent=2)+'\n')
print('Koi-only extraction and clean-plate patch installed')
