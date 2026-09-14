import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=2048;export const CABINET_ROOM_HEIGHT=4096;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// Four original integrated treasury environments. Final apertures are measured on 2304×4608 paintings.
export const CABINETS:Record<GameId,CabinetGeometry>={
 "golden-hour": {
  "screen": [
   86.87,
   627.3,
   851.99,
   810.43
  ],
  "title": [
   164.8,
   410.84,
   692.67,
   148.92
  ],
  "spin": [
   409.5,
   1523.98,
   205,
   205
  ],
  "auto": [
   67.5,
   1563.98,
   125,
   125
  ],
  "minus": [
   629.0,
   1578.48,
   96,
   96
  ],
  "plus": [
   897.0,
   1578.48,
   96,
   96
  ],
  "bet": [
   732.0,
   1584.98,
   150,
   83
  ],
  "status": [
   32,
   1709.48,
   196,
   48
  ],
  "balance": [
   -18.76,
   1832.55,
   318.63,
   81.39
  ],
  "win": [
   344.89,
   1832.55,
   308.24,
   81.39
  ],
  "topWin": [
   699.89,
   1832.55,
   318.63,
   81.39
  ],
  "ink": "#49321B",
  "titleIndex": 1
 },
 "jade-treasury": {
  "screen": [
   50.51,
   706.96,
   924.72,
   626.87
  ],
  "title": [
   140.55,
   492.23,
   755.01,
   135.07
  ],
  "spin": [
   409.5,
   1401.03,
   205,
   205
  ],
  "auto": [
   67.5,
   1441.03,
   125,
   125
  ],
  "minus": [
   666.0,
   1455.53,
   88,
   96
  ],
  "plus": [
   890.0,
   1455.53,
   88,
   96
  ],
  "bet": [
   767.0,
   1462.03,
   110,
   83
  ],
  "status": [
   32,
   1586.53,
   196,
   48
  ],
  "balance": [
   -18.76,
   1745.97,
   318.63,
   81.39
  ],
  "win": [
   344.89,
   1745.97,
   308.24,
   81.39
  ],
  "topWin": [
   699.89,
   1745.97,
   318.63,
   81.39
  ],
  "ink": "#49321B",
  "titleIndex": 2
 },
 "pearl-palace": {
  "screen": [
   66.09,
   658.47,
   893.55,
   668.43
  ],
  "title": [
   150.94,
   388.33,
   727.31,
   157.58
  ],
  "spin": [
   409.5,
   1418.35,
   205,
   205
  ],
  "auto": [
   67.5,
   1458.35,
   125,
   125
  ],
  "minus": [
   629.0,
   1472.85,
   96,
   96
  ],
  "plus": [
   897.0,
   1472.85,
   96,
   96
  ],
  "bet": [
   732.0,
   1479.35,
   150,
   83
  ],
  "status": [
   32,
   1603.85,
   196,
   48
  ],
  "balance": [
   -18.76,
   1659.38,
   318.63,
   81.39
  ],
  "win": [
   344.89,
   1659.38,
   308.24,
   81.39
  ],
  "topWin": [
   699.89,
   1659.38,
   318.63,
   81.39
  ],
  "ink": "#49321B",
  "titleIndex": 3
 },
 "ruby-revel": {
  "screen": [
   73.02,
   639.42,
   876.23,
   865.84
  ],
  "title": [
   152.68,
   388.33,
   729.04,
   133.34
  ],
  "spin": [
   409.5,
   1624.42,
   205,
   205
  ],
  "auto": [
   67.5,
   1664.42,
   125,
   125
  ],
  "minus": [
   629.0,
   1678.92,
   96,
   96
  ],
  "plus": [
   897.0,
   1678.92,
   96,
   96
  ],
  "bet": [
   732.0,
   1685.42,
   150,
   83
  ],
  "status": [
   32,
   1809.92,
   196,
   48
  ],
  "balance": [
   -18.76,
   1974.55,
   318.63,
   81.39
  ],
  "win": [
   344.89,
   1974.55,
   308.24,
   81.39
  ],
  "topWin": [
   699.89,
   1974.55,
   318.63,
   81.39
  ],
  "ink": "#49321B",
  "titleIndex": 4
 }
};
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,1152-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/2304);}
/** Fit the entire interactive cabinet, not just its background crop. */
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.topWin];
 const top=1152-Math.min(-120,...boxes.map(b=>b[1])); // Preserve the woodland mascot above the title on every viewport.
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 const scale=Math.min(cabinetScale(width,height),(safeTop-safeBottom)/(top-bottom),(width-72)/(2*Math.max(512-left,right-512)));
 const y=Math.max(safeBottom-bottom*scale,Math.min(0,safeTop-top*scale));
 return {scale,y};
}
