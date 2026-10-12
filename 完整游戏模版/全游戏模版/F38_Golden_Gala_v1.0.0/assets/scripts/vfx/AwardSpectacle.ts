import {clamp01,smooth,type AwardTiming} from './AwardTimeline';
/** Fixed pools and deterministic choreography. This module cannot access settlement or RNG. */
export interface SpectacleProfile{fountain:number;orbit:number;rain:number;sparks:number;beams:number;shake:number}
const PROFILES:readonly SpectacleProfile[]=[
 {fountain:28,orbit:8,rain:16,sparks:24,beams:6,shake:0},
 {fountain:44,orbit:14,rain:28,sparks:36,beams:8,shake:3.4},
 {fountain:52,orbit:16,rain:32,sparks:48,beams:10,shake:4.1},
 {fountain:60,orbit:20,rain:36,sparks:60,beams:12,shake:4.8},
];
export function spectacleProfile(tier:number,reduced=false):Readonly<SpectacleProfile>{
 if(reduced)return {fountain:0,orbit:0,rain:0,sparks:0,beams:0,shake:0};
 return PROFILES[Math.max(0,Math.min(3,Number.isFinite(tier)?Math.floor(tier)-1:0))];
}
export type SpectacleKind='fountain'|'orbit'|'rain'|'spark';
export interface SpectacleSeed{kind:SpectacleKind;index:number;seed:number;side:number;size:number;life:number;delay:number}
export interface SpectaclePose{x:number;y:number;scaleX:number;scaleY:number;angle:number;alpha:number}
export const emptySpectaclePose=():SpectaclePose=>({x:0,y:0,scaleX:0,scaleY:0,angle:0,alpha:0});
export function spectacleSeed(kind:SpectacleKind,index:number):SpectacleSeed{
 const seed=(index*.61803398875+.137)%1;
 return {kind,index,seed,side:index%2?1:-1,size:kind==='rain'?74+seed*62:kind==='spark'?38+seed*52:44+seed*38,
  life:kind==='rain'?2.15+seed*1.55:1.6+seed*.85,delay:kind==='rain'?.15+seed*1.7:.27+(index%16)*.046};
}
/** Gold has its own space: nothing is permitted across the title, rules or coin register. */
export function spectacleKeepout(p:SpectaclePose,size:number,_side:number):void{
 const radius=size*Math.max(p.scaleX,p.scaleY)*.72;
 // Keep the physical trajectory intact. Fade BEFORE reaching the expanded
 // readable rectangle; teleporting to a side lane looked like a pasted sprite.
 const dx=Math.abs(p.x)-(516+radius);
 const titleDistance=Math.max(dx,396-radius-p.y,p.y-(776+radius));
 const registerDistance=Math.max(dx,-825-radius-p.y,p.y-(-354+radius));
 p.alpha*=smooth(Math.min(titleDistance,registerDistance)/88);
}
/** The two crescendos resolve into a calmer treasure hold, not endless peak brightness. */
export function spectacleQuiet(time:number,plan:AwardTiming):number{return smooth((time-plan.climaxEnd)/.8);}
export function spectaclePulse(time:number,plan:AwardTiming):number{
 const age=time-plan.countEnd;
 if(age<0)return 0;
 return Math.max(Math.sin(clamp01(age/.84)*Math.PI),.78*Math.sin(clamp01((age-.52)/.92)*Math.PI));
}
/** Reuses caller-owned pose. No per-frame random generation, timers, array or object allocation. */
export function spectaclePose(s:SpectacleSeed,time:number,plan:AwardTiming,out:SpectaclePose):SpectaclePose{
 out.x=out.y=out.angle=out.alpha=out.scaleX=out.scaleY=0;
 if(!Number.isFinite(time)||time<s.delay)return out;
 const {seed,side,index,kind}=s,age=time-s.delay,p=(age%s.life)/s.life,quiet=spectacleQuiet(time,plan);
 const entrance=smooth((time-s.delay)/.32),pulse=spectaclePulse(time,plan);
 const fade=Math.min(1,p*9,(1-p)*7);
 if(kind==='fountain'){
  out.x=side*(65+seed*90+(235+seed*290)*p);
  out.y=-168+2120*p-(2030+seed*230)*p*p;
  out.scaleY=.63+seed*.38+.2*p;
  out.scaleX=out.scaleY*(.17+.83*Math.abs(Math.cos(p*17+index*.9)));
  out.angle=side*(index*23+p*300);out.alpha=255*fade*entrance;
 }else if(kind==='orbit'){
  const theta=seed*Math.PI*2+time*(side*.72),depth=(Math.sin(theta)+1)/2;
  out.x=Math.cos(theta)*(322+seed*92);out.y=65+Math.sin(theta)*(135+seed*34);
  out.scaleY=.56+.52*depth;out.scaleX=out.scaleY*(.2+.8*Math.abs(Math.cos(time*4.6+index)));
  out.angle=time*side*55+index*19;out.alpha=(155+95*depth)*entrance;
 }else if(kind==='rain'){
  out.x=side*(362+seed*145)+Math.sin(p*4+index)*32;
  out.y=840-p*1710;out.scaleY=.63+seed*.5+p*.25;
  out.scaleX=out.scaleY*(.15+.85*Math.abs(Math.cos(p*19+index)));
  out.angle=side*(p*360+index*27);out.alpha=235*fade*entrance;
 }else{
  // Two interleaved cascades bloom from the treasury, followed by a quiet living hold.
  const burstAge=time-plan.countEnd-(index%2)*.52-(index%6)*.025;
  const active=burstAge>=0&&burstAge<1.22;
  const q=active?burstAge/1.22:(age%(1.75+seed*.5))/(1.75+seed*.5);
  const angle=seed*Math.PI*2;
  const radius=active?70+q*(315+seed*110):200+seed*210;
  out.x=Math.cos(angle)*radius;out.y=80+Math.sin(angle)*radius*.68;
  out.scaleY=active?.45+q*1.15:.42+.5*Math.sin(q*Math.PI);out.scaleX=out.scaleY;
  out.angle=index*17-time*side*18;
  // Switch choreography only while invisible, including both burst boundaries.
  const ambientGate=burstAge<0?1-smooth((burstAge+.20)/.20):smooth((burstAge-1.22)/.20);
  out.alpha=(active?245*Math.sin(q*Math.PI):140*Math.pow(Math.max(0,Math.sin(q*Math.PI)),8)*ambientGate)*entrance;
 }
 if(kind!=='spark')out.alpha=Math.min(255,out.alpha*(.92+.15*pulse));
 out.alpha*=1-.38*quiet;
 spectacleKeepout(out,s.size,side);return out;
}
