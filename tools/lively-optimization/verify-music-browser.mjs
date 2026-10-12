// Exercise actual shipped loops after a real pointer gesture, not just file existence.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {installMusicHostLifecycle} from './music-host-lifecycle.mjs';
const require=createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const ids=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number);
const games=(await(await fetch('http://127.0.0.1:63800/api/games')).json()).filter(g=>!ids.length||ids.includes(g.id));
const out=mkdtempSync(join(tmpdir(),'actual-theme-music.')),results=[];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
console.log('Music playback evidence: '+out);
function findApp(){const q=[window.cc?.director.getScene()];while(q.length){const n=q.shift();if(!n)continue;for(const c of n.components||[])if(['AureliaApp','VelvetApp','SlotGame','RegattaApp'].includes(cc.js.getClassName(c)))return c;q.push(...n.children);}return null;}
const appSource=findApp.toString();
async function call(page,code,arg){return page.evaluate(({appSource,code,arg})=>Function('app','arg',code)(Function('return ('+appSource+')()')(),arg),{appSource,code,arg});}
function observeAudio(){
 window.__audioEvidence={elements:[],errors:[],analysers:[]};
 const play=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){if(!window.__audioEvidence.elements.includes(this))window.__audioEvidence.elements.push(this);const promise=play.call(this);promise?.catch(e=>window.__audioEvidence.errors.push({src:this.currentSrc||this.src,error:String(e),cancelled:e.name==='AbortError'&&(this.paused||!this.hasAttribute('src'))&&!this.error}));return promise;};
 const Context=window.AudioContext||window.webkitAudioContext;
 if(Context){const media=Context.prototype.createMediaElementSource;Context.prototype.createMediaElementSource=function(element){const source=media.call(this,element),analyser=this.createAnalyser();analyser.fftSize=1024;source.connect(analyser);window.__audioEvidence.analysers.push({element,analyser,context:this});return source;};}
}
async function snapshot(page){return page.evaluate(({appSource})=>{
 const app=Function('return ('+appSource+')()')();let manager=app?.webMusic||app?.audio;
 if(window.cc?.director){const q=[cc.director.getScene()];while(q.length){const n=q.shift();if(!n)continue;const a=n.components?.find(c=>cc.js.getClassName(c)==='AudioManager');if(a){manager=a;break;}q.push(...n.children);}}
 const elements=window.__audioEvidence.elements.filter(e=>e.src&&/music-(home|cabinet)\.m4a/.test(e.src)).map(e=>({src:e.src,time:e.currentTime,duration:e.duration,paused:e.paused,muted:e.muted,ready:e.readyState,error:e.error?.code,volume:e.volume}));
 let rms=0;for(const {element,analyser} of window.__audioEvidence.analysers){if(element.paused||!element.src)continue;const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);rms=Math.max(rms,Math.sqrt(data.reduce((s,x)=>s+x*x,0)/data.length));}
 return {page:app?.page,enabled:manager?.musicEnabled??app?.state?.sound,scene:manager?.scene,gain:manager?.music?.gain?.gain?.value,context:manager?.context?.state,elements,rms,playErrors:window.__audioEvidence.errors,cocosMusicPlaying:app?.music?.playing,cocosMusicVolume:app?.music?.volume};
 },{appSource});}
async function advancing(page,scene){
 await page.mouse.click(2,2);
 await page.waitForFunction(scene=>window.__audioEvidence.elements.some(e=>e.src.includes(`music-${scene}.m4a`)&&!e.paused&&e.currentTime>.08&&e.readyState>=2),scene,{timeout:10000});
 const first=await snapshot(page);await page.waitForTimeout(350);const after=await snapshot(page);
 const a=after.elements.find(e=>e.src.includes(`music-${scene}.m4a`)&&!e.paused),b=first.elements.find(e=>e.src===a?.src&&!e.paused);
 assert(a&&b&&a.time>b.time+.1,'BGM timeline did not advance');
 assert(!a.muted&&a.volume>.01,'BGM media element is muted');
 assert(!after.playErrors.some(e=>!e.cancelled&&!/NotAllowedError/.test(e.error)),'Media error: '+JSON.stringify(after.playErrors));
 assert(after.gain===undefined||after.gain>.02,'BGM mix is muted');
 if(scene&&after.context)assert(after.rms>.0001,'BGM produces no decoded signal');
 return after;
}
for(const g of games){const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1}),page=await context.newPage(),errors=[],missing=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400&&/audio|m4a|wav/.test(r.url()))missing.push({url:r.url(),status:r.status()});});await page.addInitScript(observeAudio);await page.addInitScript(installMusicHostLifecycle);const checks=[];
 try{
  if(g.id===26){
   await page.goto(g.url+'?debug=1');await page.locator('#auth-consent').check();await page.locator('[data-action="auth-guest"]').click();await page.waitForSelector('.destination');checks.push({scene:'home',...(await advancing(page,'home'))});
   for(const mode of ['mint','pearl','reef','beacon']){await page.locator(`[data-game="${mode}"]`).click();await page.waitForSelector('.mode-transition',{state:'detached'});checks.push({mode,scene:'cabinet',...(await advancing(page,'cabinet'))});await page.locator('.game-header [data-page="home"]').click();await page.waitForSelector('.destination');}
   await page.locator('[data-game="mint"]').click();await page.waitForSelector('.mode-transition',{state:'detached'});
   await page.locator('[data-action="sound"]').click();await page.waitForTimeout(450);assert((await snapshot(page)).elements.every(e=>e.paused),'F26 mute leaves BGM playing');
   await page.locator('[data-action="sound"]').click();checks.push({toggleRestored:true,...(await advancing(page,'cabinet'))});
   await page.evaluate(()=>window.__musicHostLifecycle(false));await page.waitForTimeout(200);assert((await snapshot(page)).elements.every(e=>e.paused),'F26 background leaves BGM playing');
   await page.evaluate(()=>window.__musicHostLifecycle(true));checks.push({backgroundRestored:true,...(await advancing(page,'cabinet'))});
  }else{
   await page.goto(g.url+'?debug=1&screen=home');
   await page.waitForFunction(({appSource,id})=>{const a=Function('return ('+appSource+')()')();return !!a&&(id===27?a.art?.get('f27/scenes/lobby-treasury'):a.ready!==false)&&!!(a.root||a.stage||a.pageRoot||a.content);},{appSource,id:g.id},{timeout:50000});
   if(g.id===25)await call(page,'app.page="home";app.render();');
   if(g.id===27){
    await page.waitForFunction(appSource=>Function('return ('+appSource+')()')()?.pageRoot?.name==='Page login',appSource,{timeout:50000});
    await call(page,'app.navigate("home",true);');
    assert.equal((await snapshot(page)).page,'home','F27 lobby must actually be displayed');
   }
   // F28 declares resources ready before its final loading reveal reaches home.
   if(g.id===28)await page.waitForFunction(appSource=>Function('return ('+appSource+')()')()?.page==='home',appSource,{timeout:50000});
   checks.push({scene:'home',...(await advancing(page,'home'))});
   for(let mode=0;mode<4;mode++){
    if(g.id===25)await call(page,'return app.enter(arg);',mode);
    else if(g.id===27)await call(page,'return app.enterMode(arg);',['royal-mint','jade-treasury','diamond-foundry','crown-wheel'][mode]);
    else if(g.id===28){await call(page,'app.mode=arg;app.go("game");',g.cabinets[mode]);}
    // Common projects expose config through the query; reload is also a cold-load audio regression.
    if(![25,27,28].includes(g.id))await page.goto(g.url+'?debug=1&screen=game&game='+g.cabinets[mode]);
    await page.waitForFunction(appSource=>{const a=Function('return ('+appSource+')()')();return a?.page==='game'&&!a.busy&&!a.transition&&!a.transitioning&&!a.uiLocked&&a.ready!==false;},appSource,{timeout:50000});
    checks.push({mode,scene:'cabinet',...(await advancing(page,'cabinet'))});
    if(g.id===25)await call(page,'app.page="home";app.render();');
    else if(g.id===27)await call(page,'app.navigate("home",true);');
    else if(g.id===28){await call(page,'app.go("home");');await page.waitForTimeout(350);}
   }
   // Independent music toggle and Cocos native hide/show events exercise real production methods.
   await call(page,'let manager=app.webMusic;const q=[cc.director.getScene()];while(q.length&&!manager){const n=q.shift();manager=n.components.find(c=>cc.js.getClassName(c)==="AudioManager");q.push(...n.children);}if(!manager)throw Error("No music manager");window.__testMusicManager=manager;manager.setMusic(false);');
   await page.waitForTimeout(400);assert((await snapshot(page)).elements.every(e=>e.paused),'Mute leaves BGM playing');
   await page.evaluate(()=>window.__testMusicManager.setMusic(true));checks.push({toggleRestored:true,...(await advancing(page,[25,27,28].includes(g.id)?'home':'cabinet'))});
   await page.evaluate(()=>window.__musicHostLifecycle(false));await page.waitForTimeout(200);assert((await snapshot(page)).elements.every(e=>e.paused),'Background leaves BGM playing');
   await page.evaluate(()=>window.__musicHostLifecycle(true));checks.push({backgroundRestored:true,...(await advancing(page,[25,27,28].includes(g.id)?'home':'cabinet'))});
  }
  assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(missing.length,0,JSON.stringify(missing));results.push({id:g.id,passed:true,checks,errors,missing});console.log(`F${g.id} MUSIC PASS: lobby, all cabinets, advancing local audio`);
 }catch(e){results.push({id:g.id,passed:false,error:String(e),checks,snapshot:await snapshot(page).catch(()=>null),errors,missing});console.log(`F${g.id} MUSIC FAIL: ${String(e).slice(0,160)}`);}
 finally{await context.close();writeFileSync(join(out,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),games:results},null,2));}
}
await browser.close();console.log('Music results: '+join(out,'results.json'));if(results.some(r=>!r.passed))process.exitCode=1;
