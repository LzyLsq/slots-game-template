import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {games,base,reports,patch,run} from './plus-common.mjs';
const creator=join(base,'F40_Fortune_Festival_v1.0.0/temp/qa-creator-3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator');
if(!existsSync(creator))throw Error('Cocos Creator 3.8.8 is required');
mkdirSync(reports,{recursive:true});
const selected=process.argv.slice(2),resultFile=join(reports,'build-results.json');
const results=existsSync(resultFile)?JSON.parse(readFileSync(resultFile)):[];
for(const g of games.filter(g=>!selected.length||selected.includes(String(g.id)))){
 const start=Date.now();let r;
 if(g.id===42)r=await run(process.execPath,['tools/build.mjs'],g.source,join(reports,'F42-build.log'));
 else{
  const config=JSON.parse(readFileSync(join(g.source,'tools/web-mobile-release-build.json')));
  Object.assign(config,{debug:false,sourceMaps:false,md5Cache:false,outputName:'web-mobile'});
  const file=join(reports,'F'+g.id+'-build.json');patch(file,JSON.stringify(config,null,2));
  console.log('F'+g.id+': fresh Cocos Web release build');
  r=await run(creator,['--project',g.source,'--build','configPath='+file],g.source,join(reports,`F${g.id}-build.log`));
 }
 const success=(g.id===42?r.code===0:([0,36].includes(r.code)&&/Task Finished.*success|Build.*success/i.test(r.tail)))&&existsSync(join(g.source,g.id===42?'dist':'build/web-mobile','index.html'));
 const result={id:g.id,success,code:r.code,seconds:Math.round((Date.now()-start)/1000)};
 const at=results.findIndex(item=>item.id===g.id);if(at>=0)results[at]=result;else results.push(result);
 writeFileSync(join(reports,`F${g.id}-build-result.json`),JSON.stringify(result,null,2));
 writeFileSync(resultFile,JSON.stringify(results.sort((a,b)=>a.id-b.id),null,2));console.log(JSON.stringify(result));
 if(!success)console.log(r.tail.slice(-4000));
}
if(results.some(r=>!r.success))process.exitCode=1;
