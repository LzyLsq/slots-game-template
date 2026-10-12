import {readFileSync,writeFileSync,createWriteStream,existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
const root=join(import.meta.dirname,'../..'),out=join(root,'Xcode_H5/WebP_IAP_20261010'),reports=join(import.meta.dirname,'verification');
const resultFile=join(reports,'release-results.json');
const selected=process.argv.slice(2),results=existsSync(resultFile)?JSON.parse(readFileSync(resultFile)):[];
for(const g of JSON.parse(readFileSync(join(out,'manifest.json'))).filter(g=>!selected.length||selected.includes(String(g.id)))){
 const name=g.title.replaceAll(' ',''),start=Date.now(),file=join(reports,`F${g.id}-release-build.log`),log=createWriteStream(file);
 console.log('F'+g.id+': unsigned iPhone arm64 Release build');
 const child=spawn('xcodebuild',['-project',g.project,'-scheme',name+'-Release','-configuration','Release','-sdk','iphoneos','-destination','generic/platform=iOS','-derivedDataPath',join(reports,'ReleaseDerivedData'),'CODE_SIGNING_ALLOWED=NO','build'],{cwd:root});let tail='';
 for(const s of [child.stdout,child.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-12000);});
 const timeout=setTimeout(()=>child.kill('SIGTERM'),600000);
 const code=await new Promise(resolve=>{child.on('error',()=>resolve(-1));child.on('close',resolve);});clearTimeout(timeout);log.end();
 const r={id:g.id,success:code===0&&tail.includes('BUILD SUCCEEDED'),code,seconds:Math.round((Date.now()-start)/1000),log:file,unsigned:true,architecture:'arm64',sdk:'iphoneos',configuration:'Release'};
 const at=results.findIndex(i=>i.id===g.id);if(at>=0)results[at]=r;else results.push(r);
 writeFileSync(resultFile,JSON.stringify(results.sort((a,b)=>a.id-b.id),null,2));console.log(JSON.stringify(r));
 if(!r.success)console.log(tail.slice(-3500));
}
if(results.some(r=>!r.success))process.exitCode=1;
