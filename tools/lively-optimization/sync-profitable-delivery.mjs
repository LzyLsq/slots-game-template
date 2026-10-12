import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,renameSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {compressWeb,walk} from '../webp-iap/webp.mjs';
const require=createRequire(import.meta.url);
const ts=require('/Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript');

// Release minification renames total/bet. Resolve the actual compiled export
// and execute boundary cases; spelling a source expression is not verification.
function verifyCompiledPolicy(files,id){
 let policy;
 for(const file of files){
  const source=readFileSync(file,'utf8');if(!source.includes('isBigWin'))continue;
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const functions=new Map(),exports=[];
  const visit=node=>{
   if(ts.isFunctionDeclaration(node)&&node.name){functions.set(node.name.text,node);if(node.name.text==='isBigWin')policy=node;}
   if(ts.isPropertyAssignment(node)&&node.name?.getText(ast)==='isBigWin'&&ts.isFunctionExpression(node.initializer))policy=node.initializer;
   if(ts.isCallExpression(node)&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])&&node.arguments[0].text==='isBigWin'&&ts.isIdentifier(node.arguments[1]))exports.push(node.arguments[1].text);
   ts.forEachChild(node,visit);
  };visit(ast);
  for(const name of exports)if(functions.has(name))policy=functions.get(name);
  if(policy){
   const fn=Function('return ('+policy.getText(ast)+');')();
   for(const [total,bet,expected] of [[0,100,false],[99,100,false],[100,100,false],[100.001,100,true],[101,100,true],[10000,100,true],[1,0,false],[NaN,100,false],[Infinity,100,false],[101,NaN,false]])assert.equal(fn(total,bet),expected,'Compiled win policy F'+id);
   return;
  }
 }
 assert.fail('Missing compiled isBigWin export F'+id);
}

// Update Web resources only. Never import the installer: native/IAP/signing
// files belong to each delivery and must remain byte-for-byte unchanged.
const root=join(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const roots=[join(root,'Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const buildFiles=process.argv.filter(a=>a.startsWith('--build-results=')).map(a=>a.slice(16));
assert(buildFiles.length,'Provide fresh --build-results=.../results.json');
const builds=new Map(buildFiles.flatMap(f=>JSON.parse(readFileSync(f)).map(r=>[r.id,r])));
const records=JSON.parse(readFileSync(join(roots[0],'manifest.json'))),names=readdirSync(base);
assert.deepEqual(records.map(g=>g.id),[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33]);
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const native=new Map(),sources=new Map(),ignoredNativeUIFiles=[];
// Xcode can save its per-user window/selection state while this tool is running.
// Preserve it, but do not treat it as source/signing/IAP configuration. Keep
// checking actual user schemes and every shared project/scheme/native file.
const nativeUIState=file=>file.includes('/xcuserdata/')&&!file.endsWith('.xcscheme');
for(const g of records){
 const project=join(base,names.find(n=>n.startsWith(`F${g.id}_`)&&(g.id!==25||n.includes('_Cocos_'))));
 const source=join(project,g.id===26?'dist':'build/web-mobile');
 assert(existsSync(join(source,'index.html')),'No Web build F'+g.id);
 if(g.id!==26)assert(builds.get(g.id)?.success&&builds.get(g.id)?.compression,'Fresh build failed F'+g.id);
 verifyCompiledPolicy(walk(source).filter(f=>f.endsWith('.js')),g.id);
 sources.set(g.id,source);
 for(const dest of roots){
  for(const folder of [join(dest,g.folder,'DBGame'),join(dest,g.folder,`F${g.id}_H5/ios-wrapper`)]){
   assert(existsSync(folder),'Missing protected native folder '+folder);
   for(const file of walk(folder)){
    if(nativeUIState(file))ignoredNativeUIFiles.push(file);
    else native.set(file,hash(file));
   }
  }
 }
}
const backup=mkdtempSync(join(tmpdir(),'profitable-win-delivery.')),games=[];
console.log('Recoverable old Web folders: '+backup);
writeFileSync(join(backup,'protected-native-before.json'),JSON.stringify({files:[...native],ignoredNativeUIFiles},null,2));
for(const g of records){
 const stage=mkdtempSync(join(tmpdir(),`profitable-F${g.id}.`)),web=join(stage,'web');
 cpSync(sources.get(g.id),web,{recursive:true,filter:p=>!p.endsWith('.map')&&!p.endsWith('.DS_Store')&&!p.includes('/ios-wrapper/')&&!p.includes('/reports/')});
 const compression=await compressWeb(web,g.id===26);
 const webHashes=walk(web).map(f=>[f.slice(web.length+1),hash(f)]);
 for(const [i,dest] of roots.entries()){
  const target=join(dest,g.folder,`F${g.id}_H5`),next=join(stage,'next'+i),previous=join(backup,String(i),`F${g.id}_H5`);
  cpSync(web,next,{recursive:true});cpSync(join(target,'ios-wrapper'),join(next,'ios-wrapper'),{recursive:true});
  if(existsSync(join(target,'reports')))cpSync(join(target,'reports'),join(next,'reports'),{recursive:true});
  mkdirSync(join(backup,String(i)),{recursive:true});renameSync(target,previous);
  try{renameSync(next,target);}catch(e){renameSync(previous,target);throw e;}
  for(const [path,expected] of webHashes)assert.equal(hash(join(target,path)),expected,'Web sync mismatch '+path);
  const file=join(dest,'manifest.json'),manifest=JSON.parse(readFileSync(file)),entry=manifest.find(m=>m.id===g.id);
  entry.webBytes=compression.after;entry.compression={...entry.compression,after:compression.after,savedBytes:entry.compression.before-compression.after};
  entry.sourceBuildRefreshedAt=new Date().toISOString();entry.winPresentationRevision='total-return-strictly-over-stake-20261010';
  entry.musicPlaybackRevision='authored-unique-loops-curated-pcm-feedback-20261010';
  entry.situationAudioRevision='accepted-spin-last-reel-modal-award-20261010';
  entry.feedbackRevision='animation-events-rate-limited-count-reel-collect-20261010';
  entry.previousGeneratedWebBackup=previous;writeFileSync(file,JSON.stringify(manifest,null,2));
 }
 games.push({id:g.id,source:sources.get(g.id),webBytes:compression.after,verifiedWebFiles:webHashes.length});
 console.log(`F${g.id}: WebP + strict win policy synchronized to both Xcode deliveries`);
}
for(const [file,expected] of native)assert.equal(hash(file),expected,'Protected native file changed '+file);
const report={checkedAt:new Date().toISOString(),backup,buildFiles,games,nativeFilesChanged:false,protectedNativeFilesVerified:native.size,ignoredNativeUIFiles};
writeFileSync(join(backup,'sync-report.json'),JSON.stringify(report,null,2));
mkdirSync(join(import.meta.dirname,'verification'),{recursive:true});
writeFileSync(join(import.meta.dirname,'verification/profitable-delivery.json'),JSON.stringify(report,null,2));
console.log(`All ${games.length} games synchronized; ${native.size} native files unchanged.`);
