import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {games,reports,run} from './plus-common.mjs';
mkdirSync(reports,{recursive:true});const resultFile=join(reports,'source-results.json'),results=existsSync(resultFile)?JSON.parse(readFileSync(resultFile)):[],selected=process.argv.slice(2);
for(const g of games.filter(g=>!selected.length||selected.includes(String(g.id)))){
 const start=Date.now(),r=await run('npm',['test'],g.source,join(reports,`F${g.id}-source-tests.log`));
 const result={id:g.id,success:r.code===0,seconds:Math.round((Date.now()-start)/1000)},at=results.findIndex(r=>r.id===g.id);if(at>=0)results[at]=result;else results.push(result);writeFileSync(resultFile,JSON.stringify(results.sort((a,b)=>a.id-b.id),null,2));
 console.log(JSON.stringify(result));if(r.code)console.log(r.tail.slice(-2800));
}
if(results.some(r=>!r.success))process.exitCode=1;
