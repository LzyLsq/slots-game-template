/** Presentation-only strip transport. Distances are measured in complete cells.
 * No RNG or outcome rewriting: the caller supplies the authoritative final grid. */
export interface ReelMotionProfile {
  speed:number; pullDuration:number; pull:number; acceleration:number;
  hold:number; stagger:number; brake:number; settle:number; overshoot:number;
  landing:number;
}
const CLASSIC:ReelMotionProfile={speed:25,pullDuration:.075,pull:.11,acceleration:.20,hold:.72,stagger:.12,brake:.40,settle:.20,overshoot:.13,landing:.07};
const RUBY:ReelMotionProfile={speed:30,pullDuration:.065,pull:.08,acceleration:.17,hold:.64,stagger:.09,brake:.35,settle:.17,overshoot:.10,landing:.06};
const PEARL:ReelMotionProfile={speed:27,pullDuration:.085,pull:.07,acceleration:.23,hold:.75,stagger:.105,brake:.43,settle:.23,overshoot:.09,landing:.045};
const CROWN:ReelMotionProfile={speed:24,pullDuration:.09,pull:.13,acceleration:.21,hold:.78,stagger:.13,brake:.42,settle:.21,overshoot:.15,landing:.075};
export function reelMotionProfile(id:string):ReelMotionProfile {
  return id==='ruby-revel'?RUBY:id==='pearl-palace'?PEARL:id==='jade-treasury'?CROWN:CLASSIC;
}
/** Cosine spring load followed by integrated cosine acceleration. C1 continuous. */
export function launchTravel(t:number,p:ReelMotionProfile):number {
  if(t<=0)return 0;
  if(t<p.pullDuration)return -p.pull*(1-Math.cos(Math.PI*t/p.pullDuration))*.5;
  const a=t-p.pullDuration;
  if(a<p.acceleration){const u=a/p.acceleration;return -p.pull+p.speed*p.acceleration*(u*.5-Math.sin(Math.PI*u)/(2*Math.PI));}
  return -p.pull+p.speed*(p.acceleration*.5+a-p.acceleration);
}
/** Hermite brake enters at terminal velocity and leaves at zero velocity. */
export function brakeTravel(t:number,start:number,end:number,speed:number,duration:number):number {
  const u=Math.max(0,Math.min(1,t/duration)),u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*start+(u3-2*u2+u)*speed*duration+(-2*u3+3*u2)*end;
}
export function settleTravel(t:number,final:number,overshoot:number,duration:number):number {
  const u=Math.max(0,Math.min(1,t/duration));
  return u===1?final:final+overshoot*(1+Math.cos(Math.PI*u))*.5;
}
