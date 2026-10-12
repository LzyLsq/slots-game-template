import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleCaravanCatPose } from '../assets/scripts/vfx/CaravanCatPose';

let blinkFrames = 0, earFrames = 0;
const angles = { head: [Infinity, -Infinity], tail: [Infinity, -Infinity] };
for (let i = 0; i < 3600; i++) {
  const p = sampleCaravanCatPose(i / 60);
  for (const value of [p.chestX, p.chestY, p.headAngle, p.tailAngle, p.earAngle, p.tasselAngle]) assert(Number.isFinite(value));
  assert(p.chestX >= 1 && p.chestX <= 1.006001);
  assert(p.chestY >= 1 && p.chestY <= 1.017001);
  assert(Math.abs(p.headAngle) <= 4.6 && Math.abs(p.tailAngle) <= 14);
  assert(Math.abs(p.earAngle) <= 9.0001 && Math.abs(p.tasselAngle) <= 5.0001);
  blinkFrames += Number(p.blink); earFrames += Number(Math.abs(p.earAngle) > 1);
  angles.head[0] = Math.min(angles.head[0], p.headAngle); angles.head[1] = Math.max(angles.head[1], p.headAngle);
  angles.tail[0] = Math.min(angles.tail[0], p.tailAngle); angles.tail[1] = Math.max(angles.tail[1], p.tailAngle);
  assert.deepEqual(sampleCaravanCatPose(i, true), {chestX:1,chestY:1,headAngle:0,tailAngle:0,earAngle:0,tasselAngle:0,blink:false});
}
assert(blinkFrames > 80 && blinkFrames < 220);
assert(earFrames > 100 && earFrames < 500);
assert(angles.head[0] < -3.5 && angles.head[1] > 3.5 && angles.tail[0] < -13 && angles.tail[1] > 13);
const rig = readFileSync('assets/scripts/vfx/CaravanCatRig.ts','utf8');
assert(!/setInterval|setTimeout|repeatForever|TOUCH_|addComponent\(Material\)/.test(rig));
for (const evt of ['HIDE','SHOW']) {
  assert(rig.includes(`game.on(Game.EVENT_${evt}`)); assert(rig.includes(`game.off(Game.EVENT_${evt}`));
}
assert(rig.includes("removeEventListener?.('change'"));
assert(rig.includes('if (this.hidden || this.reduced) return;'));
const art = readFileSync('assets/scripts/ui/SalonArt.ts','utf8');
assert(art.includes("name === 'caravan-card-0' ? 'caravan-card-0-rig-bg'"));
assert(art.includes("} else ThemeMotion.attach(s,name,index)"));
const app = readFileSync('assets/scripts/ui/AureliaApp.ts','utf8');
assert(app.includes('if(i!==0)this.idleAccent(scene'));
console.log('PASS cat rig: independent motion, blink/twitch, reduced motion, fixed backdrop, event cleanup and no duplicated UV animation.');
