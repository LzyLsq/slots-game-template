// Lightweight rAF review without MediaRecorder or still captures. Frame callback
// cadence is a browser proxy, not native/GPU frame timing or a smoothness guarantee.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||'docs/qa/text-centering-20261012/frame-consistency');
const mode=process.env.QA_MODE||'golden-otter';
const rounds=Number(process.env.QA_ROUNDS||3);fs.mkdirSync(OUT,{recursive:true});
const errors=[],records=[];
(async()=>{const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});try{
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://127.0.0.1:6044/?debug=1&screen=game&game='+mode+'&v='+encodeURIComponent(process.env.QA_VERSION||'f44-centered-reading-20261012'));await p.waitForFunction(()=>{const a=window.cc?.director?.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.reels&&!a.busy&&!a.node.getChildByName('Atelier loading')&&!document.getElementById('csw-preloader');},null,{timeout:90000});await p.waitForTimeout(600);
 for(let i=0;i<rounds;i++){
  await p.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');window.__frameReview={start:performance.now(),times:[],gaps:[],longTasks:[],tiers:[],active:true,previous:0,previousPhase:''};const r=window.__frameReview;const tick=t=>{const stage=a.modal?.getComponent('SalonWinStage'),phase=stage?'award:'+stage.shownTier:a.state.kind,dt=t-r.previous;if(r.previous){r.times.push(dt);if(dt>50)r.gaps.push({at:t-r.start,gap:dt,from:r.previousPhase,to:phase,awardElapsed:stage?.elapsed});}if(stage&&!r.tiers.includes(stage.shownTier))r.tiers.push(stage.shownTier);r.previous=t;r.previousPhase=phase;if(r.active)r.raf=requestAnimationFrame(tick);};r.raf=requestAnimationFrame(tick);r.observer=new PerformanceObserver(list=>r.longTasks.push(...list.getEntries().map(e=>({at:e.startTime-r.start,duration:e.duration}))));r.observer.observe({type:'longtask',buffered:false});window.__spinComplete=false;a.force='epic';a.spin().finally(()=>window.__spinComplete=true);});
  await p.waitForFunction(()=>window.__spinComplete===true,null,{timeout:45000});await p.waitForTimeout(400);
  const data=await p.evaluate(()=>{const a=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp'),r=window.__frameReview;r.active=false;cancelAnimationFrame(r.raf);r.observer.disconnect();const times=r.times.sort((a,b)=>a-b);return{durationMs:performance.now()-r.start,frames:times.length,maxFrameMs:times.at(-1),p95FrameMs:times[Math.floor(times.length*.95)],gaps:r.gaps,longTasks:r.longTasks,tiers:r.tiers,state:a.state.kind,busy:a.busy,pending:!!a.services.save.currentScope().pendingSpin};});
  assert.equal(data.state,'idle');assert(!data.busy&&!data.pending);records.push({round:i+1,...data});console.log('REVIEW '+(i+1)+' max='+data.maxFrameMs.toFixed(1)+'ms gaps>100='+data.gaps.filter(g=>g.gap>100).length);await p.waitForTimeout(500);
 }
 await c.close();assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(OUT,'frame-review.json'),JSON.stringify({date:new Date().toISOString(),mode,method:'requestAnimationFrame and Long Tasks; no MediaRecorder, screenshots, trace or decoding during measured rounds',fixture:'Debug EPIC results; real local round reservations and settlements; not natural probability evidence',records,errors},null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(OUT,'failure.json'),JSON.stringify({records,errors,failure:e.stack},null,2));process.exitCode=1;});
