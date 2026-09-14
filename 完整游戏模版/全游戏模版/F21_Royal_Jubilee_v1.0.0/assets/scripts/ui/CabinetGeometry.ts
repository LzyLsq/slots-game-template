import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=2765;export const CABINET_ROOM_HEIGHT=4147;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// Four original integrated treasury environments. Final apertures are measured on 2304×4608 paintings.
export const CABINETS:Record<GameId,CabinetGeometry>={
 "golden-hour": {
  "screen": [
   -3.7,
   965.7,
   1017.9,
   621.0
  ],
  "title": [
   -57.7,
   695.7,
   1125.9,
   205.2
  ],
  "spin": [
   401.3,
   1689.3,
   221.4,
   221.4
  ],
  "auto": [
   -76.6,
   1727.1,
   143.1,
   143.1
  ],
  "minus": [
   728.0,
   1751.4,
   97.2,
   97.2
  ],
  "plus": [
   1030.4,
   1751.4,
   97.2,
   97.2
  ],
  "bet": [
   852.2,
   1751.4,
   153.9,
   102.6
  ],
  "status": [
   -122.9,
   1881.0,
   243.8,
   56.7
  ],
  "balance": [
   -127.9,
   1956.6,
   407.7,
   72.9
  ],
  "win": [
   325.7,
   1956.6,
   375.3,
   72.9
  ],
  "topWin": [
   746.9,
   1956.6,
   407.7,
   72.9
  ],
  "ink": "#49321B",
  "titleIndex": 0
 },
 "jade-treasury": {
  "screen": [
   -22.6,
   963.0,
   1069.2,
   558.9
  ],
  "title": [
   -76.6,
   693.0,
   1177.2,
   205.2
  ],
  "spin": [
   401.3,
   1694.7,
   221.4,
   221.4
  ],
  "auto": [
   -76.6,
   1732.5,
   143.1,
   143.1
  ],
  "minus": [
   728.0,
   1756.8,
   97.2,
   97.2
  ],
  "plus": [
   1030.4,
   1756.8,
   97.2,
   97.2
  ],
  "bet": [
   852.2,
   1756.8,
   153.9,
   102.6
  ],
  "status": [
   -122.9,
   1886.4,
   243.8,
   56.7
  ],
  "balance": [
   -127.9,
   1975.5,
   407.7,
   72.9
  ],
  "win": [
   325.7,
   1975.5,
   375.3,
   72.9
  ],
  "topWin": [
   746.9,
   1975.5,
   407.7,
   72.9
  ],
  "ink": "#49321B",
  "titleIndex": 1
 },
 "pearl-palace": {
  "screen": [
   -14.5,
   871.2,
   1061.1,
   688.5
  ],
  "title": [
   -68.5,
   601.2,
   1169.1,
   205.2
  ],
  "spin": [
   401.3,
   1670.4,
   221.4,
   221.4
  ],
  "auto": [
   -76.6,
   1708.2,
   143.1,
   143.1
  ],
  "minus": [
   728.0,
   1732.5,
   97.2,
   97.2
  ],
  "plus": [
   1030.4,
   1732.5,
   97.2,
   97.2
  ],
  "bet": [
   852.2,
   1732.5,
   153.9,
   102.6
  ],
  "status": [
   -122.9,
   1862.1,
   243.8,
   56.7
  ],
  "balance": [
   -127.9,
   2064.6,
   407.7,
   72.9
  ],
  "win": [
   325.7,
   2064.6,
   375.3,
   72.9
  ],
  "topWin": [
   746.9,
   2064.6,
   407.7,
   72.9
  ],
  "ink": "#49321B",
  "titleIndex": 2
 },
 "ruby-revel": {
  "screen": [
   -6.4,
   871.2,
   1034.1,
   594.0
  ],
  "title": [
   -60.4,
   601.2,
   1142.1,
   205.2
  ],
  "spin": [
   401.3,
   1538.1,
   221.4,
   221.4
  ],
  "auto": [
   -76.6,
   1575.9,
   143.1,
   143.1
  ],
  "minus": [
   728.0,
   1600.2,
   97.2,
   97.2
  ],
  "plus": [
   1030.4,
   1600.2,
   97.2,
   97.2
  ],
  "bet": [
   852.2,
   1600.2,
   153.9,
   102.6
  ],
  "status": [
   -122.9,
   1729.8,
   243.8,
   56.7
  ],
  "balance": [
   -127.9,
   1875.6,
   407.7,
   72.9
  ],
  "win": [
   325.7,
   1875.6,
   375.3,
   72.9
  ],
  "topWin": [
   746.9,
   1875.6,
   407.7,
   72.9
  ],
  "ink": "#49321B",
  "titleIndex": 3
 }
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
/** Fit the entire interactive cabinet, not just its background crop. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.topWin];
 const top=1152-Math.min(-120,...boxes.map(b=>b[1])); // Preserve the palace mascot above the title on every viewport.
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 const scale=Math.min(cabinetScale(width,height),(safeTop-safeBottom)/(top-bottom),(width-72)/(2*Math.max(512-left,right-512)));
 const y=Math.max(safeBottom-bottom*scale,Math.min(0,safeTop-top*scale));
 return {scale,y};
}
