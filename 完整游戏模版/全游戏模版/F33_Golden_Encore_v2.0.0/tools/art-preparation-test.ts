import assert from 'node:assert/strict';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { ArtPreparation } from '../assets/scripts/ui/ArtPreparation';
import { GAME_BACKDROPS, SHARED_CELEBRATION_ART, startupArt, roomCabinetArt, roomCelebrationArt } from '../assets/scripts/ui/ArtLoadingPlan';
import { BLINK_ART, blinkArt } from '../assets/scripts/ui/BlinkArt';
import { BLINK_ATLAS } from '../assets/scripts/ui/BlinkSequence';
import { CABINET_CAST_ART, PRIZE_CAST_ART, CAST_ATLAS, castFrameCount } from '../assets/scripts/ui/CastArt';
import { HALL_KEEPER_ART, HALL_KEEPER_ATLAS } from '../assets/scripts/ui/HallKeeperArt';
import { MASCOT_ART, MASCOT_ATLAS } from '../assets/scripts/ui/KeeperSequence';
import { TASK_GOLD_ART, TASK_GOLD_REFLECTION } from '../assets/scripts/ui/TaskGoldMotion';
import { PRIMARY_SYMBOL, PRIZE_STAGES, PRIZE_TITLES, REEL_ART } from '../assets/scripts/ui/ThemeArt';
import { MODE_ENTRY_THEMES } from '../assets/scripts/ui/ModeEntryLoading';
import { SYMBOLS } from '../assets/scripts/domain/VaultMath';

const source = readFileSync('assets/scripts/ui/GoldenEncoreApp.ts', 'utf8');
const tree = ts.createSourceFile('GoldenEncoreApp.ts', source, ts.ScriptTarget.Latest, true);
const app = tree.statements.find(s => ts.isClassDeclaration(s) && s.name?.text === 'GoldenEncoreApp') as ts.ClassDeclaration;
function method(name: string) {
  const member = app.members.find(m => ts.isMethodDeclaration(m) && m.name?.getText(tree) === name);
  assert.ok(member); return member.getText(tree);
}
function constant(name: string) {
  const member = tree.statements.find(s => ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(tree) === name));
  assert.ok(member); return member.getText(tree);
}
let allocations = 0;
class Frame {
  texture: unknown; rect: unknown; originalSize: unknown; offset: unknown; packable = false; destroyed = false;
  constructor() { allocations++; }
  destroy() { this.destroyed = true; }
}
class Texture {
  static Filter = { LINEAR: 'linear' }; filters = 0;
  setFilters() { this.filters++; }
}
class Rect { constructor(public x: number, public y: number, public width: number, public height: number) {} }
class Size { constructor(public width: number, public height: number) {} }
class Vec2 {}
const requests: string[] = [];
const held = new Map<string, (error: Error | null, texture?: Texture) => void>();
const failOnce = new Set<string>();
let holdArt = '';
const Harness = vm.runInNewContext(ts.transpileModule(`
${['MODES','PAGE_TITLE_ART','KEEPER_ART','HALL_HERO_ART','MODE_TITLE_ART'].map(constant).join('\n')}
class Harness {
  frames = new Map(); mascotFrames = new Map(); hallKeeperFrames = new Map(); blinkFrames = new Map();
  artPreparation = new ArtPreparation(); node = { isValid: true, off() {} };
  interactionAudio = { stopAll() {} }; rewardAudio = { stopAll() {} }; sceneMusic = { stopAll() {} }; machineAudio = { stopAll() {} };
  completeSurfaceTransition() {} settleCurrentRound() {} cancelSpin() {} clearWinTimeline() {} clearAmbientMotion() {} unscheduleAllCallbacks() {}
  ${['loadArt','loadMascot','loadHallKeeper','loadBlink','allArt','onDestroy'].map(method).join('\n')}
}
Harness;`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
  ArtPreparation, SpriteFrame: Frame, Texture2D: Texture, Rect, Size, Vec2,
  GAME_BACKDROPS, BLINK_ART, blinkArt, BLINK_ATLAS, CABINET_CAST_ART, PRIZE_CAST_ART,
  CAST_ATLAS, castFrameCount, HALL_KEEPER_ART, HALL_KEEPER_ATLAS, MASCOT_ART, MASCOT_ATLAS,
  TASK_GOLD_ART, TASK_GOLD_REFLECTION, PRIZE_STAGES, PRIZE_TITLES, REEL_ART, SYMBOLS,
  Game: {}, game: { off() {} }, view: { off() {} }, Node: { EventType: { TOUCH_START: 'touch' } },
  resources: { load(path: string, _kind: unknown, callback: (error: Error | null, texture?: Texture) => void) {
    const art = path.replace(/^art\//, '').replace(/\/texture$/, ''); requests.push(art);
    if (art === holdArt) { held.set(art, callback); return; }
    queueMicrotask(() => {
      if (failOnce.delete(art)) callback(new Error('Isolated missing image'));
      else callback(null, new Texture());
    });
  } },
});
const catalog: string[] = [...new Set(new Harness().allArt())];
const startup = startupArt(catalog);
if (process.argv.includes('--built')) {
  // Exercise the emitted Creator/Babel module as well as TypeScript. Creator's
  // loose Array-spread lowering is different from Node/tsx for Set iterables.
  const bundled = readFileSync('build/web-mobile/assets/main/index.js', 'utf8');
  const marker = 'System.register("chunks:///_virtual/ArtLoadingPlan.ts"';
  const start = bundled.indexOf(marker), end = bundled.indexOf('System.register(', start + marker.length);
  assert.ok(start >= 0 && end > start, 'Lifetime plan must be present in the emitted Web bundle');
  let factory: any, dependencyNames: string[] = [];
  vm.runInNewContext(bundled.slice(start, end), { System: { register(_name: string, deps: string[], declare: any) { factory = declare; dependencyNames = deps; } } });
  const exports: Record<string, any> = {};
  const declaration = factory((key: string | Record<string, unknown>, value: unknown) => {
    if (typeof key === 'string') exports[key] = value; else Object.assign(exports, key);
    return value;
  }, {});
  const deps: Record<string, unknown> = {
    './rollupPluginModLoBabelHelpers.js': { createForOfIteratorHelperLoose(items: unknown[]) { const iterator = items[Symbol.iterator](); return iterator.next.bind(iterator); } },
    cc: { cclegacy: { _RF: { push() {}, pop() {} } } }, './BlinkArt.ts': { BLINK_ART }, './CastArt.ts': { CABINET_CAST_ART, PRIZE_CAST_ART },
    './ModeEntryLoading.ts': { MODE_ENTRY_THEMES }, './ThemeArt.ts': { PRIZE_TITLES, REEL_ART, PRIZE_STAGES, PRIMARY_SYMBOL },
  };
  declaration.setters.forEach((setter: any, index: number) => { assert.ok(deps[dependencyNames[index]]); setter(deps[dependencyNames[index]]); }); declaration.execute();
  assert.deepEqual(Array.from(exports.startupArt(catalog)), startup, 'The actual shipped manifest must contain texture strings, never an opaque Set');
  for (const mode of [0,1,2,3] as const) {
    assert.deepEqual(Array.from(exports.roomCabinetArt(mode)), Array.from(roomCabinetArt(mode)));
    assert.deepEqual(Array.from(exports.roomCelebrationArt(mode)), Array.from(roomCelebrationArt(mode)));
  }
  console.log('PASS emitted Creator/Babel lifetime plan: identical boot and four-room manifests, no loose-Set spread regression');
}

assert.equal(startup.length, new Set(startup).size);
for (const name of startup) assert.ok(catalog.includes(name));
const required = ['login-foyer-v4','store','account','rank','rewards','rules','treasure-atlas',
  'button-gold','ui-wide-ticket','coin','ui-coin','fx-gilded-light','bet-plus-0', ...TASK_GOLD_ART, TASK_GOLD_REFLECTION,
  ...HALL_KEEPER_ART, ...BLINK_ART.hall.map(b => b.art),
  ...MODE_ENTRY_THEMES.flatMap(t => [t.scene,t.title,t.emblem]),
  ...REEL_ART.map((row, mode) => row[PRIMARY_SYMBOL[mode]])];
for (const name of required) assert.ok(startup.includes(name), `Missing eager hall/service/entry/reward art: ${name}`);
for (const mode of [0,1,2,3] as const) {
  for (const name of [...roomCabinetArt(mode), ...roomCelebrationArt(mode), CABINET_CAST_ART[mode],
    PRIZE_CAST_ART[mode], BLINK_ART.cabinet[mode].art, BLINK_ART.prize[mode].art]) {
    if (name !== 'bet-plus-0') assert.ok(!startup.includes(name), `Unentered room must not preload ${name}`);
    assert.ok(catalog.includes(name), `Deferred art must remain in the complete catalog: ${name}`);
  }
  // The first award must be fully prepared, not silently lose deluxe decoration.
  for (const name of SHARED_CELEBRATION_ART) assert.ok(roomCelebrationArt(mode).includes(name));
  for (let part = 0; part < 4; part++) assert.ok(roomCelebrationArt(mode).includes(`prize-ornament-${mode}-${part}`));
}
async function main() {
// Check direct generated-image calls in the real eager page renderers. A shared
// cabinet-looking face (e.g. the treasury + control) is still a hall dependency.
for (const name of ['homePage','loginPage','storePage','rewardsPage','rankPage','accountPage','rulesPage','atlasPage','ledgerPage']) {
  const member = app.members.find(m => ts.isMethodDeclaration(m) && m.name?.getText(tree) === name);
  assert.ok(member, `Missing production page renderer ${name}`);
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.kind === ts.SyntaxKind.ThisKeyword && ['image','particleImage','background'].includes(node.expression.name.text) &&
      node.arguments[1] && ts.isStringLiteral(node.arguments[1])) {
      assert.ok(startup.includes(node.arguments[1].text), `${name} references an unprepared startup image ${node.arguments[1].text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(member);
}
const service = new Harness();
await Promise.all(startup.map(art => service.loadArt(art)));
for (const name of required) assert.ok(service.frames.has(name));
assert.equal(service.mascotFrames.size, 0, 'Catalog loading never implicitly allocates cabinet atlases');
const selected = new Harness();
const before = allocations;
await Promise.all(Array.from({length: 20}, () => selected.loadArt('coin')));
assert.equal(requests.filter(name => name === 'coin').length, 2, 'One service owner plus one selected owner request');
assert.equal(allocations - before, 1, 'Concurrent consumers share a single generated base frame');
await selected.loadArt('coin'); assert.equal(allocations - before, 1, 'Completed cache does not decode again');

for (const [prepare, art, count] of [
  [() => selected.loadMascot(1,'cabinet'), CABINET_CAST_ART[1], castFrameCount('cabinet')],
  [() => selected.loadMascot(1,'prize'), PRIZE_CAST_ART[1], castFrameCount('prize')],
  [() => selected.loadMascot(0), MASCOT_ART[0], MASCOT_ATLAS.frames],
  [() => selected.loadHallKeeper(1), HALL_KEEPER_ART[1], HALL_KEEPER_ATLAS.frames],
  [() => selected.loadBlink(1,'hall'), BLINK_ART.hall[1].art, BLINK_ATLAS.frames],
] as const) {
  const start = allocations, loads = requests.filter(name => name === art).length;
  await Promise.all(Array.from({length: 20}, prepare));
  assert.equal(allocations - start, count + 1, `One texture and one sliced atlas for ${art}`);
  assert.equal(requests.filter(name => name === art).length - loads, 1);
  await prepare(); assert.equal(allocations - start, count + 1);
}
const retry = new Harness(); failOnce.add(CABINET_CAST_ART[2]);
const rejected = await Promise.allSettled([retry.loadMascot(2,'cabinet'), retry.loadMascot(2,'cabinet')]);
assert.ok(rejected.every(result => result.status === 'rejected'));
assert.equal(retry.frames.size, 0); assert.equal(retry.mascotFrames.size, 0);
await retry.loadMascot(2,'cabinet');
assert.equal(retry.mascotFrames.get('cabinet:2').length, castFrameCount('cabinet'), 'Failed texture/derived jobs can retry');

const late = new Harness(); holdArt = CABINET_CAST_ART[3];
const loading = late.loadMascot(3,'cabinet');
const outcome = Promise.allSettled([loading]);
await new Promise(resolve => setImmediate(resolve));
assert.ok(held.has(holdArt)); const lateCount = allocations;
late.onDestroy(); held.get(holdArt)!(null, new Texture());
assert.equal((await outcome)[0].status, 'rejected');
assert.equal(allocations, lateCount, 'Late asset callback cannot allocate frames after destruction');
assert.equal(late.frames.size, 0); assert.equal(late.mascotFrames.size, 0);
await assert.rejects(late.loadArt('coin'), /owner was destroyed/);
holdArt = '';
const owned = [...selected.frames.values(), ...[...selected.mascotFrames.values(), ...selected.hallKeeperFrames.values(), ...selected.blinkFrames.values()].flat()];
selected.onDestroy(); assert.ok(owned.every(frame => frame.destroyed)); assert.equal(selected.frames.size, 0);

// Regression evidence reports SOURCE file bytes only: not HTTP transfer/GPU
// residency or device timings. It is reproducible from the actual catalog.
const bytes = (names: string[]) => names.reduce((sum, name) => sum + statSync(`assets/resources/art/${name}.png`).size, 0);
const summary = { catalogImages: catalog.length, startupImages: startup.length,
  catalogSourceBytes: bytes(catalog), startupSourceBytes: bytes(startup),
  deferredSourceBytes: bytes(catalog.filter(name => !startup.includes(name))),
  note: 'Source PNG sizes only; not actual network transfer, GPU texture memory or phone cold-start timing.' };
writeFileSync('output/playwright/room-art-plan-20261010.json', JSON.stringify(summary, null, 2) + '\n');
console.log('PASS actual texture/atlas preparation: concurrent deduplication, complete caches, failed retry, destruction ownership and late callback rejection');
console.log('PASS lifecycle-aware boot: hall/manual switching/services/claims remain ready; selected-room controls, six symbols and deluxe awards are deferred together');
console.log(JSON.stringify(summary));

}
main().catch(error => { console.error(error); process.exitCode = 1; });
