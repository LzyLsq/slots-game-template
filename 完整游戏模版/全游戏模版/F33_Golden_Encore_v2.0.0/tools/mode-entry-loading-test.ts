import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { MODE_ENTRY_MINIMUM, MODE_ENTRY_THEMES, MODE_ENTRY_WORK, ModeEntryLoading, modeEntryLayout } from '../assets/scripts/ui/ModeEntryLoading';
import { LANGUAGES, setLanguage, tr } from '../assets/scripts/ui/Language';
const cadences = [1/30, 1/60, 1/90, 1/120, .05];
let samples = 0;
for (const mode of [0,1,2,3] as const) {
  const theme = MODE_ENTRY_THEMES[mode];
  for (const name of [theme.scene,theme.title,theme.emblem]) assert.ok(existsSync(`assets/resources/art/${name}.png`));
  assert.ok(theme.scene.startsWith('hero-'), 'The loading scene never shows the cabinet');
  for (const { code } of LANGUAGES) { setLanguage(code); for (const key of [theme.preparing,theme.entering]) assert.ok(tr(key) && (code === 'en' || tr(key) !== key)); }
  for (const cadence of cadences) {
    const entry = new ModeEntryLoading(mode);
    let previous = entry.progress.value;
    entry.completeWork('cabinet'); entry.completeWork('cabinet'); assert.equal(entry.completedWork,1);
    entry.completeWork('symbols'); entry.completeWork('keeper');
    for(let i=0;i<Math.ceil(4/cadence);i++) {
      entry.step(cadence); samples++;
      assert.equal(entry.phase,'preparing'); assert.ok(entry.progress.value >= previous && entry.progress.value < 1); previous=entry.progress.value;
      assert.ok(Math.abs(entry.pose.x)<=6 && Math.abs(entry.pose.y)<=5 && Math.abs(entry.pose.angle)<=5);
    }
    const hold=entry.elapsed; entry.suspend();entry.step(10);assert.equal(entry.elapsed,hold);entry.resume();
    entry.completeWork('celebration'); assert.equal(entry.phase,'entering');
    entry.step(.1); assert.equal(entry.phase,'entering','Late work still gets a readable ready hold');
    for(let i=0;i<120;i++)entry.step(cadence);
    assert.equal(entry.phase,'complete');assert.equal(entry.progress.value,1);
    const done=entry.elapsed;entry.step(.1);assert.equal(entry.elapsed,done);
    const cached = new ModeEntryLoading(mode); MODE_ENTRY_WORK.forEach(work=>cached.completeWork(work));
    let duration=0;while(!cached.terminal) { cached.step(cadence);duration+=cadence;assert.ok(duration<5); }
    assert.ok(duration>=MODE_ENTRY_MINIMUM && duration<MODE_ENTRY_MINIMUM+cadence+.001,'Cached entry remains visibly animated, no fake work');
    const reduced=new ModeEntryLoading(mode,true);MODE_ENTRY_WORK.forEach(work=>reduced.completeWork(work));
    for(let i=0;i<Math.ceil(.3/cadence);i++)reduced.step(cadence);
    assert.equal(reduced.phase,'complete');assert.equal(reduced.pose.x,0);assert.equal(reduced.pose.y,0);assert.equal(reduced.pose.angle,0);
    const cancelled=new ModeEntryLoading(mode);cancelled.completeWork('symbols');cancelled.cancel();MODE_ENTRY_WORK.forEach(work=>cancelled.completeWork(work));cancelled.step(.1);
    assert.equal(cancelled.phase,'cancelled');assert.equal(cancelled.completedWork,1);
  }
  const stall=new ModeEntryLoading(mode); for(let i=0;i<181;i++)stall.step(.1);assert.equal(stall.phase,'failed','An unavailable room returns control rather than an infinite loading screen');
  const invalid=new ModeEntryLoading(mode);for(const dt of [NaN,Infinity,-1,0])invalid.step(dt);assert.equal(invalid.elapsed,0);
}
assert.equal(new Set(MODE_ENTRY_THEMES.map(t=>t.scene)).size,4);assert.equal(new Set(MODE_ENTRY_THEMES.map(t=>t.emblem)).size,4);
for(const [width,height] of [[320,568],[360,640],[390,844],[430,932],[739,766],[844,390]]) {
  const scale=Math.min(width/1024,height/1800);const logicalH=height/scale;const l=modeEntryLayout(logicalH);
  assert.ok(l.titleY+125<logicalH/2);assert.ok(l.panelY-85>-logicalH/2);assert.ok(l.tipY-22>-logicalH/2);
  assert.ok(l.tipY+22<l.panelY-85,'Footer never overlaps progress border');
}
const app=readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
assert.match(app,/if \(this.modeEntry\) \{ this.renderModeEntry\(this.modeEntry\); return; \}/,'Resize rerenders entry, not the old page');
assert.match(app,/this.modeEntry === entry/,'Obsolete async load completions are ignored');
assert.match(app,/this.modeEntry\?\.cancel\(\)/,'Owner destruction cancels the entry');
assert.match(app,/this.modeEntry\?\.suspend\(\)/);assert.match(app,/this.modeEntry\?\.resume\(\)/);
console.log(`PASS four generated theme entries, ${samples} preload samples, genuine/cached/late/reduced progress, visibility, cancellation, timeout, 5 languages and 6 responsive layouts`);

// Execute the real view adapter, not an alternate implementation. Its cropped
// generated frame is allocated once, never per render update, and destroyed
// without disposing the App's shared original art.
let frameCount=0;
class Frame { texture: unknown; rect: unknown; originalSize: unknown; offset: unknown; packable=false; destroyed=false; constructor(){frameCount++;}destroy(){this.destroyed=true;} }
class Rect { constructor(public x:number,public y:number,public width:number,public height:number){} }
class Size { constructor(public width:number,public height:number){} }
class Vec2 {}
class Color { constructor(public hex:string){} }
class Alpha {opacity=0;}
class Token {x=0;y=0;angle=0;alpha?:Alpha;setPosition(x:number,y:number){this.x=x;this.y=y;}getComponent(){return this.alpha;}addComponent(){return this.alpha=new Alpha();} }
const exports:Record<string,any>={};
vm.runInNewContext(ts.transpileModule(readFileSync('assets/scripts/ui/ModeEntryLoadingView.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,{
  exports, require(path:string){ if(path==='cc')return {_decorator:{ccclass:()=> (ctor:unknown)=>ctor},Component:class{},SpriteFrame:Frame,Rect,Size,Vec2,Color,UIOpacity:Alpha};
    if(path==='./ModeEntryLoading')return {ModeEntryLoading,MODE_ENTRY_THEMES};if(path==='./Language')return {tr};throw new Error(path); }
});
setLanguage('en');
for(const mode of [0,1,2,3] as const)for(const reduced of [false,true]){
 const original=new Frame();original.texture={generated:true};const before=frameCount;
 const motion=new ModeEntryLoading(mode,reduced);const view=new exports.ModeEntryLoadingView();
 const fill:any={fillRange:0};const caption={string:''};const emblem=new Token();const glint=new Token();
 view.initialize(motion,fill,caption,emblem,glint,original);
 assert.equal(frameCount,before+1);assert.deepEqual([fill.spriteFrame.rect.x,fill.spriteFrame.rect.y,fill.spriteFrame.rect.width,fill.spriteFrame.rect.height],[96,180,324,188]);
 assert.ok(caption.string.includes('3%'));MODE_ENTRY_WORK.forEach(work=>motion.completeWork(work));
 for(let i=0;i<180;i++){motion.step(1/60);view.apply();assert.ok(Math.abs(emblem.x+300)<=6);assert.ok(Math.abs(emblem.y)<=5);}
 assert.equal(fill.fillRange,1);assert.equal(caption.string,MODE_ENTRY_THEMES[mode].entering);assert.equal(frameCount,before+1,'No SpriteFrame allocations in update');
 const owned=fill.spriteFrame;view.onDestroy();assert.equal(owned.destroyed,true);assert.equal(original.destroyed,false);view.apply();
}
console.log('PASS actual loading view: generated core crop, localizable readable phase copy, bounded unique emblem motion, no per-frame allocation, owned-frame disposal');
