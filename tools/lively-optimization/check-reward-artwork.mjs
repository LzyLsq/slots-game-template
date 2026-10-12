import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const out=join(import.meta.dirname,'verification/reward-images-20261009');mkdirSync(out,{recursive:true});
const requested=process.argv.slice(2).map(Number);
const ids=requested.length?requested:[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33];
const results=[];
function run(command,args,cwd){return new Promise(done=>{const child=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',v=>output+=v);child.stderr.on('data',v=>output+=v);child.on('error',e=>done({code:-1,output:String(e)}));child.on('close',code=>done({code,output}));});}
for(const id of ids){
 const dir=join(base,readdirSync(base).find(n=>id===25?n.startsWith('F25_Velvet_Fortune_Cocos_'):n.startsWith(`F${id}_`))),pkg=JSON.parse(readFileSync(join(dir,'package.json'),'utf8'));
 const scripts=pkg.scripts.typecheck?['typecheck','test:layout',...(pkg.scripts['test:reward']?['test:reward']:[])]:['test'];
 for(const script of scripts.filter(s=>pkg.scripts[s])){
  const r=await run('npm',['run',script],dir);writeFileSync(join(out,`F${id}-${script.replace(':','-')}.log`),r.output);
  results.push({id,script,success:r.code===0,exitCode:r.code});console.log(`F${id} ${script}: ${r.code===0?'PASS':'FAIL'}`);if(r.code!==0)console.log(r.output.slice(-3000));
 }
 writeFileSync(join(out,'checks.json'),JSON.stringify(results,null,2));
}
if(results.some(r=>!r.success))process.exitCode=1;
