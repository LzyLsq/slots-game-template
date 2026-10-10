import type {GameId} from '../math/types';
import {GUARDIAN_RIGID_DETAILS} from './GuardianDetails';

export type GuardianContext='lobby'|'cabinet';
export type GuardianCue='touch'|'spin'|'ordinary'|'big'|'super';
export function guardianAwardCue(tier:number):GuardianCue{return tier>=2?'super':tier>=1?'big':'ordinary';}
export const GUARDIAN_GRID_X=36,GUARDIAN_GRID_Y=44;
export const GUARDIAN_SWEEP={x:.16,y:.10} as const;
export const GUARDIAN_CUE_SECONDS:Record<GuardianCue,number>={touch:2.2,spin:1.65,ordinary:2.1,big:2.8,super:3.3};
const PRIORITY:Record<GuardianCue,number>={touch:0,spin:1,ordinary:2,big:3,super:4};
const THEME:Record<GameId,number>={'caravan-gold':0,'sapphire-oasis':1,'ruby-bazaar':2,'crown-voyage':3};
interface Bone {pivot:readonly[number,number];area:readonly[number,number,number,number];soft:number;idle:number;phase:number;scale?:number;}
// Individually measured on the F37 cutouts (u right, v down). Feet and held
// treasure stay anchored; only actual joints move, with blended bitmap seams.
const BONES:readonly (readonly Bone[])[]=[
 [ // Lion: paw invitation, a small nod, tail follows after the paw.
  {pivot:[.52,.29],area:[.27,-.10,.79,.35],soft:.11,idle:.42,phase:.25,scale:.002},
  {pivot:[.34,.39],area:[-.12,.12,.42,.47],soft:.13,idle:.40,phase:0,scale:.004},
  {pivot:[.74,.53],area:[.69,.34,1.12,.62],soft:.12,idle:.15,phase:.70},
  {pivot:[.53,.72],area:[.33,.35,.74,.73],soft:.13,idle:0,phase:.32,scale:.006},
  {pivot:[.30,.66],area:[.03,.50,.30,.73],soft:.08,idle:1.1,phase:.85},
  {pivot:[.62,.09],area:[.57,-.10,.71,.13],soft:.045,idle:.7,phase:.60},
  {pivot:[.22,.33],area:[-.06,.13,.23,.36],soft:.065,idle:0,phase:0}, // lion inward-curling palm
 ],
 [ // Elephant: palm and trunk use different pivots; the ingot tray is stable.
  {pivot:[.46,.29],area:[.31,-.10,.70,.34],soft:.10,idle:.36,phase:.25,scale:.002},
  {pivot:[.32,.45],area:[-.12,.25,.38,.57],soft:.14,idle:.35,phase:0,scale:.003},
  {pivot:[.71,.54],area:[.69,.37,1.12,.63],soft:.12,idle:.08,phase:.85},
  {pivot:[.52,.78],area:[.30,.43,.73,.77],soft:.14,idle:0,phase:.30,scale:.005},
  {pivot:[.47,.28],area:[.42,.25,.81,.46],soft:.08,idle:1.15,phase:.40},
  {pivot:[.34,.24],area:[.09,.12,.35,.38],soft:.09,idle:.8,phase:.78},
  {pivot:[.16,.39],area:[-.05,.23,.19,.43],soft:.06,idle:0,phase:0}, // elephant welcoming fingers
 ],
 [ // Peacock: wing/shoulder, tail fan and crown feather have delayed follow-through.
  {pivot:[.53,.32],area:[.37,-.08,.76,.32],soft:.10,idle:.48,phase:.25,scale:.002},
  {pivot:[.46,.37],area:[-.12,.13,.48,.51],soft:.14,idle:.45,phase:0,scale:.003},
  {pivot:[.77,.53],area:[.73,.36,1.12,.65],soft:.13,idle:.12,phase:.80},
  {pivot:[.54,.77],area:[.36,.35,.78,.77],soft:.13,idle:0,phase:.32,scale:.005},
  {pivot:[.43,.61],area:[-.10,.52,.42,.84],soft:.13,idle:.65,phase:.88},
  {pivot:[.58,.12],area:[.47,-.12,.76,.16],soft:.075,idle:1.0,phase:.62},
  {pivot:[.24,.32],area:[-.06,.14,.26,.34],soft:.07,idle:0,phase:0}, // peacock feather-tip inward sweep
 ],
 [ // Parrot: wing beckons, feather/tail settle, the compass does not wobble.
  {pivot:[.53,.31],area:[.31,-.09,.84,.34],soft:.13,idle:.52,phase:.30,scale:.002},
  {pivot:[.35,.35],area:[-.12,.14,.38,.46],soft:.13,idle:.45,phase:0,scale:.003},
  {pivot:[.72,.54],area:[.72,.31,1.12,.63],soft:.12,idle:.12,phase:.75},
  {pivot:[.54,.75],area:[.32,.36,.73,.75],soft:.13,idle:0,phase:.35,scale:.005},
  {pivot:[.34,.63],area:[.02,.55,.34,.87],soft:.10,idle:.75,phase:.85},
  {pivot:[.75,.09],area:[.69,-.10,.94,.16],soft:.075,idle:1.1,phase:.58},
  {pivot:[.25,.34],area:[-.04,.14,.27,.37],soft:.07,idle:0,phase:0}, // parrot feather-tip inward curl
 ],
];
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const a=clamp(x);return a*a*(3-2*a);};
const ramp=(a:number,b:number,x:number)=>smooth((x-a)/(b-a));
const window=(a:number,b:number,x:number,s:number)=>ramp(a,a+s,x)*(1-ramp(b-s,b,x));
function planted(v:number):number{return 1-ramp(.82,.89,v);}
export function guardianPlanted(_id:GameId,_u:number,v:number):boolean{return planted(v)===0;}
function weights(theme:number,u:number,v:number):number[]{
 const w=BONES[theme].map(b=>window(b.area[0],b.area[2],u,b.soft)*window(b.area[1],b.area[3],v,b.soft)*planted(v));
 const total=w.reduce((s,n)=>s+n,0),factor=1/Math.max(1,total);const result=w.map(n=>n*factor);
 // Bind the eye/beak/tusk core and carried engravings as rigid details. This is
 // precomputed once, not a per-frame mask, additional sprite or drawn patch.
 for(const detail of GUARDIAN_RIGID_DETAILS[theme]){
  const [l,t,r,b]=detail.area,a=window(l,r,u,detail.soft)*window(t,b,v,detail.soft)*planted(v);
  if(a===0)continue;
  for(let j=0;j<result.length;j++)result[j]=result[j]*(1-a)+(j===detail.joint?a:0);
 }
 return result;
}
export interface GuardianPose {readonly angles:readonly number[];readonly scales:readonly number[];}
export interface MutableGuardianPose {angles:number[];scales:number[];}
export function emptyGuardianPose(id:GameId):MutableGuardianPose{return {angles:BONES[THEME[id]].map(()=>0),scales:BONES[THEME[id]].map(()=>1)};}
type JointTrack=readonly (readonly [seconds:number,degrees:number])[];
interface GuardianChoreography {
 readonly name:string;readonly seconds:number;readonly actionEnd:number;readonly lead:0|1|4;
 readonly tracks:readonly (JointTrack|undefined)[];
}
// Authored joint clips, not one sine wave with four different amplitudes.
// Channels: head, free paw/wing, held treasure, chest, tail/trunk, crown/ear.
// Every clip ends at rest, followed by an actual pause. Two equal keys hold
// the pose; a negative key reverses a wing. These are intentional gestures.
export const GUARDIAN_CHOREOGRAPHY:Record<GuardianContext,readonly GuardianChoreography[]>={
 lobby:[
  {name:'lion-prosperity-three-inward-invitations',seconds:7.6,actionEnd:3.7,lead:1,tracks:[
   [[0,0],[.65,0],[1.08,-2.3],[1.4,-2.3],[1.78,.8],[2.25,-1.2],[3,0]],
   [[0,0],[.25,0],[.72,9.2],[1.1,9.2],[1.43,2.1],[1.84,8.6],[2.21,2.4],[2.68,7.2],[3.32,0]],
   undefined,undefined,[[0,0],[1,0],[1.7,2.8],[2.5,-1.2],[3.7,0]],
   [[0,0],[1,0],[1.65,1.6],[2.4,-.6],[3.5,0]],
   [[0,0],[.62,0],[1.0,7.0],[1.35,0],[1.88,6.8],[2.18,0],[2.72,6.1],[3.35,0]]]},
  {name:'elephant-wealth-palm-and-trunk-welcome',seconds:8.5,actionEnd:4.4,lead:4,tracks:[
   [[0,0],[.6,0],[1.45,-1.6],[2.4,-1.6],[3.45,.7],[4.3,0]],
   [[0,0],[2,0],[2.65,1.7],[3.25,1.7],[4,0]],undefined,undefined,
   [[0,0],[.2,0],[1.12,-5.2],[1.9,-5.2],[2.65,-1.2],[3.35,-4.6],[4.4,0]],
   [[0,0],[.5,0],[1.2,3.6],[1.65,-1.1],[2.25,3],[3,0],[3.65,1.6],[4.3,0]],
   [[0,0],[.8,0],[1.42,5.4],[1.9,0],[2.75,5.1],[3.4,0],[4.4,0]]]},
  {name:'peacock-prosperity-feather-invitation',seconds:9.1,actionEnd:4.8,lead:1,tracks:[
   [[0,0],[.7,0],[1.45,2.2],[2.6,2.2],[3.4,-1.2],[4.5,0]],
   [[0,0],[.3,0],[1.35,6.8],[2.7,6.8],[3.8,2.5],[4.8,0]],undefined,undefined,
   [[0,0],[.15,0],[1,3.3],[2.9,3.3],[4.25,0]],
   [[0,0],[1.2,0],[1.85,2.4],[2.35,-1.3],[3.1,.9],[4.4,0]],
   [[0,0],[1.15,0],[1.95,7.6],[2.65,7.6],[3.25,1.5],[3.8,5.1],[4.8,0]]]},
  {name:'parrot-treasure-three-feather-beckons',seconds:6.8,actionEnd:3.3,lead:0,tracks:[
   [[0,0],[.18,0],[.55,-3.1],[.94,1.4],[1.32,-2.2],[1.7,0],[2.2,1.7],[3.05,0]],
   [[0,0],[.65,0],[.94,8.2],[1.21,-1.9],[1.55,7.7],[1.84,-1.4],[2.17,6.2],[2.75,0]],undefined,undefined,
   [[0,0],[1,0],[1.45,-2.2],[1.85,2.5],[2.3,-1.5],[3.3,0]],
   [[0,0],[.5,0],[1,2.2],[1.5,-1],[2,1.4],[3,0]],
   [[0,0],[.9,0],[1.2,5.5],[1.45,0],[1.75,5.3],[2.0,0],[2.35,4.6],[2.95,0]]]},
 ],
 cabinet:[
  {name:'lion-wealth-two-palm-collections',seconds:6.5,actionEnd:2.65,lead:1,tracks:[
   [[0,0],[.75,0],[1.13,-1.3],[1.52,0],[1.96,-1.6],[2.55,0]],
   [[0,0],[.3,0],[.82,7.8],[1.2,1.3],[1.7,8.2],[2.3,0]],undefined,undefined,
   [[0,0],[1,0],[1.65,1.9],[2.15,-.8],[2.65,0]],undefined,
   [[0,0],[.6,0],[1.03,7.3],[1.36,0],[1.9,7.8],[2.55,0]]]},
  {name:'elephant-ingot-blessing-and-inward-palm',seconds:7.3,actionEnd:3.8,lead:4,tracks:[
   [[0,0],[1.4,0],[2.12,-1.4],[2.65,0],[3.12,-.8],[3.8,0]],
   [[0,0],[2.2,0],[2.85,1.3],[3.65,0]],undefined,undefined,
   [[0,0],[.4,0],[1.24,-4.8],[2.15,-4.8],[2.87,1],[3.8,0]],
   [[0,0],[1.1,0],[1.8,2.3],[2.6,-.7],[3.65,0]],
   [[0,0],[1.0,0],[1.65,6.0],[2.35,6.0],[2.8,1.2],[3.25,4.2],[3.8,0]]]},
  {name:'peacock-wing-drawing-wealth-to-chest',seconds:8.2,actionEnd:3.85,lead:4,tracks:[
   [[0,0],[.5,0],[1.24,-1.8],[2.05,-1.8],[2.9,.6],[3.85,0]],
   [[0,0],[1.2,0],[1.9,6.0],[2.6,6.0],[3.5,0]],undefined,undefined,
   [[0,0],[.25,0],[1.1,2.9],[1.55,2.9],[2.2,-1.5],[3.55,0]],
   [[0,0],[1.3,0],[1.85,1.4],[2.4,-.6],[3.75,0]],
   [[0,0],[1.75,0],[2.25,7.2],[2.65,7.2],[3.05,1.1],[3.4,4.9],[3.85,0]]]},
  {name:'parrot-two-inward-treasure-sweeps',seconds:5.9,actionEnd:2.95,lead:0,tracks:[
   [[0,0],[.25,0],[.73,2.7],[1.25,2.7],[1.65,-1.2],[2.3,.6],[2.9,0]],
   [[0,0],[1.05,0],[1.34,7.6],[1.62,-1.5],[1.96,5.8],[2.55,0]],undefined,undefined,
   [[0,0],[1.55,0],[2.05,1.9],[2.45,-1],[2.95,0]],
   [[0,0],[.5,0],[1,1.7],[1.45,-.8],[2.6,0]],
   [[0,0],[1.3,0],[1.63,6.2],[1.88,0],[2.2,5.7],[2.95,0]]]},
 ],
};
function trackAt(track:JointTrack|undefined,time:number):number{
 if(!track||time<=track[0][0])return 0;
 for(let i=1;i<track.length;i++)if(time<track[i][0]){
  const [a,from]=track[i-1],[b,to]=track[i],p=clamp((time-a)/(b-a));
  // Zero acceleration at every held pose avoids the mechanical stop/start jerk.
  return from+(to-from)*(p*p*p*(p*(p*6-15)+10));
 }
 return track[track.length-1][1];
}
const SPIN_HEAD=[-1.8,-1.1,-1.3,2.1] as const;
const swell=(t:number,a:number,b:number,c:number,d:number)=>ramp(a,b,t)*(1-ramp(c,d,t));
// Separate anticipation and award gestures. The reward cue temporarily rests
// the ambient invitation so a win never stacks several deformations together.
function response(theme:number,j:number,p:number,cue:GuardianCue):number{
 if(cue==='spin'){
  const wait=swell(p,.02,.24,.72,1);
  if(j===0)return SPIN_HEAD[theme]*wait;
  if(j===4&&theme===1)return -1.8*wait;
  if(j===5&&theme===3)return .9*wait;
  return 0;
 }
 const superWin=cue==='super',ordinary=cue==='ordinary',gain=ordinary?.37:1;
 const bow=swell(p,.1,.27,.36,.6),finish=swell(p,.57,.7,.78,.98);
 switch(theme){
  case 0:{ // Lion: one broad salute, or three rising coin-beckoning strokes.
   const paw=superWin?swell(p,.03,.15,.22,.32)+swell(p,.32,.43,.51,.62)+swell(p,.62,.74,.83,.99):swell(p,.08,.3,.5,.93);
   return gain*(j===1?9.1*paw:j===0?-2.3*bow-1.4*finish:j===4?2.5*swell(p,.3,.55,.7,1):j===5?1.5*finish:0);
  }
  case 1:{ // Elephant: curl/offer through the trunk; ears respond afterwards.
   const offer=swell(p,.02,.3,superWin?.56:.46,.86),ear=swell(p,.25,.4,.46,.58)+(superWin?swell(p,.59,.7,.77,.94):0);
   return gain*(j===4?-5.3*offer+1.4*finish:j===5?3.4*ear:j===0?-1.8*bow:j===1?1.7*finish:0);
  }
  case 2:{ // Peacock: deliberate wing spread and a held tail fan, no paw wave.
   const fan=swell(p,.02,.22,superWin?.75:.59,.99),wing=swell(p,.15,.36,superWin?.66:.5,.9);
   return gain*(j===4?3.2*fan:j===1?7.2*wing:j===0?2.2*bow-1.1*finish:j===5?2.1*finish:0);
  }
  default:{ // Parrot: asymmetric feather flicks followed by a curious nod.
   const flick=swell(p,.04,.17,.23,.35)-.22*swell(p,.29,.36,.4,.46)+swell(p,.44,.56,.63,.75)+(superWin?.8*swell(p,.73,.81,.86,1):0);
   return gain*(j===1?8.4*flick:j===0?-2.7*bow+1.8*finish:j===4?-2.1*bow+2.1*finish:j===5?1.9*finish:0);
  }
 }
}
/** Optional caller-owned pose removes allocations from the runtime animation loop. */
export function guardianPose(id:GameId,time:number,cue?:GuardianCue,cueTime=0,reduced=false,out=emptyGuardianPose(id),context:GuardianContext='cabinet'):MutableGuardianPose{
 const theme=THEME[id],bones=BONES[theme],clip=GUARDIAN_CHOREOGRAPHY[context][theme];
 time=Number.isFinite(time)?Math.max(0,time):0;cueTime=Number.isFinite(cueTime)?Math.max(0,cueTime):0;
 const t=time%clip.seconds,duration=cue?GUARDIAN_CUE_SECONDS[cue]:1,p=clamp(cueTime/duration);
 const takeover=cue?swell(cueTime,0,.18,Math.max(.18,duration-.22),duration):0;
 for(let j=0;j<bones.length;j++){
  const b=bones[j];if(reduced){out.angles[j]=0;out.scales[j]=1;continue;}
  const idle=b.idle*Math.sin(time*(.76+theme*.11)+b.phase*2+theme*.8)*.48;
  const ambient=trackAt(clip.tracks[j],t);
  const reaction=cue==='touch'?trackAt(clip.tracks[j],p*clip.actionEnd):cue?j===6?(cue==='spin'?0:(cue==='super'?7:cue==='big'?5.5:3.5)*swell(p,.08,.3,.55,.94)):response(theme,j,p,cue):0;
  out.angles[j]=(idle*(1-takeover*.7)+ambient*(1-takeover)+reaction)*Math.PI/180;
  // A shallow local breath only. There is no character-node scale or bob.
  out.scales[j]=1+(b.scale??0)*.28*Math.sin(time*(1.06+theme*.08)+b.phase);
 }
 return out;
}
export interface GuardianPoint{x:number;y:number;}
const BLEND_SECONDS=.30;
export class GuardianRig {
 readonly theme:number;readonly vertices=new Float32Array((GUARDIAN_GRID_X+1)*(GUARDIAN_GRID_Y+1)*2);
 readonly rest=new Float32Array(this.vertices.length);
 private readonly skin:readonly number[][];private elapsed=0;private cueElapsed=0;private active?:GuardianCue;private lastTouch=-Infinity;
 private readonly pose:MutableGuardianPose;private readonly from:MutableGuardianPose;private readonly cosines:Float64Array;private readonly sines:Float64Array;private blendRemaining=0;
 readonly width:number;readonly height:number;
 constructor(readonly id:GameId,width:number,height:number,readonly reduced=false,readonly context:GuardianContext='cabinet'){
  this.theme=THEME[id];this.width=width;this.height=height;
  this.pose=emptyGuardianPose(id);this.from=emptyGuardianPose(id);this.cosines=new Float64Array(this.pose.angles.length);this.sines=new Float64Array(this.pose.angles.length);
  const skin:number[][]=[];let i=0;
  for(let row=0;row<=GUARDIAN_GRID_Y;row++)for(let col=0;col<=GUARDIAN_GRID_X;col++){
   const u=col/GUARDIAN_GRID_X,v=row/GUARDIAN_GRID_Y;this.rest[i++]=u;this.rest[i++]=v;skin.push(weights(this.theme,u,v));
  }
  this.skin=skin;this.vertices.set(this.rest);
 }
 get cue():GuardianCue|undefined{return this.active;}
 get time():number{return this.elapsed;}
 get cueTime():number{return this.cueElapsed;}
 get currentPose():GuardianPose{return this.pose;}
 trigger(cue:GuardianCue):boolean{
  if(cue==='touch'&&this.elapsed-this.lastTouch<2.2)return false;
  if(this.active&&(PRIORITY[cue]<PRIORITY[this.active]||cue===this.active))return false;
  if(cue==='touch')this.lastTouch=this.elapsed;
  for(let j=0;j<this.pose.angles.length;j++){this.from.angles[j]=this.pose.angles[j];this.from.scales[j]=this.pose.scales[j];}
  this.blendRemaining=BLEND_SECONDS;this.active=cue;this.cueElapsed=0;return true;
 }
 advance(dt:number):void{
  if(!Number.isFinite(dt)||dt<=0)return;
  const step=Math.min(dt,.05);this.elapsed+=step;this.cueElapsed+=step;
  if(this.active&&this.cueElapsed>=GUARDIAN_CUE_SECONDS[this.active])this.active=undefined;
  guardianPose(this.id,this.elapsed,this.active,this.cueElapsed,this.reduced,this.pose,this.context);
  if(this.blendRemaining>0){
   this.blendRemaining=Math.max(0,this.blendRemaining-step);const p=smooth(1-this.blendRemaining/BLEND_SECONDS);
   for(let j=0;j<this.pose.angles.length;j++){this.pose.angles[j]=this.from.angles[j]+(this.pose.angles[j]-this.from.angles[j])*p;this.pose.scales[j]=this.from.scales[j]+(this.pose.scales[j]-this.from.scales[j])*p;}
  }
  this.apply(this.pose);
 }
 /** Bilinear sampling keeps accessory reflections on the exact deformed artwork. */
 sample(u:number,v:number,out:GuardianPoint):GuardianPoint{
  const col=clamp(u)*GUARDIAN_GRID_X,row=clamp(v)*GUARDIAN_GRID_Y,x=Math.min(GUARDIAN_GRID_X-1,Math.floor(col)),y=Math.min(GUARDIAN_GRID_Y-1,Math.floor(row)),fx=col-x,fy=row-y;
  const ia=(y*(GUARDIAN_GRID_X+1)+x)*2,ib=ia+2,ic=ia+(GUARDIAN_GRID_X+1)*2,id=ic+2,p=this.vertices;
  out.x=(p[ia]*(1-fx)+p[ib]*fx)*(1-fy)+(p[ic]*(1-fx)+p[id]*fx)*fy;
  out.y=(p[ia+1]*(1-fx)+p[ib+1]*fx)*(1-fy)+(p[ic+1]*(1-fx)+p[id+1]*fx)*fy;return out;
 }
 apply(pose:GuardianPose):void{
  if(this.reduced){this.vertices.set(this.rest);return;}
  const bones=BONES[this.theme],c=this.cosines,s=this.sines;
  for(let j=0;j<bones.length;j++){this.pose.angles[j]=pose.angles[j];this.pose.scales[j]=pose.scales[j];c[j]=Math.cos(pose.angles[j]);s[j]=Math.sin(pose.angles[j]);}
  for(let i=0;i<this.skin.length;i++){
   const u=this.rest[i*2],v=this.rest[i*2+1],w=this.skin[i];let dx=0,dy=0;
   for(let j=0;j<bones.length;j++){
    if(w[j]===0)continue;
    const [px,py]=bones[j].pivot,x=(u-px)*this.width,y=(v-py)*this.height,scale=pose.scales[j];
    dx+=w[j]*((x*c[j]-y*s[j])*scale-x)/this.width;dy+=w[j]*((x*s[j]+y*c[j])*scale-y)/this.height;
   }
   this.vertices[i*2]=u+dx;this.vertices[i*2+1]=v+dy;
  }
 }
}
