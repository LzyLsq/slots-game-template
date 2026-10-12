// Uses an existing Playwright installation; does not install a browser.
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(__dirname,'..',process.env.F34_QA_OUTPUT || 'docs/screenshots/f34-theme-score');
const BASE=process.env.F34_QA_URL || 'http://127.0.0.1:6035/';
if(!['127.0.0.1','localhost','::1','[::1]'].includes(new URL(BASE).hostname))throw Error('QA requires a local Cocos preview');
fs.mkdirSync(path.join(OUT,'motion'),{recursive:true});
const MODE=process.env.F34_RECORD_MODE||'pearl-palace';
const FORCE=process.env.F34_RECORD_TIER||undefined;
if(!['golden-hour','jade-treasury','pearl-palace','ruby-revel'].includes(MODE))throw Error('Unknown recording mode');
if(FORCE&&!['big','super','mega','epic'].includes(FORCE))throw Error('Unknown recording tier');
const PREFIX=({'golden-hour':'coin','jade-treasury':'sapphire','pearl-palace':'pearl','ruby-revel':'crown'})[MODE]+(FORCE?'-'+FORCE:'');
const TIER=FORCE?['big','super','mega','epic'].indexOf(FORCE):0;
const A="window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp')";
async function clickNode(page,name){const pt=await page.evaluate(name=>{
 const cc=window.cc,scene=cc.director.getScene(),a=scene.getChildByName('Canvas').getComponent('AureliaApp');
 function find(n){if(n.name===name)return n;for(const c of n.children){const r=find(c);if(r)return r}}
 const n=find(a.node);if(!n)throw Error('Missing '+name);
 const p=scene.getComponentsInChildren(cc.Camera)[0].worldToScreen(n.worldPosition),canvas=document.querySelector('canvas'),r=canvas.getBoundingClientRect();
 return {x:r.left+p.x/canvas.width*r.width,y:r.top+r.height-p.y/canvas.height*r.height};
},name);await page.touchscreen.tap(pt.x,pt.y);}
async function seedRound(page,seed,force){return page.evaluate(({seed,force})=>{
 const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');let state=seed|0;
 a.rng={nextUint(){let v=state;v^=v<<13;v^=v>>>17;v^=v<<5;state=v|0;return v>>>0},next(){return this.nextUint()/0x100000000},int(min,max){return min+Math.floor(this.next()*(max-min))},bool(p=.5){return this.next()<p},pick(v){return v[this.int(0,v.length)]},snapshot(){return state>>>0}};
 a.force=force;a.services.save.update(save=>{save.players[save.currentUserId].gamesPlayed=20});
 return {bet:a.bet,balance:a.services.economy.balance()};
},{seed,force});}
async function snap(page){return page.evaluate(()=>{
 const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),m=a.audio,s=a.node.getComponentsInChildren('SalonWinStage')[0],g=a.plane?.getComponentInChildren('CabinetGuardian');
 const source=v=>({name:v.node.name,playing:v.playing,volume:v.volume,clip:v.clip?.name,time:v.currentTime});
 let rms=0;for(const p of window.__audioProbes??[]){let samples=new Float32Array(p.analyser.fftSize);p.analyser.getFloatTimeDomainData(samples);rms+=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);}
 return {page:a.page,state:a.state.kind,bet:a.bet,balance:a.services.economy.balance(),payout:a.state.result?.totalWin,stage:s?{tier:s.tier,revealed:s.revealed,elapsed:s.elapsed}:null,
 audio:{scene:m.scene,hidden:m.hidden,musicEnabled:m.musicEnabled,effectsEnabled:m.effectsEnabled,spinning:m.spinning,celebrating:m.celebrating,targets:m.targets,scoreTarget:m.scoreTarget,music:m.music.map(source),effects:m.effects.map(source),rolling:source(m.rolling),score:source(m.score),cadence:source(m.cadence),loaded:m.clips.size,rms},
 guardian:g?{arm:g.arm.angle,body:g.body.scale,angle:g.body.angle,position:g.body.position,joy:g.joy,anticipation:g.anticipation}:null,modal:!!a.modal};
});}
async function until(page,expr,timeout=25000){await page.waitForFunction(expr,null,{timeout});}

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const installProbe=async ctx=>ctx.addInitScript(()=>{
   window.__audioProbes=[];
   const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(dest,...rest){
    const result=connect.call(this,dest,...rest);
    if(dest===this.context.destination){
     let p=window.__audioProbes.find(p=>p.context===this.context);
     if(!p){
      const input=this.context.createGain(),analyser=this.context.createAnalyser(),stream=this.context.createMediaStreamDestination();analyser.fftSize=2048;
      connect.call(input,analyser);connect.call(input,stream);
      p={context:this.context,input,analyser,stream,chunks:[]};window.__audioProbes.push(p);
      p.recorder=new MediaRecorder(stream.stream,{mimeType:'audio/webm;codecs=opus'});p.recorder.ondataavailable=e=>p.chunks.push(e.data);p.recorder.start();
     }
     connect.call(this,p.input);
    }
    return result;
   };
  });
 await installProbe(context);

 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(BASE+'?debug=1&screen=game&game='+MODE+'&v='+(process.env.F34_QA_REVISION||'f34-grand-wealth-full'));
 await until(page,`(()=>{if(!window.cc?.director?.getScene()?.getChildByName('Canvas'))return false;const a=${A};return a?.page==='game'&&a.reels&&!a.busy&&!a.node.getChildByName('Atelier loading')})()`,60000);
 await clickNode(page,'Increase bet');await clickNode(page,'Decrease bet');await page.waitForTimeout(600);
 // Record the rendered Cocos canvas and its actual audio on one clock.
 await page.evaluate(()=>{
  const probe=window.__audioProbes[0],canvas=document.querySelector('canvas'),stream=canvas.captureStream(30);
  for(const track of probe.stream.stream.getAudioTracks())stream.addTrack(track);
  const record={chunks:[],marks:[],frames:[],started:performance.now()};
  record.recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8,opus',videoBitsPerSecond:1800000});
  record.recorder.ondataavailable=e=>record.chunks.push(e.data);record.recorder.start();window.__fullRecord=record;
  const frame=time=>{if(record.recorder.state!=='recording')return;record.frames.push(time);requestAnimationFrame(frame)};requestAnimationFrame(frame);
 });
 const mark=async name=>page.evaluate(name=>window.__fullRecord.marks.push({name,seconds:(performance.now()-window.__fullRecord.started)/1000}),name);
 await mark('Idle: full fortune-guardian cycle');await page.waitForTimeout(8000);
 const before=await seedRound(page,({'golden-hour':17,'jade-treasury':13305,'pearl-palace':27,'ruby-revel':2})[MODE],FORCE);await mark('Spin: '+MODE+(FORCE?' deterministic '+FORCE+' reward fixture':' seeded round')+', isolated QA context');await clickNode(page,'SPIN');
 await until(page,`(${A}).node.getComponentsInChildren('SalonWinStage').length>0`,35000);await page.waitForTimeout(1250);const award=await snap(page);assert.equal(award.stage.tier,TIER);assert.equal(award.audio.score.clip,['win-grand','win-super','win-mega','win-epic'][TIER]+(MODE==='golden-hour'?'':'-'+MODE));await mark('Counting: '+['BIG','SUPER','MEGA','EPIC'][TIER]+' automatic performance');
 await until(page,`(${A}).node.getComponentsInChildren('SalonWinStage')[0]?.revealed===true`);await mark('Resolution: first volley, title sweep and treasure light fans');await page.waitForTimeout(730);await mark('Second treasure volley');
 // Browser screenshot capture can pause the compositor. Keep it out of the
 // continuous recording by default; runtime QA already supplies climax stills.
 if(process.env.F34_RECORD_CAPTURE_STILL==='1')await page.screenshot({path:path.join(OUT,PREFIX+'-automatic-climax.png')});
 await until(page,`(${A}).state.kind==='idle'`,25000);await page.waitForTimeout(800);const after=await snap(page);
 assert.equal(after.balance,before.balance-before.bet+award.payout);assert.equal(after.audio.score.playing,false);assert.equal(after.audio.celebrating,false);assert.equal(after.audio.rolling.playing,false);assert(after.audio.rms>.001);assert.equal(after.modal,false);await mark('Automatic finish: cabinet and music restored');await page.waitForTimeout(2800);
 await clickNode(page,'Back to salon');await until(page,`(${A}).page==='home'`);await page.waitForTimeout(2200);assert.equal((await snap(page)).audio.scene,'salon');await mark('Salon music crossfade');
 const data=await page.evaluate(async()=>{const r=window.__fullRecord;await new Promise(done=>{r.recorder.onstop=done;r.recorder.stop()});const spans=r.frames.slice(1).map((t,i)=>({fromSeconds:(r.frames[i]-r.started)/1000,toSeconds:(t-r.started)/1000,durationMs:t-r.frames[i]}));const intervals=spans.map(s=>s.durationMs).sort((a,b)=>a-b);
  return {frameClock:{samples:intervals.length,medianMs:intervals[Math.floor(intervals.length*.5)],p95Ms:intervals[Math.floor(intervals.length*.95)],maximumMs:intervals.at(-1),gapsOver50Ms:intervals.filter(t=>t>50).length,gaps:spans.filter(s=>s.durationMs>50)},marks:r.marks,bytes:Array.from(new Uint8Array(await new Blob(r.chunks,{type:'video/webm'}).arrayBuffer()))};});
 fs.writeFileSync(path.join(OUT,'motion',PREFIX+'-complete-with-audio.webm'),Buffer.from(data.bytes));
 fs.writeFileSync(path.join(OUT,'motion',PREFIX+'-complete-with-audio.json'),JSON.stringify({date:process.env.F34_QA_DATE||new Date().toISOString().slice(0,10),capture:'Canvas VP8 and actual managed WebAudio Opus share one MediaRecorder clock; no external audio track',mode:MODE,tier:FORCE||'big',fixture:!!FORCE,frameClock:data.frameClock,marks:data.marks,payout:award.payout,chargedBet:before.bet,automaticCleanup:true,errors},null,2)+'\n');
 await context.close();
 if(process.env.F34_RECORD_REDUCED!=='0'){
 // Motion reduction must leave the new guardian still, with sound and spin usable.
 const reduced=await browser.newContext({viewport:{width:320,height:568},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await installProbe(reduced);const rp=await reduced.newPage();
 await rp.goto(BASE+'?debug=1&screen=game&game=pearl-palace&v='+(process.env.F34_QA_REVISION||'f34-grand-wealth-reduced'));
 await until(rp,`(()=>{if(!window.cc?.director?.getScene()?.getChildByName('Canvas'))return false;const a=${A};return a?.page==='game'&&a.reels&&!a.busy&&!a.node.getChildByName('Atelier loading')})()`,60000);
 await clickNode(rp,'Increase bet');await clickNode(rp,'Decrease bet');await rp.waitForTimeout(500);const initial=await snap(rp);await rp.waitForTimeout(1200);const still=await snap(rp);assert.deepEqual(still.guardian,initial.guardian);assert.equal(still.audio.loaded,44);assert(still.audio.rms>.001);
 await seedRound(rp,27);await clickNode(rp,'SPIN');await until(rp,`(${A}).node.getComponentsInChildren('SalonWinStage').length>0`);await rp.waitForTimeout(240);
 const reducedAward=await snap(rp);assert(reducedAward.stage.revealed);assert.equal(reducedAward.audio.score.playing,false);assert.equal(reducedAward.audio.cadence.clip,'win-grand-resolve-pearl-palace');assert(reducedAward.audio.cadence.playing);assert(reducedAward.audio.rms>.001);await until(rp,`(${A}).state.kind==='idle'`);await rp.waitForTimeout(600);assert.equal((await snap(rp)).audio.cadence.playing,false);
 await seedRound(rp,4);await clickNode(rp,'SPIN');await until(rp,`(${A}).state.kind==='spinning'`);await until(rp,`(${A}).state.kind==='idle'`,35000);const end=await snap(rp);assert.equal(end.audio.rolling.playing,false);assert.equal(end.audio.celebrating,false);
 await rp.screenshot({path:path.join(OUT,'pearl-reduced-320x568.png')});fs.writeFileSync(path.join(OUT,'motion','reduced-check.json'),JSON.stringify({date:process.env.F34_QA_DATE||new Date().toISOString().slice(0,10),stableGuardian:true,rotationCompletes:true,immediateResolution:true,actualAudioOutput:true,initialGuardian:initial.guardian,finalState:end.state,loaded:end.audio.loaded},null,2)+'\n');
 await reduced.close();}
 await browser.close();assert.deepEqual(errors,[]);console.log('PASS uninterrupted automatic award and synchronized recording'+(process.env.F34_RECORD_REDUCED!=='0'?', reduced motion':''));
})().catch(e=>{console.error(e);process.exit(1)});
