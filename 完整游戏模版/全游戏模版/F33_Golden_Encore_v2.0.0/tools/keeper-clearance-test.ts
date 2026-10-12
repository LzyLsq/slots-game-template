import { cabinetViewport } from '../assets/scripts/ui/CabinetViewport';
import { PRIZE_STAGES } from '../assets/scripts/ui/ThemeArt';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CABINET_SUBTITLE, CABINET_METER_Y, CABINET_TITLE_SLOTS, HALL_BACKLIGHTS, HALL_EXHIBIT_GLINTS, HALL_INLAY_GLINTS, HALL_SCENE_LIGHTS,
  offeringPose, OfferingPose, protectionOpacity, PRIZE_KEEPER_RECTS, SUPER_PRIZE_LAYOUT, SUPER_HEADLINE_ENTRANCE, BIG_PRIZE_CLAIM_Y, ClearRect, Fixture } from '../assets/scripts/ui/KeeperClearance';
import { KEEPER_RIGS, KeeperGesture, KeeperMode, KeeperScene } from '../assets/scripts/ui/KeeperGesture';
const rect = ([x, y, w, h]: Fixture, dx = 0, dy = 0): ClearRect => [x - w / 2 - dx, y - h / 2 - dy, x + w / 2 + dx, y + h / 2 + dy];
const disjoint = (a: ClearRect, b: ClearRect, margin = 12): boolean => a[2] + margin <= b[0] || a[0] - margin >= b[2] || a[3] + margin <= b[1] || a[1] - margin >= b[3];
for (let mode = 0; mode < 4; mode++) {
  const keeper = KEEPER_RIGS.cabinet[mode].bounds;
  assert.ok(disjoint(rect(CABINET_TITLE_SLOTS[mode], 0, 1.7), keeper), `Wordmark clears full moving rig ${mode}`);
  assert.ok(disjoint(rect([CABINET_SUBTITLE[0], CABINET_SUBTITLE[1], CABINET_SUBTITLE[2], 42]), keeper), `Subtitle clears ears/face/paws ${mode}`);
  for (const [w, h] of [[320, 568], [375, 812], [390, 844], [430, 932], [739, 766], [1024, 768], [1280, 720]]) {
    const sourceScale = cabinetViewport(w, h).scale;
    const visibleLeft = 512 - w / (2 * sourceScale), visibleRight = 512 + w / (2 * sourceScale);
    const title = rect(CABINET_TITLE_SLOTS[mode]);
    assert.ok(keeper[0] > visibleLeft && keeper[2] < visibleRight, `Full animated cabinet mascot remains visible ${w}x${h}/${mode}`);
    assert.ok(title[0] > visibleLeft && title[2] < visibleRight, `Complete wordmark remains visible ${w}x${h}/${mode}`);
    const logicalScale = sourceScale / Math.min(w / 1024, h / 1800);
    assert.ok(CABINET_SUBTITLE[1] + 21 + 12 < CABINET_METER_Y - 38 / logicalScale,
      'Feature meter plaques clear the subtitle even on short screens');
    assert.ok(CABINET_METER_Y + 38 / logicalScale + 12 < 462, 'Feature plaques stay above the reel aperture');
  }
}
const fixtures: ClearRect[] = [
  ...HALL_BACKLIGHTS.map(r => rect(r)),
  ...HALL_SCENE_LIGHTS.map(r => rect(r, 12, 5)),
  ...HALL_INLAY_GLINTS.map(r => rect(r, 7, 3)),
  ...HALL_EXHIBIT_GLINTS.map(([x, y, w, h]): ClearRect => {
    const radius = Math.hypot(w, h) / 2;
    return [x - radius - 7, y - radius - 22, x + radius + 7, y + radius];
  }),
];
for (const fixture of fixtures) for (const rig of KEEPER_RIGS.hall) assert.ok(disjoint(fixture, rig.bounds), `Hall reflection clears all crossfade keepers: ${fixture}`);
for (const scene of ['hall', 'cabinet', 'prize'] as KeeperScene[]) for (let mode = 0; mode < 4; mode++) {
  const g = new KeeperGesture(scene, mode as KeeperMode);
  const out: OfferingPose = { x: 0, y: 0, opacity: 0, squeeze: 1, shrink: 1, angle: 0 }; let visible = 0;
  for (let f = 0; f < 180; f++) {
    const p = g.step(1 / 60);
    for (let i = 0; i < 3; i++) {
      assert.equal(offeringPose(scene, mode as KeeperMode, p, i, out), out, 'No per-frame offering object allocation');
      assert.ok(out.opacity >= 0 && out.opacity <= 196);
      if (out.opacity > 1) {
        visible++;
        const radius = (22 + i * 3) * .71 * out.shrink;
        const face = g.rig.head;
        assert.ok(Math.hypot((out.x - face[0]) / (face[2] * .8 + radius + 8), (out.y - face[1]) / (face[3] * .76 + radius + 8)) > 1,
          `Coins cannot cross the keeper's protected face ${scene}/${mode}`);
      }
    }
  }
  assert.ok(visible > 15, `Retain visible generated offering coins ${scene}/${mode}`);
}
for (const rects of Object.values(PRIZE_KEEPER_RECTS)) for (const r of rects) {
  const x = (r[0] + r[2]) / 2, y = (r[1] + r[3]) / 2;
  assert.equal(protectionOpacity(rects, x, y, 25), 0);
  assert.equal(protectionOpacity(rects, r[0] - 24, y, 25), 0, 'Rotated coin extent cannot touch face/hand');
  assert.equal(protectionOpacity([r], r[0] - 75, y, 25), 1);
  const a = protectionOpacity([r], r[0] - 35, y, 25);
  assert.ok(a > 0 && a < 1, 'Soft approach/exit, not a hard particle pop');
}
// The new presentation has no independent zoom/pan: title, amount and claim
// are children of the backdrop. Validate every source-registered room layout
// for both BIG/SUPER; ordinary remains in the physical cabinet.
for (const [mode, stage] of PRIZE_STAGES.entries()) {
  const slots = [stage.title, stage.caption, stage.amount, [512, stage.claimY, 480, 94] as Fixture];
  const boxes = slots.map(slot => rect(slot));
  for (let i = 0; i < boxes.length; i++) {
    for (const keeper of stage.rects) assert.ok(disjoint(boxes[i], keeper, 8), `Room ${mode} copy ${i} clears keeper`);
    for (let j = i + 1; j < boxes.length; j++) assert.ok(disjoint(boxes[i], boxes[j], 4), `Room ${mode} copy ${i}/${j} does not overlap`);
  }
  for (const [w,h] of [[320,568],[390,844],[430,932]]) {
    const scale=Math.max(w/1024,h/1536); const left=512-w/(2*scale),right=512+w/(2*scale);
    const mascot = KEEPER_RIGS.prize[mode].bounds;
    assert.ok(mascot[0]>left && mascot[2]<right, `Full animated prize mascot fits ${w}x${h}/${mode}`);
    for (const box of boxes) assert.ok(box[0]>left && box[2]<right && box[1]>20 && box[3]<1516, `Room ${mode} all live copy fits ${w}x${h}`);
  }
}
const app = readFileSync('assets/scripts/ui/GoldenEncoreApp.ts', 'utf8');
assert.ok(app.includes('this.cabinetHeader(root, mode.id)'));
assert.ok(!app.includes("this.image(root, 'game-cabinet-crown'"), 'No redundant crest in subtitle/keeper band');
for (const [first,last] of [['private sparkleField(', 'private clearAmbientMotion('], ['private treasureFountains(', 'private countUp('], ['private coinRain(', 'private closeWin(']]) {
  const emitter = app.slice(app.indexOf(first), app.indexOf(last,app.indexOf(first)));
  assert.ok(emitter.includes('this.particleImage(') && !emitter.includes('this.image('), 'All emitted award coins/light respect the gate');
}
const view = readFileSync('assets/scripts/ui/KeeperClearanceView.ts','utf8');
assert.ok(view.includes('convertToNodeSpaceAR') && view.includes('entry.image.worldScale') && view.includes('p.gate.destroy()'));
assert.ok(app.includes('this.cabinetBackdrop, CABINET_WIN_CLEARANCE') && app.includes('position(CABINET_WIN_TITLE)') && app.includes("node(this.surface, `Win · ${tier} · cabinet`"), 'Same cabinet, protected source-registered celebration, no pasted tier scene');
assert.ok(!app.includes('crestY - SUPER_HEADLINE_ENTRANCE.below'), 'No independent sticker entrance');
console.log('PASS source-registered wordmarks/subtitles and hall reflections clear all moving keepers; visible pooled offerings avoid faces; award coins/rays have a soft transform-following opacity gate');
