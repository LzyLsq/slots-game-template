import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {SoundscapeEngine,SOFT_MIX,SOFT_TONE,CUE_LEVELS,CONTACT_LEVELS,MUSIC_FADES} from '../assets/scripts/audio/SoundscapeEngine';
import {FileRecordingLibrary,type RecordingLibrary} from '../assets/scripts/audio/RecordedAudio';
import {ALL_RECORDINGS,recordingKeys,RECORDING_THEMES,musicKey,musicDuration,awardKey,finaleKey,cueKey,MUSIC_BALANCE,recordedMusicTrim} from '../assets/scripts/audio/SoundtrackCatalog';
import {buttonKey,cabinetFeedbackKey,FEEDBACK_SCENES,CABINET_FEEDBACK,BUTTON_CUES,hasFeatureStep} from '../assets/scripts/audio/FeedbackCatalog';
import {GAME_CONFIGS} from '../assets/scripts/math/GameConfigs';
import {ResultGenerator} from '../assets/scripts/math/ResultGenerator';
import {SeededRNG} from '../assets/scripts/core/SeededRNG';
import type {FeatureRound} from '../assets/scripts/math/types';
import {recordedCueRate} from '../assets/scripts/audio/AudioScore';
import {MUSIC_SCENES} from '../assets/scripts/audio/MusicTheme';
import {awardTiming} from '../assets/scripts/vfx/AwardTimeline';

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
 connect(node:AudioNodeMock){this.connections.push(node);return node;}disconnect(){this.disconnects++;}
}
class SourceMock extends AudioNodeMock {
 playbackRate=new Param();buffer?:AudioBuffer;loop=false;loopStart=0;loopEnd=0;
 end=Infinity;startAt=-1;offset=0;onended?:()=>void;ended=false;
 setPeriodicWave(_wave:unknown){}start(time:number,offset=0){this.startAt=time;this.offset=offset;}stop(time:number){this.end=time;}
}
class ContextMock {
 sampleRate=44100;state='running';currentTime=0;destination=new AudioNodeMock();sources:SourceMock[]=[];oscillators:SourceMock[]=[];nodes:AudioNodeMock[]=[];
 createGain(){const node=new AudioNodeMock();this.nodes.push(node);return node;}createBiquadFilter(){return this.createGain();}createConvolver(){return this.createGain();}
 createDynamicsCompressor(){return this.createGain();}createStereoPanner(){return this.createGain();}createPeriodicWave(){return {};}
 createBuffer(channels:number,size:number,rate:number){const data=Array.from({length:channels},()=>new Float32Array(size));return {duration:size/rate,getChannelData:(i:number)=>data[i]};}
 createBufferSource(){const o=new SourceMock();this.sources.push(o);return o;}
 createOscillator(){const o=new SourceMock();this.oscillators.push(o);return o;}
 async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}
 advance(seconds:number){this.currentTime+=seconds;for(const o of [...this.sources,...this.oscillators])if(!o.ended&&o.end<=this.currentTime){o.ended=true;o.onended?.();}}
 audio(){return this as unknown as AudioContext;}
}
const buffer=(name:string,duration=.6)=>({name,duration}) as unknown as AudioBuffer;
class LibraryMock implements RecordingLibrary {
 buffers=new Map(ALL_RECORDINGS.map(k=>[k,buffer(k,k.startsWith('music-')?musicDuration(k.slice(6)):k==='fx-reel-roll'?1.1:k.endsWith('-reel-roll')?({ 'crown-club':1,'emerald-fortune':1.2,'ruby-royale':1.1,'vault-reserve':1.25 } as Record<string,number>)[FEEDBACK_SCENES.find(scene=>k.includes(scene))!]:6)]));
 cleared=false;get(key:string){return this.buffers.get(key);}async warm(_scene:string,_context?:AudioContext,_ready?:()=>void){}clear(){this.cleared=true;this.buffers.clear();}
}
const recordingKeysForLobby=recordingKeys('lobby').length;
const flush=()=>new Promise<void>(r=>setImmediate(r));
const named=(source:SourceMock)=>(source.buffer as unknown as {name?:string})?.name;
const clipGraph=(source:SourceMock)=>{
 const filter=source.connections[0],gain=filter.connections[0],bus=gain.connections[0];
 return {filter,gain,bus,presence:bus.connections[0],shelf:bus.connections[0].connections[0]};
};
const peakGain=(source:SourceMock)=>Math.max(...clipGraph(source).gain.gain.events.map(e=>e.value));
async function main(){
 // The soft mix must apply to real recordings, every restore path, and all award grades.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();await flush();
  const music=c.sources[0],graph=clipGraph(music);
  assert.equal(music.playbackRate.value,1,'gentler timbre must not slow down or repitch the music');
  assert.equal(peakGain(music),SOFT_MIX.musicClip*recordedMusicTrim('lobby'));assert.equal(graph.bus.gain.value,SOFT_MIX.music);
  assert.equal(graph.filter.frequency.value,SOFT_TONE.music.cutoff);assert.equal(graph.filter.Q.value,.707);
  assert.equal(graph.presence.type,'peaking');assert.equal(graph.presence.frequency.value,2800);assert.equal(graph.presence.gain.value,SOFT_TONE.music.presence);
  assert.equal(graph.shelf.type,'highshelf');assert.equal(graph.shelf.gain.value,SOFT_TONE.music.shelf);
  assert(SOFT_MIX.music<=.56&&SOFT_MIX.musicRoom<=.04,'background stays below cues with a short restrained room send');
  assert(SOFT_TONE.music.cutoff<=8500&&SOFT_TONE.music.presence<=-2.5&&SOFT_TONE.music.shelf<=-5,'warm BGM keeps upper-mid / treble glare restrained without detuning');
  assert(SOFT_MIX.award<=.70&&CUE_LEVELS.tap<=.64&&CUE_LEVELS['epic-win']<=.56,'button and award feedback remains gentle, never boosted to compete with the soundtrack');
  const compressor=c.nodes.find(n=>n.threshold.value<0)!;
  assert.equal(compressor.threshold.value,-16);assert.equal(compressor.ratio.value,4);assert(compressor.release.value>=.2);
  let contactIndex=0;
  for(const cue of Object.keys(CUE_LEVELS) as (keyof typeof CUE_LEVELS)[]){
   c.advance(7);e.play(cue);
   const source=c.sources.findLast(source=>named(source)===cueKey(cue))!,fx=clipGraph(source);
   const press=['tap','bet','navigate','toggle','confirm'].includes(cue);
   assert.equal(peakGain(source),CUE_LEVELS[cue]*(press?CONTACT_LEVELS[contactIndex++%3]:1));
   if(press)assert(fx.gain.gain.events.some(x=>x.time===source.startAt+.003),'physical contact has a 3ms attack, not a faded jingle');assert.equal(source.playbackRate.value,recordedCueRate(cue,'lobby'),'physical contact remains at 1x; only open-fifth currency jingles follow the score key');
   assert.equal(fx.bus.gain.value,SOFT_MIX.effects);assert.equal(fx.filter.frequency.value,SOFT_TONE.effects.cutoff);
   assert.equal(fx.presence.gain.value,SOFT_TONE.effects.presence);assert.equal(fx.shelf.gain.value,SOFT_TONE.effects.shelf);
   if(cue==='spin'){assert.equal(peakGain(c.sources.at(-1)!),SOFT_MIX.spinRoll);e.stopSpin();}
  }
  c.advance(7);e.play('win');assert(graph.bus.gain.events.some(event=>event.value===SOFT_MIX.duck));
  e.configure({music:false});e.configure({music:true});assert.equal(graph.bus.gain.value,SOFT_MIX.music,'rapid toggle during duck recovers to the new quiet level');
  e.setScene('vault-reserve');c.advance(.6);
  for(let tier=0;tier<5;tier++){
   e.play('spin');const roll=c.sources.at(-1)!;
   const show=e.beginAward(tier,awardTiming(tier).countEnd),source=c.sources.at(-1)!,award=clipGraph(source);
   assert(roll.end<=c.currentTime+.11,'mechanical loop fades before the fanfare, not underneath it');
   assert.equal(peakGain(source),tier===0?.34:tier===1?.62:.70);assert.equal(award.bus.gain.value,SOFT_MIX.award);
   assert.equal(award.filter.frequency.value,SOFT_TONE.award.cutoff);assert.equal(award.shelf.gain.value,SOFT_TONE.award.shelf);
   const currentMusic=c.sources.findLast(s=>s.loop&&named(s)===musicKey('vault-reserve'))!;
   assert.equal(clipGraph(currentMusic).bus.gain.value,tier===0?SOFT_MIX.returnDuck:SOFT_MIX.awardDuck);
   const count=c.sources.length;for(const cue of ['win','big-win','epic-win'] as const)e.play(cue);
   assert.equal(c.sources.length,count,'an active performance owns the win sound; no second victory jingle');
   e.configure({music:false});e.configure({music:true});assert.equal(clipGraph(currentMusic).bus.gain.value,tier===0?SOFT_MIX.returnDuck:SOFT_MIX.awardDuck);
   show.finish();assert.equal(peakGain(c.sources.at(-1)!),tier===0?.30:tier===1?.60:.68);
   show.stop();assert.equal(clipGraph(currentMusic).bus.gain.value,SOFT_MIX.music);
   c.advance(7);
  }
  const eq=c.nodes.filter(n=>n.type==='peaking'||n.type==='highshelf');assert.equal(eq.length,6);
  assert(eq.every(n=>n.gain.value<0),'no sharp high-frequency boost on any bus');
  e.destroy();assert(eq.every(n=>n.disconnects===1),'all persistent EQ nodes disconnect on teardown');
 }

 // Attenuation-only scene balance preserves five compositions and their pitch.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();await flush();
  for(const scene of MUSIC_SCENES){
   e.setScene(scene);c.advance(.6);const source=c.sources.findLast(s=>named(s)===musicKey(scene))!;
   const trim=recordedMusicTrim(scene),rms=MUSIC_BALANCE.decodedRmsDb[scene as keyof typeof MUSIC_BALANCE.decodedRmsDb];
   assert(trim>0&&trim<=1,'matching energy must never boost master peaks');
   assert.equal(source.playbackRate.value,1,'balance does not repitch or speed the song');
   assert.equal(peakGain(source),SOFT_MIX.musicClip*trim);assert.equal(e.snapshot().musicTrim,trim);
   assert(Math.abs(rms+20*Math.log10(trim)-MUSIC_BALANCE.targetRmsDb)<.001);
   assert.equal(e.snapshot().musicVoices,1);
  }
  assert.equal(recordedMusicTrim('unknown'),recordedMusicTrim('lobby'));
  assert.equal(recordedMusicTrim('toString'),recordedMusicTrim('lobby'),'inherited keys are not valid tracks');e.destroy();
 }
 // Currency duck follows its real, tuned duration. Replacement, mute, hide and
 // next-spin/scene takeover cannot leave dead tails or stale duck automation.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.setScene('emerald-fortune');e.unlock();await flush();
  lib.buffers.set(cabinetFeedbackKey('emerald-fortune','collect'),buffer('fx-cabinet-emerald-fortune-collect',1.20));lib.buffers.set(cueKey('win'),buffer('fx-win',.49));
  const bus=clipGraph(c.sources[0]).bus;
  e.play('collect');const collect=c.sources.at(-1)!,hold=1.20+.008;
  assert(bus.gain.events.some(x=>Math.abs(x.time-hold)<1e-9&&x.value===SOFT_MIX.duck),'background remains below the entire tuned currency clip');
  assert(bus.gain.events.some(x=>Math.abs(x.time-(hold+.55))<1e-9&&x.value===SOFT_MIX.music),'a gentle recovery follows the actual tail');
  c.advance(.15);e.play('win');assert(collect.end<=c.currentTime+.025);
  const newHold=c.currentTime+.49/recordedCueRate('win','emerald-fortune')+.008;
  assert(bus.gain.events.some(x=>Math.abs(x.time-newHold)<1e-9&&x.value===SOFT_MIX.duck),'short replacement does not inherit long dead-tail duck');
  const win=c.sources.at(-1)!;e.guardian(1);const guardian=c.sources.at(-1)!;e.play('spin');
  assert(win.end<=c.currentTime+.025&&guardian.end<=c.currentTime+.025);
  assert.equal(e.snapshot().celebrationVoices,0);assert.equal(e.snapshot().guardianVoices,0);assert.equal(e.snapshot().musicLevel,SOFT_MIX.music);
  e.stopSpin();c.advance(.2);e.play('collect');e.configure({sound:false});
  assert.equal(e.snapshot().musicLevel,SOFT_MIX.music,'muting an effect releases its duck immediately');
  assert.equal(bus.gain.events.at(-1)!.time,c.currentTime+.18,'mute recovery cancels the old future automation');
  c.advance(.2);e.configure({sound:true});e.play('collect');e.pause();
  assert.equal(bus.gain.events.at(-1)!.value,SOFT_MIX.music);assert(bus.gain.events.every(x=>x.time<=c.currentTime));
  e.resume();await flush();assert.equal(e.snapshot().musicLevel,SOFT_MIX.music);
  c.advance(.2);e.play('collect');const oldTune=c.sources.at(-1)!;e.guardian(2);const oldGuardian=c.sources.at(-1)!;
  e.setScene('ruby-royale');assert(oldTune.end<=c.currentTime+.025&&oldGuardian.end<=c.currentTime+.025);
  assert.equal(e.snapshot().celebrationVoices,0);assert.equal(e.snapshot().guardianVoices,0);
  c.advance(.6);assert.equal(e.snapshot().voices,1,'only the new background remains after scene takeover');e.destroy();
 }

 // Musical clarity: short character contacts, exclusive success lane, silent BGM
 // during a jackpot, and no overlapping different-key music on rapid navigation.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();await flush();
  const lobby=c.sources[0];e.setScene('crown-club');const caravan=c.sources.at(-1)!;
  assert(caravan.startAt>=lobby.end,'new key starts after old score has faded');
  c.advance(.06);e.setScene('emerald-fortune');const oasis=c.sources.at(-1)!;
  assert(oasis.startAt>=caravan.end,'rapid switch cancels the pending previous key');
  c.advance(.3);e.guardian(3);const contact=c.sources.at(-1)!;
  assert.equal(named(contact),'fx-toggle-v1','an off-scene guardian uses its prewarmed material contact, not a foreign-key award');
  assert.equal(contact.playbackRate.value,1,'guardian contacts retain their original recording speed');
  assert.equal(peakGain(contact),.31,'guardian touches stay below the main button and win accents');
  assert.equal(e.snapshot().guardianVoices,1);
  const before=c.sources.length;for(let i=0;i<10;i++){c.advance(.03);e.guardian(i%4);}
  assert.equal(c.sources.length,before,'repeat character taps do not build a chorus');
  c.advance(.5);e.guardian(0);assert.equal(e.snapshot().guardianVoices,1);assert(contact.end<=c.currentTime+.026);
  e.award(0);const sting=c.sources.at(-1)!;
  assert.equal(sting.playbackRate.value,recordedCueRate('win','emerald-fortune'),'feature acknowledgement matches the active key');
  assert.equal(e.snapshot().celebrationVoices,1);c.advance(.7);e.play('reward');assert(sting.end<=c.currentTime+.026);
  assert.equal(e.snapshot().celebrationVoices,1);c.advance(.7);e.play('collect');assert.equal(e.snapshot().celebrationVoices,1);
  const show=e.beginAward(2,awardTiming(2).countEnd),count=c.sources.length;
  for(const cue of ['win','big-win','epic-win','reward','collect'] as const)e.play(cue);
  e.guardian(2);e.award(4);assert.equal(c.sources.length,count,'full presentation suppresses extra character/feature/reward tunes');
  assert.equal(e.snapshot().musicLevel,0,'jackpot score owns the musical stage, not two unsynchronized melodies');
  show.finish();show.stop();assert.equal(e.snapshot().musicLevel,SOFT_MIX.music);
  e.configure({sound:false});const muted=c.sources.length;e.guardian(1);e.award(1);assert.equal(c.sources.length,muted);
  e.pause();c.advance(.1);assert.equal(e.snapshot().voices,0);e.destroy();
 }

 // Four cabinet guardians use scene-local treasury contacts. The lobby uses
 // four distinct prewarmed material cues, with no cross-scene decoding on touch.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();await flush();
  for(const [theme,scene] of FEEDBACK_SCENES.entries()){
   e.setScene(scene);await flush();c.advance(.8);e.guardian(theme);
   const touch=c.sources.at(-1)!;
   assert.equal(named(touch),cabinetFeedbackKey(scene,'collect'));
   assert(recordingKeys(scene).includes(named(touch)!),'touch asset must already be warmed for the visible cabinet');
   assert.equal(touch.playbackRate.value,1);assert.equal(peakGain(touch),.31);
   assert.equal(touch.startAt,c.currentTime+.008,'guardian contact has no file/decode wait');
   assert.equal(e.snapshot().guardianVoices,1);
  }
  e.setScene('lobby');await flush();
  for(const [theme,key] of ['fx-collect','fx-confirm-v1','fx-bet-v2','fx-toggle-v1'].entries()){
   c.advance(.8);e.guardian(theme);const touch=c.sources.at(-1)!;
   assert.equal(named(touch),key);assert(recordingKeys('lobby').includes(key));
   assert.equal(touch.playbackRate.value,1);assert.equal(e.snapshot().guardianVoices,1);
  }
  e.destroy();
 }

 // Button contact is immediate, recorded and clear without sharpening the EQ.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();await flush();
  const music=clipGraph(c.sources[0]),gate=music.shelf.connections[0];
  assert.equal(gate.gain.value,1);assert(SOFT_MIX.pressDuck>=.9,'button contacts do not rhythmically pump the whole soundtrack');
  e.play('tap');assert.equal(e.snapshot().cuePlays,1);assert.equal(e.snapshot().lastCueSource,'fx-tap');
  assert.equal(c.sources.at(-1)!.startAt,c.currentTime+.008,'no async file/decode wait on button contact');
  assert(gate.gain.events.some(x=>x.value===SOFT_MIX.pressDuck&&x.time===c.currentTime+.012));
  assert(gate.gain.events.some(x=>x.value===1&&x.time===c.currentTime+.18),'background recovers in 180 ms');
  assert.equal(music.bus.gain.value,SOFT_MIX.music,'press gate does not overwrite the main victory duck');
  const gated=gate.gain.events.length;e.play('tap');assert.equal(e.snapshot().cuePlays,1);assert.equal(gate.gain.events.length,gated);
  c.advance(.08);e.play('tap');assert.equal(e.snapshot().cueCounts.tap,2,'normal repeated contacts must not be swallowed');
  for(const cue of ['bet','navigate','toggle','confirm'] as const){c.advance(.08);e.play(cue);assert.equal(e.snapshot().lastPlayedCue,cue);assert.equal(e.snapshot().lastCueSource,cueKey(cue));assert(CUE_LEVELS[cue]>=.55&&CUE_LEVELS[cue]<=.72);}
  const copy=e.snapshot().cueCounts;copy.tap=999;assert.equal(e.snapshot().cueCounts.tap,2,'read-only snapshot has no mutable engine references');
  e.pause();assert.equal(gate.gain.events.at(-1)!.value,1);assert(gate.gain.events.every(x=>x.time<=c.currentTime),'no stale press duck after backgrounding');e.resume();
  c.advance(.1);e.configure({sound:false});const muted=e.snapshot().cuePlays;e.play('bet');assert.equal(e.snapshot().cuePlays,muted);
  e.configure({sound:true,music:false});c.advance(.1);const prior=gate.gain.events.length;e.play('confirm');assert.equal(e.snapshot().cuePlays,muted+1);assert.equal(gate.gain.events.length,prior,'effects-only mode does not schedule music fades');
  e.configure({music:true});c.advance(.1);e.play('tap');e.beginAward(2,5.1);assert.equal(gate.gain.events.at(-1)!.value,1,'award owns its duck, never a stale button gate');
  e.destroy();assert.equal(gate.disconnects,1);
 }

 // Phrase continuity: each scene retains a cursor, paused time does not advance it,
 // and a source cancelled before its scheduled start must retain its old offset.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);
  e.unlock();await flush();const opening=c.sources.at(-1)!;
  c.advance(4.5);const lobbyCursor=e.snapshot().musicPosition;
  assert(Math.abs(lobbyCursor-(c.currentTime-opening.startAt))<1e-9);
  e.setScene('crown-club');const caravan=c.sources.at(-1)!;assert.equal(caravan.offset,0);
  assert(caravan.startAt>=opening.end,'no simultaneous different-key phrase');
  c.advance(2);const gameCursor=e.snapshot().musicPosition;e.setScene('lobby');
  const lobby=c.sources.at(-1)!;assert.equal(lobby.offset,lobbyCursor,'return to lobby continues the phrase');
  c.advance(1);const beforeMute=e.snapshot().musicPosition;e.configure({music:false});
  c.advance(10);assert.equal(e.snapshot().musicPosition,beforeMute,'disabled music does not silently advance');
  e.configure({music:true});const restored=c.sources.at(-1)!;
  assert.equal(restored.offset,beforeMute);assert.equal(restored.playbackRate.value,1);
  c.advance(.5);const beforeHide=e.snapshot().musicPosition;e.pause();c.advance(20);
  assert.equal(e.snapshot().musicPosition,beforeHide,'hidden time does not advance the music cursor');
  e.resume();await flush();assert.equal(c.sources.at(-1)!.offset,beforeHide);
  c.advance(.4);e.setScene('crown-club');const pending=c.sources.at(-1)!;
  assert.equal(pending.offset,gameCursor);assert(pending.startAt>c.currentTime);
  e.setScene('emerald-fortune');e.setScene('crown-club');const restoredPending=c.sources.at(-1)!;
  assert.equal(restoredPending.offset,gameCursor,'cancelled pre-start source cannot advance or erase the phrase');
  assert(restoredPending.startAt>=pending.end);
  c.advance(musicDuration('crown-club')*2+1.1);
  const loopCursor=e.snapshot().musicPosition;assert(loopCursor>=0&&loopCursor<musicDuration('crown-club'));
  e.configure({music:false});e.configure({music:true});assert.equal(c.sources.at(-1)!.offset,loopCursor,'resume offset wraps inside the exact loop');
  c.advance(.4);assert.equal(e.snapshot().musicVoices,1);e.destroy();
  assert(c.sources.every(source=>source.disconnects===1),'pending and loop sources are reclaimed exactly once');
 }
 // Main -> same-key finale -> BGM uses bounded musical releases, not hard cuts.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();await flush();
  const music=clipGraph(c.sources[0]);const show=e.beginAward(2,awardTiming(2).countEnd),main=c.sources.at(-1)!;
  c.advance(2);show.update(2);show.finish();const finale=c.sources.at(-1)!;
  assert.equal(main.end,c.currentTime+MUSIC_FADES.finaleOut);
  assert(clipGraph(finale).gain.gain.events.some(x=>x.time===finale.startAt+MUSIC_FADES.finaleIn));
  c.advance(MUSIC_FADES.finaleOut+.001);assert.equal(main.disconnects,1);assert.equal(e.snapshot().awardVoices,1);
  show.stop();assert.equal(finale.end,c.currentTime+MUSIC_FADES.awardOut);
  assert(music.bus.gain.events.some(x=>x.value===SOFT_MIX.music&&x.time===c.currentTime+MUSIC_FADES.musicReturn));
  c.advance(MUSIC_FADES.awardOut+.001);assert.equal(e.snapshot().awardVoices,0);assert.equal(finale.disconnects,1);
  e.destroy();assert.equal(e.snapshot().voices,0);
 }
 // Preparatory decode is silent even where the browser creates a running context.
 {
  const c=new ContextMock(),lib=new LibraryMock();let warmed=false;
  lib.warm=async(_scene,_context,ready)=>{warmed=true;ready?.();};
  const e=new SoundscapeEngine(()=>c.audio(),lib);e.prepare();await flush();
  assert(warmed);assert.equal(e.snapshot().voices,0);assert.equal(c.sources.length,0,'preloading must not autoplay');
  e.play('bet');assert.equal(e.snapshot().lastCueSource,'fx-bet','first gesture uses predecoded physical recording');
  assert(e.snapshot().recordedMusic);e.destroy();
 }
 // Effects preload for a new cabinet even when background music is disabled.
 {
  const c=new ContextMock(),lib=new LibraryMock(),scenes:string[]=[];lib.warm=async(scene)=>{scenes.push(scene);};
  const e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});e.prepare();await flush();
  e.setScene('emerald-fortune');await flush();assert(scenes.includes('emerald-fortune'));assert.equal(c.sources.length,0);
  e.play('tap');assert.equal(e.snapshot().lastCueSource,'fx-tap');assert.equal(e.snapshot().musicVoices,0);e.destroy();
 }
 // Rapid mixed contacts own one lane, including unrealistically long mock tails.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});
  let prior:SourceMock|undefined;
  for(let i=0;i<40;i++){
   const cue=(['tap','bet','navigate','toggle','confirm'] as const)[i%5];e.play(cue);
   const current=c.sources.at(-1)!;assert.equal(named(current),buttonKey(cue,Math.floor(i/5)%3));
   if(prior)assert(prior.end<=c.currentTime+.012,'old contact fades out instead of layering');
   assert.equal(e.snapshot().pressVoices,1);assert(e.snapshot().voices<=2,'one contact plus its short outgoing fade');
   prior=current;if(i<39)c.advance(.035);
  }
  assert.equal(e.snapshot().cuePlays,40,'fast valid contacts still receive feedback');
  const count=e.snapshot().cuePlays;c.advance(.005);e.play('tap');
  assert.equal(e.snapshot().cuePlays,count,'one physical event cannot double-trigger two cue families');
  c.advance(7);assert.equal(e.snapshot().voices,0);e.destroy();assert(c.sources.every(s=>s.disconnects===1));
 }
 // Only currency melodies are tuned. Backgrounds, award scores and contacts stay 1x.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});
  for(const scene of MUSIC_SCENES){
   e.setScene(scene);c.advance(7);
   for(const cue of ['tap','bet','navigate','toggle','confirm','spin','reel-stop','error','win','reward','collect','big-win','epic-win'] as const){
    e.play(cue);const source=c.sources.findLast(s=>named(s)===e.snapshot().lastCueSource)!;
    const rate=named(source)?.startsWith('fx-cabinet-')?1:recordedCueRate(cue,scene);
    assert.equal(source.playbackRate.value,rate);
    assert.equal(e.snapshot().lastCueRate,rate);c.advance(7);
   }
   const show=e.beginAward(0,awardTiming(0).countEnd,false);show.finish();show.stop();c.advance(7);
  }
  e.destroy();
 }
 // The real browser's primary path uses a single decoded source per recording.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();await flush();
  assert.equal(e.snapshot().recordedMusic,true);assert.equal(e.snapshot().musicTimer,false);assert.equal(c.oscillators.length,0);
  assert.equal(c.sources.filter(s=>s.loop).length,1);assert.equal(c.sources[0].loopEnd,musicDuration('lobby'));
  e.unlock();await flush();assert.equal(c.sources.length,1,'warm/repeated gestures do not duplicate background loops');
  e.setScene('vault-reserve');await flush();assert.equal(e.snapshot().musicTrack,musicKey('vault-reserve'));c.advance(.55);
  assert.equal(e.snapshot().voices,1);assert(c.sources[0].disconnects===1,'previous track crossfades and disconnects');
  e.configure({music:false});e.configure({music:true});c.advance(.2);assert.equal(e.snapshot().recordedMusic,true,'fast off/on cannot reuse an already stopped background');
  assert.equal(e.snapshot().voices,1);
  e.play('tap');const tap=c.sources.at(-1)!;assert.equal(named(tap),cueKey('tap'));assert.equal(e.snapshot().voices,2);
  e.configure({sound:false});c.advance(.1);assert.equal(e.snapshot().recordedMusic,true);assert.equal(tap.disconnects,1);
  e.configure({music:false,sound:true});c.advance(.2);e.play('bet');assert.equal(e.snapshot().recordedMusic,false);assert.equal(named(c.sources.at(-1)!),cueKey('bet'));
  c.advance(7);assert.equal(e.snapshot().voices,0);e.configure({music:true});
  e.play('spin');assert.equal(named(c.sources.at(-1)!),'fx-cabinet-vault-reserve-reel-roll');assert(c.sources.at(-1)!.loop);
  e.stopSpin();c.advance(7);assert.equal(e.snapshot().voices,1,'roll is gone after landing; only background remains');
  e.pause();assert.equal(e.snapshot().voices,0);e.resume();await flush();assert(e.snapshot().recordedMusic);
  e.destroy();assert(lib.cleared);assert.equal(e.snapshot().voices,0);assert(c.sources.every(s=>s.disconnects===1));
 }
 // Each award grade resolves exactly once; stale leases and hidden/muted clocks stay silent.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});e.setScene('emerald-fortune');
  for(let tier=0;tier<5;tier++){
   const show=e.beginAward(tier,awardTiming(tier).countEnd,tier>0);assert(e.snapshot().recordedAward);assert.equal(e.snapshot().awardVoices,1);
   assert.equal(named(c.sources.at(-1)!),awardKey('emerald-fortune',tier));assert.equal(c.sources.at(-1)!.playbackRate.value,1);
   const count=c.sources.length;for(let t=.1;t<3;t+=.1){c.advance(.1);show.update(t);}
   assert.equal(c.sources.length,count,'one score recording, no per-frame count oscillator pileup');assert.equal(c.oscillators.length,0);
   show.finish();assert.equal(named(c.sources.at(-1)!),finaleKey('emerald-fortune',tier));show.finish();assert.equal(c.sources.length,count+1);
   c.advance(7);show.stop();assert.equal(e.snapshot().awardVoices,0);
  }
  const old=e.beginAward(1,4.1),next=e.beginAward(2,5.1);old.stop();old.finish();assert(e.snapshot().awardActive);c.advance(.1);
  e.configure({sound:false});c.advance(.1);assert.equal(e.snapshot().awardVoices,0);next.update(2);e.configure({sound:true});next.update(2.1);
  assert.equal(e.snapshot().awardVoices,0,'unmute must not restart a complete performance halfway through');
  next.finish();c.advance(.1);assert.equal(e.snapshot().awardVoices,1);e.pause();assert.equal(e.snapshot().voices,0);next.stop();e.destroy();
 }
 // A main score that arrives late must never interrupt an in-progress fallback.
 {
  const c=new ContextMock(),lib=new LibraryMock();lib.buffers.delete(awardKey('vault-reserve',2));const e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});e.setScene('vault-reserve');
  const show=e.beginAward(2,5.1);assert(!e.snapshot().recordedAward);c.advance(.5);show.update(.5);
  lib.buffers.set(awardKey('vault-reserve',2),buffer('late'));show.update(.6);assert(!e.snapshot().recordedAward);assert(!c.sources.some(s=>named(s)==='late'));
  show.stop();e.destroy();
 }
 // Older scene load callbacks cannot revive old music or play after destroy/backgrounding.
 {
  const c=new ContextMock(),lib=new LibraryMock();lib.buffers.clear();let release:()=>void=()=>{};
  lib.warm=async(scene,_context,ready)=>{await new Promise<void>(r=>release=r);lib.buffers.set(musicKey(scene),buffer(musicKey(scene),musicDuration(scene)));ready?.();};
  const e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();const old=release;e.setScene('emerald-fortune');old();await flush();
  assert(!e.snapshot().recordedMusic,'old scene callback ignored');e.pause();release();await flush();assert.equal(e.snapshot().voices,0);assert(!e.snapshot().recordedMusic);e.destroy();
 }
 // File loader: deduplicated fetch/decode, bounded memory, retry and generation-safe clear.
 {
  const requests=new Map<string,number>();let fail=true,decodes=0;const read=(async(url:unknown)=>{const key=String(url).split('/').pop()!.slice(0,-4);requests.set(key,(requests.get(key)??0)+1);return {ok:!(key==='fx-tap'&&fail),arrayBuffer:async()=>new TextEncoder().encode(key).buffer};}) as typeof fetch;
  const context={decodeAudioData:async(data:ArrayBuffer)=>{decodes++;return buffer(new TextDecoder().decode(data));}} as unknown as AudioContext;
  const lib=new FileRecordingLibrary('https://local.invalid/audio/',read);let musicReady=0;
  await Promise.all([lib.warm('lobby',context,()=>musicReady++),lib.warm('lobby',context)]);assert.equal(requests.get('music-lobby'),1);assert.equal(decodes,recordingKeysForLobby-1);assert.equal(musicReady,1);assert(!lib.get('fx-tap'));
  fail=false;await lib.warm('lobby',context);assert(lib.get('fx-tap'));assert.equal(requests.get('fx-tap'),2);
  for(const scene of MUSIC_SCENES.slice(1))await lib.warm(scene,context);
  assert.equal(MUSIC_SCENES.filter(s=>lib.get(musicKey(s))).length,2);assert(lib.get(musicKey('vault-reserve')));assert(!lib.get(awardKey('emerald-fortune',1)));assert(lib.get(awardKey('vault-reserve',1)));
  for(const scene of FEEDBACK_SCENES)for(const role of CABINET_FEEDBACK)assert.equal(!!lib.get(cabinetFeedbackKey(scene,role)),scene==='vault-reserve','cache contains only active cabinet material bank');
  const before=decodes;await lib.warm('vault-reserve',context);assert.equal(decodes,before);lib.clear();assert(!lib.get(musicKey('vault-reserve')));
 }
 {
  const releases:Array<()=>void>=[];let calls=0;const read=(async()=>{await new Promise<void>(r=>releases.push(r));return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}) as typeof fetch;
  const lib=new FileRecordingLibrary('',read),context={decodeAudioData:async()=>{calls++;return buffer('disposed');}} as unknown as AudioContext;
  const task=lib.warm('lobby',context);assert.equal(releases.length,3);lib.clear();for(const release of releases)release();await task;
  assert.equal(calls,0);assert(!lib.get('music-lobby'));assert.equal(lib.diagnostics().decoded,0);
 }
 // Real multisample contacts: per-family rotation, no detuning, no network wait.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});
  for(const cue of BUTTON_CUES){
   for(let i=0;i<7;i++){
    c.advance(.1);e.play(cue);const source=c.sources.at(-1)!;
    assert.equal(named(source),buttonKey(cue,i%3));assert.equal(source.playbackRate.value,1);
    assert.equal(source.startAt,c.currentTime+.008);
    const played=e.snapshot().cuePlays;e.play(cue);assert.equal(e.snapshot().cuePlays,played,'debounced duplicate does not advance sample');
    e.configure({sound:false});c.advance(.1);e.play(cue);e.configure({sound:true});
    e.pause();e.play(cue);e.resume();await flush();
   }
  }
  c.advance(.2);lib.buffers.delete('fx-confirm-v1');e.play('confirm');assert.equal(e.snapshot().lastCueSource,'fx-confirm','missing variant immediately uses recorded base');
  c.advance(.1);lib.buffers.delete('fx-confirm-v2');lib.buffers.delete('fx-confirm');e.play('confirm');assert.equal(e.snapshot().lastCueSource,'fallback','missing base still gets immediate physical fallback');
  e.destroy();
 }
 // Cabinet motors/landings/treasury are genuinely scene-specific, 1x and leased.
 for(const scene of FEEDBACK_SCENES){
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});e.setScene(scene);
  e.play('spin');const roll=c.sources.at(-1)!,pickup=c.sources.at(-2)!;
  assert.equal(named(pickup),cabinetFeedbackKey(scene,'spin'));assert.equal(named(roll),cabinetFeedbackKey(scene,'reel-roll'));assert.equal(roll.playbackRate.value,1);
  assert.equal(roll.loopEnd,lib.get(cabinetFeedbackKey(scene,'reel-roll'))!.duration,'bearing loop uses actual decoded end');
  c.advance(.2);e.play('reel-stop');assert.equal(named(c.sources.at(-1)!),cabinetFeedbackKey(scene,'reel-stop'));e.stopSpin();assert(roll.end<=c.currentTime+.11);
  c.advance(.2);e.play('collect');assert.equal(named(c.sources.at(-1)!),cabinetFeedbackKey(scene,'collect'));assert.equal(c.sources.at(-1)!.playbackRate.value,1);
  c.advance(.7);lib.buffers.delete(cabinetFeedbackKey(scene,'spin'));lib.buffers.delete(cabinetFeedbackKey(scene,'reel-roll'));lib.buffers.delete(cabinetFeedbackKey(scene,'reel-stop'));lib.buffers.delete(cabinetFeedbackKey(scene,'collect'));
  e.play('spin');assert.equal(named(c.sources.at(-2)!),'fx-spin');assert.equal(named(c.sources.at(-1)!),'fx-reel-roll');e.stopSpin();
  c.advance(.2);e.play('reel-stop');assert.equal(named(c.sources.at(-1)!),'fx-reel-stop');
  c.advance(.2);e.play('collect');assert.equal(named(c.sources.at(-1)!),'fx-collect');assert.equal(c.sources.at(-1)!.playbackRate.value,recordedCueRate('collect',scene));e.destroy();
 }
 // Only actions present in the authoritative feature result emit an accent.
 {
  const round=(patch:Partial<FeatureRound>):FeatureRound=>({index:1,grid:['W','a','a'],wins:[],credits:0,...patch});
  assert(hasFeatureStep('crown-club',round({motion:'transform',focus:[0]}),'W'));
  assert(!hasFeatureStep('crown-club',round({motion:'transform',focus:[]}),'W'));
  assert(hasFeatureStep('emerald-fortune',round({motion:'respin',grid:['a','a','a']}),'W'),'each actual free spin gets its local accent');
  assert(!hasFeatureStep('emerald-fortune',round({motion:'transform'}),'W'));
  assert(hasFeatureStep('ruby-royale',round({motion:'transform',focus:[1]}),'W'));
  assert(!hasFeatureStep('ruby-royale',round({motion:'transform',focus:[]}),'W'));
  assert(hasFeatureStep('vault-reserve',round({motion:'respin',focus:[1]}),'W'));
  assert(!hasFeatureStep('vault-reserve',round({motion:'respin',focus:[]}),'W'),'only newly locked coins get an accent');
  assert(!hasFeatureStep('lobby',round({motion:'drop',removed:[1]}),'W'));
  const app=fs.readFileSync(new URL('../assets/scripts/ui/AureliaApp.ts',import.meta.url),'utf8');
  assert(app.includes("if(feature.rounds.length&&isFeedbackScene(this.config.id)){this.audio.playFeature('entry')"));
  assert(app.includes('hasFeatureStep(this.config.id,round,this.config.wildId)'));
  assert(app.includes('finally{this.audio.stopSpin();}'),'cell respins have no normal stop callback; always release bearing');
 }
 // Verify the event selector against real settled F38 results, not old feature names.
 {
  const gen=new ResultGenerator(),evidence:unknown[]=[];
  for(const [i,config] of GAME_CONFIGS.entries()){
   const rng=new SeededRNG(370041+i);let sampled=0,features=0,actions=0;
   for(;sampled<800&&(!features||!actions);sampled++){
    const result=gen.generate(config,config.bets[1],rng),feature=result.featureResult;
    if(!feature)continue;assert.equal(feature.type,'cabinet-feature');features++;
    for(const round of feature.rounds){
     const accent=hasFeatureStep(config.id,round,config.wildId);if(accent)actions++;
     if(config.id==='emerald-fortune')assert.equal(accent,round.motion==='respin');
     if(config.id==='ruby-royale'&&round.motion==='respin')assert(!accent,'mystery free board is not yet revealed');
    }
   }
   assert(features>0&&actions>0,'actual '+config.id+' feature and action sampled');
   evidence.push({scene:config.id,sampled,features,actions,seed:370041+i});
  }
  fs.writeFileSync(new URL('../docs/qa/feedback-completion-features.json',import.meta.url),JSON.stringify({source:'Unmodified authoritative generator / settled rounds; no live wallet changes',cabinets:evidence},null,2)+'\n');
 }
 // One feature lane, immediate fallback, no extra fanfare underneath a jackpot.
 for(const scene of FEEDBACK_SCENES){
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});e.setScene(scene);
  e.feature('entry');assert.equal(e.snapshot().lastFeatureSource,cabinetFeedbackKey(scene,'feature-entry'));assert.equal(e.snapshot().featurePlays,1);
  const entry=c.sources.at(-1)!;e.feature('step');assert.equal(e.snapshot().featurePlays,1,'duplicate action cooldown');
  c.advance(.2);e.feature('step');assert(entry.end<=c.currentTime+.025);assert.equal(e.snapshot().featureVoices,1);assert.equal(e.snapshot().lastFeatureSource,cabinetFeedbackKey(scene,'feature-step'));
  const show=e.beginAward(2,awardTiming(2).countEnd);const count=e.snapshot().featurePlays;e.feature('entry');assert.equal(e.snapshot().featurePlays,count);assert.equal(e.snapshot().featureVoices,0);show.stop();
  c.advance(.2);e.configure({sound:false});e.feature('entry');assert.equal(e.snapshot().featurePlays,count);e.configure({sound:true});
  e.feature('entry');e.pause();assert.equal(e.snapshot().featureVoices,0);e.feature('step');e.resume();await flush();
  c.advance(.2);e.feature('step');e.play('spin');assert.equal(e.snapshot().featureVoices,0);e.stopSpin();
  c.advance(.2);e.feature('entry');e.setScene('lobby');assert.equal(e.snapshot().featureVoices,0);const last=e.snapshot().featurePlays;e.feature('entry');assert.equal(e.snapshot().featurePlays,last);
  e.setScene(scene);c.advance(.2);lib.buffers.delete(cabinetFeedbackKey(scene,'feature-step'));e.feature('step');assert.equal(e.snapshot().lastFeatureSource,'fx-reel-stop');assert.equal(e.snapshot().featureVoices,1);
  c.advance(.2);lib.buffers.delete('fx-reel-stop');e.feature('step');assert.equal(e.snapshot().lastFeatureSource,'fallback');assert.equal(e.snapshot().featureVoices,1);e.destroy();assert.equal(e.snapshot().voices,0);
 }
 // Rapid cabinet loading must not retain a stale feature or motor bank.
 {
  let releaseOld:()=>void=()=>{};let active=0,maxActive=0;
  const read=(async(url:unknown)=>{const key=String(url).split('/').pop()!.slice(0,-4);active++;maxActive=Math.max(active,maxActive);
   if(key==='fx-cabinet-crown-club-spin')await new Promise<void>(r=>releaseOld=r);
   active--;return {ok:true,arrayBuffer:async()=>new TextEncoder().encode(key).buffer};}) as typeof fetch;
  const context={decodeAudioData:async(data:ArrayBuffer)=>buffer(new TextDecoder().decode(data))} as unknown as AudioContext;
  const lib=new FileRecordingLibrary('',read);await lib.warm('lobby',context);const old=lib.warm('crown-club',context);await flush();
  await lib.warm('emerald-fortune',context);releaseOld();await old;
  for(const role of CABINET_FEEDBACK){assert(!lib.get(cabinetFeedbackKey('crown-club',role)));assert(lib.get(cabinetFeedbackKey('emerald-fortune',role)));}
  assert(!lib.get(awardKey('crown-club',0)));assert(lib.get(awardKey('emerald-fortune',0)));
  assert(MUSIC_SCENES.filter(scene=>lib.get(musicKey(scene))).length<=2);lib.clear();
  // One global limiter across old and new scene calls.
  assert(maxActive<=3);
 }
 // Cocos's production transpiler does not expand Map/Set iterator spreads.
 // Array.from is required here; Node-only tests otherwise miss this browser failure.
 const audioSource=(file:string)=>fs.readFileSync(new URL('../assets/scripts/audio/'+file,import.meta.url),'utf8');
 assert(!audioSource('RecordedAudio.ts').includes('[...this.buffers.keys()]'),'Map keys must use Array.from in web-mobile');
 assert(!audioSource('SoundscapeEngine.ts').includes('[...this.voices]'),'voice Set must use Array.from in web-mobile');
 assert(!/ALL_RECORDINGS\s*=\s*\[\s*\.\.\./.test(audioSource('SoundtrackCatalog.ts')),'catalog Set must use Array.from in web-mobile');
 // All catalog assets are shipped; distinct music/grade files are not renamed copies.
 const dir=new URL('../build-templates/web-mobile/audio/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
 assert.equal(ALL_RECORDINGS.length,93);assert.deepEqual(manifest.recordings.map((r:{name:string})=>r.name).sort(),[...ALL_RECORDINGS].sort());
 assert.equal(fs.readdirSync(dir).filter(f=>f.endsWith('.m4a')).length,93);const hashes=new Set<string>();
 for(const r of manifest.recordings){const data=fs.readFileSync(new URL(r.name+'.m4a',dir));assert.equal(data.length,r.bytes);assert(data.length>1000);assert(r.rmsDb>-55&&r.peakDb<-.9);assert(r.seconds>.09);hashes.add(crypto.createHash('sha256').update(data).digest('hex'));}
 for(const name of ['tap','bet','toggle','navigate','confirm']){
  for(const variant of [0,1,2]){const item=manifest.recordings.find((r:{name:string})=>r.name===buttonKey(name as 'tap',variant));
  assert(item.seconds<=.20,'physical button tails are short, not success fanfares');}
 }
 for(const scene of MUSIC_SCENES){
  const item=manifest.recordings.find((r:{name:string})=>r.name===musicKey(scene));
  assert(Math.abs(item.rmsDb-MUSIC_BALANCE.decodedRmsDb[scene as keyof typeof MUSIC_BALANCE.decodedRmsDb])<=.02,'balance metadata tracks the shipped masters');
 }
 const measured=JSON.parse(fs.readFileSync(new URL('../docs/qa/audio-assets.json',import.meta.url),'utf8'));
 for(const item of measured.tracks){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(item.name+'.m4a',dir))).digest('hex'),item.sha256,'technical QA matches the shipped F38 masters');}
 assert(SOFT_MIX.returnDuck>SOFT_MIX.awardDuck,'small returns do not hush the background like a jackpot');
 assert.equal(hashes.size,93,'every cue and performance has a distinct actual AAC payload');
 assert.equal(new Set(Object.values(RECORDING_THEMES).map(t=>t.programs.join(','))).size,5,'independent instrument ensembles');
 console.log('PASS recorded audio: five scene energy trims, real-duration currency duck, scene/spin/mute/background tail cleanup; restrained EQ/gains, quiet duck/toggle recovery, no overlapping fanfare, mixer cleanup; 93 original F38 score/material/feature recordings; true per-family multisample contacts; authoritative feature event selection; shared three-job loader and stale cabinet bank eviction; decoded-source playback, loops/crossfade, fast toggle, effects/music independence, spin cleanup, five grades + one finale, stale/late/hidden handling, loading dedup/retry/cache/dispose');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
