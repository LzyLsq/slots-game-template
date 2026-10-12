import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1024;export const CABINET_ROOM_HEIGHT=1460;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;bet:Box;topWin:Box;ink:string;titleIndex:number;}
// Measured independently on F40's commissioned panorama centre (1024×1536).
const make=(index:number,screen:Box,title:Box,meterY:number,buttonY:number,xs:readonly number[]):CabinetGeometry=>{
 const meter=(x:number):Box=>[x-105,meterY-34,210,68];
 const key=(x:number,w:number,h:number):Box=>[x-w/2,buttonY-h/2,w,h];
 return {screen,title,balance:meter(xs[0]),bet:meter(xs[1]),win:meter(xs[2]),topWin:meter(xs[2]),minus:key(xs[0],114,106),spin:key(xs[1],164,148),plus:key(xs[2],114,106),titleIndex:index,ink:'#FFF2D8'};
};
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-phoenix':make(0,[188,398,652,396],[180,238,684,105],918,1086,[230,510,790]),
 'jade-dragon':make(1,[202,432,622,420],[183,263,672,108],966,1120,[230,509,790]),
 'pearl-qilin':make(2,[169,443,684,418],[180,270,684,108],994,1140,[250,512,776]),
 'amber-panda':make(3,[234,398,548,404],[192,240,650,108],936,1096,[242,511,782]),
};
export const REEL_GLASS_CORNER_RADIUS=6;
export function reelAperture(g:CabinetGeometry,_id?:GameId):Box{return g.screen;}
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,730-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/1460);}
// The guardian is a child of the room, offset 28px within the plane. Its
// panel top is 768 + 256px, plus 26px of local motion and 24px of headroom.
// Include every parent offset so short phones keep hats and horns visible.
export const CABINET_ART_BOUNDS=[[-372,1490],[-372,1480],[-372,1480],[-372,1490]] as const;
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const [top,bottom]=CABINET_ART_BOUNDS[g.titleIndex],clearBottom=height<2050?104:180;
 const scale=Math.min((width-18)/1024,(height-topInset-bottomInset-clearBottom)/(bottom-top));
 const center=730-(top+bottom)/2;
 const lower=-height/2+bottomInset+clearBottom-(730-bottom)*scale;
 const upper=height/2-topInset-(730-top)*scale;
 const centered=(bottomInset-topInset)/2-center*scale;
 return{scale,y:Math.min(upper,Math.max(lower,centered))};
}
