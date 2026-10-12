import {MUSIC_SCENES,themeMusic,VOICE_SHAPES} from '../assets/scripts/audio/MusicTheme';
import assert from 'node:assert/strict';
import {BEAT_SECONDS,CUES,cueNotes,celebrationCue,recordedCueRate,musicNotes,musicWindow,musicBeatSeconds} from '../assets/scripts/audio/AudioScore';
import {awardScore,awardFinale} from '../assets/scripts/audio/AwardScore';
import {SoundscapeEngine} from '../assets/scripts/audio/SoundscapeEngine';
import {pressFeedback,validPressCue} from '../assets/scripts/ui/PressFeedback';
import {PlayerProfileService} from '../assets/scripts/services/PlayerProfileService';
import {SaveService,MemoryStorage} from '../assets/scripts/services/SaveService';
import {LocalAuthService} from '../assets/scripts/services/LocalAuthService';
import {TERMS_VERSION,PRIVACY_VERSION} from '../assets/scripts/core/ReleaseConfig';

class Param {
  value=0;events:{value:number;time:number}[]=[];
  setValueAtTime(value:number,time:number){this.value=value;this.events.push({value,time});return this;}
  linearRampToValueAtTime(value:number,time:number){return this.setValueAtTime(value,time);}
  exponentialRampToValueAtTime(value:number,time:number){assert(value>0);return this.setValueAtTime(value,time);}
  cancelScheduledValues(time:number){this.events=this.events.filter(e=>e.time<time);return this;}
  cancelAndHoldAtTime(time:number){return this.cancelScheduledValues(time);}
}
class AudioNodeMock {
  Q=new Param();gain=new Param();pan=new Param();frequency=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();
  type='';disconnects=0;connections:AudioNodeMock[]=[];
  connect(node:AudioNodeMock){this.connections.push(node);return node;}
  disconnect(){this.disconnects++;}
}
class OscillatorMock extends AudioNodeMock {
  periodic?:unknown;setPeriodicWave(wave:unknown){this.periodic=wave;}
  end=Infinity;startAt=-1;onended?:()=>void;ended=false;
  start(time:number){this.startAt=time;}
  stop(time:number){this.end=time;}
}
class ContextMock {
  sampleRate=44100;
  createBuffer(channels:number,size:number,rate:number){const data=new Float32Array(size);return {getChannelData:()=>data};}
  createBufferSource(){const o=new OscillatorMock();this.oscillators.push(o);return o;}
  state='running';currentTime=0;destination=new AudioNodeMock();oscillators:OscillatorMock[]=[];nodes:AudioNodeMock[]=[];resumeCount=0;suspendCount=0;
  releaseResume?:()=>void;deferred=false;
  createGain(){const n=new AudioNodeMock();this.nodes.push(n);return n;}
  createBiquadFilter(){return this.createGain();}
  createConvolver(){return this.createGain();}
  createDynamicsCompressor(){return this.createGain();}
  createStereoPanner(){return this.createGain();}
  periodicWaves:{imag:Float32Array}[]=[];createPeriodicWave(real:Float32Array,imag:Float32Array){const p={imag};this.periodicWaves.push(p);return p;}
  createOscillator(){const o=new OscillatorMock();this.oscillators.push(o);return o;}
  async resume(){this.resumeCount++;if(this.deferred)await new Promise<void>(r=>this.releaseResume=r);if(this.state!=='closed')this.state='running';}
  async suspend(){this.suspendCount++;this.state='suspended';}
  async close(){this.state='closed';}
  advance(seconds:number){this.currentTime+=seconds;for(const o of this.oscillators)if(!o.ended&&o.end<=this.currentTime){o.ended=true;o.onended?.();}}
  audio(){return this as unknown as AudioContext;}
}
assert.deepEqual([0,1,2,3,4].map(celebrationCue),['win','big-win','epic-win','epic-win','epic-win'],'super and higher visual tiers receive the stronger fanfare');
for(const [cue,notes] of Object.entries(CUES))for(const [pitch,length,delay,volume] of notes){
  assert(pitch>=100&&pitch<=1600,cue);assert(length>0&&length<1);assert(delay>=0&&delay<1);assert(volume>0&&volume<=.05);
}
for(const scene of ['lobby','golden-hour','jade-treasury','pearl-palace','ruby-revel']){
  for(let beat=0;beat<128;beat++)for(const [pitch,duration,delay,volume] of musicNotes(beat,scene)){
    assert(pitch>75&&pitch<1800);assert(duration<1&&delay>=0);assert(volume<=.011,'music must remain subordinate to tactile cues');
  }
}
assert.equal(new Set(MUSIC_SCENES.map(s=>themeMusic(s).melody.join(','))).size,5,'distinct compositions, not transposition');
assert.equal(new Set(MUSIC_SCENES.map(s=>themeMusic(s).bpm)).size,5,'distinct tempos');
assert.equal(themeMusic('pearl-palace').eighthsPerBar,6);assert.equal(themeMusic('jade-treasury').lead,'harp');
for(const scene of MUSIC_SCENES){
 const theme=themeMusic(scene);assert.equal(theme.melody.length%theme.eighthsPerBar,0);
 for(let beat=0;beat<theme.melody.length;beat++)assert.deepEqual(musicNotes(beat,scene),musicNotes(beat+theme.melody.length,scene),'loop cadence is deterministic');
 for(const [cue] of Object.entries(CUES))for(const [pitch,length,delay,volume,wave,instrument,pan] of cueNotes(cue as keyof typeof CUES,scene)){
  assert(pitch>100&&pitch<1600);assert(instrument&&VOICE_SHAPES[instrument]);assert(Math.abs(pan??0)<=.5);
 }
 for(const now of [0,.12,4,300,36000]){const p=musicWindow(now,0,0,scene);assert(p.times.length<=3);assert(p.times.every(t=>t>=now&&t<=now+.4));assert(p.nextBeat>=now+.38);}
 assert.equal(musicBeatSeconds(scene),60/theme.bpm/2);
}
assert.equal(new Set(MUSIC_SCENES.slice(1).map(s=>{const motif=themeMusic(s).award;return motif.map(p=>p-motif[0]).join(',');})).size,4,'4 different fanfare motifs, not transposition');
for(const now of [0,.12,4,300,36000]){
  const p=musicWindow(now,0,0);assert(p.times.length<=3);assert(p.times.every(t=>t>=now&&t<=now+.4));assert(p.nextBeat>=now+.38);assert.equal(p.beat,p.firstBeat+p.times.length);
}
assert(musicWindow(36000,0,0).firstBeat>90000,'a delayed timer skips missed score notes');
assert.equal(musicWindow(1,1+BEAT_SECONDS*3,2).times.length,0,'no premature schedule');
assert.equal(pressFeedback('Decrease bet').cue,'bet');assert.equal(pressFeedback('Back to slots').cue,'navigate');
assert.equal(pressFeedback('AUTO').cue,'toggle');assert.equal(pressFeedback('SPIN').cue,'tap','SPIN has a tactile contact cue before its motor starts');assert.equal(pressFeedback('SPIN').vibration,14);
assert.equal(pressFeedback('Save nickname').cue,'confirm');assert.equal(pressFeedback('anything','bet').cue,'bet');
assert(validPressCue('tap')&&!validPressCue('none')&&!validPressCue('bogus'));

for(const tier of [0,1,2,3,4])for(const scene of ['golden-hour','jade-treasury','pearl-palace','ruby-revel']){
 const end=tier?4.1+tier*.45:.72,score=awardScore(tier,end,scene);
 assert(score.length>(tier?28:2),'a complete phrase, not a single reward beep');
 assert(score.every((n,i)=>n.at>=0&&n.at<end&&(i===0||n.at>=score[i-1].at)));
 assert(score.every(n=>n.noise||n.pitch>60&&n.pitch<3600));
 assert(score.every(n=>n.volume>0&&n.volume<.04));
 const final=awardFinale(tier,scene);assert(final.length>=5);assert(final.every(n=>n.at<.7));assert(final.every(n=>n.volume>0&&n.volume<.04));
 if(tier>=2)assert(final.filter(n=>n.at>=.55).length>=4,'second visual bloom receives a matching musical reply');
}
assert.equal(awardFinale(0,'lobby',false).length,1,'a partial return must not sound like a jackpot');
for(const scene of MUSIC_SCENES){
 for(const cue of ['tap','bet','navigate','toggle','confirm','spin','reel-stop','error'] as const)assert.equal(recordedCueRate(cue,scene),1);
 const rate=recordedCueRate('collect',scene);assert(rate>=.74&&rate<=1.34);
 const tonic=themeMusic(scene).chords[0][0]%12;
 assert.equal(((Math.round(12*Math.log2(rate))%12)+12)%12,tonic,'recorded currency notes align with the cabinet tonic');
}


const main=async()=>{
  // Music/effects are independent even before the first gesture.
  {
    const c=new ContextMock(),engine=new SoundscapeEngine(()=>c.audio());engine.configure({music:false});engine.play('tap');
    assert.equal(engine.snapshot().musicTimer,false);assert.equal(engine.snapshot().voices,2);assert.equal(engine.snapshot().cuePlays,1);assert.equal(engine.snapshot().lastPlayedCue,'tap');assert.equal(engine.snapshot().lastCueSource,'fallback');
    engine.play('tap');assert.equal(engine.snapshot().voices,2,'duplicate contact must not stack a second cue');assert.equal(engine.snapshot().cuePlays,1);
    c.advance(.2);assert.equal(engine.snapshot().voices,0);assert(c.oscillators.every(o=>o.disconnects===1),'voices disconnect when finished');
    engine.configure({music:true});assert(engine.snapshot().musicTimer);assert(engine.snapshot().voices>0);
    engine.configure({music:false});c.advance(.2);assert.equal(engine.snapshot().voices,0,'muted music leaves no queued tone');
    engine.play('win');assert.equal(engine.snapshot().voices,3,'music mute does not mute effects');
    engine.configure({sound:false});c.advance(.1);assert.equal(engine.snapshot().voices,0);const plays=engine.snapshot().cuePlays;engine.play('reward');assert.equal(engine.snapshot().voices,0);assert.equal(engine.snapshot().cuePlays,plays);
    engine.configure({music:true});assert(engine.snapshot().musicTimer,'effects mute does not mute music');
    engine.destroy();assert.equal(engine.snapshot().voices,0);assert.equal(engine.snapshot().musicTimer,false);
  }
  {
    const c=new ContextMock(),engine=new SoundscapeEngine(()=>c.audio());engine.configure({music:false});
    for(let i=0;i<30;i++){
      engine.play((['tap','bet','toggle'] as const)[i%3]);
      assert.equal(engine.snapshot().pressVoices,2,'fallback contact is one two-note design, not stacked designs');
      assert(engine.snapshot().voices<=4);c.advance(.04);
    }
    c.advance(.3);assert.equal(engine.snapshot().voices,0);engine.destroy();assert(c.oscillators.every(o=>o.disconnects===1));
  }
  // A suspended mobile context is resumed once, including effects-only mode.
  {
    const c=new ContextMock();c.state='suspended';c.deferred=true;const engine=new SoundscapeEngine(()=>c.audio());
    engine.configure({music:false});engine.play('tap');engine.unlock();engine.unlock();assert.equal(c.resumeCount,1);assert.equal(engine.snapshot().cueCounts.tap,1,'first contact schedules immediately while the gesture resumes the context');
    c.releaseResume?.();await new Promise<void>(r=>setImmediate(r));assert.equal(engine.snapshot().state,'running');
    engine.pause();assert.equal(engine.snapshot().voices,0);assert.equal(engine.snapshot().state,'suspended');
    engine.resume();assert.equal(c.resumeCount,2);c.releaseResume?.();await new Promise<void>(r=>setImmediate(r));
    c.advance(.15);engine.play('bet');assert.equal(engine.snapshot().voices,2);engine.destroy();
  }
  // Hide + show during the first async resume must recover rather than remain silent.
  {
    const c=new ContextMock();c.state='suspended';c.deferred=true;const engine=new SoundscapeEngine(()=>c.audio());
    engine.configure({music:false});engine.unlock();engine.pause();engine.resume();c.releaseResume?.();
    await new Promise<void>(r=>setImmediate(r));assert.equal(c.state,'running');engine.play('bet');assert.equal(engine.snapshot().voices,2);engine.destroy();
  }
  // Backgrounding while resume is in flight cannot restart a hidden soundtrack.
  {
    const c=new ContextMock();c.state='suspended';c.deferred=true;const engine=new SoundscapeEngine(()=>c.audio());
    engine.unlock();engine.pause();c.releaseResume?.();await new Promise<void>(r=>setImmediate(r));
    assert.equal(c.state,'suspended');assert.equal(engine.snapshot().musicTimer,false);engine.play('win');assert.equal(engine.snapshot().voices,0);engine.destroy();
  }
  {
    const c=new ContextMock(),engine=new SoundscapeEngine(()=>c.audio());engine.unlock();
    for(let i=0;i<120;i++){c.advance(.061);engine.play('epic-win');engine.guardian(i%4);engine.award(i%5);assert(engine.snapshot().voices<=48);}
    engine.setScene('ruby-revel');assert.equal(engine.snapshot().scene,'ruby-revel');
    c.advance(2);engine.pause();assert.equal(engine.snapshot().voices,0);assert.equal(engine.snapshot().musicTimer,false);engine.destroy();
  }
  // Visual-clock scheduling: no full-show prequeue, independent effects, cadence once.
  {
    const c=new ContextMock(),engine=new SoundscapeEngine(()=>c.audio());engine.configure({music:false});
    const show=engine.beginAward(2,5.1);assert(engine.snapshot().awardActive);assert(engine.snapshot().awardVoices<10);
    const first=c.oscillators.length;c.advance(.7);show.update(.7);assert(c.oscillators.length>first);
    for(let t=.8;t<5;t+=.1){c.advance(.1);show.update(t);assert(engine.snapshot().voices<48);}
    assert(engine.snapshot().awardScheduledNotes>30,'real oscillator / percussion scheduling, not just score metadata');show.finish();const afterFinal=c.oscillators.length;show.finish();show.update(5.2);
    assert.equal(c.oscillators.length,afterFinal,'skip/natural reveal must play one cadence only');
    c.advance(1.6);show.stop();assert.equal(engine.snapshot().awardActive,false);assert.equal(engine.snapshot().awardScheduledNotes,0);c.advance(.1);assert.equal(engine.snapshot().awardVoices,0);
    assert(c.oscillators.every(o=>o.disconnects===1),'all music and percussion sources disconnect exactly once');
    const old=engine.beginAward(1,4.1),next=engine.beginAward(4,6.2);old.stop();old.finish();assert(engine.snapshot().awardActive,'stale handles cannot end a newer presentation');
    engine.configure({sound:false});c.advance(.1);assert.equal(engine.snapshot().awardVoices,0);c.advance(2);next.update(2);
    engine.configure({sound:true});next.update(2.1);assert(engine.snapshot().awardVoices<12,'unmuting must not replay missed notes');
    engine.pause();assert.equal(engine.snapshot().voices,0);next.update(3);engine.resume();next.update(3.1);assert(engine.snapshot().voices<20);
    next.stop();engine.destroy();engine.beginAward(2,5);assert.equal(engine.snapshot().awardActive,false,'destroyed mixer cannot begin a show');
  }
  // A one-second frame hitch must skip old count tones, not burst them together.
  {
    const c=new ContextMock(),engine=new SoundscapeEngine(()=>c.audio());engine.configure({music:false});const show=engine.beginAward(4,6.2);
    c.advance(4.5);show.update(4.5);assert(engine.snapshot().awardVoices<12);show.finish();show.stop();c.advance(.2);assert.equal(engine.snapshot().voices,0);engine.destroy();
  }
  // An autoplay/gesture-locked fanfare must never emerge late after its modal closes.
  {
    const c=new ContextMock();c.state='suspended';c.deferred=true;const engine=new SoundscapeEngine(()=>c.audio());engine.configure({music:false});
    const show=engine.beginAward(2,5.1);show.update(3);show.finish();show.stop();assert.equal(c.oscillators.length,0);
    c.releaseResume?.();await new Promise<void>(r=>setImmediate(r));assert.equal(engine.snapshot().voices,0);engine.destroy();
  }
  {
    const c=new ContextMock(),engine=new SoundscapeEngine(()=>c.audio());engine.unlock();
    for(const scene of MUSIC_SCENES){engine.setScene(scene);engine.play('confirm');const show=engine.beginAward(2,5.1);for(let t=0;t<5.2;t+=.1){c.advance(.1);show.update(t);}show.finish();c.advance(1.6);show.stop();}
    assert(c.nodes.filter(n=>n.type==='bandpass').every(n=>n.frequency.value<=2600&&n.Q.value<=.55),'fallback percussion has no exposed highpass hiss');
    assert(VOICE_SHAPES.coin.cutoff<=3000&&VOICE_SHAPES.bell.cutoff<=3000,'coin and bell fallback harmonics remain soft');
    assert(c.periodicWaves.length<=Object.keys(VOICE_SHAPES).length,'one cached spectrum per instrument');assert(c.oscillators.some(o=>o.periodic),'instrument spectra are used by actual mixer');
    engine.destroy();assert.equal(engine.snapshot().voices,0);assert(c.oscillators.every(o=>o.disconnects===1));
  }
  // Persistence and a failed remote save must preserve independent preferences.
  const storage=new MemoryStorage(),save=new SaveService(storage);save.acceptCompliance(TERMS_VERSION,PRIVACY_VERSION);
  const login=await new LocalAuthService(save).guestLogin();assert(login.ok);
  const profile=new PlayerProfileService(save);
  assert(await profile.updateSettings({music:false}));assert.equal(profile.current()?.settings.sound,true);
  assert(await profile.updateSettings({vibration:false}));assert(await profile.updateSettings({sound:false}));
  const restored=new PlayerProfileService(new SaveService(storage));assert.deepEqual(restored.current()?.settings,{...profile.current()!.settings,music:false,sound:false,vibration:false});
  const remote=new PlayerProfileService(save,{updateProfile:async()=>{throw new Error('offline');}});
  assert.equal(await remote.updateSettings({music:true}),false);assert.equal(remote.current()?.settings.music,false);
  console.log('PASS audio: full award score / percussion, visual-clock cadence, skip/mute/background/gesture-lock/stale-lease cleanup; independent settings, persistence/rollback, 5 distinct compositions / tempos, theme timbres and stereo envelopes, cue debounce, bounded hitch recovery, voice cleanup/cap, mobile resume + background races, tactile categories');
};
void main().catch(error=>{console.error(error);process.exitCode=1;});
