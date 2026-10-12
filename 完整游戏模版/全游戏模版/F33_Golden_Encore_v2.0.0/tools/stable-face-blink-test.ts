import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { KeeperSequence, MASCOT_ATLAS } from '../assets/scripts/ui/KeeperSequence';
import { CAST_ATLAS, castFrameCount } from '../assets/scripts/ui/CastArt';
import { HALL_KEEPER_PATCHES } from '../assets/scripts/ui/HallKeeperArt';
import { BlinkSequence, BLINK_ATLAS } from '../assets/scripts/ui/BlinkSequence';
import { BLINK_ART, blinkArt } from '../assets/scripts/ui/BlinkArt';
import { KEEPER_RIGS, type KeeperMode } from '../assets/scripts/ui/KeeperGesture';

const source = readFileSync('assets/scripts/ui/KeeperGestureView.ts', 'utf8');
const app = readFileSync('assets/scripts/ui/GoldenEncoreApp.ts', 'utf8');
for (const token of ['HallExpressionSequence', 'initializeExpression', 'expressionSprite', 'expressionTimeline', 'hallExpressionFrames']) {
  assert.ok(!source.includes(token) && !app.includes(token), `Retired facial system cannot be restored accidentally: ${token}`);
}
const artNames = readdirSync('assets/resources/art');
assert.ok(!artNames.some(name => name.includes('-expression.')), 'No retired full-face atlas shipped');
assert.equal(artNames.filter(name => /^blink-.*\.png$/.test(name)).length, 12, 'Twelve scene-specific eye atlases retained');
for (const item of Object.values(BLINK_ART).flat()) assert.ok(artNames.includes(`${item.art}.png`));
const provenance = JSON.parse(readFileSync('docs/ART_PROVENANCE.json', 'utf8'));
assert.ok(!provenance.assets.some((a: { asset: string }) => a.asset.endsWith('-expression.png')), 'No retired face records');
assert.equal(provenance.assets.filter((a: { asset: string }) => a.asset.startsWith('blink-')).length, 12);
assert.ok(app.includes('this.loadBlink(') && app.includes('initializeBlink('), 'Eye frames are loaded and actually attached');

class Transform {
  contentSize = { width: 0, height: 0 };
  setAnchorPoint() {}
  setContentSize(width: number, height: number) { this.contentSize = { width, height }; }
}
class Sprite { node!: TestNode; static SizeMode = { CUSTOM: 1 }; sizeMode = 1; spriteFrame?: { index: number }; }
class TestNode {
  layer = 1; children: TestNode[] = []; parent?: TestNode; components: unknown[] = [];
  constructor(public name: string) {}
  setParent(parent: TestNode) { this.parent = parent; parent.children.push(this); }
  position = { x: 0, y: 0, z: 0 };
  setPosition(x: number, y: number, z: number) { this.position = { x, y, z }; }
  addComponent(type: new () => unknown) { const c = new type(); Object.assign(c as object, { node: this }); this.components.push(c); return c; }
  getComponent(type: new () => unknown) { return this.components.find(c => c instanceof type); }
}
const listeners = new Set<unknown>();
const cc = {
  _decorator: { ccclass: () => (ctor: unknown) => ctor }, Component: class {}, Node: TestNode,
  UITransform: Transform, Sprite, Game: { EVENT_HIDE: 'hide', EVENT_SHOW: 'show' },
  game: { on(_event: string, callback: unknown) { listeners.add(callback); }, off(_event: string, callback: unknown) { listeners.delete(callback); } },
};
const module = { exports: {} as Record<string, any> };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, experimentalDecorators: true } }).outputText, {
  exports: module.exports, module,
  require(name: string) {
    if (name === 'cc') return cc;
    if (name === './KeeperSequence') return { KeeperSequence, MASCOT_ATLAS };
    if (name === './CastArt') return { CAST_ATLAS };
    if (name === './BlinkSequence') return { BlinkSequence };
    throw new Error(`Unexpected runtime import ${name}`);
  },
});
const View = module.exports.KeeperGestureView;
for (const scene of ['hall', 'cabinet', 'prize', 'loading'] as const) for (let m = 0; m < 4; m++) {
  const mode = m as KeeperMode;
  for (const reduced of [false, true]) {
    const v = new View(); v.node = new TestNode('Generated scene');
    const count = scene === 'hall' || scene === 'loading' ? 64 : castFrameCount(scene);
    const frames = Array.from({ length: count }, (_, index) => ({ index }));
    if (scene === 'hall') v.initializeScenePatch(frames, mode, reduced, HALL_KEEPER_PATCHES[mode], .4);
    else v.initialize(frames, scene, mode, reduced, scene === 'loading' ? KEEPER_RIGS.hall[mode].bounds : KEEPER_RIGS[scene][mode].bounds, .4);
    const eyes = Array.from({ length: BLINK_ATLAS.frames }, (_, index) => ({ index }));
    const eyeClock = scene === 'loading' ? undefined : new BlinkSequence(scene, mode, reduced);
    if (scene !== 'loading') {
      const rect = blinkArt(scene, mode).rect;
      v.initializeBlink(eyes, scene, mode, reduced, rect, .4);
      const [x, y, width, height] = rect;
      const hall = scene === 'hall';
      assert.equal(v.blinkSprite.node.parent, hall ? v.node : v.sprite.node, 'Eye patch shares the source transform');
      const unit = hall ? .4 : v.sprite.node.getComponent(Transform).contentSize.width / CAST_ATLAS.width;
      assert.equal(v.blinkSprite.node.getComponent(Transform).contentSize.width, width * unit);
      assert.equal(v.blinkSprite.node.getComponent(Transform).contentSize.height, height * unit);
      assert.equal(v.blinkSprite.node.position.x, (x + width / 2 - (hall ? 512 : CAST_ATLAS.width / 2)) * unit);
      assert.equal(v.blinkSprite.node.position.y, (hall ? 768 - y - height / 2 : CAST_ATLAS.height - y - height / 2) * unit);
    } else {
      assert.equal(v.blinkSprite, undefined, 'Loading keeps its original single mascot atlas');
    }
    const armNode = v.sprite.node;
    const armPosition = { ...armNode.position };
    const armSize = { ...armNode.getComponent(Transform).contentSize };
    const eyePosition = v.blinkSprite ? { ...v.blinkSprite.node.position } : undefined;
    const blinkSeen = new Set<number>();
    const seen = new Set<number>();
    for (const cue of ['greet', 'spin', 'ordinary', 'big', 'super']) {
      v.cue(cue);
      for (let i = 0; i < 200; i++) {
        v.update(1 / 60); seen.add(v.current);
        assert.equal(v.sprite.spriteFrame, frames[v.current], 'Actual view displays its cached arm frame');
        assert.equal(v.node.children.length, scene === 'hall' ? 2 : 1);
        assert.equal(armNode.children.length, scene === 'cabinet' || scene === 'prize' ? 1 : 0);
        assert.deepEqual(armNode.position, armPosition); assert.deepEqual(armNode.getComponent(Transform).contentSize, armSize);
        assert.equal(v.expressionTimeline, undefined); assert.equal(v.expressionSprite, undefined);
        if (eyeClock) {
          assert.equal(v.blinkCurrent, eyeClock.step(1 / 60), 'Greeting/prize cues do not reset or morph the face');
          assert.equal(v.blinkSprite.spriteFrame, eyes[v.blinkCurrent], 'Actual view displays its cached eye frame');
          assert.deepEqual(v.blinkSprite.node.position, eyePosition, 'No eye translation or whole-picture swelling');
          blinkSeen.add(v.blinkCurrent);
        }
      }
    }
    if (reduced) assert.equal(seen.size, 1);
    else assert.ok(seen.size >= 32, 'Removing face motion must not freeze the friendly arm');
    if (eyeClock) assert.equal(blinkSeen.size, reduced ? 1 : BLINK_ATLAS.frames, 'Relaxed independent blink plays every cached eye frame');
    const held = v.current; const heldEye = v.blinkCurrent;
    const assertHeld = () => { assert.equal(v.current, held); assert.equal(v.blinkCurrent, heldEye); };
    v.setPresentationHidden(true); v.cue('super'); v.update(10); assertHeld();
    v.setPresentationHidden(false); v.onHide(); v.update(10); assertHeld();
    v.onShow(); v.onDisable(); v.update(10); assertHeld();
    v.onEnable(); v.update(1 / 60);
    v.onDestroy(); assert.equal(v.blinkFrames.length, 0); assert.equal(v.blinkTimeline, undefined); assert.equal(v.blinkSprite, undefined); assert.equal(listeners.size, 0, 'All hide/show listeners cleaned up');
  }
}
console.log('PASS gentle independent blinks in four halls/cabinets/prize stages; no full-face/mouth morphs; fixed source registration, preserved arm gestures, pause, reduced motion and cleanup');
