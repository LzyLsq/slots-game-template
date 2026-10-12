// Browser evidence for F14 only. Fixtures exercise presentation, not real payouts.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {installMusicHostLifecycle} from './music-host-lifecycle.mjs';
const require=createRequire('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json');
const {chromium}=require('playwright');
const url=process.argv.find(a=>a.startsWith('--url='))?.slice(6)||'http://127.0.0.1:51714/F14/';
const calm=process.argv.includes('--calm');
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||join(import.meta.dirname,'verification/f14-approved-music-20261012');
mkdirSync(out,{recursive:true});
const checks=[],errors=[],missing=[],requested=[];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(String(e)));
page.on('response',r=>{if(r.status()>=400)missing.push({url:r.url(),status:r.status()});});
page.on('request',r=>{if(/\/audio\//.test(r.url()))requested.push(r.url().split('/').at(-1));});
await page.addInitScript(installMusicHostLifecycle);
function findApp(){const q=[window.cc?.director.getScene()];while(q.length){const n=q.shift();if(!n)continue;for(const c of n.components||[])if(cc.js.getClassName(c)==='AureliaApp')return c;q.push(...n.children);}return null;}
const appSource=findApp.toString();
const call=(code,arg)=>page.evaluate(({code,arg,appSource})=>Function('app','arg',code)(Function('return ('+appSource+')()')(),arg),{code,arg,appSource});
async function status(){return call(`const m=app.audio,e=m.music?.element;return {...m.situationStatus(),page:app.page,state:app.state.kind,context:m.context?.state,gain:m.music?.gain.gain.value,currentTime:e?.currentTime,duration:e?.duration,paused:e?.paused,winCache:[...m.winBuffers.keys()],sampleStatus:m.soundStatus()};`);}
async function until(test,timeout=12000){await page.waitForFunction(({test,appSource})=>Function('app','return '+test)(Function('return ('+appSource+')()')()),{test,appSource},{timeout});}
async function clickNode(names,optional=false){
 const point=await page.evaluate(names=>{const canvas=document.querySelector('#GameCanvas'),r=canvas.getBoundingClientRect(),origin=cc.view.getVisibleOrigin(),q=[cc.director.getScene()];while(q.length){const n=q.shift();if(!n?.activeInHierarchy)continue;if(names.includes(n.name)){const t=n.getComponent('cc.UITransform');if(t){const b=t.getBoundingBoxToWorld();return{x:r.left+(b.x+b.width/2-origin.x)*cc.view.getScaleX()/(canvas.width/canvas.clientWidth),y:r.bottom-(b.y+b.height/2-origin.y)*cc.view.getScaleY()/(canvas.height/canvas.clientHeight)};}}q.push(...n.children);}return null;},names);
 if(!point&&optional)return false;assert(point,'Missing active UI '+names);await page.mouse.click(point.x,point.y);return true;
}
const sleep=ms=>page.waitForTimeout(ms);
const mark=(name,data={})=>{checks.push({name,...data});console.log('PASS '+name);};
async function auditMix(action,ms=850){
 return call(`
 const m=app.audio;${action}
 return new Promise(resolve=>{const started=performance.now(),frames=[];
 const probe=()=>{const bg=[m.music,...m.retiringMusic].filter(Boolean).map(t=>!t.element.paused&&t.element.readyState>=2&&t.element.currentTime>0?t.gain.gain.value:0);
 const award=[...m.celebrationGains.entries()].map(([source,g])=>m.context.currentTime>=(source.__qaStartAt??Infinity)?g.gain.value:0);
 frames.push({time:m.context.currentTime,bg,award});
 if(performance.now()-started<arg)requestAnimationFrame(probe);else resolve(frames);};probe();});`,ms);
}
function assertSingleMelody(frames,label){
 for(const f of frames){assert(f.bg.filter(g=>g>.004).length<=1,label+' overlaps background tempos '+JSON.stringify(f));assert(!(f.bg.some(g=>g>.004)&&f.award.some(g=>g>.004)),label+' overlaps BGM and award '+JSON.stringify(f));assert(f.award.filter(g=>g>.004).length<=1,label+' overlaps award melodies '+JSON.stringify(f));}
 mark(label,{frames:frames.length});
}
async function enter(name,id){await clickNode(['Play '+name]);await until(`app?.page==='game'&&app.config.id===${JSON.stringify(id)}&&!app.busy`);await until(`app.audio.music?.element.currentTime>.2&&!app.audio.music.element.paused`);}
async function home(){await call('return app.navigate("home");');await until('app.page==="home"&&!app.busy');await sleep(500);}
async function fixture(ratio){await call(`window.__fixtureDone=false;window.__fixtureCue=[];Promise.resolve(app.presentWin(arg*100,false,false,100)).then(()=>window.__fixtureDone=true);`,ratio);}
let passed=false,failure;
try{
 await page.goto(url+'?debug=1&screen=home');await until('app?.content&&app.page==="home"',60000);await page.mouse.click(2,2);await until('app.audio.music?.element.currentTime>.2&&!app.audio.music.element.paused');
 await call(`window.__fixtureCue=[];const m=app.audio,detail=m.playWinDetail;m.playWinDetail=function(cue,...args){if(cue==='reveal'||cue==='skip'||cue==='collect')window.__fixtureCue.push({cue,winVoices:m.celebrationVoices.size,time:m.context.currentTime});return detail.call(m,cue,...args);};`);
 let s=await status();assert.equal(s.file,'music-home');
 if(calm){
  assert.equal(s.mix,'f14-calm-single-focus-20261012');
  await call(`const context=app.audio.context,create=context.createBufferSource.bind(context);
   context.createBufferSource=()=>{const source=create(),start=source.start.bind(source);
    source.start=(when,...args)=>{source.__qaStartAt=when??context.currentTime;return start(when??0,...args);};return source;};`);
  assertSingleMelody(await auditMix('m.setScene("cabinet","golden-hour");'),'Scene transition has no overlapping musical focus');
  assertSingleMelody(await auditMix('m.setScene("home");'),'Return transition has no overlapping musical focus');
  await until('app.audio.samples?.status().buffers===16');
  const feedback=await call(`const m=app.audio;m.samples.stop();
   const before=m.samples.status().played;for(let i=0;i<60;i++){m.play('tap');m.play('select');m.play('bet-up');}
   return{before,after:m.samples.status()};`);
  assert(feedback.after.played-feedback.before<=1,'Repeated UI event emits layered feedback');
  assert(feedback.after.highWater<=4);mark('Rapid UI feedback is category-throttled and bounded',feedback.after);
  await sleep(300);
  const count=await call(`const m=app.audio;m.finishWinPresentation();window.__countPlayed=m.samples.status().played;
   return new Promise(resolve=>{let i=0;const tick=()=>{for(let n=0;n<12;n++)m.playWinDetail('count',(i+1)/4,1);
    if(++i<3)setTimeout(tick,600);else resolve({played:m.samples.status().played-window.__countPlayed,status:m.samples.status()});};tick();});`);
  assert.equal(count.played,3);assert(count.status.highWater<=4);mark('Counter emits only three quiet progress accents',count);
 }
 const last=await call('return app.audio.music.element.currentTime;');await sleep(650);assert((await status()).currentTime>last+.3);mark('Lobby composition actually advances',await status());
 // Seek the actual streamed player to its end: exercise its real ended event.
 await call('app.audio.music.element.currentTime=app.audio.music.element.duration-.15;');await until('app.audio.music?.id==="music-home-alt"&&app.audio.music.element.currentTime>.1');
 mark('Lobby alternates complete works at natural end');
 await call('app.audio.music.element.currentTime=app.audio.music.element.duration-.15;');await until('app.audio.music?.id==="music-home"&&app.audio.music.element.currentTime>.1');
 await page.screenshot({path:join(out,'lobby.png')});
 const cabinets=[['SKY ADMIRAL','golden-hour'],['PEARL VOYAGE','jade-treasury'],['SUNSTONE EXPRESS','pearl-palace'],['MOON CAROUSEL','ruby-revel']];
 for(const [name,id] of cabinets){await enter(name,id);await sleep(550);s=await status();assert.equal(s.file,'music-cabinet-'+id);assert.equal(s.musicPlayers,1);assert.equal(s.spinning,false);mark('Distinct cabinet '+name,{file:s.file,position:s.currentTime});await home();}
 await enter(...cabinets[0]);
 await call(`window.__spinMusic=app.audio.music;window.__spinPosition=app.audio.music.element.currentTime;
  window.__spinMixTrace=[];const m=app.audio;
  for(const name of ['restoreMusic','startMusic','duckMusic','finishWinPresentation','beginSpin','finishSpin']){
   const original=m[name];m[name]=function(...args){window.__spinMixTrace.push({name,time:m.context.currentTime,level:m.situationLevel,handoff:m.musicHandoffAt,awardReady:m.celebrationReadyAt,gain:m.music?.gain.gain.value});return original.apply(m,args);};
  }
  window.__spinPromise=app.spin();`);await until('app.audio.spinning&&app.state.kind==="spinning"');
 await call('void app.spin();void app.spin();window.__spinMixStartedAt=app.audio.context.currentTime;');
 // Gain envelopes run on the audio clock, which can lag wall time under load.
 await until('app.audio.context.currentTime>=window.__spinMixStartedAt+.42');
 assert(await call('return app.audio.music===window.__spinMusic;'),'Spin restarted the music element');s=await status();assert(s.spinning,'Spin settled before its mix could be checked');assert(s.currentTime>await call('return window.__spinPosition;'));assert(Math.abs(s.gain-.30)<.015,'Spin mix not reduced '+JSON.stringify({status:s,trace:await call('return window.__spinMixTrace;'),now:await call('return app.audio.context.currentTime;')}));
 for(let i=0;i<120;i++){s=await status();if(s.state==='idle')break;await clickNode(['Collect your treasure','Treasure celebration'],true);await sleep(300);if(i===119)throw Error('Actual spin did not settle');}
 assert(await call('return app.audio.music===window.__spinMusic;'));assert.equal((await status()).spinning,false);mark('Accepted spin and repeated taps keep the same BGM player',{final:await status()});
 const durations=[1.8,5.5,6.4,6.9,7.3],ratios=[.5,2,20,60,100],ids=['small','big','mega','epic','super'];
 for(let i=0;i<ratios.length;i++){
  let mixProbe;
  if(calm)mixProbe=auditMix('',850);
  await fixture(ratios[i]);await until('app.audio.celebrationVoices.size===1');s=await status();assert.equal(s.winCache.at(-1),'win-'+ids[i]);assert(s.winCache.length<=2);assert(s.winDecodedBytes<=5700000,'Short PCM cache too large');
  if(calm){assertSingleMelody(await mixProbe,'Award '+ids[i]+' replaces background musical focus');await sleep(170);assert(Math.abs((await status()).gain)<.004,'Award BGM is not muted');}
  if(i){await page.waitForFunction(()=>window.__fixtureCue.some(c=>c.cue==='reveal'),null,{timeout:7000});const cue=await page.evaluate(()=>window.__fixtureCue.find(c=>c.cue==='reveal'));assert.equal(cue.winVoices,1,'Automatic reveal cut the award music');assert.equal((await status()).winVoices,1);}
  if(i===4)await page.screenshot({path:join(out,'super-award.png')});
  await page.waitForFunction(()=>window.__fixtureDone,null,{timeout:10000});await sleep(800);s=await status();assert.equal(s.winVoices,0);assert.equal(s.celebrating,false);assert(s.gain>.4);mark('Automatic award '+ids[i],{duration:durations[i],winCache:s.winCache,winDecodedBytes:s.winDecodedBytes});
 }
 await fixture(100);await until('app.audio.celebrationVoices.size===1');await clickNode(['Collect your treasure']);await page.waitForFunction(()=>window.__fixtureCue.some(c=>c.cue==='skip'));await sleep(300);assert.equal((await status()).winVoices,0,'Skip leaves award track');await clickNode(['Collect your treasure']);await page.waitForFunction(()=>window.__fixtureDone);await sleep(800);s=await status();assert.equal(s.celebrating,false);assert(s.gain>.4);mark('Actual skip/collect fades music and restores background');
 // Clear a just-started fetch while moving through scenes; no late award.
 await call('app.audio.winBuffers.clear();app.audio.playWinFanfare(4);app.audio.setScene("home");');await sleep(500);assert.equal((await status()).winVoices,0);assert.equal((await status()).celebrating,false);
 for(let i=0;i<18;i++){await call('app.audio.setScene(arg%2?"home":"cabinet",["golden-hour","jade-treasury","pearl-palace","ruby-revel"][arg%4]);',i);assert((await status()).musicPlayers<=2);}
 await call('app.audio.setScene("cabinet",app.config.id);');await sleep(500);assert.equal((await status()).musicPlayers,1);assert.equal((await status()).winVoices,0);mark('Rapid scene changes bounded to two players; canceled fetch cannot replay');
 // Modal controls the mix but does not replace music.
 await call('window.__modalMusic=app.audio.music;app.rules();');await sleep(450);s=await status();assert(s.modal&&s.gain<.2);assert(await call('return app.audio.music===window.__modalMusic;'));await call('app.closeModal();');await sleep(450);assert((await status()).gain>.4);mark('Rules dialog lowers and restores the same music');
 await fixture(100);await until('app.audio.celebrationVoices.size===1');await call('app.audio.setEffects(false);');await sleep(250);assert.equal((await status()).winVoices,0);assert.equal((await status()).celebrating,false);await call('app.audio.setEffects(true);');await clickNode(['Collect your treasure']);await clickNode(['Collect your treasure']);await page.waitForFunction(()=>window.__fixtureDone);await sleep(450);
 await call('app.audio.setMusic(false);');await sleep(300);assert.equal((await status()).musicPlayers,0);assert.equal((await status()).context,'running');await call('app.audio.setMusic(true);');await page.mouse.click(2,2);await until('app.audio.music?.element.currentTime>.1&&!app.audio.music.element.paused');mark('Sound and music controls stop immediately and restart without stale awards');
 const pos=(await status()).currentTime;await page.evaluate(()=>window.__musicHostLifecycle(false));await sleep(250);s=await status();assert.equal(s.musicPlayers,0);assert.equal(s.winVoices,0);await page.evaluate(()=>window.__musicHostLifecycle(true));await page.mouse.click(2,2);await until('app.audio.music?.element.currentTime>.1&&!app.audio.music.element.paused');s=await status();assert(s.currentTime>=pos-.1);mark('Simulated host hide/show preserves music position without queued award',{before:pos,after:s.currentTime});
 await home();s=await status();assert.equal(s.track,'home');assert.equal(s.spinning,false);assert.equal(s.celebrating,false);assert.equal(s.musicPlayers,1);mark('Return to lobby clears cabinet presentation state');
 // Reach credits via the game's genuine profile button, then test 320px layout.
 await call('return app.navigate("profile");');await until('app.page==="profile"&&!app.busy');await clickNode(['Credits']);await page.getByRole('dialog',{name:'Music & sound credits'}).waitFor();await page.waitForFunction(()=>document.querySelector('[role="dialog"]')?.textContent.includes('Scott Buckley'));
 const credits=await page.getByRole('dialog').textContent();for(const title of ['Simplicity','Wonderful','Felicity','Quirky Lane','High Games','Ice Cream','Jubilee'])assert(credits.includes(title),'Missing attribution '+title);
 await page.setViewportSize({width:320,height:568});await sleep(250);const b=await page.getByRole('button',{name:'Close',exact:true}).boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=320&&b.y+b.height<=568);await page.screenshot({path:join(out,'credits-320.png')});await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});mark('Real credits UI lists all authors and works; Close works at 320px');
 assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(missing.length,0,JSON.stringify(missing));
 for(const id of ['music-home','music-home-alt',...cabinets.map(c=>'music-cabinet-'+c[1]),...ids.map(id=>'win-'+id)])assert(requested.includes(id+'.m4a'),'Not loaded '+id);
 passed=true;
}catch(e){failure=String(e.stack||e);console.error(failure);}
const report={checkedAt:new Date().toISOString(),passed,url,scope:'F14 browser actual playback and interaction state; one real preview spin, five award presentation fixtures, host lifecycle simulation. No human listening certification, real iPhone or StoreKit/payment test.',checks,errors,missing,requested:[...new Set(requested)],failure,final:await status().catch(()=>null)};
writeFileSync(join(out,'browser.json'),JSON.stringify(report,null,2)+'\n');
await browser.close();console.log('Evidence: '+join(out,'browser.json'));if(!passed)process.exitCode=1;
