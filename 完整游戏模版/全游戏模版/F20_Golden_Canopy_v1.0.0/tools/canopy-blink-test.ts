import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CANOPY_BLINKS} from '../assets/scripts/vfx/CanopyBlinkData';

assert.equal(CANOPY_BLINKS.length,7);
assert.deepEqual(CANOPY_BLINKS.filter(s=>s.art==='canopy-destinations').map(s=>s.index),[0,1,2,3]);
assert.deepEqual(CANOPY_BLINKS.filter(s=>s.index===-1).map(s=>s.art),['golden-hour-tall','jade-treasury-tall','ruby-revel-tall']);
assert(!CANOPY_BLINKS.some(s=>s.art==='pearl-palace-tall'),'Already closed cabinet eyes must not receive fake blinks');
const regions:number[][]=[];
for(const spec of CANOPY_BLINKS){
 assert.equal(spec.eyes.length,2);
 for(const eye of spec.eyes){
  const [x,y,w,h]=eye.rect;
  assert(x>=0&&y>=0&&x+w<=spec.canvas[0]&&y+h<=spec.canvas[1],'Eyelid outside original painting');
  assert(w<128&&h<128,'Overlay no longer confined to a local eye');
  assert.equal(eye.frames.length,2);
  for(const frame of eye.frames){
   assert.equal(frame[2],w);assert.equal(frame[3],h);
   assert(frame[0]>=2&&frame[1]>=2&&frame[0]+w<=1024&&frame[1]+h<=512);
   assert(!regions.some(([a,b,c,d])=>frame[0]<a+c&&frame[0]+w>a&&frame[1]<b+d&&frame[1]+h>b),'Packed eyelids overlap');
   regions.push([...frame]);
  }
 }
}
const art=readFileSync('assets/scripts/ui/SalonArt.ts','utf8');
assert(art.includes('resources.load(`art/${name}/texture`'));
assert(!/LivingMascotRig|FullBodyMascotRig|ArticulatedMascot/.test(art));
const app=readFileSync('assets/scripts/ui/AureliaApp.ts','utf8');
assert(app.includes("return [id+'-tall'];"));
assert(!app.includes('Mascot foot pivot'));assert(!app.includes("cfg.id+'-animal'"));
assert(app.includes("'Reels',this.config.id+'-tall'"),'Win presentation hides intact cabinet painting');
const rig=readFileSync('assets/scripts/vfx/CanopyBlinkRig.ts','utf8');
assert(rig.includes('game.off(Game.EVENT_HIDE'));
assert(rig.includes('game.off(Game.EVENT_SHOW'));
assert(rig.includes("removeEventListener?.('change'"));
assert(!/Articulated|setBones|customMaterial|tween\(/.test(rig));
console.log('PASS: F20 seven blinkable portraits, fourteen eyes, atlas bounds and stationary original-art policy');
