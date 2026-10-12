import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1024;export const CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
 screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
 status:Box;ink:string;titleIndex:number;
}
// The integrated environment renders at 2048×3072 world units. Measurements
// below use its 1024×1536 source painting; raw (x,y) maps to (2x−1024,1536−2y).
// Reels retain the verified glass openings. Registers, keys and AUTO are seated
// separately in the newly commissioned console rather than using the old art.
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour': {screen:[74,540,876,644],title:[178,300,668,225],
  balance:[115,1269,202,70],bet:[415,1269,202,70],win:[717,1269,202,70],topWin:[717,1269,202,70],
  auto:[661,1444,258,72],spin:[440,1334,152,108],minus:[160,1339,104,98],plus:[768,1339,104,98],
  status:[661,1444,258,72],titleIndex:0,ink:'#FFF0D4'},
 'jade-treasury': {screen:[92,552,840,792],title:[164,340,696,224],
  balance:[145,1369,202,70],bet:[415,1369,202,70],win:[687,1369,202,70],topWin:[687,1369,202,70],
  auto:[109,1506,258,72],spin:[440,1426,152,108],minus:[168,1431,104,98],plus:[746,1431,104,98],
  status:[109,1506,258,72],titleIndex:1,ink:'#FCE9D8'},
 'pearl-palace': {screen:[57,612,910,640],title:[155,333,714,228],
  balance:[113,1303,202,70],bet:[415,1303,202,70],win:[723,1303,202,70],topWin:[723,1303,202,70],
  auto:[85,1472,258,72],spin:[440,1370,152,108],minus:[148,1375,104,98],plus:[768,1375,104,98],
  status:[85,1472,258,72],titleIndex:2,ink:'#FFF2DF'},
 'ruby-revel': {screen:[85,648,854,612],title:[174,407,676,212],
  balance:[141,1341,202,70],bet:[415,1341,202,70],win:[701,1341,202,70],topWin:[701,1341,202,70],
  auto:[665,1496,258,72],spin:[440,1404,152,108],minus:[174,1409,104,98],plus:[750,1409,104,98],
  status:[665,1496,258,72],titleIndex:3,ink:'#FFF0D6'},
};
// All animated reel pixels, guide rules and winning-cell accents share this
// same rectangular mask. The inset leaves a visible painted bevel at every edge.
export function reelAperture(g:CabinetGeometry,_id?:GameId):Box{
 const [x,y,w,h]=g.screen;const edge=17,top=15,bottom=19;
 return [x+edge,y+top,w-2*edge,h-top-bottom];
}
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
export function cabinetLayout(width:number,height:number,_g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 // Fit the entire commissioned cabinet and its floor into the viewport. A
 // themed workshop room fills the side gutters left by short phone screens.
 const scale=Math.min((width-32)/CABINET_ROOM_WIDTH,(height-topInset-bottomInset-40)/CABINET_ROOM_HEIGHT);
 return {scale,y:(bottomInset-topInset)/2};
}
