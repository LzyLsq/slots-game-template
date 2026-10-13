import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1024;export const CABINET_ROOM_HEIGHT=1536;
// One opaque, registered environment contains the cabinet and every room edge.
// Its central 2048×3072 portrait retains the original cabinet coordinates.
export const CABINET_BACKGROUND_WIDTH=4096;export const CABINET_BACKGROUND_HEIGHT=3072;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;bet:Box;topWin:Box;ink:string;titleIndex:number;}
// Exact registration of the commissioned 2304×1536 panorama into the room.
const f=1024/1424,h=1104/1536;
const registered=(b:Box):Box=>[(b[0]-440)*f,320+b[1]*h,b[2]*f,b[3]*h];
const make=(index:number,screen:Box,title:Box,meterY:number,buttonY:number,xs:readonly number[]):CabinetGeometry=>{
 const meter=(x:number):Box=>registered([x-102,meterY-49,204,98]);
 const key=(x:number,w:number,height:number):Box=>registered([x-w/2,buttonY-height/2,w,height]);
 return {screen:registered(screen),title:registered(title),balance:meter(xs[0]),bet:meter(xs[1]),win:meter(xs[2]),topWin:meter(xs[2]),minus:key(xs[0],168,145),spin:key(xs[1],235,190),plus:key(xs[2],168,145),titleIndex:index,ink:'#FFF2D8'};
};
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-strings':make(0,[718,455,864,462],[710,315,880,82],1015,1140,[894,1150,1410]),
 'sapphire-harp':make(1,[732,453,841,424],[718,300,865,91],980,1130,[890,1150,1410]),
 'ruby-brass':make(2,[763,440,784,451],[805,250,680,112],1010,1160,[910,1150,1390]),
 'pearl-rhythm':make(3,[728,454,844,413],[710,300,880,99],982,1120,[890,1150,1405]),
};
export const REEL_GLASS_CORNER_RADIUS=6;
export function reelAperture(g:CabinetGeometry,_id?:GameId):Box{return g.screen;}
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,768-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/1536);}
export const CABINET_ART_BOUNDS=[[90,1292],[45,1285],[38,1320],[52,1300]] as const;
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const [top,bottom]=CABINET_ART_BOUNDS[g.titleIndex],clearBottom=height<2050?120:190;
 const scale=Math.min((width-22)/1024,(height-topInset-bottomInset-clearBottom-125)/(bottom-top));
 const center=768-(top+bottom)/2;
 const lower=-height/2+bottomInset+clearBottom-(768-bottom)*scale;
 const upper=height/2-topInset-125-(768-top)*scale;
 const centered=(bottomInset-topInset)/2-center*scale;
 return{scale,y:Math.min(upper,Math.max(lower,centered))};
}
