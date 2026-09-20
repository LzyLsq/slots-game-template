import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1536;
export const CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// One continuous 1024×1536 painting fills the 1536×2304 room plane. The
// horizontal extension is painted scenery, not mirrored strips or a backdrop.
// Interiors were remeasured on the final outpaint: all overlays and art share
// this transform. The legacy 1024-wide coordinate origin is kept for VFX.
const pixels=(x:number,y:number,w:number,h:number):Box=>[x*1.5-256,y*1.5,w*1.5,h*1.5];
function measured(index:number,screen:Box,title:Box,meter:Box,result:Box,left:readonly[number,number],center:readonly[number,number],right:readonly[number,number]):CabinetGeometry {
  return {
    screen:pixels(...screen),title:pixels(...title),
    balance:pixels(meter[0]+4,meter[1],meter[2]*.60,meter[3]),
    topWin:pixels(meter[0]+meter[2]*.64,meter[1],meter[2]*.34,meter[3]),
    win:pixels(result[0]+5,result[1],result[2]*.48,result[3]),
    bet:pixels(result[0]+result[2]*.53,result[1],result[2]*.44,result[3]),
    minus:pixels(left[0]-45,left[1]-43,90,86),
    plus:pixels(right[0]-45,right[1]-43,90,86),
    spin:pixels(center[0]-75,center[1]-66,150,132),
    auto:pixels(465,1184,94,77),status:pixels(442,1264,140,30),
    ink:'#442810',titleIndex:index+1,
  };
}
export const CABINETS:Record<GameId,CabinetGeometry>={
  'golden-hour':measured(0,[280,478,464,360],[330,205,364,96],[281,365,462,44],[336,895,352,39],[321,1070],[512,1074],[701,1070]),
  'jade-treasury':measured(1,[286,473,450,360],[357,222,312,99],[311,373,404,45],[332,889,355,39],[336,1062],[512,1066],[688,1062]),
  'pearl-palace':measured(2,[305,516,416,377],[326,250,374,132],[302,417,421,36],[344,947,340,35],[337,1094],[512,1102],[687,1094]),
  'ruby-revel':measured(3,[302,480,420,400],[355,215,315,116],[319,384,390,34],[350,933,327,35],[329,1102],[512,1109],[692,1102]),
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/CABINET_ROOM_WIDTH,height/CABINET_ROOM_HEIGHT);}
/** Preserve the artwork ratio and the whole interactive cabinet within safe UI. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
  const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.topWin,g.status];
  const top=1152-Math.min(...boxes.map(b=>b[1]));
  const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
  const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
  const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
  // Size the cabinet, not the additional scenery. Filling only the room can
  // expose an edge after safe-area translation. Its extra painted width lets
  // short screens fit the full cabinet without a separate backdrop layer.
  const scale=Math.min(Math.max(width/1024,height/2304),(safeTop-safeBottom)/(top-bottom),(width-48)/(2*Math.max(512-left,right-512)));
  const y=Math.max(safeBottom-bottom*scale,Math.min(0,safeTop-top*scale));
  return {scale,y};
}
