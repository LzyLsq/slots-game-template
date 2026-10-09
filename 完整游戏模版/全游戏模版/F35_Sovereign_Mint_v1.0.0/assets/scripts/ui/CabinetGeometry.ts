import {GUARDIAN_SWEEP} from './GuardianMotion';
import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1024, CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface GuardianGeometry {
 centre:number;width:number;height:number;bottom:number;pivotInset:number;
}
// Shared by rendering and responsive layout, including every animated pose.
const GUARDIANS:readonly GuardianGeometry[]=[
 {centre:756,width:292,height:348,bottom:815,pivotInset:3},
 {centre:790,width:284,height:307,bottom:815,pivotInset:3},
 {centre:766,width:193,height:356,bottom:815,pivotInset:3},
 {centre:786,width:284,height:356,bottom:815,pivotInset:3},
];
export const CABINET_SAFE_TOP=176,CABINET_SAFE_BOTTOM=236,CABINET_SAFE_SIDE=20;
export const CABINET_TOOLBAR_OFFSET=84;
const CABINET_ART_TOP=384;
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;screenExtension:number;ink:string;titleIndex:number;guardian:GuardianGeometry;
}
// Measured on the FINAL 1024×2304 room composition; cabinet pixels stay 1:1. The dark interior, each molded
// console socket and each inlaid register have different positions by theme.
const define=(index:number, screen:Box, spin:Box, auto:Box, minus:Box, plus:Box, balance:Box, bet:Box, win:Box):CabinetGeometry=>({
 screen,title:[184,876,656,101],balance,bet,win,topWin:win,spin,auto,minus,plus,
 status:[auto[0]-20,auto[1]+auto[3]+14,auto[2]+40,48],screenExtension:0,ink:'#FFF4DE',titleIndex:index,guardian:GUARDIANS[index],
});
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour':define(0,[139,1010,742,247],[357,1285,176,109],[194,1299,112,78],[601,1299,108,78],[755,1299,108,78],[130,1509,183,58],[414,1509,192,58],[714,1509,181,58]),
 'jade-treasury':define(1,[142,1015,738,251],[372,1297,176,109],[195,1308,112,76],[600,1308,108,76],[753,1308,108,76],[177,1509,143,52],[433,1509,156,52],[704,1509,143,52]),
 'pearl-palace':define(2,[142,1009,738,245],[426,1293,176,109],[169,1304,112,78],[640,1304,108,78],[767,1304,108,78],[161,1501,171,60],[415,1501,190,60],[697,1501,160,60]),
 'ruby-revel':define(3,[154,1013,717,247],[427,1297,176,109],[154,1307,104,74],[298,1307,103,74],[695,1307,106,74],[146,1521,155,52],[419,1521,195,52],[729,1521,158,52]),
};
export const CABINET_BUTTON_SEATS:Record<GameId,readonly (readonly [number,number])[]>={
 'golden-hour':[[0,0],[0,0],[0,0],[0,0]],'jade-treasury':[[0,0],[0,0],[0,0],[0,0]],
 'pearl-palace':[[0,0],[0,0],[0,0],[0,0]],'ruby-revel':[[0,0],[0,0],[0,0],[0,0]],
};
export function reelAperture(g:CabinetGeometry,_id?:GameId):Box{
 const [x,y,w,h]=g.screen;return [x+12,y+14,w-24,h-36];
}
/** Insets are measured inside the painted black/enamel glass, not its outer
 * brass surround. Both label lines share the same clipped source-space seat. */
export function registerContent(area:Box):{caption:Box;value:Box}{
 const [x,y,w,h]=area,inset=3,gap=1,captionHeight=(h-inset*2-gap)*.32;
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
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0,leftInset=0,rightInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.topWin,g.status,guardianMotionBounds(g.guardian)];
 const top=1152-Math.min(...boxes.map(b=>b[1]));
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-CABINET_SAFE_TOP,safeBottom=-height/2+bottomInset+CABINET_SAFE_BOTTOM;
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
export function responsiveCabinet(id:GameId,width:number,height:number,topInset=0,bottomInset=0,leftInset=0,rightInset=0):CabinetGeometry {
 const base=CABINETS[id],preferred=[390,270,380,470][base.titleIndex];
 const old=cabinetLayout(width,height,base,topInset,bottomInset,leftInset,rightInset);
 const oldWidth=base.screen[2]*old.scale;
 const minWidth=Math.max(oldWidth*.90,width/height<.68&&oldWidth>=width*.60?width*.60:0);
 const fits=(extra:number):boolean=>{const candidate=expandedCabinet(base,extra);return candidate.screen[2]*cabinetLayout(width,height,candidate,topInset,bottomInset,leftInset,rightInset).scale>=minWidth;};
 let lo=0,hi=preferred;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(fits(mid))lo=mid;else hi=mid-1;}
 return expandedCabinet(base,lo);
}
