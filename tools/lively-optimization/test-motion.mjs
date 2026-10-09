import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {profiles} from './profiles.mjs';
import {motionRegions} from './motion-regions.mjs';
const root=resolve('.'),base=join(root,'完整游戏模版/全游戏模版');
const ts=createRequire(join(base,'F13_Golden_Harvest_v1.0.0/package.json'))('typescript');
for(const p of profiles.filter(p=>motionRegions[p.id])){
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)));
 const listeners=new Map(),mediaListeners=new Set(),timers=new Map();let load,created=0,cleared=0;
 const media={matches:false,addEventListener:(_,f)=>mediaListeners.add(f),removeEventListener:(_,f)=>mediaListeners.delete(f)};
 class Vec4{constructor(...v){this.set(...v);}set(x=0,y=0,z=0,w=0){this.values=[x,y,z,w];}}
 class Material{constructor(){created++;this.props=new Map();}initialize(){}setProperty(k,v){this.props.set(k,[...v.values]);}destroy(){cleared++;}}
 class Component{}
 class Sprite{isValid=true;customMaterial=null;spriteFrame={rect:{x:0,y:0,width:1024,height:2048},texture:{width:1024,height:2048}};}
 const cc={Component,Sprite,Material,Vec4,EffectAsset:class{},SpriteFrame:class{},_decorator:{ccclass:()=>T=>T},Game:{EVENT_HIDE:'hide',EVENT_SHOW:'show'},game:{on:(e,f,c)=>{if(!listeners.has(e))listeners.set(e,new Map());listeners.get(e).set(c,f);},off:(e,f,c)=>listeners.get(e)?.delete(c)},resources:{load:(_p,_t,fn)=>{load=fn;}}};
 const exports={};let timerId=0;
 const ctx={exports,require:name=>name==='cc'?cc:{MOTION_REGIONS:motionRegions[p.id]},globalThis:{window:{matchMedia:()=>media}},console:{warn(){}},Math,setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)};
 const source=readFileSync(join(project,'assets/scripts/vfx/ThemeMotion.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,ctx);
 const Motion=exports.ThemeMotion;
 const first=Motion.prepare();assert.equal(first,Motion.prepare(),'single in-flight effect request');load(new Error('offline'));await first;assert.equal(timers.size,0);
 const timeout=Motion.prepare();[...timers.values()][0]();await timeout;assert.equal(timers.size,0);load(null,{});assert(!Motion.effect,'late effect result ignored after fallback');
 const prepared=Motion.prepare();load(null,{});await prepared;assert(Motion.effect);assert.equal(timers.size,0);
 const key=Object.keys(motionRegions[p.id])[0],split=key.split(':'),name=split[0],index=split.length===2?Number(split[1]):-1;
 let attached;
 const sprite=new Sprite();sprite.node={getComponent:()=>attached,addComponent:Type=>{attached=new Type();attached.onLoad();return attached;}};
 Motion.attach(sprite,name,index);assert(attached);const c=attached,m=sprite.customMaterial;
 Motion.attach(sprite,name,index);assert.equal(created,1,'one material per sprite');
 for(let i=0;i<3600;i++){c.update(i===10?30:1/60);for(const v of m.props.values())assert(v.every(Number.isFinite));}
 assert.equal(created,1,'no material allocations while animating');assert(c.time<61,'bounded resume delta');
 const elapsed=c.time;c.hide();c.update(10);assert.equal(c.time,elapsed);assert.equal(m.props.get('motionClock')[1],0);c.show();c.update(.02);assert.equal(m.props.get('motionClock')[1],1);
 media.matches=true;for(const f of mediaListeners)f();const paused=c.time;c.update(2);assert.equal(c.time,paused);assert.equal(m.props.get('motionClock')[1],0);
 media.matches=false;for(const f of mediaListeners)f();c.update(.02);assert.equal(m.props.get('motionClock')[1],1);
 sprite.spriteFrame={rect:{x:512,y:256,width:512,height:512},texture:{width:2048,height:1024}};c.update(.02);assert.deepEqual(m.props.get('frameUV'),[.25,.25,.25,.5],'changing atlas frame updates sampling bounds');
 const repair={};sprite.customMaterial=repair;Motion.attach(sprite,name,index);assert.equal(created,1,'repair materials never replaced');c.onDestroy();assert.equal(sprite.customMaterial,repair);assert.equal(cleared,1);assert.equal(mediaListeners.size,0);assert([...listeners.values()].every(v=>v.size===0));
 const s2=new Sprite();let c2;s2.node={getComponent:()=>c2,addComponent:T=>{c2=new T();c2.onLoad();return c2;}};Motion.attach(s2,name,index);c2.onDestroy();assert.equal(s2.customMaterial,null);assert.equal(created,cleared);
 const s3=new Sprite(),borrowed=new Material();let c3;
 s3.customMaterial=borrowed;s3.node={getComponent:()=>c3,addComponent:T=>{c3=new T();c3.onLoad();return c3;}};
 media.matches=true;Motion.attachCompatible(s3,borrowed,name,index);assert(c3);assert.equal(borrowed.props.get('motionClock')[1],0,'initial reduced preference is honored');
 media.matches=false;for(const f of mediaListeners)f();c3.update(.02);assert.equal(borrowed.props.get('motionClock')[1],1,'motion can resume after initial reduced mode');
 const before=cleared;c3.onDestroy();assert.equal(s3.customMaterial,borrowed);assert.equal(cleared,before,'borrowed material stays with original owner');assert.equal(borrowed.props.get('motionClock')[1],0);borrowed.destroy();assert.equal(created,cleared);
 for(const regions of Object.values(motionRegions[p.id]))for(const r of regions){assert.equal(r.length,8);assert(r.every(Number.isFinite));assert(r[0]>=0&&r[0]<=1&&r[1]>=0&&r[1]<=1);assert(r[2]>0&&r[3]>0&&r[4]<=.03&&r[5]<=.006&&r[6]>=2);}
 console.log(`F${p.id} PASS real component: frame bounds, fixed materials, background/reduced, repair preservation, load failure/timeout/late reply, listener cleanup`);
}
