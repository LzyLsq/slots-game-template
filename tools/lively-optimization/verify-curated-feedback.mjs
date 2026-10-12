// Isolated browser fixtures verify production cue/lifecycle paths, not listening quality.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {installMusicHostLifecycle} from './music-host-lifecycle.mjs';
const require=createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const ids=process.argv.slice(2).filter(x=>/^\d+$/.test(x)).map(Number);
const buildFile=process.argv.find(x=>x.startsWith('--wait-build='))?.slice(13);
const creditsOnly=process.argv.includes('--credits-only');
const games=(await(await fetch('http://127.0.0.1:63800/api/games')).json()).filter(g=>!ids.length||ids.includes(g.id));
const out=mkdtempSync(join(tmpdir(),'curated-feedback.')),results=[];
console.log('Feedback evidence: '+out);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
function findApp(){const q=[window.cc?.director.getScene()];while(q.length){const n=q.shift();if(!n)continue;for(const c of n.components||[])if(['AureliaApp','VelvetApp','SlotGame','RegattaApp'].includes(cc.js.getClassName(c)))return c;q.push(...n.children);}return null;}
const appSource=findApp.toString();
async function call(page,code,arg){return page.evaluate(({appSource,code,arg})=>Function('app','arg',code)(Function('return ('+appSource+')()')(),arg),{appSource,code,arg});}
async function tree(page){return page.evaluate(()=>{const q=[window.cc?.director.getScene()],a=[];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;a.push(n.name);q.push(...n.children);}return a;});}
async function clickNode(page,names,optional=false){const point=await page.evaluate(names=>{const canvas=document.querySelector('#GameCanvas'),r=canvas.getBoundingClientRect(),origin=cc.view.getVisibleOrigin(),q=[cc.director.getScene()];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;if(names.includes(n.name)){const t=n.getComponent('cc.UITransform');if(t){const b=t.getBoundingBoxToWorld();return{x:r.left+(b.x+b.width/2-origin.x)*cc.view.getScaleX()/(canvas.width/canvas.clientWidth),y:r.bottom-(b.y+b.height/2-origin.y)*cc.view.getScaleY()/(canvas.height/canvas.clientHeight)};}}q.push(...n.children);}return null;},names);if(!point&&optional)return false;assert(point,'Missing '+names);const v=page.viewportSize();assert(point.x>0&&point.x<v.width&&point.y>0&&point.y<v.height,'Offscreen '+names+': '+JSON.stringify(point));await page.mouse.click(point.x,point.y);return true;}
async function waitBuild(id){if(!buildFile||id===26)return;for(let n=0;n<1800;n++){const r=existsSync(buildFile)?JSON.parse(readFileSync(buildFile)).find(x=>x.id===id):null;if(r){assert(r.success&&r.compression,'Build failed F'+id);return;}await new Promise(r=>setTimeout(r,1000));}throw Error('Build wait exceeded F'+id);}
async function enter(page,g){
 if(g.id===26){await page.goto(g.url+'?debug=1');await page.locator('#auth-consent').check();await page.locator('[data-action="auth-guest"]').click();await page.waitForSelector('.destination');await page.locator('[data-game="mint"]').click();await page.waitForSelector('.mode-transition',{state:'detached'});await page.evaluate(async()=>{const {TidalSound}=await import('./src/tidal-sound.js');const cue=TidalSound.prototype.cue;TidalSound.prototype.cue=function(...args){window.__qaSound=this;return cue.apply(this,args);};});await page.locator('.game-header [data-action="rules"]').click();await page.locator('[data-action="close"]').click();return;}
 await page.goto(g.url+'?debug=1&screen=game&game='+g.cabinets[0]);
 await page.waitForFunction(({appSource,id})=>{const a=Function('return ('+appSource+')()')();return id===27?a?.art?.get('f27/scenes/lobby-treasury')&&a.pageRoot?.name.startsWith('Page '):a&&a.ready!==false&&(a.root||a.stage||a.content);},{appSource,id:g.id},{timeout:60000});
 if(g.id===25)await call(page,'app.page="home";app.render();return app.enter(0);');
 if(g.id===27){await call(page,'app.navigate("home",true);');await call(page,'return app.enterMode("royal-mint");');}
 await page.waitForFunction(appSource=>{const a=Function('return ('+appSource+')()')();return a?.page==='game'&&!a.busy&&!a.transition&&!a.transitioning&&!a.uiLocked;},appSource,{timeout:50000});
 await page.waitForTimeout(550);
 await page.mouse.click(2,2);
}
async function instrument(page,g){
 if(g.id!==26)await call(page,`let manager=app.webMusic;const q=[cc.director.getScene()];while(q.length&&!manager){const n=q.shift();manager=n.components.find(c=>cc.js.getClassName(c)==='AudioManager');q.push(...n.children);}if(!manager)throw Error('No feedback manager');window.__qaSound=manager;manager.setEffects(true);`);
 await page.waitForFunction(()=>window.__qaSound?.samples?.status().buffers===16,{timeout:15000});
 await page.evaluate(()=>{const s=window.__qaSound.samples,p=s.play.bind(s);window.__qaCues=[];s.play=(...a)=>{window.__qaCues.push({id:a[0],group:a[2],time:performance.now()});return p(...a);};});
}
async function status(page){return page.evaluate(()=>({samples:window.__qaSound.samples.status(),cues:window.__qaCues.slice()}));}
async function reset(page){await page.evaluate(()=>{window.__qaSound.samples.stop();window.__qaCues=[];});}
async function startAward(page,g,ratio){await reset(page);await call(page,`window.__qaAward={done:false};let p;const amount=arg.ratio*100;
 if(arg.id===25)p=app.presentAward(amount,true,100);
 else if(arg.id===27)p=app.presentStages({totalWin:amount,bet:100,stages:[],feature:undefined});
 else if(arg.id===28){if(!app.round)throw Error('Actual spin must precede presentation fixture');const first=app.round.stages[0],symbol=first.grid[0][0];const stage={...first,awards:[{kind:'line',symbol,cells:[{column:0,row:0}],matches:3,ways:1,multiplier:1,amount,line:1}],removed:[]};app.round={...app.round,totalWin:amount,bet:100,stages:[stage]};app.grandShown=false;app.presenting=false;app.transitioning=false;app.stageIndex=0;app.stageTime=0;app.counterStart=0;app.awardShown=0;if(arg.ratio>1){app.finishRound();p=Promise.resolve();}else{app.presenting=true;app.presentStage();p=new Promise(resolve=>{const poll=setInterval(()=>{if(!app.presenting){clearInterval(poll);resolve();}},50);});}}
 else p=[13,14,15,17,18,19,20,21,30,33].includes(arg.id)?app.presentWin(amount,false,false,100):app.presentWin(amount,false,100);
 Promise.resolve(p).then(()=>window.__qaAward.done=true,e=>{window.__qaAward.done=true;window.__qaAward.error=String(e);});`,{id:g.id,ratio});}
const stages=['Treasure celebration','Award','Grand fortune stage','Grand treasure stage'];
async function closeAward(page,g){const names=g.id===25?['Collect award']:g.id===27?['Collect reward']:g.id===28?['Collect & continue']:['Collect your treasure','Collect treasure'];for(let n=0;n<30;n++){if(!(await tree(page)).some(x=>stages.includes(x)))return;await clickNode(page,names,true);await page.waitForTimeout(350);}throw Error('Award stuck');}
async function awards(page,g,checks){
 await startAward(page,g,.5);await page.waitForTimeout(1800);await page.waitForFunction(()=>window.__qaAward.done,{timeout:15000});await page.waitForTimeout(150);
 let r=await status(page);assert(r.cues.some(x=>/^coin-/.test(x.id)),'Ordinary displayed count has no sound');if(g.id===25){assert.equal(r.cues.filter(x=>x.id==='collect').length,0,'A free-spin sub-award is not final settlement');await call(page,'app.coinFlight(360,app.H*.5);');await page.waitForTimeout(1800);r=await status(page);}assert.equal(r.cues.filter(x=>x.id==='collect').length,1,'Ordinary collect must sound once');checks.push({ordinaryCount:true,ordinaryCollectOnce:true,f25SettlementFlightFixture:g.id===25,cues:r.cues});
 await startAward(page,g,2);await page.waitForTimeout(2700);r=await status(page);assert(r.cues.some(x=>/^coin-/.test(x.id)),'Big amount has no count feedback');
 await closeAward(page,g);await page.waitForTimeout(400);r=await status(page);assert.equal(r.cues.filter(x=>x.id==='collect').length,1,'Big collect must sound once');checks.push({bigCount:true,bigCollectOnce:true,cues:r.cues});
}
async function realSpin(page,g,checks){
 if(![25,27,28].includes(g.id))await call(page,'app.accept();app.turbo=true;');
 await reset(page);await clickNode(page,g.id===27?['SPIN control']:['SPIN']);await page.waitForFunction(()=>window.__qaCues.some(x=>x.id==='spin-start'),{timeout:10000});
 let r=await status(page);assert.equal(r.cues.filter(x=>x.id==='spin-start').length,1,'Spin cue must sound once');assert.equal(r.cues.filter(x=>x.id==='ui-tap').length,0,'Spin control doubles generic tap');
 for(let n=0;n<100;n++){if((await tree(page)).some(x=>stages.includes(x)))await closeAward(page,g);const idle=await call(page,'return arg===25?!app.busy:arg===27?!app.spinning:arg===28?app.session.phase==="idle":app.state.kind==="idle";',g.id);if(idle)break;await page.waitForTimeout(300);}
 r=await status(page);assert(r.cues.filter(x=>/^stop-/.test(x.id)).length>=3,'Missing actual column-stop sound');checks.push({realSpin:true,oneLaunchNoTap:true,columnStops:r.cues.filter(x=>/^stop-/.test(x.id))});
}
async function playerContract(page,g,checks){await reset(page);
 await page.evaluate(id=>{const a=window.__qaSound;if(id===26){a.cue('tap');a.cue('back');a.cue('select');a.cue('bet-up');a.cue('bet-down');a.cue('spin');a.cue('stop');a.detail('reveal');a.detail('collect');}else{for(const cue of ['tap','back','select','bet-up','bet-down','spin'])a.play(cue);a.playReelStop(0);a.playWinDetail('reveal');a.playWinDetail('collect');}},g.id);
 await page.waitForTimeout(650);let r=await status(page);assert(r.samples.played>=8,'No decoded feedback playback');assert.equal(r.samples.buffers,16);assert.equal(r.samples.errors.length,0);
 await page.evaluate(id=>{const a=window.__qaSound;for(let n=0;n<100;n++){if(id===26){a.cue('tap');a.detail('count',.5);}else{a.play('tap');a.playWinDetail('count',.5);}}},g.id);
 await page.waitForTimeout(700);r=await status(page);assert(r.samples.highWater<=12,'Voice cap violated');assert(r.samples.dropped>0,'Rapid click throttling absent');checks.push({decodeAll16:true,voiceCap:r.samples.highWater,rateLimited:true,decodedBytes:r.samples.decodedBytes});
 await page.evaluate(id=>{const a=window.__qaSound;if(id===26)a.configure(a.scene,false);else a.setEffects(false);},g.id);const played=(await status(page)).samples.played;
 await page.evaluate(id=>{const a=window.__qaSound;if(id===26)a.cue('spin');else a.play('spin');},g.id);await page.waitForTimeout(300);assert.equal((await status(page)).samples.played,played);assert.equal((await status(page)).samples.voices,0);
 await page.evaluate(id=>{const a=window.__qaSound;if(id===26)a.configure(a.scene,true);else a.setEffects(true);window.__musicHostLifecycle(false);},g.id);const before=(await status(page)).samples.played;
 await page.evaluate(id=>{const a=window.__qaSound;if(id===26)a.cue('spin');else a.play('spin');},g.id);await page.waitForTimeout(220);assert.equal((await status(page)).samples.played,before);assert.equal((await status(page)).samples.voices,0);
 await page.evaluate(()=>window.__musicHostLifecycle(true));await page.waitForTimeout(300);assert.equal((await status(page)).samples.played,before);checks.push({mutedSilent:true,backgroundSilent:true,noResumeBacklog:true});
}
async function tidesFlow(page,checks){
 await reset(page);const spin=page.locator('#spin');await spin.waitFor({state:'visible'});assert.equal(await spin.isEnabled(),true);const box=await spin.boundingBox();assert(box);const center={x:box.x+box.width/2,y:box.y+box.height/2};assert(await page.evaluate(p=>!!document.elementFromPoint(p.x,p.y)?.closest('#spin'),center),'F26 spin hit target covered');await page.mouse.click(center.x,center.y);
 await page.waitForFunction(()=>window.__qaCues.some(c=>c.id==='spin-start'),{timeout:5000});
 await page.waitForFunction(()=>!window.f26.busy,{timeout:30000});
 let r=await status(page);assert.equal(r.cues.filter(c=>c.id==='spin-start').length,1);assert.equal(r.cues.filter(c=>c.id==='ui-tap').length,0);assert(r.cues.filter(c=>/^stop-/.test(c.id)).length>=3);checks.push({realSpin:true,oneLaunchNoTap:true,columnStops:r.cues.filter(c=>/^stop-/.test(c.id))});
 if(await page.locator('.award-dialog').count())await page.locator('.award-dialog .primary[data-action="close"]').click();await page.waitForTimeout(1600);
 for(const ratio of [.5,2]){
  await reset(page);await page.evaluate(ratio=>window.f26.previewAward(window.f26.bet*ratio),ratio);await page.waitForTimeout(1800);
  r=await status(page);assert(r.cues.some(c=>/^coin-/.test(c.id)),'F26 count cue absent');
  if(ratio>1){await page.locator('.award-dialog .primary[data-action="close"]').click();await page.waitForTimeout(1700);}
  r=await status(page);assert.equal(r.cues.filter(c=>c.id==='collect').length,1,'F26 collect must sound once');checks.push({ratio,count:true,collectOnce:true,cues:r.cues});
 }
 // Current UI uses a wager picker. Selecting the already accepted amount is not a change.
 await page.locator('[data-action="bet-picker"]').click();await reset(page);await page.locator('[data-action="bet-select"][data-value="1000"]').click();assert.equal((await status(page)).cues.filter(c=>c.id==='bet-up').length,1);
 await page.locator('[data-action="bet-picker"]').click();await reset(page);await page.locator('[data-action="bet-select"][data-value="1000"]').click();assert.equal((await status(page)).cues.length,0,'F26 unchanged wager sounds successful');
 await page.locator('[data-action="bet-picker"]').click();await reset(page);await page.locator('[data-action="bet-select"][data-value="500"]').click();assert.equal((await status(page)).cues.filter(c=>c.id==='bet-down').length,1);checks.push({actualBetPicker:true,unchangedWagerSilent:true});
}
async function openCredits(page,g){
 if(g.id===26){await page.evaluate(()=>window.f26.navigate('profile'));await page.locator('[data-pane="controls"]').click();await page.locator('[data-action="music-credits"]').click();return;}
 if(g.id===25){await call(page,'app.page="account";app.render();const q=[app.stage];while(q.length){const n=q.shift(),s=n.getComponent("cc.ScrollView");if(s)s.scrollToBottom(0);q.push(...n.children);}');await page.waitForTimeout(350);}
 else if(g.id===27)await call(page,'app.navigate("account",true);');
 else if(g.id===28)await call(page,'app.settings();');
 else await call(page,'return app.navigate("profile");');
 await page.waitForTimeout(350);await clickNode(page,['Credits','Music credits','Account Credits']);
}
for(const g of games){await waitBuild(g.id);const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1}),page=await context.newPage(),errors=[],missing=[],checks=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&/audio\/|sfx-|win-.*m4a/.test(r.url()))missing.push({url:r.url(),status:r.status()});});await page.addInitScript(installMusicHostLifecycle);
 try{await enter(page,g);await instrument(page,g);if(!creditsOnly){if(g.id!==26){await realSpin(page,g,checks);await awards(page,g,checks);}else await tidesFlow(page,checks);await playerContract(page,g,checks);}
  await openCredits(page,g);await page.getByRole('dialog').waitFor();await page.waitForFunction(()=>document.querySelector('[role="dialog"]')?.textContent.includes('Kevin MacLeod'));checks.push({creditsEntryClicked:true});
  await page.setViewportSize({width:320,height:568});const b=await page.getByRole('button',{name:'Close',exact:true}).boundingBox();assert(b&&b.height>=44&&b.y>=0&&b.y+b.height<=568,'Credits Close clipped');await page.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.getByRole('dialog').count(),0);checks.push({smallScreenCreditsClose:true});
  assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(missing.length,0,JSON.stringify(missing));results.push({id:g.id,passed:true,checks,sampleStatus:(await status(page)).samples,errors,missing});console.log(`F${g.id} FEEDBACK PASS`);
 }catch(e){results.push({id:g.id,passed:false,error:String(e),checks,errors,missing,snapshot:await status(page).catch(()=>null)});console.log(`F${g.id} FEEDBACK FAIL: ${String(e).slice(0,220)}`);}
 finally{await context.close();writeFileSync(join(out,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),scope:creditsOnly?'Browser credits entry click and small-screen dialog closure. Not listening or real-device verification.':'Browser playback, actual first-cabinet spin, award fixtures, mute/background, credits entry and small-screen dialog. Not human listening or real iPhone verification.',games:results},null,2));}
}
await browser.close();console.log('Feedback results: '+join(out,'results.json'));if(results.some(r=>!r.passed))process.exitCode=1;
