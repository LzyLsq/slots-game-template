/** Pure presentation curves. Distances are measured in symbol heights. */
export function reelTravel(time:number,speed:number,ramp:number):number{
  if(time<ramp){const u=Math.max(0,time/ramp);return speed*ramp*(u*u*u-.5*u*u*u*u);}
  return speed*(time-ramp*.5);
}
export function reelVelocity(time:number,speed:number,ramp:number):number{
  const u=Math.max(0,Math.min(1,time/ramp));return speed*u*u*(3-2*u);
}
/** Position, velocity and acceleration join the cruise and stop continuously. */
export function brakeTravel(u:number,start:number,end:number,velocity:number,duration:number):number{
  const p=Math.max(0,Math.min(1,u)),d=end-start,m=velocity*duration;
  return start+m*p+(10*d-6*m)*p**3+(8*m-15*d)*p**4+(6*d-3*m)*p**5;
}
export function brakeVelocity(u:number,start:number,end:number,velocity:number,duration:number):number{
  const p=Math.max(0,Math.min(1,u)),d=end-start,m=velocity*duration;
  return (m+3*(10*d-6*m)*p*p+4*(8*m-15*d)*p**3+5*(6*d-3*m)*p**4)/duration;
}
/** Drop timing follows distance; stagger prevents an entire board landing together. */
export function fallDuration(cells:number):number{return .16+Math.sqrt(Math.max(0,cells))*.075;}
export function fallDelay(column:number,row:number):number{return column*.026+row*.009;}
export function smoothStep5(t:number):number{return t*t*t*(t*(t*6-15)+10);}

/** Atelier presentation only: no outcome, award value, or cell coordinate changes. */
export type AtelierTheme=0|1|2|3;
export interface AtelierPose{x:number;y:number;sx:number;sy:number;angle:number;}
export const ATELIER_TIMINGS:readonly (readonly number[])[]=[
  [11.4,.78,.38,.76,.145,.022,.20,.40,.020],
  [12.2,.86,.36,.76,.085,.022,.26,.46,.027],
  [11.8,.88,.40,.84,.125,.035,.28,.50,.023],
  [10.6,.98,.44,.90,.170,.018,.24,.44,.028],
];
export function atelierTheme(id:string):AtelierTheme{
  return id==='jade-treasury'?1:id==='pearl-palace'?2:id==='ruby-revel'?3:0;
}
export function atelierAwardDelay(theme:AtelierTheme,column:number,row:number):number{
  return theme===0?column*.038+row*.008:theme===1?column*.023+row*.019:theme===2?(column+row)*.025:column*.045+row*.006;
}
export const ATELIER_AWARDS:readonly (readonly (readonly number[])[])[]=[
 [[0,1,1,0],[.065,1.055,.930,-.012],[.205,1.095,1.095,.030],[.345,.995,.990,-.002],[.49,1.005,1.006,.001],[.70,1,1,0]],
 [[0,1,1,0],[.065,1.035,.940,-.010],[.205,1.10,1.10,.038],[.345,.993,.994,-.002],[.49,1.008,1.008,.002],[.70,1,1,0]],
 [[0,1,1,0],[.065,1.055,.945,-.010],[.205,1.10,1.085,.035],[.345,.994,.990,-.003],[.49,1.008,1.010,.002],[.70,1,1,0]],
 [[0,1,1,0],[.065,1.060,.920,-.016],[.205,1.09,1.11,.039],[.345,.996,.989,-.002],[.49,1.004,1.006,.001],[.70,1,1,0]],
];
/** Mutates a reusable pose; translations use the smaller cell dimension. */
export function atelierIdlePose(theme:AtelierTheme,time:number,column:number,row:number,out:AtelierPose):void{
  const phase=time*(theme===2?.72:.48)+column*.62+row*.84,w=Math.sin(phase);
  out.x=0;out.y=0;out.sx=1;out.sy=1;out.angle=0;
  if(theme===0){out.y=w*.004;out.sx=out.sy=1+w*.005;}
  else if(theme===1){out.angle=w*.65;out.sx=out.sy=1+Math.cos(phase*.8)*.004;}
  else if(theme===2){out.x=w*.008;out.y=(Math.cos(phase)-1)*.002;out.angle=w*.85;}
  else{out.y=Math.sin(phase)*.004;out.sx=out.sy=1+w*.006;}
}
/** Zero position/velocity at both endpoints: a seated object never pops between states. */
export function atelierLandingPose(theme:AtelierTheme,progress:number,column:number,row:number,out:AtelierPose):void{
  const p=Math.max(0,Math.min(1,progress));
  const envelope=p===0||p===1?0:Math.sin(Math.PI*p)**2*(1-p);
  const spring=Math.sin(p*Math.PI*2)*envelope;
  out.x=0;out.y=0;out.sx=1;out.sy=1;out.angle=0;
  if(theme===0){out.y=-spring*.06;out.sx=1+spring*.075;out.sy=1-spring*.13;}
  else if(theme===1){out.y=-spring*.040;out.angle=spring*4.2;out.sx=out.sy=1+spring*.050;}
  else if(theme===2){const direction=(column+row)%2?1:-1;out.x=spring*.040*direction;out.y=-spring*.045;out.angle=spring*5*direction;}
  else{out.y=-spring*.050;out.sx=1+spring*.045;out.sy=1-spring*.06;}
}
