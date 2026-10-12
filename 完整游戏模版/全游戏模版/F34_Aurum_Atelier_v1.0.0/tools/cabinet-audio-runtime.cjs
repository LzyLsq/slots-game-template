// Uses an existing Playwright installation; does not install a browser.
const {chromium}=require(process.env.PLAYWRIGHT_PACKAGE || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(__dirname,'..',process.env.F34_QA_OUTPUT || 'docs/screenshots/f34-theme-score');
const BASE=process.env.F34_QA_URL || 'http://127.0.0.1:6035/';
if(!['127.0.0.1','localhost','::1','[::1]'].includes(new URL(BASE).hostname))throw Error('QA requires a local Cocos preview');
fs.mkdirSync(path.join(OUT,'motion'),{recursive:true});
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
 return {page:a.page,state:a.state.kind,bet:a.bet,balance:a.services.economy.balance(),payout:a.state.result?.totalWin,stage:s?{tier:s.tier,revealed:s.revealed,elapsed:s.elapsed,countDuration:s.countDuration,holdUntil:s.holdUntil,finished:s.finished,veil:s.veil.opacity,reveal:s.revealMotion.progress,apertureHeight:s.revealClip.height,roomHeight:s.roomHeight,title:{position:s.title.position,scale:s.title.scale,width:s.title.getComponent('cc.UITransform').width,height:s.title.getComponent('cc.UITransform').height},count:s.count.string}:null,
 audio:{scene:m.scene,hidden:m.hidden,musicEnabled:m.musicEnabled,effectsEnabled:m.effectsEnabled,spinning:m.spinning,celebrating:m.celebrating,targets:m.targets,scoreTarget:m.scoreTarget,music:m.music.map(source),effects:m.effects.map(source),rolling:source(m.rolling),score:source(m.score),cadence:source(m.cadence),resolved:m.resolved,closing:m.closing,loaded:m.clips.size,rms,contexts:(window.__audioProbes??[]).map(p=>({state:p.context.state,time:p.context.currentTime}))},
 guardian:g?{arm:g.arm.angle,body:g.body.scale,angle:g.body.angle,position:g.body.position,joy:g.joy,anticipation:g.anticipation}:null,modal:!!a.modal};
});}
async function visual(page){return page.evaluate(()=>{
 const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),s=a.node.getComponentsInChildren('SalonWinStage')[0];
 const size=s.title.getComponent('cc.UITransform'),plate=s.group.getChildByName('Painted payout plinth');
 return {elapsed:s.elapsed,veil:s.veil.opacity,reveal:s.revealMotion.progress,apertureHeight:s.revealClip.height,roomHeight:s.roomHeight,titleAlpha:s.title.getComponent('cc.UIOpacity')?.opacity??255,title:{position:{x:s.title.position.x,y:s.title.position.y},scale:{x:s.title.scale.x,y:s.title.scale.y},width:size.width,height:size.height},countScale:{x:s.count.node.scale.x,y:s.count.node.scale.y},plinthTop:plate.position.y+plate.getComponent('cc.UITransform').height/2,coinCeiling:s.coinEnvelope.ceiling,
 glow:s.treasureGlows.map(g=>g.alpha.opacity),flare:s.titleFlare?.opacity??0,
 lightFans:s.wealthLights.filter(g=>!g.pool).map(g=>({opacity:g.alpha.opacity,angle:g.node.angle})),
 coinLayers:{stream:s.coins.filter(c=>!c.burst).length,burst:s.coins.filter(c=>c.burst&&c.wave===0).length,encore:s.coins.filter(c=>c.wave===1).length},
 cabinetBetAlpha:a.plane.getChildByName('BET painted register').getComponent('cc.UIOpacity')?.opacity??255,
 coins:s.coins.filter(c=>c.alpha.opacity>0).map(c=>{const t=c.node.getComponent('cc.UITransform'),r=c.node.angle*Math.PI/180,cos=Math.abs(Math.cos(r)),sin=Math.abs(Math.sin(r)),w=t.width*c.node.scale.x/2,h=t.height*c.node.scale.y/2,hx=w*cos+h*sin,hy=w*sin+h*cos;return {burst:c.burst,wave:c.wave,x:c.node.position.x,y:c.node.position.y,left:c.node.position.x-hx,right:c.node.position.x+hx,bottom:c.node.position.y-hy,top:c.node.position.y+hy}})};
});}
async function until(page,expr,timeout=25000){await page.waitForFunction(expr,null,{timeout});}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 const report={date:process.env.F34_QA_DATE||new Date().toISOString().slice(0,10),scope:'Cocos web-mobile automated preview, actual managed AudioSources and WebAudio output capture. Deterministic round fixtures exist only in isolated temporary test contexts.',cases:[]};
 const cases=[
  {id:'golden-hour',seed:17,width:390,height:844,tier:0},
  {id:'jade-treasury',seed:13305,width:390,height:844,tier:0},
  {id:'pearl-palace',seed:27,width:390,height:844,tier:0,record:true},
  {id:'ruby-revel',seed:2,width:390,height:844,tier:0},
  {id:'golden-hour',seed:17,force:'super',width:320,height:568,tier:1},
  {id:'jade-treasury',seed:1,force:'mega',width:320,height:568,tier:2},
  {id:'ruby-revel',seed:3,force:'epic',width:320,height:568,tier:3},
 ];
 const selected=process.env.F34_QA_CASES?cases.filter((c,i)=>process.env.F34_QA_CASES.split(',').includes(String(i))):cases;
 for(const c of selected){
  const context=await browser.newContext({viewport:{width:c.width,height:c.height},deviceScaleFactor:2,isMobile:true,hasTouch:true,...(c.record?{recordVideo:{dir:path.join(OUT,'motion'),size:{width:c.width,height:c.height}}}:{})});
  await context.addInitScript(()=>{
   window.__audioProbes=[];
   const connect=AudioNode.prototype.connect;
   AudioNode.prototype.connect=function(dest,...rest){
    const result=connect.call(this,dest,...rest);
    if(dest===this.context.destination){
     let p=window.__audioProbes.find(p=>p.context===this.context);
     if(!p){
      const input=this.context.createGain(),analyser=this.context.createAnalyser(),stream=this.context.createMediaStreamDestination();analyser.fftSize=2048;
      connect.call(input,analyser);connect.call(input,stream);
      // Keep the isolated meter graph processing after all game sources pause.
      // Otherwise Chromium can return its last nonzero analyser block.
      const silence=this.context.createConstantSource();silence.offset.value=0;connect.call(silence,input);silence.start();
      p={context:this.context,input,analyser,stream,silence,chunks:[]};window.__audioProbes.push(p);
      p.recorder=new MediaRecorder(stream.stream,{mimeType:'audio/webm;codecs=opus'});p.recorder.ondataavailable=e=>p.chunks.push(e.data);p.recorder.start();
     }
     connect.call(this,p.input);
    }
    return result;
   };
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto(BASE+'?debug=1&screen=game&game='+c.id+'&v='+(process.env.F34_QA_REVISION||'f34-grand-wealth'));
  await until(page,`(()=>{if(!window.cc?.director?.getScene()?.getChildByName('Canvas'))return false;const a=${A};return a?.page==='game'&&a.reels&&!a.busy&&!a.node.getChildByName('Atelier loading')})()`,60000);
  await clickNode(page,'Increase bet');await clickNode(page,'Decrease bet');await page.waitForTimeout(500);
  const idle=await snap(page);assert.equal(idle.audio.loaded,44);assert.equal(idle.audio.scene,c.id);assert.equal(idle.audio.music.find(s=>s.playing&&s.volume>.01).clip,'music-'+c.id);assert.equal(idle.audio.music.filter(s=>s.playing&&s.volume>.01).length,1);assert(idle.audio.rms>.001,'Background score audible');assert.equal(idle.audio.rolling.playing,false);
  await page.screenshot({path:path.join(OUT,c.id+'-'+c.width+'x'+c.height+'-idle.png')});
  const gestures=[idle.guardian];for(let i=0;i<12;i++){await page.waitForTimeout(650);gestures.push((await snap(page)).guardian)}
  assert(Math.max(...gestures.map(g=>g.arm))-Math.min(...gestures.map(g=>g.arm))>3,'Visible fortune beckon');assert.deepEqual(gestures[0].position,gestures[12].position,'Feet anchored');
  // Actual SOUND key toggles both channels, stops all managed feedback, persists.
  await clickNode(page,'Audio');await page.waitForTimeout(150);const muted=await snap(page);
  assert.equal(muted.audio.musicEnabled,false);assert.equal(muted.audio.effectsEnabled,false);assert(muted.audio.rms<.0001,'Mute must silence actual output');assert(muted.audio.music.every(s=>!s.playing));assert(muted.audio.effects.every(s=>!s.playing));
  await clickNode(page,'Audio');await page.waitForTimeout(500);assert((await snap(page)).audio.rms>.001,'Unmute resumes');
  // Engine lifecycle: all feedback silenced while hidden; no stale tap resumes.
  await page.evaluate(()=>{window.cc.game.emit(window.cc.Game.EVENT_HIDE);window.cc.game.pause()});await page.waitForTimeout(150);const hidden=await snap(page);assert.equal(hidden.audio.hidden,true);assert(hidden.audio.rms<.0001);
  await page.evaluate(()=>{window.cc.game.resume();window.cc.game.emit(window.cc.Game.EVENT_SHOW)});await page.waitForTimeout(500);const resumed=await snap(page);assert.equal(resumed.audio.hidden,false);assert(resumed.audio.rms>.001);assert(resumed.audio.effects.every(s=>!s.playing));
  const before=await seedRound(page,c.seed,c.force);await clickNode(page,'SPIN');await page.waitForTimeout(650);const rolling=await snap(page);
  assert(rolling.audio.rolling.playing,'Continuous reel mechanism');assert(rolling.audio.rms>.001);assert(rolling.guardian.anticipation>.5);
  await until(page,`(()=>{const a=${A};return a.node.getComponentsInChildren('SalonWinStage').length>0})()`,35000);
  const entrance=[];
  for(let i=0;i<5;i++){if(i)await page.waitForTimeout(240);entrance.push(await visual(page));}
  for(const frame of entrance){assert.deepEqual(frame.title.scale,{x:1,y:1},'Lettering never zooms or rebounds');assert.deepEqual(frame.title.position,entrance[0].title.position,'Lettering remains mounted in the architecture');assert.equal(frame.cabinetBetAlpha,255,'Cabinet stays complete beneath the reveal');assert(frame.title.width<=800);}
  for(let i=1;i<entrance.length;i++)assert(entrance[i].reveal>=entrance[i-1].reveal,'Continuous room reveal');
  for(const frame of entrance){assert.equal(frame.veil,255,'Revealed architecture stays opaque');assert(Math.abs(frame.apertureHeight-Math.max(.01,frame.roomHeight*frame.reveal))<.01,'Aperture follows progress');}
  assert(entrance.at(-1).reveal>.99,'Complete room reveal');await page.waitForTimeout(300);const award=await snap(page);
  assert.equal(award.stage.tier,c.tier);assert(award.audio.score.playing);assert.equal(award.audio.score.clip,['win-grand','win-super','win-mega','win-epic'][c.tier]+(c.id==='golden-hour'?'':'-'+c.id));assert.equal(award.audio.rolling.playing,false);assert(award.audio.music.filter(s=>s.playing&&s.volume>.01).length<=1);
  assert(Math.max(...award.audio.targets)<.1,'Scene music ducked');assert(award.audio.rms>.001,'Presentation music audible');assert.equal(award.balance,before.balance-before.bet+award.payout);
  await page.screenshot({path:path.join(OUT,c.id+'-'+['big','super','mega','epic'][c.tier]+'-music.png')});
  if(c.record){
   // During a real presentation: hide/show resumes its score; mute does not
   // restart a fanfare when toggled back on. Both paths restore scene music.
   const pausedAt=await page.evaluate(()=>{const cc=window.cc;cc.game.emit(cc.Game.EVENT_HIDE);cc.game.pause();return cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').node.getComponentsInChildren('SalonWinStage')[0].elapsed});await page.waitForTimeout(100);
   const paused=await snap(page);assert(paused.audio.music.every(s=>!s.playing)&&!paused.audio.score.playing&&!paused.audio.cadence.playing&&!paused.audio.rolling.playing,'All managed sources paused');assert(paused.audio.rms<.0001,JSON.stringify(paused.audio));assert.equal(paused.stage.elapsed,pausedAt,'Award clock pauses with the engine');
   await page.evaluate(()=>{window.cc.game.resume();window.cc.game.emit(window.cc.Game.EVENT_SHOW)});await page.waitForTimeout(160);
   const shown=await snap(page);assert.equal(shown.audio.hidden,false);assert.equal(shown.stage.revealed,shown.audio.resolved);
   assert(shown.stage.revealed?shown.audio.cadence.playing:shown.audio.score.playing,'Current musical phase resumes after hide');assert(shown.audio.rms>.001);
  }
  // Natural reveal must cue the resolved phrase at the same time as the
  // settled amount. Larger tiers additionally cover a player's early reveal.
  if(c.tier===0) await until(page,`(${A}).node.getComponentsInChildren('SalonWinStage')[0]?.revealed===true`);
  else {const beforeReveal=await snap(page);await clickNode(page,'Collect your treasure');const afterReveal=await snap(page);assert(afterReveal.stage.elapsed-beforeReveal.stage.elapsed<.25,'Early reveal cannot jump the visual clock');assert.equal(afterReveal.stage.count,String(afterReveal.payout.toLocaleString('en-US',{maximumFractionDigits:3})));}
  await page.waitForTimeout(240);const resolved=await snap(page);
  assert.equal(resolved.stage.revealed,true);assert.equal(resolved.audio.resolved,true);
  assert.equal(resolved.audio.score.playing,false,'Opening phrase completely crossfaded');
  assert.equal(resolved.audio.cadence.playing,true,'Resolved chord at amount reveal');
  assert.equal(resolved.audio.cadence.clip,award.audio.score.clip.replace(/^(win-(?:grand|super|mega|epic))/, '$1-resolve'));
  assert(resolved.audio.rms>.001,'Resolved phrase audible');
  const seated=await visual(page);assert.deepEqual(seated.title,entrance[0].title,'No title float or size change after resolution');assert.deepEqual(seated.countScale,{x:1,y:1},'Payout remains fixed');for(const coin of seated.coins)assert(coin.bottom>seated.plinthTop+20,'Coins never cross the payout');
  // Observe the reveal crescendo over time. Coins and optical pulses must grow
  // visibly while the architecture and amount remain exactly mounted.
  const crescendo=[];
  for(let i=0;i<6;i++){await page.waitForTimeout(170);const f=await visual(page);crescendo.push(f);
   assert.deepEqual(f.title,entrance[0].title);assert.deepEqual(f.countScale,{x:1,y:1});
   for(const coin of f.coins){assert(coin.bottom>f.plinthTop+20);assert(coin.top<=f.coinCeiling+.1);assert(coin.left>=-500&&coin.right<=500);}
   if(i===2)await page.screenshot({path:path.join(OUT,c.id+'-'+['big','super','mega','epic'][c.tier]+'-climax.png')});
  }
  assert(Math.max(...crescendo.map(f=>f.coins.filter(c=>c.burst).length))>=8,'Dedicated reveal volley visible');
  assert(Math.max(...crescendo.map(f=>f.coins.filter(c=>c.wave===1).length))>=8,'Second reveal volley visibly joins the first crest');
  assert(Math.max(...crescendo.flatMap(f=>f.lightFans.map(g=>g.opacity)))>100,'Light fans grow visibly from the treasure sources');
  assert(Math.max(...crescendo.map(f=>f.flare))>100,'Sculpted lettering lights at the reveal');

  if(c.record){
    await page.evaluate(()=>{window.cc.game.emit(window.cc.Game.EVENT_HIDE);window.cc.game.pause()});await page.waitForTimeout(100);assert((await snap(page)).audio.rms<.0001);
    await page.evaluate(()=>{window.cc.game.resume();window.cc.game.emit(window.cc.Game.EVENT_SHOW)});await page.waitForTimeout(150);assert((await snap(page)).audio.cadence.playing,'Resolution resumes after hide');
    // Effect mute during the resolved phrase stops it; unmute never replays it.
    await page.evaluate(()=>{const m=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').audio;m.setEffects(false);m.setEffects(true)});
    const mutedAward=await snap(page);assert.equal(mutedAward.audio.cadence.playing,false);assert.equal(mutedAward.audio.score.playing,false);
  }
  if(c.tier===0) await until(page,`(${A}).state.kind==='idle'`);
  else {await clickNode(page,'Collect your treasure');await page.waitForTimeout(90);const exiting=await snap(page);assert(exiting.audio.closing);assert(exiting.audio.cadence.volume<resolved.audio.cadence.volume);}

  await until(page,`(${A}).state.kind==='idle'`);await page.waitForTimeout(650);const returned=await snap(page);
  assert.equal(returned.audio.score.playing,false);assert.equal(returned.audio.cadence.playing,false);assert.equal(returned.audio.celebrating,false);assert.equal(returned.audio.rolling.playing,false);assert.equal(returned.audio.music.filter(s=>s.playing&&s.volume>.01).length,1);assert(Math.max(...returned.audio.targets)>.4);assert.equal(returned.balance,award.balance);assert.equal(returned.modal,false);
  if(c.record){
   // An ordinary paid round retains its own short melodic cue and no grand score.
   await seedRound(page,1);await clickNode(page,'SPIN');await until(page,`(${A}).state.kind==='presenting'`);await page.waitForTimeout(100);
   const ordinary=await snap(page);assert(ordinary.payout>0&&ordinary.payout<=ordinary.bet);assert(ordinary.audio.effects.some(s=>s.playing&&s.clip==='win-normal'));assert.equal(ordinary.audio.score.playing,false);
   await until(page,`(${A}).state.kind==='idle'`);await page.waitForTimeout(350);
   // No-win follow-up after audio/animation cleanup.
   const again=await seedRound(page,4);await clickNode(page,'SPIN');await until(page,`(${A}).state.kind==='spinning'`);await until(page,`(${A}).state.kind==='idle'`,35000);assert.equal((await snap(page)).balance,again.balance-again.bet);
  }
  let fastExit;
  if(c.tier===1){
   // Two taps while the room is still arriving must resolve once and reverse
   // its current aperture without an old entrance tween making it flash back.
   const fastBefore=await seedRound(page,c.seed,c.force);await clickNode(page,'SPIN');
   await until(page,`(${A}).node.getComponentsInChildren('SalonWinStage').length>0`,35000);
   const initial=await snap(page);await clickNode(page,'Treasure celebration');const reveal=await snap(page);
   assert(reveal.stage.revealed);assert(reveal.stage.elapsed-initial.stage.elapsed<.25);
   assert.equal(reveal.stage.count,String(reveal.payout.toLocaleString('en-US',{maximumFractionDigits:3})));
   await clickNode(page,'Treasure celebration');const closing=await snap(page);assert(closing.stage.finished);assert(closing.audio.closing);
   const fade=[closing.stage.reveal];for(let i=0;i<3;i++){await page.waitForTimeout(70);const frame=await snap(page);if(frame.stage)fade.push(frame.stage.reveal);}
   for(let i=1;i<fade.length;i++)assert(fade[i]<=fade[i-1],'Early exit keeps closing its aperture');
   await until(page,`(${A}).state.kind==='idle'`);await page.waitForTimeout(650);const end=await snap(page);
   assert.equal(end.balance,fastBefore.balance-fastBefore.bet+reveal.payout);assert.equal(end.modal,false);assert(!end.audio.score.playing&&!end.audio.cadence.playing&&!end.audio.celebrating);
   fastExit={initial:initial.stage.elapsed,reveal:reveal.stage.elapsed,fade,exactPayout:reveal.payout,cleanup:true};
  }
  await clickNode(page,'Back to salon');await until(page,`(${A}).page==='home'`);await page.waitForTimeout(1200);const home=await snap(page);
  assert.equal(home.audio.scene,'salon');assert.equal(home.audio.music.filter(s=>s.playing&&s.volume>.01).length,1);assert.equal(home.audio.score.playing,false);assert.equal(home.audio.rolling.playing,false);
  assert.deepEqual(errors,[]);
  if(c.record){
   const audio=await page.evaluate(async()=>{
    const p=window.__audioProbes[0];await new Promise(r=>{p.recorder.onstop=r;p.recorder.stop()});const bytes=new Uint8Array(await new Blob(p.chunks,{type:'audio/webm'}).arrayBuffer());return Array.from(bytes);
   });fs.writeFileSync(path.join(OUT,'motion','pearl-live-audio.webm'),Buffer.from(audio));
  }
  const video=page.video();await context.close();if(c.record){await video.saveAs(path.join(OUT,'motion','pearl-live-video.webm'));await video.delete();}
  report.cases.push({...c,idleRms:idle.audio.rms,awardRms:award.audio.rms,background:idle.audio.music.find(s=>s.playing&&s.volume>.01).clip,awardScore:award.audio.score.clip,resolutionScore:resolved.audio.cadence.clip,reveal:c.tier===0?'automatic':'early tap',payout:award.payout,chargedBet:before.bet,mute:true,hideShow:true,cleanup:true,home:true,gestureDegrees:Math.max(...gestures.map(g=>g.arm))-Math.min(...gestures.map(g=>g.arm)),errors,entrance,seated,crescendo,fastExit});
  fs.writeFileSync(path.join(OUT,'runtime-qa.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS',c.id,c.tier,'rms',idle.audio.rms.toFixed(4),award.audio.rms.toFixed(4));
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
