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
    y, w * CABINET_ART_X_SCALE, h];
}
const STRETCHED_CABINETS:Record<GameId,CabinetGeometry>={
  'golden-hour': {
    screen:[136,776,752,480],
    title:[158,626,708,122],
    spin:[412,1390,200,200],
    auto:[190,1472,112,112],
    minus:[673,1480,100,100],
    plus:[790,1480,100,100],
    bet:[610,1620,206,78],
    balance:[100,1740,275,72],
    win:[375,1740,275,72],
    topWin:[650,1740,275,72],
    status:[100,1830,210,48],
    titleIndex:0,
    ink:'#523319',
  },
  'jade-treasury': {
    screen:[89,926,846,511],
    title:[145,735,734,126],
    spin:[410,1618,204,204],
    auto:[167,1710,112,112],
    minus:[699,1708,94,94],
    plus:[819,1708,94,94],
    bet:[585,1850,211,76],
    balance:[100,1960,275,72],
    win:[375,1960,275,72],
    topWin:[650,1960,275,72],
    status:[100,2040,210,48],
    titleIndex:1,
    ink:'#523319',
  },
  'pearl-palace': {
    screen:[143,788,738,494],
    title:[159,636,706,122],
    spin:[412,1390,200,200],
    auto:[177,1454,112,112],
    minus:[689,1452,94,94],
    plus:[816,1452,94,94],
    bet:[610,1605,206,78],
    balance:[100,1718,275,72],
    win:[375,1718,275,72],
    topWin:[650,1718,275,72],
    status:[100,1800,210,48],
    titleIndex:2,
    ink:'#523319',
  },
  'ruby-revel': {
    screen:[134,722,754,484],
    title:[160,555,704,128],
    spin:[412,1284,200,200],
    auto:[186,1360,112,112],
    minus:[692,1362,94,94],
    plus:[816,1362,94,94],
    bet:[610,1515,206,78],
    balance:[100,1630,275,72],
    win:[375,1630,275,72],
    topWin:[650,1630,275,72],
    status:[100,1715,210,48],
    titleIndex:3,
    ink:'#523319',
  },
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
export function reelAperture(g:CabinetGeometry):Box{
 const [x,y,w,h]=g.screen;
 const left=23,right=23,top=22,bottom=28;
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
