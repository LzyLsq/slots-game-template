import type {GameId} from '../math/types';

export type GuardianCue='touch'|'spin'|'ordinary'|'big'|'super';
/** Matches the shared winTier: normal 0, BIG 1, SUPER BIG and above 2+. */
export function guardianAwardCue(tier:number):GuardianCue{return tier>=2?'super':tier>=1?'big':'ordinary';}
export const GUARDIAN_GRID_X=36,GUARDIAN_GRID_Y=44;
/** Normalized continuous envelope shared with responsive cabinet layout. */
export const GUARDIAN_SWEEP={x:.16,y:.10} as const;
export const GUARDIAN_CUE_SECONDS:Record<GuardianCue,number>={touch:2.2,spin:1.65,ordinary:2.1,big:2.8,super:3.3};
const PRIORITY:Record<GuardianCue,number>={touch:0,spin:1,ordinary:2,big:3,super:4};
const THEME:Record<GameId,number>={'caravan-gold':0,'sapphire-oasis':1,'ruby-bazaar':2,'crown-voyage':3};
interface Bone {pivot:readonly[number,number];area:readonly[number,number,number,number];soft:number;idle:number;greet:number;reaction:number;phase:number;scale?:number;}
// Authored against the original transparent statues, not their cabinet coordinates.
// Each boundary blends across the existing bitmap: no cropped joint, replacement
// patch or duplicate body. Degrees describe LOCAL joints, never the entire sprite.
const BONES:readonly (readonly Bone[])[]=[0,1,2,3].map(i=>[
 {pivot:[i===0?.53:.52,.32],area:[.30,-.12,.82,.34],soft:.09,idle:.8,greet:-2.2,reaction:-2,phase:.3,scale:.008},
 // Viewer-left hand/wing genuinely beckons from its shoulder, not the whole body.
 {pivot:[.36,.40],area:[-.12,.10,.39,.48],soft:.20,idle:1.1,greet:i===2?-8.5:9.2+i*.25,reaction:4.5,phase:0,scale:.016},
 {pivot:[.69,.49],area:[.65,.31,1.12,.61],soft:.12,idle:.7,greet:-2.2,reaction:-2.5,phase:.65},
 {pivot:[.53,.72],area:[.30,.34,.70,.72],soft:.12,idle:0,greet:0,reaction:0,phase:.2,scale:.008},
]);
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const a=clamp(x);return a*a*(3-2*a);};
const ramp=(a:number,b:number,x:number)=>smooth((x-a)/(b-a));
const window=(a:number,b:number,x:number,s:number)=>ramp(a,a+s,x)*(1-ramp(b-s,b,x));
function planted(_theme:number,_u:number,v:number):number{return 1-ramp(.82,.89,v);}
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
