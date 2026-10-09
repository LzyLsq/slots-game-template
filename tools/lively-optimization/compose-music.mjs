/** Deterministic original scores. Offline AAC render; no runtime synthesizer or sound bank shipped. */
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,statSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {profiles} from './profiles.mjs';
import {compose as originalComposition} from './original-scores.mjs';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..');
const base=join(root,'完整游戏模版/全游戏模版'),temporary=mkdtempSync(join(tmpdir(),'theme-music.'));
const renderer=join(temporary,'render-music');
execFileSync('swiftc',[join(base,'F20_Golden_Canopy_v1.0.0/tools/render-music.swift'),'-o',renderer]);
// Include the mastering recipe in the cache key.  Changing the warmth/roll-off
// must regenerate AAC files instead of reusing an older, brighter render.
const AUDIO_RENDER_VERSION='warm-v2-low-air-5200Hz';
const selected=profiles.filter(p=>![25,28].includes(p.id)&&(!process.argv[2]||process.argv.slice(2).map(Number).includes(p.id)));
for(const p of selected){
 const dir=readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`));
 const output=join(base,dir,p.id===26?'audio':'build-templates/web-mobile/audio');mkdirSync(output,{recursive:true});
 const reports=[];
 for(const kind of ['music-home','music-cabinet','win-small','win-big','win-mega','win-epic','win-super']){
  const s=originalComposition(p,kind),scorePath=join(temporary,`f${p.id}-${kind}.json`),rawPath=scorePath+'.f32',wavPath=scorePath+'.wav';
  const scoreSha256=createHash('sha256').update(JSON.stringify({render:AUDIO_RENDER_VERSION,score:s})).digest('hex'),target=join(output,kind+'.m4a');
  const old=existsSync(join(output,'music-manifest.json'))?JSON.parse(readFileSync(join(output,'music-manifest.json'))).tracks?.find(t=>t.id===kind):undefined;
  if(old?.scoreSha256===scoreSha256&&existsSync(target)){reports.push(old);continue;}
  writeFileSync(scorePath,JSON.stringify(s));execFileSync(renderer,[scorePath,rawPath],{stdio:'pipe'});
  const raw=readFileSync(rawPath),samples=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4),frames=samples.length/2;
  // Gentle high shelf: retain the melody, reduce the bright/metallic top end.
  // Warm the recording before loudness normalization, independently per channel.
  const shelf=1-Math.exp(-2*Math.PI*1900/44100),air=1-Math.exp(-2*Math.PI*5200/44100);
  const low=[0,0],top=[0,0];
  for(let i=0;i<samples.length;i++){const channel=i%2;low[channel]+=shelf*(samples[i]-low[channel]);const warm=.32*samples[i]+.68*low[channel];top[channel]+=air*(warm-top[channel]);samples[i]=top[channel];}
  let mean=0;for(const n of samples){if(!Number.isFinite(n))throw new Error('Invalid PCM');mean+=n;}mean/=samples.length;
  let rms=0,peak=0;for(const n of samples){const x=n-mean;rms+=x*x;peak=Math.max(peak,Math.abs(x));}rms=Math.sqrt(rms/samples.length);
  if(rms<.0001)throw new Error('Silent score');const gain=Math.min((s.loop?.10:.15)/rms,.78/peak);
  const wave=Buffer.alloc(44+frames*4);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(2,22);wave.writeUInt32LE(44100,24);wave.writeUInt32LE(176400,28);wave.writeUInt16LE(4,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(frames*4,40);
  let outRms=0,outPeak=0;for(let i=0;i<samples.length;i++){const frame=i>>1,t=frame/44100,fade=Math.max(0,Math.min(1,t/(s.loop?.004:.006),(frames-1-frame)/(44100*(s.loop?.004:.34))));const x=(samples[i]-mean)*gain*fade;outRms+=x*x;outPeak=Math.max(outPeak,Math.abs(x));wave.writeInt16LE(Math.round(x*32767),44+i*2);}
  writeFileSync(wavPath,wave);execFileSync('/usr/bin/afconvert',[wavPath,target,'-f','m4af','-d','aac','-b','96000','-q','127']);
  reports.push({id:kind,title:s.title,description:s.description,file:kind+'.m4a',duration:frames/44100,loop:s.loop,bpm:s.bpm,programs:s.instruments.map(i=>i.program),notes:s.notes.length,scoreSha256,bytes:statSync(target).size,sha256:createHash('sha256').update(readFileSync(target)).digest('hex'),peak:outPeak,rms:Math.sqrt(outRms/samples.length)});
 }
 writeFileSync(join(output,'music-manifest.json'),JSON.stringify({version:2,render:AUDIO_RENDER_VERSION,format:'AAC-LC stereo 44100 Hz 96kbps',creation:'Original deterministic score with warm mastering: tools/lively-optimization/compose-music.mjs. Offline macOS instrument render; no external recording or runtime sound bank.',theme:p.name,tracks:reports},null,2)+'\n');
 console.log(`F${p.id}: 7 distinct scores, ${Math.round(reports.reduce((a,t)=>a+t.bytes,0)/1024)} KiB`);
}
console.log('Offline scores/PCM retained for inspection: '+temporary);
