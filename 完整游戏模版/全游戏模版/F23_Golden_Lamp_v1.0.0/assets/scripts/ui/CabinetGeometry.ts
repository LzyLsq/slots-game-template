import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1536;export const CABINET_ROOM_HEIGHT=2304;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;topWin:Box;status:Box;ink:string;titleIndex:number;}
// Each aperture measured from its final source painting; all components share one transform.
export const CABINETS:Record<GameId,CabinetGeometry>={
  "jade-treasury": {
    "screen": [
      17.0,
      651.0,
      988.5,
      727.5
    ],
    "title": [
      66.5,
      475.5,
      891.0,
      142.5
    ],
    "spin": [
      419.0,
      1440.0,
      186.0,
      186.0
    ],
    "minus": [
      -8.5,
      1489.5,
      103.5,
      103.5
    ],
    "bet": [
      111.5,
      1500.0,
      168.0,
      99.0
    ],
    "plus": [
      293.0,
      1489.5,
      103.5,
      103.5
    ],
    "auto": [
      816.5,
      1512.0,
      219.0,
      103.5
    ],
    "status": [
      794.0,
      1605.0,
      264.0,
      52.5
    ],
    "balance": [
      -31.0,
      1740.0,
      324.0,
      84.0
    ],
    "win": [
      333.5,
      1740.0,
      324.0,
      84.0
    ],
    "topWin": [
      698.0,
      1740.0,
      354.0,
      84.0
    ],
    "ink": "#49321B",
    "titleIndex": 1
  },
  "pearl-palace": {
    "screen": [
      21.5,
      693.0,
      981.0,
      649.5
    ],
    "title": [
      66.5,
      517.5,
      891.0,
      142.5
    ],
    "spin": [
      419.0,
      1404.0,
      186.0,
      186.0
    ],
    "minus": [
      -8.5,
      1453.5,
      103.5,
      103.5
    ],
    "bet": [
      111.5,
      1464.0,
      168.0,
      99.0
    ],
    "plus": [
      293.0,
      1453.5,
      103.5,
      103.5
    ],
    "auto": [
      816.5,
      1476.0,
      219.0,
      103.5
    ],
    "status": [
      794.0,
      1569.0,
      264.0,
      52.5
    ],
    "balance": [
      -31.0,
      1704.0,
      324.0,
      84.0
    ],
    "win": [
      333.5,
      1704.0,
      324.0,
      84.0
    ],
    "topWin": [
      698.0,
      1704.0,
      354.0,
      84.0
    ],
    "ink": "#49321B",
    "titleIndex": 2
  },
  "ruby-revel": {
    "screen": [
      24.5,
      744.0,
      975.0,
      658.5
    ],
    "title": [
      66.5,
      568.5,
      891.0,
      142.5
    ],
    "spin": [
      419.0,
      1464.0,
      186.0,
      186.0
    ],
    "minus": [
      -8.5,
      1513.5,
      103.5,
      103.5
    ],
    "bet": [
      111.5,
      1524.0,
      168.0,
      99.0
    ],
    "plus": [
      293.0,
      1513.5,
      103.5,
      103.5
    ],
    "auto": [
      816.5,
      1536.0,
      219.0,
      103.5
    ],
    "status": [
      794.0,
      1629.0,
      264.0,
      52.5
    ],
    "balance": [
      -31.0,
      1764.0,
      324.0,
      84.0
    ],
    "win": [
      333.5,
      1764.0,
      324.0,
      84.0
    ],
    "topWin": [
      698.0,
      1764.0,
      354.0,
      84.0
    ],
    "ink": "#49321B",
    "titleIndex": 3
  },
  "golden-hour": {
    "screen": [
      17.0,
      651.0,
      988.5,
      727.5
    ],
    "title": [
      66.5,
      475.5,
      891.0,
      142.5
    ],
    "spin": [
      419.0,
      1440.0,
      186.0,
      186.0
    ],
    "minus": [
      -8.5,
      1489.5,
      103.5,
      103.5
    ],
    "bet": [
      111.5,
      1500.0,
      168.0,
      99.0
    ],
    "plus": [
      293.0,
      1489.5,
      103.5,
      103.5
    ],
    "auto": [
      816.5,
      1512.0,
      219.0,
      103.5
    ],
    "status": [
      794.0,
      1605.0,
      264.0,
      52.5
    ],
    "balance": [
      -31.0,
      1740.0,
      324.0,
      84.0
    ],
    "win": [
      333.5,
      1740.0,
      324.0,
      84.0
    ],
    "topWin": [
      698.0,
      1740.0,
      354.0,
      84.0
    ],
    "ink": "#49321B",
    "titleIndex": 0
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
