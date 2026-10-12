import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { KeeperSequence, MASCOT_ATLAS, MASCOT_FPS, type MascotScene } from '../assets/scripts/ui/KeeperSequence';
import { CAST_ATLAS, CABINET_CAST_ART, PRIZE_CAST_ART, castBank, castFrameCount } from '../assets/scripts/ui/CastArt';
import { KEEPER_RIGS, type KeeperMode, type KeeperCue } from '../assets/scripts/ui/KeeperGesture';
for (const scene of ['hall', 'cabinet', 'prize', 'loading'] as MascotScene[]) for (let mode = 0; mode < 4; mode++) {
 for (const cue of ['greet','spin','ordinary','big','super'] as KeeperCue[]) {
  const s = new KeeperSequence(scene, mode as KeeperMode); s.cue(cue);
  const role = scene === 'cabinet' || scene === 'prize', count = role ? CAST_ATLAS.bankFrames : MASCOT_ATLAS.frames;
  const offset = role ? castBank(scene,cue)*count : 0;
  const seen = new Set<number>([s.frame]); let last = s.frame;
  for(let i=0;i<count*2+3;i++) {
   const f=s.step(1/60); seen.add(f);
   assert.ok(f===0 || f>=offset&&f<offset+count,'Within this cue’s actual bank');
   assert.ok(f===0 || f>=last,'No reverse playback or mid-action reset');
   if(i%11===0&&f>0){s.cue(cue);assert.equal(s.frame,f,'Repeated cue never resets a wrist');}
   last=f;
  }
  for(let i=offset;i<offset+count;i++)assert.ok(seen.has(i),'Every closely spaced frame plays');
  const held=s.frame;s.suspend();s.cue('super');assert.equal(s.step(100),held);
  s.resume();const next=s.step(100);assert.ok(next===0||Math.abs(next-held)<=2,'Clamped resume dt');
  const stable=s.frame;assert.equal(s.step(NaN),stable);assert.equal(s.step(-1),stable);
 }
 const reduced=new KeeperSequence(scene,mode as KeeperMode,true);
 for(let i=0;i<100;i++){reduced.cue('super');assert.equal(reduced.step(.1),0);}
 const idle=new KeeperSequence(scene,mode as KeeperMode);let t=0;
 while(t+.01<idle.initialRestSeconds){assert.equal(idle.step(.01),0);t+=.01;}
}
for(const scene of ['cabinet','prize'] as const){
 const s=new KeeperSequence(scene,0);s.cue('greet');s.step(.05);const held=s.frame;
 s.cue('spin');s.cue('big');s.cue('super');s.cue('greet');assert.equal(s.frame,held);
 for(let i=0;i<96;i++)s.step(1/60);
 assert.equal(s.action,'super','One priority slot waits for a neutral seam');
 assert.ok(s.frame>=castBank(scene,'super')*CAST_ATLAS.bankFrames);
}
assert.equal(MASCOT_FPS,30);assert.equal(CAST_ATLAS.fps,30);
assert.ok(new KeeperSequence('hall',0).restSeconds<2,'Visible action is not separated by long static waits');
assert.ok(new KeeperSequence('cabinet',0).restSeconds<2);
const art=[...CABINET_CAST_ART,...PRIZE_CAST_ART];assert.equal(new Set(art).size,8);
const hashes=art.map(name=>createHash('sha256').update(readFileSync(`assets/resources/art/${name}.png`)).digest('hex'));
assert.equal(new Set(hashes).size,8,'Not renamed copies of a shared pet');
for(const scene of ['cabinet','prize'] as const)for(const name of scene==='cabinet'?CABINET_CAST_ART:PRIZE_CAST_ART){
 const png=readFileSync(`assets/resources/art/${name}.png`);
 assert.equal(png.readUInt32BE(16),8*(CAST_ATLAS.width+4));assert.equal(png.readUInt32BE(20),castFrameCount(scene)/8*(CAST_ATLAS.height+4));assert.equal(png[25],6);
}
for(const rigs of Object.values(KEEPER_RIGS))for(const r of rigs){assert.ok(r.bounds[0]<r.bounds[2]&&r.bounds[1]<r.bounds[3]);assert.ok(r.bounds[0]>=0&&r.bounds[2]<=1024&&r.bounds[1]>=0&&r.bounds[3]<=1536);}
const app=readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8'),view=readFileSync('assets/scripts/ui/KeeperGestureView.ts','utf8');
const tap=app.slice(app.indexOf('private keeperInteraction('),app.indexOf('/** Animate generated treasure currents *inside*'));
assert.ok(tap.includes("this.cueKeeper('greet')"));assert.ok(!tap.includes('this.spin(')&&!tap.includes('reserveSpin(')&&!tap.includes('this.save.coins'));
assert.ok(!app.includes('keeperEffect')&&!view.includes('customMaterial')&&!view.includes('setScale('));
assert.ok(view.includes('game.off(Game.EVENT_HIDE')&&view.includes('game.off(Game.EVENT_SHOW'));
assert.ok(app.includes('frame.destroy()')&&view.includes('this.frames[index]'));
console.log('PASS independent role casts: 8 generated characters, 20 action banks, ordered cached frames, visible cadence, neutral-seam priority, pause/reduced lifecycle, no scene warp or tap-to-spin');
