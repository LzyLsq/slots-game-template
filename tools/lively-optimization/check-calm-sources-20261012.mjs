import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync,createWriteStream,existsSync} from 'node:fs';
import {join} from 'node:path';
import {games} from './calm-mix-projects.mjs';
const out=join(import.meta.dirname,'verification/calm-mix-20261012/source-checks');mkdirSync(out,{recursive:true});
const results=[];
async function run(g,kind,args,command='npm'){return new Promise(resolve=>{
 const stream=createWriteStream(join(out,`F${g.id}-${kind}.log`));const child=spawn(command,args,{cwd:g.project,stdio:['ignore','pipe','pipe']});
 child.stdout.pipe(stream,{end:false});child.stderr.pipe(stream,{end:false});child.on('close',code=>{stream.end();results.push({id:g.id,kind,code,passed:code===0});writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));console.log(`F${g.id} ${kind}: ${code===0?'PASS':'FAIL'}`);resolve();});
 });}
for(const g of games){const pkg=JSON.parse(readFileSync(join(g.project,'package.json')));
 if(pkg.scripts.typecheck)await run(g,'typecheck',['run','typecheck']);
 else if(g.id!==26&&existsSync(join(g.project,'tsconfig.json'))){
  const compiler=join(g.project,'node_modules/typescript/bin/tsc');
  if(existsSync(compiler))await run(g,'typecheck',[compiler,'-p','tsconfig.json','--noEmit'],process.execPath);
  else{
   results.push({id:g.id,kind:'typecheck',passed:null,skipped:true,reason:'No local TypeScript compiler; use check-calm-baseline-20261012.mjs without installing dependencies'});
   writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));
  }
 }
 await run(g,'tests',['test']);
}
if(results.some(r=>r.passed===false))process.exitCode=1;
