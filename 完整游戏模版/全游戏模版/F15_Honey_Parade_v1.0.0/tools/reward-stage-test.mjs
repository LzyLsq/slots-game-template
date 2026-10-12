/** Headless Cocos contract checks; visual approval still uses the actual WebGL build. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const ts=createRequire(import.meta.url)('typescript'),cache=new Map();
let created=0;
class Component{enabled=true;}
class Vec3{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}}
class Node{
 static EventType={TOUCH_START:'start',TOUCH_MOVE:'move',TOUCH_END:'end',TOUCH_CANCEL:'cancel',NODE_DESTROYED:'destroy'};
 constructor(name=''){created++;Object.assign(this,{name,children:[],components:[],listeners:new Map(),position:new Vec3(),scale:new Vec3(1,1,1),rotation:{},angle:0,isValid:true,active:true,activeInHierarchy:true});}
 addChild(n){n.setParent(this);}
 setParent(parent){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=parent;parent.children.push(this);}
 setPosition(x,y,z=0){this.position=x instanceof Vec3?x:new Vec3(x,y,z);}
 setScale(x,y=x,z=1){this.scale=x instanceof Vec3?x:new Vec3(x,y,z);}
 setRotation(value){this.rotation=value;}
 getSiblingIndex(){return this.parent?.children.indexOf(this)??0;}
 setSiblingIndex(i){if(!this.parent)return;this.parent.children=this.parent.children.filter(n=>n!==this);this.parent.children.splice(i,0,this);}
 addComponent(Type){const c=new Type();c.node=this;this.components.push(c);return c;}
 getComponent(Type){return this.components.find(c=>c instanceof Type)??null;}
 on(name,fn,self){this.listeners.set(name,[...(this.listeners.get(name)??[]),{fn,self}]);}
 emit(name,value){for(const {fn,self} of this.listeners.get(name)??[])fn.call(self,value);}
 destroy(){if(!this.isValid)return;this.isValid=false;this.emit('destroy');for(const c of this.components)c.onDestroy?.();for(const n of [...this.children])n.destroy();}
}
class UITransform{setContentSize(width,height){Object.assign(this,{width,height});}setAnchorPoint(anchorPoint){this.anchorPoint=anchorPoint;}anchorPoint={x:.5,y:.5};}
class UIOpacity{opacity=255;}
class Label{static HorizontalAlign={CENTER:1};static VerticalAlign={CENTER:1};static Overflow={CLAMP:1,SHRINK:2};static CacheMode={NONE:0};}
class LabelOutline{}
class Sprite{static SizeMode={CUSTOM:1};static Type={SLICED:1};getMaterialInstance(){return {overridePipelineStates(){}};}}
class Graphics{
 operations=[];
 record(name,args){assert(args.every(Number.isFinite),'Every graphics coordinate is finite');this.operations.push({name,args});}
}
for(const name of ['moveTo','lineTo','bezierCurveTo','ellipse','circle','rect','roundRect'])Graphics.prototype[name]=function(...args){this.record(name,args);};
for(const name of ['close','fill','stroke'])Graphics.prototype[name]=function(){this.record(name,[]);};
class Color{constructor(...value){this.value=value;}}
class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}
class Size{constructor(width,height){Object.assign(this,{width,height});}}
class SpriteFrame{}
class Texture2D{}
class Mask{static Type={GRAPHICS_STENCIL:1,GRAPHICS_RECT:2};}
class TextFit{}
const tween=target=>{
 const actions=[];const chain={to:(_,props)=>{actions.push(()=>Object.assign(target,props));return chain;},delay:()=>chain,call:fn=>{actions.push(fn);return chain;},start:()=>{for(const fn of actions)fn();return chain;},stop:()=>chain};return chain;
};
const cc={Component,Node,UITransform,UIOpacity,Label,LabelOutline,Sprite,Graphics,Color,Rect,Size,SpriteFrame,Texture2D,Mask,Vec3,tween,
 Layers:{Enum:{UI_2D:1}},_decorator:{ccclass:()=>Type=>Type},gfx:{BlendFactor:{SRC_ALPHA:1,ONE:2,ZERO:0}}};
const gameIds=['golden-hour','jade-treasury','pearl-palace','ruby-revel'];
function load(name){
 if(cache.has(name))return cache.get(name);
 const exports={},source=readFileSync(new URL('../assets/scripts/'+name+'.ts',import.meta.url),'utf8');cache.set(name,exports);
 const require=name=>{
  if(name==='cc')return cc;
  if(name.endsWith('/RewardArtwork'))return load('ui/RewardArtwork');
  if(name.endsWith('/RewardTheme'))return load('ui/RewardTheme');
  if(name.endsWith('/SalonArt'))return load('ui/SalonArt');
  if(name.endsWith('/StationaryArtwork'))return load('vfx/StationaryArtwork');
  if(name.endsWith('/Language'))return {tr:value=>value,language:()=>language};
  if(name.endsWith('/TextFit'))return {TextFit};
  if(name.endsWith('/LivingMascotRig'))return {LivingMascotRig:{attach:()=>false}};
  if(name.endsWith('/ThemeMotion'))return {ThemeMotion:{attach(){}}};
  if(name.endsWith('/SalonAtmosphere'))return {SalonAtmosphere:class extends Component{setup(){}}};
  if(name.endsWith('/GameConfigs'))return {GAME_CONFIGS:gameIds.map(id=>({id})),symbolAtlas:id=>'symbols-'+id,prizeArt:id=>'prize-'+id};
  if(name.endsWith('/WinPresentation'))return load('vfx/WinPresentation');
  throw new Error('Unmocked import: '+name);
 };
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{experimentalDecorators:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require,Math,Number,Promise,Map,Color},{filename:name+'.ts'});
 return exports;
}
let language='en';
const {SalonArt}=load('ui/SalonArt'),{SalonWinStage}=load('vfx/SalonWinStage'),{OrdinaryWinStage}=load('vfx/OrdinaryWinStage');
const {WIN_TIERS}=load('vfx/WinPresentation');
const art=new SalonArt();
for(const name of [...gameIds.flatMap(id=>['symbols-'+id,'prize-'+id]),...[0,1,2,3].map(i=>'harvest-soft-plate-'+i),'optics'])art.textures.set(name,{width:1024,height:1024});
for(let theme=0;theme<4;theme++)for(const [tierIndex,multiplier] of WIN_TIERS.entries()){
 const root=new Node(),effect=root.addComponent(SalonWinStage),amount=1234567.125;
 let resolves=0;const pending=effect.setup(art,amount,1920,false,multiplier,theme).then(()=>resolves++);
 const countBefore=created;
 effect.update(.1);effect.update(.1);assert.equal(created,countBefore,'No per-frame nodes');
 assert.equal(effect.tier,tierIndex,'Preview and tests use the actual game presentation thresholds');
 assert.equal(effect.countDuration,[3.3,4.2,4.7,5.1][effect.tier]);
 assert.equal(effect.holdUntil,effect.countDuration+2.2);
 effect.advance();assert.equal(effect.count.string,'1,234,567.125');assert(!effect.finished,'First tap reveals without dismissing');
 const collect=effect.group.children.find(n=>n.name==='Collect your treasure');
 const event={propagationStopped:false};collect.emit(Node.EventType.TOUCH_END,event);assert(event.propagationStopped);
 effect.advance();await pending;assert.equal(resolves,1);root.destroy();assert.equal(resolves,1);
}
for(let theme=0;theme<4;theme++)for(language of ['en','zh-CN','zh-TW','ja','ko']){
 const root=new Node(),effect=root.addComponent(OrdinaryWinStage);
 const pending=effect.setup(art,75,1920,false,100,{y:-840,width:980,theme});
 const countBefore=created;
 for(let i=0;i<120;i++)effect.update(1/60);
 await pending;assert(effect.finished);assert.equal(effect.group,undefined);assert.equal(created,countBefore);
 root.destroy();
}
const root=new Node(),effect=root.addComponent(SalonWinStage);let destroyed=0;
const pending=effect.setup(art,99,1920,true,2,0).then(()=>destroyed++);root.destroy();await pending;assert.equal(destroyed,1);
console.log('PASS real reward renderer: 4 themes × 4 tiers; 20 small-win locale runs; exact amounts; two-step collect; no per-frame nodes; destruction resolves.');
