import type {GameId} from '../math/types';
import {GUARDIAN_RIGID_DETAILS,guardianCutoutV,guardianCutoutArea,guardianCutoutSoftY} from './GuardianDetails';

export type GuardianContext='lobby'|'cabinet';
export type GuardianCue='touch'|'spin'|'ordinary'|'big'|'super';
export function guardianAwardCue(tier:number):GuardianCue{return tier>=2?'super':tier>=1?'big':'ordinary';}
export const GUARDIAN_GRID_X=36,GUARDIAN_GRID_Y=44;
export const GUARDIAN_SWEEP={x:.16,y:.10} as const;
export const GUARDIAN_CUE_SECONDS:Record<GuardianCue,number>={touch:2.2,spin:1.65,ordinary:2.1,big:2.8,super:3.3};
const PRIORITY:Record<GuardianCue,number>={touch:0,spin:1,ordinary:2,big:3,super:4};
const THEME:Record<GameId,number>={'crown-club':0,'emerald-fortune':1,'ruby-royale':2,'vault-reserve':3};
interface Bone {pivot:readonly[number,number];area:readonly[number,number,number,number];soft:number;softY?:number;idle:number;phase:number;scale?:number;}
// Individually measured on the F38 cutouts (u right, v down). Feet and held
// treasure stay anchored; only actual joints move, with blended bitmap seams.
const BONES:readonly (readonly Bone[])[]=[
 [ // Lion: raised left paw and wrist; ingot anchored, delayed tail.
  {pivot:[0.52, 0.3],area:[0.29, -0.04, 0.81, 0.35],soft:0.06,idle:0.38,phase:0.25,scale:0.002},
  {pivot:[0.28, 0.38],area:[0.03, 0.14, 0.38, 0.44],soft:0.07,idle:0.32,phase:0},
  {pivot:[0.75, 0.58],area:[0.7, 0.39, 1.06, 0.65],soft:0.06,idle:0,phase:0.7},
  {pivot:[0.54, 0.77],area:[0.23, 0.32, 0.82, 0.75],soft:0.12,idle:0,phase:0.32,scale:0.004},
  {pivot:[0.27, 0.68],area:[-0.03, 0.5, 0.28, 0.76],soft:0.045,idle:0.85,phase:0.85},
  {pivot:[0.52, 0.39],area:[0.31, 0.34, 0.7, 0.58],soft:0.055,idle:0.1,phase:0.6},
  {pivot:[0.18, 0.345],area:[0.07, 0.145, 0.30, 0.35],soft:0.045,idle:0,phase:0},
 ],
 [ // Elephant: ear answer and trunk salute, no fictional free hand.
  {pivot:[0.5, 0.3],area:[0.31, -0.04, 0.73, 0.32],soft:0.055,idle:0.28,phase:0.25,scale:0.001},
  {pivot:[0.3, 0.22],area:[0.025, 0.07, 0.35, 0.41],soft:0.055,idle:0.45,phase:0},
  {pivot:[0.81, 0.14],area:[0.77, 0.02, 0.91, 0.13],soft:0.055,idle:0,phase:0.85},
  {pivot:[0.52, 0.82],area:[0.21, 0.4, 0.87, 0.8],soft:0.11,idle:0,phase:0.3,scale:0.004},
  {pivot:[0.54, 0.32],area:[0.49, 0.11, 0.96, 0.41],soft:0.055,idle:0.5,phase:0.4},
  {pivot:[0.71, 0.22],area:[0.65, 0.08, 0.85, 0.37],soft:0.06,idle:0.55,phase:0.78},
  {pivot:[0.82, 0.21],area:[0.75, 0.025, 0.95, 0.26],soft:0.055,idle:0,phase:0},
 ],
 [ // Fox: an actual animal paw beckon, soft ear answer and a delayed tail.
  {pivot:[0.44,0.275],area:[0.23,-0.04,0.69,0.292],soft:0.065,idle:0.22,phase:0.25,scale:0.001},
  {pivot:[0.31,0.435],area:[0.055,0.235,0.36,0.47],soft:0.065,idle:0.24,phase:0},
  {pivot:[0.79,0.495],area:[0.61,0.30,1.05,0.525],soft:0.055,idle:0,phase:0.8},
  {pivot:[0.485,0.82],area:[0.285,0.28,0.625,0.80],soft:0.10,idle:0,phase:0.32,scale:0.002},
  {pivot:[0.37,0.70],area:[-0.025,0.48,0.38,0.89],soft:0.09,idle:0.3,phase:0.88},
  {pivot:[0.575,0.175],area:[0.535,-0.04,0.70,0.155],soft:0.055,idle:0.16,phase:0.62},
  {pivot:[0.222,0.333],area:[0.065,0.22,0.275,0.355],soft:0.046,idle:0,phase:0},
 ],
 ([ // Bull: native horn tips follow the head; vault key remains rigid.
  {pivot:[0.53, 0.29],area:[0.25, -0.14, 0.97, 0.335],soft:0.06,idle:0.3,phase:0.3,scale:0.001},
  {pivot:[0.31, 0.37],area:[0.05, -0.04, 0.36, 0.4],soft:0.06,idle:0.3,phase:0},
  {pivot:[0.8, 0.46],area:[0.73, 0.2, 1.06, 0.58],soft:0.05,idle:0,phase:0.75},
  {pivot:[0.54, 0.76],area:[0.25, 0.32, 0.74, 0.75],soft:0.12,idle:0,phase:0.35,scale:0.004},
  {pivot:[0.26, 0.64],area:[-0.03, 0.49, 0.25, 0.68],soft:0.045,idle:0.6,phase:0.85},
  {pivot:[0.53, 0.39],area:[0.36, 0.315, 0.74, 0.56],soft:0.055,idle:0.1,phase:0.58},
  {pivot:[0.20, 0.19],area:[0.08, 0.075, 0.265, 0.27],soft:0.055,idle:0,phase:0},
 ] as const).map(b=>({...b,pivot:[b.pivot[0],guardianCutoutV('vault-reserve',b.pivot[1])] as const,area:guardianCutoutArea('vault-reserve',b.area),softY:guardianCutoutSoftY('vault-reserve',b.soft)})),
];
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const a=clamp(x);return a*a*(3-2*a);};
const ramp=(a:number,b:number,x:number)=>smooth((x-a)/(b-a));
const window=(a:number,b:number,x:number,s:number)=>ramp(a,a+s,x)*(1-ramp(b-s,b,x));
function planted(theme:number,v:number):number{
 const id=theme===3?'vault-reserve':'crown-club';
 return 1-ramp(guardianCutoutV(id,.82),guardianCutoutV(id,.89),v);
}
export function guardianPlanted(id:GameId,_u:number,v:number):boolean{return planted(THEME[id],v)===0;}
function weights(theme:number,u:number,v:number):number[]{
 const w=BONES[theme].map(b=>window(b.area[0],b.area[2],u,b.soft)*window(b.area[1],b.area[3],v,b.softY??b.soft)*planted(theme,v));
 const total=w.reduce((s,n)=>s+n,0),factor=1/Math.max(1,total);const result=w.map(n=>n*factor);
 // Bind the eye/beak/tusk core and carried engravings as rigid details. This is
 // precomputed once, not a per-frame mask, additional sprite or drawn patch.
 for(const detail of GUARDIAN_RIGID_DETAILS[theme]){
  const [l,t,r,b]=detail.area,a=window(l,r,u,detail.soft)*window(t,b,v,detail.softY??detail.soft)*planted(theme,v);
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
// Channels: head, inviting limb, held treasure, body, tail/trunk, ear/lapel, wrist.
// Every authored phrase returns to neutral; local follow-through carries the
// brief recovery. Two equal keys hold a pose; negative keys reverse a gesture.
/** Each authored phrase returns within 0.8s; the local follow-through below
 * keeps that recovery alive instead of a 3–4 second frozen exhibit. Independent
 * phrase lengths prevent the four lobby guardians moving in lockstep. */
export const GUARDIAN_CHOREOGRAPHY:Record<GuardianContext,readonly GuardianChoreography[]>={
 lobby:[
  {name:'lion-prosperity-three-inward-invitations',seconds:4.5,actionEnd:3.7,lead:1,tracks:[
   [[0,0],[.65,0],[1.08,-2.3],[1.4,-2.3],[1.78,.8],[2.25,-1.2],[3,0]],
   [[0,0],[.12,0],[.25,-.65],[.72,9.2],[1.1,9.2],[1.43,2.1],[1.84,8.6],[2.21,2.4],[2.68,7.2],[3.32,0]],
   undefined,undefined,[[0,0],[1,0],[1.7,2.8],[2.5,-1.2],[3.7,0]],
   [[0,0],[1,0],[1.65,1.6],[2.4,-.6],[3.5,0]],
   [[0,0],[.62,0],[1.0,7.0],[1.35,0],[1.88,6.8],[2.18,0],[2.72,6.1],[3.35,0]]]},
  {name:'elephant-coin-trunk-and-ear-welcome',seconds:5.2,actionEnd:4.4,lead:4,tracks:[
   [[0,0],[.6,0],[1.45,-1.6],[2.4,-1.6],[3.45,.7],[4.3,0]],
   [[0,0],[2,0],[2.65,1.7],[3.25,1.7],[4,0]],undefined,undefined,
   [[0,0],[.10,0],[.28,.45],[1.12,-5.2],[1.9,-5.2],[2.65,-1.2],[3.35,-4.6],[4.4,0]],
   [[0,0],[.5,0],[1.2,3.6],[1.65,-1.1],[2.25,3],[3,0],[3.65,1.6],[4.3,0]],
   [[0,0],[.8,0],[1.42,5.4],[1.9,0],[2.75,5.1],[3.4,0],[4.4,0]]]},
  {name:'fox-prosperity-palm-and-tail-welcome',seconds:5.6,actionEnd:4.8,lead:1,tracks:[
   [[0,0],[.7,0],[1.45,2.2],[2.6,2.2],[3.4,-1.2],[4.5,0]],
   [[0,0],[.15,0],[.38,-.5],[1.35,6.8],[2.7,6.8],[3.8,2.5],[4.8,0]],undefined,undefined,
   [[0,0],[.15,0],[1,3.3],[2.9,3.3],[4.25,0]],
   [[0,0],[.80,0],[1.25,2.0],[1.65,-.7],[2.15,1.3],[2.75,0],[4.4,0]],
   [[0,0],[1.15,0],[1.95,7.6],[2.65,7.6],[3.25,1.5],[3.8,5.1],[4.8,0]]]},
  {name:'bull-three-wealth-hoof-invitations',seconds:4.1,actionEnd:3.3,lead:0,tracks:[
   [[0,0],[.18,0],[.55,-3.1],[.94,1.4],[1.32,-2.2],[1.7,0],[2.2,1.7],[3.05,0]],
   [[0,0],[.42,0],[.65,-.6],[.94,8.2],[1.21,-1.9],[1.55,7.7],[1.84,-1.4],[2.17,6.2],[2.75,0]],undefined,undefined,
   [[0,0],[1,0],[1.45,-2.2],[1.85,2.5],[2.3,-1.5],[3.3,0]],
   [[0,0],[.5,0],[1,2.2],[1.5,-1],[2,1.4],[3,0]],
   [[0,0],[.9,0],[1.2,5.5],[1.45,0],[1.75,5.3],[2.0,0],[2.35,4.6],[2.95,0]]]},
 ],
 cabinet:[
  {name:'lion-wealth-two-palm-collections',seconds:3.45,actionEnd:2.65,lead:1,tracks:[
   [[0,0],[.75,0],[1.13,-1.3],[1.52,0],[1.96,-1.6],[2.55,0]],
   [[0,0],[.14,0],[.30,-.55],[.82,7.8],[1.2,1.3],[1.7,8.2],[2.3,0]],undefined,undefined,
   [[0,0],[1,0],[1.65,1.9],[2.15,-.8],[2.65,0]],undefined,
   [[0,0],[.6,0],[1.03,7.3],[1.36,0],[1.9,7.8],[2.55,0]]]},
  {name:'elephant-trunk-coin-salute',seconds:4.6,actionEnd:3.8,lead:4,tracks:[
   [[0,0],[1.4,0],[2.12,-1.4],[2.65,0],[3.12,-.8],[3.8,0]],
   [[0,0],[2.2,0],[2.85,1.3],[3.65,0]],undefined,undefined,
   [[0,0],[.18,0],[.42,.35],[1.24,-4.8],[2.15,-4.8],[2.87,1],[3.8,0]],
   [[0,0],[1.1,0],[1.8,2.3],[2.6,-.7],[3.65,0]],
   [[0,0],[1.0,0],[1.65,6.0],[2.35,6.0],[2.8,1.2],[3.25,4.2],[3.8,0]]]},
  {name:'fox-table-paw-and-tail-collect',seconds:4.65,actionEnd:3.85,lead:4,tracks:[
   [[0,0],[.5,0],[1.24,-1.8],[2.05,-1.8],[2.9,.6],[3.85,0]],
   [[0,0],[.9,0],[1.2,-.45],[1.9,6.0],[2.6,6.0],[3.5,0]],undefined,undefined,
   [[0,0],[.25,0],[1.1,2.9],[1.55,2.9],[2.2,-1.5],[3.55,0]],
   [[0,0],[1.3,0],[1.9,1.7],[2.3,-.5],[2.75,0],[3.75,0]],
   [[0,0],[1.75,0],[2.25,7.2],[2.65,7.2],[3.05,1.1],[3.4,4.9],[3.85,0]]]},
  {name:'bull-vault-two-hoof-sweeps',seconds:3.75,actionEnd:2.95,lead:0,tracks:[
   [[0,0],[.25,0],[.73,2.7],[1.25,2.7],[1.65,-1.2],[2.3,.6],[2.9,0]],
   [[0,0],[.82,0],[1.05,-.5],[1.34,7.6],[1.62,-1.5],[1.96,5.8],[2.55,0]],undefined,undefined,
   [[0,0],[1.55,0],[2.05,1.9],[2.45,-1],[2.95,0]],
   [[0,0],[.5,0],[1,1.7],[1.45,-.8],[2.6,0]],
   [[0,0],[1.3,0],[1.63,6.2],[1.88,0],[2.2,5.7],[2.95,0]]]},
 ],
};
/** Touches retain each character's phrasing instead of rushing every clip into 2.2s. */
const TOUCH_SECONDS:Record<GuardianContext,readonly number[]>={lobby:[2.5,2.9,3.1,2.9],cabinet:[2.2,2.7,2.8,2.8]};
export function guardianCueDuration(id:GameId,context:GuardianContext,cue:GuardianCue):number{
 return cue==='touch'?TOUCH_SECONDS[context][THEME[id]]:GUARDIAN_CUE_SECONDS[cue];
}
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
// Reused by every pose: no nested amplitude arrays allocated in the frame loop.
const JOINT_AMPLITUDE=[[1,.85,1,1,.75,.9,.8],[.8,.65,1,1,.55,.65,.5],[.85,.85,1,1,.8,.8,.75],[.9,.82,1,1,.75,.9,.75]] as const;
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
  case 2:{ // Fox: inviting forepaw, trailing tail and an alert ear; tray stays level.
   const tail=swell(p,.02,.22,superWin?.75:.59,.99),paw=swell(p,.15,.36,superWin?.66:.5,.9);
   return gain*(j===4?3.2*tail:j===1?7.2*paw:j===0?2.2*bow-1.1*finish:j===5?2.1*finish:0);
  }
  default:{ // Bull: two welcoming hoof curls followed by a confident nod.
   const flick=swell(p,.04,.17,.23,.35)-.22*swell(p,.29,.36,.4,.46)+swell(p,.44,.56,.63,.75)+(superWin?.8*swell(p,.73,.81,.86,1):0);
   return gain*(j===1?8.4*flick:j===0?-2.7*bow+1.8*finish:j===4?-2.1*bow+2.1*finish:j===5?1.9*finish:0);
  }
 }
}
/** A touch is a short acknowledgement, not a sped-up copy of the lobby invitation.
 * Each animal keeps its real joints, delayed follow-through and planted feet. */
function touchResponse(theme:number,j:number,p:number,context:GuardianContext):number{
 const gain=context==='cabinet'?.82:1,thanks=swell(p,.13,.30,.43,.65),settle=swell(p,.62,.76,.84,1);
 if(theme===0){const paw=swell(p,.06,.22,.30,.43)+.88*swell(p,.45,.61,.71,.93);return gain*(j===1?8.6*paw:j===6?7.2*paw:j===0?-2.2*thanks:j===4?1.8*settle:0);}
 if(theme===1){const offer=swell(p,.04,.26,.48,.82),tip=swell(p,.16,.35,.50,.78);return gain*(j===4?-4.6*offer:j===6?5.6*tip:j===5?2.4*settle:j===0?-1.4*thanks:0);}
 if(theme===2){const palm=swell(p,.10,.29,.44,.66),curl=swell(p,.17,.34,.43,.55)+.65*swell(p,.58,.70,.78,.94);return gain*(j===1?5.8*palm:j===6?8.1*curl:j===0?-2.1*thanks:j===4?3.4*settle:j===5?1.4*settle:0);}
 const hoof=swell(p,.04,.19,.27,.38)+.9*swell(p,.40,.56,.66,.89);return gain*(j===1?7.5*hoof:j===6?5.9*hoof:j===0?-2.3*thanks+1.2*settle:j===4?1.5*settle:0);
}
/** Optional caller-owned pose removes allocations from the runtime animation loop. */
export function guardianPose(id:GameId,time:number,cue?:GuardianCue,cueTime=0,reduced=false,out=emptyGuardianPose(id),context:GuardianContext='cabinet',ambientTime=time):MutableGuardianPose{
 const theme=THEME[id],bones=BONES[theme],clip=GUARDIAN_CHOREOGRAPHY[context][theme];
 time=Number.isFinite(time)?Math.max(0,time):0;cueTime=Number.isFinite(cueTime)?Math.max(0,cueTime):0;
 const t=(Number.isFinite(ambientTime)?Math.max(0,ambientTime):0)%clip.seconds,duration=cue?guardianCueDuration(id,context,cue):1,p=clamp(cueTime/duration);
 const takeover=cue?swell(cueTime,0,.18,Math.max(.18,duration-.22),duration):0;
 const phase=time*(Math.PI*2/clip.seconds)+theme*.95+(context==='lobby'?.35:1.05);
 const invitingJoint=theme===1?4:1;
 for(let j=0;j<bones.length;j++){
  const b=bones[j];if(reduced){out.angles[j]=0;out.scales[j]=1;continue;}
  // A free paw/trunk and its wrist answer one another through the recovery.
  // Never animate the treasure-holding joint or add a whole-character bob.
  // Use real elapsed time: a reaction can freeze the invitation clock without
  // snapping this low-amplitude follow-through to a different phase.
  const follow=j===invitingJoint?(context==='lobby'?.32:.26)*Math.sin(phase):
   j===6?(context==='lobby'?.46:.38)*Math.sin(phase-.42):0;
  const idle=b.idle*Math.sin(time*(.76+theme*.11)+b.phase*2+theme*.8)*.48+follow;
  const ambient=trackAt(clip.tracks[j],t);
  const reaction=cue==='touch'?touchResponse(theme,j,p,context):cue?j===6?(cue==='spin'?0:(cue==='super'?7:cue==='big'?5.5:3.5)*swell(p,.08,.3,.55,.94)):response(theme,j,p,cue):0;
  // Broad ears and trunk use smaller arcs; wrist/hoof gestures stay crisp.
  const amplitude=JOINT_AMPLITUDE[theme][j];
  out.angles[j]=(idle*(1-takeover*.7)+ambient*(1-takeover)+reaction)*amplitude*Math.PI/180;
  // A shallow local breath only. There is no character-node scale or bob.
  out.scales[j]=1+(b.scale??0)*.28*Math.sin(time*(1.06+theme*.08)+b.phase);
 }
 return out;
}
export interface GuardianPoint{x:number;y:number;}
const BLEND_SECONDS=.30;
// Quintic inertialisation preserves the incoming joint velocity, then settles
// with zero velocity/acceleration. A frozen-pose crossfade has a visible brake.
function positionResidual(t:number):number{return 1-t*t*t*(10+t*(-15+t*6));}
function velocityResidual(t:number):number{return t+t*t*t*(-6+t*(8-3*t));}

export class GuardianRig {
 readonly theme:number;readonly vertices=new Float32Array((GUARDIAN_GRID_X+1)*(GUARDIAN_GRID_Y+1)*2);
 readonly rest=new Float32Array(this.vertices.length);
 private readonly skin:readonly number[][];private elapsed=0;private cueElapsed=0;private active?:GuardianCue;private lastTouch=-Infinity;
 private readonly pose:MutableGuardianPose;private readonly previous:MutableGuardianPose;private readonly targetStart:MutableGuardianPose;private readonly targetNext:MutableGuardianPose;private readonly offset:MutableGuardianPose;private readonly velocity:MutableGuardianPose;private readonly offsetVelocity:MutableGuardianPose;private idleElapsed=0;private readonly transforms:Float64Array;private blendRemaining=0;
 readonly width:number;readonly height:number;
 constructor(readonly id:GameId,width:number,height:number,readonly reduced=false,readonly context:GuardianContext='cabinet'){
  this.theme=THEME[id];this.width=width;this.height=height;
  this.pose=emptyGuardianPose(id);this.previous=emptyGuardianPose(id);this.targetStart=emptyGuardianPose(id);this.targetNext=emptyGuardianPose(id);this.offset=emptyGuardianPose(id);this.velocity=emptyGuardianPose(id);this.offsetVelocity=emptyGuardianPose(id);this.velocity.scales.fill(0);this.transforms=new Float64Array(this.pose.angles.length*6);
  const skin:number[][]=[];let i=0;
  for(let row=0;row<=GUARDIAN_GRID_Y;row++)for(let col=0;col<=GUARDIAN_GRID_X;col++){
   const u=col/GUARDIAN_GRID_X,v=row/GUARDIAN_GRID_Y;this.rest[i++]=u;this.rest[i++]=v;skin.push(weights(this.theme,u,v));
  }
  this.skin=skin;this.vertices.set(this.rest);
 }
 get cue():GuardianCue|undefined{return this.active;}
 get time():number{return this.elapsed;}
 get cueTime():number{return this.cueElapsed;}
 get ambientTime():number{return this.idleElapsed;}
 get cueDuration():number{return this.active?guardianCueDuration(this.id,this.context,this.active):0;}
 get currentPose():GuardianPose{return this.pose;}
 trigger(cue:GuardianCue):boolean{
  if(cue==='touch'&&this.elapsed-this.lastTouch<guardianCueDuration(this.id,this.context,'touch'))return false;
  if(this.active&&(PRIORITY[cue]<PRIORITY[this.active]||cue===this.active))return false;
  if(cue==='touch')this.lastTouch=this.elapsed;
  const clip=GUARDIAN_CHOREOGRAPHY[this.context][this.theme];
  // Rest the invitation clock while responding. When the cue finishes, there
  // is a brief flowing recovery, not a jump into a half-finished ambient wave.
  this.idleElapsed=Math.floor(this.idleElapsed/clip.seconds)*clip.seconds+clip.actionEnd+.35;
  guardianPose(this.id,this.elapsed,cue,0,this.reduced,this.targetStart,this.context,this.idleElapsed);
  guardianPose(this.id,this.elapsed+.001,cue,.001,this.reduced,this.targetNext,this.context,this.idleElapsed);
  for(let j=0;j<this.pose.angles.length;j++){
   this.offset.angles[j]=this.pose.angles[j]-this.targetStart.angles[j];
   this.offset.scales[j]=this.pose.scales[j]-this.targetStart.scales[j];
   this.offsetVelocity.angles[j]=this.velocity.angles[j]-(this.targetNext.angles[j]-this.targetStart.angles[j])/.001;
   this.offsetVelocity.scales[j]=this.velocity.scales[j]-(this.targetNext.scales[j]-this.targetStart.scales[j])/.001;
  }
  this.blendRemaining=BLEND_SECONDS;this.active=cue;this.cueElapsed=0;return true;
 }
 advance(dt:number):void{
  if(!Number.isFinite(dt)||dt<=0)return;
  const step=Math.min(dt,.05);this.elapsed+=step;
  if(this.active){
   this.cueElapsed+=step;
   if(this.cueElapsed>=guardianCueDuration(this.id,this.context,this.active)){
    const remainder=this.cueElapsed-guardianCueDuration(this.id,this.context,this.active);
    this.active=undefined;this.cueElapsed=0;this.idleElapsed+=remainder;
   }
  }else{this.idleElapsed+=step;}
  for(let j=0;j<this.pose.angles.length;j++){
   this.previous.angles[j]=this.pose.angles[j];this.previous.scales[j]=this.pose.scales[j];
  }
  guardianPose(this.id,this.elapsed,this.active,this.cueElapsed,this.reduced,this.pose,this.context,this.idleElapsed);
  if(this.blendRemaining>0){
   this.blendRemaining=Math.max(0,this.blendRemaining-step);
   const t=1-this.blendRemaining/BLEND_SECONDS,p=positionResidual(t),v=velocityResidual(t)*BLEND_SECONDS;
   for(let j=0;j<this.pose.angles.length;j++){
    this.pose.angles[j]+=this.offset.angles[j]*p+this.offsetVelocity.angles[j]*v;
    this.pose.scales[j]+=this.offset.scales[j]*p+this.offsetVelocity.scales[j]*v;
   }
  }
  for(let j=0;j<this.pose.angles.length;j++){
   this.velocity.angles[j]=(this.pose.angles[j]-this.previous.angles[j])/step;
   this.velocity.scales[j]=(this.pose.scales[j]-this.previous.scales[j])/step;
  }
  this.apply(this.pose);
 }
 /** Match the renderer's two triangles, not a bilinear quad approximation.
  * Jewellery and coin contacts stay on the exact rasterised surface at seams. */
 sample(u:number,v:number,out:GuardianPoint):GuardianPoint{
  const col=clamp(u)*GUARDIAN_GRID_X,row=clamp(v)*GUARDIAN_GRID_Y,x=Math.min(GUARDIAN_GRID_X-1,Math.floor(col)),y=Math.min(GUARDIAN_GRID_Y-1,Math.floor(row)),fx=col-x,fy=row-y;
  const ia=(y*(GUARDIAN_GRID_X+1)+x)*2,ib=ia+2,ic=ia+(GUARDIAN_GRID_X+1)*2,id=ic+2,p=this.vertices;
  if(fx+fy<=1){
   out.x=p[ia]*(1-fx-fy)+p[ib]*fx+p[ic]*fy;
   out.y=p[ia+1]*(1-fx-fy)+p[ib+1]*fx+p[ic+1]*fy;
  }else{
   out.x=p[ib]*(1-fy)+p[ic]*(1-fx)+p[id]*(fx+fy-1);
   out.y=p[ib+1]*(1-fy)+p[ic+1]*(1-fx)+p[id+1]*(fx+fy-1);
  }
  return out;
 }
 apply(pose:GuardianPose):void{
  if(this.reduced){this.vertices.set(this.rest);return;}
  const bones=BONES[this.theme],m=this.transforms;
  for(let j=0;j<bones.length;j++){
   this.pose.angles[j]=pose.angles[j];this.pose.scales[j]=pose.scales[j];
   const o=j*6,c=Math.cos(pose.angles[j])*pose.scales[j],s=Math.sin(pose.angles[j])*pose.scales[j];
   const px=bones[j].pivot[0]*this.width,py=bones[j].pivot[1]*this.height;
   m[o]=c;m[o+1]=-s;m[o+2]=s;m[o+3]=c;m[o+4]=px-c*px+s*py;m[o+5]=py-s*px-c*py;
  }
  // A palm must follow the forearm; the trunk-tip coin follows the trunk.
  // Compose the wrist under its actual parent instead of making it a detached
  // affine patch. All coefficients are reused for the entire skinned grid.
  const parent=(this.theme===1?4:1)*6,wrist=6*6;
  const a=m[wrist],b=m[wrist+1],c=m[wrist+2],d=m[wrist+3],tx=m[wrist+4],ty=m[wrist+5];
  m[wrist]=m[parent]*a+m[parent+1]*c;m[wrist+1]=m[parent]*b+m[parent+1]*d;
  m[wrist+2]=m[parent+2]*a+m[parent+3]*c;m[wrist+3]=m[parent+2]*b+m[parent+3]*d;
  m[wrist+4]=m[parent]*tx+m[parent+1]*ty+m[parent+4];m[wrist+5]=m[parent+2]*tx+m[parent+3]*ty+m[parent+5];
  for(let i=0;i<this.skin.length;i++){
   const u=this.rest[i*2],v=this.rest[i*2+1],weights=this.skin[i],x=u*this.width,y=v*this.height;let dx=0,dy=0;
   for(let j=0;j<bones.length;j++){
    if(weights[j]===0)continue;const o=j*6;
    dx+=weights[j]*(m[o]*x+m[o+1]*y+m[o+4]-x);
    dy+=weights[j]*(m[o+2]*x+m[o+3]*y+m[o+5]-y);
   }
   this.vertices[i*2]=u+dx/this.width;this.vertices[i*2+1]=v+dy/this.height;
  }

 }
}
