import {readFileSync,readdirSync,mkdtempSync,writeFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {profiles} from './profiles.mjs';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..'),base=join(root,'完整游戏模版/全游戏模版');
const shared=join(base,'F13_Golden_Harvest_v1.0.0/node_modules'),logs=mkdtempSync(join(tmpdir(),'lively-regression.')),results=[];
console.log('Regression logs: '+logs);
const ids=process.argv.slice(2);
for(const p of [...profiles,{id:20,slug:'Golden_Canopy'}].sort((a,b)=>a.id-b.id).filter(p=>!ids.length||ids.includes(String(p.id)))){
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`))),pkg=JSON.parse(readFileSync(join(project,'package.json'),'utf8'));
 if(existsSync(join(project,'temp/tsconfig.cocos.json'))&&existsSync(join(project,'tsconfig.json'))){
  const r=spawnSync(process.execPath,[join(shared,'typescript/bin/tsc'),'--noEmit','--skipLibCheck','-p','tsconfig.json'],{cwd:project,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
  writeFileSync(join(logs,`F${p.id}-types.log`),r.stdout+r.stderr);results.push({id:p.id,check:'types',code:r.status});console.log(`F${p.id} types ${r.status===0?'PASS':'FAIL'}`);
 }
 if(pkg.scripts?.test){
  const env={...process.env,PATH:shared+'/.bin:'+process.env.PATH};
  const r=spawnSync('npm',['test'],{cwd:project,env,encoding:'utf8',timeout:120000,maxBuffer:12*1024*1024});
  writeFileSync(join(logs,`F${p.id}-tests.log`),r.stdout+r.stderr);results.push({id:p.id,check:'existing-tests',code:r.status});console.log(`F${p.id} existing tests ${r.status===0?'PASS':'FAIL'}`);
 }
 writeFileSync(join(logs,'results.json'),JSON.stringify(results,null,2));
}
console.log('Results: '+join(logs,'results.json'));if(results.some(r=>r.code!==0))process.exitCode=1;
