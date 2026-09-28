import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1024;export const CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// The cabinet art is 2048×4096. It is shown at its native aspect ratio,
// centered and cropped to the 1024×2304 coordinate plane. These boxes were
// measured against the former stretched rendition; remap their horizontal
// positions so reels and controls remain attached to the painted cabinet.
export const CABINET_ART_WIDTH = CABINET_ROOM_HEIGHT * 2048 / 4096;
export const CABINET_ART_X_SCALE = CABINET_ART_WIDTH / CABINET_ROOM_WIDTH;
export function cabinetArtBox(box: Box): Box {
  const [x, y, w, h] = box;
  return [CABINET_ROOM_WIDTH / 2 + (x - CABINET_ROOM_WIDTH / 2) * CABINET_ART_X_SCALE,
    y * CABINET_ART_X_SCALE, w * CABINET_ART_X_SCALE, h * CABINET_ART_X_SCALE];
}
const STRETCHED_CABINETS:Record<GameId,CabinetGeometry>={
 'golden-hour': {screen:[163,630,695,298],title:[163,422,698,132],
  spin:[415,1036,194,160],auto:[185,1062,120,108],minus:[699,1064,92,92],plus:[805,1064,92,92],
  bet:[420,980,185,70],balance:[121,980,245,70],win:[394,980,236,70],topWin:[656,980,230,70],
  status:[142,1170,210,48],titleIndex:0,ink:'#F7E3BA', },
 'jade-treasury': {screen:[201,641,618,290],title:[207,447,615,130],
  spin:[415,1052,194,160],auto:[185,1078,120,108],minus:[699,1080,92,92],plus:[805,1080,92,92],
  bet:[420,984,185,70],balance:[121,984,245,70],win:[394,984,236,70],topWin:[656,984,230,70],
  status:[142,1186,210,48],titleIndex:1,ink:'#F7E3BA', },
 'pearl-palace': {screen:[190,681,653,331],title:[152,516,718,133],
  spin:[415,1142,194,160],auto:[185,1168,120,108],minus:[699,1170,92,92],plus:[805,1170,92,92],
  bet:[420,1065,185,70],balance:[121,1065,245,70],win:[394,1065,236,70],topWin:[656,1065,230,70],
  status:[142,1276,210,48],titleIndex:2,ink:'#F7E3BA', },
 'ruby-revel': {screen:[166,643,701,350],title:[170,450,690,134],
  spin:[415,1092,194,160],auto:[185,1118,120,108],minus:[699,1120,92,92],plus:[805,1120,92,92],
  bet:[420,1043,185,70],balance:[121,1043,245,70],win:[394,1043,236,70],topWin:[656,1043,230,70],
  status:[142,1226,210,48],titleIndex:3,ink:'#F7E3BA', },
};
/** Plane-space correction to seat bitmap faces in the four painted console sockets.
 * Index order: SPIN, +, -, AUTO. The hit target and face move together. */
export const CABINET_BUTTON_SEATS:Record<GameId,readonly (readonly [number,number])[]>={
 'golden-hour': [[0,-43],[-43,-39],[-34,-39],[-36,-39]],
 'jade-treasury': [[0,-12],[-56,-32],[-39,-32],[-29,-36]],
 'pearl-palace': [[0,-43],[-47,-72],[-35,-72],[-37,-72]],
 'ruby-revel': [[0,-43],[-43,-72],[-35,-72],[-36,-72]],
};
export const CABINETS:Record<GameId,CabinetGeometry>=Object.fromEntries(
  Object.entries(STRETCHED_CABINETS).map(([id,geometry])=>[
    id,
    {...geometry,...Object.fromEntries(
      (['screen','title','balance','win','spin','minus','plus','auto','bet','topWin','status'] as const)
        .map(key=>[key,cabinetArtBox(geometry[key])]))},
  ]),
) as Record<GameId,CabinetGeometry>;
// The painted glass reaches close to the bevel. Reels, guides and award accents
// share this slightly smaller aperture so animated art never paints over metal.
export function reelAperture(g:CabinetGeometry, id?:GameId):Box{
 const [x,y,w,h]=g.screen;
 // The Atlas glass begins below the compass studs painted into its upper
 // metal rail. Its four rows need a lower, shallower aperture than the other
 // cabinets so the first row stays inside the actual glass opening.
 const left=23,right=23,top=id==='pearl-palace'?87:22,bottom=28;
 return [x+left,y+top,w-left-right,h-top-bottom];
}
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.topWin];
 // Fit the playable assembly rather than the large decorative clock above it.
 // That clock remains part of the room, but must not halve the reel window on
 // short phones. The painted screen and all controls share this one transform.
 const top=1152-Math.min(...boxes.map(b=>b[1]));
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 const scale=Math.min(cabinetScale(width,height)*1.16,(safeTop-safeBottom)/(top-bottom),(width-72)/(2*Math.max(512-left,right-512)));
 const lowestY=safeBottom-bottom*scale,highestY=safeTop-top*scale;
 const y=(lowestY+highestY)/2;
 return {scale,y};
}
