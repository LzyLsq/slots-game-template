import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ReelTrajectory, type ReelSample } from '../assets/scripts/motion/ReelTrajectory';
import { PressIntent } from '../assets/scripts/motion/PressIntent';
import { cabinetLayout, cells } from '../assets/scripts/core/Layout';

const sample = (): ReelSample => ({ offset: 0, velocity: 0, phase: 'pull' });
test('motion has continuous position and velocity across every phase join', () => {
  for (const turbo of [false, true]) for (let c = 0; c < 5; c++) {
    const motion = new ReelTrajectory(c, turbo), a = sample(), b = sample();
    const joins = [motion.pullDuration, motion.accelerationDuration, motion.cruiseDuration, motion.decelerationDuration, motion.settleDuration];
    let t = 0;
    for (const span of joins) {
      t += span; motion.sample(t - 1e-7, a); motion.sample(t + 1e-7, b);
      assert.ok(Math.abs(a.offset - b.offset) < 1e-4);
      assert.ok(Math.abs(a.velocity - b.velocity) < 1e-3);
    }
  }
});
test('all frame rates end exactly on integer cell positions with left-to-right stops', () => {
  for (const turbo of [false, true]) {
    let previous = 0;
    for (let c = 0; c < 5; c++) {
      const motion = new ReelTrajectory(c, turbo);
      assert.ok(motion.duration > previous); previous = motion.duration;
      for (const fps of [24, 30, 60, 90, 120, 144]) {
        const out = sample();
        for (let t = 0; t < motion.duration; t += 1 / fps) {
          motion.sample(t, out); assert.ok(Number.isFinite(out.offset));
        }
        motion.sample(motion.duration + 1 / fps, out);
        assert.equal(out.offset, motion.target); assert.equal(out.velocity, 0); assert.equal(out.phase, 'complete');
      }
    }
  }
});
test('press cancels drags, ignores second pointer, activates only once', () => {
  const p = new PressIntent(() => ({ left: 0, top: 0, right: 100, bottom: 100 }));
  assert.ok(p.down(1, 50, 50)); assert.equal(p.down(2, 50, 50), false);
  assert.equal(p.up(2, 50, 50), false); assert.ok(p.up(1, 50, 50));
  assert.equal(p.up(1, 50, 50), false);
  p.down(1, 20, 20); p.move(1, 80, 20); assert.equal(p.up(1, 20, 20), false);
  p.down(1, 50, 50); p.cancel(); assert.equal(p.up(1, 50, 50), false);
});
test('container-relative reel bounds and scene cover across 24 viewport/safe-area combinations', () => {
  for (const [width, height] of [[320, 568], [375, 667], [390, 844], [414, 896], [430, 932], [768, 1024], [896, 414], [1024, 768]]) {
    for (const [top, bottom] of [[0, 0], [47, 34], [59, 34]]) {
      const layout = cabinetLayout({ width: width!, height: height! }, { top: top!, bottom: bottom!, left: 0, right: 0 });
      assert.ok(layout.scene.width >= width! - 1e-6 && layout.scene.height >= height! - 1e-6);
      assert.ok(layout.content.y >= top! - 1e-6);
      assert.ok(layout.controls.y + layout.controls.height <= height! - bottom! + 1e-6);
      for (const [cols, rows] of [[3, 3], [5, 3], [5, 5]]) for (const cell of cells(layout.screen, cols!, rows!)) {
        assert.ok(cell.x >= layout.screen.x && cell.y >= layout.screen.y);
        assert.ok(cell.x + cell.width <= layout.screen.x + layout.screen.width + 1e-6);
        assert.ok(cell.y + cell.height <= layout.screen.y + layout.screen.height + 1e-6);
      }
    }
  }
});
