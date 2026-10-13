/** Anatomical movement in authored image pixels, not aspect-distorted UV space.
 * Only an extracted limb is deformed. The body, podium and room never move. */
const TAU=Math.PI*2;
const clamp=x=>Math.max(0,Math.min(1,x));
export function smoothstep(a,b,x){const t=clamp((x-a)/(b-a));return t*t*(3-2*t);}
const pulse=(phase,start,duration)=>{const x=(phase-start)/duration;return x>0&&x<1?Math.sin(Math.PI*x)**2:0;};
export function guardianPose(theme,seconds,activity='idle',context='cabinet'){
 if(!Number.isFinite(seconds))seconds=0;
 const speed=activity==='reward'?1.15:1;
 const t=Math.max(0,seconds)*speed;
 const gain=activity==='reward'?1.14:activity==='spin'?.65:1;
 // Separate anticipation, invitation and settle; never a metronomic whole-body bounce.
 if(theme==='tiger'){
  const p=t%5.6,g=pulse(p,1.1,1.0)+.82*pulse(p,2.32,.92);
  return {shoulder:-.075*g+.018*pulse(p,.72,.42),wrist:.16*g*gain,reach:.014*g*gain};
 }
 if(theme==='koi'){
  const s=Math.sin(t*TAU/3.8),lag=Math.sin(t*TAU/3.8-.7);
  return {shoulder:.045*s,wrist:.075*lag*gain,reach:0};
 }
 if(theme==='crane'){
  const p=t%7.2,g=pulse(p,1.4,2.1),f=Math.sin(t*TAU/3.6);
  // Feather tips fan below the stationary treasure tray. No tray/foot tipping.
  return {shoulder:.018*g,wrist:(.065*g+.012*f)*gain,reach:0};
 }
 const p=t%6.8,g=pulse(p,1.35,1.25)+.72*pulse(p,3.0,1.35);
 return {shoulder:-.055*g,wrist:.11*g*gain,reach:.01*g*gain};
}
export function rotatePoint([x,y],[px,py],angle){const c=Math.cos(angle),s=Math.sin(angle);return [px+(x-px)*c-(y-py)*s,py+(x-px)*s+(y-py)*c];}
export function limbPoint(point,rig,pose){
 const root=rig.pivot,wrist=rig.wrist,dx=wrist[0]-root[0],dy=wrist[1]-root[1],length=Math.hypot(dx,dy),ux=dx/length,uy=dy/length;
 const along=(point[0]-root[0])*ux+(point[1]-root[1])*uy;
 const distal=(point[0]-wrist[0])*ux+(point[1]-wrist[1])*uy;
 const shoulderWeight=smoothstep(rig.rootLock||12,Math.max(30,length*.65),along);
 const wristWeight=smoothstep(-8,rig.wristBlend||25,distal);
 let p=rotatePoint(point,wrist,pose.wrist*wristWeight);
 p=[p[0]+ux*distal*pose.reach*wristWeight,p[1]+uy*distal*pose.reach*wristWeight];
 return rotatePoint(p,root,pose.shoulder*shoulderWeight);
}
export function limbMesh(rig,pose,cols=20,rows=20){
 const [x,y,w,h]=rig.patch,data=new Float32Array(cols*rows*6*4);let n=0;
 const vertex=(cx,cy)=>{const p=[x+w*cx/cols,y+h*cy/rows],q=limbPoint(p,rig,pose);data[n++]=(q[0]-x)/w*2-1;data[n++]=1-(q[1]-y)/h*2;data[n++]=cx/cols;data[n++]=cy/rows;};
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){vertex(col,row);vertex(col+1,row);vertex(col,row+1);vertex(col,row+1);vertex(col+1,row);vertex(col+1,row+1);}
 return data;
}
