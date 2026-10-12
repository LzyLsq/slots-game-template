import type {GameId} from '../math/types';
import {GALA_LOBBY} from '../ui/GalaLobbyLayout';
import {imagePoint,type CabinetGeometry,type Box} from '../ui/CabinetGeometry';
export type LifeKind='coin'|'spark'|'glow';
export type LifePath='river'|'orbit'|'rise'|'tide'|'ember'|'fountain'|'lamp'|'offering'|'glimmer';
export interface LifeZone {name:string;rect:Box;kind:LifeKind;path:LifePath;count:number;size:number;alpha:number;period:number;tint:string;focus:number;}
export interface LifeSeed {zone:LifeZone;index:number;phase:number;lane:number;size:number;}
export interface LifePose {x:number;y:number;scaleX:number;scaleY:number;angle:number;alpha:number;}
const GOLD='#FFE1A1',THEME=['#FFE0A1','#CDE8C2','#D9F0FF','#FFD0A4'];
const zone=(name:string,x:number,y:number,w:number,h:number,kind:LifeKind,path:LifePath,count:number,size:number,alpha:number,period:number,tint=GOLD,focus=-1):LifeZone=>({name,rect:[x-w/2,y-h/2,w,h],kind,path,count,size,alpha,period,tint,focus});
/** Everything is in its parent's authored plane, not viewport percentages.
 * A closed path and its sprite extent remain inside each measured zone. */
export function lobbyLifeZones(_tall:boolean):LifeZone[]{
 const zones:LifeZone[]=[];
 // Four distinct treasure piles, in the SAME coordinates as the actual lobby.
 // These small arcs sit right of each face and above its title; they never
 // migrate over another exhibit's facts, PLAY or the collection caption.
 for(let i=0;i<4;i++){
  const x=GALA_LOBBY.columns[i%2],y=GALA_LOBBY.rows[Math.floor(i/2)];
  zones.push(zone('Exhibit '+i+' treasure coins',x+144,y+5,116,90,'coin',i===1?'rise':i===2?'tide':'fountain',4,26,170,7.4+i*.6,THEME[i],i));
  zones.push(zone('Exhibit '+i+' treasure offerings',x+144,y+5,116,90,'coin','offering',2,32,168,5.7+i*.65,THEME[i],i));
  zones.push(zone('Exhibit '+i+' treasure reflections',x+150,y+25,96,92,'spark','glimmer',3,19,96,8.4+i*.8,THEME[i],i));
 }
 zones.push(zone('Left arcade lantern',-492,-20,32,110,'glow','lamp',1,26,35,8.1));
 zones.push(zone('Right arcade lantern',492,-20,32,110,'glow','lamp',1,26,35,9.3));
 return zones;
}
export function cabinetLifeZones(g:CabinetGeometry):LifeZone[]{
 const tint=THEME[g.titleIndex],path:LifePath=(['orbit','rise','tide','ember'] as LifePath[])[g.titleIndex];
 const [sx,sy]=imagePoint(g.screen),side=g.screen[2]/2+38,coinY=1152-1636*1024/836;
 // The lower brass rail is the authored gap between glass and registers.
 // Do not use a viewport percentage or put sparkles over the reel symbols.
 const railTop=g.screen[1]+g.screen[3],railBottom=g.balance[1],railH=Math.min(34,railBottom-railTop-16);
 const K=2304/1881,DX=(836*K-1024)/2;
 const heaps=[[22,285,112,50],[80,280,295,42],[56,363,118,45],[152,270,148,48]][g.titleIndex];
 const [hx,hy,hw,hh]=heaps;
 const additions=[zone('Anchored upper treasury reflections',(hx+hw/2)*K-DX-512,1152-(hy+hh/2)*K,hw*K,hh*K,'spark','glimmer',5,18,99,9.6+g.titleIndex*.7,tint)];
 if(railH>=22)additions.push(zone('Engraved payout rail',sx,1152-(railTop+railBottom)/2,g.screen[2]*.84,railH,'spark','river',6,12,104,10.7+g.titleIndex*.5,tint));
 return [
  zone('Upper ornament',-165,1152-g.title[1]+165,198,80,'spark',path,7,19,120,7.7+g.titleIndex,tint),
  zone('Left frame current',sx-side,sy,32,g.screen[3]-28,'spark','rise',7,15,125,8.3,tint),
  zone('Right frame current',sx+side,sy,32,g.screen[3]-28,'spark','rise',7,15,125,9.2,tint),
  zone('Left treasury heap',-374,coinY,100,126,'coin','tide',7,26,197,7.5,tint),
  zone('Right treasury heap',374,coinY,100,126,'coin','tide',7,26,197,8.4,tint),
  // Small 3D offerings launch from the authored piles, never from reel glass.
  zone('Left treasure offering',-374,coinY,100,126,'coin','offering',3,34,186,5.8+g.titleIndex*.3,tint),
  zone('Right treasure offering',374,coinY,100,126,'coin','offering',3,34,186,6.6+g.titleIndex*.3,tint),
  zone('Left gold facets',-374,coinY-12,100,102,'spark','glimmer',3,24,118,5.9,tint),
  zone('Right gold facets',374,coinY-12,100,102,'spark','glimmer',3,24,118,6.7,tint),
  ...additions,
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
 if(z.path==='orbit'){x=Math.cos(t)*rx;y=Math.sin(t)*ry;fade=.5+.5*Math.sin(t+s.lane*TAU)**2;angle=Math.sin(t+s.lane*TAU)*25;}
 else if(z.path==='river'){x=(p*2-1)*rx;y=Math.sin(t*1.5+s.lane*TAU)*ry*.65;angle=Math.sin(t)*24;}
 else if(z.path==='rise'||z.path==='ember'){x=(s.lane*2-1)*rx*.73+Math.sin(t*1.5)*rx*.22;y=(p*2-1)*ry;angle=z.path==='ember'?Math.sin(t)*38:t*15;}
 else if(z.path==='tide'){x=Math.sin(t)*rx;y=Math.cos(t+s.lane*2)*ry*.76;fade=.3+.7*Math.sin(t/2)**2;angle=Math.sin(t)*22;}
 else if(z.path==='fountain'){x=(p*2-1)*rx;y=-ry+8*ry*p*(1-p);angle=(s.index%2?1:-1)*p*100;}
 else if(z.path==='offering'){const flight=Math.min(1,p/.34);x=(flight*2-1)*rx*.72;y=-ry*.75+Math.sin(Math.PI*flight)*ry*1.6;angle=-24+flight*105;fade=p<.34?Math.sin(Math.PI*flight)**1.8:0;}
 else if(z.path==='glimmer'){x=(s.lane*2-1)*rx*.86;y=(s.phase*2-1)*ry*.82;angle=s.lane*24-12;fade=Math.max(0,Math.sin(t))**6;}
 else {x=Math.sin(t)*rx*.04;y=Math.cos(t)*ry*.04;fade=.48+.52*Math.sin(t/2)**2;}
 const depth=.82+.14*Math.sin(t+s.lane);
 out.x=left+width/2+x;out.y=bottom+height/2+y;out.angle=angle;
 out.scaleY=depth;out.scaleX=z.kind==='coin'?depth*(.42+.58*Math.abs(Math.cos(t+s.lane*TAU))):depth;
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
