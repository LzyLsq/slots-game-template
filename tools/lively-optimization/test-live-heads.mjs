import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {profiles} from './profiles.mjs';
import {liveHeads} from './mascot-live-manifest.mjs';

const base=resolve('完整游戏模版/全游戏模版');
const ts=createRequire(join(base,'F13_Golden_Harvest_v1.0.0/package.json'))('typescript');
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE||'/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const compile=(path,require,context={})=>{
  const exports={};
  vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,{exports,require,...context});
  return exports;
};

for(const p of profiles.filter(p=>liveHeads.some(h=>h.id===p.id))){
  const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)));
  const data=JSON.parse(readFileSync(join(project,'output/imagegen/live-heads/prepared.json'),'utf8'));
  assert.equal(data.length,liveHeads.filter(h=>h.id===p.id).length);
  for(const s of data){
    const source=liveHeads.find(h=>h.id===p.id&&h.art===s.art&&(h.index??-1)===s.index);
    assert.equal(s.eyeState,source.eyeState,'eye state follows visually reviewed original expression');
    assert.equal(s.blinkEnabled,s.eyeState==='open'&&s.blinkSafe,'only an open-eyed, safe pose can blink');
    assert(existsSync(join(project,'assets/resources/art',s.art+'-live-bg.png')));
    assert(s.rect.every(Number.isFinite)&&s.rect[2]>0&&s.rect[3]>0);
    assert(s.pivot.every(Number.isFinite)&&s.period>0&&s.angle>0);
    for(const [x,y,w,h] of s.frames)assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=512&&y+h<=data.length*256);
  }
  const events=new Map(),changes=new Set(),timers=new Map();let load,calls=0,created=0,timerId=0;
  const media={matches:false,addEventListener:(_,f)=>changes.add(f),removeEventListener:(_,f)=>changes.delete(f)};
  class Component{enabled=true;destroy(){this.onDestroy?.();this.node.components.delete(this.constructor);}}
  class UITransform{width=500;height=700;anchorX=.5;anchorY=.5;setContentSize(w,h){this.width=w;this.height=h;}}
  class Node{
    constructor(name){created++;this.name=name;this.children=[];this.components=new Map();this.angle=0;this.active=true;}
    getComponent(T){return this.components.get(T);}
    addComponent(T){const c=new T();c.node=this;this.components.set(T,c);c.onLoad?.();return c;}
    setPosition(...v){this.position=v;}setScale(...v){this.scale=v;}addChild(n){n.parent=this;this.children.push(n);}
    destroy(){this.active=false;for(const c of [...this.components.values()])c.destroy?.();for(const n of [...this.children])n.destroy();if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  }
  class Sprite{static SizeMode={CUSTOM:1};customMaterial=null;markForUpdateRenderData(){}}
  class Texture2D{static Filter={LINEAR:1};setFilters(){}}
  class SpriteFrame{constructor(){created++;}}
  class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}
  class Size{constructor(width,height){Object.assign(this,{width,height});}}
  class ThemeMotion extends Component{}
  const cc={Component,Node,UITransform,Sprite,Texture2D,SpriteFrame,Rect,Size,Layers:{Enum:{UI_2D:1}},_decorator:{ccclass:()=>T=>T},Game:{EVENT_HIDE:'hide',EVENT_SHOW:'show'},game:{on:(e,f,c)=>{if(!events.has(e))events.set(e,new Map());events.get(e).set(c,f);},off:(e,f,c)=>events.get(e)?.delete(c)},resources:{load:(_p,_t,fn)=>{calls++;load=fn;}}};
  const context={globalThis:{window:{matchMedia:()=>media}},console:{warn(){}},Math,setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)};
  const mesh=compile(join(project,'assets/scripts/vfx/ArticulatedMascot.ts'),()=>cc,context);
  const Rig=compile(join(project,'assets/scripts/vfx/LivingMascotRig.ts'),name=>name==='cc'?cc:name==='./ThemeMotion'?{ThemeMotion}:name==='./ArticulatedMascot'?mesh:{LIVING_MASCOTS:data},context).LivingMascotRig;
  await Rig.prepare(['not-a-mascot']);assert.equal(calls,0);
  const fail=Rig.prepare([data[0].art]);load(new Error('offline'));await fail;assert.equal(Rig.file(data[0].art),data[0].art);assert.equal(timers.size,0);
  const timeout=Rig.prepare([data[0].art]);[...timers.values()][0]();await timeout;load(null,new Texture2D());await Promise.resolve();assert.equal(Rig.file(data[0].art),data[0].art,'late result cannot change fallback');
  const a=Rig.prepare([data[0].art]),b=Rig.prepare([data[0].art]);assert.equal(calls,3,'one shared in-flight atlas request');load(null,new Texture2D());await Promise.all([a,b]);assert.equal(timers.size,0);assert.equal(Rig.file(data[0].art),data[0].art+'-live-bg');
  const root=new Node('original artwork'),ui=root.addComponent(UITransform),sprite=root.addComponent(Sprite),old=root.addComponent(ThemeMotion);
  root.setPosition(3,4);root.angle=7;sprite.customMaterial={};
  assert(Rig.attach(sprite,data[0].art,data[0].index));assert.equal(old.enabled,false);assert.equal(sprite.customMaterial,null);
  const rig=root.getComponent(Rig),origin=[...root.position],angle=root.angle,width=ui.width,height=ui.height,before=created;
  Rig.attach(sprite,data[0].art,data[0].index);assert.equal(created,before,'repeat attach does not duplicate layers');
  let sawBlink=false;
  for(let i=0;i<3600;i++){rig.update(i===10?20:1/60);for(const part of rig.parts){assert(Number.isFinite(part.pivot.angle));assert(Math.abs(part.pivot.angle)<=part.spec.angle*1.3+.0001);if(part.face.spriteFrame===part.frames[1])sawBlink=true;}}
  assert.equal(sawBlink,data[0].blinkEnabled);assert.equal(created,before,'no nodes or sprite frames allocated in animation ticks');assert.deepEqual(root.position,origin);assert.equal(root.angle,angle);assert.equal(ui.width,width);assert.equal(ui.height,height);
  const elapsed=rig.time;rig.hide();rig.update(20);assert.equal(rig.time,elapsed);rig.show();
  media.matches=true;for(const f of changes)f();rig.update(20);assert.equal(rig.time,elapsed);assert(rig.parts.every(x=>x.pivot.angle===0&&x.face.spriteFrame===x.frames[0]));
  media.matches=false;for(const f of changes)f();rig.update(.02);assert(rig.time>elapsed);
  const parent=new Node('fixed hit area');parent.addChild(root);assert(Rig.contains(parent));assert(!Rig.attach(sprite,'other-art',-1));assert(!Rig.contains(parent));assert.equal(root.children.length,0,'old face layers removed when artwork changes');
  root.destroy();assert.equal(changes.size,0);assert([...events.values()].every(v=>v.size===0));
  // Exercise every current lobby/cabinet spec, not only the first atlas row.
  for(const spec of data){
    const artNode=new Node(spec.art+' '+spec.index);artNode.addComponent(UITransform);artNode.setPosition(0,0);
    const artSprite=artNode.addComponent(Sprite);assert(Rig.attach(artSprite,spec.art,spec.index));
    const actor=artNode.getComponent(Rig),allocated=created;
    let entryBlink=false,entryTilt=false;
    for(let i=0;i<720;i++){
      actor.update(1/60);
      for(const part of actor.parts){
        if(part.face.spriteFrame===part.frames[1])entryBlink=true;
        if(Math.abs(part.pivot.angle)>.05)entryTilt=true;
        if(!part.spec.blinkEnabled)assert.equal(part.face.spriteFrame,part.frames[0],'closed/unsafe faces must hold their original expression');
      }
    }
    assert.equal(entryBlink,spec.blinkEnabled,'every registered eye policy is actually enforced');
    assert(entryTilt,'disabling a blink must not disable the head movement');
    const approved=spec.blinkSafe;spec.blinkSafe=false;
    for(let i=0;i<720;i++){actor.update(1/60);assert(actor.parts.every(part=>part.face.spriteFrame===part.frames[0]),'unsafe frames must never blink even if enabled metadata is stale');}
    spec.blinkSafe=approved;
    assert.equal(created,allocated,'all specs reuse cached frames during ticks');
    assert.deepEqual(artNode.position,[0,0],'all cabinet/lobby backgrounds stay fixed');
    artNode.destroy();
  }
  assert.equal(changes.size,0);assert([...events.values()].every(v=>v.size===0));
  if(p.id===17){const s=readFileSync(join(project,'assets/scripts/ui/SalonArt.ts'),'utf8');assert(s.includes('n.addComponent(CaravanCatRig).setup'));assert(s.includes('CabinetReliefGlow.attach(n,'));assert(s.includes("'caravan-card-0-rig-bg' : LivingMascotRig.file(name)"));}
  if(p.id===25){const s=readFileSync(join(project,'assets/scripts/TheatreUI.ts'),'utf8');assert(!s.includes('if(!LivingMascotRig.contains(n)){if(!LivingMascotRig.contains(n))'));}
  if(p.id===29){
    const current=readFileSync(join(project,'assets/scripts/ui/AureliaApp.ts'),'utf8');
    assert(current.includes("this.art.image(n,'portraits'"),'current courtyard really uses the animated portraits');
    assert.deepEqual(data.filter(s=>s.art==='portraits').map(s=>s.index),[0,1,2,3]);
    const art=join(project,'assets/resources/art'),original=await sharp(join(art,'portraits.png')).ensureAlpha().raw().toBuffer(),backing=await sharp(join(art,'portraits-live-bg.png')).ensureAlpha().raw().toBuffer();
    assert(original.subarray(1024*256*4).equals(backing.subarray(1024*256*4)),'12 unedited avatar cells stay identical');
    for(let cell=0;cell<4;cell++)for(const [x,y]of [[24,128],[128,227],[228,128],[128,207]]){
      const i=(y*1024+cell*256+x)*4;
      assert(original.subarray(i,i+4).equals(backing.subarray(i,i+4)),'gold rim and scarf preserved exactly');
    }
  }
  console.log(`F${p.id} PASS ${data.length} heads (${data.filter(s=>s.eyeState==='closed').length} closed-eye expressions): atlas bounds, load fallback/timeout, fixed artwork/input, no tick allocations, expression-aware blink, background/reduced motion, cleanup`);
}

for(const id of [17,23,29]){
  const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)));
  const regions=readFileSync(join(project,'assets/scripts/vfx/ThemeMotionRegions.ts'),'utf8');
  if(id!==29)assert(!/"[^"]+-tall"/.test(regions),'static reliefs must not receive head warp');
  else assert(readFileSync(join(project,'assets/scripts/ui/SalonArt.ts'),'utf8').includes("name === 'f29-cabinet-jade-v1'"),'current jade cabinet has relief shimmer');
  const glow=readFileSync(join(project,'assets/scripts/vfx/CabinetReliefGlow.ts'),'utf8');
  assert(!/Node\.EventType\.TOUCH|BlockInputEvents/.test(glow));
  console.log(`F${id} PASS relief: fixed jewels, no head warp or touch blockers`);
}
