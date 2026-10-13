import {readFileSync,existsSync,readdirSync,mkdirSync,createWriteStream} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn,spawnSync} from 'node:child_process';
export const root=resolve(import.meta.dirname,'../..');
export const base=join(root,'完整游戏模版/全游戏模版');
export const output=join(root,'Xcode_H5/WebP_IAP_F33plus_20261013');
export const reports=join(root,'tools/webp-iap/verification/f33plus-20261013');
export const games=readdirSync(base).filter(n=>/^F(33|34|35|36|37|38|40|42|43|44)_.*_v/.test(n)).map(n=>{
 const id=Number(n.match(/^F(\d+)_/)[1]),slug=n.replace(/^F\d+_/,'').replace(/_v.*$/,'');
 const name=slug.replaceAll('_','');
 return {id,slug,name,title:slug.replaceAll('_',' '),source:join(base,n),bundle:id===33?'com.xzkj.goldenlibraryh5':`com.xzkj.f${id}${name.toLowerCase()}h5`,port:19300+id};
}).sort((a,b)=>a.id-b.id);
export function patch(file,updated){
 const old=existsSync(file)?readFileSync(file,'utf8'):null;if(old===updated)return;
 mkdirSync(resolve(file,'..'),{recursive:true});
 const lines=old===null?['*** Add File: '+file,...updated.trimEnd().split('\n').map(l=>'+'+l)]:['*** Update File: '+file,'@@',...old.trimEnd().split('\n').map(l=>'-'+l),...updated.trimEnd().split('\n').map(l=>'+'+l)];
 const r=spawnSync('apply_patch',[],{input:['*** Begin Patch',...lines,'*** End Patch',''].join('\n'),encoding:'utf8',maxBuffer:32e6});
 if(r.status)throw Error(r.stderr||r.stdout);
}
export async function run(command,args,cwd,file,timeout=900000){
 mkdirSync(resolve(file,'..'),{recursive:true});
 const log=createWriteStream(file),child=spawn(command,args,{cwd,stdio:['ignore','pipe','pipe']});let tail='';
 for(const s of [child.stdout,child.stderr])s.on('data',d=>{log.write(d);tail=(tail+d).slice(-90000);});
 const timer=setTimeout(()=>child.kill('SIGTERM'),timeout);
 const code=await new Promise(r=>{child.on('error',e=>{tail+=String(e);r(-1);});child.on('close',r);});clearTimeout(timer);log.end();return {code,tail};
}
