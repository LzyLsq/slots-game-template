import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { CABINETS, imagePoint } from '../assets/scripts/ui/CabinetGeometry';
import { GAME_CONFIGS } from '../assets/scripts/math/GameConfigs';

// Exercise the real component update loops with a minimal rendering stand-in.
// This checks motion/lifetimes; browser and device checks still cover rendering.
function Component(this:any) {this.node=new FakeNode();}
class UIOpacity { opacity = 255; }
class Sprite { color: unknown; }
class Color { constructor(..._values: unknown[]) {} }
class Graphics {
  lineWidth = 0; strokeColor: unknown;
  circle(..._values: number[]) {} ellipse(..._values: number[]) {} stroke() {}
}
class Mask { static Type = { GRAPHICS_RECT: 0 }; type = 0; }
class FakeNode {
  children: FakeNode[] = []; name = ''; angle = 0;
  position = { x: 0, y: 0 }; scale = { x: 1, y: 1 };
  private components = new Map<unknown, any>();
  addComponent<T>(type: new () => T): T { const value = new type(); this.components.set(type, value); return value; }
  getComponent<T>(type: new () => T): T | undefined { return this.components.get(type); }
  setPosition(x: number, y: number) { this.position = { x, y }; }
  setScale(x: number, y: number, _z: number) { this.scale = { x, y }; }
}
const box = (parent: FakeNode, name: string, x: number, y: number) => {
  const node = new FakeNode(); node.name = name; node.setPosition(x, y); parent.children.push(node); return node;
};
const art = {
  image(parent: FakeNode, name: string, x: number, y: number) { const n = box(parent, name, x, y); n.addComponent(Sprite); return n; },
  light(parent: FakeNode, _index: number, x: number, y: number) { const n = this.image(parent, 'light', x, y); n.addComponent(UIOpacity).opacity = 0; return n; },
};
const cc = { Component, UIOpacity, Sprite, Color, Graphics, Mask, Node: FakeNode, cclegacy:{_RF:{push(){},pop(){}}}, _decorator: { ccclass: () => (type: unknown) => type } };
const published=process.argv.includes('--bundle');
const modules=new Map<string,any>();
if(published)vm.runInNewContext(readFileSync('build/web-mobile/assets/main/index.js','utf8'),{System:{register:(id:string,deps:string[],factory:any)=>modules.set(id,{deps,factory})}});
function load(name: string) {
  if(published){
    const record=modules.get(`chunks:///_virtual/${name}.ts`);assert(record,`${name} missing from built bundle`);
    const helpers={inheritsLoose:(child:any,parent:any)=>{child.prototype=Object.create(parent.prototype);child.prototype.constructor=child;Object.setPrototypeOf(child,parent);},createForOfIteratorHelperLoose:(iterable:any)=>{const iterator=iterable[Symbol.iterator]();return iterator.next.bind(iterator);}};
    const imports:Record<string,any>={cc,'./SalonArt.ts':{box},'./CabinetGeometry.ts':{imagePoint}};
    const output:Record<string,any>={},module=record.factory((key:string|Record<string,any>,value:any)=>{if(typeof key==='string'){output[key]=value;return value;}Object.assign(output,key);return key;});
    record.deps.forEach((id:string,i:number)=>{const value=id.includes('BabelHelpers')?helpers:imports[id];assert(value,`Unexpected ${name} bundle dependency: ${id}`);module.setters[i](value);});module.execute();return output[name];
  }
  const filename = `assets/scripts/vfx/${name}.ts`, source = readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true } }).outputText;
  const exports: Record<string, any> = {};
  vm.runInNewContext(code, { exports, require: (id: string) => {
    if (id === 'cc') return cc;
    if (id === '../ui/SalonArt') return { box };
    if (id === '../ui/CabinetGeometry') return { imagePoint };
    throw Error(`Unexpected component dependency: ${id}`);
  } }, { filename });
  return exports[name];
}
const Atmosphere = load('SalonAtmosphere'), Leaves = load('CanopyLeaves');
function count(node: FakeNode): number { return 1 + node.children.reduce((sum, child) => sum + count(child), 0); }
function finite(node: FakeNode): void {
  for (const value of [...Object.values(node.position), ...Object.values(node.scale), node.angle]) assert(Number.isFinite(value));
  const alpha = node.getComponent(UIOpacity); if (alpha) assert(alpha.opacity >= 0 && alpha.opacity <= 255);
  node.children.forEach(finite);
}
for (const cfg of GAME_CONFIGS) {
  const fx = new Atmosphere(); fx.setup(art, 1024, 2304); fx.cabinet(art, CABINETS[cfg.id], cfg.columns);
  const allocated = count(fx.node);
  assert.equal(fx.railLights.length, 24); assert.equal(fx.crownTokens.length, 8); assert.equal(fx.ripples.length, 2);
  assert.equal(fx.marquee.length, 12); assert.equal(fx.perimeterTokens.length, 12);
  assert.equal(fx.comets.length, 9); assert.equal(fx.lanterns.length, 2);
  assert.equal(fx.stopSprays.length, cfg.columns * 2);
  assert(allocated <= 280, 'Cabinet ambience has a fixed, bounded node budget');
  assert.equal(fx.stopGlints.length, cfg.columns * 2, 'Every actual reel column has stop feedback');
  for (let frame = 0; frame < 1200; frame++) {
    fx.energy = frame % 360 < 180 ? 1 : 0;
    if (frame % 120 === 0) { fx.spinPulse(); fx.land((frame / 120) % cfg.columns); }
    if (frame % 180 === 0) fx.celebrate((frame / 180) % 4);
    fx.update(1 / 60); finite(fx.node);
    const [cx, cy] = imagePoint(CABINETS[cfg.id].screen), halfWidth = CABINETS[cfg.id].screen[2] / 2, halfHeight = CABINETS[cfg.id].screen[3] / 2;
    for (const token of fx.perimeterTokens) assert(Math.abs(token.n.position.x - cx) > halfWidth + 45, 'Decorations must stay outside the reel aperture');
    for (const bulb of fx.marquee) assert(Math.abs(bulb.n.position.y - cy) > halfHeight + 20, 'Marquee lights must stay on the rim');
    for (const comet of fx.comets) assert(Math.abs(comet.n.position.x-cx) >= halfWidth+31 || Math.abs(comet.n.position.y-cy) >= halfHeight+31, 'Comet paths must not cross the reels');
    for (const spark of fx.stopSprays) assert(Math.abs(spark.n.position.y-cy) >= halfHeight+23, 'Landing sparks travel outwards, not into the reels');
  }
  assert.equal(count(fx.node), allocated, 'Continuous effects must not allocate nodes every frame/spin');
  fx.reducedMotion = true; fx.spinPulse(); fx.land(0); fx.update(1 / 60);
  for (const pool of [fx.ripples, fx.crownTokens, fx.railLights, fx.marquee, fx.perimeterTokens, fx.motes, fx.glints, fx.stopGlints, fx.comets, fx.lanterns, fx.stopSprays]) assert(pool.every((item: any) => item.alpha.opacity === 0));
  fx.reducedMotion = false; for (let i = 0; i < 240; i++) fx.update(1 / 60);
  assert.equal(fx.celebrationAge, 3, 'Win boost must end instead of accumulating across spins');
}
const hall = new Atmosphere(); hall.fortunePedestal(art);hall.hallFestivity(art);
const hallCount = count(hall.node); assert.equal(hall.runners.length, 4);assert.equal(hall.fountains.length, 8);assert.equal(hall.garland.length, 12);assert.equal(hall.lanterns.length, 2);
assert(hallCount<=35, 'Hall embellishments reuse a small fixed pool');
hall.update(.08); assert(hall.ripples.some((r: any) => r.alpha.opacity > 0));
let fountainVisible=false;const startCometX=hall.runners[0].n.position.x;
for (let i = 0; i < 600; i++) { hall.update(1 / 60); finite(hall.node);fountainVisible ||= hall.fountains.some((c:any)=>c.alpha.opacity>80);for(const c of hall.fountains)assert(Math.abs(c.n.position.x)>=225,'Fountain coins must stay outside the mascot face'); }
assert(fountainVisible, 'Treasure fountains must actually animate');assert.notEqual(hall.runners[0].n.position.x,startCometX);
assert.equal(count(hall.node), hallCount);
assert(hall.ripples.every((r: any) => r.alpha.opacity === 0), 'Entry rings must finish instead of looping');
hall.reducedMotion = true; hall.update(1 / 60);for(const pool of [hall.runners,hall.fountains,hall.garland,hall.lanterns])assert(pool.every((r: any) => r.alpha.opacity === 0));
const leaves = new Leaves(); leaves.setup(art, 1024, 1792, false, true);
assert.equal(leaves.leaves.length, 18);
for (let i = 0; i < 600; i++) { leaves.update(1 / 60); finite(leaves.node); }
const reducedLeaves = new Leaves(); reducedLeaves.setup(art, 1024, 1792, true, true); assert.equal(count(reducedLeaves.node), 1);
const app = readFileSync('assets/scripts/ui/AureliaApp.ts', 'utf8');
const home = app.slice(app.indexOf('private homePage()'), app.indexOf('private authPage()'));
assert(home.indexOf("this.art.cover(stage,'canopy-hall-soft'") < home.indexOf("box(stage,'Visible canopy leaf atmosphere'"));
assert(home.indexOf("box(stage,'Visible canopy leaf atmosphere'") < home.indexOf("const exhibit=box(stage"));
assert(home.indexOf("box(stage,'Living hall lanterns and jewels'") > home.indexOf("this.art.cover(stage,'canopy-hall-soft'"));
assert(home.indexOf("box(stage,'Living hall lanterns and jewels'") < home.indexOf("const exhibit=box(stage"));
assert(app.includes('this.audio.playReelStop(column)'));
assert(app.includes("this.audio.setScene(this.page==='game'?'cabinet':'home')"));
console.log(`PASS ${published?'built bundle':'source'}: four cabinet comet paths, outward reel-stop sparks, hall lantern/jewel/fountain pools, bounded node counts, decoration/reel separation, paid-win lifetime, reduced motion and hall layer order.`);
