import type {GameId} from '../math/types';
export type CabinetControl=0|1|2|3;
const THEMES:Record<GameId,number>={'crown-club':0,'emerald-fortune':1,'ruby-royale':2,'vault-reserve':3};
/** Travel belongs to the fitted button face, never to its hit target or readout. */
export function cabinetPressFeel(id:GameId,index:CabinetControl){
 const theme=THEMES[id],bet=index===1||index===2;
 return {depth:(index===0?[5,4,4.5,5.5]:bet?[3.1,2.6,2.8,3.5]:[2.2,2,2.1,2.8])[theme],
  compression:index===0?[.976,.979,.977,.973][theme]:bet?.951:.967,
  release:index===0?.17:bet?.115:.145,tilt:bet?(index===1?.22:-.22):0,instant:true};
}
export function controlReflectionSize(index:CabinetControl,width:number,height:number):readonly [number,number]{const size=Math.min(index===0?24:22,height*(index===0?.11:.22),width*.11);return [size,size*.72];}
export interface ControlReflection {x:number;y:number;angle:number;alpha:number;}
export const emptyControlReflection=():ControlReflection=>({x:0,y:0,angle:0,alpha:0});
/** Small bitmap optics hug metal corners; none pass through button lettering. */
export function controlReflection(id:GameId,index:CabinetControl,width:number,height:number,glint:number,time:number,contact:number,busy:boolean,out:ControlReflection):ControlReflection{
 const theme=THEMES[id],t=time*(busy?1.7:.48)+theme*.9+glint*Math.PI;
 if(index===0){out.x=Math.cos(t)*width*.423;out.y=Math.sin(t)*height*.423;out.angle=t*180/Math.PI;}
 else{const side=glint===0?-1:1;const touch=Math.max(0,Math.min(1,contact));out.x=side*width*(.36+.035*Math.sin(touch*Math.PI));out.y=side*height*.26;out.angle=side*(32+touch*18);}
 const idle=index===0?Math.pow(Math.max(0,Math.sin(t)),8)*(busy?48:38):0;
 out.alpha=Math.min(190,idle+Math.max(0,Math.min(1,contact))*164);return out;
}
/** A settled medallion latch: no restarting tween on each frame/state update. */
export function autoLatchX(id:GameId,width:number,state:number):number{return id==='crown-club'?0:width*.16*(2*Math.max(0,Math.min(1,state))-1);}
export function smoothLatch(current:number,target:number,dt:number):number{return current+(target-current)*(1-Math.exp(-Math.min(.05,Math.max(0,dt))*20));}
