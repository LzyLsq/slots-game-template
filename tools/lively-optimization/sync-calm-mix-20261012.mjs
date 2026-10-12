// Synchronize only verified Web resources. Native signing, StoreKit and F14
// are protected. APFS clone copies avoid doubling the immutable media assets.
import assert from 'node:assert/strict';
import {cpSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,existsSync,renameSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {walk} from '../webp-iap/webp.mjs';
import {games,roots,revision} from './calm-mix-projects.mjs';
const buildFile=process.argv.find(a=>a.startsWith('--build='))?.slice(8);
const qaFile=process.argv.find(a=>a.startsWith('--qa='))?.slice(5);
assert(buildFile&&qaFile,'Require --build=results.json and --qa=results.json');
const builds=JSON.parse(readFileSync(buildFile)),qa=JSON.parse(readFileSync(qaFile));
const backup=JSON.parse(readFileSync(join(import.meta.dirname,'verification/calm-backup-path.json'))).backup;
const before=JSON.parse(readFileSync(join(backup,'before.json')));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const nativeHashCheck=()=>{for(const [file,expected] of before.native)assert.equal(hash(file),expected,'Native changed '+file);};
nativeHashCheck();for(const [file,expected] of before.audio)assert.equal(hash(file),expected,'Original composition changed '+file);
const manifests=roots.map(r=>JSON.parse(readFileSync(join(r,'manifest.json'))));
const manifestText=roots.map(r=>readFileSync(join(r,'manifest.json'),'utf8'));
const f14Before=manifests.map(m=>JSON.stringify(m.find(g=>g.id===14)));
const f14Hashes=roots.flatMap((r,i)=>walk(join(r,manifests[i].find(g=>g.id===14).folder)).map(file=>[file,hash(file)]));
for(const g of games){
 assert(qa.games.find(r=>r.id===g.id)?.passed,'Browser verification not passed F'+g.id);
 if(g.id!==26)assert(builds.find(r=>r.id===g.id)?.success&&builds.find(r=>r.id===g.id)?.compression,'Build not passed F'+g.id);
 const code=walk(g.build).filter(p=>p.endsWith('.js')).map(p=>readFileSync(p,'utf8')).join('\n');
 assert(code.includes(revision),'Wrong mixer build F'+g.id);
}
// Preflight every target before replacing any directory. A failed copy or
// verification leaves the previous delivery available at its original path.
for(const g of games)for(const [i,r] of roots.entries()){
 const target=join(r,g.folder,`F${g.id}_H5`),previous=join(backup,'previous-web',String(i),`F${g.id}_H5`);
 assert(existsSync(join(target,'ios-wrapper')),'Missing native wrapper '+target);
 assert(!existsSync(previous),'Backup already exists '+previous);
}
const synced=[],committed=[];
try{for(const g of games){
 const hashes=walk(g.build).map(file=>[file.slice(g.build.length+1),hash(file)]);
 const bytes=walk(g.build).reduce((total,p)=>total+statSync(p).size,0);
 for(const [i,r] of roots.entries()){
  const target=join(r,g.folder,`F${g.id}_H5`),stage=mkdtempSync(join(r,`.calm-F${g.id}-`)),next=join(stage,'web'),previous=join(backup,'previous-web',String(i),`F${g.id}_H5`);
  assert(!existsSync(previous),'Backup already exists '+previous);
  execFileSync('/bin/cp',['-cR',g.build,next]);
  assert(!existsSync(join(next,'ios-wrapper')),'Build must not contain native wrapper');
  execFileSync('/bin/cp',['-cR',join(target,'ios-wrapper'),join(next,'ios-wrapper')]);
  if(existsSync(join(target,'reports')))for(const file of walk(join(target,'reports'))){
   const dest=join(next,'reports',file.slice(join(target,'reports').length+1));
   if(!existsSync(dest)){mkdirSync(join(dest,'..'),{recursive:true});execFileSync('/bin/cp',['-c',file,dest]);}
  }
  for(const [file,expected] of hashes)assert.equal(hash(join(next,file)),expected,'Staged Web sync mismatch '+file);
  for(const [file,expected] of before.native)if(file.startsWith(join(target,'ios-wrapper')+'/'))assert.equal(hash(join(next,file.slice(target.length+1))),expected,'Staged native mismatch '+file);
  mkdirSync(join(previous,'..'),{recursive:true});renameSync(target,previous);
  try{renameSync(next,target);}catch(error){renameSync(previous,target);throw error;}
  committed.push({target,previous,stage});
  for(const [file,expected] of hashes)assert.equal(hash(join(target,file)),expected,'Web sync mismatch '+file);
  const entry=manifests[i].find(m=>m.id===g.id);
  entry.calmMixRevision=revision;entry.sourceBuildRefreshedAt=new Date().toISOString();
  entry.webBytes=bytes;if(entry.compression){entry.compression.after=bytes;entry.compression.savedBytes=entry.compression.before-bytes;}
  entry.previousCalmMixWebBackup=previous;
 }
 synced.push({id:g.id,webFiles:hashes.length,webBytes:bytes});console.log(`F${g.id}: both Xcode delivery Web folders synchronized`);
}
nativeHashCheck();
for(const [file,expected] of before.audio)assert.equal(hash(file),expected,'Original composition changed '+file);
for(const [file,expected] of f14Hashes)assert.equal(hash(file),expected,'F14 delivery changed '+file);
for(let i=0;i<2;i++){
 assert.equal(JSON.stringify(manifests[i].find(g=>g.id===14)),f14Before[i],'F14 metadata changed');
 writeFileSync(join(roots[i],'manifest.json'),JSON.stringify(manifests[i],null,2));
}
}catch(error){
 for(const {target,previous,stage} of committed.reverse()){
  renameSync(target,join(stage,'failed-web'));renameSync(previous,target);
 }
 for(const [i,r] of roots.entries())writeFileSync(join(r,'manifest.json'),manifestText[i]);
 throw error;
}
const report={checkedAt:new Date().toISOString(),revision,backup,buildFile,qaFile,games:synced,protectedNativeFilesVerified:before.native.length,nativeFilesChanged:false,originalCompositionFilesVerified:before.audio.length,f14DeliveryFilesVerified:f14Hashes.length,f14Unchanged:true};
writeFileSync(join(backup,'sync-report.json'),JSON.stringify(report,null,2));
const out=join(import.meta.dirname,'verification/calm-mix-20261012');mkdirSync(out,{recursive:true});writeFileSync(join(out,'delivery.json'),JSON.stringify(report,null,2));cpSync(qaFile,join(out,'browser.json'));
console.log(`Completed ${games.length} games. Native files unchanged: ${before.native.length}. Backup: ${backup}`);
