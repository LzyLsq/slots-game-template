// Preserve the CC Switch generated pixels; only resize/PNG-optimize and key
// the deliberately requested #ff00ff studio backdrop on the 2x2 prop sheet.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require('/Users/xzkj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const source='/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/images';
const root=path.resolve('assets/resources/art');
for(const [src,dst] of [['coin-hall-rich','foundry-hall'],['coin-arrival-rich','foundry-arrival']]) {
  await sharp(path.join(source,`${src}.png`)).png({compressionLevel:9}).toFile(path.join(root,`${dst}.png.new`));
  await fs.rename(path.join(root,`${dst}.png.new`),path.join(root,`${dst}.png`));
}
const {data,info}=await sharp(path.join(source,'coin-treasures-atlas.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let i=0;i<data.length;i+=4){
  const r=data[i],g=data[i+1],b=data[i+2];
  // Studio-magenta threshold; don't remove coral/gem colors.
  const keyed=r>155&&b>155&&g<Math.min(r,b)*.67&&Math.abs(r-b)<80;
  if(!keyed)continue;
  const d=Math.sqrt((255-r)**2+g*g+(255-b)**2);
  const a=d<20?0:d>92?255:Math.round(255*((d-20)/72)**2*(3-2*((d-20)/72)));
  data[i+3]=Math.min(data[i+3],a);
  if(a===0){data[i]=data[i+1]=data[i+2]=0;}
  else if(a<255){const f=a/255;data[i]=Math.max(0,Math.min(255,Math.round((r-(1-f)*255)/f)));data[i+1]=Math.max(0,Math.min(255,Math.round(g/f)));data[i+2]=Math.max(0,Math.min(255,Math.round((b-(1-f)*255)/f)));}
}
await sharp(data,{raw:info}).png({compressionLevel:9}).toFile(path.join(root,'foundry-treasures.png'));
await fs.copyFile(path.join(root,'foundry-arrival.png'),path.resolve('build-templates/web-mobile/foundry-arrival.png'));
console.log('CC Switch rich backgrounds and transparent treasure atlas installed');
