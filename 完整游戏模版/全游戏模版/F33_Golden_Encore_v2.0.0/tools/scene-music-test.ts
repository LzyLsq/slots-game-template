import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readPcm } from './audio-pcm';
import { SceneMusic, MUSIC_TRACKS, musicScene, type MusicScene, type MusicVoice } from '../assets/scripts/ui/SceneMusic';
import { GameplayAudio, GAMEPLAY_SOUNDS, type GameplayVoice } from '../assets/scripts/ui/GameplayAudio';
class Voice implements MusicVoice<string>, GameplayVoice<string> {
  clip: string | null = null; loop = false; volume = 0; playing = false;
  starts: string[] = []; pauses = 0; stops = 0;
  play() { this.playing = true; this.starts.push(this.clip!); }
  pause() { this.playing = false; this.pauses++; }
  stop() { this.playing = false; this.stops++; }
}
const scenes = Object.keys(MUSIC_TRACKS) as MusicScene[];
assert.equal(scenes.length, 8);
assert.equal(new Set(Object.values(MUSIC_TRACKS).map(track => track.asset)).size, 8);
assert.equal(musicScene('loading', 0), 'welcome'); assert.equal(musicScene('login', 1), 'welcome');
assert.equal(musicScene('home', 3), 'hall');
assert.deepEqual([0,1,2,3].map(mode => musicScene('game',mode)), ['jade','pearl','ember','dragon']);
assert.equal(musicScene('rules',3,'game'),'dragon','Rules preserve the cabinet score on return');
for (const page of ['store','rewards','atlas']) assert.equal(musicScene(page,0),'treasury');
for (const page of ['account','rank','ledger','rules']) assert.equal(musicScene(page,0),'quiet');
const music = new SceneMusic<string>(); const voices = [new Voice(),new Voice()];
music.bind(voices);
for(const scene of scenes) music.setClip(scene,MUSIC_TRACKS[scene].asset);
assert.equal(voices.reduce((n,v)=>n+v.starts.length,0),0,'No music before real gesture unlock');
music.setAudible(true); music.update(1);
assert.equal(voices.filter(v=>v.playing).length,1);
assert.equal(voices[0].volume,MUSIC_TRACKS.welcome.volume);
for(let i=0;i<30;i++) { music.select('welcome'); music.setAudible(true); music.setDucked(false); }
assert.equal(voices[0].starts.length,1,'Repeated redraw and same-touch sync do not restart playback');
music.select('hall'); music.update(.20); // outgoing harmony now clears at .40 s
assert.equal(voices.filter(v=>v.playing).length,2,'Overlap only during owned crossfade');
assert.ok(voices[0].volume>0&&voices[1].volume>0);
const total=voices.reduce((n,v)=>n+v.volume,0); assert.ok(total<.29,'No double full-volume mix');
music.setDucked(true); music.update(.21);
assert.equal(voices.filter(v=>v.playing).length,1,'Reward duck also cuts an outgoing crossfade');
assert.ok(voices.find(v=>v.playing)!.volume<.12);
music.setDucked(false); music.update(.56); assert.equal(voices.find(v=>v.playing)!.volume,MUSIC_TRACKS.hall.volume);
for(let i=0;i<200;i++) { music.select(scenes[i%scenes.length]); music.update(.016); assert.ok(voices.filter(v=>v.playing).length<=2); }
music.select('dragon'); music.update(1);
const starts=voices.reduce((n,v)=>n+v.starts.length,0);
music.setAudible(false); assert.ok(voices.every(v=>!v.playing&&v.volume===0),'Master mute/background silence');
music.select('pearl'); music.setAudible(true); music.update(1);
assert.equal(voices.filter(v=>v.playing).length,1); assert.equal(voices.find(v=>v.playing)!.clip,MUSIC_TRACKS.pearl.asset);
assert.equal(voices.reduce((n,v)=>n+v.starts.length,0),starts+1,'Only desired scene resumes, not old voices');
music.stopAll(); assert.ok(voices.every(v=>!v.playing));
const lazy=new SceneMusic<string>();const lazyVoices=[new Voice(),new Voice()];
lazy.bind(lazyVoices);lazy.setAudible(true);lazy.select('dragon');lazy.setClip('hall','hall');
assert.equal(lazyVoices.reduce((n,v)=>n+v.starts.length,0),0,'Unrelated delayed load does not play the wrong page');
lazy.setClip('dragon','dragon');lazy.update(1);assert.equal(lazyVoices.find(v=>v.playing)?.clip,'dragon');
lazy.select('pearl');lazy.markUnavailable('pearl');lazy.update(1);assert.equal(lazyVoices.find(v=>v.playing)?.clip,'hall','Missing optional track falls back without blocking UI');
lazy.stopAll();
const machine=new GameplayAudio<string>();const foley=[new Voice(),new Voice(),new Voice()];
machine.bind({...GAMEPLAY_SOUNDS},foley);machine.begin();assert.ok(foley.every(v=>!v.playing));
machine.setAudible(true);machine.begin();assert.equal(foley[0].clip,GAMEPLAY_SOUNDS.roll);assert.equal(foley[0].loop,true);
for(let c=0;c<5;c++) { machine.columnStop(c,c*100);machine.columnStop(c,c*100+1); }
assert.deepEqual(foley[1].starts,Object.values(GAMEPLAY_SOUNDS).filter(name=>name.startsWith('reel-stop')));
assert.equal(foley[0].playing,false,'Rolling ends with final settled column');
machine.begin(false);const before=foley[1].starts.length;
for(let c=0;c<5;c++) machine.columnStop(c,1000);
assert.equal(foley[1].starts.length,before+1,'Reduced-motion simultaneous stops have one short tick');
machine.feature();assert.equal(foley[2].clip,GAMEPLAY_SOUNDS.feature);
machine.setAudible(false);assert.ok(foley.every(v=>!v.playing));machine.setAudible(true);assert.ok(foley.every(v=>!v.playing),'Unmute never replays a stale spin/feature');
machine.begin();machine.stopAll();assert.ok(foley.every(v=>!v.playing),'Skip/background/destroy cancel all owned foley');
const manifest=JSON.parse(readFileSync('docs/audio-score-manifest.json','utf8'));
const ids=new Set<string>(), hashes=new Set<string>();
for (const item of [...manifest.tracks,...manifest.foley]) {
 const path=`assets/resources/audio/${item.asset}.wav`,bytes=readFileSync(path),meta=JSON.parse(readFileSync(`${path}.meta`,'utf8'));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WAVE');
 const pcm=readPcm(bytes);
 assert.equal(pcm.channels,manifest.tracks.includes(item)?2:1,'Stereo scene scoring, compact mono short cues');
 assert.equal(pcm.channels,item.channels);
 assert.equal(meta.importer,'audio-clip');assert.ok(!ids.has(meta.uuid));ids.add(meta.uuid);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);assert.ok(!hashes.has(item.sha256));hashes.add(item.sha256);
 const n=(bytes.length-44)/2,duration=pcm.duration;assert.ok(Math.abs(duration-item.duration)<.001);
 let peak=0,energy=0;for(let i=44;i<bytes.length;i+=2){const v=bytes.readInt16LE(i)/32768;peak=Math.max(peak,Math.abs(v));energy+=v*v;}
 assert.ok(peak>=(manifest.tracks.includes(item)?.60:.12)&&peak<.68,`${item.asset} keeps headroom`);assert.ok(Math.sqrt(energy/n)>.015,`${item.asset} is not silence`);
 assert.equal(bytes.readInt16LE(bytes.length-2),0,'No cut-off end click');
 for(const channel of pcm.samples){
   assert.equal(channel[0],0,'Soft seam/attack');assert.equal(channel[channel.length-1],0,'No cut-off in either channel');
 }
 if(manifest.tracks.includes(item))assert.ok(duration>=32&&duration<44,'Longer varied phrase, not a short jingle loop');
}
assert.equal(manifest.tracks.length,8);assert.equal(manifest.foley.length,58);
const app=readFileSync('assets/scripts/ui/GoldenEncoreApp.ts','utf8');
assert.ok(app.indexOf('this.persist(); this.refreshMeters();')<app.indexOf('this.machineAudio.begin(!this.reduced, this.save.selectedMode, true)'),'Foley follows persisted debit');
assert.match(app,/private reelStopCue\(column: number\): void \{\s*this.machineAudio.columnStop\(column\)/);
assert.match(app,/private cancelSpin\(\): void \{\s*this.machineAudio.stopAll\(\)/);
assert.match(app,/protected update\(dt: number\): void \{\s*this.sceneMusic.update\(dt\);/);
console.log('PASS eight scene scores, two-voice crossfade, duck/mute/lazy-load/rapid-switch; accepted-spin roll/stop/feature foley; 66 authored sampled/material PCM assets with headroom, stereo/mono formats and provenance');
