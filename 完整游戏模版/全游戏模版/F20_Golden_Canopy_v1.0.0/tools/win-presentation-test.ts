import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as presentation from '../assets/scripts/vfx/WinPresentation';
import {LANGUAGES,setLanguage,tr,language} from '../assets/scripts/ui/Language';
import {GAME_CONFIGS,symbolAtlas,prizeArt} from '../assets/scripts/math/GameConfigs';

// Exercise the presentation component itself. Device QA covers actual rendering.
class UIOpacity {opacity=255;}
class Label {static Overflow={SHRINK:1};string='';node!:FakeNode;}
class Vec3 {constructor(public x=0,public y=0,public z=1){}}
class Color {constructor(..._values:number[]){}}
class Graphics {
  fillColor:unknown;strokeColor:unknown;lineWidth=0;
  rect(..._values:number[]){}fill(){}circle(..._values:number[]){}stroke(){}
  moveTo(..._values:number[]){}lineTo(..._values:number[]){}close(){}
}
class FakeNode {
  static EventType={TOUCH_END:'touch-end'};
  name='';children:FakeNode[]=[];position=new Vec3();scale=new Vec3(1,1,1);angle=0;isValid=true;
  private components=new Map<any,any>();
  private handlers=new Map<string,((event:any)=>void)[]>();
  addComponent<T>(type:new()=>T):T {const value=new type();(value as any).node=this;this.components.set(type,value);return value;}
  getComponent<T>(type:new()=>T):T|undefined {return this.components.get(type);}
  setPosition(x:number,y:number,z=0){this.position=new Vec3(x,y,z);}
  setScale(x:number,y:number,z=1){this.scale=new Vec3(x,y,z);}
  destroy(){this.isValid=false;this.children.forEach(child=>child.destroy());}
  on(name:string,fn:(event:any)=>void,owner?:any){const list=this.handlers.get(name)??[];list.push(owner?fn.bind(owner):fn);this.handlers.set(name,list);}
}
function Component(this:any){this.node=new FakeNode();}
const box=(parent:FakeNode,name:string,x=0,y=0)=>{const node=new FakeNode();node.name=name;node.setPosition(x,y);parent.children.push(node);return node;};
const opacity=(node:FakeNode,value:number)=>{const alpha=node.getComponent(UIOpacity)??node.addComponent(UIOpacity);alpha.opacity=value;return alpha;};
const text=(parent:FakeNode,value:string,x=0,y=0)=>{const node=box(parent,'text',x,y),label=node.addComponent(Label);label.string=tr(value);return label;};
const art={
  image(parent:FakeNode,name:string,x:number,y:number){return box(parent,name,x,y);},
  light(parent:FakeNode,_index:number,x:number,y:number,_w:number,_h:number,alpha=0){const node=box(parent,'light',x,y);opacity(node,alpha);return node;},
  panel(parent:FakeNode,x:number,y:number){return box(parent,'panel',x,y);},
  button(parent:FakeNode,name:string,x:number,y:number){return box(parent,name,x,y);},
};
const tween=(target:any)=>{
  const actions:(()=>void)[]=[];
  const chain={to(_duration:number,values:any,_options?:any){actions.push(()=>Object.assign(target,values));return chain;},delay(_seconds:number){return chain;},call(fn:()=>void){actions.push(fn);return chain;},start(){actions.forEach(fn=>fn());return chain;}};
  return chain;
};
const cc={Component,UIOpacity,Label,Vec3,Color,Graphics,Node:FakeNode,tween,Tween:{stopAllByTarget(){}},cclegacy:{_RF:{push(){},pop(){}}},_decorator:{ccclass:()=>((type:any)=>type)}};
class Atmosphere {reducedMotion=false;setup(..._args:unknown[]){} }
const artModule={box,opacity,text,COLORS:{ink:new Color()},outlined:(label:Label)=>label};
const dependencies:Record<string,unknown>={
  cc,'./WinPresentation':presentation,'../ui/Language':{tr,language},'../ui/SalonArt':artModule,
  '../math/GameConfigs':{GAME_CONFIGS,symbolAtlas,prizeArt},'./SalonAtmosphere':{SalonAtmosphere:Atmosphere},
};
const exported:Record<string,any>={};
let testedPresentation:any=presentation;
if(process.argv.includes('--bundle')){
  const modules=new Map<string,any>();
  vm.runInNewContext(readFileSync('build/web-mobile/assets/main/index.js','utf8'),{System:{register:(id:string,deps:string[],factory:any)=>modules.set(id,{deps,factory})}});
  const helpers={
    inheritsLoose:(child:any,parent:any)=>{child.prototype=Object.create(parent.prototype);child.prototype.constructor=child;Object.setPrototypeOf(child,parent);},
    createForOfIteratorHelperLoose:(iterable:any)=>{const iterator=iterable[Symbol.iterator]();return iterator.next.bind(iterator);},
  };
  const load=(name:string,imports:Record<string,unknown>)=>{
    const record=modules.get(`chunks:///_virtual/${name}.ts`);assert(record,`${name} missing from published bundle`);
    const output:Record<string,any>={},module=record.factory((key:string|Record<string,any>,value:any)=>{
      if(typeof key==='string'){output[key]=value;return value;}Object.assign(output,key);return key;
    });
    record.deps.forEach((id:string,i:number)=>{
      const key=id.endsWith('.ts')?id.slice(0,-3):id;
      const value=id.includes('BabelHelpers')?helpers:imports[key];assert(value,`Unexpected published ${name} dependency: ${id}`);
      module.setters[i](value);
    });module.execute();return output;
  };
  testedPresentation=load('WinPresentation',{cc,'./Language':{tr,language}});
  Object.assign(exported,load('SalonWinStage',{
    cc,'./WinPresentation':testedPresentation,'./Language':{tr,language},'./SalonArt':artModule,
    './GameConfigs':{GAME_CONFIGS,symbolAtlas,prizeArt},'./SalonAtmosphere':{SalonAtmosphere:Atmosphere},
  }));
  Object.assign(exported,load('OrdinaryWinStage',{cc,'./Language':{tr,language},'./SalonArt':artModule}));
}else{
  for(const name of ['SalonWinStage','OrdinaryWinStage']){
    const code=ts.transpileModule(readFileSync(`assets/scripts/vfx/${name}.ts`,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
    vm.runInNewContext(code,{exports:exported,require:(id:string)=>{assert(dependencies[id],`Unexpected source dependency: ${id}`);return dependencies[id];}});
  }
}
for(const [ratio,tier] of [[0,0],[.1,0],[.999999,0],[1,0],[1.000001,1],[2,1],[5,1],[9.999999,1],[10,2],[49.999999,2],[50,3],[99.999999,3],[100,4],[150,4]]){
  assert.equal(testedPresentation.winTier(ratio),tier,`Tier at ${ratio}×`);
}
for(const invalid of [NaN,Infinity,-Infinity])assert.equal(testedPresentation.winTier(invalid),0);
for(const bet of [20,80,200,500,1000]){
  assert.equal(testedPresentation.winTier(bet/bet),0,'Exactly the charged bet must not open BIG WIN');
  assert.equal(testedPresentation.winTier((bet+.001)/bet),1,'Even a fractional profitable return opens BIG WIN');
}
for(const locale of LANGUAGES){
  setLanguage(locale.code);
  assert(testedPresentation.tierRules().includes('10'));assert(testedPresentation.tierRules().includes('100'));
  assert(testedPresentation.tierCaption(1.001).includes('>'));
  assert(testedPresentation.tierCaption(1).includes('≤'));
  assert(testedPresentation.tierCaption(10).includes('10'));
}
setLanguage('en');
function count(node:FakeNode):number{return 1+node.children.reduce((sum,child)=>sum+count(child),0);}
function finite(node:FakeNode):void{
  for(const n of [...Object.values(node.position),...Object.values(node.scale),node.angle])assert(Number.isFinite(n));
  const alpha=node.getComponent(UIOpacity);if(alpha)assert(alpha.opacity>=0&&alpha.opacity<=255);
  node.children.forEach(finite);
}
async function main(){
  for(let theme=0;theme<4;theme++)for(const multiplier of [1.001,10,50,100]){
    const stage=new exported.SalonWinStage();let resolved=0,revealed=0;
    const sounds:{cue:string;progress:number}[]=[];
    const done=stage.setup(art,1234.567,2200,false,multiplier,theme,false,()=>revealed++,(cue:string,progress:number)=>sounds.push({cue,progress})).then(()=>resolved++);
    const allocated=count(stage.node);assert(allocated<320,'Celebrations must use bounded node pools');
    assert(stage.coinRain.length>=24);assert(stage.ribbons.length>=16);assert(stage.rimBulbs.length>=16);
    for(let frame=0;frame<700;frame++){stage.update(1/60);finite(stage.node);assert.equal(count(stage.node),allocated);}
    await done;assert.equal(resolved,1);assert.equal(revealed,1);assert.equal(stage.count.string,'1,234.567');
    assert(sounds.some(sound=>sound.cue==='count'));assert(sounds.some(sound=>sound.cue==='burst'));
    assert.equal(sounds.filter(sound=>sound.cue==='reveal').length,1);
    assert.equal(sounds.filter(sound=>sound.cue==='collect').length,0,'Auto-dismiss must not fake a player collection press');
    const revealIndex=sounds.findIndex(sound=>sound.cue==='reveal');
    assert(sounds.slice(revealIndex+1).every(sound=>sound.cue!=='count'),'No counting sounds after the final amount');
    assert(sounds.every(sound=>Number.isFinite(sound.progress)&&sound.progress>=0&&sound.progress<=1));
    assert(stage.finished,'Every tier must dismiss automatically and release input');stage.onDestroy();
  }
  for(const reduced of [false,true]){
    const stage=new exported.SalonWinStage();let reveals=0;const sounds:string[]=[];
    const done=stage.setup(art,80.001,1800,reduced,1.0000125,0,false,()=>reveals++,(cue:string)=>sounds.push(cue));
    if(reduced){assert.equal(stage.coinRain.length,0);assert.equal(stage.ribbons.length,0);assert.equal(stage.rimBulbs.length,0);}
    else{stage.advance();assert(stage.revealed);assert(!stage.finished,'First tap reveals; next tap closes');}
    assert.equal(stage.count.string,'80.001');stage.advance();await done;assert(stage.finished);assert.equal(reveals,1);
    assert.equal(sounds.filter(cue=>cue==='reveal').length,1);assert.equal(sounds.filter(cue=>cue==='collect').length,1);
    assert(!sounds.includes('count'),'Skipping and reduced-motion do not replay the skipped counting');
  }
  const stage=new exported.SalonWinStage(),destroyed=stage.setup(art,120,1800,false,1.5);
  stage.onDestroy();await destroyed;
  for(const reduced of [false,true])for(const amount of [.125,40,80]){
    const ordinary=new exported.OrdinaryWinStage(),sounds:{cue:string;progress:number}[]=[];let resolved=0;
    const done=ordinary.setup(art,amount,1800,reduced,80,{},(cue:string,progress:number)=>sounds.push({cue,progress})).then(()=>resolved++);
    const label=ordinary.count;
    for(let frame=0;frame<180;frame++)ordinary.update(1/60);
    await done;assert.equal(resolved,1);assert(ordinary.finished);assert.equal(label.string,String(amount));
    assert.equal(sounds.filter(sound=>sound.cue==='reveal').length,1,'Ordinary award reveals exactly once, including fractional totals and reduced motion');
    if(!reduced&&amount>=1)assert(sounds.some(sound=>sound.cue==='count'));
    assert(!sounds.some(sound=>sound.cue==='collect'),'Ordinary auto-dismiss must not fake collection');
    assert(sounds.every(sound=>Number.isFinite(sound.progress)&&sound.progress>=0&&sound.progress<=1));
    const before=sounds.length;ordinary.update(1);ordinary.onDestroy();assert.equal(sounds.length,before,'No sounds after ordinary stage teardown');
  }
  const cancelled=new exported.OrdinaryWinStage(),cancelSounds:string[]=[];
  const cancellation=cancelled.setup(art,40,1800,false,80,{},(cue:string)=>cancelSounds.push(cue));
  cancelled.update(.2);cancelled.onDestroy();await cancellation;
  const beforeCancel=cancelSounds.length;cancelled.update(3);assert.equal(cancelSounds.length,beforeCancel);
  for(const invalid of [0,-1,NaN,Infinity])await new exported.OrdinaryWinStage().setup(art,invalid,1800,false,80,{},()=>assert.fail('Invalid/zero award must be silent'));
  console.log(`PASS ${process.argv.includes('--bundle')?'published bundle':'source'}: strict >1× BIG, higher tiers/locales retained, 16 theme/tier celebrations, fixed pools, exact totals, ordinary fractional awards, animation-synced sound lifecycle, skip/reduced-motion/teardown.`);
}
void main();
