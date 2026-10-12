// Consolidate actual evidence; never turn a failed/latest run into a passing record.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'../..');
const ids=[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33];
const options=name=>process.argv.filter(a=>a.startsWith(`--${name}=`)).map(a=>a.slice(name.length+3));
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const out=join(import.meta.dirname,'verification/curated-audio-20261010');
mkdirSync(out,{recursive:true});
function merge(kind){
 const files=options(kind),rows=new Map();assert(files.length,`Provide --${kind}=<results.json>`);
 for(const file of files)for(const g of read(file).games)rows.set(g.id,{...g,evidence:file});
 for(const id of ids)assert(rows.get(id)?.passed,`${kind} latest evidence missing/failed F${id}: ${rows.get(id)?.error||''}`);
 return rows;
}
const feedback=merge('feedback'),music=merge('music');
for(const file of options('credits'))for(const g of read(file).games){
 if(g.passed&&feedback.has(g.id))feedback.get(g.id).creditsChecks={checks:g.checks,evidence:file};
}
for(const id of ids){
 const f=feedback.get(id),checks=f.checks||[];
 assert(checks.some(c=>c.realSpin&&c.oneLaunchNoTap),`Missing actual spin F${id}`);
 assert(checks.some(c=>c.ordinaryCount||c.ratio===.5&&c.count&&c.collectOnce),`Missing ordinary award F${id}`);
 assert(checks.some(c=>c.bigCount&&c.bigCollectOnce||c.ratio===2&&c.count&&c.collectOnce),`Missing big award F${id}`);
 assert(checks.some(c=>c.mutedSilent&&c.backgroundSilent&&c.noResumeBacklog),`Missing silent/lifecycle check F${id}`);
 assert([...checks,...f.creditsChecks?.checks||[]].some(c=>c.creditsEntryClicked),`Missing real credits click F${id}`);
 const cabinets=music.get(id).checks.filter(c=>Object.hasOwn(c,'mode'));
 const expectedModes=id===26?['beacon','mint','pearl','reef']:[0,1,2,3];
 assert.deepEqual(cabinets.map(c=>c.mode).sort(),expectedModes,`Missing all-cabinet BGM F${id}`);
 for(const cabinet of cabinets)assert(cabinet.elements.some(e=>e.src.endsWith('/audio/music-cabinet.m4a')&&!e.paused&&e.time>.08&&e.volume>.01),`Cabinet music not advancing F${id}`);
 if(id===26)for(const cabinet of cabinets)assert.equal(cabinet.elements.find(e=>e.src.endsWith('/audio/music-cabinet.m4a')).muted,false,'F26 media mute must be explicitly verified');
}
const nativeFile=options('native')[0];assert(nativeFile,'Provide --native=<results.json>');
const native=read(nativeFile);for(const id of ids)assert(native.results.some(g=>g.id===id&&g.passed&&g.unsignedArm64Build),`Native build missing/failed F${id}`);
const decoded=read(join(out,'decoded-audio.json'));assert.equal(decoded.games.length,20);assert.equal(decoded.uniqueFiles,71);
const sync=read(join(import.meta.dirname,'verification/profitable-delivery.json'));assert.equal(sync.games.length,20);assert.equal(sync.nativeFilesChanged,false);
const roots=[join(root,'Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const deliveryAudits=[];
for(const delivery of roots){
 const manifest=read(join(delivery,'manifest.json'));assert.deepEqual(manifest.map(g=>g.id),ids);
 for(const g of manifest){
  assert.equal(g.feedbackRevision,'animation-events-rate-limited-count-reel-collect-20261010');
  assert.equal(g.musicPlaybackRevision,'authored-unique-loops-curated-pcm-feedback-20261010');
  const audio=join(delivery,g.folder,`F${g.id}_H5/audio`),credits=read(join(audio,'credits.json')),audioManifest=read(join(audio,'music-manifest.json'));
  assert.equal(audioManifest.revision,'curated-authored-audio-20261010');
  assert.equal(audioManifest.tracks.length,23);
  assert.equal(credits.music.length,2);
  assert.deepEqual(credits.music,audioManifest.tracks.filter(t=>t.artist==='Kevin MacLeod'));
  assert.equal(credits.effects.license,'CC0 1.0');assert(existsSync(join(audio,'CC-BY-4.0.html')));
  for(const track of audioManifest.tracks){assert(existsSync(join(audio,track.file)));assert.equal(hash(join(audio,track.file)),track.sha256);}
 }
 const run=spawnSync(process.execPath,[join(root,'tools/webp-iap/audit-delivery.mjs'),delivery],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
 process.stdout.write(run.stdout);assert.equal(run.status,0,run.stderr);
 const audit=read(join(root,'tools/webp-iap/verification/delivery-audit.json'));assert.equal(audit.out,delivery);deliveryAudits.push(audit);
}
const report={checkedAt:new Date().toISOString(),scope:ids,missingRepositoryGame:32,
 limitations:['No human listening evaluation','No physical iPhone playback or memory measurement','F26 streams directly through HTMLAudioElement: playback timing and mute/volume verified, no live WebAudio RMS capture; file decode is audited separately','Unsigned native builds do not verify signing, App Store approval or live StoreKit payment'],
 implementation:{independentBackgroundTracks:40,clipsPerGame:23,uniqueDecodedFiles:71,runtimeToneSynthesis:false,backgroundFullPcmDecode:false,maxSampleVoices:12},
 feedback:[...feedback.values()].sort((a,b)=>a.id-b.id),music:[...music.values()].sort((a,b)=>a.id-b.id),
 native:{evidence:nativeFile,...native},deliveryAudits,sync,audioAudit:decoded};
const serialized=JSON.stringify(report,null,2)+'\n';
writeFileSync(join(out,'final-report.json'),serialized);
for(const delivery of roots)writeFileSync(join(delivery,'音频与反馈验证.json'),serialized);
console.log('20/20 browser feedback, music, unsigned native build and both delivery audits passed.');
console.log(join(out,'final-report.json'));
