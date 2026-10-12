import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { cabinetWinPreview } from '../assets/scripts/ui/CabinetWinMotion';
import { REEL_ART, PRIZE_TITLES } from '../assets/scripts/ui/ThemeArt';
import { ModeEntryLoading, MODE_ENTRY_THEMES, modeEntryLayout } from '../assets/scripts/ui/ModeEntryLoading';
import { LoadingProgress, loadingTitleY } from '../assets/scripts/ui/LoadingProgress';
import { GAME_BACKDROPS, startupArt, roomCabinetArt, roomCelebrationArt } from '../assets/scripts/ui/ArtLoadingPlan';

// Execute the actual presentation methods with a small deterministic engine
// adapter. This catches load-order/lifecycle regressions that text matching and
// a successful TypeScript build cannot detect; browser QA covers real rendering.
class UITransform {
  width = 0; height = 0;
  get contentSize() { return { width: this.width, height: this.height }; }
  setContentSize(w: number, h: number) { this.width = w; this.height = h; }
}
class UIOpacity { opacity = 255; }
const loadingKeepers: any[] = [];
class KeeperGestureView { cue() {} initialize(frames: any[], scene: string, mode: number, reduced: boolean, bounds: number[], scale: number) { loadingKeepers.push({ frames, scene, mode, reduced, bounds, scale }); } }
class ModeEntryLoadingView {
  motion?: ModeEntryLoading; applications = 0;
  initialize(motion: ModeEntryLoading) { this.motion=motion; }
  apply() { this.applications++; }
}
class EditBox { enabled = true; }
class BlockInputEvents {}
class Sprite {
  static Type = { FILLED: 1 }; static FillType = { HORIZONTAL: 1 };
  type = 0; fillType = 0; fillStart = 0; fillRange = 0;
}
class TestNode {
  layer = 0; isValid = true; active = true; paused = false; angle = 0;
  parent?: TestNode;
  children: TestNode[] = []; components = new Map<unknown, any>();
  scale = { x: 1, y: 1, z: 1 }; position = { x: 0, y: 0 };
  constructor(public name: string) {}
  addComponent(ctor: any) { const instance = new ctor(); this.components.set(ctor, instance); return instance; }
  getComponent(ctor: unknown) { return this.components.get(ctor); }
  getComponentsInChildren(ctor: unknown): any[] {
    return [...(this.components.has(ctor) ? [this.components.get(ctor)] : []), ...this.children.flatMap(n => n.getComponentsInChildren(ctor))];
  }
  setPosition(x: number, y: number) { this.position = { x, y }; }
  setScale(x: number, y: number, z: number) { this.scale = { x, y, z }; }
  addChild(child: TestNode) { child.setParent(this); }
  getChildByName(name: string) { return this.children.find(child => child.name === name); }
  setParent(parent: TestNode) {
    if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
    this.parent = parent; parent.children.push(this);
  }
  pauseSystemEvents(recursive: boolean) { this.paused = true; if (recursive) this.children.forEach(n => n.pauseSystemEvents(true)); }
  resumeSystemEvents(recursive: boolean) { this.paused = false; if (recursive) this.children.forEach(n => n.resumeSystemEvents(true)); }
  destroy() { this.active = false; this.isValid = false; this.children.forEach(n => n.destroy()); }
}
type Track = { target: any; duration: number; delay: number; elapsed: number; props: Record<string, number>; from: Record<string, number>; callback?: () => void; infinite: boolean };
let tracks: Track[] = [];
function tween(target: any) {
  const track: Track = { target, duration: 0, delay: 0, elapsed: 0, props: {}, from: {}, infinite: false };
  const chain = {
    to(seconds: number, props: Record<string, number>) { track.duration = seconds; track.props = props; return chain; },
    by(seconds: number, props: Record<string, number>) { track.duration = seconds; track.props = props; return chain; },
    delay(seconds: number) { track.delay += seconds; return chain; },
    repeatForever() { track.infinite = true; return chain; },
    call(cb: () => void) { track.callback = cb; return chain; },
    start() { for (const key of Object.keys(track.props)) track.from[key] = target[key]; tracks.push(track); return chain; },
  };
  return chain;
}
const Tween = { stopAllByTarget(target: unknown) { tracks = tracks.filter(track => track.target !== target); } };
function tick(dt: number) {
  for (const track of [...tracks]) {
    if (!tracks.includes(track) || track.infinite) continue;
    track.elapsed += dt;
    if (track.elapsed < track.delay) continue;
    const p = Math.min(1, (track.elapsed - track.delay) / track.duration);
    for (const [key, value] of Object.entries(track.props)) track.target[key] = track.from[key] + (value - track.from[key]) * p;
    if (p === 1) { tracks = tracks.filter(t => t !== track); track.callback?.(); }
  }
}
const source = readFileSync('assets/scripts/ui/GoldenEncoreApp.ts', 'utf8');
const tree = ts.createSourceFile('GoldenEncoreApp.ts', source, ts.ScriptTarget.Latest, true);
const appClass = tree.statements.find(statement => ts.isClassDeclaration(statement) && statement.name?.text === 'GoldenEncoreApp') as ts.ClassDeclaration;
function method(name: string) {
  const member = appClass.members.find(member => ts.isMethodDeclaration(member) && member.name?.getText(tree) === name);
  assert.ok(member, `Missing real method ${name}`); return member.getText(tree);
}
function property(name: string) {
  const member = appClass.members.find(member => ts.isPropertyDeclaration(member) && member.name?.getText(tree) === name);
  assert.ok(member, `Missing real property ${name}`); return member.getText(tree);
}
function helper(name: string) {
  const member = tree.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
  assert.ok(member); return member.getText(tree);
}
const testLocation = {search:''};
let now = 0;
const errors: unknown[] = [];
const warnings: unknown[] = [];
let effectFailure = false;
const Harness = vm.runInNewContext(ts.transpileModule(`
${helper('node')}
${helper('opacity')}
class Harness {
  surfaceScenery = new WeakSet();
  node = new Node('Application'); frames = new Map(); mascotFrames = new Map(); surface; retiringSurface; transitionBlocker;
  viewportRefreshPending = false; musicSuspended = false; activeOverlay;
  page = 'home'; rulesReturnPage = 'home'; transitionLock = false; spinning = false; reduced = false;
  autoRemaining = 0; bootReady = false; save = { name: '', coins: 310728, spins: 119, bet: 3, selectedMode: 0, selectedLane: 0 }; hallSpotlight=0; sceneMusic={update() {}}; persists=0; syncs=0; messages=[]; loads = []; pauses = []; backgrounds = [];
  playedContacts = []; playClick(kind = 'tap') { this.playedContacts.push(kind); } publishAudioEvidence() {} clearAmbientMotion() {} cancelQueuedAuto() {} persist() {this.persists++;} syncMusic() {this.syncs++;} toast(message) {this.messages.push(message);}
  loadMusic() {} loadClicks() {} loadRewardAudio() {} loadGameplayAudio() {}
  async loadMascot(mode, scene = 'loading') { const animal = ['otter','rabbit','fox','dragon'][mode]; await this.loadArt(scene === 'loading' ? 'mascot-otter-motion' : scene + '-' + animal + '-roles-motion'); this.mascotFrames.set(scene + ':' + mode, Array(scene === 'loading' ? 64 : scene === 'prize' ? 144 : 96).fill(true)); }
  async loadHallKeeper(mode) { await this.loadArt('hall-' + ['otter','rabbit','fox','dragon'][mode] + '-paw-motion'); }
  async loadBlink(mode, scene) { await this.loadArt('blink-' + scene + '-' + ['otter','rabbit','fox','dragon'][mode]); }
  async loadArt(name) { if(this.failedArt===name)throw new Error("test missing texture"); if(this.preparationGate)await this.preparationGate; this.loads.push(name); nowAdvance(this.decodeMilliseconds || 0); this.frames.set(name, true); }
  image(parent, name) {
    if (!this.frames.has(name)) throw new Error('Missing generated art ' + name);
    const result = new Node('Art · ' + name); result.addComponent(Sprite); result.addComponent(UITransform).setContentSize(1024,1536); parent.addChild(result); return result;
  }
  background(parent, name) { this.backgrounds.push(name); const scene = this.image(parent, name); this.surfaceScenery.add(scene); return scene; }
  float() {} sparkleField() {}
  allArt() { return ['hall-treasury-stage-v3','title-stage-house','ui-coin','coin','button-coral','ui-wide-ticket','login-foyer-v4','game','button-gold','fx-gilded-light',...MODE_ENTRY_THEMES.flatMap(theme=>[theme.scene,theme.title,theme.emblem])]; }
  async pause(seconds) { this.pauses.push(seconds); nowAdvance(seconds * 1000); }
  render() { if(this.modeEntry) {this.renderModeEntry(this.modeEntry);return;} const incoming = this.startSurface(this.page); const scene = node(incoming, 'scene-' + this.page, 0, 0, 1024, 2048); this.surfaceScenery.add(scene); node(incoming, 'copy-' + this.page, 20, 35, 500, 70); this.finishSurfaceTransition(incoming); }
  ${['startSurface', 'surfaceForeground', 'finishSurfaceTransition', 'completeSurfaceTransition', 'navigate', 'boot', 'enterMode', 'beginModeEntry', 'renderModeEntry', 'leaveModeEntry', 'flushViewportRefresh', 'update'].map(method).join('\n')}
  ${property('onResize')}
}
Harness;
`, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, {
  Node: TestNode, UITransform, UIOpacity, EditBox, BlockInputEvents, Sprite, KeeperGestureView, tween, Tween,
  LoadingProgress, loadingTitleY, ModeEntryLoading, MODE_ENTRY_THEMES, modeEntryLayout, ModeEntryLoadingView, REEL_ART, PRIZE_TITLES,
  GAME_BACKDROPS, startupArt, roomCabinetArt, roomCelebrationArt, MODES: [0,1,2,3].map(id=>({id,lane:Math.min(id,2)})),
  cabinetWinPreview, STAKES: [50],
  EffectAsset: class EffectAsset {},
  resources: { load(path: string, _type: unknown, callback: (error: unknown, effect?: unknown) => void) {
    assert.equal(path, 'effects/task-gold-joints');
    callback(effectFailure ? new Error('isolated optional-effect failure') : null, effectFailure ? undefined : { name: 'task-gold-joints' });
  } },
  Layers: { Enum: { UI_2D: 1 } }, view: { getVisibleSize: () => ({ width: 390, height: 844 }) },
  Date: { now: () => now }, nowAdvance: (ms: number) => { now += ms; }, URLSearchParams,
  globalThis: { location: testLocation }, CREAM: '#fff', CORAL: '#ffa', INK: '#153',
  liveLabel: () => ({ string: '' }), tr: (value: string) => value,
  console: { error: (...args: unknown[]) => errors.push(args), warn: (...args: unknown[]) => warnings.push(args) },
});
function app() { testLocation.search=''; tracks = []; now = 0; errors.length = 0; warnings.length = 0; effectFailure = false; loadingKeepers.length = 0; return new Harness(); }
function liveRoots(a: any) { return a.node.children.filter((n: TestNode) => n.active && n.isValid && !n.getComponent(BlockInputEvents)); }

async function main() {
// Execute the production resize receiver and update path, including cases that
// previously discarded the event while a spin/award/background owned the UI.
const resize = app(); resize.bootReady = true;
let resizeRenders = 0; const realRender = resize.render.bind(resize);
resize.render = () => { resizeRenders++; realRender(); };
resize.render(); const initial = resize.surface;
for (let i=0; i<30; i++) resize.onResize();
assert.equal(resizeRenders,1,'Resize bursts only mark dirty, not rebuild synchronously');
resize.update(1/60);
assert.equal(resizeRenders,2,'One real layout pass for a burst of 30 events');
assert.equal(initial.isValid,false); assert.equal(resize.viewportRefreshPending,false);
resize.update(1/60); assert.equal(resizeRenders,2,'Idle frames do not rebuild layout');
for(const blocker of ['spinning','activeOverlay','musicSuspended']) {
  resize[blocker] = blocker==='activeOverlay' ? {name:'Award in progress'} : true;
  resize.onResize(); resize.update(1/60); resize.update(1/60);
  const before=resizeRenders;
  assert.equal(resize.viewportRefreshPending,true,`Preserve resize during ${blocker}`);
  assert.equal(resizeRenders,2+['spinning','activeOverlay','musicSuspended'].indexOf(blocker),'No redraw cancels an owned presentation');
  resize[blocker]=blocker==='activeOverlay'?undefined:false;
  resize.update(1/60); assert.equal(resizeRenders,before+1);
  assert.equal(resize.viewportRefreshPending,false);
}
resize.bootReady=false; resize.onResize(); resize.update(1/60);
assert.equal(resize.viewportRefreshPending,true,'Loading retains the latest viewport');
resize.bootReady=true; resize.update(1/60); assert.equal(resize.viewportRefreshPending,false);
assert.ok(method('onLoad').includes("view.on('canvas-resize', this.onResize, this)"));
assert.ok(method('onDestroy').includes("view.off('canvas-resize', this.onResize, this)"));
assert.ok(!source.includes("screen.on('window-resize'"),'Application layout waits for the adapted view, not raw window events');
assert.ok(method('render').includes('this.viewportRefreshPending = false'),'Direct navigation consumes a pending layout refresh');
console.log('PASS adapted-view resize: 30-event coalescing, idle, boot/spin/award/background deferral, no presentation cancellation, listener cleanup');

const transition = app(); transition.render();
const home = transition.surface as TestNode;
assert.equal(home.getComponent(UIOpacity).opacity, 255, 'First paint has no transparent fade from canvas clear colour');
home.addComponent(EditBox);
transition.navigate('store'); const shop = transition.surface as TestNode;
assert.equal(home.active, true); assert.equal(home.paused, true); assert.equal(home.getComponent(EditBox).enabled, false);
assert.equal(shop.paused, true); assert.ok(transition.transitionBlocker.getComponent(BlockInputEvents));
assert.equal(transition.transitionLock, true); assert.equal(liveRoots(transition).length, 2);
const homeCopy = home.getChildByName('Page foreground')!;
const shopCopy = shop.getChildByName('Page foreground')!;
assert.equal(home.getChildByName('scene-home')?.parent, home, 'Scenery never inherits foreground handoff opacity');
assert.equal(homeCopy.getChildByName('copy-home')?.position.x, 20, 'Grouping preserves local X registration');
assert.equal(homeCopy.getChildByName('copy-home')?.position.y, 35, 'Grouping preserves local Y registration');
assert.equal(shopCopy.getChildByName('copy-store')?.parent, shopCopy);
assert.equal(homeCopy.getComponent(UIOpacity).opacity, 255); assert.equal(shopCopy.getComponent(UIOpacity).opacity, 0);
for (let i = 0; i < 21; i++) {
  tick(.01);
  const a = shop.getComponent(UIOpacity).opacity / 255;
  const b = home.getComponent(UIOpacity).opacity / 255;
  assert.equal(b, 1, 'Outgoing backplate stays opaque for every sampled transition frame');
  assert.equal(a + b * (1 - a), 1, 'Composite never exposes the canvas through two partial alphas');
  const oldText = homeCopy.getComponent(UIOpacity).opacity;
  const newText = shopCopy.getComponent(UIOpacity).opacity;
  assert.equal(oldText * newText, 0, 'Never display old and new wallet/title/button copy together');
  if (i < 6) assert.equal(newText, 0, 'New copy waits for outgoing copy to clear');
  if (i > 7) assert.equal(oldText, 0, 'Old copy cannot bleed through the incoming scene');
}
transition.navigate('rank'); assert.equal(transition.page, 'store', 'Rapid second navigation is locked during transition');
tick(.02);
assert.equal(home.isValid, false); assert.equal(transition.transitionBlocker, undefined);
assert.equal(shop.paused, false); assert.equal(transition.transitionLock, false); assert.equal(liveRoots(transition).length, 1);
assert.equal(shopCopy.getComponent(UIOpacity).opacity, 255); assert.equal(tracks.length, 0, 'All three transition alpha owners are released');
for (const cancelTime of [.01, .07, .11, .21]) {
  const cancelled = app(); cancelled.render(); cancelled.navigate('store'); tick(cancelTime);
  cancelled.completeSurfaceTransition(); const finalCopy = cancelled.surface.getChildByName('Page foreground');
  assert.equal(finalCopy.getComponent(UIOpacity).opacity, 255, 'Hide/cancel never strands invisible copy');
  assert.equal(cancelled.transitionLock, false); assert.equal(tracks.length, 0); tick(1);
  assert.equal(cancelled.surface.isValid, true); assert.equal(liveRoots(cancelled).length, 1);
}

// Resize/same-page render interrupts a fade. Never retain three surfaces or let
// a stale completion unlock/retire the wrong newly created surface.
transition.navigate('rank'); const intermediate = transition.surface;
tick(.07); transition.render(); const resized = transition.surface;
assert.equal(intermediate.isValid, false); assert.equal(shop.isValid, false);
assert.equal(liveRoots(transition).length, 1); assert.equal(resized.getComponent(UIOpacity).opacity, 255);
assert.equal(transition.transitionLock, false); tick(1); assert.equal(resized.isValid, true);
for (let i = 0; i < 20; i++) { transition.navigate(i % 2 ? 'store' : 'rank'); tick(.23); assert.equal(liveRoots(transition).length, 1); }
transition.navigate('game'); tick(.23); transition.navigate('rules'); tick(.23);
assert.equal(transition.rulesReturnPage, 'game', 'Cabinet rules preserve the correct return destination');
transition.navigate('game'); tick(.23); assert.equal(transition.page, 'game');
transition.navigate('home'); transition.completeSurfaceTransition();
assert.equal(transition.transitionLock, false); assert.equal(liveRoots(transition).length, 1);
assert.equal(transition.surface.getComponent(UIOpacity).opacity, 255, 'Background/cancellation completes to an opaque interactive page');

// Execute actual per-room entry/update/render/leave methods. Entry locks survive
// the .22s page fade, and a resize can only rebuild the same loading surface.
for(const id of [0,1,2,3]) {
  const entryApp=app();entryApp.bootReady=true;entryApp.save.name='Player';entryApp.render();
  for(const theme of MODE_ENTRY_THEMES)for(const art of [theme.scene,theme.title,theme.emblem,'ui-wide-ticket','button-gold','fx-gilded-light'])entryApp.frames.set(art,true);
  const wallet=JSON.stringify([entryApp.save.coins,entryApp.save.bet,entryApp.save.spins]);
  entryApp.enterMode({id,lane:Math.min(id,2)});const run=entryApp.modeEntry;
  assert.deepEqual([...entryApp.playedContacts], ['enter'], 'Accepted room entry has one arrival contact');
  assert.equal(run.mode,id);assert.equal(entryApp.page,'home','Do not expose live cabinet controls during preparation');
  assert.equal(entryApp.surface.name,'Entering room '+id);assert.ok(entryApp.surface.getComponentsInChildren(BlockInputEvents).length);
  tick(.23);entryApp.enterMode({id:(id+1)%4,lane:0});entryApp.navigate('store');assert.equal(entryApp.modeEntry,run);assert.equal(entryApp.page,'home');assert.equal(entryApp.playedContacts.length,1,'Blocked double entry must not emit a second arrival contact');
  const original=entryApp.surface;entryApp.render();assert.equal(original.isValid,false);assert.equal(entryApp.modeEntry,run);
  await new Promise(resolve=>setImmediate(resolve));assert.equal(run.completedWork,4);
  for (const art of [...roomCabinetArt(id), ...roomCelebrationArt(id), ...REEL_ART[id]]) assert.ok(entryApp.frames.has(art), 'Entry completes only after all selected-room art is ready');
  for (const other of [0,1,2,3].filter(mode=>mode!==id)) {
    assert.ok(!entryApp.frames.has(GAME_BACKDROPS[other]), 'Entry must not prepare another cabinet');
    assert.ok(!entryApp.frames.has('prize-jewel-'+other), 'Entry must not prepare another room jewel');
  }
  for(let i=0;i<240 && entryApp.modeEntry;i++) {entryApp.update(1/60);tick(1/60);}
  assert.equal(entryApp.modeEntry,undefined);assert.equal(entryApp.page,'game');tick(.23);
  assert.equal(liveRoots(entryApp).length,1);assert.equal(entryApp.surface.name,'game');assert.equal(entryApp.persists,1);
  assert.equal(JSON.stringify([entryApp.save.coins,entryApp.save.bet,entryApp.save.spins]),wallet,'Loading neither wagers nor awards coins');
  assert.ok(entryApp.loads.includes(REEL_ART[id][5]));assert.ok(!entryApp.loads.includes(REEL_ART[(id+1)%4][5]),'No other room symbols enter the preparation batch');
  entryApp.navigate('rules');tick(.23);entryApp.navigate('game');tick(.23);assert.equal(entryApp.modeEntry,undefined,'Returning from rules never reloads the same room');
}
const stale=app();stale.bootReady=true;stale.render();
for(const theme of MODE_ENTRY_THEMES)for(const art of [theme.scene,theme.title,theme.emblem,'ui-wide-ticket','button-gold','fx-gilded-light'])stale.frames.set(art,true);
let release:any;stale.preparationGate=new Promise(resolve=>{release=resolve;});
stale.enterMode({id:0,lane:0});const obsolete=stale.modeEntry;stale.leaveModeEntry(obsolete,false);release();await new Promise(resolve=>setImmediate(resolve));
assert.equal(obsolete.phase,'cancelled');assert.equal(obsolete.completedWork,0);assert.equal(stale.page,'home');assert.equal(stale.messages.length,1);
const failure=app();failure.bootReady=true;failure.render();
for(const theme of MODE_ENTRY_THEMES)for(const art of [theme.scene,theme.title,theme.emblem,'ui-wide-ticket','button-gold','fx-gilded-light'])failure.frames.set(art,true);
failure.failedArt=REEL_ART[2][0];failure.enterMode({id:2,lane:2});await new Promise(resolve=>setImmediate(resolve));failure.update(.016);tick(.23);
assert.equal(failure.modeEntry,undefined);assert.equal(failure.page,'home');assert.equal(failure.messages.length,1);
warnings.length=0;
console.log('PASS actual four room entry methods: post-fade duplicate lock, resize, genuine prerequisite batches, no wallet/bet/spin changes, rules return, failure and stale async cancellation');

const reduced = app(); reduced.reduced = true; reduced.render(); const old = reduced.surface;
reduced.navigate('store');
assert.equal(old.isValid, false); assert.equal(reduced.surface.getComponent(UIOpacity).opacity, 255);
assert.equal(reduced.transitionLock, false); assert.equal(tracks.length, 0, 'Reduced motion never starts a page fade');

for (const [reducedMotion, decodeMs] of [[false, 0], [true, 0], [false, 220]] as const) {
  const boot = app(); boot.reduced = reducedMotion; boot.decodeMilliseconds = decodeMs;
  await boot.boot();
  assert.equal(boot.taskGoldEffect?.name,'task-gold-joints','joint effect prepared before bootReady');
  assert.equal(errors.length, 0, 'Boot must not reference a generated image before loading it');
  for (const animal of ['otter','rabbit','fox','dragon']) {
    assert.ok(boot.loads.includes('blink-hall-' + animal), 'Every hall eye sequence is ready before manual switching');
    for (const scene of ['cabinet','prize']) assert.ok(!boot.loads.includes('blink-' + scene + '-' + animal), 'Unentered room eye banks must wait behind room preparation');
  }
  assert.ok(!boot.loads.includes('game'), 'The cabinet is not decoded during login/hall boot');
  assert.ok(!boot.loads.some((art: string) => art.endsWith('-expression')), 'Boot never decodes retired full-face expression overlays');
  assert.equal(loadingKeepers.length, 1); assert.equal(loadingKeepers[0].scene, 'loading');
  assert.equal(loadingKeepers[0].frames.length, 64); assert.equal(loadingKeepers[0].reduced, reducedMotion);
  assert.ok(boot.loads.indexOf('mascot-otter-motion') < boot.loads.indexOf('login-foyer-v4'), 'Loading mascot is prepared before bulk page decoding');
  assert.equal(boot.bootReady, true); assert.equal(boot.page, 'login');
  assert.deepEqual([...boot.loads].slice(0, 2), ['hall-treasury-stage-v3', 'title-stage-house']);
  assert.deepEqual([...boot.backgrounds], ['hall-treasury-stage-v3'], 'Loading uses the treasury scene, never a slot cabinet');
  const visibleSeconds = (now - decodeMs * 2) / 1000;
  assert.ok(visibleSeconds >= (reducedMotion ? .68 : 2.72) - .000001, 'Minimum duration starts after the loading scene becomes visible, not before background decoding');
  const coins = tracks.filter(track => track.target.name === 'Art · ui-coin');
  assert.equal(coins.length, reducedMotion ? 0 : 1, 'Generated coin rotates only in full-motion mode');
  if (!reducedMotion) { tick(.23); assert.equal(boot.retiringSurface, undefined); }
}
const directBoot=app();testLocation.search='?debug=1&screen=game';await directBoot.boot();
assert.equal(directBoot.bootReady,true);assert.ok(directBoot.modeEntry,'Direct/debug cabinet startup still gets its room animation');
await new Promise(resolve=>setImmediate(resolve));for(let i=0;i<150;i++){directBoot.update(1/60);tick(1/60);}
assert.equal(directBoot.modeEntry,undefined);assert.equal(directBoot.page,'game');
console.log('PASS direct-game cold startup retains app preload and selected-room entry animation');
const effectFallback=app(); effectFailure=true; await effectFallback.boot();
assert.equal(effectFallback.bootReady,true,'an optional presentation material cannot strand an already credited reward');
assert.equal(effectFallback.taskGoldEffect,undefined); assert.equal(errors.length,0); assert.equal(warnings.length,1);
assert.ok(!method('allArt').includes('HALL_EXPRESSION_ART'), 'Retired full-face atlases never participate in boot progress/preload');
assert.ok(method('allArt').includes('BLINK_ART'), 'Complete catalog retains the generated eye assets');
assert.ok(method('boot').includes('startupArt(this.allArt())'), 'Boot uses the lifetime-aware subset rather than the full catalog');
assert.match(source, /private onHide = \(\): void => \{\s*this\.completeSurfaceTransition\(\)/);
assert.match(source, /protected onDestroy\(\): void \{[\s\S]*?this\.completeSurfaceTransition\(\)/);
console.log('PASS real page methods: opaque scene composite, non-overlapping foreground handoff, registered transforms, three-owner tween cleanup, input shield, repeat/resize/cancel, rules return, reduced motion; cached/slow boot image order and minimum visible loading duration');

}
main().catch(error => { console.error(error); process.exitCode = 1; });
