// Replace generated Web assets only. F14's original native bridge, StoreKit,
// signing, icons, schemes and app delegate are protected by pre-change hashes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,cpSync,mkdtempSync,renameSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const root=join(import.meta.dirname,'../..');
const option=k=>process.argv.find(a=>a.startsWith('--'+k+'='))?.slice(k.length+3);
const backup=option('backup'),buildResults=option('build-results');
const reportDir=option('report-dir')||join(import.meta.dirname,'verification/f14-approved-music-20261012');
const calm=process.argv.includes('--calm');
const saved=JSON.parse(readFileSync(join(backup,'backup.json')));
const build=JSON.parse(readFileSync(buildResults)).find(g=>g.id===14);
assert(build?.success&&build.compression,'Fresh F14 Cocos build and WebP pass required');
const source=join(saved.source,'build/web-mobile');
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const assertNative=()=>{for(const [f,h] of Object.entries(saved.protectedFiles))assert.equal(hash(f),h,'Protected native file changed: '+f);};
assertNative();
const approved=JSON.parse(readFileSync(join(source,'audio/music-manifest.json')));
assert.equal(approved.revision,'f14-approved-compositions-event-aligned-20261012');
const scripts=walk(source).filter(f=>f.endsWith('.js'));
assert(scripts.some(f=>readFileSync(f,'utf8').includes('music-cabinet-golden-hour')),'Fresh AudioManager missing from compiled JS');
if(calm){
 assert(scripts.some(f=>readFileSync(f,'utf8').includes('f14-calm-single-focus-20261012')),'Fresh calm mix missing');
 assert(JSON.parse(readFileSync(join(reportDir,'browser.json'))).passed,'Calm mix browser verification required');
}
const files=walk(source).filter(f=>!f.endsWith('.map')&&!f.endsWith('.DS_Store')&&!f.includes('/reports/')&&!f.includes('/ios-wrapper/'));
const sourceHashes=files.map(f=>[f.slice(source.length+1),hash(f)]);
const stage=mkdtempSync(join(tmpdir(),'f14-approved-delivery.'));
const copies=[];
for(const [i,pkg] of saved.packages.entries()){
 const target=join(pkg,'F14_H5'),next=join(stage,'next'+i),previous=join(backup,'previous-web-after-backup-'+i);
 cpSync(source,next,{recursive:true,filter:f=>!f.endsWith('.map')&&!f.endsWith('.DS_Store')&&!f.includes('/reports/')&&!f.includes('/ios-wrapper/')});
 cpSync(join(target,'ios-wrapper'),join(next,'ios-wrapper'),{recursive:true});
 if(existsSync(join(target,'reports')))cpSync(join(target,'reports'),join(next,'reports'),{recursive:true});
 renameSync(target,previous);
 try{renameSync(next,target);}catch(e){renameSync(previous,target);throw e;}
 for(const [f,h] of sourceHashes)assert.equal(hash(join(target,f)),h,'Generated Web mismatch: '+f);
 const manifestFile=join(pkg,'../manifest.json');
 copyManifest: {
  assert(existsSync(manifestFile));cpSync(manifestFile,join(backup,'delivery-manifest-'+i+'.json'));
  const manifest=JSON.parse(readFileSync(manifestFile)),entry=manifest.find(g=>g.id===14);
  assert(entry);const webBytes=files.reduce((n,f)=>n+readFileSync(f).length,0);
  entry.webBytes=webBytes;entry.approvedMusicRevision=approved.revision;
  entry.approvedMusicUpdatedAt=new Date().toISOString();entry.approvedMusicBackup=backup;
  entry.audioNotes='Six authored background works: two lobby playlist entries and four cabinet tracks. Five closing award excerpts aligned to existing presentation. Spin does not restart music. Not commissioned stems or verified seamless loops.';
  if(calm){entry.audioMixRevision='f14-calm-single-focus-20261012';entry.audioMixNotes='Sequential scene fades. Background muted during award melody, then smooth recovery. Three sparse count accents, category-throttled low-volume SFX.';}
  writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 }
 copies.push({target,files:sourceHashes.length,bytes:files.reduce((n,f)=>n+readFileSync(f).length,0)});
}
assertNative();
const report={checkedAt:new Date().toISOString(),revision:approved.revision,mixRevision:calm?'f14-calm-single-focus-20261012':undefined,buildResults,copies,
 protectedNativeFiles:Object.keys(saved.protectedFiles).length,nativeFilesChanged:false,backup,
 scope:'F14 only, both existing deliveries. No other games, probability, payouts, products or signing edited.'};
writeFileSync(join(backup,'delivery-sync.json'),JSON.stringify(report,null,2)+'\n');
mkdirSync(reportDir,{recursive:true});
writeFileSync(join(reportDir,'sync.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
