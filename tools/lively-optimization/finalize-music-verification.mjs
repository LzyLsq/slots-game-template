// Preserve compact test evidence; never copy DerivedData or change app settings.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,cpSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const ids=[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33];
const out=join(import.meta.dirname,'verification/music-20261010');
mkdirSync(out,{recursive:true});
const args=name=>process.argv.filter(a=>a.startsWith(`--${name}=`)).map(a=>a.slice(name.length+3));
const read=file=>JSON.parse(readFileSync(file));
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function collect(name,key){
 const map=new Map(),inputs=args(name);assert(inputs.length,'No '+name+' evidence');
 for(const [i,file] of inputs.entries()){
  const data=read(file);cpSync(file,join(out,`${name}-${i+1}.json`));
  for(const row of data[key])map.set(row.id,{...row,evidence:`${name}-${i+1}.json`});
 }
 assert.deepEqual([...map.keys()].sort((a,b)=>a-b),ids,name+' must cover every game');
 for(const row of map.values())assert(row.passed,name+' failed F'+row.id);
 return ids.map(id=>map.get(id));
}
const music=collect('music','games'),native=collect('native','results'),wins=collect('wins','games');
for(const row of music){
 assert.equal(row.checks.filter(c=>c.mode!==undefined).length,4,'Four cabinet music checks F'+row.id);
 // Older F26 DOM evidence has no scene field; verify its actual playing URL.
 const homePlayed=row.checks.some(c=>c.scene==='home'||(row.id===26&&c.mode===undefined&&c.elements?.some(e=>/\/audio\/music-home\.m4a(?:\?|$)/.test(e.src)&&!e.paused&&e.time>0)));
 assert(homePlayed&&row.checks.some(c=>c.toggleRestored)&&row.checks.some(c=>c.backgroundRestored),'Home/toggle/background music checks F'+row.id);
}
const auditFiles=args('audit');assert.equal(auditFiles.length,2);
const audits=auditFiles.map((file,i)=>{const data=read(file);assert.deepEqual(data.games.map(g=>g.id),ids);assert(data.games.every(g=>g.passed));cpSync(file,join(out,`audit-${i+1}.json`));return data;});
const signalFile=args('signal')[0];assert(signalFile);const signal=read(signalFile);
assert.deepEqual([...new Set(signal.reports.map(r=>r.id))].sort((a,b)=>a-b),ids);
cpSync(signalFile,join(out,'decoded-audio.json'));
const lifecycle=read(join(import.meta.dirname,'verification/native-music-lifecycle.json'));
assert.equal(lifecycle.targets.length,40,'Both delivery copies need native lifecycle wiring');
for(const t of lifecycle.targets)assert.equal(hash(t.file),t.afterSha256,'Stale native lifecycle file '+t.file);
cpSync(join(import.meta.dirname,'verification/native-music-lifecycle.json'),join(out,'native-lifecycle.json'));
const sync=read(join(import.meta.dirname,'verification/profitable-delivery.json'));assert.equal(sync.games.length,20);
cpSync(join(import.meta.dirname,'verification/profitable-delivery.json'),join(out,'web-sync.json'));
const recordings=new Set(),deliveryChecks=[];
for(const audit of audits){
 const manifest=read(join(audit.out,'manifest.json'));
 for(const g of manifest){
  assert.equal(g.musicPlaybackRevision,'boot-scene-toggle-native-lifecycle-20261010');
  const web=join(audit.out,g.folder,`F${g.id}_H5`),tracks=['home','cabinet'].map(scene=>({scene,sha256:hash(join(web,`audio/music-${scene}.m4a`))}));
  for(const t of tracks){
   const key=`F${g.id}-${t.scene}`;
   const previous=deliveryChecks.find(c=>c.key===key);
   if(previous)assert.equal(t.sha256,previous.sha256,'Delivery music mismatch '+key);
   else{assert(!recordings.has(t.sha256),'Duplicate background music '+key);recordings.add(t.sha256);deliveryChecks.push({key,sha256:t.sha256});}
  }
 }
}
const report={checkedAt:new Date().toISOString(),ids,passed:true,music,native,wins,decodedAudio:signal.reports.length,distinctBackgroundTracks:recordings.size,audits:audits.map(a=>({out:a.out,games:a.games})),nativeLifecycleFiles:lifecycle.targets.length,unchangedOtherNativeFiles:lifecycle.protectedUnchangedFiles,deliveryChecks,limitations:['Browser playback/lifecycle verification is not an iPhone hardware listening test.','Unsigned arm64 Release compilation is not a signed install, Sandbox payment, TestFlight, or App Store approval.','No probability, settlement, account data, product IDs or signing settings were changed by the music fix.'],previousWebBackup:sync.backup,previousAppDelegateBackup:lifecycle.backup};
writeFileSync(join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
for(const a of audits)cpSync(join(out,'results.json'),join(a.out,'音乐与大奖验证.json'));
console.log(`Verified ${ids.length} games, ${recordings.size} distinct BGM files, ${lifecycle.targets.length} native lifecycle files. Report: ${join(out,'results.json')}`);
