/* Real exported AudioSources/WebAudio taps. These fixtures do not settle a game.
 * Actual paid rounds and audio lifecycle are covered separately by audio.cjs. */
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const OUT = path.resolve(process.env.QA_OUTPUT || 'docs/qa/f44-feedback-mix-20261013/mix');
const BASELINE = process.env.QA_BASELINE === '1';
const MODES = (process.env.QA_MODES || 'salon,golden-otter,moon-rabbit,star-fox,cloud-elephant').split(',');
fs.mkdirSync(OUT, {recursive:true});
function wav(chunks, rate) {
  const bytes = Buffer.from(chunks, 'base64');
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(bytes.length+36, 4); head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate*4, 28);
  head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(bytes.length, 40);
  return Buffer.concat([head, bytes]);
}
async function fixture(p, cue) {
  return p.evaluate(async cue => {
    const m = window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').audio;
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    m.setMusic(true); m.setEffects(true); m.setSpinning(cue === 'reel-stop');
    await sleep(1600);
    const gain = m.music[m.active]._player._player._gainNode;
    const ctx = gain.context;
    const merger = ctx.createChannelMerger(4);
    const processor = ctx.createScriptProcessor(1024, 4, 2);
    const silence = ctx.createGain(); silence.gain.value = 0;
    merger.connect(processor); processor.connect(silence); silence.connect(ctx.destination);
    const attached = new Set(), splitters = [], blocks = [], frames = [];
    const start = performance.now();
    const read = source => source._player?._player?._gainNode?.gain.value ?? source.volume;
    const baseline = read(m.music[m.active]);
    let eventTime = 0, eventAudioTime = 0, peak = 0, clipped = 0, stopSpin = false;
    let capture = true;
    processor.onaudioprocess = event => {
      if (!capture) return;
      const channels = Array.from({length:4}, (_, i) => new Float32Array(event.inputBuffer.getChannelData(i)));
      let music = 0, feedback = 0;
      const pcm = new Int16Array(channels[0].length*2);
      for (let i=0; i<channels[0].length; i++) {
        for (let c=0; c<2; c++) {
          const bed = channels[c][i], cue = channels[c+2][i], sum = bed+cue;
          music += bed*bed; feedback += cue*cue;
          peak = Math.max(peak, Math.abs(sum)); if (Math.abs(sum)>=1) clipped++;
          pcm[i*2+c] = Math.round(Math.max(-1, Math.min(1, sum))*32767);
        }
      }
      blocks.push({audioTime:event.playbackTime, musicRms:Math.sqrt(music/pcm.length), feedbackRms:Math.sqrt(feedback/pcm.length), pcm});
    };
    const sample = () => {
      if (!capture) return;
      const t = performance.now()-start;
      for (const source of [...m.music, ...m.effects, m.rolling, m.score, m.cadence]) {
        const node = source._player?._player?._gainNode;
        if (!node || attached.has(node)) continue;
        const splitter = ctx.createChannelSplitter(2), bus = m.effects.includes(source) ? 2 : 0;
        node.connect(splitter); splitter.connect(merger, 0, bus); splitter.connect(merger, 1, bus+1);
        attached.add(node); splitters.push(splitter);
      }
      frames.push({t, music:read(m.music[m.active]), target:m.targets[m.active], rolling:read(m.rolling), voices:m.effects.filter(s=>s.playing).length});
      if (eventTime && !stopSpin && t-eventTime>600 && (cue==='spin'||cue==='reel-stop')) {
        m.setSpinning(false); stopSpin = true;
      }
      requestAnimationFrame(sample);
    };
    sample(); await sleep(180);
    eventTime = performance.now()-start; eventAudioTime = ctx.currentTime;
    if (cue==='spin') m.setSpinning(true);
    m.play(cue);
    const clipName = cue==='tap'?'ui-touch':cue==='spin'?'reel-start':cue==='reel-stop'?'reel-stop'+(m.scene==='salon'?'':'-'+m.scene):'coin-collect'+(m.scene==='salon'?'':'-'+m.scene);
    const duration = m.clips.get(clipName).getDuration();
    await sleep(duration*1000 + 1550);
    capture = false; processor.onaudioprocess = null;
    for (const splitter of splitters) splitter.disconnect();
    // Disconnect the added capture edges, preserving engine destination edges.
    attached.forEach(node => { for (const splitter of splitters) { try { node.disconnect(splitter); } catch {} } });
    merger.disconnect(); processor.disconnect(); silence.disconnect();
    const bytes = new Uint8Array(blocks.reduce((sum,b)=>sum+b.pcm.byteLength,0));
    let offset = 0;
    for (const block of blocks) { bytes.set(new Uint8Array(block.pcm.buffer), offset); offset+=block.pcm.byteLength; }
    let encoded=''; for(let i=0;i<bytes.length;i+=8192)encoded+=String.fromCharCode(...bytes.subarray(i,i+8192));
    return {cue,clipName,duration,baseline,eventTime,eventAudioTime,frames,blocks:blocks.map(({pcm,...b})=>b),peak,clipped,pcm:btoa(encoded),rate:ctx.sampleRate};
  }, cue);
}
(async () => {
  const b = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--autoplay-policy=no-user-gesture-required']});
  const cases = [], lifecycle = [], errors = [];
  try {
    for (const mode of MODES) {
      const c = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}), p = await c.newPage();
      p.on('pageerror',e=>errors.push({mode,message:e.message}));
      p.on('console',e=>{if(e.type()==='error'||e.text().includes('Audio unavailable'))errors.push({mode,message:e.text()});});
      await p.goto('http://127.0.0.1:6044/?debug=1&screen='+(mode==='salon'?'home':'game&game='+mode)+'&v='+encodeURIComponent(process.env.QA_VERSION||'f44-feedback-mix-20261013'));
      await p.waitForFunction(()=>{const a=window.cc?.director.getScene()?.getChildByName('Canvas')?.getComponent('AureliaApp');return a?.audio&&(a.page==='home'||a.reels)&&!a.busy&&!a.node.getChildByName('Atelier loading')&&!document.querySelector('#csw-preloader')},null,{timeout:90000});
      for (const cue of ['tap','spin','reel-stop','reward']) {
        const record = await fixture(p,cue), {pcm, ...data} = record;
        fs.writeFileSync(path.join(OUT,mode+'-'+cue+'.wav'),wav(pcm,record.rate));
        const onset = data.frames.filter(s=>s.t-data.eventTime>=45&&s.t-data.eventTime<=110);
        const hold = data.frames.filter(s=>s.t-data.eventTime>=100&&s.t-data.eventTime<=data.duration*1000);
        const late = data.frames.filter(s=>s.t>data.eventTime+data.duration*1000+1400);
        const signal = data.blocks.filter(s=>s.audioTime>=data.eventAudioTime&&s.audioTime<=data.eventAudioTime+data.duration+.10);
        const peakFeedback = Math.max(...signal.map(s=>s.feedbackRms));
        const audible = signal.filter(s=>s.feedbackRms>peakFeedback*.20);
        data.summary = {
          onsetMusicFraction:Math.max(...onset.map(s=>s.music))/data.baseline,
          heldMusicFraction:Math.max(...hold.map(s=>s.music))/data.baseline,
          restoredMusic:Math.min(...late.map(s=>s.music)),
          feedbackRms:Math.sqrt(audible.reduce((sum,s)=>sum+s.feedbackRms**2,0)/audible.length),
          accompanimentRms:Math.sqrt(audible.reduce((sum,s)=>sum+s.musicRms**2,0)/audible.length),
        };
        cases.push({mode,...data});
        assert(onset.length&&hold.length&&late.length,'Capture must cover cue onset, body and restoration');
        assert(peakFeedback>.001,'Real WebAudio output must contain the feedback');
        assert.equal(data.clipped,0,'Captured mix must not clip');
        if(!BASELINE){
          assert(data.summary.onsetMusicFraction<=.55,mode+' '+cue+': room for cue onset');
          assert(data.summary.heldMusicFraction<=.46,mode+' '+cue+': attenuation holds for actual clip length');
          assert(data.summary.restoredMusic>.405,mode+' '+cue+': background music recovers');
          if(cue==='reel-stop')assert(Math.max(...hold.map(s=>s.rolling))<.12,'Mechanism yields to column stop');
        }
        console.log('PASS '+mode+' '+cue+' onset='+data.summary.onsetMusicFraction.toFixed(3)+' hold='+data.summary.heldMusicFraction.toFixed(3));
      }
      if(!BASELINE){
        const states = await p.evaluate(async()=>{
          const m=window.cc.director.getScene().getChildByName('Canvas').getComponent('AureliaApp').audio;
          const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
          const state=()=>({targets:m.targets.slice(),duckVoices:m.feedbackDucks.size,gain:m.feedbackGain,music:m.music.filter(s=>s.playing).length,feedback:m.effects.filter(s=>s.playing).length,rolling:m.rolling.playing});
          m.play('reward'); await sleep(120); m.play('tap'); await sleep(340);
          const overlap=state();
          m.setSpinning(true);m.play('spin');await sleep(100);m.setEffects(false);await sleep(1200);
          const disabled=state();
          m.setSpinning(false);m.setMusic(false);m.setEffects(true);m.play('tap');await sleep(80);
          const effectsOnly=state();
          m.setEffects(false); const muted=state();
          m.setMusic(true);m.setEffects(true);m.play('reward');await sleep(80);
          window.cc.game.emit(window.cc.Game.EVENT_HIDE);const hidden=state();
          window.cc.game.emit(window.cc.Game.EVENT_SHOW);await sleep(1100);const resumed=state();
          return {overlap,disabled,effectsOnly,muted,hidden,resumed};
        });
        assert(Math.max(...states.overlap.targets)<.11,'Short tap cannot release longer reward');
        assert.equal(states.disabled.duckVoices,0);assert.equal(states.disabled.gain,1);assert(Math.max(...states.disabled.targets)>.41);
        assert.equal(states.effectsOnly.music,0);assert(states.effectsOnly.feedback>0);
        assert.equal(states.muted.feedback,0);assert.equal(states.muted.duckVoices,0);
        assert.equal(states.hidden.music,0);assert.equal(states.hidden.feedback,0);assert.equal(states.hidden.duckVoices,0);
        assert.equal(states.resumed.music,1);assert(Math.max(...states.resumed.targets)>.41);
        lifecycle.push({mode,...states});
      }
      await c.close();
    }
    assert.deepEqual(errors,[]);
  } finally {
    await b.close();
    fs.writeFileSync(path.join(OUT,'mix-audit.json'),JSON.stringify({baseline:BASELINE,cases,lifecycle,errors,method:'Real Cocos AudioSource gain envelopes plus separate WebAudio accompaniment/feedback PCM taps. WAV is their captured stereo sum. Direct cue fixtures do not charge or settle rounds. Desktop capture cannot prove phone speaker or subjective listening quality.'},null,2)+'\n');
  }
})().catch(e=>{console.error(e);process.exitCode=1});
