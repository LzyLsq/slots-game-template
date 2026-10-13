// F20-only delivery refresh. Do not import the general installer or modify IAP.
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,renameSync} from 'node:fs';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {compressWeb} from '../webp-iap/webp.mjs';
const root=join(import.meta.dirname,'../..');
const source=join(root,'完整游戏模版/全游戏模版/F20_Golden_Canopy_v1.0.0/build/web-mobile');
const targets=[join(root,'Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const log=readFileSync('/tmp/f20-blink-creator-20261013.log','utf8');
assert(log.includes('build Task (web-mobile) Finished'),'Fresh Creator build did not complete');
assert(readFileSync(join(source,'assets/main/index.js'),'utf8').includes('CanopyBlinkRig'),'Fresh blink component missing');
const backup=mkdtempSync('/Users/mengjunzhu/Desktop/F20_眨眼修复前备份_20261013.');
const stage=mkdtempSync('/tmp/f20-blink-delivery.');
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
function save(file,text){const old=existsSync(file)?readFileSync(file,'utf8'):null;let patch='*** Begin Patch\n'+(old===null?'*** Add File: ':'*** Update File: ')+file+'\n';if(old!==null)patch+='@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n';patch+=text.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';execFileSync('apply_patch',[],{input:patch});}
const destinations=targets.map(base=>{
 const manifest=join(base,'manifest.json'),records=JSON.parse(readFileSync(manifest)),record=records.find(row=>row.id===20);
 assert(record&&record.folder==='F20_Golden_Canopy_OC_StoreKit2_Xcode');
 const project=join(base,record.folder),web=join(project,'F20_H5');
 assert(existsSync(join(web,'ios-wrapper'))&&existsSync(join(project,'DBGame')),'Missing native delivery '+base);
 return {base,manifest,records,record,project,web};
});
const protectedFiles=new Map(destinations.flatMap(d=>[...files(join(d.project,'DBGame')),...files(join(d.web,'ios-wrapper'))].map(f=>[f,hash(f)])));
// The rebuilt game's music files must be identical to the latest approved mix.
for(const d of destinations)for(const file of files(join(d.web,'audio'))){
 const matching=join(source,'audio',relative(join(d.web,'audio'),file));
 assert(existsSync(matching),'Missing audio '+matching);assert.equal(hash(file),hash(matching),'Music would regress: '+matching);
}
const compiled=join(stage,'compiled');cpSync(source,compiled,{recursive:true,filter:f=>!f.endsWith('.map')&&!f.endsWith('.DS_Store')});
const compression=await compressWeb(compiled);
const refreshed=[];
for(const [index,d] of destinations.entries()){
 const next=join(stage,'next-'+index);cpSync(compiled,next,{recursive:true});
 cpSync(join(d.web,'ios-wrapper'),join(next,'ios-wrapper'),{recursive:true});
 if(existsSync(join(d.web,'reports')))cpSync(join(d.web,'reports'),join(next,'reports'),{recursive:true});
 const previous=join(backup,'delivery-'+index,'F20_H5');mkdirSync(join(backup,'delivery-'+index),{recursive:true});
 cpSync(d.manifest,join(backup,'delivery-'+index,'manifest.json'));
 renameSync(d.web,previous);
 try{renameSync(next,d.web);}catch(error){renameSync(previous,d.web);throw error;}
 const record=d.record;record.webBytes=compression.after;
 record.compression={...compression};
 record.sourceBuildRefreshedAt=new Date().toISOString();record.mascotAnimationRevision='registered-eyelids-only-20261013';
 record.blinkAnimation={characters:7,eyes:14,originallyClosedCabinet:'pearl-palace',bodyDeformation:false,atlas:[1024,512]};
 record.previousBlinkWebBackup=previous;
 save(d.manifest,JSON.stringify(d.records,null,2));refreshed.push(d.project);
}
for(const [file,old] of protectedFiles)assert.equal(hash(file),old,'Native/IAP/signing unexpectedly changed '+file);
const report={date:new Date().toISOString(),source,backup,refreshed,compression,nativeFilesChanged:false,protectedFiles:protectedFiles.size,musicFilesUnchanged:true};
save(join(backup,'sync-report.json'),JSON.stringify(report,null,2));
save(join(import.meta.dirname,'verification/f20-blink-20261013/sync-report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
