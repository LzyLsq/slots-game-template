import type { GameId } from '../math/types';
/** F32's cabinet artwork is a single 941×1672 render, uniformly scaled to 1024×1820.
 * All apertures below were measured on that image. No separate blurred floor layer. */
export const CABINET_ROOM_WIDTH=1024;
export const CABINET_ROOM_HEIGHT=1820;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {
 screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;auto:Box;bet:Box;
 status:Box;max?:Box;ink:string;titleIndex:number;
}
const common:Omit<CabinetGeometry,'titleIndex'>={
 screen:[249,516,526,399],title:[231,249,562,127],
 balance:[231,406,163,72],win:[429,406,168,72],bet:[633,406,161,72],
 spin:[420,958,183,119],minus:[254,966,93,94],plus:[682,966,93,94],
 auto:[349,983,78,60],max:[605,983,78,60],status:[424,1082,190,48],
 ink:'#F9D990',
};
export const CABINETS:Record<GameId,CabinetGeometry>={
 'coin-carousel':{...common,titleIndex:0},
 'lantern-vault':{...common,titleIndex:1},
 'lucky-parade':{...common,titleIndex:2},
 'celestial-mint':{...common,titleIndex:3},
};
const half=CABINET_ROOM_HEIGHT/2;
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,half-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/CABINET_ROOM_HEIGHT);}
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const boxes=[g.title,g.balance,g.screen,g.win,g.spin,g.minus,g.plus,g.auto,g.bet,g.status,...(g.max?[g.max]:[])];
 const top=half-Math.min(...boxes.map(b=>b[1]))+24;
 const bottom=half-Math.max(...boxes.map(b=>b[1]+b[3]))-24;
 const left=Math.min(...boxes.map(b=>b[0])),right=Math.max(...boxes.map(b=>b[0]+b[2]));
 const safeTop=height/2-topInset-155,safeBottom=-height/2+bottomInset+133;
 const cover=(safeTop+height/2)/(top+half);
 const scale=Math.min(Math.max(cabinetScale(width,height),cover),(safeTop-safeBottom)/(top-bottom),(width-36)/(2*Math.max(512-left,right-512)));
 const desired=safeTop-top*scale;
 const floorBound=half*scale-height/2,ceilingBound=height/2-half*scale;
 return {scale,y:Math.max(ceilingBound,Math.min(floorBound,desired))};
}
