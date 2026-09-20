/** Run: node --import tsx tools/reel-motion-test.ts
 * Pure presentation-math regression tests; does not launch Cocos or validate FPS. */
import assert from 'node:assert/strict';
import { brakeTravel, launchTravel, reelMotionProfile, settleTravel } from '../assets/scripts/reels/ReelMotion';

const modes=['golden-hour','ruby-revel','pearl-palace','jade-treasury'] as const;
const epsilon=1e-7;
const near=(actual:number,expected:number,tolerance:number,message:string):void=>{
  assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} vs ${expected}`);
};
let samples=0;
const profiles=new Set<string>();
for(const mode of modes){
  const p=reelMotionProfile(mode);profiles.add(JSON.stringify(p));
  assert.equal(launchTravel(0,p),0);
  near(launchTravel(p.pullDuration,p),-p.pull,epsilon,'Spring load ends at its exact depth');
  for(const joint of [p.pullDuration,p.pullDuration+p.acceleration]){
    near(launchTravel(joint-epsilon,p),launchTravel(joint+epsilon,p),.00001,'Launch position is continuous');
    const before=(launchTravel(joint,p)-launchTravel(joint-epsilon,p))/epsilon;
    const after=(launchTravel(joint+epsilon,p)-launchTravel(joint,p))/epsilon;
    near(before,after,.001,'Launch velocity is continuous');
  }
  for(const quick of [false,true])for(let column=0;column<5;column++){
    const brakeAt=Math.max(p.pullDuration+p.acceleration+.04,(quick?.38:p.hold)+column*p.stagger*(quick?.68:1));
    const duration=p.brake*(quick?.72:1),settle=p.settle*(quick?.75:1);
    const start=launchTravel(brakeAt,p),final=Math.ceil(start+p.speed*duration*.5),end=final+p.overshoot;
    assert.equal(brakeTravel(0,start,end,p.speed,duration),start);
    assert.equal(brakeTravel(duration,start,end,p.speed,duration),end);
    assert.equal(settleTravel(0,final,p.overshoot,settle),end);
    assert.equal(settleTravel(settle,final,p.overshoot,settle),final);
    near((brakeTravel(epsilon,start,end,p.speed,duration)-start)/epsilon,p.speed,.001,'Braking enters at terminal velocity');
    near((end-brakeTravel(duration-epsilon,start,end,p.speed,duration))/epsilon,0,.001,'Braking leaves at rest');
    let previous=start;
    for(let n=0;n<=1000;n++){
      const value=brakeTravel(n*duration/1000,start,end,p.speed,duration);
      assert.ok(Number.isFinite(value)&&value>=previous-1e-9&&value<=end+1e-9,`${mode}: brake must not reverse or jump`);
      previous=value;samples++;
    }
    for(const hz of [30,60,90,120]){
      let elapsed=0,position=0;
      while(elapsed<brakeAt+duration+settle+.2){
        elapsed+=1/hz;
        position=elapsed<brakeAt?launchTravel(elapsed,p):elapsed<brakeAt+duration?
          brakeTravel(elapsed-brakeAt,start,end,p.speed,duration):settleTravel(elapsed-brakeAt-duration,final,p.overshoot,settle);
      }
      assert.equal(position,final,`${mode}/${hz}Hz: must finish on the same integer cell`);samples++;
      // Mirror SalonReels.draw's strip index mapping for every visible row.
      for(let row=0;row<4;row++){
        const index=Math.floor(position)-row;
        assert.equal(final-index,row,'Final result lookup must not select an adjacent symbol');
        assert.equal(position-Math.floor(position),0,'No half cell may remain visible');
      }
    }
    let previousSettle=end;
    for(let n=0;n<=100;n++){
      const value=settleTravel(n*settle/100,final,p.overshoot,settle);
      assert.ok(value<=previousSettle+1e-9&&value>=final,'Settle must approach the final cell without crossing it');
      previousSettle=value;
    }
    // Long network waits change hold distance only, not stop precision.
    for(const delayedBy of [1,10,120]){
      const lateStart=launchTravel(brakeAt+delayedBy,p),lateFinal=Math.ceil(lateStart+p.speed*duration*.5);
      assert.equal(brakeTravel(duration,lateStart,lateFinal+p.overshoot,p.speed,duration),lateFinal+p.overshoot);
      assert.equal(settleTravel(settle+10,lateFinal,p.overshoot,settle),lateFinal);
    }
  }
}
assert.equal(profiles.size,4,'Each mode must retain a distinct motion profile');
console.log(`PASS ${samples.toLocaleString('en-US')} motion samples: four profiles, normal/turbo, monotone braking, exact 30/60/90/120Hz stops.`);
console.log('PASS C1 launch, bounded settle, result-row mapping, late-result delivery. Runtime visual/performance QA remains separate.');
