/* Actual decoded Cocos voices and downstream WebAudio gain values. Actions are
 * isolated audio fixtures, not awards/settlement or evidence of phone listening. */
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const OUT = path.resolve(process.env.QA_OUTPUT || 'docs/qa/f43-feedback-mix-20261013/mix');
const VERSION = process.env.QA_VERSION || 'f43-feedback-mix-20261013';
const MODES = (process.env.QA_MODES || 'salon,golden-strings,sapphire-harp,ruby-brass,pearl-rhythm').split(',');
fs.mkdirSync(OUT,{recursive:true});
async function fixture(page, label, actions, duration) {
  return page.evaluate(async ({label,actions,duration}) => {
    const m = cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').audio;
    const native = s => s._player?._player?._gainNode?.gain.value ?? null;
    const snapshot = () => ({
      t:performance.now()-started, music:m.music[m.active]?.volume,
      nativeMusic:native(m.music[m.active]), target:m.targets[m.active],
      spinning:m.spinning, rolling:m.rolling.playing, rollVolume:m.rolling.volume,
      nativeRolling:native(m.rolling), celebrating:m.celebrating, hidden:m.hidden,
      musicEnabled:m.musicEnabled, effectsEnabled:m.effectsEnabled,
      score:m.score.playing,cadence:m.cadence.playing,
      effects:m.effects.filter(s=>s.playing).map(s=>({name:s.clip?.name,volume:s.volume,native:native(s),time:s.currentTime,duration:s.clip?.getDuration()})),
    });
    const baseline=m.music[m.active].volume, started=performance.now(), samples=[], events=[];
    const sampler=setInterval(()=>samples.push(snapshot()),16);
    const perform = action => {
      const voice=m.voice;
      if(action.type==='play')m.play(action.cue,action.column||0);
      else if(action.type==='feature')m.playAward(1);
      else if(action.type==='spin')m.setSpinning(action.enabled);
      else if(action.type==='effects')m.setEffects(action.enabled);
      else if(action.type==='music')m.setMusic(action.enabled);
      else if(action.type==='award')m.playCelebration(300);
      else if(action.type==='reveal')m.revealCelebration();
      else if(action.type==='close')m.closeCelebration(.42);
      else if(action.type==='hide')cc.game.emit(cc.Game.EVENT_HIDE);
      else if(action.type==='show')cc.game.emit(cc.Game.EVENT_SHOW);
      events.push({...action,actual:performance.now()-started,accepted:m.voice-voice,snapshot:snapshot()});
    };
    const timers=actions.map(action=>setTimeout(()=>perform(action),action.at));
    await new Promise(resolve=>setTimeout(resolve,duration));
    // Do not mistake slow GPU simulation time for a permanently stuck mixer.
    // Keep tracing real gain until it recovers, with a strict extra budget.
    const recoveryDeadline=performance.now()+4000;
    while(m.musicEnabled&&!m.hidden&&m.music[m.active].volume<=.405&&performance.now()<recoveryDeadline)
      await new Promise(resolve=>setTimeout(resolve,50));
    timers.forEach(clearTimeout);clearInterval(sampler);samples.push(snapshot());
    return {label,baseline,actions:events,samples};
  },{label,actions,duration});
}
function close(a,b,message){assert(Math.abs(a-b)<.005,message+': '+a+' vs '+b)}
function restored(report){assert(report.samples.at(-1).music>.40,report.label+': music did not recover '+JSON.stringify(report.samples.at(-1)))}
function smooth(report,start,end){
  const recovery=report.samples.filter(s=>s.t>=start&&s.t<=end);
  assert(recovery.length>=5,'Too few recovery observations');
  for(let i=1;i<recovery.length;i++)assert(recovery[i].music+1e-5>=recovery[i-1].music,'Recovery reversed without another cue');
  assert(recovery.some(s=>s.music>.15&&s.music<.38),'No intermediate recovery level');
}
function nativeEvidence(report){
  assert(report.samples.some(s=>s.nativeMusic!==null),'Missing downstream WebAudio music gain');
  for(const s of report.samples.filter(s=>!s.hidden)){
    assert(Number.isFinite(s.nativeMusic)&&s.nativeMusic>=0&&s.nativeMusic<=.421,'Invalid actual music gain');
    // Cocos WebAudio ramps a gain command over ~10ms. During recovery the
    // AudioParam is deliberately behind the requested component level.
    if(s.effects.some(e=>e.time>.05))assert(s.nativeMusic<s.music+.02,'Native gain stayed high over feedback');
    for(const effect of s.effects)if(effect.time>.05)close(effect.native,effect.volume,'Actual feedback gain differs from component');
  }
  close(report.samples.at(-1).nativeMusic,report.samples.at(-1).music,'Native recovery did not finish');
}
(async()=>{
 const b=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']}),checks=[],reports=[],errors=[];
 try{for(const mode of MODES){
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  await c.addInitScript(()=>{
    window.__audioStreams=[];const connect=AudioNode.prototype.connect,mirrored=new WeakSet();
    AudioNode.prototype.connect=function(...args){
      const result=connect.apply(this,args);
      if(args[0] instanceof AudioDestinationNode&&!mirrored.has(this)){
        const ctx=this.context;ctx.__qaDestination??=ctx.createMediaStreamDestination();
        if(!window.__audioStreams.includes(ctx.__qaDestination.stream))window.__audioStreams.push(ctx.__qaDestination.stream);
        connect.call(this,ctx.__qaDestination);mirrored.add(this);
      }return result;
    };
  });
  const p=await c.newPage();p.on('pageerror',e=>errors.push({mode,message:e.message}));
  p.on('console',e=>{if(e.type()==='error'||e.text().includes('Audio unavailable'))errors.push({mode,message:e.text()})});
  await p.goto('http://127.0.0.1:6043/?debug=1&screen='+(mode==='salon'?'home':'game&game='+mode)+'&v='+encodeURIComponent(VERSION));
  await p.waitForFunction(()=>{const a=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.audio&&!a.busy&&!document.getElementById('csw-preloader')&&!a.node.getChildByName('Atelier loading')},null,{timeout:90000});
  await p.evaluate(()=>{const m=cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').audio;m.setEffects(true);m.setMusic(true)});
  await p.waitForTimeout(1400);
  await p.evaluate(()=>{
    const stream=__audioStreams[0];if(!stream?.getAudioTracks().length)throw Error('Actual audio stream missing');
    const mime='audio/webm;codecs=opus';window.__parts=[];window.__rec=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:128000});
    __rec.ondataavailable=e=>{if(e.data.size)__parts.push(e.data)};
    window.__ended=new Promise(resolve=>__rec.onstop=()=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob(__parts,{type:mime}))});__rec.start(200);
  });
  const local=[];
  let r=await fixture(p,'tap',[{at:0,type:'play',cue:'tap'}],1900);
  assert(r.baseline>.40);assert(r.actions[0].accepted===1);
  assert(r.actions[0].snapshot.music<.102,'Cue onset was masked until next render');
  const taps=r.samples.filter(s=>s.effects.some(e=>e.name==='ui-touch'&&e.time>.02));assert(taps.length>=3);
  assert(taps.every(s=>s.music<.103),'Music restored over tap tail');
  assert(taps.every(s=>s.effects.find(e=>e.name==='ui-touch').volume===.40),'Feedback level changed');
  smooth(r,340,1300);restored(r);nativeEvidence(r);local.push(r);checks.push(mode+': tap onset, full tail, native gain and smooth recovery');
  if(mode!=='salon'){
    r=await fixture(p,'rolling and sequential stops',[
      {at:0,type:'spin',enabled:true},{at:0,type:'play',cue:'spin'},
      ...[0,1,2,3].map((column,i)=>({at:140+i*120,type:'play',cue:'reel-stop',column})),
      {at:900,type:'spin',enabled:false},
    ],2450);
    const stops=r.samples.filter(s=>s.spinning&&s.effects.some(e=>e.name.startsWith('reel-stop')));
    assert(stops.length>=10);assert(stops.every(s=>s.music<.094),'Spinning overrode stop feedback duck');
    assert(stops.every(s=>s.rollVolume<.092),'Rolling mechanism masked column stop');
    assert(r.actions.filter(a=>a.cue==='reel-stop').every(a=>a.accepted===1));
    restored(r);nativeEvidence(r);local.push(r);checks.push(mode+': real rolling voice and four stops keep music/rolling below feedback');
  }
  r=await fixture(p,'normal win and overlapping receipts',[
    {at:0,type:'play',cue:'win'},{at:120,type:'play',cue:'reward'},
    {at:220,type:'feature'},{at:400,type:'play',cue:'tap'},
  ],3100);
  const wins=r.samples.filter(s=>s.effects.some(e=>e.name.startsWith('win-normal')||e.name.startsWith('feature')||e.name.startsWith('coin-collect')));
  assert(wins.length>=40);assert(wins.every(s=>s.music<.077),'Short tap released a longer award/receipt');
  assert(r.actions.every(a=>a.accepted===1));restored(r);nativeEvidence(r);local.push(r);checks.push(mode+': normal win/reward/feature retain priority over later short tap');
  r=await fixture(p,'rapid taps',Array.from({length:12},(_,i)=>({at:i*85,type:'play',cue:'tap'})),2500);
  assert(r.actions.every(a=>a.accepted===1));assert(r.samples.filter(s=>s.t<1050).every(s=>s.music<.103),'Rapid feedback pumped music between clicks');
  smooth(r,1250,2150);restored(r);nativeEvidence(r);local.push(r);checks.push(mode+': twelve rapid taps reuse managed voices and recover without pumping');
  if(mode!=='salon'){
    r=await fixture(p,'award exit and wallet receipt',[
      {at:0,type:'award'},{at:300,type:'reveal'},{at:650,type:'close'},
    ],3100);
    const receipt=r.samples.filter(s=>s.t>1120&&s.effects.some(e=>e.name.startsWith('coin-collect')));
    assert(receipt.length>=8);assert(receipt.every(s=>!s.celebrating&&s.music<.085),'Music restored over wallet receipt after award exit');
    assert(!r.samples.at(-1).score&&!r.samples.at(-1).cadence);restored(r);nativeEvidence(r);local.push(r);checks.push(mode+': wallet receipt remains in foreground through completed award exit');
  }
  r=await fixture(p,'effects off',[
    {at:0,type:'play',cue:'reward'},{at:90,type:'effects',enabled:false},
    {at:200,type:'play',cue:'tap'},{at:500,type:'effects',enabled:true},
  ],1800);
  assert(r.actions.find(a=>a.at===200).accepted===0);assert(r.samples.filter(s=>s.t>140&&s.t<490).every(s=>s.effects.length===0&&s.target===.42));
  restored(r);local.push(r);checks.push(mode+': effects mute releases duck and does not create silent holds');
  r=await fixture(p,'hide and resume',[
    {at:0,type:'play',cue:'reward'},{at:180,type:'hide'},{at:520,type:'show'},
  ],2200);
  assert(r.samples.filter(s=>s.hidden).every(s=>s.effects.length===0&&!s.rolling));
  assert(r.samples.filter(s=>s.t>620).every(s=>s.effects.length===0));restored(r);local.push(r);checks.push(mode+': foreground returns without stale feedback or duck');
  const data=await p.evaluate(async()=>{__rec.stop();return await __ended});
  fs.writeFileSync(path.join(OUT,mode+'-mix.webm'),Buffer.from(data,'base64'));
  fs.writeFileSync(path.join(OUT,mode+'-curves.json'),JSON.stringify(local,null,2)+'\n');
  reports.push({mode,fixtures:local.map(({label,baseline,samples})=>({label,baseline,samples:samples.length,minMusic:Math.min(...samples.map(s=>s.music)),finalMusic:samples.at(-1).music})),recording:mode+'-mix.webm'});
  await c.close();console.log('PASS feedback mix '+mode);
 }assert.deepEqual(errors,[])}finally{await b.close();fs.writeFileSync(path.join(OUT,process.env.QA_REPORT||'mix-audit.json'),JSON.stringify({version:VERSION,checks,reports,errors,scope:'Actual Cocos AudioSource and WebAudio downstream gain in an isolated desktop browser. Direct audio fixtures; no subjective/phone listening or natural-probability claim.'},null,2)+'\n')}
 console.log('PASS '+checks.length+' actual mix checks');
})().catch(e=>{console.error(e);process.exit(1)});
