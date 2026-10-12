import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {reelTravel,reelVelocity,brakeVelocity,reelBlurred,reelCellVisible} from '../assets/scripts/reels/ReelMotion';
import {responsiveCabinet,reelAperture} from '../assets/scripts/ui/CabinetGeometry';

assert.equal(reelBlurred(.67,false),false);
assert.equal(reelBlurred(.69,false),true);
assert.equal(reelBlurred(.55,true),true);
assert.equal(reelBlurred(.44,true),false);
assert.equal(reelBlurred(1,true,true),false);
assert.equal(reelBlurred(1,true,false,true),false);
assert.equal(reelBlurred(NaN,true),false);
let blurred=true;
for(const speed of [.67,.69,.66,.68,.67]){blurred=reelBlurred(speed,blurred);assert(blurred,'near-cruise jitter cannot alternate atlases');}
blurred=false;
for(const speed of [.43,.45,.44,.46,.42]){blurred=reelBlurred(speed,blurred);assert(!blurred,'braking jitter cannot re-enter blur');}

// The real normal and quick stop trajectories switch once on acceleration and
// once on braking, returning to crisp art well before the landing spring.
for(const hz of [30,60,90,120])for(const quick of [false,true])for(let c=0;c<5;c++){
  const speed=16,ramp=.32,duration=.78,brake=(quick?.44:.94)+c*.14;
  const start=reelTravel(brake,speed,ramp),end=Math.ceil(start+speed*duration*.5)+.035;
  let state=false,switches=0,restoredAt=Infinity;
  for(let t=0;t<brake+duration+.24;t+=1/hz){
    const v=t<brake?reelVelocity(t,speed,ramp):brakeVelocity((t-brake)/duration,start,end,speed,duration);
    const next=reelBlurred(Math.min(1,Math.max(0,v/speed)),state,t>=brake+duration);
    if(next!==state){switches++;if(!next)restoredAt=t;}
    state=next;
  }
  assert.equal(switches,2);assert(!state);assert(restoredAt<brake+duration-.05);
}

// Cull only beyond the full rotated sprite, never by its centre. Validate the
// aperture for every theme and every strip phase, including the entry spring.
let samples=0,minSaved=Infinity;
for(const cfg of GAME_CONFIGS){
  const box=reelAperture(responsiveCabinet(cfg.id,1080,2337),cfg.id);
  const cellH=box[3]/cfg.rows,cellW=box[2]/cfg.columns,size=Math.min(cellW,cellH)*.91;
  for(let step=0;step<=600;step++){
    const fraction=step/600;let active=0;
    for(let row=-2;row<cfg.rows+2;row++){
      const y=box[3]/2-(row+fraction+.5)*cellH;
      const visible=reelCellVisible(y,box[3],size,.992,1.032);if(visible)active++;
      for(const angle of [0,.08,-.08,Math.PI/4]){
        const radius=size*.5*(Math.abs(Math.sin(angle))*.992+Math.abs(Math.cos(angle))*1.032);
        if(Math.abs(y)<=box[3]/2+radius)assert(visible,'intersecting art must survive culling');
      }
      samples++;
    }
    minSaved=Math.min(minSaved,cfg.rows+4-active);assert(active>=cfg.rows,'no hole in the visible strip');
  }
  for(let row=0;row<cfg.rows;row++){
    const y=box[3]/2-(row+.5)*cellH;
    for(const offset of [-cellH*.10,0,cellH*.10])assert(reelCellVisible(y+offset,box[3],size,1.085,1.085));
  }
}
assert(minSaved>=2,'at least two full buffer sprites per column are not submitted');
const source=readFileSync('assets/scripts/reels/SalonReels.ts','utf8');
assert(source.includes('this.draw(c,col.blurred,motion)'),'runtime uses per-column blur state');
assert(source.includes('blurred?this.blur[id]:this.sharp[id]'),'runtime selects the loaded blur atlas');
assert(source.includes('if(!visible)continue'),'hidden buffers skip sprite and transform work');
console.log(`PASS reel presentation: blur hysteresis, 40 motion curves, ${samples} crop samples, >=${minSaved} culled buffers/column`);
