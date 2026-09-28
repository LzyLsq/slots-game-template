import path from 'node:path';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const sharp = require('/Users/xzkj/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const sourceDir = '/Users/xzkj/Documents/Codex/2026-09-22/gei/work/ccswitch-f32/images';
const outDir = path.resolve('assets/resources/art');
const specs = [
  ['foundry-auth-gate', 1024, 1320],
  ['foundry-shop-rack', 1024, 1320],
  ['foundry-reward-dial', 1024, 1320],
  ['foundry-rank-wall', 1024, 1320],
  ['foundry-passport', 1024, 1320],
  ['foundry-modal-drawer', 1024, 1400],
  ['foundry-nav-rail', 1024, 220],
];

function chromaAlpha(r, g, b) {
  const d = Math.sqrt((255-r)**2 + g**2 + (255-b)**2);
  if (d <= 24) return 0;
  if (d >= 92) return 255;
  const t = (d - 24) / 68;
  return Math.round(255 * t * t * (3 - 2 * t));
}

async function keyAndTrim(input) {
  const {data, info} = await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let minX=info.width, minY=info.height, maxX=-1, maxY=-1;
  for (let y=0;y<info.height;y++) for (let x=0;x<info.width;x++) {
    const i=(y*info.width+x)*4, r=data[i], g=data[i+1], b=data[i+2];
    const a=chromaAlpha(r,g,b); data[i+3]=a;
    if(a>12){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
    if(a>0 && a<255){
      const af=a/255, inv=1-af;
      data[i]=Math.max(0,Math.min(255,Math.round((r-inv*255)/af)));
      data[i+1]=Math.max(0,Math.min(255,Math.round(g/af)));
      data[i+2]=Math.max(0,Math.min(255,Math.round((b-inv*255)/af)));
    }
  }
  if(maxX<minX) throw new Error(`No foreground in ${input}`);
  const pad=Math.max(3,Math.round(Math.max(info.width,info.height)*0.006));
  const left=Math.max(0,minX-pad), top=Math.max(0,minY-pad);
  const width=Math.min(info.width-left,maxX-minX+1+pad*2), height=Math.min(info.height-top,maxY-minY+1+pad*2);
  return sharp(data,{raw:info}).extract({left,top,width,height}).png().toBuffer();
}

await fs.mkdir(outDir,{recursive:true});
for (const [name,w,h] of specs) {
  const input=path.join(sourceDir,`${name}-opaque.png`);
  const keyed=await keyAndTrim(input);
  const margin=name==='foundry-nav-rail'?4:14;
  const targetW=w-margin*2,targetH=h-margin*2;
  const fitted=await sharp(keyed).resize(targetW,targetH,{fit:'contain',withoutEnlargement:false,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
  await sharp({create:{width:w,height:h,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:fitted,gravity:'center'}]).png({compressionLevel:9}).toFile(path.join(outDir,`${name}.png`));
  console.log(`processed ${name} -> ${w}x${h}`);
}
