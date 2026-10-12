// Low-disk batch rebuild. Convert generated images to WebP-only immediately
// after each successful Creator build; source artwork is never removed.
import {readFileSync,writeFileSync,existsSync,readdirSync,mkdtempSync,createWriteStream,statfsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn} from 'node:child_process';
import {games,base} from './calm-mix-projects.mjs';
import {compressWeb} from '../webp-iap/webp.mjs';

const out=mkdtempSync(join(tmpdir(),'calm-build.'));
const prior=process.argv.find(a=>a.startsWith('--prior='))?.slice(8);
const results=prior?JSON.parse(readFileSync(prior)):[];
const ids=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number);
const compressOnly=process.argv.includes('--compress-only');
console.log('Build logs: '+out);
writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));
function run(args,cwd,file){return new Promise(resolve=>{
 const log=createWriteStream(file),child=spawn('/Applications/CocosCreator.app/Contents/MacOS/CocosCreator',args,{cwd,stdio:['ignore','pipe','pipe']});
 let tail='',logError;
 log.on('error',error=>{logError=error;child.kill('SIGTERM');});
 for(const stream of [child.stdout,child.stderr])stream.on('data',data=>{if(!logError)log.write(data);tail=(tail+data).slice(-60000);});
 child.on('error',error=>{log.end();resolve({code:-1,tail:String(error)});});
 child.on('close',code=>{log.end();resolve({code,tail,error:logError&&String(logError)});});
});}
for(const g of games.filter(g=>g.id!==26&&(!ids.length||ids.includes(g.id)))){
 const start=Date.now();console.log(`F${g.id}: ${compressOnly?'compressing generated images':'building'}`);
 let result;
 try{
  const storage=statfsSync(g.project),free=storage.bavail*storage.bsize;
  if(!compressOnly&&free<600*1048576)throw Error(`Not enough build headroom: ${Math.round(free/1048576)} MiB free (600 MiB required)`);
  let cfg=join(g.project,'tools/web-mobile-release-build.json');
  if(!existsSync(cfg)){
   const scene=readdirSync(join(g.project,'assets/scenes')).find(n=>n.endsWith('.scene'));
   const uuid=JSON.parse(readFileSync(join(g.project,'assets/scenes',scene+'.meta'),'utf8')).uuid;
   const config=JSON.parse(readFileSync(join(base,'F20_Golden_Canopy_v1.0.0/tools/web-mobile-release-build.json'),'utf8'));
   config.name=`f${g.id}-calm-mix`;config.startScene=uuid;config.scenes=[{url:'db://assets/scenes/'+scene,uuid}];
   cfg=join(out,`F${g.id}.json`);writeFileSync(cfg,JSON.stringify(config,null,2));
  }
  const r=compressOnly?{code:0,tail:'Task Finished success'}:await run(['--project',g.project,'--build',`configPath=${cfg}`],g.project,join(out,`F${g.id}.log`));
  const success=!r.error&&(r.code===0||r.code===36)&&/Task Finished.*success|Build.*success/i.test(r.tail)&&existsSync(join(g.build,'index.html'));
  if(!success)throw Error(`Creator build failed (exit ${r.code}): ${r.error||r.tail.slice(-1600)}`);
  const compressionResult=await compressWeb(g.build);
  mkdirSync(join(g.build,'reports'),{recursive:true});
  writeFileSync(join(g.build,'reports/calm-webp.json'),JSON.stringify(compressionResult,null,2));
  result={id:g.id,success:true,compression:true,compressionResult,code:r.code,seconds:Math.round((Date.now()-start)/1000),project:g.project};
 }catch(error){result={id:g.id,success:false,compression:false,error:String(error),seconds:Math.round((Date.now()-start)/1000),project:g.project};}
 const existing=results.findIndex(r=>r.id===g.id);if(existing>=0)results.splice(existing,1);
 results.push(result);writeFileSync(join(out,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(result));
 // Don't start another Creator worker after disk or build failure.
 if(!result.success){process.exitCode=1;break;}
}
console.log('Final results: '+join(out,'results.json'));
