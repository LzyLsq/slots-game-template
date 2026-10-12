import {GUARDIAN_SWEEP} from './GuardianMotion';
import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1024, CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface GuardianGeometry {
 centre:number;width:number;height:number;bottom:number;pivotInset:number;
}
// Shared by rendering and responsive layout, including every animated pose.
const K=1024/836;
const GUARDIANS:readonly GuardianGeometry[]=[
 {centre:720*K,width:156*K,height:220*K,bottom:550*K,pivotInset:2},
 {centre:641*K,width:153*K,height:189*K,bottom:635*K,pivotInset:2},
 {centre:670*K,width:152*K,height:191*K,bottom:709*K,pivotInset:2},
 {centre:642*K,width:158*K,height:214*K,bottom:615*K,pivotInset:2},
];
export const CABINET_SAFE_TOP=164,CABINET_SAFE_BOTTOM=270,CABINET_SAFE_SIDE=20;
export const CABINET_TOOLBAR_OFFSET=84;
const CABINET_ART_TOP=384;
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;screenExtension:number;ink:string;titleIndex:number;guardian:GuardianGeometry;
}
// Measured on the FINAL 1024×2304 room composition; cabinet pixels stay 1:1. The dark interior, each molded
// console socket and each inlaid register have different positions by theme.
const measured=(index:number,screen:Box,title:Box,balance:Box,bet:Box,win:Box,spin:Box,minus:Box,plus:Box,auto:Box):CabinetGeometry=>{
 // AUTO state belongs above its own engraved switch, never under SPIN.
 const scale=(box:Box):Box=>box.map(v=>v*K) as unknown as Box;
 return {screen:scale(screen),title:scale(title),balance:scale(balance),bet:scale(bet),win:scale(win),topWin:scale(win),spin:scale(spin),minus:scale(minus),plus:scale(plus),auto:scale(auto),status:scale([auto[0]-6,auto[1]-30,auto[2]+12,28]),screenExtension:0,ink:'#FFF4DE',titleIndex:index,guardian:GUARDIANS[index]};
};
/** Measured in original 836x1881 generated renders, not prompt coordinates. */
export const CABINETS:Record<GameId,CabinetGeometry>={
 'caravan-gold':measured(0,[111,699,602,400],[176,520,469,102],[113,1137,180,57],[329,1137,177,57],[540,1137,173,57],[332,1260,165,154],[127,1280,113,110],[591,1280,113,110],[107,1421,132,40]),
 'sapphire-oasis':measured(1,[139,704,560,420],[153,531,340,94],[146,1174,153,50],[335,1174,165,50],[540,1174,151,50],[344,1277,144,139],[162,1297,80,79],[592,1297,80,79],[123,1408,145,38]),
 'ruby-bazaar':measured(2,[122,784,593,358],[152,606,392,100],[133,1187,170,52],[337,1187,161,52],[534,1187,169,52],[350,1308,142,143],[169,1332,88,87],[582,1332,88,87],[127,1458,113,34]),
 'crown-voyage':measured(3,[123,700,589,412],[156,565,372,86],[132,1154,171,47],[331,1154,172,47],[530,1154,174,47],[337,1250,163,140],[165,1274,88,85],[587,1274,88,85],[145,1393,135,44]),
};
export const CABINET_BUTTON_SEATS:Record<GameId,readonly (readonly [number,number])[]>={
 'caravan-gold':[[0,0],[0,0],[0,0],[0,0]],'sapphire-oasis':[[0,0],[0,0],[0,0],[0,0]],
 'ruby-bazaar':[[0,0],[0,0],[0,0],[0,0]],'crown-voyage':[[0,0],[0,0],[0,0],[0,0]],
};
export function reelAperture(g:CabinetGeometry,_id?:GameId):Box{
 const [x,y,w,h]=g.screen;return [x+6,y+6,w-12,h-24];
}
/** Insets are measured inside the painted black/enamel glass, not its outer
 * brass surround. Both label lines share the same clipped source-space seat. */
export function registerContent(area:Box):{caption:Box;value:Box}{
 const [x,y,w,h]=area,inset=3,gap=1,captionHeight=(h-inset*2-gap)*.40;
 return {caption:[x+inset,y+inset,w-inset*2,captionHeight],
  value:[x+inset,y+inset+captionHeight+gap,w-inset*2,h-inset*2-captionHeight-gap]};
}
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
/** Local joint-deformation envelope, including touch and all award tiers.
 * Planted feet never move. Original artwork proportions stay unchanged. */
export function guardianMotionBounds(guardian:GuardianGeometry):Box{
 const {centre,width,height,bottom}=guardian;
 return [centre-width*(.5+GUARDIAN_SWEEP.x),bottom-height*(1+GUARDIAN_SWEEP.y),width*(1+2*GUARDIAN_SWEEP.x),height*(1+2*GUARDIAN_SWEEP.y)];
}
/** Reserve the complete footer in the same design coordinates as the cabinet.
 * Compact phones use a lower award register; never lay it over AUTO or SPIN.
 * 116 is the title shoulder above the 160px ordinary-award plate. */
export function cabinetFooter(width:number,height:number,bottomInset=0):{reserve:number;hintY:number;awardY:number}{
 const awardOffset=height/width<1.95?140:290;
 return {reserve:awardOffset+130,hintY:-height/2+bottomInset+140,awardY:-height/2+bottomInset+awardOffset};
}
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0,leftInset=0,rightInset=0):{scale:number;y:number}{
 // Retain the measured lower touch clearance even when the AUTO caption
 // moves above the switch. Otherwise short screens zoom in and push its
 // larger invisible touch target into the award/footer area.
 const autoDock:Box=[g.auto[0],g.auto[1],g.auto[2],Math.max(g.auto[3],45*K)];
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,autoDock,g.bet,g.topWin,g.status,guardianMotionBounds(g.guardian)];
 const top=1152-Math.min(...boxes.map(b=>b[1]));
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-CABINET_SAFE_TOP,safeBottom=-height/2+bottomInset+cabinetFooter(width,height,bottomInset).reserve;
 const horizontalScale=Math.min(
  (width/2-leftInset-CABINET_SAFE_SIDE)/Math.max(1,512-left),
  (width/2-rightInset-CABINET_SAFE_SIDE)/Math.max(1,right-512),
 );
 const scale=Math.min(cabinetScale(width,height)*1.18,(safeTop-safeBottom)/(top-bottom),horizontalScale);
 const lowestY=safeBottom-bottom*scale,highestY=safeTop-top*scale;
 // Anchor the authored architecture just below the top tools on tall phones,
 // instead of centering the controls and leaving a large flat headspace.
 // The sweep/footer bounds remain authoritative on compact screens/tablets.
 const architectureY=height/2-topInset-(CABINET_SAFE_TOP-32)-(1152-CABINET_ART_TOP)*scale;
 return {scale,y:Math.max(lowestY,Math.min(highestY,architectureY))};
}

/** A portrait glass window, not a uniformly stretched machine. All counters,
 * buttons, title relief and guardian keep their original source dimensions. */
export function expandedCabinet(base:CabinetGeometry,extension:number):CabinetGeometry {
 const extra=Math.max(0,Math.round(extension));
 const below=(b:Box):Box=>[b[0],b[1]+extra,b[2],b[3]];
 return {...base,screenExtension:extra,screen:[base.screen[0],base.screen[1],base.screen[2],base.screen[3]+extra],
  balance:below(base.balance),bet:below(base.bet),win:below(base.win),topWin:below(base.topWin),
  spin:below(base.spin),auto:below(base.auto),minus:below(base.minus),plus:below(base.plus),status:below(base.status)};
}
/** Source and destination strips are adjacent. Stretch only narrow portions of
 * the continuous glass/rail; the central ornament, crown and console stay 1:1. */
export function cabinetRoomStrips(base:CabinetGeometry,extra:number):readonly {sourceY:number;sourceHeight:number;destY:number;destHeight:number}[] {
 const first=base.screen[1]+34,second=base.screen[1]+base.screen[3]-54,strip=20;
 const half=extra/2,edges=[0,first,first+strip,second,second+strip,CABINET_ROOM_HEIGHT];
 let destY=0;
 return edges.slice(0,-1).map((sourceY,i)=>{
  const sourceHeight=edges[i+1]-sourceY,destHeight=sourceHeight+(i===1||i===3?half:0);
  const part={sourceY,sourceHeight,destY,destHeight};destY+=destHeight;return part;
 });
}
/** Compact phones trade a little additional glass height, never the readability
 * of the whole cabinet. Keep >=60% viewport width and >=90% of the old width. */
export function responsiveCabinet(id:GameId,_width:number,_height:number,_topInset=0,_bottomInset=0,_leftInset=0,_rightInset=0):CabinetGeometry{return CABINETS[id];}
