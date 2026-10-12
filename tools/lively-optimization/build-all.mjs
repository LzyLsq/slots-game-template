import {readFileSync,writeFileSync,existsSync,readdirSync,mkdtempSync,createWriteStream} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {profiles} from './profiles.mjs';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..'),base=join(root,'完整游戏模版/全游戏模版');
const out=mkdtempSync(join(tmpdir(),'lively-build.')),results=[];console.log('Build logs: '+out);
const buildEnv={...process.env,SHARP_MODULE:process.env.SHARP_MODULE||'/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'};
function run(command,args,cwd,file){return new Promise(resolve=>{const log=createWriteStream(file),c=spawn(command,args,{cwd,env:buildEnv,stdio:['ignore','pipe','pipe']});let tail='';for(const s of [c.stdout,c.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-60000);});c.on('error',e=>{log.end(String(e));resolve({code:-1,tail:String(e)});});c.on('close',code=>{log.end();resolve({code,tail});});});}
const onlyCompress=process.argv.includes('--compress-only'),ids=process.argv.slice(2).filter(x=>!x.startsWith('--'));
const buildProfiles=[...profiles,{id:20,slug:'Golden_Canopy'}].sort((a,b)=>a.id-b.id);
for(const p of buildProfiles.filter(p=>p.id!==26&&(!ids.length||ids.includes(String(p.id))))){
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`))),cfg=join(project,'tools/web-mobile-release-build.json');
 let file=cfg;
 if(!existsSync(file)){
  const scene=readdirSync(join(project,'assets/scenes')).find(n=>n.endsWith('.scene')),uuid=JSON.parse(readFileSync(join(project,'assets/scenes',scene+'.meta'),'utf8')).uuid;
  const config=JSON.parse(readFileSync(join(base,'F20_Golden_Canopy_v1.0.0/tools/web-mobile-release-build.json'),'utf8'));
  config.name=`f${p.id}-${p.slug.toLowerCase()}`;config.startScene=uuid;config.scenes=[{url:'db://assets/scenes/'+scene,uuid}];
  file=join(out,`F${p.id}.json`);writeFileSync(file,JSON.stringify(config,null,2));
 }
 const start=Date.now();console.log(`F${p.id}: building`);
 const r=onlyCompress?{code:0,tail:'Task Finished success'}:await run('/Applications/CocosCreator.app/Contents/MacOS/CocosCreator',['--project',project,'--build',`configPath=${file}`],project,join(out,`F${p.id}.log`));
 const success=(r.code===0||r.code===36)&&/Task Finished.*success|Build.*success/i.test(r.tail)&&existsSync(join(project,'build/web-mobile/index.html'));
 let compression;
 if(success){const c=await run(process.execPath,[join(base,'F20_Golden_Canopy_v1.0.0/tools/compress-webp-release.cjs'),join(project,'build/web-mobile')],project,join(out,`F${p.id}-webp.log`));compression=c.code===0;}
 const result={id:p.id,success,compression,code:r.code,seconds:Math.round((Date.now()-start)/1000),project};results.push(result);writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(result));
 if(!success)console.log(r.tail.slice(-1600));
}
console.log('Final results: '+join(out,'results.json'));if(results.some(r=>!r.success||!r.compression))process.exitCode=1;
