import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
const require = createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium} = require('playwright');
const base = process.env.F20_BLINK_URL || 'http://127.0.0.1:54220/';
const out = process.env.F20_BLINK_EVIDENCE || join(import.meta.dirname,'verification/f20-blink-20261013');
mkdirSync(out,{recursive:true});
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context = await browser.newContext({viewport:{width:414,height:896},deviceScaleFactor:1});
const page = await context.newPage(), errors = [], resources = [], report = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => {if(m.type()==='error')errors.push(m.text());});
page.on('response', r => {if(r.status()>=400)resources.push({url:r.url(),status:r.status()});});
function scene(){
 const cc = window.cc, queue = [cc?.director.getScene()], nodes = [], rigs = [];
 let app;
 while(queue.length){
  const node = queue.shift();if(!node)continue;nodes.push(node);
  for(const component of node.components||[]){
   const name = cc.js.getClassName(component);
   if(name==='AureliaApp')app=component;
   if(name==='CanopyBlinkRig')rigs.push(component);
  }
  queue.push(...node.children);
 }
 return {cc,nodes,rigs,app};
}
const source = scene.toString();
async function run(code,arg){return page.evaluate(({source,code,arg})=>Function('state','arg',code)(Function('return ('+source+')()')(),arg),{source,code,arg});}
async function ready(){await page.waitForFunction(source=>{const s=Function('return ('+source+')()')();return s.app?.content&&!s.nodes.some(n=>n.activeInHierarchy&&n.name==='Loading');},source,{timeout:60000});await page.waitForTimeout(1100);}
async function clickNode(name){
 const point=await run(`
  const n=state.nodes.find(n=>n.activeInHierarchy&&n.name===arg&&n.getComponent('cc.UITransform'));if(!n)return null;
  const ui=n.getComponent('cc.UITransform'),canvas=document.querySelector('#GameCanvas'),rect=canvas.getBoundingClientRect(),origin=state.cc.view.getVisibleOrigin(),b=ui.getBoundingBoxToWorld();
  return {x:rect.left+(b.x+b.width/2-origin.x)*state.cc.view.getScaleX()/(canvas.width/canvas.clientWidth),y:rect.bottom-(b.y+b.height/2-origin.y)*state.cc.view.getScaleY()/(canvas.height/canvas.clientHeight)};
 `,name);
 assert(point,'Missing input '+name);await page.mouse.click(point.x,point.y);
}
function save(file,text){const old=(()=>{try{return readFileSync(file,'utf8');}catch{return null;}})();let patch='*** Begin Patch\n'+(old===null?'*** Add File: ':'*** Update File: ')+file+'\n';if(old!==null)patch+='@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n';patch+=text.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';execFileSync('apply_patch',[],{input:patch});}
async function capture(label,expected){
 const info=await run(`
  const forbidden=[];
  for(const n of state.nodes)for(const c of n.components||[])if(['LivingMascotRig','FullBodyMascotRig','ArticulatedMascot','ThemeMotion'].includes(state.cc.js.getClassName(c)))forbidden.push(state.cc.js.getClassName(c));
  return {count:state.rigs.length,forbidden,parts:state.rigs.map(r=>({art:r.node.name,texture:r.node.getComponent(state.cc.Sprite).spriteFrame.texture.name,eyes:r.eyes.length,children:r.canvas.children.map(n=>n.name),position:r.node.position.toString(),scale:r.node.scale.toString(),angle:r.node.angle}))};
 `);
 assert.equal(info.count,expected,label+' blink rig count');assert.deepEqual(info.forbidden,[],label+' stale deformation');
 await run('for(const r of state.rigs){r.elapsed=-1;r.wait=1e6;r.doubleBlink=false;r.display(-1);}');
 await page.waitForTimeout(100);await page.screenshot({path:join(out,label+'-open.png')});
 await run('for(const r of state.rigs)r.display(1);');
 await page.waitForTimeout(120);await page.screenshot({path:join(out,label+'-closed.png')});
 const after=await run('return state.rigs.map(r=>({position:r.node.position.toString(),scale:r.node.scale.toString(),angle:r.node.angle}));');
 assert.deepEqual(after,info.parts.map(({position,scale,angle})=>({position,scale,angle})),label+' original painting moved');
 const sequence=await run(`
  const r=state.rigs[0];if(!r)return [];
  const result=[];r.elapsed=0;r.doubleBlink=false;
  for(const dt of [.001,.04,.08,.05]){r.update(dt);result.push(r.shown);}
  return result;
 `);
 if(expected)assert.deepEqual(sequence,[0,1,1,-1],label+' shutter sequence');
 await run('for(const r of state.rigs)r.reset();');
 if(expected){
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  assert(await run('return state.rigs.every(r=>r.reduced&&r.shown===-1);'),label+' reduced motion');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await run('state.cc.game.emit(state.cc.Game.EVENT_HIDE);');
  assert(await run('return state.rigs.every(r=>r.hidden&&r.shown===-1);'),label+' background cleanup');
  await run('state.cc.game.emit(state.cc.Game.EVENT_SHOW);');
  const clocks=await run('return state.rigs.map(r=>r.wait);');
  if(clocks.length>1)assert(new Set(clocks).size>1,label+' characters blink in lockstep');
 }
 report.push({label,...info,sequence,stationary:true});console.log(label+': '+expected+' eyelid rigs, intact paintings');
}
try{
 await page.goto(base+'?debug=1&screen=home');await ready();
 for(let index=0;index<4;index++){
  if(index){await clickNode('Next destination');await page.waitForTimeout(700);}
  assert.equal(await run('return state.app.selectedRoute;'),index,'Hall destination switch');
  await capture('home-'+index,1);
 }
 for(const [index,id] of ['golden-hour','jade-treasury','pearl-palace','ruby-revel'].entries()){
  await page.goto(base+'?debug=1&screen=game&game='+id);await ready();
  await capture(id,id==='pearl-palace'?0:1);
  await page.setViewportSize({width:375,height:812});await page.waitForTimeout(500);
  await page.screenshot({path:join(out,id+'-375.png')});await page.setViewportSize({width:414,height:896});
  // Enter/leave with the real app navigation; no page reload masks node leaks.
  const old=await run('window.__oldBlinkRigs=state.rigs;return state.rigs.length;');
  await run('return state.app.navigate("home");');await ready();
  assert(await run('return window.__oldBlinkRigs.every(r=>!r.isValid);'),id+' retained destroyed rig');
  assert.equal(await run('return state.rigs.length;'),1,id+' home rig leak');
  if(index===0){
   // Reenter and complete a real gameplay round, then return to the hall.
   await run('return state.app.navigate("game",state.app.config);');await ready();
   await clickNode('SPIN');await page.waitForTimeout(200);assert(await run('return ["spinning","presenting"].includes(state.app.state.kind);'),'Spin not accepted');
    await page.waitForFunction(source=>Function('return ('+source+')()')().app.state.kind==='idle',source,{timeout:60000});
    await run('return state.app.navigate("home");');await ready();
    assert.equal(await run('return state.rigs.length;'),1,'Round return leaked rigs');
  }
 }
 assert.deepEqual(errors,[],'Browser runtime errors');assert.deepEqual(resources,[],'Missing resources');
 save(join(out,'browser-report.json'),JSON.stringify({base,date:new Date().toISOString(),report,errors,resources},null,2));
 console.log('PASS: F20 hall, four cabinets, navigation, original artwork and blink lifecycle');
}finally{await browser.close();}
