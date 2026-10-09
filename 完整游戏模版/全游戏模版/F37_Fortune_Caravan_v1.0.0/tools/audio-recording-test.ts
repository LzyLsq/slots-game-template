import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {SoundscapeEngine,SOFT_MIX,SOFT_TONE,CUE_LEVELS} from '../assets/scripts/audio/SoundscapeEngine';
import {FileRecordingLibrary,type RecordingLibrary} from '../assets/scripts/audio/RecordedAudio';
import {ALL_RECORDINGS,RECORDING_THEMES,musicKey,musicDuration,awardKey,finaleKey,cueKey} from '../assets/scripts/audio/SoundtrackCatalog';
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
 end=Infinity;startAt=-1;onended?:()=>void;ended=false;
 setPeriodicWave(_wave:unknown){}start(time:number){this.startAt=time;}stop(time:number){this.end=time;}
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
 buffers=new Map(ALL_RECORDINGS.map(k=>[k,buffer(k,k.startsWith('music-')?musicDuration(k.slice(6)):k==='fx-reel-roll'?1.1:6)]));
 cleared=false;get(key:string){return this.buffers.get(key);}async warm(_scene:string,_context?:AudioContext,_ready?:()=>void){}clear(){this.cleared=true;this.buffers.clear();}
}
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
  assert.equal(peakGain(music),SOFT_MIX.musicClip);assert.equal(graph.bus.gain.value,SOFT_MIX.music);
  assert.equal(graph.filter.frequency.value,SOFT_TONE.music.cutoff);assert.equal(graph.filter.Q.value,.707);
  assert.equal(graph.presence.type,'peaking');assert.equal(graph.presence.frequency.value,2800);assert.equal(graph.presence.gain.value,SOFT_TONE.music.presence);
  assert.equal(graph.shelf.type,'highshelf');assert.equal(graph.shelf.gain.value,SOFT_TONE.music.shelf);
  assert(SOFT_MIX.music<=.56&&SOFT_MIX.musicRoom<=.04,'background stays below cues with a short restrained room send');
  const compressor=c.nodes.find(n=>n.threshold.value<0)!;
  assert.equal(compressor.threshold.value,-16);assert.equal(compressor.ratio.value,4);assert(compressor.release.value>=.2);
  for(const cue of Object.keys(CUE_LEVELS) as (keyof typeof CUE_LEVELS)[]){
   c.advance(7);e.play(cue);
   const source=c.sources.findLast(source=>named(source)===cueKey(cue))!,fx=clipGraph(source);
   assert.equal(peakGain(source),CUE_LEVELS[cue]);assert.equal(source.playbackRate.value,1);
   assert.equal(fx.bus.gain.value,SOFT_MIX.effects);assert.equal(fx.filter.frequency.value,SOFT_TONE.effects.cutoff);
   assert.equal(fx.presence.gain.value,SOFT_TONE.effects.presence);assert.equal(fx.shelf.gain.value,SOFT_TONE.effects.shelf);
   if(cue==='spin'){assert.equal(peakGain(c.sources.at(-1)!),SOFT_MIX.spinRoll);e.stopSpin();}
  }
  c.advance(7);e.play('win');assert(graph.bus.gain.events.some(event=>event.value===SOFT_MIX.duck));
  e.configure({music:false});e.configure({music:true});assert.equal(graph.bus.gain.value,SOFT_MIX.music,'rapid toggle during duck recovers to the new quiet level');
  e.setScene('crown-voyage');c.advance(.6);
  for(let tier=0;tier<5;tier++){
   e.play('spin');const roll=c.sources.at(-1)!;
   const show=e.beginAward(tier,awardTiming(tier).countEnd),source=c.sources.at(-1)!,award=clipGraph(source);
   assert(roll.end<=c.currentTime+.11,'mechanical loop fades before the fanfare, not underneath it');
   assert.equal(peakGain(source),tier===0?.34:tier===1?.62:.70);assert.equal(award.bus.gain.value,SOFT_MIX.award);
   assert.equal(award.filter.frequency.value,SOFT_TONE.award.cutoff);assert.equal(award.shelf.gain.value,SOFT_TONE.award.shelf);
   const currentMusic=c.sources.findLast(s=>s.loop&&named(s)===musicKey('crown-voyage'))!;
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

 // Button contact is immediate, recorded and clear without sharpening the EQ.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();await flush();
  const music=clipGraph(c.sources[0]),gate=music.shelf.connections[0];
  assert.equal(gate.gain.value,1);assert(SOFT_MIX.pressDuck>=.65,'brief modest music dip, not a blackout');
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
  e.setScene('sapphire-oasis');await flush();assert(scenes.includes('sapphire-oasis'));assert.equal(c.sources.length,0);
  e.play('tap');assert.equal(e.snapshot().lastCueSource,'fx-tap');assert.equal(e.snapshot().musicVoices,0);e.destroy();
 }
 // Rapid mixed contacts own one lane, including unrealistically long mock tails.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});
  let prior:SourceMock|undefined;
  for(let i=0;i<40;i++){
   const cue=(['tap','bet','navigate','toggle','confirm'] as const)[i%5];e.play(cue);
   const current=c.sources.at(-1)!;assert.equal(named(current),cueKey(cue));
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
    e.play(cue);const source=c.sources.findLast(s=>named(s)===cueKey(cue))!;
    assert.equal(source.playbackRate.value,recordedCueRate(cue,scene));
    assert.equal(e.snapshot().lastCueRate,recordedCueRate(cue,scene));c.advance(7);
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
  e.setScene('crown-voyage');await flush();assert.equal(e.snapshot().musicTrack,musicKey('crown-voyage'));c.advance(.55);
  assert.equal(e.snapshot().voices,1);assert(c.sources[0].disconnects===1,'previous track crossfades and disconnects');
  e.configure({music:false});e.configure({music:true});c.advance(.2);assert.equal(e.snapshot().recordedMusic,true,'fast off/on cannot reuse an already stopped background');
  assert.equal(e.snapshot().voices,1);
  e.play('tap');const tap=c.sources.at(-1)!;assert.equal(named(tap),cueKey('tap'));assert.equal(e.snapshot().voices,2);
  e.configure({sound:false});c.advance(.1);assert.equal(e.snapshot().recordedMusic,true);assert.equal(tap.disconnects,1);
  e.configure({music:false,sound:true});c.advance(.2);e.play('bet');assert.equal(e.snapshot().recordedMusic,false);assert.equal(named(c.sources.at(-1)!),cueKey('bet'));
  c.advance(7);assert.equal(e.snapshot().voices,0);e.configure({music:true});
  e.play('spin');assert.equal(named(c.sources.at(-1)!),'fx-reel-roll');assert(c.sources.at(-1)!.loop);
  e.stopSpin();c.advance(7);assert.equal(e.snapshot().voices,1,'roll is gone after landing; only background remains');
  e.pause();assert.equal(e.snapshot().voices,0);e.resume();await flush();assert(e.snapshot().recordedMusic);
  e.destroy();assert(lib.cleared);assert.equal(e.snapshot().voices,0);assert(c.sources.every(s=>s.disconnects===1));
 }
 // Each award grade resolves exactly once; stale leases and hidden/muted clocks stay silent.
 {
  const c=new ContextMock(),lib=new LibraryMock(),e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});e.setScene('sapphire-oasis');
  for(let tier=0;tier<5;tier++){
   const show=e.beginAward(tier,awardTiming(tier).countEnd,tier>0);assert(e.snapshot().recordedAward);assert.equal(e.snapshot().awardVoices,1);
   assert.equal(named(c.sources.at(-1)!),awardKey('sapphire-oasis',tier));assert.equal(c.sources.at(-1)!.playbackRate.value,1);
   const count=c.sources.length;for(let t=.1;t<3;t+=.1){c.advance(.1);show.update(t);}
   assert.equal(c.sources.length,count,'one score recording, no per-frame count oscillator pileup');assert.equal(c.oscillators.length,0);
   show.finish();assert.equal(named(c.sources.at(-1)!),finaleKey('sapphire-oasis',tier));show.finish();assert.equal(c.sources.length,count+1);
   c.advance(7);show.stop();assert.equal(e.snapshot().awardVoices,0);
  }
  const old=e.beginAward(1,4.1),next=e.beginAward(2,5.1);old.stop();old.finish();assert(e.snapshot().awardActive);c.advance(.1);
  e.configure({sound:false});c.advance(.1);assert.equal(e.snapshot().awardVoices,0);next.update(2);e.configure({sound:true});next.update(2.1);
  assert.equal(e.snapshot().awardVoices,0,'unmute must not restart a complete performance halfway through');
  next.finish();c.advance(.1);assert.equal(e.snapshot().awardVoices,1);e.pause();assert.equal(e.snapshot().voices,0);next.stop();e.destroy();
 }
 // A main score that arrives late must never interrupt an in-progress fallback.
 {
  const c=new ContextMock(),lib=new LibraryMock();lib.buffers.delete(awardKey('crown-voyage',2));const e=new SoundscapeEngine(()=>c.audio(),lib);e.configure({music:false});e.setScene('crown-voyage');
  const show=e.beginAward(2,5.1);assert(!e.snapshot().recordedAward);c.advance(.5);show.update(.5);
  lib.buffers.set(awardKey('crown-voyage',2),buffer('late'));show.update(.6);assert(!e.snapshot().recordedAward);assert(!c.sources.some(s=>named(s)==='late'));
  show.stop();e.destroy();
 }
 // Older scene load callbacks cannot revive old music or play after destroy/backgrounding.
 {
  const c=new ContextMock(),lib=new LibraryMock();lib.buffers.clear();let release:()=>void=()=>{};
  lib.warm=async(scene,_context,ready)=>{await new Promise<void>(r=>release=r);lib.buffers.set(musicKey(scene),buffer(musicKey(scene),musicDuration(scene)));ready?.();};
  const e=new SoundscapeEngine(()=>c.audio(),lib);e.unlock();const old=release;e.setScene('sapphire-oasis');old();await flush();
  assert(!e.snapshot().recordedMusic,'old scene callback ignored');e.pause();release();await flush();assert.equal(e.snapshot().voices,0);assert(!e.snapshot().recordedMusic);e.destroy();
 }
 // File loader: deduplicated fetch/decode, bounded memory, retry and generation-safe clear.
 {
  const requests=new Map<string,number>();let fail=true,decodes=0;const read=(async(url:unknown)=>{const key=String(url).split('/').pop()!.slice(0,-4);requests.set(key,(requests.get(key)??0)+1);return {ok:!(key==='fx-tap'&&fail),arrayBuffer:async()=>new TextEncoder().encode(key).buffer};}) as typeof fetch;
  const context={decodeAudioData:async(data:ArrayBuffer)=>{decodes++;return buffer(new TextDecoder().decode(data));}} as unknown as AudioContext;
  const lib=new FileRecordingLibrary('https://local.invalid/audio/',read);let musicReady=0;
  await Promise.all([lib.warm('lobby',context,()=>musicReady++),lib.warm('lobby',context)]);assert.equal(requests.get('music-lobby'),1);assert.equal(decodes,14);assert.equal(musicReady,1);assert(!lib.get('fx-tap'));
  fail=false;await lib.warm('lobby',context);assert(lib.get('fx-tap'));assert.equal(requests.get('fx-tap'),2);
  for(const scene of MUSIC_SCENES.slice(1))await lib.warm(scene,context);
  assert.equal(MUSIC_SCENES.filter(s=>lib.get(musicKey(s))).length,2);assert(lib.get(musicKey('crown-voyage')));assert(!lib.get(awardKey('sapphire-oasis',1)));assert(lib.get(awardKey('crown-voyage',1)));
  const before=decodes;await lib.warm('crown-voyage',context);assert.equal(decodes,before);lib.clear();assert(!lib.get(musicKey('crown-voyage')));
 }
 {
  const releases:Array<()=>void>=[];let calls=0;const read=(async()=>{await new Promise<void>(r=>releases.push(r));return {ok:true,arrayBuffer:async()=>new ArrayBuffer(1)};}) as typeof fetch;
  const lib=new FileRecordingLibrary('',read),context={decodeAudioData:async()=>{calls++;return buffer('disposed');}} as unknown as AudioContext;
  const task=lib.warm('lobby',context);assert.equal(releases.length,3);lib.clear();for(const release of releases)release();await task;
  assert.equal(calls,0);assert(!lib.get('music-lobby'));assert.equal(lib.diagnostics().decoded,0);
 }
 // Cocos's production transpiler does not expand Map/Set iterator spreads.
 // Array.from is required here; Node-only tests otherwise miss this browser failure.
 const audioSource=(file:string)=>fs.readFileSync(new URL('../assets/scripts/audio/'+file,import.meta.url),'utf8');
 assert(!audioSource('RecordedAudio.ts').includes('[...this.buffers.keys()]'),'Map keys must use Array.from in web-mobile');
 assert(!audioSource('SoundscapeEngine.ts').includes('[...this.voices]'),'voice Set must use Array.from in web-mobile');
 assert(!/ALL_RECORDINGS\s*=\s*\[\s*\.\.\./.test(audioSource('SoundtrackCatalog.ts')),'catalog Set must use Array.from in web-mobile');
 // All catalog assets are shipped; distinct music/grade files are not renamed copies.
 const dir=new URL('../build-templates/web-mobile/audio/',import.meta.url),manifest=JSON.parse(fs.readFileSync(new URL('manifest.json',dir),'utf8'));
 assert.equal(ALL_RECORDINGS.length,59);assert.deepEqual(manifest.recordings.map((r:{name:string})=>r.name).sort(),[...ALL_RECORDINGS].sort());
 assert.equal(fs.readdirSync(dir).filter(f=>f.endsWith('.m4a')).length,59);const hashes=new Set<string>();
 for(const r of manifest.recordings){const data=fs.readFileSync(new URL(r.name+'.m4a',dir));assert.equal(data.length,r.bytes);assert(data.length>1000);assert(r.rmsDb>-55&&r.peakDb<-.9);assert(r.seconds>.09);hashes.add(crypto.createHash('sha256').update(data).digest('hex'));}
 for(const name of ['tap','bet','toggle','navigate','confirm']){
  const item=manifest.recordings.find((r:{name:string})=>r.name===cueKey(name as 'tap'));
  assert(item.seconds<=.20,'physical button tails are short, not success fanfares');
 }
 assert(SOFT_MIX.returnDuck>SOFT_MIX.awardDuck,'small returns do not hush the background like a jackpot');
 assert.equal(hashes.size,59,'every cue and performance has a distinct actual AAC payload');
 assert.equal(new Set(Object.values(RECORDING_THEMES).map(t=>t.programs.join(','))).size,5,'independent instrument ensembles');
 console.log('PASS recorded audio: restrained EQ/gains, quiet duck/toggle recovery, no overlapping fanfare, mixer cleanup; 59 distinct AAC assets; decoded-source playback, loops/crossfade, fast toggle, effects/music independence, spin cleanup, five grades + one finale, stale/late/hidden handling, loading dedup/retry/cache/dispose');
}
void main().catch(e=>{console.error(e);process.exitCode=1;});
