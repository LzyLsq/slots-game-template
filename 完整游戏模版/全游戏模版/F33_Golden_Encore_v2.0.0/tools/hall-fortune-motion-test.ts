import assert from 'node:assert/strict';
import { HallFortuneMotion, HallMode, HALL_FORTUNE_GEOMETRY } from '../assets/scripts/ui/HallFortuneMotion';
import { KEEPER_RIGS } from '../assets/scripts/ui/KeeperGesture';
const near = (a: number, b: number, epsilon = 1e-8): void => assert.ok(Math.abs(a - b) < epsilon, `${a} ≈ ${b}`);
const rooms = [0, 1, 2, 3] as HallMode[];
const read = (m: HallFortuneMotion): string => JSON.stringify(m.poses);
let samples = 0, visibleCoins = 0, bounces = 0;
const bounds = (m: HallFortuneMotion): void => {
  m.poses.forEach((p, i) => {
    for (const value of [p.scaleX, p.scaleY, p.angle, p.light, p.lightScaleX]) assert.ok(Number.isFinite(value));
    assert.ok(p.scaleX >= .90 && p.scaleX <= 1.11);
    assert.ok(p.scaleY >= .85 && p.scaleY <= 1.07);
    assert.ok(Math.abs(p.angle) <= 2.1);
    assert.ok(p.light >= 0 && p.light <= 240);
    assert.equal(p.coins.length, 3);
    if (p.scaleY > 1.025) bounces++;
    for (const c of p.coins) if (c.opacity > .01) {
      visibleCoins++;
      assert.ok(c.opacity <= 240);
      assert.ok(Math.abs(c.x) <= 92.01 && c.y >= 24 && c.y <= 64.01);
      const radius = Math.hypot(HALL_FORTUNE_GEOMETRY.coinSize, HALL_FORTUNE_GEOMETRY.coinSize) / 2 * c.scaleY;
      // Registered to the existing mode's baseline; coins clear the live name.
      assert.ok(c.y - 2.5 - radius > -43, 'Coins stay above the fixed name');
      assert.ok(Math.abs(c.x) + radius < 111, 'Coins stay inside their own touch exhibit');
      for (const [w, h] of [[320, 568], [390, 844], [430, 932]]) {
        const s = Math.max(1, h / w * 1024 / 1536);
        const px = 250 + i * 175 + c.x / s;
        const py = 1100 - (c.y - 2.5) / s;
        for (const rig of KEEPER_RIGS.hall) {
          assert.ok(py - radius / s > rig.bounds[3] + 12 || px + radius / s < rig.bounds[0] || px - radius / s > rig.bounds[2], 'Pooled coin clears every hero during crossfades');
        }
      }
    }
  });
  samples++;
};
for (const mode of rooms) {
  const m = new HallFortuneMotion(mode);
  const poses = m.poses, firstCoin = m.poses[0].coins[0];
  m.select(mode);
  near(m.poses[mode].scaleY, .86);
  for (let frame = 0; frame < 3600; frame++) { m.step(1 / 60); bounds(m); }
  assert.equal(m.poses, poses); assert.equal(m.poses[0].coins[0], firstCoin, 'Pose storage is pooled');
  m.press(mode);
  for (let frame = 0; frame < 600; frame++) m.step(1 / 60);
  near(m.poses[mode].scaleY, .905);
  assert.ok(m.poses.every(p => p.coins.every(c => c.opacity === 0)), 'Long hold cannot emit ambient coins');
  m.release(mode);
  for (let frame = 0; frame < 100; frame++) { m.step(1 / 60); bounds(m); }
  near(m.poses[mode].scaleY, 1, .001);
  m.suspend(); const suspended = read(m);
  for (let frame = 0; frame < 100; frame++) { m.select((mode + 1) % 4 as HallMode); m.press(mode); m.step(100); }
  assert.equal(read(m), suspended, 'Background cannot queue gestures or effects');
  m.resume();
  assert.ok(m.poses.every(p => p.scaleX === 1 && p.scaleY === 1 && p.angle === 0 && p.coins.every(c => c.opacity === 0)));
  m.step(Number.NaN); m.step(Number.POSITIVE_INFINITY); m.step(-1); bounds(m);
}
const fast = new HallFortuneMotion(0);
for (let i = 0; i < 2400; i++) { fast.select(i % 4 as HallMode, i % 2 ? -1 : 1); fast.step(1 / 120); bounds(fast); }
assert.equal(fast.poses.reduce((n, p) => n + p.coins.length, 0), 12, 'Rapid swipes keep a fixed 12-coin pool');
for (const mode of rooms) {
  const a = new HallFortuneMotion(mode), b = new HallFortuneMotion(mode);
  a.select(mode); b.select(mode);
  for (let f = 0; f < 30; f++) a.step(1 / 30);
  for (let f = 0; f < 120; f++) b.step(1 / 120);
  near(a.poses[mode].scaleY, b.poses[mode].scaleY);
  const reduced = new HallFortuneMotion(mode, true);
  reduced.select(mode); const baseline = read(reduced);
  for (let f = 0; f < 100; f++) { reduced.press(mode); reduced.release(mode); reduced.step(1); }
  assert.equal(read(reduced), baseline, 'Reduced motion has no jelly or coin flight');
  assert.ok(reduced.poses.every(p => p.scaleX === 1 && p.scaleY === 1 && p.angle === 0 && p.coins.every(c => c.opacity === 0)));
  assert.equal(reduced.poses[mode].light, 90, 'Reduced motion retains a static selected reflection');
}
assert.ok(visibleCoins > 500 && bounces > 100, 'Actual recoil and fortune arcs are exercised');
console.log(`PASS hall jelly: ${samples} bounded samples, ${visibleCoins} visible coin poses, four personalities, rapid swipe, press/cancel, reduced motion and hide/show`);
