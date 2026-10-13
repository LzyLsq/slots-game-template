import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=1024;export const CABINET_ROOM_HEIGHT=1460;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;bet:Box;topWin:Box;ink:string;titleIndex:number;}
// Measured independently on F44's commissioned panorama centre (1024×1536).
const make=(index:number,screen:Box,title:Box,meterY:number,buttonY:number,xs:readonly number[]):CabinetGeometry=>{
 const meter=(x:number):Box=>[x-81,meterY-32,162,64];
 const key=(x:number,w:number,h:number):Box=>[x-w/2,buttonY-h/2,w,h];
 return {screen,title,balance:meter(xs[0]),bet:meter(xs[1]),win:meter(xs[2]),topWin:meter(xs[2]),minus:key(xs[0],102,90),spin:key(xs[1],158,134),plus:key(xs[2],102,90),titleIndex:index,ink:'#FFF2D8'};
};
export const CABINETS:Record<GameId,CabinetGeometry>={
 'golden-otter':make(0,[238,378,550,444],[214,254,596,82],941,1064,[281,512,746]),
 'moon-rabbit':make(1,[270,400,481,404],[235,264,558,80],925,1055,[338,512,686]),
 'star-fox':make(2,[245,358,538,437],[220,235,584,80],905,1040,[292,512,736]),
 'cloud-elephant':make(3,[279,347,472,505],[230,221,568,84],951,1062,[308,513,718]),
};
export const REEL_GLASS_CORNER_RADIUS=6;
export function reelAperture(g:CabinetGeometry,_id?:GameId):Box{return g.screen;}
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-512,730-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/1024,height/1460);}
// The guardian is a child of the room, offset 28px within the plane. Its
// panel top is 768 + 256px, plus 26px of local motion and 24px of headroom.
// Include every parent offset so short phones keep hats and horns visible.
export const CABINET_ART_BOUNDS=[[-244,1350],[-244,1350],[-244,1350],[-244,1350]] as const;
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const [top,bottom]=CABINET_ART_BOUNDS[g.titleIndex],clearBottom=height<2050?104:180;
 const scale=Math.min((width-18)/880,(height-topInset-bottomInset-clearBottom)/(bottom-top));
 const center=730-(top+bottom)/2;
 const lower=-height/2+bottomInset+clearBottom-(730-bottom)*scale;
 const upper=height/2-topInset-(730-top)*scale;
 const centered=(bottomInset-topInset)/2-center*scale;
 return{scale,y:Math.min(upper,Math.max(lower,centered))};
}
