// Browser playback/state evidence, not human listening or an iPhone sound test.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {installMusicHostLifecycle} from './music-host-lifecycle.mjs';
const require=createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const ids=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number);
const buildFile=process.argv.find(a=>a.startsWith('--wait-build='))?.slice(13);
const games=(await(await fetch('http://127.0.0.1:63800/api/games')).json()).filter(g=>!ids.length||ids.includes(g.id));
const out=mkdtempSync(join(tmpdir(),'situation-audio-qa.')),results=[];
console.log('Situation evidence: '+out);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
function findApp(){const q=[window.cc?.director.getScene()];while(q.length){const n=q.shift();if(!n)continue;for(const c of n.components||[])if(['AureliaApp','VelvetApp','SlotGame','RegattaApp'].includes(cc.js.getClassName(c)))return c;q.push(...n.children);}return null;}
const appSource=findApp.toString();
async function call(page,code,arg){return page.evaluate(({appSource,code,arg})=>Function('app','arg',code)(Function('return ('+appSource+')()')(),arg),{appSource,code,arg});}
async function tree(page){return page.evaluate(()=>{const q=[window.cc?.director.getScene()],a=[];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;a.push(n.name);q.push(...n.children);}return a;});}
async function clickNode(page,names,optional=false){
 const point=await page.evaluate(names=>{const canvas=document.querySelector('#GameCanvas'),r=canvas.getBoundingClientRect(),origin=cc.view.getVisibleOrigin(),q=[cc.director.getScene()];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;if(names.includes(n.name)){const t=n.getComponent('cc.UITransform');if(t){const b=t.getBoundingBoxToWorld();return{x:r.left+(b.x+b.width/2-origin.x)*cc.view.getScaleX()/(canvas.width/canvas.clientWidth),y:r.bottom-(b.y+b.height/2-origin.y)*cc.view.getScaleY()/(canvas.height/canvas.clientHeight)};}}q.push(...n.children);}return null;},names);
 if(!point&&optional)return false;assert(point,'Missing UI '+names);await page.mouse.click(point.x,point.y);return true;
}
function observe(){
 window.__situationMedia=[];window.__situationFiles=[];
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){if(!window.__situationMedia.includes(this))window.__situationMedia.push(this);if(this.src)window.__situationFiles.push(this.src.split('/').at(-1));return play.call(this);};
 const fetchOriginal=window.fetch;
 window.fetch=function(input,...rest){const url=typeof input==='string'?input:input?.url;if(url&&/audio\/win-/.test(url))window.__situationFiles.push(url.split('/').at(-1));return fetchOriginal.call(this,input,...rest);};
}
async function enter(page,g){
 if(g.id===26){
  await page.goto(g.url+'?debug=1');await page.locator('#auth-consent').check();await page.locator('[data-action="auth-guest"]').click();await page.waitForSelector('.destination');await page.locator('[data-game="mint"]').click();await page.waitForSelector('.mode-transition',{state:'detached'});
  await page.evaluate(async()=>{const{TidalSound}=await import('./src/tidal-sound.js');const fn=TidalSound.prototype.cue;TidalSound.prototype.cue=function(...args){window.__qaSound=this;return fn.apply(this,args);};});
  await page.locator('.game-header [data-action="rules"]').click();await page.locator('[data-action="close"]').click();
 }else{
  await page.goto(g.url+'?debug=1&screen=game&game='+g.cabinets[0]);
  await page.waitForFunction(({appSource,id})=>{const a=Function('return ('+appSource+')()')();return id===27?a?.art?.get('f27/scenes/lobby-treasury')&&a.pageRoot?.name.startsWith('Page '):a&&a.ready!==false&&(a.root||a.stage||a.content);},{appSource,id:g.id},{timeout:60000});
  if(g.id===25){await call(page,'app.page="home";app.render();');await call(page,'return app.enter(0);');}
  if(g.id===27){await call(page,'app.navigate("home",true);');await call(page,'return app.enterMode("royal-mint");');}
  await page.waitForFunction(appSource=>{const a=Function('return ('+appSource+')()')();return a?.page==='game'&&!a.busy&&!a.transition&&!a.transitioning&&!a.uiLocked;},appSource,{timeout:50000});
  await call(page,'let m=app.webMusic||app.audio;const q=[cc.director.getScene()];while(q.length&&!m){const n=q.shift();m=n.components.find(c=>cc.js.getClassName(c)==="AudioManager");q.push(...n.children);}if(!m?.situationStatus)throw Error("Situation manager missing");window.__qaSound=m;m.setMusic(true);m.setEffects(true);');
 }
 await page.mouse.click(2,2);await page.waitForTimeout(500);
 await page.evaluate(()=>{
  const m=window.__qaSound;window.__situationEvents=[];
  if(m.playWinMusic){const fn=m.playWinMusic.bind(m);m.playWinMusic=function(id,...args){window.__situationFiles.push(id+'.m4a');return fn(id,...args);};}
  for(const name of ['beginSpin','finishSpin','setModalOpen','finishWinPresentation','finishAward'])if(m[name]){const fn=m[name].bind(m);m[name]=function(...args){const before=m.situationStatus();const r=fn(...args);window.__situationEvents.push({name,args,before,after:m.situationStatus()});return r;};}
 });
}
async function snapshot(page){return page.evaluate(()=>{
 const m=window.__qaSound;
 return{...m.situationStatus(),gain:m.music?.gain?.gain?.value??m.music?.volume,files:window.__situationFiles.slice(),events:window.__situationEvents.slice(),playing:window.__situationMedia.filter(a=>a.src&&!a.paused).map(a=>({src:a.src.split('/').at(-1),time:a.currentTime,ready:a.readyState})),voices:m.samples?.status().voices};
});}
const awardNodes=['Treasure celebration','Award','Grand fortune stage','Grand treasure stage'];
async function collect(page,g){
 if(g.id===26){if(await page.locator('.award-dialog').count())await page.locator('.award-dialog .primary[data-action="close"]').click();return;}
 const names=g.id===25?['Collect award']:g.id===27?['Collect reward']:g.id===28?['Collect & continue']:['Collect your treasure','Collect treasure'];
 for(let n=0;n<5;n++){
  if(!(await tree(page)).some(x=>awardNodes.includes(x)))return;
  await clickNode(page,names,true);
  // Collect begins an exit tween (F25 takes .22s). Do not click the same
  // coordinates again while that node is being destroyed: the second click
  // can otherwise land on the SPIN control underneath the dismissed award.
  try{
   await page.waitForFunction(names=>{const q=[window.cc?.director.getScene()];while(q.length){const node=q.shift();if(!node?.activeInHierarchy)continue;if(names.includes(node.name))return false;q.push(...node.children);}return true;},awardNodes,{timeout:1800});
   return;
  }catch(error){if(error.name!=='TimeoutError')throw error;}
 }throw Error('Award UI stuck');
}
async function modal(page,g,checks){
 const baseline=await snapshot(page);
 if(g.id===26)await page.locator('.game-header [data-action="rules"]').click();else await call(page,'app.rules();');
 await page.waitForTimeout(350);const open=await snapshot(page);assert(open.modal,'Rules dialog does not set modal mix');assert(open.gain<baseline.gain*.7,'Modal BGM not reduced');
 if(g.id===26)await page.locator('[data-action="close"]').click();else if(g.id===28)await clickNode(page,['Cancel']);else await call(page,'app.closeModal();');
 await page.waitForTimeout(350);const closed=await snapshot(page);assert(!closed.modal&&closed.gain>open.gain*1.5,'Dialog close does not restore BGM');checks.push({modalOpened:open.gain,modalClosed:closed.gain});
}
async function actualSpin(page,g,checks){
 if(![25,26,27,28].includes(g.id))await call(page,'app.accept();');
 await page.evaluate(()=>{window.__situationFiles=[];window.__situationEvents=[];});
 const click=async()=>{
  if(g.id!==26)return clickNode(page,g.id===27?['SPIN control']:['SPIN']);
  const spin=page.locator('#spin');await spin.waitFor({state:'visible'});assert(await spin.isEnabled(),'F26 spin disabled');
  const box=await spin.boundingBox();assert(box,'F26 spin bounds missing');const center={x:box.x+box.width/2,y:box.y+box.height/2};
  assert(await page.evaluate(p=>!!document.elementFromPoint(p.x,p.y)?.closest('#spin'),center),'F26 spin target covered');
  await page.mouse.click(center.x,center.y);
 };
 await click();await page.waitForFunction(()=>window.__qaSound.situationStatus().spinning,{timeout:10000});
 await page.waitForFunction(()=>window.__situationMedia.some(a=>a.src.includes('music-spin.m4a')&&!a.paused&&a.currentTime>.04),{timeout:10000});
 let r=await snapshot(page);assert.equal(r.track,'spin');
 // A second tap while the accepted spin is underway must not restart music.
 if(g.id===26)await page.locator('#spin').evaluate(e=>e.click());else await click();
 r=await snapshot(page);assert.equal(r.events.filter(e=>e.name==='beginSpin'&&!e.before.spinning&&e.after.spinning).length,1,'Invalid repeated tap restarts spin BGM');
 const began=r.events.find(e=>e.name==='beginSpin');assert(began&&!began.before.celebrating);
 for(let n=0;n<140;n++){
  await collect(page,g);
  const idle=g.id===26?await page.evaluate(()=>!window.f26.busy):await call(page,'return arg===25?!app.busy:arg===27?!app.spinning:arg===28?app.session.phase==="idle":app.state.kind==="idle";',g.id);
  if(idle)break;if(n===139)throw Error('Real spin did not settle');await page.waitForTimeout(250);
 }
 await collect(page,g);await page.waitForTimeout(500);r=await snapshot(page);
 assert(!r.spinning&&r.track==='cabinet','Last reel/settlement does not restore cabinet track');
 assert(r.events.some(e=>e.name==='finishSpin'&&e.before.spinning&&!e.after.spinning),'No real reel-ending transition');
 checks.push({realAcceptedSpin:true,ignoredRepeatedTap:true,spinFile:'music-spin.m4a',reelEndRestored:true,events:r.events});
}
async function awardFixture(page,g,ratio){
 await page.evaluate(()=>window.__situationFiles=[]);
 if(g.id===26){await page.evaluate(r=>window.f26.previewAward(window.f26.bet*r),ratio);return;}
 await call(page,`let p;const amount=arg.ratio*100;
 if(arg.id===25)p=app.presentAward(amount,true,100);
 else if(arg.id===27)p=app.presentStages({totalWin:amount,bet:100,stages:[],feature:undefined});
 else if(arg.id===28){const first=app.round.stages[0],symbol=first.grid[0][0],stage={...first,awards:[{kind:'line',symbol,cells:[{column:0,row:0}],matches:3,ways:1,multiplier:1,amount,line:1}],removed:[]};app.round={...app.round,totalWin:amount,bet:100,stages:[stage]};app.grandShown=false;app.presenting=false;app.transitioning=false;app.stageIndex=0;app.stageTime=0;app.counterStart=0;app.awardShown=0;if(arg.ratio>1){app.finishRound();p=Promise.resolve();}else{app.presenting=true;app.presentStage();}}
 else p=[13,14,15,17,18,19,20,21,30,33].includes(arg.id)?app.presentWin(amount,false,false,100):app.presentWin(amount,false,100);
 window.__fixtureDone=false;Promise.resolve(p).then(()=>window.__fixtureDone=true);`,{id:g.id,ratio});
}
async function awards(page,g,checks){
 // Preserve each shipped game's own tier count/thresholds. These are five
 // payout fixtures, not permission to introduce new tiers or change math.
 const rank=ratio=>ratio<=1?0:g.id===16?(ratio>=40?3:ratio>=15?2:1):[22,23,24,29,31].includes(g.id)?(ratio>=100?3:ratio>=50?2:1):(ratio>=100?4:ratio>=50?3:ratio>=10?2:1);
 for(const ratio of [.5,2,20,60,100]){
  const file=['win-small.m4a','win-big.m4a','win-mega.m4a','win-epic.m4a','win-super.m4a'][rank(ratio)];
  await awardFixture(page,g,ratio);
  // Record selected IDs even when a real spin has already warmed the PCM cache.
  await page.waitForFunction(file=>window.__situationFiles.includes(file),file,{timeout:12000});
  await page.waitForTimeout(ratio>1?1400:2200);let s=await snapshot(page);
  if(ratio>1){assert(s.celebrating,'Short sting ended and restored BGM before award UI ended');assert(s.gain<.12,'Award BGM is not ducked');await collect(page,g);}
  if(g.id===25&&ratio<1)await page.evaluate(()=>window.__qaSound.finishWinPresentation());
  // F26's real coin collection takes 1.268s, then pulses for .36s. Let it
  // finish before injecting the next isolated fixture; real Spin cancels it.
  await page.waitForTimeout(g.id===26?1700:550);s=await snapshot(page);assert(!s.spinning,'Award starts spin music');assert(!s.celebrating,'Collect/skip does not clear celebration state');assert(s.gain>.3,'Collect does not restore environment');checks.push({ratio,file,collectRestored:true});
 }
}
async function lifecycle(page,g,checks){
 await page.evaluate(id=>{const m=window.__qaSound;if(id===26)m.configure(m.scene,false);else m.setMusic(false);},g.id);await page.waitForTimeout(400);
 assert((await snapshot(page)).playing.every(a=>!a.src.startsWith('music-')),'Mute leaves a loop playing');
 await page.evaluate(id=>{const m=window.__qaSound;if(id===26)m.configure(m.scene,true);else m.setMusic(true);},g.id);await page.mouse.click(2,2);await page.waitForTimeout(500);assert((await snapshot(page)).playing.some(a=>a.src==='music-cabinet.m4a'),'Unmute failed');
 await page.evaluate(()=>window.__musicHostLifecycle(false));await page.waitForTimeout(250);assert.equal((await snapshot(page)).playing.length,0,'Background audio still playing');
 await page.evaluate(()=>window.__musicHostLifecycle(true));await page.mouse.click(2,2);await page.waitForTimeout(600);assert((await snapshot(page)).playing.some(a=>a.src==='music-cabinet.m4a'),'Resume failed');
 if(g.id===26)await page.locator('.game-header [data-page="home"]').click();else await call(page,'if(arg===25){app.page="home";app.render();}else if(arg===27)app.navigate("home",true);else if(arg===28)app.go("home");else app.navigate("home");',g.id);
 await page.waitForTimeout(700);const home=await snapshot(page);assert(!home.spinning&&!home.celebrating&&!home.modal&&home.track==='home','Page exit leaves music state behind');assert(home.playing.filter(a=>a.src.startsWith('music-')).length<=1,'Old loop survives scene switch');checks.push({mute:true,backgroundNoBacklog:true,returnHome:true});
}
for(const g of games){
 if(buildFile&&g.id!==26){for(let n=0;n<1800;n++){const b=existsSync(buildFile)?JSON.parse(readFileSync(buildFile)).find(x=>x.id===g.id):null;if(b){assert(b.success&&b.compression,'Fresh build failed F'+g.id);break;}if(n===1799)throw Error('Build wait exceeded F'+g.id);await new Promise(r=>setTimeout(r,1000));}}
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1}),page=await context.newPage(),checks=[],errors=[],missing=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&/audio\/.*\.(m4a|wav)/.test(r.url()))missing.push(r.url());});await page.addInitScript(observe);await page.addInitScript(installMusicHostLifecycle);
 try{await enter(page,g);await modal(page,g,checks);await actualSpin(page,g,checks);await awards(page,g,checks);await lifecycle(page,g,checks);assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(missing.length,0,JSON.stringify(missing));results.push({id:g.id,passed:true,checks,errors,missing});console.log(`F${g.id} SITUATION PASS`);}
 catch(e){results.push({id:g.id,passed:false,error:String(e),checks,errors,missing,snapshot:await snapshot(page).catch(()=>null)});console.log(`F${g.id} SITUATION FAIL: ${String(e).slice(0,240)}`);}
 finally{await context.close();writeFileSync(join(out,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),scope:'Actual accepted spin/reel end, repeated tap, real modal methods, five presentation fixtures, mute/background/home playback. Not human listening, real iPhone or payment testing.',games:results},null,2));}
}
await browser.close();console.log('Situation results: '+join(out,'results.json'));if(results.some(r=>!r.passed))process.exitCode=1;
