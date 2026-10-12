import assert from 'node:assert/strict';
import { BlinkSequence, BLINK_ATLAS } from '../assets/scripts/ui/BlinkSequence';
import { BLINK_ART } from '../assets/scripts/ui/BlinkArt';
const phases = new Set<number>();
for (const scene of ['hall', 'cabinet', 'prize'] as const) for (const mode of [0,1,2,3]) {
  const t = new BlinkSequence(scene, mode); let blinks=0, prev=0, last=-1000, first=-1;
  for(let i=0;i<60*35;i++) {
    const f=t.step(1/60); assert.ok(f>=0&&f<20); assert.ok(f===0||f-prev<=1);
    if(f===1&&prev===0){ assert.ok(i-last>60*3.7); last=i;blinks++; if(first<0)first=i; }
    phases.add(f);prev=f;
  }
  assert.ok(blinks>=5&&blinks<=8);assert.ok(first/60>=t.initialRestSeconds);
  const rect=BLINK_ART[scene][mode].rect;assert.ok(rect[2]<120&&rect[3]<80,'small eye patch, not whole face');
  const paused=new BlinkSequence(scene,mode);while(paused.frame<7)paused.step(1/60);
  const held=paused.frame;paused.suspend();for(let i=0;i<900;i++)assert.equal(paused.step(.05),held);
  paused.resume();assert.ok(paused.step(1/60)>=held,'resume held pose, no reset');
  const reduced=new BlinkSequence(scene,mode,true);for(let i=0;i<900;i++)assert.equal(reduced.step(.05),0);
  for(const dt of [NaN,Infinity,-1]) assert.equal(paused.step(dt),paused.frame);
}
assert.equal(phases.size,BLINK_ATLAS.frames);assert.equal(BLINK_ATLAS.frames/BLINK_ATLAS.fps,2/3);
assert.ok(new BlinkSequence('hall',0).initialRestSeconds!==new BlinkSequence('hall',3).initialRestSeconds);
console.log('PASS twelve independent relaxed eye timelines: staggered rests, all 20 cached frames, bounded dt, held hide/overlay poses and reduced motion');
