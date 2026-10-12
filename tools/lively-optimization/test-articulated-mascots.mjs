import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {bonesFor,fullBodyBones} from './mascot-bones.mjs';

const require=createRequire(new URL('../../完整游戏模版/全游戏模版/F13_Golden_Harvest_v1.0.0/package.json',import.meta.url));
const ts=require('typescript');
const compile=(file,require,extra={})=>{
 const exports={};
 vm.runInNewContext(ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText,{exports,require,Float32Array,Float64Array,Uint16Array,Math,...extra});
 return exports;
};
class UITransform {width=256;height=256;anchorX=.5;anchorY=.5;}
function appendIndices(bufferId,indices){
 const b=this.buffers[bufferId],needed=b.indexOffset+indices.length;
 if(b.iData.length<needed){const expanded=new Uint16Array(Math.floor(needed*1.25));expanded.set(b.iData);b.iData=expanded;}
 b.iData.set(indices,b.indexOffset);b.indexOffset+=indices.length;
}
class Sprite {
 color={r:255,g:200,b:100,a:128};spriteFrame={uv:[.1,.9,.4,.9,.1,.2,.4,.2]};
 get renderData(){return this._renderData;}
 markForUpdateRenderData(){}destroyRenderData(){this._renderData=null;}getRenderMaterial(){return {};}
 _updateColor(){this._assembler.updateColor(this);}
 requestRenderData(){return {data:[],floatStride:9,vertDirty:true,resize(vertices,indices){this.data=Array.from({length:vertices},()=>({x:0,y:0}));const b={vData:new Float32Array(4096*9),iData:new Uint16Array(indices+5),indexOffset:5};this.chunk={vb:new Float32Array(vertices*9),vertexOffset:7,bufferId:0,vertexAccessor:{buffers:[b],appendIndices},setIndexBuffer(){},meshBuffer:b};},updateRenderData(){}};}
}
const events=new Map(),listeners=new Set(),media={matches:false,addEventListener:(_,fn)=>listeners.add(fn),removeEventListener:(_,fn)=>listeners.delete(fn)};
class Component{}
const cc={UITransform,Sprite,Component,_decorator:{ccclass:()=>T=>T},Game:{EVENT_HIDE:'hide',EVENT_SHOW:'show'},game:{on:(event,fn,owner)=>{if(!events.has(event))events.set(event,new Map());events.get(event).set(owner,fn);},off:(event,fn,owner)=>events.get(event)?.delete(owner)}};
const mesh=compile('./ArticulatedMascot.ts',()=>cc);
const {ArticulatedMascot,MASCOT_GRID,MASCOT_INDICES,skinWeights,bonePose}=mesh;
const presets=[];
for(const [id,count] of [[15,4],[17,3],[18,3],[19,4],[20,4],[21,8],[22,8],[23,4],[25,8],[29,12]])for(let index=0;index<count;index++)presets.push({name:`F${id}:${index}`,bones:bonesFor(id,index)});
presets.push(...Object.entries(fullBodyBones).map(([name,bones])=>({name,bones,body:true})));
let samples=0,minRatio=Infinity;
for(const {name,bones,body} of presets){
 const weights=skinWeights(bones);
 for(let i=0;i<weights.length;i+=bones.length){let sum=0;for(let j=0;j<bones.length;j++){assert(Number.isFinite(weights[i+j]));assert(weights[i+j]>=0&&weights[i+j]<=1);sum+=weights[i+j];}assert(sum<=1.000001,name+' normalized influences');}
 for(const b of bones){assert(b.period>1.35);for(let t=0;t<30;t+=.05)assert(Math.abs(bonePose(b,t))<=1.000001);}
 for(const ratio of [.45,.7,1,1.4,1.8]){
  const ui=new UITransform();ui.width=256*ratio;
  const actor=new ArticulatedMascot();actor.node={getComponent:()=>ui,worldMatrix:{m00:2,m01:0,m02:0,m03:0,m04:0,m05:3,m06:0,m07:0,m12:11,m13:13,m14:0,m15:1}};
  actor._flushAssembler();actor.setBones(bones);actor.skinVertices();
  const rest=actor.renderData.data.map(v=>[v.x,v.y]),storedWeights=actor.weights,storedTransforms=actor.transforms;
  actor._assembler.updateUVs(actor);
  const uv=Array.from(actor.renderData.chunk.vb).filter((_,i)=>i%9===3||i%9===4);
  for(let t=0;t<30;t+=.1){
   actor.setPose(t);actor._assembler.updateRenderData(actor);
   const vertices=actor.renderData.data;
   for(const v of vertices)assert(Number.isFinite(v.x)&&Number.isFinite(v.y),name+' finite pose');
   for(let i=0;i<MASCOT_INDICES.length;i+=3){const a=vertices[MASCOT_INDICES[i]],b=vertices[MASCOT_INDICES[i+1]],c=vertices[MASCOT_INDICES[i+2]];const area=(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);const areaRatio=area/(ui.width*ui.height/MASCOT_GRID**2);minRatio=Math.min(minRatio,areaRatio);assert(areaRatio>.08,`${name} ratio=${ratio} t=${t.toFixed(1)} triangle fold: ${areaRatio}`);}
   if(body){const foot=vertices[Math.floor(MASCOT_GRID/2)];assert(Math.abs(foot.x-rest[Math.floor(MASCOT_GRID/2)][0])<1e-6&&Math.abs(foot.y-rest[Math.floor(MASCOT_GRID/2)][1])<1e-6,name+' fixed contact point');}
   assert.deepEqual(Array.from(actor.renderData.chunk.vb).filter((_,i)=>i%9===3||i%9===4),uv,name+' fixed texture coordinates');samples++;
  }
  assert.equal(actor.weights,storedWeights);assert.equal(actor.transforms,storedTransforms);
  actor.setPose(123,true);actor.skinVertices();for(let i=0;i<rest.length;i++)assert.deepEqual([actor.renderData.data[i].x,actor.renderData.data[i].y],rest[i],name+' reduced-motion bind pose');
  actor._assembler.fillBuffers(actor);assert.equal(actor.renderData.chunk.meshBuffer.indexOffset,MASCOT_INDICES.length+5);assert.equal(actor.renderData.chunk.meshBuffer.iData[5],7);assert(Math.abs(actor.renderData.chunk.vb[0]-(rest[0][0]*2+11))<1e-4,'Float32 world position');
 }
}
// Regression: several joint meshes share a near-full UI buffer during a
// transition, with normal sprites drawn later. Index upload must stay valid;
// capacity and per-actor indices must be reused on subsequent frames.
const overflowActor=new ArticulatedMascot();overflowActor.node={getComponent:()=>new UITransform(),worldMatrix:{m00:1,m01:0,m02:0,m03:0,m04:0,m05:1,m06:0,m07:0,m12:0,m13:0,m14:0,m15:1}};
overflowActor._flushAssembler();const overflowBuffer=overflowActor.renderData.chunk.meshBuffer;
overflowBuffer.iData=new Uint16Array(16384);overflowBuffer.indexOffset=15468;overflowBuffer.iData[15467]=123;
const reusedIndices=overflowActor.meshIndices;
overflowActor._assembler.fillBuffers(overflowActor);
assert.equal(overflowBuffer.indexOffset,18372);assert.equal(overflowBuffer.iData[15467],123,'existing batches preserved');
assert(overflowBuffer.iData.length>=4096*6,'reserve trailing ordinary sprites');
assert.equal(new Uint16Array(overflowBuffer.iData.buffer,0,overflowBuffer.indexOffset).length,18372,'upload view within capacity');
const expanded=overflowBuffer.iData;
for(let frame=0;frame<100;frame++){
 overflowBuffer.indexOffset=0;
 for(let a=0;a<7;a++){overflowActor.renderData.chunk.vertexOffset=a*529;overflowActor._assembler.fillBuffers(overflowActor);}
 assert.equal(overflowBuffer.indexOffset,7*MASCOT_INDICES.length);
 assert.equal(overflowBuffer.iData[6*MASCOT_INDICES.length],6*529,'shared chunk base index');
 // Model 98 normal quads drawn after the skinned meshes.
 overflowBuffer.indexOffset+=98*6;
 assert.doesNotThrow(()=>new Uint16Array(overflowBuffer.iData.buffer,0,overflowBuffer.indexOffset));
 assert.equal(overflowBuffer.iData,expanded,'no repeated buffer allocation');assert.equal(overflowActor.meshIndices,reusedIndices);
}
const bodyModule=compile('./FullBodyMascotRig.ts',name=>name==='cc'?cc:name==='./ArticulatedMascot'?mesh:{FULL_BODY_BONES:fullBodyBones},{globalThis:{window:{matchMedia:()=>media}}});
const rig=new bodyModule.FullBodyMascotRig(),actor=new ArticulatedMascot();rig.onLoad();rig.setup(actor,'salon-squirrel');
rig.update(10);assert.equal(actor.poseTime,.08,'frame time capped');events.get('hide').get(rig).call(rig);rig.update(1);assert.equal(actor.poseTime,.08,'background paused');
events.get('show').get(rig).call(rig);rig.update(.01);assert.equal(actor.poseTime,.09);media.matches=true;for(const fn of listeners)fn();rig.update(1);assert.equal(actor.poseTime,.09);assert.equal(actor.resting,true);
rig.onDestroy();assert.equal(listeners.size,0);assert.equal(events.get('hide').size,0);assert.equal(events.get('show').size,0);
const {StationaryArtwork}=compile('./StationaryArtwork.ts',()=>cc);
for(const name of ['portraits','hero0','avatar15','canopy-destinations-live-bg','f27/loading/crown','prize-big-win']){
 const n={name,children:[]};StationaryArtwork.mark(n,name);n.name='Renamed image';
 assert(StationaryArtwork.contains(n),'original resource tag survives rename: '+name);
 assert(StationaryArtwork.contains({name:'Layout parent',children:[n]}),'parent artwork stays fixed: '+name);
 StationaryArtwork.mark(n,'coin-decoration');assert(!StationaryArtwork.contains(n),'reused node untagged');
}
assert(!StationaryArtwork.contains({name:'Lantern tassel',children:[]}),'ordinary decorations still animate');
console.log(`PASS ${presets.length} reviewed bone presets; ${samples} mesh poses; minimum triangle area ratio=${minRatio.toFixed(3)}; fixed UV, contact point, bind pose, world transform, background, reduced motion and cleanup.`);
