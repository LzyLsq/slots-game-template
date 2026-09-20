/** Integrated velocity: continuous acceleration/cruise/braking, then a damped mechanical settle. */
export function reelMotion(t:number, distance:number, cell:number, column:number, fast=false) {
 const acceleration=fast?.12:.20, cruise=(fast?.40:.68)+column*.075, braking=fast?.34:.46, settling=.30;
 const end=acceleration+cruise+braking, overshoot=cell*.115;
 const speed=(distance+overshoot)/(.5*acceleration+cruise+.5*braking);
 let travel=0,velocity=0;
 if(t<0)return {travel:0,velocity:0,curve:0,duration:end+settling};
 if(t<acceleration){const u=t/acceleration;travel=speed*acceleration*(u/2-Math.sin(Math.PI*u)/(2*Math.PI));velocity=speed*(1-Math.cos(Math.PI*u))/2}
 else if(t<acceleration+cruise){travel=speed*(acceleration*.5+t-acceleration);velocity=speed}
 else if(t<end){const u=(t-acceleration-cruise)/braking;travel=speed*(acceleration*.5+cruise+braking*(u/2+Math.sin(Math.PI*u)/(2*Math.PI)));velocity=speed*(1+Math.cos(Math.PI*u))/2}
 else {const u=Math.min(1,(t-end)/settling);travel=distance+(u===1?0:overshoot*Math.exp(-9*u)*(Math.cos(11*u)+9/11*Math.sin(11*u)))}
 const curve=Math.min(1,Math.max(0,velocity/speed));
 return {travel,velocity,curve,duration:end+settling};
}
