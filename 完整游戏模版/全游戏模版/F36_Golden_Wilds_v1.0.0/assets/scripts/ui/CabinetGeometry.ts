import type { GameId } from '../math/types';
export const CABINET_ROOM_WIDTH=832;export const CABINET_ROOM_HEIGHT=1460;
export type Box=readonly[number,number,number,number];
export interface CabinetGeometry {screen:Box;title:Box;balance:Box;win:Box;spin:Box;minus:Box;plus:Box;bet:Box;topWin:Box;ink:string;titleIndex:number;}
// Measured on the original 1024×1536 artwork. Cabinet crop begins at x96.
const shift=(b:Box):Box=>[b[0]-96,b[1],b[2],b[3]];
const make=(index:number,screen:Box,title:Box,meterY:number,buttonY:number,xs:readonly number[]):CabinetGeometry=>{
 const meter=(x:number):Box=>shift([x-75,meterY,150,42]);
 const key=(x:number,w:number,h:number):Box=>shift([x-w/2,buttonY-h/2,w,h]);
 return {screen:shift(screen),title:shift(title),balance:meter(xs[0]),bet:meter(xs[1]),win:meter(xs[2]),topWin:meter(xs[2]),minus:key(xs[0],100,100),spin:key(xs[1],132,120),plus:key(xs[2],100,100),titleIndex:index,ink:'#FFF2D8'};
};
export const CABINETS:Record<GameId,CabinetGeometry>={
 'sun-lion':make(0,[226,336,552,472],[230,135,564,155],866,963,[320,511,706]),
 'emerald-elephant':make(1,[238,389,562,466],[242,167,538,176],921,1024,[332,517,701]),
 'lotus-koi':make(2,[235,315,531,472],[240,106,546,161],828,935,[328,515,702]),
 'moon-fox':make(3,[248,329,544,542],[255,121,530,158],924,1024,[344,525,708]),
};
// Glass interiors measured independently on the four 832×1460 cabinet plates.
// The illustrated inner rails taper: a uniform inset of the outer screen box
// covered the koi's left gold rail and the elephant's right bevel. These safe
// rectangles retain the painted glass lip and room for stencil antialiasing.
const REEL_GLASS:readonly Box[]=[
 [161,354,503,438],
 [158,399,516,434],
 [178,320,476,449],
 [159,347,517,508],
];
export const REEL_GLASS_CORNER_RADIUS=6;
export function reelAperture(g:CabinetGeometry,_id?:GameId):Box{return REEL_GLASS[g.titleIndex];}
export function imagePoint(b:Box):readonly[number,number]{return[b[0]+b[2]/2-416,730-b[1]-b[3]/2];}
export function cabinetScale(width:number,height:number):number{return Math.max(width/832,height/1460);}
// Visible bounds include the current wildlife silhouettes and their motion margin.
// Skin alpha bounds are measured at 2x resolution, then mapped into the shared
// room plane; the crown extends above the original cabinet source origin.
export const CABINET_ART_BOUNDS = [
 [-256,1300],[-236,1364],[-224,1306],[-216,1354],
] as const;
export function cabinetLayout(width:number,height:number,g:CabinetGeometry,topInset=0,bottomInset=0):{scale:number;y:number}{
 const [top,bottom]=CABINET_ART_BOUNDS[g.titleIndex];
 // Compact phones reserve floor space below the complete crown and treasure base.
 const compact=height<2050,topClearance=compact?0:26,bottomClearance=compact?98:176;
 const scale=Math.min((width-24)/832,(height-topInset-bottomInset-topClearance-bottomClearance)/(bottom-top));
 const center=730-(top+bottom)/2;
 const lower=-height/2+bottomInset+bottomClearance-(730-bottom)*scale;
 const upper=height/2-topInset-topClearance-(730-top)*scale;
 const centered=(bottomInset-topInset)/2-center*scale;
 return{scale,y:Math.min(upper,Math.max(lower,centered))};
}
