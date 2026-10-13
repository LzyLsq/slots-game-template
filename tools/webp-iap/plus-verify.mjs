import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {games,root,output,reports,run} from './plus-common.mjs';
const release=process.argv.includes('--release'),selected=process.argv.slice(2).filter(s=>s!=='--release'),kind=release?'release':'native';
const resultFile=join(reports,kind+'-results.json');mkdirSync(reports,{recursive:true});
const results=existsSync(resultFile)?JSON.parse(readFileSync(resultFile)):[];
for(const g of games.filter(g=>!selected.length||selected.includes(String(g.id)))){
 let item;for(let n=0;n<900;n++){if(existsSync(join(output,'manifest.json')))item=JSON.parse(readFileSync(join(output,'manifest.json'))).find(i=>i.id===g.id);if(item)break;await new Promise(r=>setTimeout(r,2000));}
 if(!item)throw Error('Delivery not ready F'+g.id);
 const start=Date.now(),log=join(reports,`F${g.id}-${kind}.log`),resultBundle=join(reports,`F${g.id}-StoreKit-${Date.now()}.xcresult`);
 let args=['-project',isAbsolute(item.project)?item.project:join(output,item.project),'-scheme',g.name+(release?'-Release':'-LocalTest'),'-derivedDataPath',join(reports,release?'ReleaseDerivedData':'TestDerivedData'),'CODE_SIGNING_ALLOWED=NO','-jobs','4'];
 if(release)args.push('-configuration','Release','-destination','generic/platform=iOS','build');
 else args.push('-destination','id=2C45F638-CEBE-4BC8-9D79-28D0EADB4BF9','-resultBundlePath',resultBundle,'-parallel-testing-enabled','NO','test');
 console.log('F'+g.id+': '+(release?'iPhone arm64 release build':'Xcode + StoreKit + WebP + saved coins tests'));
 const r=await run('xcodebuild',args,root,log),passed=[...r.tail.matchAll(/Test Case .*?test(\w+).*?passed/g)].length;
 const result={id:g.id,success:r.code===0&&r.tail.includes(release?'BUILD SUCCEEDED':'TEST SUCCEEDED'),code:r.code,seconds:Math.round((Date.now()-start)/1000),log:log.slice(root.length+1),...(release?{}:{passed,resultBundle:resultBundle.slice(root.length+1)})};
 const at=results.findIndex(i=>i.id===g.id);if(at>=0)results[at]=result;else results.push(result);writeFileSync(resultFile,JSON.stringify(results.sort((a,b)=>a.id-b.id),null,2));
 console.log(JSON.stringify(result));if(!result.success)console.log(r.tail.slice(-4500));
}
if(results.some(r=>!r.success))process.exitCode=1;
