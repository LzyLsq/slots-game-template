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
export function lobbyLifeZones(tall:boolean):LifeZone[]{
 const x=tall?330:300,upper=tall?510:440,lower=tall?-250:-240,keeper=tall?-510:-420;
 const result:LifeZone[]=[];
 for(let i=0;i<4;i++){
  const cx=i%2?x:-x,cy=i<2?upper:lower;
  result.push(zone('Vault '+i+' jewellery',cx,cy+38,326,284,'spark','orbit',5,30,153,6.4+i*.7,THEME[i],i));
  result.push(zone('Vault '+i+' enamel light',cx,cy+50,276,228,'glow','lamp',1,188,35,5.2+i*.5,THEME[i],i));
 }
 // Confine moving money to the existing coin river, above the navigation dock.
 result.push(zone('Hall coin river',0,keeper-219,600,112,'coin','river',14,51,218,5.9));
 result.push(zone('River reflections',0,keeper-219,626,112,'spark','tide',8,26,180,5.5));
 result.push(zone('Keeper blessing',0,keeper-33,142,205,'spark','fountain',6,31,195,4.8));
 result.push(zone('Central lantern shaft',0,190,70,520,'spark','rise',10,25,128,8.2));
 return result;
}
export function cabinetLifeZones(g:CabinetGeometry):LifeZone[]{
 const theme=g.titleIndex,tint=THEME[theme],path:LifePath=(['orbit','rise','tide','ember'] as LifePath[])[theme];
 const [sx,sy]=imagePoint(g.screen),guardian=g.guardian;
 return [
  zone('Relief jewellery',-242,1152-641,350,304,'spark',path,8,30,165,5.8+theme*.5,tint),
  zone('Guardian atmosphere',guardian.centre-512,1152-guardian.bottom+guardian.height*.54,guardian.width*.92,guardian.height*.96,'spark',path,8,25,124,6.1+theme*.6,tint),
  zone('Guardian reflected warmth',guardian.centre-512,1152-guardian.bottom+guardian.height*.48,guardian.width,guardian.height*.9,'glow','lamp',1,214,30,5.6,tint),
  zone('Left frame current',sx-g.screen[2]/2-60,sy,66,g.screen[3]+92,'spark','rise',9,28,162,5.5,tint),
  zone('Right frame current',sx+g.screen[2]/2+60,sy,66,g.screen[3]+92,'spark','rise',9,28,162,6.2,tint),
  zone('Treasury coin bed',0,1152-1711-g.screenExtension,854,136,'coin','fountain',18,52,228,5.9),
  zone('Coin bed reflections',0,1152-1711-g.screenExtension,854,136,'spark','river',9,27,190,6.5,tint),
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
