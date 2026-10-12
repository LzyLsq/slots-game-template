import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {MUSIC_SCENES,themeMusic} from '../assets/scripts/audio/MusicTheme';
import {RECORDING_THEMES,musicKey,musicDuration,awardKey,finaleKey} from '../assets/scripts/audio/SoundtrackCatalog';
import {awardTiming} from '../assets/scripts/vfx/AwardTimeline';
type Note={program:number;pitch:number;at:number;duration:number;velocity:number;pan:number;percussion?:boolean};
type Score={name:string;duration:number;loopSeconds?:number;bpm?:number;style?:string;notes:Note[]};
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'f35-score-qa-'));
try{
 const output=path.join(temporary,'scores.json');
 execFileSync(process.execPath,['--import','tsx','tools/compose-soundtracks.ts',output],{cwd:process.cwd()});
 const scores:Score[]=JSON.parse(fs.readFileSync(output,'utf8'));
 assert.equal(scores.length,45);assert.equal(new Set(scores.map(s=>s.name)).size,45);
 const score=(key:string)=>{const found=scores.find(s=>s.name===key);assert(found,key);return found;};
 const drumPatterns=new Set<string>(),ensembleSignatures=new Set<string>();
 for(const scene of MUSIC_SCENES){
  const theme=themeMusic(scene),arrangement=RECORDING_THEMES[scene],s=score(musicKey(scene));
  assert(theme.bpm>=108&&theme.bpm<=124,'lively but not hyper-speed');
  assert.equal(s.bpm,theme.bpm);assert.equal(s.style,arrangement.style);assert.equal(s.loopSeconds,musicDuration(scene));
  assert.equal(theme.melody.length,8*theme.eighthsPerBar);assert(theme.melody.filter(Boolean).length/theme.melody.length>.70);
  // Original major-key tunes, not the older slow motif with a different rate.
  const root=theme.chords[0][0]%12,major=new Set([0,2,4,5,7,9,11]);
  for(const n of theme.melody)if(n)assert(major.has((n-root+12)%12),scene+' bright major-key melody');
  const used=new Set(s.notes.filter(n=>!n.percussion).map(n=>n.program));
  for(const p of arrangement.programs)assert(used.has(p),scene+' uses every declared sampled instrument');
  assert(s.notes.length/s.duration>8,'complete arrangement, not sparse idle notes');
  const drums=s.notes.filter(n=>n.percussion);assert(drums.length>=150,'dedicated festive rhythm layer');
  drumPatterns.add(drums.filter(n=>n.at<60/theme.bpm*theme.eighthsPerBar/2).map(n=>[n.pitch,Math.round(n.at*1000)]).join('|'));
  ensembleSignatures.add(Array.from(used).sort().join(','));
  for(const n of s.notes){assert(n.at>=0&&n.at+n.duration<s.duration+.001);assert(n.velocity>=20&&n.velocity<=105);assert(Math.abs(n.pan)<=30);assert(n.pitch>=21&&n.pitch<=108);}
  for(let tier=0;scene!=='lobby'&&tier<=4;tier++){
   const main=score(awardKey(scene,tier)),resolve=score(finaleKey(scene,tier));
   assert.equal(main.duration,awardTiming(tier).countEnd+.85,'visual count remains authoritative');
   assert.equal(resolve.duration,tier===0?.65:2.25);
   assert(main.notes.length>0&&resolve.notes.length>0);
   assert(main.notes.every(n=>n.at<awardTiming(tier).countEnd));
   if(tier===0)assert(!main.notes.some(n=>n.percussion)&&!resolve.notes.some(n=>n.percussion),'partial return must not claim a jackpot');
   else {assert(main.notes.some(n=>n.percussion));assert(resolve.notes.some(n=>n.percussion));}
  }
 }
 assert.equal(drumPatterns.size,5,'five distinct grooves, not tempo variants');
 assert.equal(ensembleSignatures.size,5,'five independent instrument ensembles');
 const renderer=fs.readFileSync('tools/render-instruments.swift','utf8');assert(renderer.includes('kAUSampler_DefaultPercussionBankMSB'),'drums must load drum samples, not melodic patch 0');
 assert(renderer.includes('n.samplerKey'),'note events must distinguish drum kit and piano');
 console.log('PASS festive audio: five original major-key scores, full ensembles + distinct dedicated drum grooves, 45 performances, grade-specific cadences and unchanged visual timing');
}finally{fs.rmSync(temporary,{recursive:true,force:true});}
