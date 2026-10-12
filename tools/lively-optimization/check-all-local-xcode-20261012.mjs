// Read-only source verification: compile the actual desktop projects, launch
// their real XCTest hosts, and validate the packaged Web assets. No project,
// signing, StoreKit configuration, game source or user device is edited.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,mkdirSync,mkdtempSync,writeFileSync,createWriteStream,statfsSync} from 'node:fs';
import {join,relative,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';

const repo=join(import.meta.dirname,'../..');
const delivery='/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010';
const selected=process.argv.slice(2).filter(x=>/^\d+$/.test(x)).map(Number);
const destination='2C45F638-CEBE-4BC8-9D79-28D0EADB4BF9';
const manifest=JSON.parse(readFileSync(join(delivery,'manifest.json'))).filter(g=>!selected.length||selected.includes(g.id));
const derivedData=join(repo,'tools/webp-iap/verification/DerivedData');
const base=join(import.meta.dirname,'verification');
mkdirSync(base,{recursive:true});
const out=mkdtempSync(join(base,'xcode-all-20261012.'));
function walk(d){return readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);}
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const nativeFiles=manifest.flatMap(g=>{
 const pkg=join(delivery,g.folder);
 return [...walk(join(pkg,'DBGame')),...walk(join(pkg,`F${g.id}_H5/ios-wrapper`))].filter(p=>!p.includes('/xcuserdata/')&&!p.endsWith('.xcuserstate'));
});
const before=nativeFiles.map(p=>[p,hash(p)]);
const report={startedAt:new Date().toISOString(),scope:'Actual local desktop Xcode projects; unsigned simulator build, existing XCTest runtime/WebP/local StoreKit checks, installed-app launch, screenshot and packaged-Web hashes. Not a real iPhone, real Apple login, payment or full manual gameplay test.',delivery,destination,derivedData,out,xcode:execFileSync('xcodebuild',['-version'],{encoding:'utf8'}).trim(),nativeFilesProtected:before.length,results:[]};
const save=()=>writeFileSync(join(out,'results.json'),JSON.stringify(report,null,2)+'\n');
save();console.log('Xcode verification evidence: '+out);
function run(bin,args,logFile,timeout=360000){return new Promise(resolve=>{
 const log=createWriteStream(logFile),p=spawn(bin,args,{cwd:repo,stdio:['ignore','pipe','pipe']});
 let tail='',timedOut=false;
 for(const s of[p.stdout,p.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-65000);});
 const timer=setTimeout(()=>{timedOut=true;p.kill('SIGTERM');setTimeout(()=>{if(p.exitCode===null)p.kill('SIGKILL');},10000).unref();},timeout);
 p.on('error',e=>{clearTimeout(timer);log.end(String(e));resolve({code:-1,log:logFile,tail:String(e),timedOut});});
 p.on('close',code=>{clearTimeout(timer);log.end();resolve({code,log:logFile,tail,timedOut});});
});}
const devices=JSON.parse(execFileSync('xcrun',['simctl','list','devices','available','--json']));
const runtime=Object.entries(devices.devices).find(([,v])=>v.some(d=>d.udid===destination));
assert(runtime,'Dedicated verification simulator missing');
report.simulator={runtime:runtime[0],...runtime[1].find(d=>d.udid===destination)};save();
if(report.simulator.state!=='Booted')execFileSync('xcrun',['simctl','boot',destination]);
const boot=await run('xcrun',['simctl','bootstatus',destination,'-b'],join(out,'simulator-boot.log'),180000);
assert.equal(boot.code,0,'Simulator boot failed: '+boot.tail);
for(const g of manifest){
 const start=Date.now(),pkg=join(delivery,g.folder),web=join(pkg,`F${g.id}_H5`);
 const project=join(pkg,'DBGame',readdirSync(join(pkg,'DBGame')).find(x=>x.endsWith('.xcodeproj')));
 const scheme=readdirSync(join(project,'xcshareddata/xcschemes')).find(x=>x.endsWith('-LocalTest.xcscheme')).slice(0,-9);
 const item={id:g.id,title:g.title,project,scheme};report.results.push(item);save();
 const fs=statfsSync(pkg),free=fs.bavail*fs.bsize;
 if(free<1.2*1024**3){item.passed=false;item.error='Less than 1.2 GiB free; stopped to protect user files';save();break;}
 console.log(`F${g.id}: actual Xcode simulator build + runtime + WebP + local StoreKit tests`);
 const bundle=join(out,`F${g.id}.xcresult`);
 const test=await run('xcodebuild',['-project',project,'-scheme',scheme,'-destination',`id=${destination}`,'-derivedDataPath',derivedData,'-resultBundlePath',bundle,'CODE_SIGNING_ALLOWED=NO','COMPILER_INDEX_STORE_ENABLE=NO','-parallel-testing-enabled','NO','test'],join(out,`F${g.id}-xcode.log`));
 item.code=test.code;item.timedOut=test.timedOut;item.log=test.log;item.resultBundle=bundle;
 item.tests=[...test.tail.matchAll(/Test Case .*?'(?:-\[\w+\.)?StoreTests[ .](test\w+)\]?' passed/g)].map(x=>x[1]);
 item.testSummary=test.tail.slice(-6500);
 try{
  assert.equal(test.code,0,test.tail.slice(-3500));assert(test.tail.includes('TEST SUCCEEDED'),'Tests did not succeed');
  const name=basename(project,'.xcodeproj'),app=join(derivedData,'Build/Products/Debug-iphonesimulator',name+'.app');
  assert(existsSync(app),'Missing built simulator app');item.app=app;
  const sources=walk(web).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/'));
  for(const file of sources){const target=join(app,'web',relative(web,file));assert(existsSync(target),'Missing packaged asset '+relative(web,file));assert.equal(hash(target),hash(file),'Stale packaged asset '+relative(web,file));}
  item.packagedWebFiles=sources.length;item.packagedWebP=sources.filter(f=>f.endsWith('.webp')).length;
  item.bundleId=execFileSync('/usr/libexec/PlistBuddy',['-c','Print :CFBundleIdentifier',join(app,'Info.plist')],{encoding:'utf8'}).trim();
  const launch=await run('xcrun',['simctl','launch','--terminate-running-process',destination,item.bundleId],join(out,`F${g.id}-launch.log`),60000);
  assert.equal(launch.code,0,'Installed-app launch failed: '+launch.tail);item.launch=launch.tail.trim();
  await new Promise(resolve=>setTimeout(resolve,5000));
  item.screenshot=join(out,`F${g.id}-simulator.png`);
  const screen=await run('xcrun',['simctl','io',destination,'screenshot',item.screenshot],join(out,`F${g.id}-screenshot.log`),60000);
  assert.equal(screen.code,0,'Screenshot failed');
  const terminate=await run('xcrun',['simctl','terminate',destination,item.bundleId],join(out,`F${g.id}-terminate.log`),60000);
  assert.equal(terminate.code,0,'App exited before controlled termination: '+terminate.tail);
  item.installedAppLaunched=true;item.passed=true;
 }catch(e){item.passed=false;item.error=String(e);console.log(item.error);}
 item.seconds=Math.round((Date.now()-start)/1000);save();
 console.log(`F${g.id}: ${item.passed?'PASS':'FAIL'} (${item.seconds}s; ${item.packagedWebP??0} WebP resources)`);
}
report.nativeFilesChanged=before.filter(([f,h])=>hash(f)!==h).map(([f])=>f);
report.finishedAt=new Date().toISOString();report.passed=report.results.length===manifest.length&&report.results.every(r=>r.passed)&&!report.nativeFilesChanged.length;
save();console.log('Final Xcode verification: '+join(out,'results.json'));
if(!report.passed)process.exitCode=1;
