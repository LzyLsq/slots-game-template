import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { CabinetWinMotion, cabinetWinPreview, CABINET_WIN_TITLE, CABINET_WIN_AMOUNT, CABINET_WIN_CLEARANCE, CABINET_WIN_LIGHTS, CABINET_WIN_RAYS, CABINET_WIN_CROWN, CABINET_WIN_ORNAMENTS, CABINET_WIN_AUREOLE, CABINET_WIN_BURSTS, CABINET_WIN_JETS, CABINET_WIN_STREAMERS, CABINET_WIN_COPY, type WinBurstPose, type WinOrnamentPose, type WinCoinPose } from '../assets/scripts/ui/CabinetWinMotion';
import { protectionOpacity } from '../assets/scripts/ui/KeeperClearance';
import { cabinetViewport } from '../assets/scripts/ui/CabinetViewport';

const pose: WinCoinPose = { x: 0, y: 0, size: 0, alpha: 0, angle: 0, squeeze: 1 };
for (const tier of ['big', 'super'] as const) {
  for (const fps of [5, 15, 30, 60, 120]) {
    const m = new CabinetWinMotion(tier); let visible = 0, maxAlpha = 0, clearCoins = 0;
    for (let i = 0; i < fps * 13; i++) {
      m.step(1 / fps); assert.ok(m.titleAlpha >= 0 && m.titleAlpha <= 255);
      assert.ok(m.amountAlpha >= 0 && m.amountAlpha <= 255);
      for (let c = 0; c < m.capacity; c++) {
        m.coin(c, pose);
        if (!pose.alpha) continue;
        visible++; maxAlpha = Math.max(maxAlpha, pose.alpha);
        for (const v of Object.values(pose)) assert.ok(Number.isFinite(v));
        assert.ok(pose.x > 0 && pose.x < 1024 && pose.y > 438 && pose.y < 1180);
        assert.ok(pose.squeeze >= .28 && pose.squeeze <= 1);
        const gated = protectionOpacity(CABINET_WIN_CLEARANCE, pose.x, pose.y, Math.SQRT2 * pose.size / 2);
        if (gated > .55 && pose.alpha > 160) clearCoins++;
        if (pose.y >= 896) assert.equal(gated, 0, 'Coins cannot obscure COLLECT or HUD');
      }
    }
    assert.ok(clearCoins > fps * 12, 'Moving gold remains clearly visible after the real clearance gate, not almost entirely faded out');
    assert.ok(visible > fps * 20 && maxAlpha > 220, 'Actual moving cascades, not an opaque static panel');
    const before = m.elapsed; m.step(NaN); m.step(-1); m.step(Infinity); assert.equal(m.elapsed, before);
    m.finish(); assert.equal(m.titleAlpha, 255); assert.equal(m.amountAlpha, 255); assert.equal(m.titleOffset, 0);
    m.coin(0, pose); assert.equal(pose.alpha, 0); assert.equal(m.light(0), 0);
    m.step(1); assert.equal(m.elapsed, before);
  }
  // Absolute trajectories at equal elapsed time do not depend on device cadence.
  const poses: WinCoinPose[] = [];
  for (const fps of [5, 30, 120]) {
    const m = new CabinetWinMotion(tier); for (let n = 0; n < fps * 2; n++) m.step(1 / fps);
    m.coin(7, pose); poses.push({ ...pose });
  }
  for (const p of poses.slice(1)) for (const key of ['x', 'y', 'angle', 'squeeze'] as const)
    assert.ok(Math.abs(p[key] - poses[0][key]) < 1e-8, 'Frame-independent continuous motion');
  const reduced = new CabinetWinMotion(tier, true); assert.equal(reduced.capacity, 0); assert.equal(reduced.titleAlpha, 255);
  const motion = new CabinetWinMotion(tier); let previous: WinCoinPose | undefined;
  for (let t = 0; t < 2.6; t += 1 / 120) {
    motion.step(1 / 120); motion.coin(0, pose);
    if (pose.alpha && previous?.alpha) assert.ok(Math.hypot(pose.x - previous.x, pose.y - previous.y) < 6, 'No teleports or apex snapping');
    previous = { ...pose };
  }
}
for (const tier of ['big','super'] as const) {
  const m = new CabinetWinMotion(tier), phases=new Set<string>(); let maxClear=0;
  for(let f=0;f<60*12;f++) {
    m.step(1/60);phases.add(m.phase);let count=0;
    for(let c=0;c<m.capacity;c++){m.coin(c,pose);if(pose.alpha>160 && protectionOpacity(CABINET_WIN_CLEARANCE,pose.x,pose.y,Math.SQRT2*pose.size/2)>.55)count++;}
    maxClear=Math.max(maxClear,count);
    assert.ok(m.reelFactor>=.28-1e-9 && m.reelFactor<=1);
    assert.ok(m.rayAlpha>=0 && m.rayAlpha<=255);
  }
  assert.deepEqual([...phases],tier === 'super' ? ['gather','reveal','cascade','encore','finale','hold'] : ['gather','reveal','cascade','finale','hold']);
  assert.ok(maxClear >= (tier==='super'?26:23), `Meaningfully denser ${tier} with ${maxClear} actually clear gold sprites`);
  m.finish();assert.equal(m.reelFactor,1);assert.equal(m.rayAlpha,0);assert.equal(m.phase,'hold');
}
// Four independent generated sculptures reveal continuously, without bending
// their aspect ratio, unbounded transforms, frame-dependent jumps or UI overlap.
const ornamentPose: WinOrnamentPose = { x: 0, y: 0, alpha: 0, angle: 0, scaleX: 1, scaleY: 1 };
for (const tier of ['big', 'super'] as const) for (const room of [0, 1, 2, 3]) {
  const m = new CabinetWinMotion(tier, false, room);
  const previous: (WinOrnamentPose | undefined)[] = [];
  for (let frame = 0; frame < 120 * 8; frame++) {
    m.step(1 / 120);
    for (let part = 0; part < 4; part++) {
      m.ornament(part, ornamentPose);
      for (const value of Object.values(ornamentPose)) assert.ok(Number.isFinite(value));
      assert.ok(ornamentPose.alpha >= 0 && ornamentPose.alpha <= 255);
      assert.ok(ornamentPose.scaleX >= .62 && ornamentPose.scaleX <= 1.025);
      assert.ok(ornamentPose.scaleY >= .83 && ornamentPose.scaleY <= 1.025);
      assert.ok(Math.abs(ornamentPose.angle) <= 9.1);
      const old = previous[part];
      if (old) {
        assert.ok(Math.hypot(ornamentPose.x - old.x, ornamentPose.y - old.y) < 1.3, 'Smooth 68px lateral opening at 120Hz; not the old 14px micro-drift');
        assert.ok(Math.abs(ornamentPose.scaleX - old.scaleX) < .01);
        assert.ok(Math.abs(ornamentPose.angle - old.angle) < .18);
      }
      previous[part] = { ...ornamentPose };
    }
  }
  const reduced = new CabinetWinMotion(tier, true, room);
  for (let part = 0; part < 4; part++) {
    reduced.ornament(part, ornamentPose); const exact = { ...ornamentPose };
    reduced.step(1); reduced.ornament(part, ornamentPose);
    assert.deepEqual(ornamentPose, exact); assert.equal(ornamentPose.alpha, 255);
    assert.equal(ornamentPose.angle, 0);
  }
  const samples: WinOrnamentPose[][] = [];
  for (const fps of [5, 15, 30, 60, 120]) {
    const cadence = new CabinetWinMotion(tier, false, room);
    for (let n = 0; n < fps * 2; n++) cadence.step(1 / fps);
    samples.push(CABINET_WIN_ORNAMENTS.map((_, part) => { cadence.ornament(part, ornamentPose); return { ...ornamentPose }; }));
  }
  for (const sample of samples.slice(1)) for (let part = 0; part < 4; part++)
    for (const key of ['x','y','angle','scaleX','scaleY'] as const)
      assert.ok(Math.abs(sample[part][key] - samples[0][part][key]) < 1e-8);
}
const burstPose: WinBurstPose = {x:0,y:0,alpha:0,scale:1,angle:0};
for (const tier of ['big','super'] as const) {
  const m = new CabinetWinMotion(tier), previous:(WinBurstPose|undefined)[]=[]; let visible=0;
  for(let frame=0;frame<120*9;frame++) {
    m.step(1/120);
    assert.ok(m.aureoleAlpha>=0 && m.aureoleAlpha<=255);
    assert.ok(m.aureoleScale>=.78 && m.aureoleScale<=1.07);
    for(let i=0;i<m.burstCapacity;i++) {
      m.burst(i,burstPose);if(!burstPose.alpha){previous[i]=undefined;continue;}visible++;
      for(const value of Object.values(burstPose))assert.ok(Number.isFinite(value));
      assert.ok(burstPose.scale>=.26 && burstPose.scale<=1.12);
      assert.ok(burstPose.alpha>=0 && burstPose.alpha<=236);
      const old=previous[i];if(old)assert.ok(Math.abs(burstPose.scale-old.scale)<.02 && Math.abs(burstPose.alpha-old.alpha)<=11, 'Smooth expansion/dissipation, never a single pop');
      previous[i]={...burstPose};
    }
  }
  assert.ok(visible>600, 'BIG and SUPER both have a sustained multi-wave firework show');
  m.burst(0,burstPose);assert.equal(burstPose.alpha,0,'No firework loops forever after the hold');
  m.finish();assert.equal(m.aureoleAlpha,0);m.burst(0,burstPose);assert.equal(burstPose.alpha,0);
  const samples:WinBurstPose[]=[];
  for(const fps of [5,15,30,60,120]){const cadence=new CabinetWinMotion(tier);for(let i=0;i<fps*2;i++)cadence.step(1/fps);cadence.burst(2,burstPose);samples.push({...burstPose});}
  for(const sample of samples.slice(1))for(const key of ['x','y','scale','angle'] as const)assert.ok(Math.abs(sample[key]-samples[0][key])<1e-8);
  const reduced=new CabinetWinMotion(tier,true);assert.equal(reduced.burstCapacity,0);assert.equal(reduced.aureoleAlpha,0);
}
for(const name of ['fx-prize-firework','fx-prize-aureole']){
  const png=readFileSync(`assets/resources/art/${name}.png`);assert.equal(png[25],6);assert.equal(png.readUInt32BE(16),768);assert.equal(png.readUInt32BE(20),768);
}
console.log('PASS palace BIG/SUPER: generated aureole, smooth finite firework waves, front/back coin depths, reduction/cancellation and five cadences');
const ornamentHashes = new Set<string>();
for (const mode of [0,1,2,3]) for (const part of [0,1,2,3]) {
  const png = readFileSync(`assets/resources/art/prize-ornament-${mode}-${part}.png`);
  const f = CABINET_WIN_ORNAMENTS[part];
  assert.equal(png[25],6,'Generated sculpture retains real transparent alpha');
  assert.ok(Math.abs(png.readUInt32BE(16) / png.readUInt32BE(20) - f[2] / f[3]) < 1e-8,'No stretched crown, coins or gemstones');
  assert.ok(f[0]-f[2]/2>=146 && f[0]+f[2]/2<=878 && f[1]+f[3]/2<894,'Sculptures do not enter physical controls');
  ornamentHashes.add(png.subarray(33).toString('base64'));
}
assert.equal(ornamentHashes.size,16,'All four rooms have their own generated sculptures, not a universal shared decoration');

for (const [x,y,w,h] of CABINET_WIN_LIGHTS) assert.ok(protectionOpacity(CABINET_WIN_CLEARANCE,x,y,Math.hypot(w,h)/2) > .55, 'Generated rail lighting is visibly clear of the live copy/controls');
assert.ok(new CabinetWinMotion('super').capacity > new CabinetWinMotion('big').capacity);
for (const [w, h] of [[320,568],[375,812],[390,844],[430,932],[739,766],[1024,768],[1280,720]]) {
  const root = Math.min(w / 1024, h / 1800), s = cabinetViewport(w / root, h / root).scale * root;
  for (const [x,y,width,height] of [CABINET_WIN_TITLE, CABINET_WIN_AMOUNT]) {
    assert.ok(x - width / 2 > 217 && x + width / 2 < 807 && y - height / 2 > 462 && y + height / 2 < 852, 'Local copy within original reel aperture');
    assert.ok(w / 2 + (x - 512 - width / 2) * s >= 0 && w / 2 + (x - 512 + width / 2) * s <= w);
    assert.ok(h / 2 + (y - 768 - height / 2) * s >= 0 && h / 2 + (y - 768 + height / 2) * s <= h);
  }
}
for (const query of ['?win=big','?debug=0&screen=game&win=big','?debug=1&screen=home&win=super','?debug=1&screen=game&win=ordinary']) assert.equal(cabinetWinPreview(query, 500), undefined);
assert.deepEqual(cabinetWinPreview('?debug=1&screen=game&win=big&mode=2',500), { tier:'big',amount:1500,mode:2,reduced:false });
assert.deepEqual(cabinetWinPreview('?debug=1&screen=game&win=super&mode=0&reduced=1',500), { tier:'super',amount:6000,mode:0,reduced:true });
assert.equal(cabinetWinPreview('?debug=1&screen=game&win=big&mode=oops',500)?.mode,undefined);

// Execute real app methods with a minimal scene adapter, not duplicated routing.
const source = readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
const tree = ts.createSourceFile('App.ts', source, ts.ScriptTarget.Latest, true);
const cls = tree.statements.find(s => ts.isClassDeclaration(s) && s.name?.text === 'GoldenEncoreApp') as ts.ClassDeclaration;
const method = (name:string) => cls.members.find(m => ts.isMethodDeclaration(m) && m.name?.getText(tree) === name)!.getText(tree);
const helper = (name:string) => tree.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name)!.getText(tree);
class UITransform { width=0; height=0; setContentSize(w:number,h:number){this.width=w;this.height=h;} }
class UIOpacity { opacity=255; }
class Label { node!: TestNode; string=''; enableWrapText=true; isValid=true; }
class KeeperGestureView { node!: TestNode; }
class KeeperClearanceView { backdrop?:TestNode; rects:unknown; initialize(b:TestNode,r:unknown){this.backdrop=b;this.rects=r;} }
class CabinetWinView { held=false; finished=false; motion?:CabinetWinMotion; initialize(m:CabinetWinMotion,_title?:unknown,_amount?:unknown,coins?:unknown[],lights?:unknown[],rays?:unknown[],sparkles?:unknown[],reels?:unknown[],ornaments?:unknown[],bursts?:unknown[],aureole?:unknown,jets?:unknown[],streamers?:unknown[],treasures?:unknown[],treasureGlints?:unknown[],heroes?:unknown[],heroGlints?:unknown[],salutes?:unknown[]){this.motion=m;this.layers={coins:coins?.length,lights:lights?.length,rays:rays?.length,sparkles:sparkles?.length,reels:reels?.length,ornaments:ornaments?.length,bursts:bursts?.length,aureole:!!aureole,jets:jets?.length,streamers:streamers?.length,treasures:treasures?.length,treasureGlints:treasureGlints?.length,heroes:heroes?.length,heroGlints:heroGlints?.length,salutes:salutes?.length};} layers:any; hold(){this.held=true;} finish(){this.finished=true;this.motion?.finish();} }
class TestNode {
  children:TestNode[]=[]; components=new Map<unknown,any>(); parent?:TestNode; name:string; active=true; isValid=true; scale={x:1,y:1,z:1}; position={x:0,y:0};
  constructor(name:string){this.name=name;}
  addChild(n:TestNode){this.children.push(n);n.parent=this;}
  addComponent<T>(type:new()=>T):T { const c=new type();(c as any).node=this;this.components.set(type,c);return c; }
  getComponent<T>(type:new()=>T):T|undefined{return this.components.get(type);}
  getComponentInChildren<T>(type:new()=>T):T|undefined{return this.getComponent(type)||this.children.map(n=>n.getComponentInChildren(type)).find(Boolean);}
  setPosition(x:number,y:number){this.position={x,y};} setScale(x:number,y:number,z:number){this.scale={x,y,z};}
  destroy(){this.isValid=false;this.children.forEach(n=>n.destroy());}
}
let fadeComplete:(()=>void)|undefined;
function tween(_target:unknown){const chain={to(){return chain;},call(cb:()=>void){fadeComplete=cb;return chain;},start(){return chain;}};return chain;}
const context = {Node:TestNode, UITransform, UIOpacity, Label, KeeperGestureView, KeeperClearanceView, CabinetWinView,
  CabinetWinMotion,CABINET_WIN_TITLE,CABINET_WIN_AMOUNT,CABINET_WIN_CLEARANCE,CABINET_WIN_LIGHTS,CABINET_WIN_RAYS,CABINET_WIN_CROWN,CABINET_WIN_ORNAMENTS,CABINET_WIN_BURSTS,CABINET_WIN_AUREOLE,CABINET_WIN_JETS,CABINET_WIN_STREAMERS,PRIZE_TITLES:{big:'prize-title-big',super:'prize-title-super'},
  Layers:{Enum:{UI_2D:1}},CREAM:'#fff',Date,tween,
  hudAmount:(n:number)=>n.toLocaleString(),tr:(s:string,vars:Record<string,unknown>={})=>s.replace(/\{(\w+)\}/g,(_,key)=>String(vars[key])),
  liveLabel:(parent:TestNode,text:string,x:number,y:number,w:number,h:number)=>{const n=new TestNode('Amount');parent.addChild(n);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);const l=n.addComponent(Label);l.string=text;return l;}
};
const Harness=vm.runInNewContext(ts.transpileModule(`
${helper('node')} ${helper('opacity')}
class Harness {
  page='game'; node=new Node('App'); surface=new Node('Existing cabinet'); cabinetBackdrop=new Node('Original generated scene'); gameBackdropScale=.9;
  save={selectedMode:0,coins:310728,spins:14,selectedLane:1,featureProgress:[0,0,17,2]}; round={award:1500}; autoRemaining=0; reduced=false; winCues=[]; winClosing=false;
  statusLabel={isValid:true,node:new Node('Status'),string:'WIN …'}; walletLabel={isValid:true,string:'COINS 309,228'}; winLabel={isValid:true,string:'WIN …'};
  sounds=[]; cues=[]; queueCalls=0; scheduled=new Map(); syncCalls=0;
  cabinetFeatureLabel={isValid:true,string:'stale'}; meterLabels=[]; meterPlaques=[];
  meterText(){return [];} boardNodeRefs=[];

  rewardAudio={play:(sound)=>this.sounds.push(sound),stopPresentation:()=>{}};
  constructor(){this.surface.addChild(this.cabinetBackdrop);this.cabinetBackdrop.addComponent(KeeperGestureView);this.board=new Node('Same stopped board');this.surface.addChild(this.board);}
  syncMusic(){this.syncCalls++;} cueKeeper(cue){this.cues.push(cue);} reportWinPreview(){} blocking(){}
  image(p,name,x=0,y=0,w=1,h=1){const n=new Node(name);p.addChild(n);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);return n;}
  particleImage(...args){return this.image(...args);}
  cabinetCollectControl(p){this.collectAction=()=>this.closeWin();return this.image(p,'Original physical control hit');}
  showCabinetWin(){this.ordinaryRouted=true;}
  countUp(label,target,duration){this.count={label,target,duration};}
  scheduleOnce(fn,seconds){this.scheduled.set(fn,seconds);} unschedule(fn){this.scheduled.delete(fn);}
  queueAuto(){this.queueCalls++;}
  ${['showWin','closeWin','clearWinTimeline','winCue','cabinetFeatureText','refreshMeters'].map(method).join('\n')}
} Harness;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context);
for (const tier of ['big','super'] as const) for (const mode of [0,1,2,3]) for (const reduced of [false,true]) {
  const app = new Harness(); app.save.selectedMode=mode; app.reduced=reduced;
  const cabinet=app.surface, backdrop=app.cabinetBackdrop, board=app.board, keeper=backdrop.getComponent(KeeperGestureView);
  const original=JSON.stringify(app.save); app.showWin(tier);
  const overlay=app.activeOverlay as TestNode;
  assert.equal(overlay.parent,cabinet); assert.equal(backdrop.isValid,true); assert.equal(board.isValid,true);
  assert.equal(backdrop.getComponent(KeeperGestureView),keeper); assert.equal(app.surface,cabinet);
  assert.ok(app.cues.includes(tier)); assert.equal(app.statusLabel.node.active,false);
  const mount=overlay.children.find(n=>n.name==='Source-registered cabinet celebration')!;
  const effects=mount.children.find(n=>n.name==='Cabinet treasure cascades')!;
  const title=mount.children.find(n=>n.name===context.PRIZE_TITLES[tier])!;
  const plaque=mount.children.find(n=>n.name===`hud-inlay-${mode}`)!;
  for (let part=0;part<4;part++) { const ornament=mount.children.find(n=>n.name===`prize-ornament-${mode}-${part}`)!; assert.ok(ornament); assert.ok(mount.children.indexOf(ornament)<mount.children.indexOf(title),'Sculpture is behind legible live copy'); }
  assert.ok(mount.children.indexOf(effects)<mount.children.indexOf(title),'Gold is composited behind lettering, never over it');
  assert.ok(mount.children.indexOf(title)<mount.children.indexOf(plaque),'Opaque inlay isolates the live amount from every gold/light layer');
  const controller=overlay.getComponentInChildren(CabinetWinView)!;
  assert.equal(controller.motion!.capacity,reduced?0:tier==='big'?192:280);
  assert.equal(controller.layers.bursts,reduced?0:tier==='super'?6:4); assert.equal(controller.layers.aureole,!reduced);
  assert.equal(controller.layers.heroes,reduced?0:tier==='super'?7:3);
  assert.equal(controller.layers.heroGlints,controller.layers.heroes);
  assert.equal(controller.layers.salutes,reduced?0:tier==='super'?96:48);
  for (const piece of mount.children.filter(n=>n.name==='prize-ingot'||n.name.startsWith('prize-jewel-'))) {
    assert.ok(mount.children.indexOf(piece)<mount.children.indexOf(title),'Large treasures remain behind all readable lettering');
    if(piece.name.startsWith('prize-jewel-')) assert.equal(piece.name,`prize-jewel-${mode}`);
    const fixtureSize=piece.getComponent(UITransform)!;
    assert.equal(fixtureSize.width,fixtureSize.height,'No stretched ingots or jewels');
  }
  const foreground=mount.children.find(n=>n.name==='Foreground gold over treasury')!;
  assert.ok(mount.children.indexOf(foreground)>mount.children.indexOf(mount.children.find(n=>n.name===`prize-ornament-${mode}-1`)!), 'Foreground gold crosses physical treasure plateau');
  assert.ok(mount.children.indexOf(foreground)<mount.children.indexOf(title), 'Foreground coins still stay behind title/amount');
  const fireworks=mount.children.filter(n=>n.name==='fx-prize-firework');
  assert.equal(fireworks.length,reduced?0:tier==='super'?6:4);
  for(const firework of fireworks) {
    assert.ok(mount.children.indexOf(firework)<mount.children.indexOf(title));
    assert.ok(mount.children.indexOf(firework)>mount.children.indexOf(mount.children.find(n=>n.name===`prize-ornament-${mode}-3`)!), 'Fireworks are not buried beneath opaque sculpture');
  }
  assert.equal(controller.layers.jets,reduced?0:2);assert.equal(controller.layers.streamers,reduced?0:2);
  assert.equal(controller.layers.treasures,reduced?0:tier==='big'?12:20);assert.equal(controller.layers.treasureGlints,controller.layers.treasures);
  if(!reduced){
    assert.ok(foreground.children.some(n=>n.name===`prize-jewel-${mode}`));
    for(const n of foreground.children.filter(n=>n.name.startsWith('prize-jewel-'))) assert.equal(n.name,`prize-jewel-${mode}`,'Room-matched jewels, not the wrong mascot/theme');
    assert.ok(foreground.children.filter(n=>n.name==='coin').length/effects.children.concat(foreground.children).filter(n=>n.name==='coin').length>=.75, 'Visible gold in front of the physical carving');
  }
  assert.equal(controller.layers.rays,reduced?0:2); assert.equal(controller.layers.sparkles,reduced?0:tier==='big'?12:20);
  assert.equal([...app.scheduled.values()].filter(seconds => seconds === controller.motion!.holdTime).length, 1,
    'Manual and reduced awards both own exactly one automatic-dismiss cue');
  if (!reduced) for (const [fn, seconds] of [...app.scheduled.entries()]) {
    if (seconds >= controller.motion!.holdTime) continue; // exercise manual early-close before the deadline
    app.scheduled.delete(fn); fn();
  }
  if (!reduced) assert.equal(app.count.target,1500);
  const label=app.activeWinAmount;
  app.closeWin(); app.closeWin();
  assert.equal(app.sounds.filter((s:string)=>s==='collect').length,1,'Repeated collect is idempotent');
  assert.equal(JSON.stringify(app.save),original,'No payout or balance mutation during presentation');
  assert.equal(app.scheduled.size,0,'All cues/counter callbacks cancelled');
  if (!reduced) {assert.equal(controller.held,true,'Keep current coins while fading instead of abrupt removal');assert.equal(overlay.isValid,true);assert.equal(app.queueCalls,0);fadeComplete!();}
  assert.equal(app.activeOverlay,undefined); assert.equal(app.surface,cabinet); assert.equal(board.isValid,true); assert.equal(backdrop.isValid,true);
  assert.equal(app.statusLabel.node.active,true); assert.equal(label.string,'1,500 COINS'); assert.equal(app.queueCalls,1);
  assert.equal(app.walletLabel.string,'COINS 310,728');
  assert.equal(app.cabinetFeatureLabel.string,['TIDE 2','PATH 2','FORGE 17/60','SEALS 2/3'][mode],'Feature control refreshes without remounting cabinet'); assert.equal(app.winLabel.string,'WIN 1,500');
}
const interrupted = new Harness(); interrupted.showWin('super'); const c=interrupted.activeOverlay.getComponentInChildren(CabinetWinView);
interrupted.clearWinTimeline(); assert.equal(c.finished,true); assert.equal(interrupted.activeWinAmount,undefined); assert.equal(interrupted.scheduled.size,0);
interrupted.closeWin(); fadeComplete!(); assert.equal(interrupted.board.isValid,true);
const ordinary = new Harness(); ordinary.showWin('ordinary'); assert.equal(ordinary.ordinaryRouted,true);

// Preserve the actual production ordinary-award choreography, not only its
// dispatch stub. No browser wager, save injection or second settlement.
const OrdinaryHarness = vm.runInNewContext(ts.transpileModule(`
class OrdinaryHarness extends Harness {
  fountains=[];
  cabinetPoint(x,y){return [(x-512)*this.gameBackdropScale,(768-y)*this.gameBackdropScale];}
  treasureFountains(parent,count,origin){this.fountains.push({parent,count,origin});}
  ${method('showCabinetWin')}
} OrdinaryHarness;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,
  {...context,Harness,node:vm.runInNewContext(ts.transpileModule(`${helper('node')} node;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context),
    opacity:vm.runInNewContext(ts.transpileModule(`${helper('opacity')} opacity;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,context)});
for (const room of [0,1,2,3]) for (const reduced of [false,true]) {
  const app=new OrdinaryHarness();app.save.selectedMode=room;app.reduced=reduced;app.round={award:250};
  const original=JSON.stringify(app.save),surface=app.surface,board=app.board;
  app.showWin('ordinary');
  assert.equal(app.activeOverlay.parent,surface);
  assert.equal(app.activeOverlay.name,'Win · ordinary');
  assert.equal(app.count.target,250);assert.equal(app.count.duration,1.15);
  assert.ok(app.sounds.includes('ordinary'));
  assert.equal(app.fountains.length,reduced?0:1);
  if(!reduced){assert.equal(app.fountains[0].count,12);assert.equal(app.fountains[0].parent.parent.scale.x,app.gameBackdropScale);}
  assert.equal(app.scheduled.size,1);
  assert.equal([...app.scheduled.values()][0],reduced?1.1:2.35);
  const timer=[...app.scheduled.keys()][0];app.scheduled.delete(timer);timer();
  if(!reduced)fadeComplete!();
  assert.equal(app.activeOverlay,undefined);assert.equal(app.board,board);assert.equal(app.surface,surface);
  assert.equal(app.statusLabel.node.active,true);assert.equal(JSON.stringify(app.save),original);
  assert.equal(app.sounds.filter((s:string)=>s==='collect').length,1);assert.equal(app.queueCalls,1);
}
console.log('PASS production ordinary awards: all four rooms, local 12-coin return, readable counter/hold, reduced motion, idempotent collection and unchanged wallet/board');

// Execute the production owned cue without touching the collect control.
// All rooms, both tiers, both motion policies and manual/AUTO retire once.
for (const tier of ['big', 'super'] as const) for (const mode of [0,1,2,3])
  for (const reduced of [false,true]) for (const autoRemaining of [0,4]) {
    const app = new Harness(); app.save.selectedMode=mode; app.reduced=reduced; app.autoRemaining=autoRemaining;
    const original=JSON.stringify(app.save), cabinet=app.surface, board=app.board, backdrop=app.cabinetBackdrop;
    app.showWin(tier); const overlay=app.activeOverlay as TestNode;
    const motion=overlay.getComponentInChildren(CabinetWinView)!.motion!;
    const amount=app.activeWinAmount;
    const deadline=motion.holdTime;
    assert.ok(Math.abs(deadline - (tier==='big' ? 7.08 : 8.88)) < 1e-9);
    assert.ok(deadline >= .26 + (tier==='big' ? 6.50 : 8.35), 'Automatic close retains the full orchestral score');
    const closing=[...app.scheduled.entries()].filter(([,seconds])=>seconds===deadline);
    assert.equal(closing.length,1);
    for(const [fn,seconds] of [...app.scheduled.entries()].sort((a,b)=>a[1]-b[1])) {
      if(seconds>=deadline)continue;
      app.scheduled.delete(fn);fn();
      assert.equal(app.activeOverlay,overlay,'No premature dismissal during count/encore');
      assert.equal(app.sounds.filter((s:string)=>s==='collect').length,0);
    }
    const dismiss=closing[0][0];app.scheduled.delete(dismiss);dismiss();
    dismiss();app.closeWin(); // late timer/tap race is idempotent, including during fade
    assert.equal(app.sounds.filter((s:string)=>s==='collect').length,1);
    assert.equal(app.scheduled.size,0);
    assert.equal(amount.string,'1,500 COINS');
    if(!reduced){assert.equal(app.activeOverlay,overlay);assert.equal(app.queueCalls,0);fadeComplete!();}
    assert.equal(app.activeOverlay,undefined);assert.equal(app.queueCalls,1);
    assert.equal(app.surface,cabinet);assert.equal(board.isValid,true);assert.equal(backdrop.isValid,true);
    assert.equal(app.statusLabel.node.active,true);assert.equal(JSON.stringify(app.save),original);
  }
// A cancelled old timer must not dismiss a newer award.
const replaced = new Harness();replaced.showWin('big');
const oldDismiss=[...replaced.scheduled.entries()].find(([,seconds])=>seconds===new CabinetWinMotion('big').holdTime)![0];
replaced.closeWin();fadeComplete!();replaced.showWin('super');const newer=replaced.activeOverlay;
oldDismiss();assert.equal(replaced.activeOverlay,newer);assert.equal(replaced.winClosing,false);
replaced.closeWin();fadeComplete!();assert.equal(replaced.queueCalls,2);

// Hide cancels the cue; foreground must not leave that modal trapped forever.
const lifecycleMember=(name:string)=>cls.members.find(m=>ts.isPropertyDeclaration(m)&&m.name.getText(tree)===name)!.getText(tree);
const ForegroundHarness=vm.runInNewContext(ts.transpileModule(`
class ForegroundHarness extends Harness {
  bootReady=true;spinning=false;musicSuspended=false;spinToken=0;renderCalls=0;
  completeSurfaceTransition(){} settleCurrentRound(){} cancelSpin(){} setBoard(){}
  persist(){throw new Error('Presentation resume cannot write a payout');}
  render(){this.renderCalls++;}
  ${lifecycleMember('onHide')}
  ${lifecycleMember('onShow')}
} ForegroundHarness;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{Harness});
for(const tier of ['big','super'] as const)for(const reduced of [false,true]) {
  const app=new ForegroundHarness();app.reduced=reduced;const original=JSON.stringify(app.save);
  app.showWin(tier);app.onHide();assert.equal(app.scheduled.size,0);
  app.onShow();if(!reduced)fadeComplete!();
  assert.equal(app.activeOverlay,undefined);assert.equal(app.queueCalls,1);
  assert.equal(app.renderCalls,0,'Foreground award retirement keeps the same original cabinet');
  assert.equal(JSON.stringify(app.save),original);
}
const giftForeground=new ForegroundHarness();giftForeground.activeOverlay=new TestNode('Daily gift');
giftForeground.onShow();assert.equal(giftForeground.activeOverlay.name,'Daily gift','Do not auto-dismiss unrelated claim modals');
console.log('PASS automatic BIG/SUPER dismissal: 32 room/motion/manual/AUTO cases, full score + readable final hold, once-only fade/queue, early collect, obsolete timer and foreground recovery without save mutation');
for (const forbidden of ['this.background(','this.render(','startSurface(','setPresentationHidden(','PRIZE_STAGES[']) assert.ok(!method('showWin').includes(forbidden),'No page-swap route in showWin');
for (const forbidden of ['this.render(','this.persist(','settleSpin(','reserveSpin(']) assert.ok(!method('closeWin').includes(forbidden),'Collect remains presentation-only');
assert.ok(!method('cabinetCollectControl').includes('this.image(') && !method('cabinetCollectControl').includes('this.cabinetSpinButton('),'Reuse original physical button without stacking ambient tween targets');
assert.ok(method('persist').includes('!this.winPreview'),'QA never writes user storage');
assert.ok(method('spin').indexOf('if (this.winPreview)') < method('spin').indexOf('createRound('),'QA does not reserve real rounds');
console.log('PASS in-cabinet BIG/SUPER: 5 cadences, continuous pooled coin arcs, 7 viewports, original scene/board/keeper identity in 16 mode-motion combinations, idempotent local collect, HUD/cue cleanup, AUTO, reduced/hide safety and read-only QA');

// Execute the PRODUCTION view class, including original-opacity ownership and
// restoration; testing just a fake view would miss permanent dimmed symbols.
const viewSource=readFileSync('assets/scripts/ui/CabinetWinView.ts','utf8');
const viewTree=ts.createSourceFile('View.ts',viewSource,ts.ScriptTarget.Latest,true);
const viewClass=viewTree.statements.find(s=>ts.isClassDeclaration(s)&&s.name?.text==='CabinetWinView') as ts.ClassDeclaration;
const viewBody=viewClass.members.map(member=>member.getText(viewTree)).join('\n');
class ViewOpacity { opacity=255;isValid=true;node!:TestNode;destroy(){this.isValid=false;this.node.components.delete(ViewOpacity);} }
const ActualView=vm.runInNewContext(ts.transpileModule(`class ActualView { ${viewBody} } ActualView;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,
  {CabinetWinMotion,CABINET_WIN_TITLE,CABINET_WIN_RAYS,CABINET_WIN_LIGHTS,CABINET_WIN_AUREOLE,UIOpacity:ViewOpacity,Math,document:undefined});
for(const exit of ['finish','destroy','hold-destroy'] as const) {
  const v=new ActualView(),m=new CabinetWinMotion('super');
  const title=new TestNode('Title'),amount=new TestNode('Count'),existing=new TestNode('Reel with original opacity'),bare=new TestNode('Reel without opacity');
  const alpha=existing.addComponent(ViewOpacity);alpha.opacity=187;
  const sculptures=CABINET_WIN_ORNAMENTS.map((_,i)=>new TestNode(`Ornament ${i}`));
  const coords=JSON.stringify([existing.position,existing.scale,bare.position,bare.scale]);
  const fireworks=CABINET_WIN_BURSTS.map((_,i)=>new TestNode(`Firework ${i}`)),aureole=new TestNode('Aureole');
  const coins=Array.from({length:m.capacity},(_,i)=>new TestNode(`Coin ${i}`));
  const jets=CABINET_WIN_JETS.map((_,i)=>new TestNode(`Jet ${i}`));
  const streamers=CABINET_WIN_STREAMERS.map((_,i)=>new TestNode(`Streamer ${i}`));
  const treasures=Array.from({length:m.treasureCapacity},(_,i)=>new TestNode(`Treasure ${i}`));
  const glints=treasures.map((_,i)=>new TestNode(`Glint ${i}`));
  const heroes=m.heroFixtures.map((_,i)=>new TestNode(`Hero ${i}`));
  const heroGlints=heroes.map((_,i)=>new TestNode(`Hero facet ${i}`));
  const salutes=Array.from({length:m.saluteCapacity},(_,i)=>new TestNode(`Flying firework ${i}`));
  v.initialize(m,title,[amount],coins,[],[],[],[existing,bare],sculptures,fireworks,aureole,jets,streamers,treasures,glints,heroes,heroGlints,salutes);v.update(.25);v.update(.25);v.update(.25);
  assert.ok(alpha.opacity<100,'Original reel symbols soften under live title');
  assert.ok(sculptures.every(n=>n.getComponent(ViewOpacity)),'Production view owns and animates the four sculpture bindings');
  assert.ok(bare.getComponent(ViewOpacity));
  assert.ok(aureole.getComponent(ViewOpacity)!.opacity>0);
  assert.ok(fireworks.some(n=>n.getComponent(ViewOpacity)!.opacity>0),'Actual generated fireworks expand in production view');
  assert.ok(jets.some(n=>n.getComponent(ViewOpacity)!.opacity>0),'Plumes are connected to the actual view');
  assert.ok(streamers.some(n=>n.getComponent(ViewOpacity)!.opacity>0));
  const coinPose:WinCoinPose={x:0,y:0,size:0,alpha:0,angle:0,squeeze:1};
  m.coin(0,coinPose);assert.ok(coinPose.alpha>0);assert.ok(Math.abs(coins[0].scale.y-coinPose.size/64)<1e-9,'Actual dynamic source-pixel size, not discarded pose.size');
  for(let i=0;i<120;i++)v.update(1/120);
  assert.ok(treasures.some(n=>n.getComponent(ViewOpacity)!.opacity>0),'Actual generated jewels move in foreground');
  assert.ok(heroes.slice(0,5).every(n=>n.getComponent(ViewOpacity)!.opacity>0),'First-act treasures are wired into the production view');
  assert.ok(heroes.slice(5).every(n=>n.getComponent(ViewOpacity)!.opacity===0),'SUPER reserves the treasury opening for its distinct second act');
  for(let i=0;i<5;i++) {m.hero(i,ornamentPose);assert.ok(Math.abs(heroes[i].position.x-(ornamentPose.x-512))<1e-9);assert.ok(Math.abs(heroes[i].scale.x-ornamentPose.scaleX)<1e-9);}
  for(let i=0;i<72;i++)v.update(1/120);
  assert.ok(salutes.some(n=>n.getComponent(ViewOpacity)!.opacity>0),'Actual flying fireworks, not unused nodes or only a QA counter');
  for(let i=0;i<120*5;i++)v.update(1/120);
  assert.ok(heroes.every(n=>n.getComponent(ViewOpacity)!.opacity>0),'Second-act ingots actually emerge in the real view');
  if(exit==='finish'){v.finish();assert.equal(aureole.getComponent(ViewOpacity)!.opacity,0);assert.ok(fireworks.every(n=>n.getComponent(ViewOpacity)!.opacity===0));assert.ok([...coins,...jets,...streamers,...treasures,...glints,...heroes,...heroGlints,...salutes].every(n=>n.getComponent(ViewOpacity)!.opacity===0),'Fast-forward clears every new pool');}
  else {if(exit==='hold-destroy'){const a=alpha.opacity;v.hold();v.update(1);assert.equal(alpha.opacity,a,'Fade dismissal freezes the composed image');}v.onDestroy();}
  assert.equal(alpha.opacity,187,'Restore precisely, not blindly to 255');
  assert.equal(existing.getComponent(ViewOpacity),alpha,'Never remove pre-existing opacity components');
  assert.equal(bare.getComponent(ViewOpacity),undefined,'Remove only the opacity component owned by the prize view');
  assert.equal(JSON.stringify([existing.position,existing.scale,bare.position,bare.scale]),coords,'Original transform never moves');
  v.onDestroy(); // double cleanup safe
}
console.log('PASS production CabinetWinView: staged crescendo, peak-density clearance, pooled rays/glints; finish/destroy/fade cancellation restores exact original opacity and never transforms cabinet/reels');

// Run the real elapsed-time counter, not the showWin harness stub. Scheduler
// cadence can differ from rendering; finale must still land on the exact value.
const CounterHarness=vm.runInNewContext(ts.transpileModule(`
class CounterHarness {
  reduced=false; scheduled=new Map(); sounds=[];
  rewardAudio={play:(cue)=>this.sounds.push(cue)};
  schedule(fn,interval){this.scheduled.set(fn,interval);}
  unschedule(fn){this.scheduled.delete(fn);}
  ${method('countUp')}
} CounterHarness;`,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText,{tr:context.tr,Math,Number});
for(const hz of [5,15,30,60,120]) {
  const counter=new CounterHarness(),label={node:{isValid:true},string:''};
  counter.countUp(label,6000,4.7);let elapsed=0,previous=0;
  while(counter.scheduled.size && elapsed<5) {
    const step=Math.min(1/hz,4.7-elapsed);if(step<=0)break;
    const callback=counter.winCounterTick;callback(step);elapsed+=step;
    const value=Number(label.string.replace(/[^0-9]/g,''));assert.ok(value>=previous && value<=6000);previous=value;
  }
  // Floating-point accumulation can leave <1e-12s; one harmless residual tick.
  if(counter.scheduled.size)counter.winCounterTick(1e-9);
  assert.equal(label.string,'6,000 COINS');assert.equal(counter.scheduled.size,0);
  assert.equal(counter.sounds.filter(s=>s==='complete').length,1);
}
const counter=new CounterHarness(),a={node:{isValid:true},string:''},b={node:{isValid:true},string:''};
counter.countUp(a,1500,3.4);const old=counter.winCounterTick;counter.countUp(b,6000,4.7);
assert.equal(counter.scheduled.has(old),false,'Replacement cancels the old counter');
counter.winCounterTick(NaN);counter.winCounterTick(-1);assert.equal(b.string,'0 COINS');
b.node.isValid=false;counter.winCounterTick(.1);assert.equal(counter.scheduled.size,0,'Destroyed label cancels scheduler');
counter.reduced=true;counter.countUp(a,1500,3.4);assert.equal(a.string,'1,500 COINS');assert.equal(counter.winCounterTick,undefined);
console.log('PASS production countUp: 5 scheduler cadences, monotonic exact finish, once-only completion, replacement/destruction/reduced cancellation');

// The added spectacle is choreographed and readable, not extra static stickers.
for(const tier of ['big','super'] as const)for(const room of [0,1,2,3]){
  let maxJewels=0,maxGold=0,jetPeaks=0;const m=new CabinetWinMotion(tier,false,room);
  const p:WinCoinPose={x:0,y:0,size:0,alpha:0,angle:0,squeeze:1};
  const o:WinOrnamentPose={x:0,y:0,alpha:0,angle:0,scaleX:1,scaleY:1};
  const previous:Array<WinCoinPose|undefined>=[];
  for(let frame=0;frame<120*12;frame++){
    m.step(1/120);let jewels=0,gold=0;
    for(let i=0;i<m.treasureCapacity;i++){
      m.treasure(i,p);for(const v of Object.values(p))assert.ok(Number.isFinite(v));
      assert.ok(p.alpha>=0&&p.alpha<=250);
      if(p.alpha>120){jewels++;assert.ok(protectionOpacity(CABINET_WIN_COPY,p.x,p.y,p.size*.54,p.size*.54,14)>.45,'Orbit jewels are visually separate from title and amount');}
      if(p.alpha&&previous[i]?.alpha)assert.ok(Math.hypot(p.x-previous[i]!.x,p.y-previous[i]!.y)<3.4,'No orbital teleports');
      previous[i]={...p};
    }
    for(let i=0;i<m.capacity;i++){
      m.coin(i,p);if(p.alpha>160&&protectionOpacity(CABINET_WIN_CLEARANCE,p.x,p.y,Math.SQRT2*p.size/2)>.55)gold++;
    }
    maxJewels=Math.max(maxJewels,jewels);maxGold=Math.max(maxGold,gold);
    for(let i=0;i<2;i++){
      m.jet(i,o);for(const v of Object.values(o))assert.ok(Number.isFinite(v));
      assert.ok(Math.abs(Math.abs(o.scaleX)-o.scaleY)<1e-10,'No stretched embedded coins in plume');
      if(o.alpha>120){jetPeaks++;const h=CABINET_WIN_JETS[i][3]*o.scaleY;assert.ok(o.y-h/2>438&&o.y+h/2<896,'Plumes clear keeper/control shelf');}
      m.streamer(i,o);if(o.alpha>0){const f=CABINET_WIN_STREAMERS[i];const radiusY=(f[3]*o.scaleY/2)+Math.abs(Math.sin(o.angle*Math.PI/180)*f[2]*o.scaleX/2);assert.ok(o.y-radiusY>438&&o.y+radiusY<896,'Silk accent never crosses keeper or HUD');}
    }
    for(let i=0;i<m.burstCapacity;i++){
      m.burst(i,burstPose);if(!burstPose.alpha)continue;const f=CABINET_WIN_BURSTS[i],radius=Math.hypot(f[2],f[3])*burstPose.scale/2;assert.ok(burstPose.y-radius>438&&burstPose.y+radius<896,'Foreground fireworks do not touch keeper/control zone');
    }
  }
  assert.ok(maxGold>=(tier==='super'?40:38),`Actually clear moving gold: ${tier}/${room}, ${maxGold}`);
  assert.ok(maxJewels>=(tier==='super'?7:4),`Actually clear moving treasure: ${tier}/${room}, ${maxJewels}`);
  assert.ok(jetPeaks>200,'Each tier contains sustained synchronized launches, not a single pop');
  assert.equal(m.phase,'hold');m.finish();m.jet(0,o);assert.equal(o.alpha,0);m.streamer(0,o);assert.equal(o.alpha,0);m.treasure(0,p);assert.equal(p.alpha,0);
  const poses:Array<{j:WinOrnamentPose;t:WinCoinPose}>=[];
  for(const fps of [5,15,30,60,120]){const cadence=new CabinetWinMotion(tier,false,room);for(let i=0;i<fps*2;i++)cadence.step(1/fps);cadence.jet(0,o);cadence.treasure(3,p);poses.push({j:{...o},t:{...p}});}
  for(const a of poses.slice(1))for(const key of ['x','y','angle','scaleX','scaleY'] as const)assert.ok(Math.abs(a.j[key]-poses[0].j[key])<1e-8);
  for(const a of poses.slice(1))for(const key of ['x','y','angle','size','alpha'] as const)assert.ok(Math.abs(a.t[key]-poses[0].t[key])<1e-8);
  const reduced=new CabinetWinMotion(tier,true,room);assert.equal(reduced.treasureCapacity,0);reduced.jet(0,o);assert.equal(o.alpha,0);reduced.streamer(0,o);assert.equal(o.alpha,0);
}
console.log('PASS luxury crescendo: visible foreground coin banks, independently glinting room jewels, synchronized rigid plumes/silk, protected keeper/HUD/copy, extra SUPER encore, five cadences and all new pool cleanup');

// Spatial spectacle regression: all four rooms, large real displacement,
// frame-independent curved rise, discrete radial fragments, finite ownership.
for (const tier of ['big', 'super'] as const) for (const room of [0,1,2,3]) {
  const m = new CabinetWinMotion(tier,false,room);
  assert.equal(m.heroFixtures.length,tier==='super'?7:3);
  assert.equal(m.saluteCapacity,tier==='super'?96:48);
  const first: (WinOrnamentPose|undefined)[] = [], last: (WinOrnamentPose|undefined)[] = [];
  const previous: (WinOrnamentPose|undefined)[] = [];
  let maxVisible = 0, flights=0;
  for(let frame=0;frame<120*12;frame++) {
    m.step(1/120);
    for(let i=0;i<m.heroFixtures.length;i++) {
      m.hero(i,ornamentPose);
      for(const value of Object.values(ornamentPose))assert.ok(Number.isFinite(value));
      assert.ok(Math.abs(ornamentPose.scaleX-ornamentPose.scaleY)<1e-10,'Hero artwork remains rigid, not a balloon deformation');
      assert.ok(ornamentPose.alpha>=0&&ornamentPose.alpha<=255);
      if(ornamentPose.alpha>200) {
        if(!first[i])first[i]={...ornamentPose};
        last[i]={...ornamentPose};
        assert.ok(ornamentPose.x>50&&ornamentPose.x<974&&ornamentPose.y>476&&ornamentPose.y<850);
      }
      if(previous[i]?.alpha&&ornamentPose.alpha)assert.ok(Math.hypot(ornamentPose.x-previous[i]!.x,ornamentPose.y-previous[i]!.y)<5.2,'Continuous rise, no cut or teleported hero');
      previous[i]={...ornamentPose};
    }
    let count=0;
    for(let i=0;i<m.saluteCapacity;i++) {
      m.salute(i,pose);
      if(!pose.alpha)continue;
      flights++;
      for(const value of Object.values(pose))assert.ok(Number.isFinite(value));
      assert.ok(pose.x>10&&pose.x<1014&&pose.y>438&&pose.y<896);
      if(pose.alpha>80)count++;
    }
    maxVisible=Math.max(maxVisible,count);
  }
  assert.ok(Math.hypot(first[0]!.x-last[0]!.x,first[0]!.y-last[0]!.y)>210,'Large visible treasure ascent, not micro-pulsing a static picture');
  assert.ok(maxVisible>=(tier==='super'?52:26),'Genuinely visible independent firework fragments in both tiers');
  assert.ok(flights>2000);m.salute(0,pose);assert.equal(pose.alpha,0,'No ambient infinite fireworks after award');
  m.finish();for(let i=0;i<m.heroFixtures.length;i++){m.hero(i,ornamentPose);assert.equal(ornamentPose.alpha,0);}
  const reduced=new CabinetWinMotion(tier,true,room);assert.equal(reduced.heroFixtures.length,0);assert.equal(reduced.saluteCapacity,0);
  for(const t of [1,2,6.5]) {
    const samples: {hero:WinOrnamentPose,salute:WinCoinPose}[]=[];
    for(const fps of [5,15,30,60,120]) {
      const cadence=new CabinetWinMotion(tier,false,room);
      for(let n=0;n<Math.floor(fps*t);n++)cadence.step(1/fps);
      const remainder=t-Math.floor(fps*t)/fps;if(remainder>1e-10)cadence.step(remainder);
      cadence.hero(0,ornamentPose);cadence.salute(3,pose);samples.push({hero:{...ornamentPose},salute:{...pose}});
    }
    for(const sample of samples.slice(1)) {
      for(const key of ['x','y','angle','scaleX','scaleY','alpha'] as const)assert.ok(Math.abs(sample.hero[key]-samples[0].hero[key])<1e-7);
      if(samples[0].salute.alpha)for(const key of ['x','y','size','squeeze','angle','alpha'] as const)assert.ok(Math.abs(sample.salute[key]-samples[0].salute[key])<1e-7);
    }
  }
}
console.log('PASS spatial spectacle: 3-piece BIG / 7-piece SUPER, >210px treasure rise, 48/96 real flying firework fragments, fixed aspect/clear copy, exact production bindings, 5 cadences, finite/reduced/collect cleanup');
