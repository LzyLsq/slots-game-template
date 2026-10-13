/* Owned browser: gate real WAV requests to verify readiness, input locking and cache reuse. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const OUT=path.resolve(process.env.QA_OUTPUT||'docs/qa/refinement-20261012/readiness');
const VERSION=process.env.QA_VERSION||'f43-resource-readiness-20261012';
const MODES=['golden-strings','sapphire-harp','ruby-brass','pearl-rhythm'];
fs.mkdirSync(OUT,{recursive:true});
const records=[],checks=[],errors=[];
async function snapshot(p){return p.evaluate(()=>{
 const a=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
 if(!a)return null;
 const boot=a.node.getChildByName('Atelier loading'),mode=a.node.getChildByName('Game mode loading');
 return {page:a.page,config:a.config.id,busy:a.busy,bootLoading:!!boot,modeLoading:!!mode,
  blockingInput:!!(boot||mode)?.getComponent('cc.BlockInputEvents'),
  labels:(boot||mode)?.getComponentsInChildren('cc.Label').map(l=>l.string),
  progress:window.__readyProgress.at(-1),decodedAudio:a.audio.clips.size,
  decodedSeconds:Array.from(a.audio.clips.values()).reduce((sum,c)=>sum+c.getDuration(),0),
  music:a.audio.music.map(s=>({playing:s.playing,clip:s.clip?.name})),
  scroll:[document.documentElement.scrollWidth-innerWidth,document.documentElement.scrollHeight-innerHeight]};
});}
async function ready(p,page){await p.waitForFunction(page=>{
 const a=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');
 return a?.root&&a.page===page&&!a.busy&&!a.node.getChildByName('Atelier loading')&&!a.node.getChildByName('Game mode loading')&&!document.querySelector('#csw-preloader');
},page,{timeout:90000});}
async function tap(p,name){
 const v=await p.evaluate(name=>{
  const cc=window.cc,a=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp');
  const find=n=>n.activeInHierarchy&&(n.name===name||n.name==='Input area · '+name)?n:n.children.map(find).find(Boolean);
  const n=find(a.root);if(!n)throw Error('Missing '+name);
  const b=n.getComponent('cc.UITransform').getBoundingBoxToWorld(),k=innerWidth/cc.view.getVisibleSize().width;
  return{x:(b.x+b.width/2)*k,y:innerHeight-(b.y+b.height/2)*k};
 },name);await p.touchscreen.tap(v.x,v.y);
}
async function navigate(p,page,id){
 if(id){await tap(p,'Choose destination '+MODES.indexOf(id));await tap(p,'Enter selected concert');}
 else await tap(p,'Back to salon');
}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
 try{
  const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true}),p=await c.newPage();
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.__readyProgress=[];performance.setResourceTimingBufferSize(3000);window.addEventListener('aurelia-load-progress',e=>window.__readyProgress.push(e.detail.progress));});
  let release,gate=new Promise(r=>release=r),requests=[];
  await p.route('**/*.wav',async route=>{requests.push(route.request().url());if(gate)await gate;await route.continue();});
  await p.goto('http://127.0.0.1:6043/?debug=1&screen=home&v='+VERSION);
  await p.waitForFunction(()=>{const a=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.art.textures.size>60&&window.__readyProgress.length;});
  await p.waitForTimeout(400);
  const paused=await snapshot(p);assert(paused.progress<1);assert.equal(paused.decodedAudio,0);assert(paused.bootLoading&&paused.blockingInput);assert(!paused.labels.some(s=>s.includes('100%')));
  await p.screenshot({path:path.join(OUT,'loading-awaiting-sound.png')});
  records.push({stage:'boot gated',requests:requests.length,...paused});checks.push('Initial progress cannot show 100% before sound preparation completes');
  release();gate=null;await ready(p,'home');
  const hall=await snapshot(p);assert.equal(hall.decodedAudio,14);assert.equal(hall.progress,1);assert.deepEqual(hall.scroll,[0,0]);
  records.push({stage:'hall ready',requests:requests.length,...hall});checks.push('Hall cold start prepares 14 clips instead of all 90');
  await p.screenshot({path:path.join(OUT,'home-ready.png')});
  for(const [index,id] of MODES.entries()){
   const previous=requests.length;gate=new Promise(r=>release=r);
   await navigate(p,'game',id);
   // Repeated input while preparation is blocked must leave the same destination in control.
   await tap(p,'Enter selected concert');
   for(let attempt=0;requests.length===previous&&attempt<80;attempt++)await p.waitForTimeout(50);
   assert(requests.length>previous,'Destination must request its own sounds');
   await p.waitForTimeout(400);
   const loading=await snapshot(p);assert(loading.busy&&loading.modeLoading&&loading.blockingInput);assert.equal(loading.page,'home');assert.equal(loading.decodedAudio,14+index*19);assert(!loading.labels.some(s=>s.includes('100%')));
   records.push({stage:id+' gated',newRequests:requests.length-previous,...loading});
   await p.screenshot({path:path.join(OUT,'loading-'+id+'.png')});
   release();gate=null;await ready(p,'game');
   const game=await snapshot(p);assert.equal(game.config,id);assert.equal(game.decodedAudio,33+index*19);
   records.push({stage:id+' ready',newRequests:requests.length-previous,...game});
   checks.push(id+': dedicated loading waits for sound; repeated entry is ignored');
   await navigate(p,'home');await ready(p,'home');await p.waitForTimeout(850);
   const back=await snapshot(p);assert.equal(back.music.filter(s=>s.playing).length,1);assert.equal(back.music.find(s=>s.playing).clip,'music-salon');
   const cached=requests.length;await navigate(p,'game',id);await ready(p,'game');assert.equal(requests.length,cached);
   checks.push(id+': cached re-entry makes no WAV requests and BACK retains one hall loop');
   await navigate(p,'home');await ready(p,'home');
  }
  await c.close();
  // Stall every optional sound. Accelerate only the audio deadline and its timers;
  // report this as a timeout fixture rather than real network elapsed time.
  const failed=await b.newContext({viewport:{width:320,height:568},deviceScaleFactor:1,isMobile:true,hasTouch:true}),q=await failed.newPage();
  q.on('pageerror',e=>errors.push(e.message));
  await q.addInitScript(()=>{window.__readyProgress=[];window.addEventListener('aurelia-load-progress',e=>window.__readyProgress.push(e.detail.progress));const nativeTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>nativeTimeout(fn,ms>0&&ms<=20000&&String(fn).includes('Sound load timed out')?1:ms,...args);const now=Date.now;Date.now=()=>now()*1000;});
  await q.route('**/*.wav',async()=>new Promise(()=>{}));
  const failureStart=Date.now();await q.goto('http://127.0.0.1:6043/?debug=1&screen=game&game=golden-strings&v='+VERSION+'-timeout');await ready(q,'game');
  const failure=await snapshot(q);assert.equal(failure.decodedAudio,0);assert(!failure.busy&&!failure.modeLoading&&!failure.bootLoading);assert.deepEqual(failure.scroll,[0,0]);
  records.push({stage:'all sounds stalled; accelerated optional timeout',elapsedMs:Date.now()-failureStart,...failure});
  checks.push('All stalled optional sounds release loading within one scene preparation budget');
  await navigate(q,'home');await ready(q,'home');checks.push('Return to hall works after optional sound timeouts');
  await failed.close();assert.deepEqual(errors,[]);
 }finally{await b.close();fs.writeFileSync(path.join(OUT,'readiness-audit.json'),JSON.stringify({checks,records,errors,scope:'Isolated desktop Chromium; real resource gating. All-sound timeout uses an accelerated clock/timer fixture, not native device/network timing.'},null,2));}
 console.log('PASS '+checks.length+' readiness checks');
})().catch(e=>{console.error(e);process.exit(1)});
