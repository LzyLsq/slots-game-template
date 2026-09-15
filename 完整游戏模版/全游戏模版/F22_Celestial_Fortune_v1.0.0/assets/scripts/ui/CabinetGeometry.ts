import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=3072;export const CABINET_ROOM_HEIGHT=5376;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
  screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;
  status:Box;ink:string;titleIndex:number;
}
// Four original integrated treasury environments. Final apertures are measured on original full-scene paintings.
export const CABINETS:Record<GameId,CabinetGeometry>={
 "golden-hour": {
  "screen": [
   24.3,
   786.63,
   972.15,
   562.23
  ],
  "title": [
   24.3,
   567.9,
   972.15,
   191.19
  ],
  "spin": [
   406.68,
   1468.7,
   210.63,
   210.63
  ],
  "auto": [
   12.25,
   1509.21,
   139.34,
   139.34
  ],
  "minus": [
   729.97,
   1544.85,
   81.01,
   81.01
  ],
  "bet": [
   848.39,
   1533.51,
   156.66,
   110.18
  ],
  "plus": [
   1057.81,
   1544.85,
   81.01,
   81.01
  ],
  "status": [
   -56.32,
   1655.03,
   276.48,
   48.61
  ],
  "balance": [
   -71.68,
   1825.43,
   353.28,
   77.77
  ],
  "win": [
   320.0,
   1825.43,
   353.28,
   77.77
  ],
  "topWin": [
   711.68,
   1825.43,
   384.0,
   77.77
  ],
  "ink": "#49321B",
  "titleIndex": 0
 },
 "jade-treasury": {
  "screen": [
   -34.03,
   810.13,
   1090.43,
   567.09
  ],
  "title": [
   -34.03,
   591.39,
   1090.43,
   191.19
  ],
  "spin": [
   406.68,
   1490.88,
   210.63,
   210.63
  ],
  "auto": [
   12.25,
   1531.39,
   139.34,
   139.34
  ],
  "minus": [
   729.97,
   1567.04,
   81.01,
   81.01
  ],
  "bet": [
   848.39,
   1555.69,
   156.66,
   110.18
  ],
  "plus": [
   1057.81,
   1567.04,
   81.01,
   81.01
  ],
  "status": [
   -56.32,
   1677.21,
   276.48,
   48.61
  ],
  "balance": [
   -71.68,
   1887.72,
   353.28,
   77.77
  ],
  "win": [
   320.0,
   1887.72,
   353.28,
   77.77
  ],
  "topWin": [
   711.68,
   1887.72,
   384.0,
   77.77
  ],
  "ink": "#49321B",
  "titleIndex": 1
 },
 "pearl-palace": {
  "screen": [
   -66.43,
   819.04,
   1153.62,
   628.66
  ],
  "title": [
   -66.43,
   600.3,
   1153.62,
   191.19
  ],
  "spin": [
   406.68,
   1621.92,
   210.63,
   210.63
  ],
  "auto": [
   12.25,
   1662.42,
   139.34,
   139.34
  ],
  "minus": [
   729.97,
   1698.07,
   81.01,
   81.01
  ],
  "bet": [
   848.39,
   1686.73,
   156.66,
   110.18
  ],
  "plus": [
   1057.81,
   1698.07,
   81.01,
   81.01
  ],
  "status": [
   -56.32,
   1808.24,
   276.48,
   48.61
  ],
  "balance": [
   -71.68,
   1938.33,
   353.28,
   77.77
  ],
  "win": [
   320.0,
   1938.33,
   353.28,
   77.77
  ],
  "topWin": [
   711.68,
   1938.33,
   384.0,
   77.77
  ],
  "ink": "#49321B",
  "titleIndex": 2
 },
 "ruby-revel": {
  "screen": [
   -66.43,
   648.91,
   1155.24,
   667.54
  ],
  "title": [
   -66.43,
   430.18,
   1155.24,
   191.19
  ],
  "spin": [
   406.68,
   1457.95,
   210.63,
   210.63
  ],
  "auto": [
   12.25,
   1498.45,
   139.34,
   139.34
  ],
  "minus": [
   729.97,
   1534.1,
   81.01,
   81.01
  ],
  "bet": [
   848.39,
   1522.76,
   156.66,
   110.18
  ],
  "plus": [
   1057.81,
   1534.1,
   81.01,
   81.01
  ],
  "status": [
   -56.32,
   1644.28,
   276.48,
   48.61
  ],
  "balance": [
   -71.68,
   1849.63,
   353.28,
   77.77
  ],
  "win": [
   320.0,
   1849.63,
   353.28,
   77.77
  ],
  "topWin": [
   711.68,
   1849.63,
   384.0,
   77.77
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
 const top=1152-Math.min(45,...boxes.map(b=>b[1])); // Preserve the palace mascot above the title on every viewport.
 const bottom=1152-Math.max(...boxes.map(b=>b[1]+b[3]));
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-170,safeBottom=-height/2+bottomInset+158;
 const scale=Math.min(cabinetScale(width,height),(safeTop-safeBottom)/(top-bottom),(width-72)/(2*Math.max(512-left,right-512)));
 const y=Math.max(safeBottom-bottom*scale,Math.min(0,safeTop-top*scale));
 return {scale,y};
}
