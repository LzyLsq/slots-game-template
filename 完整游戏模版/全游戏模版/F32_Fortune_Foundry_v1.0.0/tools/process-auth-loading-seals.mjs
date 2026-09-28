import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require('/Users/xzkj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source='/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/images';
const target=path.resolve('assets/resources/art');
async function keyed(file){
  const {data,info}=await sharp(path.join(source,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  for(let p=0;p<data.length;p+=4){
    const r=data[p],g=data[p+1],b=data[p+2];
    if(!(r>130&&b>130&&g<Math.min(r,b)*.72&&Math.abs(r-b)<105))continue;
    const d=Math.sqrt((255-r)**2+g*g+(255-b)**2);
    let a=d<=8?0:d>=70?255:Math.round(255*((d-8)/62)**2*(3-2*((d-8)/62)));
    if(a<52)a=0;
    data[p+3]=Math.min(data[p+3],a);
    if(a>0&&a<255){const af=a/255,inv=1-af,divisor=Math.max(.58,af);data[p]=Math.max(0,Math.min(255,Math.round((r-inv*255)/divisor)));data[p+1]=Math.max(0,Math.min(255,Math.round(g/divisor)));data[p+2]=Math.max(0,Math.min(255,Math.round((b-inv*255)/divisor)));}
    else if(a===0)data[p]=data[p+1]=data[p+2]=0;
  }
  return sharp(data,{raw:info}).png({compressionLevel:9}).toBuffer();
}
async function write(name,buf){await fs.writeFile(path.join(target,name),buf);console.log(name,await sharp(buf).metadata().then(({width,height})=>`${width}×${height}`));}
await write('foundry-auth-gate.png',await keyed('foundry-auth-gate-extended.png'));
for(const [sourceFile,dest] of [['foundry-hall-seals.png','foundry-hall-seals.png'],['foundry-title-strips.png','foundry-title-strips.png']]){
 try{await fs.access(path.join(source,sourceFile));await write(dest,await keyed(sourceFile));}catch(error){if(error.code!=='ENOENT')throw error;}
}
