// Delivery verification (animation / awards / music). No installer imports, signing mutations,
// simulator launches, or edits to Native / StoreKit sources.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdtempSync,createWriteStream} from 'node:fs';
import {join,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const delivery='/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010';
const ids=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number),out=mkdtempSync(join(tmpdir(),'mascot-native.')),results=[];
const waitRevision=process.argv.find(a=>a.startsWith('--wait-web-revision='))?.slice(20);
const situationOption='--wait-situation-revision=';
const waitSituation=process.argv.find(a=>a.startsWith(situationOption))?.slice(situationOption.length);
const reuseOption='--reuse-derived-report=';
const reuseFile=process.argv.find(a=>a.startsWith(reuseOption))?.slice(reuseOption.length);
const previousNative=reuseFile?JSON.parse(readFileSync(reuseFile)).native:[];
assert(Array.isArray(previousNative),'Prior native results must be an array');
if(waitRevision){
 console.log('Waiting for verified Web delivery: '+waitRevision);
 let ready=false;
 for(let i=0;i<600;i++){
  const current=JSON.parse(readFileSync(join(delivery,'manifest.json')));
  if(current.filter(g=>(ids.length?ids:[20,21,25]).includes(g.id)).every(g=>g.winPresentationRevision===waitRevision)){ready=true;break;}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 assert(ready,'Timed out waiting for fresh synchronized Web resources');
}
const manifest=JSON.parse(readFileSync(join(delivery,'manifest.json')));
console.log('Native build evidence: '+out);
function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);}
function hash(file){return createHash('sha256').update(readFileSync(file)).digest('hex');}
for(const g of manifest.filter(g=>(ids.length?ids:[20,21,25]).includes(g.id))){
 if(waitSituation){
  let ready=false;
  for(let i=0;i<600;i++){
   const live=JSON.parse(readFileSync(join(delivery,'manifest.json'))).find(row=>row.id===g.id);
   if(live?.situationAudioRevision===waitSituation){ready=true;break;}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  assert(ready,'Fresh situation audio delivery missing F'+g.id);
 }
 const previous=previousNative.find(r=>r.id===g.id&&r.passed&&r.unsignedArm64Build);
 const derived=previous?(previous.derivedData||join(previous.log,'..',`F${g.id}-DerivedData`)):join(out,`F${g.id}-DerivedData`);
 if(previous)assert(existsSync(derived),'Prior DerivedData no longer exists: '+derived);
 const logFile=join(out,`F${g.id}.log`),log=createWriteStream(logFile),name=g.title.replaceAll(' ',''),start=Date.now();
 const child=spawn('xcodebuild',['-project',g.project,'-scheme',name+'-Release','-configuration','Release','-sdk','iphoneos','-destination','generic/platform=iOS','-derivedDataPath',derived,'CODE_SIGNING_ALLOWED=NO','build'],{stdio:['ignore','pipe','pipe']});
 let tail='';for(const s of[child.stdout,child.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-50000);});
 const code=await new Promise(resolve=>{child.on('error',e=>{tail+=String(e);resolve(-1);});child.on('close',resolve);});log.end();
 let copiedFiles=0,error;
 try{
  assert.equal(code,0,tail.slice(-3000));assert(tail.includes('BUILD SUCCEEDED'));
  const app=join(derived,'Build/Products/Release-iphoneos',name+'H5.app/web'),web=join(delivery,g.folder,`F${g.id}_H5`);assert(existsSync(app));
  const sourceFiles=files(web).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/'));
  for(const file of sourceFiles){const target=join(app,relative(web,file));assert(existsSync(target),'Missing bundle resource '+target);assert.equal(hash(file),hash(target),'Stale bundle resource '+target);copiedFiles++;}
 }catch(e){error=String(e);}
 results.push({id:g.id,passed:!error,unsignedArm64Build:true,copiedFiles,seconds:Math.round((Date.now()-start)/1000),log:logFile,derivedData:derived,reusedDerivedData:Boolean(previous),error});
 writeFileSync(join(out,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
 console.log(`F${g.id} native ${error?'FAIL':'PASS'} (${copiedFiles} matching Web files)`);if(error)console.log(error);
}
console.log('Final native results: '+join(out,'results.json'));if(results.some(r=>!r.passed))process.exitCode=1;
