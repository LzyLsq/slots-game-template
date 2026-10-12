// Objective file/decoder/mix checks. Not a human-listening approval.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {themedFeedbackRevision as defaultRevision} from './themed-feedback-profiles.mjs';

const option=n=>process.argv.find(a=>a.startsWith(`--${n}=`))?.slice(n.length+3);
const revision=option('revision')||defaultRevision;
const ffmpeg=option('ffmpeg'),cache=option('cache');
assert(ffmpeg&&existsSync(ffmpeg));assert(cache&&existsSync(cache));
const out=join(import.meta.dirname,option('out')||'verification/themed-feedback-20261010');
const install=JSON.parse(readFileSync(join(out,'install.json')));
assert.equal(install.revision,revision);assert.equal(install.games.length,20);
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const read=f=>JSON.parse(readFileSync(f));
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const audioPattern=/\.(m4a|wav|mp3|ogg)$/;
const decoded=[],games=[],groups=new Map(),backgroundHashes=[],allHashes=[],sourceChecked=new Map();
let synchronizedFiles=0,backgroundCopiesUnchanged=0;
for(const g of install.games){
 const dir=g.targets[0],manifest=read(join(dir,'music-manifest.json')),design=read(join(dir,'feedback-design.json'));
 assert.equal(manifest.feedbackThemeRevision,revision);assert.equal(design.revision,revision);
 assert(design.originalSpeed&&design.originalPitch&&design.runtimeExtraVoices===0);
 assert.equal(manifest.tracks.length,24);assert.equal(design.recipes.length,21);
 assert.equal(readdirSync(dir).filter(f=>audioPattern.test(f)).length,24);
 for(const [pack,info]of Object.entries(design.sourcePacks)){
  const bundled=join(dir,`Kenney-${pack}-License.txt`);
  assert.equal(hash(bundled),info.licenseSha256);assert(/CC0|Creative Commons Zero/.test(readFileSync(bundled,'utf8')));
 }
 let bytes=0,oldBytes=0;
 for(const t of manifest.tracks){
  const file=join(dir,t.file),sha=hash(file);assert.equal(sha,t.sha256);allHashes.push(sha);bytes+=statSync(file).size;
  assert(t.sourceUrl&&t.license&&t.sourceSha256);
  for(const target of g.targets){assert.equal(hash(join(target,t.file)),sha);synchronizedFiles++;}
  const recipe=design.recipes.find(r=>r.id===t.id);
  if(recipe){
   assert.equal(recipe.sha256,sha);assert.deepEqual(recipe.sources,t.sources);
   if(design.stereoMusicalCues && t.id.startsWith('win-')){
    const musical=recipe.sources.filter(s=>s.key.startsWith('jingles/'));
    assert.equal(musical.length,1,'Stitched musical phrases '+t.id);
    assert.equal(musical[0].completeSource,true,'Truncated musical cue '+t.id);
    assert(Math.abs(musical[0].maxSeconds-musical[0].sourceSeconds)<1/44100);
    assert.equal(recipe.primaryMusicalSource,musical[0].key);
   }
   for(const source of recipe.sources){
    assert.equal(source.license,'CC0 1.0');const [pack,...names]=source.key.split('/');
    const original=join(cache,pack,'Audio',names.join('/')+'.ogg');
    if(!sourceChecked.has(original))sourceChecked.set(original,hash(original));
    assert.equal(sourceChecked.get(original),source.sourceSha256);
   }
  }else{assert(/^music-/.test(t.id));backgroundHashes.push(sha);}
  const decodedFile=spawnSync(ffmpeg,['-nostdin','-hide_banner','-i',file,'-af','volumedetect','-ar','8000','-ac','1','-f','f32le','pipe:1'],{maxBuffer:16*1024*1024});
  assert.equal(decodedFile.status,0,'Decoder failed '+file);const log=decodedFile.stderr.toString();
  const peak=Number(log.match(/max_volume: ([\-\d.]+) dB/)?.[1]),mean=Number(log.match(/mean_volume: ([\-\d.]+) dB/)?.[1]);
  assert(Number.isFinite(peak)&&Number.isFinite(mean)&&mean>-55,'Silent/invalid '+file);assert(peak<-1,'Clipping risk '+file+' '+peak);
  decoded.push({game:g.id,id:t.id,file:t.file,sha256:sha,peakDb:peak,meanDb:mean,duration:log.match(/Duration: ([^,]+)/)?.[1]});
  if(recipe){
   const buffer=decodedFile.stdout,pcm=new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));
   if(design.stereoMusicalCues){
    if(t.id.startsWith('win-'))assert(/Audio:.*stereo/.test(log),'Musical stereo lost '+file);
    else {
     let pcmPeak=0;for(const v of pcm)pcmPeak=Math.max(pcmPeak,Math.abs(v));
     const transientMs=pcm.findIndex(v=>Math.abs(v)>pcmPeak*.02)/8;
     assert(transientMs>=0&&transientMs<40,'Delayed feedback transient '+file+' '+transientMs+'ms');
     decoded.at(-1).firstTransientMs=transientMs;
    }
   }
   const group=groups.get(t.id)||[];group.push({game:g.id,pcm,sha,keys:JSON.stringify(recipe.parts.map(p=>p.key)),primaryMusicalSource:recipe.primaryMusicalSource});groups.set(t.id,group);
  }
 }
 for(const target of g.targets){
  const snapshot=install.snapshots.find(s=>s.target===target);assert(snapshot&&existsSync(snapshot.backup));
  for(const track of manifest.tracks.filter(t=>t.id.startsWith('music-'))){
   assert.equal(hash(join(target,track.file)),hash(join(snapshot.backup,track.file)),'Background changed F'+g.id);backgroundCopiesUnchanged++;
  }
  // New metadata/licenses must match across all four targets. Existing files
  // retain each target's baseline (F26's bundled CC-BY HTML has a trailing LF).
  for(const f of g.files)assert.equal(hash(join(target,f.name)),f.sha256,'Updated asset mismatch '+f.name);
  const updated=new Set(g.files.map(f=>f.name));
  for(const f of walk(snapshot.backup)){
   const name=relative(snapshot.backup,f);if(!updated.has(name))assert.equal(hash(join(target,name)),hash(f),'Protected existing asset changed '+name);
  }
 }
 const snapshot=install.snapshots.find(s=>s.target===dir);
 oldBytes=read(join(snapshot.backup,'music-manifest.json')).tracks.reduce((sum,t)=>sum+statSync(join(snapshot.backup,t.file)).size,0);
 games.push({id:g.id,label:g.label,theme:g.zh,clips:24,feedbackClips:21,bytes,previousBytes:oldBytes,deltaBytes:bytes-oldBytes});
 console.log('F'+g.id+' AUDIO DECODE/HASH PASS');
}
// Compare normalized decoded waveforms, including small time shifts. Reject
// gain-only/header-only copies even if their encoded file hashes differ.
function similarity(a,b){
 let ea=0,eb=0;for(const v of a)ea+=v*v;for(const v of b)eb+=v*v;
 assert(ea>0&&eb>0);let best=0;
 for(const lag of [-16,-8,0,8,16]){
  let dot=0;for(let n=Math.max(0,-lag);n<Math.min(a.length,b.length-lag);n++)dot+=a[n]*b[n+lag];
  best=Math.max(best,Math.abs(dot)/Math.sqrt(ea*eb));
 }
 return best;
}
const comparisons=[],nearDuplicates=[];
for(const [action,group]of groups){
 assert.equal(group.length,20);assert.equal(new Set(group.map(r=>r.sha)).size,20,'Duplicate '+action);
 assert.equal(new Set(group.map(r=>r.keys)).size,20,'Gain/timing-only '+action);
 if(group.some(r=>r.primaryMusicalSource))assert.equal(new Set(group.map(r=>r.primaryMusicalSource)).size,20,'Repeated primary musical cue '+action);
 let max=0,pair=[];
 for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++){
  const value=similarity(group[i].pcm,group[j].pcm);if(value>max){max=value;pair=[group[i].game,group[j].game];}
 }
 if(max>=.995)nearDuplicates.push({action,pair,similarity:max});
 comparisons.push({action,uniqueEncodedFiles:20,uniqueSourceCombinations:20,maxNormalizedWaveformSimilarity:max,mostSimilarPair:pair,threshold:.995});
}
assert.equal(groups.size,21);assert.equal(allHashes.length,480);assert.equal(new Set(backgroundHashes).size,60);
// Reusing a suitable material across *different* roles is allowed. Corresponding
// roles across games are still independently checked above; do not add pointless
// edits just to force all file hashes to be different.
if(!option('out'))assert.equal(new Set(allHashes).size,480);
const report={checkedAt:new Date().toISOString(),revision,passed:nearDuplicates.length===0,nearDuplicates,scope:'Decoder, source hash/license, original speed/pitch metadata, complete primary musical cues when declared, normalized waveform and corresponding-role source uniqueness, four-way asset sync, unchanged background files. Different roles may reuse suitable material. Not human listening or real-device performance/payment.',games,totalFiles:480,uniqueFiles:new Set(allHashes).size,uniqueFeedbackFiles:new Set([...groups.values()].flatMap(g=>g.map(r=>r.sha))).size,feedbackActions:21,sourceRecordingsChecked:sourceChecked.size,synchronizedAudioCopies:synchronizedFiles,unchangedBackgroundCopies:backgroundCopiesUnchanged,backgroundFilesUnchanged:60,comparisons,decoded};
mkdirSync(out,{recursive:true});writeFileSync(join(out,'decoded-audio.json'),JSON.stringify(report,null,2)+'\n');
assert.equal(nearDuplicates.length,0,'Nearly identical waveforms: '+JSON.stringify(nearDuplicates));
console.log('PASS: 20 theme suites / '+report.uniqueFeedbackFiles+' unique feedback files / 480 decodable audio files; no corresponding-action duplicate or gain-only waveform copy.');
