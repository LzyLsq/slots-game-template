import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {GuardianRig,GUARDIAN_CHOREOGRAPHY,guardianCueDuration,type GuardianCue} from '../assets/scripts/ui/GuardianMotion';
import {fitGuardianSeat,GUARDIAN_RIGID_DETAILS} from '../assets/scripts/ui/GuardianDetails';
import {guardianWealthCoin,emptyGuardianCoinPose} from '../assets/scripts/ui/GuardianProsperity';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
let interruptions=0,restSamples=0,surfaceSamples=0,peakVelocityChange=0,peakJointStep=0;
const contexts=['lobby','cabinet'] as const;
for(const context of contexts)for(const cfg of GAME_CONFIGS){
 const fit=fitGuardianSeat(cfg.id,262,306),clip=GUARDIAN_CHOREOGRAPHY[context][GAME_CONFIGS.indexOf(cfg)];
 assert(guardianCueDuration(cfg.id,context,'touch')>=2.2);
 // Interrupt at rising, held, reversing and resting phases; three priorities.
 for(const phase of [.38,.83,1.37,2.21,clip.actionEnd+.4])for(const cue of ['touch','spin','super'] as const){
  const rig=new GuardianRig(cfg.id,fit.width,fit.height,false,context),dt=1/240;
  while(rig.time<phase)rig.advance(dt);
  const previous=rig.currentPose.angles.slice();rig.advance(dt);
  const old=rig.currentPose.angles.slice(),velocity=old.map((v,j)=>(v-previous[j])/dt);
  const before=rig.vertices.slice();assert(rig.trigger(cue));assert.deepEqual(rig.vertices,before,'Trigger does not snap an applied vertex');
  const epsilon=.0001;rig.advance(epsilon);
  for(let j=0;j<old.length;j++){
   const next=(rig.currentPose.angles[j]-old[j])/epsilon,diff=Math.abs(next-velocity[j]);
   peakVelocityChange=Math.max(peakVelocityChange,diff);
   assert(diff<.004,`${cfg.id} ${context} ${cue} phase ${phase}: visible braking at handoff ${diff}`);
  }
  interruptions++;
  // Escalate a live cue, then verify both the settle and the frozen idle clock.
  rig.advance(.05);const clock=rig.ambientTime;
  if(cue!=='super')assert(rig.trigger('super'));
  for(let frame=0;frame<220;frame++){
   const oldPose=rig.currentPose.angles.slice();rig.advance(1/60);
   for(let j=0;j<oldPose.length;j++)peakJointStep=Math.max(peakJointStep,Math.abs(rig.currentPose.angles[j]-oldPose[j]));
   if(rig.cue){assert.equal(rig.ambientTime,clock,'Idle invitation pauses while reacting');}
   else{
    assert(rig.currentPose.angles.every(a=>Math.abs(a)<.012),'No resumed half-wave after the win');
    const coin=emptyGuardianCoinPose();guardianWealthCoin(cfg.id,context,rig.ambientTime,0,rig.cue,rig.cueTime,false,coin,clock);
    assert.equal(coin.opacity,0,'No stale prosperity flight after the reaction');restSamples++;
   }
  }
 }
 const rig=new GuardianRig(cfg.id,fit.width,fit.height,false,context);
 assert(rig.trigger('touch'));const duration=guardianCueDuration(cfg.id,context,'touch');
 for(let frame=0;frame<Math.floor(duration*60);frame++)rig.advance(1/60);
 assert.equal(rig.cue,'touch');rig.advance(.05);assert.equal(rig.cue,undefined,'Character-specific duration expires exactly once');
 // Accessories must use the same triangle and barycentric interpolation as
 // the Cocos assembler. Bilinear interpolation subtly slides across bent seams.
 assert(rig.trigger('super'));for(let frame=0;frame<57;frame++)rig.advance(1/60);
 assert(rig.currentPose.angles.some(a=>Math.abs(a)>.02),'Contact samples exercise a bent pose, not rest');
 const point={x:0,y:0};
 for(const [fx,fy] of [[.12,.27],[.81,.13],[.51,.49],[.72,.84]])for(let row=0;row<44;row+=3)for(let col=0;col<36;col+=3){
  const a=(row*37+col)*2,b=a+2,c=a+74,d=c+2,v=rig.vertices;
  const x=fx+fy<=1?v[a]*(1-fx-fy)+v[b]*fx+v[c]*fy:v[b]*(1-fy)+v[c]*(1-fx)+v[d]*(fx+fy-1);
  const y=fx+fy<=1?v[a+1]*(1-fx-fy)+v[b+1]*fx+v[c+1]*fy:v[b+1]*(1-fy)+v[c+1]*(1-fx)+v[d+1]*(fx+fy-1);
  rig.sample((col+fx)/36,(row+fy)/44,point);assert(Math.abs(point.x-x)<1e-12&&Math.abs(point.y-y)<1e-12,'Jewellery contact must not drift between a quad and the rendered triangle');surfaceSamples++;
 }
 const details=GUARDIAN_RIGID_DETAILS[rig.theme];assert(details.some(d=>d.joint===6),'Real hand, hoof or trunk tip has a rigid engraved/skin core');
}
const sprite=readFileSync('assets/scripts/ui/GuardianSprite.ts','utf8'),motion=readFileSync('assets/scripts/ui/GuardianMotion.ts','utf8'),app=readFileSync('assets/scripts/ui/AureliaApp.ts','utf8');
assert(sprite.includes('guardianUVChanged(rd,frame)'),'Position-only animation does not rewrite thousands of static UVs each frame');
assert(sprite.includes('this.rig.ambientTime,i,'),'Coin release uses the same paused gesture clock');
assert(sprite.includes('data-guardian-motions')&&sprite.includes('all[key]?.owner===this.node.uuid'),'Independent proofs have lifecycle ownership');
assert(app.includes("if(cue==='touch')life.bless(i)"),'A tap responds locally, not on every exhibit');
assert(app.includes("if(cue==='touch')this.life?.bless()"),'A spin does not double-trigger ambient feedback');
assert(motion.includes('const parent=(this.theme===1?4:1)*6'),'Palm and trunk-tip inherit their anatomical parent');
const report={date:'2026-10-12',scope:'CPU mesh/pose, authored keepouts and static renderer integration; not browser/GPU or physical-device verification',interruptions,restSamples,surfaceSamples,peakVelocityChangeRadiansPerSecond:peakVelocityChange,peakJointStepRadiansAt60Hz:peakJointStep,status:'PASS'};
if(process.env.WRITE_QA==='1'){mkdirSync('docs/qa',{recursive:true});writeFileSync('docs/qa/guardian-refinement.json',JSON.stringify(report,null,2)+'\n');}
console.log(`PASS guardian refinement: ${interruptions} velocity-preserving cue handoffs, ${restSamples} quiet settle samples, ${surfaceSamples} triangle-exact accessory contacts, max onset Δv ${(peakVelocityChange*180/Math.PI).toFixed(4)}°/s, hierarchical wrists, paused prosperity clock, local feedback and UV cache routing.`);
