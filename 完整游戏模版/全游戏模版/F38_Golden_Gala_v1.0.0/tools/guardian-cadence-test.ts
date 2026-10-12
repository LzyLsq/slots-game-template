import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {guardianPose,GuardianRig,GUARDIAN_CHOREOGRAPHY,guardianCueDuration} from '../assets/scripts/ui/GuardianMotion';
import {fitGuardianSeat} from '../assets/scripts/ui/GuardianDetails';
import {emptyGuardianCoinPose,guardianWealthCoin} from '../assets/scripts/ui/GuardianProsperity';
const results:unknown[]=[];
let movingWindows=0,seams=0,reactions=0;
for(const context of ['lobby','cabinet'] as const)for(const [theme,cfg] of GAME_CONFIGS.entries()){
 const clip=GUARDIAN_CHOREOGRAPHY[context][theme],fit=fitGuardianSeat(cfg.id,262,306);
 assert(clip.seconds-clip.actionEnd>=.7&&clip.seconds-clip.actionEnd<=.81,'Recovery is brief but never rushed');
 const samples:number[][]=[];
 for(let frame=0;frame<=Math.ceil(clip.seconds*4*120);frame++){
  const pose=guardianPose(cfg.id,frame/120,undefined,0,false,undefined,context);
  assert(pose.angles.every(Number.isFinite)&&pose.scales.every(s=>s>.99&&s<1.01));
  assert.equal(pose.angles[2],0,'Treasure-holding arm remains level');
  samples.push(pose.angles.map(a=>a*180/Math.PI));
 }
 let minimum=Infinity;
 // Looking at a complete 1.2s interval avoids mistaking a natural reversal for
 // a freeze. Even between invitations, a real paw/trunk/ear follows through.
 for(let start=0;start+144<samples.length;start+=12){
  let range=0;
  for(let joint=0;joint<7;joint++){
   const values=samples.slice(start,start+145).map(p=>p[joint]);
   range=Math.max(range,Math.max(...values)-Math.min(...values));
  }
  assert(range>.1,`${context}/${cfg.id}: stationary recovery at ${start/120}s`);
  minimum=Math.min(minimum,range);movingWindows++;
 }
 for(let loop=1;loop<=4;loop++){
  const time=loop*clip.seconds,e=1e-4;
  const before=guardianPose(cfg.id,time-e,undefined,0,false,undefined,context).angles;
  const at=guardianPose(cfg.id,time,undefined,0,false,undefined,context).angles;
  const after=guardianPose(cfg.id,time+e,undefined,0,false,undefined,context).angles;
  for(let joint=0;joint<7;joint++){
   assert(Math.abs(after[joint]-before[joint])<1e-5,'Loop never snaps');
   assert(Math.abs((after[joint]-at[joint])/e-(at[joint]-before[joint])/e)<.001,'Loop preserves velocity');
  }
  seams++;
 }
 for(const cue of ['touch','spin','ordinary','big','super'] as const){
  const rig=new GuardianRig(cfg.id,fit.width,fit.height,false,context);
  for(let frame=0;frame<45;frame++)rig.advance(1/60);
  const vertices=rig.vertices.slice();assert(rig.trigger(cue));assert.deepEqual(rig.vertices,vertices);
  const pause=rig.ambientTime,duration=guardianCueDuration(cfg.id,context,cue);
  assert(!rig.trigger('touch'),'A reaction cannot be overwritten by repeated/low-priority taps');
  for(let frame=0;frame<Math.ceil((duration+.5)*60);frame++){
   rig.advance(1/60);
   if(rig.cue)assert.equal(rig.ambientTime,pause);
   else if(rig.ambientTime-pause<.4){
    assert(rig.currentPose.angles.every(a=>Math.abs(a)<.012),'Smooth recovery before a fresh invitation');
    for(let coin=0;coin<2;coin++)assert.equal(guardianWealthCoin(cfg.id,context,rig.ambientTime,coin,undefined,0,false,emptyGuardianCoinPose(),pause).opacity,0,'No late coin burst after a reaction');
   }
  }
  assert.equal(rig.cue,undefined);
  // Two more phrases must resume without another trigger.
  const start=rig.ambientTime;
  for(let frame=0;frame<Math.ceil(clip.seconds*2*60);frame++)rig.advance(1/60);
  assert(rig.ambientTime-start>=clip.seconds*1.99);reactions++;
 }
 const still=new GuardianRig(cfg.id,fit.width,fit.height,true,context);const rest=still.vertices.slice();
 for(let frame=0;frame<150;frame++)still.advance(1/30);
 assert.deepEqual(still.vertices,rest,'Reduced-motion option remains genuinely still');
 results.push({id:cfg.id,context,loopSeconds:clip.seconds,recoverySeconds:+(clip.seconds-clip.actionEnd).toFixed(2),minimumJointRangeDegreesOver1_2Seconds:+minimum.toFixed(4)});
}
const sprite=readFileSync('assets/scripts/ui/GuardianSprite.ts','utf8');
assert(sprite.includes('!this.shown||this.rig.reduced'),'Hidden and reduced-motion renderer remains gated');
assert(sprite.includes('guardianUVChanged(rd,frame)'),'Continuous movement retains static UV caching');
const report={date:'2026-10-12',status:'PASS',scope:'CPU pose/mesh and runtime integration; not GPU/physical-device performance certification',movingWindows,seams,reactions,results};
if(process.env.WRITE_QA==='1')writeFileSync('docs/qa/guardian-cadence-20261012.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS continuous guardian cadence: ${movingWindows} moving recovery windows, ${seams} seamless loop boundaries, ${reactions} priority reactions and automatic returns; reduced motion preserved.`);
