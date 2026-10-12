import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {profiles} from './profiles.mjs';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..'),base=join(root,'完整游戏模版/全游戏模版');
const ts=createRequire(join(base,'F13_Golden_Harvest_v1.0.0/package.json'))('typescript');
for(const profile of profiles.filter(p=>p.id!==26)){
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${profile.id}_${profile.slug}_v`))),listeners=new Map();let created=0;
 class Component{}
 class Node{constructor(){created++;this.children=[];this.components=[];this.angle=0;this.layer=0;this.active=true;}addChild(n){n.parent=this;this.children.push(n);}setPosition(x,y){this.x=x;this.y=y;}setScale(x,y,z){this.scale=[x,y,z];}addComponent(Type){const c=new Type();c.node=this;this.components.push(c);c.onLoad?.();return c;}}
 class UITransform{setContentSize(w,h){this.width=w;this.height=h;}}
 class UIOpacity{opacity=255;}
 class Sprite{}
 class SpriteFrame{packable=true;}
 class Texture2D{static PixelFormat={RGBA8888:35};}
 class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}
 class ImageAsset{constructor(data){this.data=data;}}
 class Color{constructor(value){assert(/^#[0-9a-f]{6}$/i.test(value));}}
 const cc={Component,Node,UITransform,UIOpacity,Sprite,SpriteFrame,Texture2D,Rect,ImageAsset,Color,_decorator:{ccclass:()=>T=>T},game:{on:(e,fn,self)=>{if(!listeners.has(e))listeners.set(e,new Map());listeners.get(e).set(self,fn);},off:(e,fn,self)=>listeners.get(e)?.delete(self)},Game:{EVENT_HIDE:'hide',EVENT_SHOW:'show'}};
 const exports={};const source=readFileSync(join(project,'assets/scripts/vfx/ThemeFestivity.ts'),'utf8');
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{experimentalDecorators:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:()=>cc,Uint8Array,Math},{filename:`F${profile.id}/ThemeFestivity.ts`});
 const Theme=exports.ThemeFestivity;
 const hall=Theme.hall(new Node(),1024,1792),cabinet=Theme.cabinet(new Node(),0,0,650,600,5),count=created;
 assert.equal(hall.pool.length,28);assert.equal(cabinet.pool.length,34);
 const all=[...hall.pool,...cabinet.pool];assert(all.every(p=>p.n.components.find(c=>c instanceof Sprite).spriteFrame.packable===false));
 assert.equal(new Set(all.map(p=>p.n.components.find(c=>c instanceof Sprite).spriteFrame.texture)).size,1);
 for(let frame=0;frame<2400;frame++){
  if(frame%120===0){cabinet.land(frame/120%5);cabinet.celebrate(frame%4);}
  hall.update(1/60);cabinet.update(1/60);
  for(const p of all){assert([p.n.x,p.n.y,p.n.angle,...p.n.scale,p.alpha.opacity].every(Number.isFinite));assert(p.alpha.opacity>=0&&p.alpha.opacity<=255);}
  for(const p of cabinet.pool){if(!p.alpha.opacity)continue;const half=p.n.components.find(c=>c instanceof UITransform).width*p.n.scale[0]/2;assert(Math.abs(p.n.x)-half>=325||Math.abs(p.n.y)-half>=300,'Never cover the reel aperture');}
 }
 assert.equal(created,count,'Fixed pool: no nodes added during forty seconds of animation');
 for(const f of [hall,cabinet]){f.hide();f.update(.1);assert(f.pool.every(p=>p.alpha.opacity===0));f.show();f.update(.02);f.reducedMotion=true;f.update(.02);assert(f.pool.every(p=>p.alpha.opacity===0));f.onDestroy();}
 assert([...listeners.values()].every(m=>m.size===0),'No game lifecycle listener leak');
 console.log(`F${profile.id} PASS shared non-packable atlas, bounded pools, reel clear area, finite frames, reduced/background/destroy`);
}
