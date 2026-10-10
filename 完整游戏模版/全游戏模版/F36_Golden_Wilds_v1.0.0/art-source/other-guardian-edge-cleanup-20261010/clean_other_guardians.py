"""Repair cutout boundaries using the existing commissioned artwork only.
No generated replacement animals, no pose blending, no new drawing. Coordinates
are in the installed 1472 x 896 source plane. Installed UUIDs are unchanged.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import cv2,numpy as np,hashlib,json
P=Path(__file__).resolve().parent
ROOT=P.parent.parent
ART=ROOT/'assets/resources/art'
SOURCE=ROOT/'art-source/wildlife-rig-20261010/output/imagegen'
SIZE=(1472,896)
def poly(points):
 im=Image.new('L',(SIZE[0]*4,SIZE[1]*4))
 ImageDraw.Draw(im).polygon([(x*4,y*4) for x,y in points],fill=255)
 return np.array(im.resize(SIZE,Image.Resampling.LANCZOS))
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def remove(alpha,points):return np.minimum(alpha,255-poly(points))
def keep(alpha,points):return np.minimum(alpha,poly(points))
reports=[]
for mode in ['sun-lion','emerald-elephant','moon-fox']:
 bp=P/f'{mode}-before-base.png';sp=P/f'{mode}-before-skin.png'
 if not bp.exists():bp.write_bytes((ART/f'{mode}-guardian-base.png').read_bytes())
 if not sp.exists():sp.write_bytes((ART/f'{mode}-guardian-skin.png').read_bytes())
 original=Image.open(SOURCE/f'{mode}-wildlife.png').convert('RGB').resize(SIZE,Image.Resampling.LANCZOS)
 plate=Image.open(SOURCE/f'{mode}-underpaint.png').convert('RGB').resize(SIZE,Image.Resampling.LANCZOS)
 before=Image.open(sp).convert('RGBA');alpha=np.array(before.getchannel('A'))
 patches=[]
 if mode=='sun-lion':
  # Move the missed fringe at the outer left shoulder into the same skin.
  fringe=[(384,441),(377,451),(372,468),(370,484),(372,501),(379,525),
   (382,542),(385,552),(388,540),(388,511),(399,484),(416,464),(422,449)]
  alpha=np.maximum(alpha,poly(fringe))
  # The bottom edge follows the original architectural occlusion, not the rail.
  cutoff=[(0,0),(1472,0),(1472,896),(1090,896),(1090,520),
   (1060,526),(1022,520),(979,513),(946,505),(911,498),
   (891,517),(875,556),(853,582),(838,598),(826,593),(816,588),
   (797,580),(777,576),(760,576),(752,577),(731,583),(713,579),(694,584),
   (675,590),(655,602),(635,615),(616,611),(606,597),
   (593,584),(580,577),(564,575),(548,579),(533,588),
   (520,600),(508,609),(479,610),(447,612),(418,614),
   (394,617),(380,621),(370,624),(0,624)]
  alpha=keep(alpha,cutoff)
  alpha=remove(alpha,[(722,571),(729,566),(738,575),(738,583),(721,583)])
  patches=[[(360,433),(418,433),(427,498),(407,564),(360,564)],
   [(1030,431),(1094,431),(1094,649),(1030,649)]]
 elif mode=='emerald-elephant':
  # Gold architecture outside the ear rims is not part of the animal.
  left=[(0,0),(1472,0),(1472,896),(0,896),(0,382),
   (358,382),(353,360),(341,341),(337,325),(337,303),
   (343,282),(356,263),(376,243),(401,219),(432,198),
   (459,183),(483,174),(509,170),(537,174),(564,182),(564,0)]
  alpha=keep(alpha,left)
  right=[(0,0),(915,0),(915,164),(932,171),(954,189),
   (974,210),(994,237),(1013,265),(1025,294),(1027,314),
   (1019,339),(1003,357),(984,374),(965,388),(950,407),
   (943,428),(938,447),(932,460),(920,467),(908,466),
   (895,455),(883,429),(875,410),(868,393),(866,418),
   (886,456),(923,470),(923,510),(1472,510),(1472,896),(0,896)]
  alpha=keep(alpha,right)
  # Precisely bound the nozzle and underside of the curled trunk. The coins
  # and leaves just behind it previously followed the trunk joints.
  trunk=[(0,0),(1472,0),(1472,896),(0,896),(0,502),(565,502),
   (542,499),(516,494),(491,485),(467,475),(447,462),
   (429,447),(414,433),(401,416),(390,399),(382,386),
   (367,383),(354,375),(345,365),(341,350),(342,336),
   (348,326),(359,320),(371,318),(388,320),(399,326),(416,328),(416,0)]
  trunk_alpha=keep(alpha,trunk)
  yy,xx=np.mgrid[:SIZE[1],:SIZE[0]]
  local=(yy>=380)&(yy<=501)&(xx<626)
  alpha[local]=trunk_alpha[local]
  # Leaves must not travel with the paws or jewellery. Bound each silhouette
  # and protect real emeralds from green-background classification.
  necklace=poly([(544,501),(574,489),(610,479),(650,490),(690,480),
   (739,481),(784,476),(825,455),(867,432),(876,447),(871,462),
   (870,475),(865,484),(854,490),(858,500),(854,512),(843,517),
   (837,529),(828,532),(831,540),(825,548),(814,549),(814,559),
   (805,566),(796,566),(797,574),(787,581),(777,581),(773,591),
   (762,591),(750,584),(740,579),(731,579),(717,586),(706,592),
   (688,603),(665,611),(651,605),(641,593),(630,585),(616,580),
   (607,572),(594,568),(585,557),(573,552),(570,541),(558,539),
   (554,525),(544,520)])
  left_paw=poly([(406,547),(419,532),(440,519),(465,506),(490,500),
   (516,505),(543,514),(566,528),(587,546),(605,569),(617,593),
   (621,615),(603,620),(596,635),(576,638),(554,644),(531,646),
   (508,651),(483,654),(459,659),(432,660),(420,649),(411,631),
   (407,610),(405,589),(406,567)])
  right_paw=poly([(843,577),(862,558),(882,547),(905,536),(929,536),
   (951,542),(973,553),(991,570),(1003,589),(1009,610),(1009,634),
   (1002,651),(976,650),(952,648),(926,646),(901,644),(877,645),
   (858,641),(847,625),(834,621),(832,607)])
  lower=np.maximum(necklace,np.maximum(left_paw,right_paw))
  yy,xx=np.mgrid[:SIZE[1],:SIZE[0]]
  zone=yy>=501
  alpha[zone]=np.minimum(alpha[zone],lower[zone])
  rgb=np.array(original);r,g,b=[rgb[:,:,i].astype('int16') for i in range(3)]
  gems=np.zeros(alpha.shape,dtype=bool)
  for cx,cy,rx,ry in [(722,541,32,41),(653,519,18,20),(853,448,12,14),
   (842,471,15,18),(815,501,16,16),(789,518,18,20),(627,504,14,12),
   (559,506,20,20),(497,516,53,17),(913,548,42,14)]:
   gems|=((xx-cx)/rx)**2+((yy-cy)/ry)**2<=1
  paws=(left_paw>0)|(right_paw>0)
  leafy=(g>r*1.05)&(g>b*1.08)&(g-np.maximum(r,b)>8)&(yy>466)
  alpha[leafy&~gems&~paws]=0
  # Explicitly trim the leaf between the ear and collar, including its warm
  # rim, while preserving the collar's individual gold beads.
  alpha=remove(alpha,[(880,463),(947,463),(947,537),(924,536),
   (905,537),(886,544),(864,555),(838,577),(825,608),(794,609),
   (798,590),(813,578),(819,563),(833,551),(843,535),(855,522),
   (864,501),(868,486)])
  # No stationary animal residue found in this base: retain it byte-for-byte.
 elif mode=='moon-fox':
  # A small paw fringe and tip fur lay beyond the original extraction mask.
  alpha=np.maximum(alpha,poly([(405,352),(412,347),(418,348),(426,343),
   (435,346),(444,340),(454,343),(466,350),(467,371),(414,419),
   (404,437),(400,430),(397,416),(398,398),(397,382),(401,368)]))
  # Restrict the tail's upper edge to fur; the former polygon included a
  # dark piece of pavilion between the cheek and the white tail tip.
  tail=poly([(916,479),(932,465),(946,449),(960,431),(976,421),
   (989,413),(999,409),(1016,403),(1033,398),(1047,394),
   (1056,397),(1067,397),(1080,402),(1095,410),(1111,414),
   (1124,421),(1138,432),(1150,445),(1160,457),(1169,470),
   (1177,482),(1180,491),(1167,494),(1154,501),(1144,514),
   (1138,530),(1131,551),(1125,575),(1117,598),(1110,626),
   (1101,653),(1091,676),(1074,697),(1050,680),(1035,631),
   (1041,607),(1049,585),(1046,575),(1034,574),(1023,580),
   (1008,585),(997,579),(985,560),(969,553),(950,550),(927,555),(910,540)])
  yy,xx=np.mgrid[:SIZE[1],:SIZE[0]]
  zone=((xx>=990)&(yy>=370))|((xx>=930)&(yy>=370)&(yy<500))
  alpha[zone]=np.minimum(alpha[zone],tail[zone])
  # Cut the fixed bowl away from the character layer. The supported paw is
  # retained to its fur contour, and the right tail remains a separate lobe.
  bowl=[(800,566),(813,561),(827,558),(839,559),(850,561),
   (858,572),(875,579),(890,584),(906,587),(922,587),
   (938,599),(952,599),(965,596),(977,591),(984,582),
   (986,572),(985,559),(981,551),(991,554),(1004,560),(1014,573),(1017,583),(1030,578),(1048,575),
   (1058,581),(1061,604),(1057,626),(1050,650),(1041,676),
   (1031,691),(1005,709),(796,709)]
  alpha=remove(alpha,bowl)
  bowl_rim=[(979,550),(989,549),(1000,553),(1010,561),(1018,569),
   (1020,574),(1046,573),(1053,580),(1011,589),(998,588),(992,574),(985,563)]
  alpha=remove(alpha,bowl_rim)
  fixed_bowl=np.maximum(poly(bowl),poly(bowl_rim))
  alpha=remove(alpha,[(1038,647),(1060,650),(1075,666),(1078,681),
   (1081,691),(1059,692),(1047,678)])
  patches=[[(374,356),(433,356),(438,448),(374,448)],
   [(930,271),(985,271),(985,408),(930,408)],
   [(1054,369),(1195,369),(1195,468),(1133,468),(1092,430),(1054,418)],
   [(1077,609),(1182,609),(1182,714),(1077,714)]]
 # Edge texels use the actual animal RGB to avoid coloured fringes under
 # linear texture sampling, even where alpha is exactly zero.
 rgb=np.array(original);solid=(alpha>=220).astype('uint8')
 _,labels=cv2.distanceTransformWithLabels(1-solid,cv2.DIST_L2,5,labelType=cv2.DIST_LABEL_PIXEL)
 lookup=np.zeros((int(labels.max())+1,3),dtype=np.uint8)
 lookup[labels[solid>0]]=rgb[solid>0]
 edge=rgb.copy();edge[alpha<220]=lookup[labels[alpha<220]]
 skin=Image.fromarray(np.dstack((edge,alpha)))
 skin.save(ART/f'{mode}-guardian-skin.png')
 base=Image.open(bp).convert('RGB')
 if mode=='sun-lion':
  # The cabinet occludes the stationary lower body. Preserve its original
  # rail and crest where removing those pixels from the skin exposes the
  # differently painted clean plate. These contacts carry zero rig weight.
  old_alpha=np.array(before.getchannel('A'));removed=np.maximum(old_alpha.astype('int16')-alpha,0).astype('uint8')
  removed[:572]=0
  base=Image.composite(original,base,Image.fromarray(removed))
 if mode=='moon-fox':
  # Restore the commissioned static bowl where the old broad extraction had
  # replaced it with clean-plate windows. Only the bowl mask is reinstalled.
  base=Image.composite(original,base,Image.fromarray(fixed_bowl))
 if patches:
  mask=Image.new('L',SIZE);d=ImageDraw.Draw(mask)
  for points in patches:d.polygon(points,fill=255)
  mask=mask.filter(ImageFilter.GaussianBlur(4))
  base=Image.composite(plate,base,mask)
  base.save(ART/f'{mode}-guardian-base.png');mask.save(P/f'{mode}-base-patch-mask.png')
 Image.fromarray(alpha).save(P/f'{mode}-corrected-alpha.png')
 for colour,name in [('#353844','dark'),('#ffffff','white')]:
  bg=Image.new('RGBA',SIZE,colour);bg.alpha_composite(skin)
  bg.convert('RGB').crop((280,20,1220,740)).save(P/f'{mode}-corrected-on-{name}.png')
 composite=base.convert('RGBA');composite.alpha_composite(skin)
 composite.convert('RGB').save(P/f'{mode}-corrected-rest-pose.png')
 reports.append({'mode':mode,'source':str(SOURCE/f'{mode}-wildlife.png'),
  'cleanPlate':str(SOURCE/f'{mode}-underpaint.png'),'fixedBasePatchCount':len(patches),
  'beforeBaseSha256':sha(bp),'beforeSkinSha256':sha(sp),
  'baseSha256':sha(ART/f'{mode}-guardian-base.png'),
  'skinSha256':sha(ART/f'{mode}-guardian-skin.png')})
(P/'provenance.json').write_text(json.dumps({'size':SIZE,
 'method':'exact spatial alpha cleanup of existing commissioned artwork; clean-plate patches remove baked-in fur; nearest solid animal RGB pads transparent edge texels; existing meta UUIDs preserved',
 'modes':reports},ensure_ascii=False,indent=2)+'\n')
print('Installed three corrected animal cutouts and two targeted clean-plate repairs.')
