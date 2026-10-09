import assert from 'node:assert/strict';
import {GuardianRig,guardianAwardCue,guardianPose,guardianPlanted,GUARDIAN_GRID_X as NX,GUARDIAN_GRID_Y as NY,GUARDIAN_SWEEP,GUARDIAN_CUE_SECONDS,type GuardianCue} from '../assets/scripts/ui/GuardianMotion';
import {CABINETS,guardianMotionBounds} from '../assets/scripts/ui/CabinetGeometry';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
const cues:readonly (GuardianCue|undefined)[]=[undefined,'touch','spin','ordinary','big','super'];
assert.deepEqual([0,1,2,3,4].map(guardianAwardCue),['ordinary','big','super','super','super'],'Guardian and full-screen award tiers must agree');
let poses=0,plantedChecks=0,triangles=0;const signatures:number[]=[];
for(const cfg of GAME_CONFIGS){
 const g=CABINETS[cfg.id].guardian,rig=new GuardianRig(cfg.id,g.width,g.height),bounds=guardianMotionBounds(g);let signature=0;
 rig.apply(guardianPose(cfg.id,0,undefined,0,true));
 assert.deepEqual(rig.vertices,rig.rest,'Rest pose must reproduce the exact original bitmap');
 for(const cue of cues)for(let sample=0;sample<=240;sample++){
  const time=sample/24,ct=cue?sample/240*GUARDIAN_CUE_SECONDS[cue]:0;
  rig.apply(guardianPose(cfg.id,time,cue,ct));poses++;
  for(let i=0;i<rig.vertices.length;i+=2){
   const u=rig.vertices[i],v=rig.vertices[i+1],ru=rig.rest[i],rv=rig.rest[i+1];
   assert(Number.isFinite(u)&&Number.isFinite(v));
   assert(Math.abs(u-ru)<=GUARDIAN_SWEEP.x&&Math.abs(v-rv)<=GUARDIAN_SWEEP.y,`${cfg.id}: joint escapes normalized sweep`);
   const x=g.centre+(u-.5)*g.width,y=g.bottom-g.height+v*g.height;
   assert(x>=bounds[0]&&x<=bounds[0]+bounds[2]&&y>=bounds[1]&&y<=bounds[1]+bounds[3],`${cfg.id}: animated point outside responsive bounds`);
   if(guardianPlanted(cfg.id,ru,rv)){assert.equal(u,ru,`${cfg.id}: planted foot moved sideways`);assert.equal(v,rv,`${cfg.id}: pedestal floated`);plantedChecks++;}
   signature+=Math.abs(u-ru)+Math.abs(v-rv);
  }
  // Every triangle retains orientation. A negative signed area would fold
  // or mirror a piece of the commissioned image, even over alpha pixels.
  const area=(a:number,b:number,c:number)=>{
   const p=rig.vertices;return (p[b*2]-p[a*2])*(p[c*2+1]-p[a*2+1])-(p[b*2+1]-p[a*2+1])*(p[c*2]-p[a*2]);
  };
  for(let row=0;row<NY;row++)for(let col=0;col<NX;col++){
   const a=row*(NX+1)+col,b=a+1,c=a+NX+1,d=c+1;
   assert(area(a,b,c)>1e-6&&area(b,d,c)>1e-6,`${cfg.id} ${cue} @${sample}: skin triangle inverted`);triangles+=2;
  }
 }
 signatures.push(signature);
 assert(rig.trigger('touch'));assert(!rig.trigger('touch'),'Touch must be throttled');assert(rig.trigger('spin'));assert(!rig.trigger('touch'),'Tap cannot interrupt a spin cue');
 assert(rig.trigger('super'));assert(!rig.trigger('ordinary'),'Ordinary cannot overwrite a super-win flourish');
 for(let i=0;i<220;i++)rig.advance(1/60);assert.equal(rig.cue,undefined,'Cue returns to idle');
 assert(rig.trigger('touch'));assert(!rig.trigger('touch'));
 const before=rig.time;rig.advance(NaN);assert.equal(rig.time,before);rig.advance(100);assert(rig.time-before<=.051,'Resume cannot teleport the statue');
 const reduced=new GuardianRig(cfg.id,g.width,g.height,true);reduced.trigger('super');for(let i=0;i<20;i++)reduced.advance(.016);assert.deepEqual(reduced.vertices,reduced.rest,'Reduced motion must remain planted at rest');
}
assert.equal(new Set(signatures.map(s=>Math.round(s))).size,4,'All themes must have distinct motion signatures');
console.log(`PASS ${poses} guardian poses, ${plantedChecks} planted-point checks, ${triangles} non-inverting triangles; cue priority, tap cooldown, pause and reduced motion.`);
