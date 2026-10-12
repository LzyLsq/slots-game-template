import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { HallAmbienceMotion, HALL_AMBIENT_COIN_COUNT, HALL_AMBIENT_COIN_SIZE, HALL_AMBIENCE_PROFILES, HALL_LIGHT_CORE } from '../assets/scripts/ui/HallAmbienceMotion';
import { KEEPER_RIGS } from '../assets/scripts/ui/KeeperGesture';
import type { HallMode } from '../assets/scripts/ui/HallFortuneMotion';

let samples=0, visible=0;
for(const mode of [0,1,2,3] as HallMode[]) for(const fps of [10,15,30,60,120]) {
  const model=new HallAmbienceMotion(mode), coin=model.coins[0], glow=model.glows[0];
  let old=model.coins.map(c=>({...c})), peaks=Array(model.fixtures.length).fill(0);
  for(let f=0;f<fps*30;f++) {
    model.step(1/fps);const keeper=KEEPER_RIGS.hall[mode].bounds;
    for(const [i,p] of model.glows.entries()) {
      for(const n of Object.values(p))assert.ok(Number.isFinite(n));
      assert.ok(p.alpha>=0&&p.alpha<=240);peaks[i]=Math.max(peaks[i],p.alpha);
      if(p.alpha>1) {
        const fixture=model.fixtures[i], rx=fixture.width*p.scaleX/2,ry=fixture.height*p.scaleY/2;
        assert.ok(p.x+rx<keeper[0] || p.x-rx>keeper[2] || p.y+ry<keeper[1] || p.y-ry>keeper[3],`${mode}/${fixture.kind} light never paints over keeper`);
      }
    }
    for(const [i,p] of model.coins.entries()) {
      for(const n of Object.values(p))assert.ok(Number.isFinite(n));
      assert.ok(p.alpha>=0&&p.alpha<=215);assert.ok(p.x>120&&p.x<915&&p.y>=590&&p.y<=807);
      assert.ok(p.scaleX>=.24&&p.scaleX<=1&&p.scaleY>=.76&&p.scaleY<=.91);
      if(p.alpha>5) {
        visible++;const radius=HALL_AMBIENT_COIN_SIZE*.72;
        assert.ok(p.x+radius<keeper[0] || p.x-radius>keeper[2] || p.y+radius<keeper[1] || p.y-radius>keeper[3]);
      }
      if(old[i].alpha>5&&p.alpha>5)assert.ok(Math.hypot(p.x-old[i].x,p.y-old[i].y)<8,'Continuous flight, no visible wrap or pose jump');
    }
    old=model.coins.map(c=>({...c}));samples++;
  }
  assert.equal(model.coins[0],coin);assert.equal(model.glows[0],glow);
  assert.equal(model.coins.length,HALL_AMBIENT_COIN_COUNT);
  for(const [i,peak] of peaks.entries())assert.ok(peak>100,`Mode ${mode}, ${fps}fps, ${model.fixtures[i].kind} ${i}: peak ${peak}; every registered light must remain visible outside keeper clearance`);
  const held=JSON.stringify([model.coins,model.glows]);model.suspend();
  for(let f=0;f<100;f++)model.step(10);
  assert.equal(JSON.stringify([model.coins,model.glows]),held,'Hidden views freeze without a visual reset');
  model.resume();model.step(NaN);model.step(Infinity);model.step(-1);
  assert.equal(JSON.stringify([model.coins,model.glows]),held,'Invalid frame deltas cannot corrupt the animation');
  model.step(60);assert.ok(model.coins.every((c,i)=>c.alpha<5||JSON.parse(held)[0][i].alpha<5||Math.abs(c.y-JSON.parse(held)[0][i].y)<8),'Resume clamps a long frame, not a catch-up shower');
  const reduced=new HallAmbienceMotion(mode,true),quiet=JSON.stringify([reduced.coins,reduced.glows]);
  for(let f=0;f<200;f++)reduced.step(1);
  assert.equal(JSON.stringify([reduced.coins,reduced.glows]),quiet);
  assert.ok(reduced.coins.every(c=>c.alpha===0));
}
for(const mode of [0,1,2,3] as HallMode[]) {
  const a=new HallAmbienceMotion(mode),b=new HallAmbienceMotion(mode);
  for(let f=0;f<150;f++)a.step(1/15);for(let f=0;f<1200;f++)b.step(1/120);
  for(let i=0;i<a.coins.length;i++)for(const key of ['x','y','alpha','angle'] as const)assert.ok(Math.abs(a.coins[i][key]-b.coins[i][key])<1e-7,'Same elapsed-time choreography at different frame rates');
}

// Exercise the real Cocos adapter, including lifecycle ownership and registration.
class Vec3 { constructor(public x=0,public y=0,public z=0){} set(x:number,y:number,z:number){this.x=x;this.y=y;this.z=z;} }
class Rect {constructor(public x=0,public y=0,public width=0,public height=0){}}
class Size {constructor(public width=0,public height=0){}}
class Vec2 {}
class Color {constructor(public value:string){}}
class Component {node!:TestNode;enabledInHierarchy=true;}
class UITransform {contentSize=new Size();setContentSize(w:number,h:number){this.contentSize=new Size(w,h);}}
class UIOpacity {opacity=255;}
class SpriteFrame {texture:unknown={};rect=new Rect();originalSize=new Size();offset=new Vec2();packable=true;destroyed=false;destroy(){this.destroyed=true;}}
class Sprite {static SizeMode={CUSTOM:0};sizeMode=0;spriteFrame?:SpriteFrame;color?:Color;}
class TestNode {children:TestNode[]=[];components:unknown[]=[];position=new Vec3();scale=new Vec3(1,1,1);angle=0;layer=1;isValid=true;
  constructor(public name='room'){}
  setParent(p:TestNode){p.children.push(this);}setPosition(p:Vec3){this.position=new Vec3(p.x,p.y,p.z);}setScale(p:Vec3){this.scale=new Vec3(p.x,p.y,p.z);}
  addComponent<T>(cls:new()=>T):T{const c=new cls();this.components.push(c);return c;}
  getComponent<T>(cls:new()=>T):T|undefined{return this.components.find(c=>c instanceof cls) as T|undefined;}
}
const listeners=new Set<unknown>();
const game={on(_e:string,cb:unknown){listeners.add(cb);},off(_e:string,cb:unknown){listeners.delete(cb);}},Game={EVENT_HIDE:'hide',EVENT_SHOW:'show'};
const text=readFileSync('assets/scripts/ui/HallAmbienceView.ts','utf8').replace(/^import .*?;\n/gm,'');
const context={exports:{} as any,_decorator:{ccclass:()=> (c:unknown)=>c},Component,Node:TestNode,Vec3,Rect,Size,Vec2,Color,UITransform,UIOpacity,SpriteFrame,Sprite,game,Game,
  HallAmbienceMotion,HALL_AMBIENT_COIN_SIZE,HALL_AMBIENCE_PROFILES,HALL_LIGHT_CORE};
vm.runInNewContext(ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,context);
const View=context.exports.HallAmbienceView;
for(const [width,height] of [[320,568],[375,667],[390,844],[430,932],[739,766],[768,1024],[1024,768]])for(const mode of [0,1,2,3] as HallMode[]) {
  const rootScale=Math.min(width/1024,height/1800),s=Math.max(width/rootScale/1024,height/rootScale/1536);
  const room=new TestNode(),view=new View();view.node=room;view.initialize(mode,new SpriteFrame(),new SpriteFrame(),s,false);
  const count=room.children.length;assert.equal(count,31,'Fixed 23-light / 8-coin field, no full-screen particles');
  view.initialize(mode,new SpriteFrame(),new SpriteFrame(),s,false);assert.equal(room.children.length,count,'Duplicate initialization cannot duplicate the pool');
  for(let i=0;i<120;i++)view.update(1/60);
  for(let i=0;i<23;i++) {
    const node=room.children[i],p=view.motion.glows[i],f=view.motion.fixtures[i];
    if(p.alpha)assert.ok(Math.abs(node.position.x-(p.x-512)*s)<1e-7&&Math.abs(node.position.y-(768-p.y)*s)<1e-7);
    assert.equal(node.getComponent(UITransform)!.contentSize.width,f.width*s);
  }
  const snapshot=()=>JSON.stringify(room.children.map(n=>[n.position,n.scale,n.angle,n.getComponent(UIOpacity)!.opacity]));
  view.setPresentationHidden(true);const held=snapshot();view.update(10);assert.equal(snapshot(),held);
  view.onHide();view.setPresentationHidden(false);view.update(1);assert.equal(snapshot(),held,'Closing a modal while the app is hidden does not resume effects');
  view.onShow();view.update(1/60);assert.notEqual(snapshot(),held);
  view.onDisable();const disabled=snapshot();view.update(1);assert.equal(snapshot(),disabled);
  view.onEnable();view.update(1/60);assert.notEqual(snapshot(),disabled);
  assert.equal(room.children.length,count);const frame=view.lightCore;view.onDestroy();assert.ok(frame.destroyed);assert.equal(listeners.size,0);
}
const app=readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
assert.ok(app.includes('backdrop.addComponent(HallAmbienceView).initialize('),'Room owns its own source-registered effects');
assert.ok(!app.includes("this.treasuryCurrent(root, 'hall')"),'Old screen-space shower is not stacked over the new room');
assert.ok(app.includes('previous.getComponent(HallAmbienceView)?.setPresentationHidden(true)'));
assert.ok(app.includes('root.getComponentsInChildren(HallAmbienceView)'));
assert.ok(!text.includes('TOUCH_')&&!text.includes('BlockInputEvents'),'Effect layer never intercepts taps/swipes');
assert.ok(visible>10000);
console.log(`PASS hall ambience: ${samples} elapsed-time samples, ${visible} visible coin poses, 4 authored light fields, 7 viewport registrations, cropped generated raster, pooled adapter and hide/modal/disable/destroy lifecycle`);
