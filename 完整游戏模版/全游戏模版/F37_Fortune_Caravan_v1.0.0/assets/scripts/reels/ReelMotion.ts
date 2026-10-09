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
export function fallDelay(column:number,row:number):number{return column*.018+row*.006;}
export function smoothStep5(t:number):number{return t*t*t*(t*(t*6-15)+10);}

/** Two thresholds avoid alternating textures when frame timing varies near cruise speed. */
export function reelBlurred(motion:number,wasBlurred:boolean,stopped=false,reducedMotion=false):boolean{
  if(stopped||reducedMotion||!Number.isFinite(motion))return false;
  return motion>(wasBlurred?.44:.68);
}
/** Conservative rotated-square bound. The aperture Mask remains the final clip. */
export function reelCellVisible(y:number,apertureHeight:number,size:number,scaleX=1,scaleY=1):boolean{
  const radius=Math.hypot(size*scaleX,size*scaleY)*.5;
  return Math.abs(y)<=apertureHeight*.5+radius+2;
}
