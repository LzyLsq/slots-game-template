import type {GameId} from '../math/types';

export type GuardianCue='touch'|'spin'|'ordinary'|'big'|'super';
/** Matches the shared winTier: normal 0, BIG 1, SUPER BIG and above 2+. */
export function guardianAwardCue(tier:number):GuardianCue{return tier>=2?'super':tier>=1?'big':'ordinary';}
export const GUARDIAN_GRID_X=36,GUARDIAN_GRID_Y=44;
/** Normalized continuous envelope shared with responsive cabinet layout. */
export const GUARDIAN_SWEEP={x:.16,y:.10} as const;
export const GUARDIAN_CUE_SECONDS:Record<GuardianCue,number>={touch:2.2,spin:1.65,ordinary:2.1,big:2.8,super:3.3};
const PRIORITY:Record<GuardianCue,number>={touch:0,spin:1,ordinary:2,big:3,super:4};
const THEME:Record<GameId,number>={'golden-hour':0,'jade-treasury':1,'pearl-palace':2,'ruby-revel':3};
interface Bone {pivot:readonly[number,number];area:readonly[number,number,number,number];soft:number;idle:number;greet:number;reaction:number;phase:number;scale?:number;}
// Authored against the original transparent statues, not their cabinet coordinates.
// Each boundary blends across the existing bitmap: no cropped joint, replacement
// patch or duplicate body. Degrees describe LOCAL joints, never the entire sprite.
const BONES:readonly (readonly Bone[])[]=[
 [
  {pivot:[.59,.385],area:[.31,-.15,.94,.425],soft:.12,idle:.65,greet:-2.4,reaction:-2.3,phase:.35,scale:.007},
  {pivot:[.825,.585],area:[.742,.375,1.12,.63],soft:.075,idle:.8,greet:-10.5,reaction:-5,phase:0,scale:.016},
  {pivot:[.29,.72],area:[-.10,.44,.345,.76],soft:.10,idle:1.1,greet:2,reaction:2,phase:.65},
  {pivot:[.56,.70],area:[.34,.37,.74,.69],soft:.12,idle:0,greet:0,reaction:0,phase:.2,scale:.007},
 ],
 [
  {pivot:[.415,.38],area:[.16,-.16,.66,.45],soft:.115,idle:.65,greet:-2.8,reaction:-2,phase:.3,scale:.005},
  {pivot:[.26,.575],area:[.10,.475,.345,.727],soft:.09,idle:.5,greet:9.5,reaction:5,phase:0,scale:.014},
  {pivot:[.74,.545],area:[.68,.305,1.11,.74],soft:.12,idle:1.3,greet:-3,reaction:-3,phase:.6},
  {pivot:[.55,.69],area:[.32,.34,.77,.65],soft:.12,idle:0,greet:0,reaction:0,phase:.15,scale:.006},
 ],
 [
  {pivot:[.61,.345],area:[.31,-.14,.94,.385],soft:.12,idle:.8,greet:-3.1,reaction:-2.3,phase:.3,scale:.006},
  {pivot:[.335,.47],area:[-.10,.23,.405,.51],soft:.09,idle:2,greet:-7.5,reaction:-4.5,phase:0,scale:.016},
  {pivot:[.59,.48],area:[.51,.35,1.10,.635],soft:.11,idle:-1.7,greet:8,reaction:4.5,phase:.14,scale:.012},
  {pivot:[.575,.73],area:[.18,.665,.80,.88],soft:.10,idle:1.8,greet:-3.2,reaction:-2.5,phase:.6},
  {pivot:[.56,.80],area:[.38,.355,.75,.72],soft:.14,idle:0,greet:0,reaction:0,phase:.25,scale:.006},
 ],
 [
  {pivot:[.37,.34],area:[.16,-.15,.535,.39],soft:.10,idle:.75,greet:2.7,reaction:2.2,phase:.32,scale:.006},
  {pivot:[.51,.425],area:[.32,-.26,1.27,.80],soft:.30,idle:.8,greet:5.7,reaction:2.9,phase:0,scale:.01},
  {pivot:[.24,.40],area:[-.09,.245,.285,.735],soft:.09,idle:-1.1,greet:6.5,reaction:4,phase:.12},
  {pivot:[.51,.635],area:[.53,.49,1.20,1.20],soft:.22,idle:1.1,greet:-2.9,reaction:-2,phase:.6},
  {pivot:[.425,.71],area:[.28,.335,.59,.685],soft:.13,idle:0,greet:0,reaction:0,phase:.2,scale:.006},
 ],
];
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const a=clamp(x);return a*a*(3-2*a);};
const ramp=(a:number,b:number,x:number)=>smooth((x-a)/(b-a));
const window=(a:number,b:number,x:number,s:number)=>ramp(a,a+s,x)*(1-ramp(b-s,b,x));
function planted(theme:number,u:number,v:number):number{
 if(theme===3){
  // Phoenix tail hangs beside the plinth. Only its actual feet and pedestal
  // are immobilized; freezing an entire horizontal row would cut that tail.
  return 1-ramp(.715,.785,v)*(1-ramp(.605,.69,u));
 }
 return 1-ramp(theme===2?.825:.70,theme===2?.89:.765,v);
}
export function guardianPlanted(id:GameId,u:number,v:number):boolean{return planted(THEME[id],u,v)===0;}
function weights(theme:number,u:number,v:number):number[]{
 const base=planted(theme,u,v);
 const w=BONES[theme].map(b=>window(b.area[0],b.area[2],u,b.soft)*window(b.area[1],b.area[3],v,b.soft)*base);
 const total=w.reduce((s,n)=>s+n,0),factor=1/Math.max(1,total);
 return w.map(n=>n*factor);
}
export interface GuardianPose {readonly angles:readonly number[];readonly scales:readonly number[];}
export function guardianPose(id:GameId,time:number,cue?:GuardianCue,cueTime=0,reduced=false):GuardianPose{
 const theme=THEME[id],bones=BONES[theme];
 if(reduced)return {angles:bones.map(()=>0),scales:bones.map(()=>1)};
 // A clear double invitation followed by a rest. Each limb follows the head
 // with a tiny delay; the planted sculpture never bobs up from its shelf.
 const cycle=4.8+theme*.22,t=(time+theme*.63)%cycle;
 const invitation=(elapsed:number,length:number)=>{
  const p=elapsed/length;if(p<=0||p>=1)return 0;
  return Math.sin(2*Math.PI*p)**2*(.65+.35*Math.sin(Math.PI*p));
 };
 const strength=cue==='super'?1.48:cue==='big'?1.30:cue==='ordinary'?.92:cue==='touch'?1.15:.42;
 const angles:number[]=[],scales:number[]=[];
 for(const b of bones){
  const idle=b.idle*Math.sin(time*1.32+b.phase+theme*.7);
  const greeting=invitation(t-b.phase*.28,2.55);
  const reaction=cue?invitation(cueTime-b.phase*.14,GUARDIAN_CUE_SECONDS[cue]-b.phase*.14)*strength:0;
  const look=cue==='spin'?-Math.sin(Math.PI*clamp(cueTime/GUARDIAN_CUE_SECONDS.spin))*.65:0;
  angles.push((idle+b.greet*greeting+b.reaction*reaction+(bones.indexOf(b)===0?look:0))*Math.PI/180);
  // Local chest/head/paw breathing, not a scale tween on the whole sprite.
  scales.push(1+(b.scale??0)*(.3*Math.sin(time*1.55+b.phase)+.7*greeting+reaction));
 }
 return {angles,scales};
}
/** Pure reusable motion state. Precomputed weights + one reusable output buffer
 * make frame cost predictable and keep Cocos/node allocations out of the loop. */
export class GuardianRig {
 readonly theme:number;readonly vertices=new Float32Array((GUARDIAN_GRID_X+1)*(GUARDIAN_GRID_Y+1)*2);
 readonly rest=new Float32Array(this.vertices.length);
 private readonly skin:readonly number[][];private elapsed=0;private cueElapsed=0;private active?:GuardianCue;private lastTouch=-Infinity;
 readonly width:number;readonly height:number;
 constructor(readonly id:GameId,width:number,height:number,readonly reduced=false){
  this.theme=THEME[id];this.width=width;this.height=height;
  const skin:number[][]=[];let i=0;
  for(let row=0;row<=GUARDIAN_GRID_Y;row++)for(let col=0;col<=GUARDIAN_GRID_X;col++){
   const u=col/GUARDIAN_GRID_X,v=row/GUARDIAN_GRID_Y;this.rest[i++]=u;this.rest[i++]=v;skin.push(weights(this.theme,u,v));
  }
  this.skin=skin;this.vertices.set(this.rest);
 }
 get cue():GuardianCue|undefined{return this.active;}
 get time():number{return this.elapsed;}
 trigger(cue:GuardianCue):boolean{
  if(cue==='touch'&&this.elapsed-this.lastTouch<2.2)return false;
  if(this.active&&PRIORITY[cue]<PRIORITY[this.active])return false;
  if(cue==='touch')this.lastTouch=this.elapsed;
  this.active=cue;this.cueElapsed=0;return true;
 }
 advance(dt:number):void{
  if(!Number.isFinite(dt)||dt<=0)return;
  // Visibility pause must not teleport a limb through a giant catch-up frame.
  this.elapsed+=Math.min(dt,.05);this.cueElapsed+=Math.min(dt,.05);
  if(this.active&&this.cueElapsed>=GUARDIAN_CUE_SECONDS[this.active])this.active=undefined;
  this.apply(guardianPose(this.id,this.elapsed,this.active,this.cueElapsed,this.reduced));
 }
 apply(pose:GuardianPose):void{
  if(this.reduced){this.vertices.set(this.rest);return;}
  const bones=BONES[this.theme],c=pose.angles.map(Math.cos),s=pose.angles.map(Math.sin);
  for(let i=0;i<this.skin.length;i++){
   const u=this.rest[i*2],v=this.rest[i*2+1],w=this.skin[i];let dx=0,dy=0;
   for(let j=0;j<bones.length;j++){
    if(w[j]===0)continue;
    const [px,py]=bones[j].pivot,x=(u-px)*this.width,y=(v-py)*this.height,scale=pose.scales[j];
    dx+=w[j]*((x*c[j]-y*s[j])*scale-x)/this.width;
    dy+=w[j]*((x*s[j]+y*c[j])*scale-y)/this.height;
   }
   this.vertices[i*2]=u+dx;this.vertices[i*2+1]=v+dy;
  }
 }
}
