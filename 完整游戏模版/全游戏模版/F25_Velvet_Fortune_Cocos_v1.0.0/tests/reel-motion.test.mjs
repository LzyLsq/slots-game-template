import {createRequire} from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';
const {reelMotion}=createRequire(import.meta.url)('../assets/scripts/model/reelMotion.ts');
for(const fast of [false,true])test(`Drum trajectory remains continuous and settles exactly (fast=${fast})`,()=>{
 for(let col=0;col<5;col++){
  const h=95,d=(18+col*2)*h,at=t=>reelMotion(t,d,h,col,fast),duration=at(0).duration;
  assert.equal(at(0).travel,0);assert.equal(at(duration).travel,d);assert.equal(at(duration).velocity,0);
  const a=fast?.12:.20,c=(fast?.40:.68)+col*.075,b=fast?.34:.46;
  for(const t of [a,a+c,a+c+b]){
   assert.ok(Math.abs(at(t-1e-6).travel-at(t+1e-6).travel)<.02,'no positional seam');
   assert.ok(Math.abs(at(t-1e-6).velocity-at(t+1e-6).velocity)<.02,'no velocity jump');
  }
  let prev=0;for(let t=0;t<a+c+b;t+=1/240){const v=at(t);assert.ok(v.travel>=prev-1e-8,'main roll is downward');assert.ok(v.curve>=0&&v.curve<=1);prev=v.travel}
  assert.ok(at(a+c+b).travel>d,'controlled overshoot before settling');
 }
});
