// One F14 simulator compile, plus the actual OC range handler. No device signing.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdtempSync,createWriteStream,statfsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
const backup=process.argv.find(a=>a.startsWith('--backup='))?.slice(9);
const saved=JSON.parse(readFileSync(join(backup,'backup.json')));
const root=join(import.meta.dirname,'../..'),out=join(import.meta.dirname,'verification/f14-approved-music-20261012');
assert(JSON.parse(readFileSync(join(out,'browser.json'))).passed,'Browser checks required first');
assert(JSON.parse(readFileSync(join(backup,'delivery-sync.json'))).nativeFilesChanged===false,'Delivery synchronization required first');
const pkg=saved.packages[1],web=join(pkg,'F14_H5'),app=join(web,'ios-wrapper/App');
const stage=mkdtempSync(join(tmpdir(),'f14-approved-native.'));
const sha=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
for(const [f,h] of Object.entries(saved.protectedFiles))assert.equal(sha(f),h,'Native changed: '+f);
function run(bin,args,name){return new Promise(resolve=>{const file=join(stage,name),log=createWriteStream(file),p=spawn(bin,args,{cwd:root,stdio:['ignore','pipe','pipe']});let tail='';for(const s of [p.stdout,p.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-7000);});p.on('error',e=>{log.end(String(e));resolve({code:-1,log:file,tail:String(e)});});p.on('close',code=>{log.end();resolve({code,log:file,tail});});});}
console.log('F14 native evidence: '+stage);
const executable=join(stage,'range-test'),test=join(root,'完整游戏模版/全游戏模版/F20_Golden_Canopy_v1.0.0/tools/local-audio-server-test.m');
const compile=await run('xcrun',['clang','-fobjc-arc','-fblocks','-framework','Foundation','-I',app,join(app,'H5LocalServer.m'),test,'-o',executable],'range-compile.log');
const server=compile.code===0?await run(executable,[web],'range.log'):compile;
console.log('F14 actual OC HTTP range: '+(server.code===0?'PASS':'FAIL'));
const space=statfsSync(pkg),free=space.bavail*space.bsize;
assert(free>1.5*1024**3,'Less than 1.5 GiB available; preserve resources and do not start a new DerivedData build');
const project=join(pkg,'DBGame/CloudCrownH5.xcodeproj'),derivedData=join(stage,'DerivedData');
const build=await run('xcodebuild',['-project',project,'-scheme','CloudCrown-Release','-configuration','Debug','-sdk','iphonesimulator','-destination','generic/platform=iOS Simulator','-derivedDataPath',derivedData,'CODE_SIGNING_ALLOWED=NO','build'],'xcode.log');
console.log('F14 simulator compile: '+(build.code===0?'PASS':'FAIL'));
const delivered=join(derivedData,'Build/Products/Debug-iphonesimulator/CloudCrownH5.app/web');
function walk(d){return readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);}
const sourceFiles=walk(web).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/'));
const mismatches=build.code===0?sourceFiles.filter(f=>{const target=join(delivered,f.slice(web.length+1));return !existsSync(target)||sha(target)!==sha(f);}):['Build did not succeed'];
for(const [f,h] of Object.entries(saved.protectedFiles))assert.equal(sha(f),h,'Native changed by build: '+f);
const report={checkedAt:new Date().toISOString(),passed:server.code===0&&build.code===0&&!mismatches.length,scope:'Actual F14 Objective-C HTTP Range/MIME tests, one unsigned simulator compile and packaged resource hash validation. No real-device, Apple login, payment or subjective audio test.',stage,project,server,build,packagedFiles:sourceFiles.length,packagedWebP:sourceFiles.filter(f=>f.endsWith('.webp')).length,mismatches,nativeChanged:false};
writeFileSync(join(out,'native.json'),JSON.stringify(report,null,2)+'\n');
if(!report.passed){console.error(server.code!==0?server.tail:build.tail);process.exitCode=1;}
