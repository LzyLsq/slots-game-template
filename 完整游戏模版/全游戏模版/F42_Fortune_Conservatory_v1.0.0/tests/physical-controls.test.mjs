import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONTROL_ART,controlGeometry,PhysicalControls} from '../src/physical-controls.mjs';
const manifest=JSON.parse(readFileSync(new URL('../assets/art/manifest.json',import.meta.url)));
test('button face geometry agrees with the actual high-resolution asset masks',()=>{
 for(const [name,art]of Object.entries(CONTROL_ART)){
  const asset=manifest[name];assert.equal(art.width,asset.width);assert.equal(art.height,asset.height);
  assert.ok(art.face.every((v,i)=>Math.abs(v-asset.socketMask[i]/(i%2?art.height:art.width))<1e-9));
 }
});
test('carved caps are not squeezed across compact, wide or tall controls',()=>{
 for(const name of Object.keys(CONTROL_ART))for(const [w,h]of [[44,44],[60,37],[80,44],[285,57],[350,56],[90,80]]){
  const g=controlGeometry(name,w,h),art=CONTROL_ART[name];
  assert.ok(g.left>=0&&g.top>=0&&g.width<=w+.01&&g.height<=h+.01);
  assert.ok(g.label.left>=g.left&&g.label.top>=g.top&&g.label.width>0&&g.label.height>0);
  assert.ok(g.label.left+g.label.width<=g.left+g.width+.01&&g.label.top+g.label.height<=g.top+g.height+.01);
  if(art.slice){assert.ok(g.cap*2<g.width);assert.ok(Math.abs(g.cap/g.height-art.width/art.height*art.slice)<1e-9);}
  else assert.ok(Math.abs(g.width/g.height-art.width/art.height)<1e-9);
 }
 assert.equal(controlGeometry('missing',44,44),null);assert.equal(controlGeometry('button-gold',0,44),null);
});
function fixture(enabled=true){
 const controls=Object.assign(Object.create(PhysicalControls.prototype),{enabled:()=>enabled,active:new Map(),lastRelease:new WeakMap(),reactions:new Map()});
 const createButton=()=>{
  const classes=new Set(['physical-control']),animations=[];
  const element={animate(){const a={cancelled:false,cancel(){this.cancelled=true;},finished:new Promise(()=>{})};animations.push(a);return a;}};
  return{isConnected:true,disabled:false,animations,classList:{add(...ns){ns.forEach(n=>classes.add(n));},remove(...ns){ns.forEach(n=>classes.delete(n));},contains:n=>classes.has(n)},querySelectorAll:()=>[element,element],querySelector:()=>element};
 };
 return {controls,createButton};
}
test('each pointer owns its press, and cancellation cannot release another finger',()=>{
 const {controls:c,createButton}=fixture(),a=createButton(),b=createButton();c.press(a,'pointer:1');c.press(b,'pointer:2');
 c.releaseOwner('pointer:1',false);assert.ok(!c.active.has(a)&&c.active.has(b));assert.ok(a.animations.every(n=>n.cancelled));assert.ok(b.classList.contains('is-depressed'));
 c.clear();assert.equal(c.active.size,0);assert.ok(!b.classList.contains('is-held'));
});
test('rapid repeated presses replace the previous rebound rather than stacking it',()=>{
 const {controls:c,createButton}=fixture(),b=createButton();c.press(b);c.release(b);const previous=[...c.reactions.get(b)];c.press(b);
 assert.ok(previous.every(a=>a.cancelled));assert.equal(c.reactions.size,0);const count=b.animations.length;c.press(b);c.commit(b);assert.equal(b.animations.length,count);c.clear();
});
test('disabled/disconnected buttons do not press; disabling held controls restores neutral',()=>{
 const {controls:c,createButton}=fixture(),b=createButton();b.disabled=true;c.press(b);assert.equal(c.active.size,0);b.disabled=false;b.isConnected=false;c.press(b);assert.equal(c.active.size,0);
 b.isConnected=true;c.press(b);b.disabled=true;c.cancel(b);assert.ok(!b.classList.contains('is-depressed')&&!b.classList.contains('is-held'));assert.equal(c.reactions.size,0);
});
test('reduced motion retains immediate held feedback without moving the face',()=>{
 const {controls:c,createButton}=fixture(false),b=createButton();c.press(b,'key: ');assert.ok(b.classList.contains('is-held'));assert.ok(!b.classList.contains('is-depressed'));assert.equal(b.animations.length,0);c.releaseOwner('key: ');assert.ok(!b.classList.contains('is-held'));assert.equal(c.reactions.size,0);
});
