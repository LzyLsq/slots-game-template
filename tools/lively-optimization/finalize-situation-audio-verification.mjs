// Consolidate fresh situation evidence separately from the earlier audio pass.
// Browser playback and unsigned compilation are not listening/device/payment QA.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const root=resolve(import.meta.dirname,'../..');
const ids=[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33];
const revision='accepted-spin-last-reel-modal-award-20261010';
const options=name=>process.argv.filter(a=>a.startsWith(`--${name}=`)).map(a=>a.slice(name.length+3));
const read=file=>JSON.parse(readFileSync(file,'utf8'));
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const out=join(import.meta.dirname,'verification/situation-audio-20261010');
mkdirSync(out,{recursive:true});
function merge(kind,key){
 const files=options(kind),rows=new Map();assert(files.length,`Provide --${kind}=<results.json>`);
 for(const file of files)for(const g of read(file)[key])rows.set(g.id,{...g,evidence:file});
 for(const id of ids)assert(rows.get(id)?.passed,`${kind} latest evidence missing/failed F${id}: ${rows.get(id)?.error||''}`);
 return rows;
}
const situations=merge('situation','games'),native=merge('native','results');
const feedback=merge('feedback','games'),music=merge('music','games');
for(const id of ids){
 const g=situations.get(id),checks=g.checks;
 assert(checks.some(c=>c.modalOpened<c.modalClosed),'Missing modal mixing F'+id);
 assert(checks.some(c=>c.realAcceptedSpin&&c.ignoredRepeatedTap&&c.reelEndRestored&&c.spinFile==='music-spin.m4a'),'Missing accepted/reel-ending spin F'+id);
 const payouts=checks.filter(c=>Object.hasOwn(c,'ratio'));
 assert.deepEqual(payouts.map(c=>c.ratio),[.5,2,20,60,100],'Missing payout fixtures F'+id);
 assert(payouts.every(c=>c.collectRestored),'Missing collect/skip restoration F'+id);
 assert(checks.some(c=>c.mute&&c.backgroundNoBacklog&&c.returnHome),'Missing page/background cleanup F'+id);
 assert.equal(g.errors.length,0);assert.equal(g.missing.length,0);
 assert(native.get(id).unsignedArm64Build&&native.get(id).copiedFiles>0,'Native bundle copy unverified F'+id);
 const f=feedback.get(id),fc=f.checks;
 assert(fc.some(c=>c.realSpin&&c.oneLaunchNoTap),'Missing launch/stop feedback F'+id);
 assert(fc.some(c=>c.ordinaryCount||c.ratio===.5&&c.count&&c.collectOnce),'Missing ordinary award feedback F'+id);
 assert(fc.some(c=>c.bigCount&&c.bigCollectOnce||c.ratio===2&&c.count&&c.collectOnce),'Missing big award feedback F'+id);
 assert(fc.some(c=>c.mutedSilent&&c.backgroundSilent&&c.noResumeBacklog),'Missing feedback lifecycle F'+id);
 assert(fc.some(c=>c.creditsEntryClicked)&&fc.some(c=>c.smallScreenCreditsClose),'Missing usable audio credits F'+id);
 assert.equal(f.errors.length,0);assert.equal(f.missing.length,0);
 const m=music.get(id),cabinets=m.checks.filter(c=>Object.hasOwn(c,'mode'));
 assert.deepEqual(cabinets.map(c=>c.mode).sort(),id===26?['beacon','mint','pearl','reef']:[0,1,2,3],'Missing four-cabinet playback F'+id);
 for(const c of cabinets)assert(c.elements.some(e=>e.src.endsWith('/audio/music-cabinet.m4a')&&!e.paused&&!e.muted&&e.time>.08&&e.volume>.01),'Cabinet music not advancing F'+id);
 assert.equal(m.errors.length,0);assert.equal(m.missing.length,0);
}
const decoded=read(join(out,'decoded-audio.json'));
assert.equal(decoded.games.length,20);assert.equal(decoded.uniqueFiles,91);
const sync=read(join(import.meta.dirname,'verification/profitable-delivery.json'));
assert.equal(sync.games.length,20);assert.equal(sync.nativeFilesChanged,false);
const roots=[join(root,'Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const deliveryAudits=[];
for(const delivery of roots){
 const manifest=read(join(delivery,'manifest.json'));assert.deepEqual(manifest.map(g=>g.id),ids);
 for(const g of manifest){
  assert.equal(g.situationAudioRevision,revision);
  const audio=join(delivery,g.folder,`F${g.id}_H5/audio`),credits=read(join(audio,'credits.json')),tracks=read(join(audio,'music-manifest.json'));
  assert.equal(tracks.situationRevision,revision);assert.equal(tracks.tracks.length,24);
  assert.equal(credits.music.length,2);assert.equal(credits.effects.license,'CC0 1.0');
  assert(existsSync(join(audio,'CC-BY-4.0.html')));
  for(const track of tracks.tracks){assert.equal(hash(join(audio,track.file)),track.sha256);assert(track.sourceUrl&&track.sourceSha256&&track.license);}
  const spin=tracks.tracks.find(t=>t.id==='music-spin'),cabinet=tracks.tracks.find(t=>t.id==='music-cabinet');
  assert.equal(spin.sourceSha256,cabinet.sourceSha256);assert(spin.sourcePassage.start>=96);
  // curated-audio.mjs trims the cabinet from zero to duration + one second;
  // its one-second join shortens the output but never moves the source cut.
  assert(cabinet.duration+1<spin.sourcePassage.start,'Spin passage overlaps cabinet source cut F'+g.id);
 }
 const run=spawnSync(process.execPath,[join(root,'tools/webp-iap/audit-delivery.mjs'),delivery],{cwd:root,encoding:'utf8',maxBuffer:16*1024*1024});
 process.stdout.write(run.stdout);assert.equal(run.status,0,run.stderr);
 const audit=read(join(root,'tools/webp-iap/verification/delivery-audit.json'));
 assert.equal(audit.out,delivery);deliveryAudits.push(audit);
}
const report={checkedAt:new Date().toISOString(),revision,scope:ids,missingRepositoryGame:32,
 limitations:['No human listening evaluation','No physical iPhone playback or memory measurement','F26 streams directly through HTMLAudioElement: timing/mute/volume and offline file decode audited, no live WebAudio RMS capture','Five payout fixtures use each game\'s existing tier mapping; they do not claim every game has five distinct award tiers','No dedicated zero-win fixture in this pass','Unsigned builds do not verify signing, App Store approval or live StoreKit payment'],
 implementation:{independentBackgroundWorks:40,distinctLaterSpinPassages:20,clipsPerGame:24,uniqueDecodedFiles:91,runtimeToneSynthesis:false,backgroundFullPcmDecode:false,awardMusic:'Existing short authored stings, not new full-length award scores',modalMusic:'Existing environment track ducked; no unrelated new track',changedGameMath:false,changedNativeIAPSigning:false},
 situations:[...situations.values()].sort((a,b)=>a.id-b.id),feedback:[...feedback.values()].sort((a,b)=>a.id-b.id),music:[...music.values()].sort((a,b)=>a.id-b.id),native:[...native.values()].sort((a,b)=>a.id-b.id),deliveryAudits,sync,audioAudit:decoded};
const serialized=JSON.stringify(report,null,2)+'\n';
writeFileSync(join(out,'final-report.json'),serialized);
for(const delivery of roots)writeFileSync(join(delivery,'情景音乐验证.json'),serialized);
console.log('20/20 situation browser checks, fresh unsigned arm64 builds and both delivery audits passed.');
console.log(join(out,'final-report.json'));
