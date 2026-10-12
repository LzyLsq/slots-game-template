import {readFileSync,readdirSync,existsSync,mkdirSync,createWriteStream,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {games,base,patch} from './install.mjs';
const reports=join(import.meta.dirname,'verification');mkdirSync(reports,{recursive:true});
export function run(command,args,cwd,file){return new Promise(resolve=>{const log=createWriteStream(file),c=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe']});let tail='';for(const s of [c.stdout,c.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-90000)});c.on('error',e=>resolve({code:-1,tail:String(e)}));c.on('close',code=>{log.end();resolve({code,tail})});});}
const ids=process.argv.slice(2),results=[];
for(const g of games.filter(g=>!ids.length||ids.includes(String(g.id)))){
 const start=Date.now();let r;
 if(g.id===26)r=await run(process.execPath,['tools/build.mjs'],g.source,join(reports,'F26-build.log'));
 else{
  const existing=join(g.source,'tools/web-mobile-release-build.json'),cfg=JSON.parse(readFileSync(existsSync(existing)?existing:join(base,'F20_Golden_Canopy_v1.0.0/tools/web-mobile-release-build.json')));
  const scenes=readdirSync(join(g.source,'assets/scenes')).filter(n=>n.endsWith('.scene'));
  if(!scenes.length)throw Error('No scene F'+g.id);
  if(!scenes.some(n=>JSON.parse(readFileSync(join(g.source,'assets/scenes',n+'.meta'))).uuid===cfg.startScene)){
   const uuid=JSON.parse(readFileSync(join(g.source,'assets/scenes',scenes[0]+'.meta'))).uuid;cfg.startScene=uuid;cfg.scenes=[{url:'db://assets/scenes/'+scenes[0],uuid}];
  }
  cfg.name='f'+g.id+'-'+g.slug.toLowerCase();cfg.debug=false;cfg.outputName='web-mobile';cfg.sourceMaps=false;
  const file=join(reports,'F'+g.id+'-build.json');patch(file,JSON.stringify(cfg,null,2));
  console.log('F'+g.id+': Cocos Web build');r=await run('/Applications/CocosCreator.app/Contents/MacOS/CocosCreator',['--project',g.source,'--build','configPath='+file],g.source,join(reports,'F'+g.id+'-build.log'));
 }
 const success=g.id===26?r.code===0:(r.code===0||r.code===36)&&/Task Finished.*success|Build.*success/i.test(r.tail)&&existsSync(join(g.source,'build/web-mobile/index.html'));
 const result={id:g.id,success,code:r.code,seconds:Math.round((Date.now()-start)/1000)};results.push(result);writeFileSync(join(reports,'build-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(result));if(!success)console.log(r.tail.slice(-2500));
}
if(results.some(r=>!r.success))process.exitCode=1;
