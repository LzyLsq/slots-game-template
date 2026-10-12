import {existsSync,readFileSync,writeFileSync,createWriteStream} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {root,games} from './install.mjs';
const out=join(root,'Xcode_H5/WebP_IAP_20261010'),reports=join(import.meta.dirname,'verification'),resultFile=join(reports,'native-results.json');
const selected=process.argv.slice(2),results=existsSync(resultFile)?JSON.parse(readFileSync(resultFile)):[];
for(const g of games.filter(g=>!selected.length||selected.includes(String(g.id)))){
 const name=g.slug.replace('_Cocos','').replaceAll('_','');let item;
 for(let n=0;n<400;n++){if(existsSync(join(out,'manifest.json')))item=JSON.parse(readFileSync(join(out,'manifest.json'))).find(i=>i.id===g.id);if(item&&existsSync(join(item.project,'xcshareddata/xcschemes',name+'-LocalTest.xcscheme')))break;await new Promise(r=>setTimeout(r,2000));}
 if(!item)throw Error('Delivery not ready F'+g.id);
 const logFile=join(reports,`F${g.id}-native-check.log`),log=createWriteStream(logFile),bundle=join(reports,`F${g.id}-StoreKit-${Date.now()}.xcresult`),start=Date.now();
 console.log('F'+g.id+': simulator build + StoreKit + Web purchase + WebP checks');
 const child=spawn('xcodebuild',['-project',item.project,'-scheme',name+'-LocalTest','-destination','id=2C45F638-CEBE-4BC8-9D79-28D0EADB4BF9','-derivedDataPath',join(reports,'DerivedData'),'-resultBundlePath',bundle,'CODE_SIGNING_ALLOWED=NO','-parallel-testing-enabled','NO','test'],{cwd:root});let tail='';
 for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{log.write(d);tail=(tail+d).slice(-25000);});
 const timeout=setTimeout(()=>child.kill('SIGTERM'),900000),code=await new Promise(resolve=>{child.on('error',()=>resolve(-1));child.on('close',resolve);});clearTimeout(timeout);log.end();
 const tests=[...tail.matchAll(/Test Case .*?'(test\w+)'.*?passed/g)].map(m=>m[1]);
 const result={id:g.id,success:code===0&&tail.includes('TEST SUCCEEDED'),code,seconds:Math.round((Date.now()-start)/1000),resultBundle:bundle,log:logFile,summary:tail.slice(-4500)};
 const at=results.findIndex(i=>i.id===g.id);if(at>=0)results[at]=result;else results.push(result);writeFileSync(resultFile,JSON.stringify(results.sort((a,b)=>a.id-b.id),null,2));
 console.log(JSON.stringify({id:g.id,success:result.success,seconds:result.seconds}));if(!result.success)console.log(tail.slice(-3000));
}
if(results.some(r=>!r.success))process.exitCode=1;
