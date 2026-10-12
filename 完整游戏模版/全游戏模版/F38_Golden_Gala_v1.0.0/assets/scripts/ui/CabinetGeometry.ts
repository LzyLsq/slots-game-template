import {GUARDIAN_SWEEP} from './GuardianMotion';
import type {GameId} from '../math/types';
export const CABINET_ROOM_WIDTH=1024,CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface GuardianGeometry{centre:number;width:number;height:number;bottom:number;pivotInset:number;}
const K=2304/1881,DX=(836*K-1024)/2;
export const CABINET_SAFE_TOP=164,CABINET_SAFE_BOTTOM=270,CABINET_SAFE_SIDE=20,CABINET_TOOLBAR_OFFSET=84;
const CABINET_ART_TOP=100;
export interface CabinetGeometry{screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;status:Box;screenExtension:number;ink:string;titleIndex:number;guardian:GuardianGeometry;}
const measured=(index:number,screen:Box,title:Box,balance:Box,bet:Box,win:Box,spin:Box,minus:Box,plus:Box,auto:Box,guardian:readonly[number,number,number,number]):CabinetGeometry=>{
 const scale=(b:Box):Box=>[b[0]*K-DX,b[1]*K,b[2]*K,b[3]*K];
 return {screen:scale(screen),title:scale(title),balance:scale(balance),bet:scale(bet),win:scale(win),topWin:scale(win),spin:scale(spin),minus:scale(minus),plus:scale(plus),auto:scale(auto),status:scale([auto[0]+auto[2]/2-65,auto[1]-32,130,30]),screenExtension:0,ink:'#FFF4DE',titleIndex:index,guardian:{centre:guardian[0]*K-DX,width:guardian[1]*K,height:guardian[2]*K,bottom:guardian[3]*K,pivotInset:2}};
};
/** Measurements from the actual 836×1881 art, transformed by uniform cover scaling. */
export const CABINETS:Record<GameId,CabinetGeometry>={
 'crown-club':measured(0,[81,540,674,508],[110,383,421,118],[65,1108,204,64],[311,1108,207,64],[564,1108,196,64],[334,1207,169,150],[222,1235,95,98],[535,1235,101,98],[113,1243,78,73],[654,145,178,406]),
 'emerald-fortune':measured(1,[95,564,649,532],[109,351,618,96],[84,1127,189,64],[312,1127,210,64],[555,1127,195,64],[350,1210,162,148],[226,1235,93,89],[560,1235,91,89],[101,1252,81,59],[654,128,155,299]),
 'ruby-royale':measured(2,[73,475,701,516],[193,250,432,130],[91,1061,184,65],[321,1061,212,65],[572,1061,177,65],[363,1186,147,144],[244,1216,89,80],[546,1216,93,80],[115,1238,69,40],[719,130,196,402]),
 'vault-reserve':measured(3,[71,481,693,583],[77,347,478,88],[64,1114,223,77],[327,1114,199,77],[570,1114,218,77],[359,1235,169,165],[242,1262,96,104],[572,1262,96,104],[98,1284,81,53],[717,147,193,408]),
};
export const CABINET_BUTTON_SEATS:Record<GameId,readonly (readonly[number,number])[]>=Object.fromEntries(Object.keys(CABINETS).map(id=>[id,[[0,0],[0,0],[0,0],[0,0]]])) as unknown as Record<GameId,readonly (readonly[number,number])[]>;
export function reelAperture(g:CabinetGeometry,_id?:GameId):Box{
 const [x,y,w,h]=g.screen;return [x+8,y+8,w-16,h-24];
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
 * 116 contains the complete 220px ordinary-award plaque and its glint clearance. */
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
