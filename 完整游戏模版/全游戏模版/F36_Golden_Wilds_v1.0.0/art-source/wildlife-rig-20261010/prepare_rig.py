"""Extract commissioned artwork, never draw substitute mascots. Polygon seeds
bound a narrow GrabCut edge search; the opaque interior is preserved exactly.
Underpainting is commissioned separately to remove every original silhouette.
"""
from pathlib import Path
from PIL import Image,ImageFilter
import cv2,numpy as np,json
P=Path(__file__).resolve().parent
contours={
'sun-lion':[(150,133),(154,118),(169,108),(182,102),(209,104),(228,114),(232,132),(246,112),(260,107),(263,91),(267,73),(280,57),(298,48),(304,38),(324,36),(337,23),(366,21),(390,26),(412,38),(433,47),(438,64),(459,74),(478,94),(485,110),(482,130),(471,143),(489,161),(492,185),(489,199),(478,213),(493,209),(513,215),(526,228),(535,244),(531,254),(505,258),(481,253),(468,245),(465,251),(446,250),(429,255),(424,283),(420,302),(395,303),(381,289),(354,289),(341,300),(304,299),(296,292),(288,292),(276,291),(260,309),(194,316),(202,290),(206,261),(206,244),(197,229),(193,210),(187,190),(184,175),(178,164),(164,159),(154,150)],
'emerald-elephant':[(169,143),(184,123),(208,101),(231,91),(253,84),(273,88),(286,91),(299,84),(302,72),(321,52),(350,42),(378,51),(398,62),(405,80),(416,76),(438,74),(456,86),(473,102),(494,119),(508,143),(515,165),(503,187),(488,199),(475,220),(463,229),(447,233),(443,249),(427,254),(447,272),(470,280),(488,302),(491,325),(456,326),(431,318),(401,317),(392,299),(389,286),(360,287),(336,300),(317,317),(271,317),(253,325),(215,326),(202,314),(203,296),(214,280),(238,266),(260,260),(265,248),(244,250),(223,244),(207,229),(198,211),(190,197),(185,198),(177,195),(170,183),(181,164),(178,157),(172,155)],
'lotus-koi':[(206,126),(214,114),(226,104),(245,102),(255,92),(265,76),(287,70),(306,83),(324,89),(338,91),(358,94),(375,103),(381,121),(403,138),(425,146),(449,148),(474,136),(490,114),(494,94),(487,75),(477,61),(496,53),(513,60),(531,76),(539,96),(539,112),(550,105),(570,107),(583,119),(590,137),(591,155),(576,149),(556,145),(535,146),(514,153),(490,170),(468,187),(444,198),(420,203),(392,210),(365,206),(352,207),(352,216),(340,214),(324,205),(315,200),(294,200),(276,198),(258,195),(240,183),(223,170),(212,154),(205,142)],
'moon-fox':[(202,194),(206,180),(221,172),(239,174),(255,185),(264,192),(270,166),(271,150),(268,130),(269,111),(270,92),(276,69),(285,62),(300,69),(316,85),(335,105),(345,117),(368,116),(390,113),(415,119),(431,108),(456,99),(480,102),(488,110),(487,133),(480,159),(472,180),(462,198),(454,218),(465,212),(478,201),(505,195),(530,200),(554,212),(579,226),(588,241),(579,244),(568,249),(565,274),(558,297),(551,318),(542,338),(514,337),(500,326),(505,317),(497,297),(482,296),(462,298),(443,296),(430,288),(412,290),(401,310),(396,336),(363,341),(325,337),(306,336),(288,325),(280,308),(264,295),(246,282),(233,265),(223,247),(215,230),(207,217)]}
jobs=[];reports=[]
for mode,points in contours.items():
 image=np.array(Image.open(P/'output/imagegen'/(mode+'-wildlife.png')).convert('RGB'));h,w=image.shape[:2];sx=w/736;sy=h/448
 polygon=np.asarray([(round(x*sx),round(y*sy)) for x,y in points],np.int32)
 mask=np.zeros((h,w),np.uint8);cv2.fillPoly(mask,[polygon],255)
 # Interior fixed foreground; only a 4px authored-resolution edge is uncertain.
 k=np.ones((9,9),np.uint8);gc=np.where(cv2.dilate(mask,k)>0,cv2.GC_PR_BGD,cv2.GC_BGD).astype('uint8');gc[mask>0]=cv2.GC_PR_FGD;gc[cv2.erode(mask,np.ones((7,7),np.uint8))>0]=cv2.GC_FGD
 cv2.grabCut(image,gc,None,np.zeros((1,65),np.float64),np.zeros((1,65),np.float64),3,cv2.GC_INIT_WITH_MASK)
 alpha=np.isin(gc,[cv2.GC_FGD,cv2.GC_PR_FGD]).astype('uint8')*255
 alpha=np.maximum(alpha,cv2.erode(mask,np.ones((3,3),np.uint8)))
 # Subpixel edge only; no faded anatomy or neighbouring pose crossfade.
 alpha=cv2.GaussianBlur(alpha,(3,3),.6)
 rgba=np.dstack((image,alpha));Image.fromarray(rgba).save(P/(mode+'-rig.png'));Image.fromarray(alpha).save(P/(mode+'-alpha.png'))
 hole=cv2.dilate(mask,np.ones((25,25),np.uint8));m=np.zeros((h,w,4),np.uint8)+255;m[:,:,3]=255-hole;Image.fromarray(m).save(P/(mode+'-underpaint-mask.png'))
 prompt='''Remove ONLY the central animated animal mascot, all its head, ears, fur/skin/fins, forelimbs, trunk and tail from the masked area. Reconstruct the clean ORIGINAL temple room architecture, sky, backdrop, water and upper treasury crown naturally behind it, with perfectly matching light, material and perspective. This is a clean background plate for animated game artwork, not a redesigned scene. Keep every unmasked pixel, lower cabinet rail, separate gold coin bowl, jewels, water arc, side columns and architectural registration EXACTLY unchanged. No animal, no humans, no new ornaments, no faces, no hands, no text or blur. Fixed camera, original composition.'''
 (P/(mode+'-underpaint-prompt.txt')).write_text(prompt)
 jobs.append({'id':mode+'-underpaint','image':str(P/'output/imagegen'/(mode+'-wildlife.png')),'mask':str(P/(mode+'-underpaint-mask.png')),'prompt':str(P/(mode+'-underpaint-prompt.txt')),'size':'1472x896','out':str(P/'output/imagegen'/(mode+'-underpaint.png'))})
 reports.append({'mode':mode,'opaqueArea':int((alpha>250).sum()),'cutoutPixels':int((alpha>0).sum())})
(P/'underpaint-jobs.json').write_text(json.dumps(jobs,indent=2));(P/'cutout-audit.json').write_text(json.dumps(reports,indent=2))
print('Four single-source character meshes prepared')
