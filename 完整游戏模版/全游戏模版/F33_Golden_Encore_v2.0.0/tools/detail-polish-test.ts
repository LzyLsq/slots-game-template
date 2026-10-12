import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { ControlTap } from '../assets/scripts/ui/ControlTap';
import { LoadingProgress, loadingTitleY } from '../assets/scripts/ui/LoadingProgress';
import { cabinetViewport } from '../assets/scripts/ui/CabinetViewport';
import { CABINET_TITLE_SLOTS } from '../assets/scripts/ui/KeeperClearance';
import { KEEPER_RIGS } from '../assets/scripts/ui/KeeperGesture';

for (const radius of [0, 4, 11, 12]) {
  const tap = new ControlTap(); assert.ok(tap.begin(1, 20, 30));
  assert.ok(tap.end(1, 20 + radius, 30)); assert.ok(!tap.end(1, 20, 30));
}
for (const [x,y] of [[13,0],[0,13],[10,10],[NaN,0],[0,Infinity]]) {
  const tap = new ControlTap(); tap.begin(1,0,0); assert.ok(tap.move(1,x,y));
  assert.ok(!tap.move(1,0,0)); assert.ok(!tap.end(1,0,0),'An out-and-back drag never re-arms');
}
const tap = new ControlTap(); assert.ok(!tap.begin(1,NaN,0)); assert.ok(tap.begin(1,0,0));
assert.ok(!tap.begin(2,0,0)); assert.ok(!tap.cancel(2)); assert.ok(!tap.end(2,0,0));
assert.ok(tap.owns(1)); assert.ok(tap.cancel(1)); assert.ok(!tap.end(1,0,0));
assert.ok(tap.begin(2,0,0)); assert.ok(tap.end(2,0,0));

for (const fps of [10,30,60,120]) for (const reduced of [false,true]) {
  const progress = new LoadingProgress(reduced); let previous = progress.value;
  for (let i=0;i<fps*3;i++) {
    if (i===fps) progress.advance(.82);
    if (i===fps*2) progress.advance(.94);
    progress.advance(-1); progress.advance(NaN); progress.advance(Infinity);
    const value=progress.step(1/fps); assert.ok(value>=previous && value<=.94); previous=value;
  }
  progress.advance(1); for(let i=0;i<fps;i++)progress.step(1/fps);
  assert.ok(progress.value<=.98 && progress.percent<100,'No 100% while animation/material work is outstanding');
  progress.complete(); for(let i=0;i<fps;i++)progress.step(1/fps);
  assert.equal(progress.value,1); assert.equal(progress.percent,100);
  progress.advance(0); assert.equal(progress.step(NaN),1); assert.equal(progress.step(-1),1);
}

// Production camera framing, including the square-window crop found visually.
const viewportSizes = [[320,568],[375,812],[390,844],[430,932],[739,766],[1024,768],[1280,720]];
for (const [w,h] of viewportSizes) {
  const root=Math.min(w/1024,h/1800), layout=cabinetViewport(w/root,h/root);
  const s=layout.scale*root;
  const titleY=loadingTitleY(h/root);
  assert.ok(titleY+139+3+13<=h/root/2,'Complete loading wordmark including float/clearance');
  if(h/root>=1950)assert.equal(titleY,820,'Tall-phone loading placement retained');
  if(w/h<=2/3) {
    assert.equal(layout.scale,layout.cover,'Phone portrait framing is unchanged');
    assert.equal(layout.chromeScale,1); assert.equal(layout.walletY,-535); assert.equal(layout.utilityY,-710);
  } else {
    assert.ok(layout.wide); assert.ok(Math.abs(s*1536-h)<1e-8,'Complete source stage, not an enlarged/cropped cabinet');
  }
  const inside=(x:number,y:number,width:number,height:number)=> {
    assert.ok(w/2+(x-width/2)*root>=-1e-6 && w/2+(x+width/2)*root<=w+1e-6);
    assert.ok(h/2-(y+height/2)*root>=-1e-6 && h/2-(y-height/2)*root<=h+1e-6);
  };
  for(const [mode,slot] of CABINET_TITLE_SLOTS.entries()) {
    inside((slot[0]-512)*layout.scale,(768-slot[1])*layout.scale,slot[2]*layout.scale,(slot[3]+3.4)*layout.scale);
    const keeper=KEEPER_RIGS.cabinet[mode].bounds;
    inside(((keeper[0]+keeper[2])/2-512)*layout.scale,(768-(keeper[1]+keeper[3])/2)*layout.scale,
      (keeper[2]-keeper[0])*layout.scale,(keeper[3]-keeper[1])*layout.scale);
  }
  for(const x of [280,396,512,628,744])for(const y of [542,666,790])inside((x-512)*layout.scale,(768-y)*layout.scale,94*1.08*layout.scale,94*1.12*layout.scale);
  inside(0,layout.walletY,880*layout.chromeScale,82*layout.chromeScale);
  for(const x of [-302,0,302])inside(x*layout.chromeScale,layout.utilityY,230*layout.chromeScale,115*layout.chromeScale);
  assert.ok((768-1050)*layout.scale-24*layout.scale>layout.walletY+41*layout.chromeScale,'HUD clears live status');
  assert.ok(layout.walletY-41*layout.chromeScale>layout.utilityY+57.5*layout.chromeScale,'Utility buttons clear wallet');
}
for (let ratio=2/3;ratio<=1.02;ratio+=.0001) {
  const a=cabinetViewport(1800*ratio,1800),b=cabinetViewport(1800*(ratio+.0001),1800);
  assert.ok(Math.abs(a.walletY-b.walletY)<.2 && Math.abs(a.utilityY-b.utilityY)<.3,'Continuous secondary chrome registration');
}

// Execute the production binding, not a duplicate controller implementation.
const source=readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
const tree=ts.createSourceFile('App.ts',source,ts.ScriptTarget.Latest,true);
const appClass=tree.statements.find(s=>ts.isClassDeclaration(s)&&s.name?.text==='GoldenEncoreApp') as ts.ClassDeclaration;
const method=(name:string)=>appClass.members.find(m=>ts.isMethodDeclaration(m)&&m.name?.getText(tree)===name)!.getText(tree);
class TestNode {
  static EventType={TOUCH_START:'start',TOUCH_MOVE:'move',TOUCH_END:'end',TOUCH_CANCEL:'cancel'};
  isValid=true; callbacks=new Map<string,(event:unknown)=>void>();
  on(type:string,cb:(event:unknown)=>void){this.callbacks.set(type,cb);}
  emit(type:string,id:number,x:number,y:number){this.callbacks.get(type)?.({getID:()=>id,getLocation:()=>({x,y})});}
}
const Harness=vm.runInNewContext(ts.transpileModule(`class Harness { transitionLock=false; ${method('bindTap')} } Harness;`,{
  compilerOptions:{target:ts.ScriptTarget.ES2020}
}).outputText,{ControlTap,Node:TestNode});
const app=new Harness(), hit=new TestNode(); let actions=0,presses=0,releases=0;
app.bindTap(hit,()=>actions++,()=>presses++,()=>releases++);
hit.emit('start',1,10,10); hit.emit('start',2,10,10); hit.emit('end',2,10,10);
assert.equal(actions,0);assert.equal(presses,1);assert.equal(releases,0);
hit.emit('end',1,14,12); hit.emit('end',1,14,12);assert.equal(actions,1);assert.equal(releases,1);
hit.emit('start',3,10,10);hit.emit('move',3,40,10);assert.equal(releases,2,'Dragging cancels visual press immediately');
hit.emit('move',3,10,10);hit.emit('end',3,10,10);assert.equal(actions,1);
hit.emit('start',4,10,10);hit.emit('cancel',4,10,10);hit.emit('end',4,10,10);assert.equal(actions,1);
app.transitionLock=true;hit.emit('start',5,10,10);hit.emit('end',5,10,10);assert.equal(actions,1);
app.transitionLock=false;hit.isValid=false;hit.emit('start',6,10,10);hit.emit('end',6,10,10);assert.equal(actions,1);

const home=method('homePage'), rank=method('rankPage');
assert.match(home,/Treasury · add virtual coins/);assert.match(home,/'bet-plus-0'/);
assert.match(home,/this\.navigate\('store'\)/);assert.match(home,/selection\.opacity = i === index/);
assert.match(rank,/\['#2', 'PearlRiver', '21,100'\], \['#1', 'JadeMoth', '28,450'\], \['#3', 'KoiKeeper', '17,780'\]/);
assert.match(rank,/captain\.enableWrapText = false/);assert.match(rank,/MY RANK/);
for(const name of ['button','cabinetBetButton','cabinetSpinButton','cabinetUtilityButton','cabinetPanelControl','navigationDock','storePage'])assert.ok(method(name).includes('this.bindTap('),`${name} uses deliberate taps`);
assert.match(method('gamePage'),/for \(const label of \[this.walletLabel, this.betLabel, this.winLabel\]\) label.enableWrapText = false/);
assert.match(method('boot'),/progress\.advance\(\.03 \+ \.79/);
assert.ok(method('boot').indexOf('await taskGoldEffectReady')<method('boot').indexOf('progress.complete()'),'Loading completion includes optional material resolution');
assert.match(method('background'),/cabinetViewport\(logicalWidth, logicalHeight/);
assert.match(method('background'),/Cabinet wide-window ambient backplate/);
assert.match(method('cabinetUtilityButton'),/registration.setScale\(this.gameChromeScale/);
assert.match(method('gamePage'),/footer.setScale\(this.gameChromeScale/);
assert.match(method('update'),/this.sceneMusic.update\(dt\)/);
assert.match(method('update'),/meter.sprite.fillRange = meter.progress.step\(dt\)/);
console.log('PASS detail polish: deliberate tap/cancel/multitouch/transition guards, real production event binding, monotonic phase-aware loading at 4 cadences + reduced motion, generated add-coins entry, active room state, centre winner, single-line values, complete source-registered cabinet and safe loading title across 7 viewports');
