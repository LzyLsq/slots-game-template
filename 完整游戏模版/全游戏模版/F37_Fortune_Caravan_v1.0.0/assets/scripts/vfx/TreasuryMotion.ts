import type {GameId} from '../math/types';
import {imagePoint,type CabinetGeometry,type Box} from '../ui/CabinetGeometry';
export type LifeKind='coin'|'spark'|'glow';
export type LifePath='river'|'orbit'|'rise'|'tide'|'ember'|'fountain'|'lamp';
export interface LifeZone {name:string;rect:Box;kind:LifeKind;path:LifePath;count:number;size:number;alpha:number;period:number;tint:string;focus:number;}
export interface LifeSeed {zone:LifeZone;index:number;phase:number;lane:number;size:number;}
export interface LifePose {x:number;y:number;scaleX:number;scaleY:number;angle:number;alpha:number;}
const GOLD='#FFE1A1',THEME=['#FFE0A1','#CDE8C2','#D9F0FF','#FFD0A4'];
const zone=(name:string,x:number,y:number,w:number,h:number,kind:LifeKind,path:LifePath,count:number,size:number,alpha:number,period:number,tint=GOLD,focus=-1):LifeZone=>({name,rect:[x-w/2,y-h/2,w,h],kind,path,count,size,alpha,period,tint,focus});
/** Everything is in its parent's authored plane, not viewport percentages.
 * A closed path and its sprite extent remain inside each measured zone. */
export function lobbyLifeZones(_tall:boolean):LifeZone[]{
 return [
  zone('Merchant jewellery',-152,68,320,358,'spark','orbit',7,21,130,7.8),
  zone('Treasure coins',170,-100,310,126,'coin','fountain',10,36,206,6.8),
  zone('Treasure reflections',170,-105,300,142,'spark','tide',7,23,146,8.1),
  zone('Left arcade lantern',-448,125,68,250,'glow','lamp',2,49,45,6.7),
  zone('Right arcade lantern',448,125,68,250,'glow','lamp',2,49,45,7.5),
  zone('Arcade dust',0,219,760,55,'spark','river',10,15,85,12.8),
 ];
}
export function cabinetLifeZones(g:CabinetGeometry):LifeZone[]{
 const tint=THEME[g.titleIndex],path:LifePath=(['orbit','rise','tide','ember'] as LifePath[])[g.titleIndex];
 const [sx,sy]=imagePoint(g.screen),side=g.screen[2]/2+38,coinY=1152-1636*1024/836;
 return [
  zone('Upper ornament',-165,1152-g.title[1]+165,198,80,'spark',path,7,19,120,7.7+g.titleIndex,tint),
  zone('Left frame current',sx-side,sy,32,g.screen[3]-28,'spark','rise',7,15,125,8.3,tint),
  zone('Right frame current',sx+side,sy,32,g.screen[3]-28,'spark','rise',7,15,125,9.2,tint),
  zone('Left treasury heap',-374,coinY,100,126,'coin','tide',7,26,197,7.5,tint),
  zone('Right treasury heap',374,coinY,100,126,'coin','tide',7,26,197,8.4,tint),
 ];
}
export function lifeSeed(z:LifeZone,index:number):LifeSeed{return {zone:z,index,phase:(index*.61803398875)%1,lane:(index*.38196601125)%1,size:z.size*(.78+(index%4)*.085)};}
export function emptyLifePose():LifePose{return {x:0,y:0,scaleX:1,scaleY:1,angle:0,alpha:0};}
const TAU=Math.PI*2;
/** Reuse the output; no node/tween/array allocation during a decorative frame. */
export function lifePose(s:LifeSeed,time:number,energy:number,impulse:number,out:LifePose):LifePose{
 const z=s.zone,[left,bottom,width,height]=z.rect;
 const p=((Math.max(0,time)/z.period+s.phase)%1+1)%1,t=p*TAU;
 // Max half-extent includes rotation + scale; never clip sprite corners.
 const margin=s.size*.86,rx=Math.max(0,width/2-margin),ry=Math.max(0,height/2-margin);
 let x=0,y=0,fade=Math.sin(Math.PI*p),angle=0;
 if(z.path==='orbit'){x=Math.cos(t)*rx;y=Math.sin(t)*ry;fade=.5+.5*Math.sin(t+s.lane*TAU)**2;angle=t*25;}
 else if(z.path==='river'){x=(p*2-1)*rx;y=Math.sin(t*1.5+s.lane*TAU)*ry*.65;angle=Math.sin(t)*24;}
 else if(z.path==='rise'||z.path==='ember'){x=(s.lane*2-1)*rx*.73+Math.sin(t*1.5)*rx*.22;y=(p*2-1)*ry;angle=z.path==='ember'?Math.sin(t)*38:t*15;}
 else if(z.path==='tide'){x=Math.sin(t)*rx;y=Math.cos(t+s.lane*2)*ry*.76;fade=.3+.7*Math.sin(t/2)**2;angle=Math.sin(t)*22;}
 else if(z.path==='fountain'){x=(p*2-1)*rx;y=-ry+8*ry*p*(1-p);angle=(s.index%2?1:-1)*p*100;}
 else {x=Math.sin(t)*rx*.04;y=Math.cos(t)*ry*.04;fade=.48+.52*Math.sin(t/2)**2;}
 const depth=.82+.14*Math.sin(t+s.lane);
 out.x=left+width/2+x;out.y=bottom+height/2+y;out.angle=angle;
 out.scaleY=depth;out.scaleX=z.kind==='coin'?depth*(.42+.58*Math.abs(Math.cos(t*1.2+s.lane))):depth;
 out.alpha=Math.min(245,z.alpha*fade*(1+Math.min(1,Math.max(0,energy))*.12+Math.min(1,Math.max(0,impulse))*.30));
 return out;
}
export const LIFE_MAX_PARTICLES=64;
export class TreasuryClock{
 time=0;impulse=0;energy=0;private cooldown=0;private accumulator=0;
 trigger():boolean{if(this.cooldown>0)return false;this.impulse=1;this.cooldown=.30;return true;}
 advance(dt:number,hidden=false,reduced=false):boolean{
  if(hidden||reduced||!Number.isFinite(dt)||dt<=0)return false;
  // A tab returning from background must not teleport into a shower.
  const step=Math.min(dt,.05);this.time+=step;this.cooldown=Math.max(0,this.cooldown-step);this.impulse=Math.max(0,this.impulse-step*.7);
  this.accumulator+=step;if(this.accumulator<1/30)return false;this.accumulator%=1/30;return true;
 }
}
