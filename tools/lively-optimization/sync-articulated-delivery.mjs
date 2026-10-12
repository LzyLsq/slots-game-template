import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,renameSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {compressWeb} from '../webp-iap/webp.mjs';

// Read manifests only: importing the original installer would rewrite unrelated
// native/IAP source. Preserve each destination's own ios-wrapper and project.
const root=join(import.meta.dirname,'../..');
const sourceBase=join(root,'完整游戏模版/全游戏模版');
const repository=join(root,'Xcode_H5/WebP_IAP_20261010');
const desktop='/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010';
const resultsPaths=process.argv.filter(a=>a.startsWith('--build-results=')).map(a=>a.slice('--build-results='.length));
const selectedIds=process.argv.find(a=>a.startsWith('--ids='))?.slice('--ids='.length).split(',').map(Number)||[];
assert(resultsPaths.length,'Specify fresh Creator --build-results=.../results.json');
// Later result files supersede the original full build for repaired projects.
const buildResults=new Map(resultsPaths.flatMap(file=>JSON.parse(readFileSync(file)).map(result=>[result.id,result])));
const backup=mkdtempSync(join(tmpdir(),'mascot-delivery-backup.'));
const names=readdirSync(sourceBase),records=JSON.parse(readFileSync(join(repository,'manifest.json'))),synced=[];
function protectedHashes(dir){
 const entries=readdirSync(dir,{withFileTypes:true});
 return entries.flatMap(e=>e.isDirectory()?protectedHashes(join(dir,e.name)):[[join(dir,e.name),createHash('sha256').update(readFileSync(join(dir,e.name))).digest('hex')]]);
}
// Resolve all destinations before replacing even the first generated Web folder.
for(const item of records.filter(g=>g.id!==26)){
 const result=buildResults.get(item.id);assert(result?.success&&result?.compression,'Fresh build incomplete F'+item.id);
 for(const targetRoot of [repository,desktop])assert(existsSync(join(targetRoot,item.folder,`F${item.id}_H5/ios-wrapper`)),'Missing native wrapper F'+item.id);
}
const protectedBefore=new Map(records.flatMap(item=>[repository,desktop].flatMap(targetRoot=>[
 ...protectedHashes(join(targetRoot,item.folder,'DBGame')),
 ...protectedHashes(join(targetRoot,item.folder,`F${item.id}_H5/ios-wrapper`)),
])));
console.log('Recoverable Web backups: '+backup);
for(const item of records){
 if(item.id===26)continue; // Pure web title has no mascot/photo-motion change.
 if(selectedIds.length&&!selectedIds.includes(item.id))continue;
 const result=buildResults.get(item.id);
 assert(result?.success&&result?.compression,'Fresh build incomplete F'+item.id);
 const project=join(sourceBase,names.find(n=>n.startsWith(`F${item.id}_`)&&(item.id!==25||n.includes('_Cocos_'))));
 const source=join(project,'build/web-mobile');assert(existsSync(join(source,'index.html')));
 const staging=mkdtempSync(join(tmpdir(),`mascot-web-F${item.id}.`));
 const compiled=join(staging,'web');
 cpSync(source,compiled,{recursive:true,filter:f=>!f.endsWith('.DS_Store')&&!f.endsWith('.map')&&!f.includes('/ios-wrapper/')});
 const compression=await compressWeb(compiled);
 for(const [label,targetRoot] of [['repository',repository],['desktop',desktop]]){
  const target=join(targetRoot,item.folder,`F${item.id}_H5`);
  assert(existsSync(join(target,'ios-wrapper')),'Missing native wrapper '+target);
  const next=join(staging,label);cpSync(compiled,next,{recursive:true});
  cpSync(join(target,'ios-wrapper'),join(next,'ios-wrapper'),{recursive:true});
  const previous=join(backup,label,`F${item.id}_H5`);mkdirSync(join(backup,label),{recursive:true});
  renameSync(target,previous);
  try{renameSync(next,target);}catch(error){renameSync(previous,target);throw error;}
  const file=join(targetRoot,'manifest.json'),manifest=JSON.parse(readFileSync(file));
  const current=manifest.find(g=>g.id===item.id);
  // Keep the original uncompressed baseline; this build already contains WebP.
  current.webBytes=compression.after;current.compression={...current.compression,after:compression.after,savedBytes:current.compression.before-compression.after};
  current.sourceBuildRefreshedAt=new Date().toISOString();current.mascotAnimationRevision='articulated-alpha-20261010';current.previousGeneratedWebBackup=previous;
  writeFileSync(file,JSON.stringify(manifest,null,2));
 }
 synced.push({id:item.id,webBytes:compression.after,source:project});console.log(`F${item.id}: source, WebP and both Xcode deliveries synchronized`);
}
for(const [file,hash] of protectedBefore)assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),hash,'Native/signing file unexpectedly changed '+file);
const report={date:new Date().toISOString(),backup,buildResults:resultsPaths,games:synced,nativeFilesChanged:false,protectedNativeFilesVerified:protectedBefore.size};
writeFileSync(join(backup,'sync-report.json'),JSON.stringify(report,null,2));
writeFileSync(join(import.meta.dirname,'verification/articulated-delivery.json'),JSON.stringify(report,null,2));
console.log('Synced '+synced.length+' changed games; F26 untouched.');
