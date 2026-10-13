// Reuse the existing painted eyelids. Original paintings are never rewritten.
import assert from 'node:assert/strict';
import {readFileSync, existsSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const sharp = createRequire(import.meta.url)('/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = join(import.meta.dirname, '../..');
const project = join(root, '完整游戏模版/全游戏模版/F20_Golden_Canopy_v1.0.0');
const art = join(project, 'assets/resources/art');
const evidence = join(import.meta.dirname, 'verification/f20-blink-20261013');
mkdirSync(evidence, {recursive: true});
const specs = JSON.parse(readFileSync(join(project, 'assets/scripts/vfx/LivingMascotData.ts'), 'utf8').split('= ')[1].replace(/;\s*$/, ''));
// Each donor is confined to one eyelid, not a replacement head or face.
const donors = [
  [[331,144,70,53], [414,137,45,53]],
  [[295,400,51,55], [362,409,65,57]],
  [[294,589,78,71], [416,587,64,67]],
  [[318,891,90,79], [413,863,61,78]],
];
const jobs = specs.map((s, i) => ({
  art: s.art, index: i, canvas: [1024,1024],
  source: 'canopy-destinations', origin: [i % 2 * 1024, Math.floor(i / 2) * 1024], donor: i,
  targets: donors[i].map(([x,y,w,h]) => [
    Math.round(s.rect[0] + (x - 256 - s.frames[0][0]) / s.frames[0][2] * s.rect[2]),
    Math.round(s.rect[1] + (y - s.frames[0][1]) / s.frames[0][3] * s.rect[3]),
    Math.round(w / s.frames[0][2] * s.rect[2]), Math.round(h / s.frames[0][3] * s.rect[3]),
  ]),
}));
for (const [name, donor, crop, eyes] of [
  ['golden-hour',0,[674,702],[[323,108,71,64],[434,130,50,63]]],
  ['jade-treasury',1,[810,788],[[163,239,55,63],[294,247,37,67]]],
  ['ruby-revel',3,[710,674],[[235,160,58,60],[345,155,51,58]]],
]) jobs.push({art:name+'-tall',index:-1,canvas:[2048,4096],source:name+'-tall',origin:[0,0],donor,
  targets:eyes.map(([x,y,w,h])=>[x+crop[0],y+crop[1],w,h])});
const entries = [], layers = [], preview = [];
const cell = 128, columns = 8;
let slot = 0;
for (const job of jobs) {
  const eyes = [];
  for (let eye = 0; eye < 2; eye++) {
    const [x,y,w,h] = job.targets[eye], [dx,dy,dw,dh] = donors[job.donor][eye];
    assert(w < cell - 4 && h < cell - 4);
    const original = await sharp(join(art,job.source+'.png')).extract({left:x+job.origin[0],top:y+job.origin[1],width:w,height:h}).ensureAlpha().raw().toBuffer();
    const painted = await sharp(join(art,'living-mascot-parts.png')).extract({left:dx,top:dy,width:dw,height:dh}).resize(w,h).ensureAlpha().raw().toBuffer();
    const openDonor = await sharp(join(art,'living-mascot-parts.png')).extract({left:dx-256,top:dy,width:dw,height:dh}).resize(w,h).ensureAlpha().raw().toBuffer();
    // Match the donor's eyelid fur to the original skin/feathers. Sample only
    // the outer ring (never black pupils), and keep black lash lines black.
    const targetMean=[0,0,0], donorMean=[0,0,0]; let samples=0;
    for(let py=0;py<h;py++)for(let px=0;px<w;px++){
      const d=Math.hypot((px+.5-w/2)/(w/2),(py+.5-h/2)/(h/2)), k=(py*w+px)*4;
      if(d<.72||d>.95||original[k+3]<240||openDonor[k+3]<240)continue;
      if(original[k]+original[k+1]+original[k+2]<160||openDonor[k]+openDonor[k+1]+openDonor[k+2]<160)continue;
      for(let c=0;c<3;c++){targetMean[c]+=original[k+c];donorMean[c]+=openDonor[k+c];}samples++;
    }
    assert(samples>5, 'No reliable eyelid registration '+job.art+':'+eye);
    const ratios=targetMean.map((n,c)=>Math.max(.3,Math.min(2.2,n/Math.max(1,donorMean[c]))));
    const frames=[];
    for(const amount of [.55,1]){
      const pixels=Buffer.alloc(w*h*4);
      for(let py=0;py<h;py++)for(let px=0;px<w;px++){
        const k=(py*w+px)*4, nx=(px+.5-w/2)/(w/2), ny=(py+.5-h/2)/(h/2);
        const radius=Math.hypot(nx,ny);
        const edge=Math.max(0,Math.min(1,(.98-radius)/.24));
        const feather=edge*edge*(3-2*edge);
        // A single precomposited patch avoids translucent double pupils.
        // The transitional frame has a closed upper lid, not a faded face.
        const shutter=amount===1?1:Math.max(0,Math.min(1,((amount*1.65-.72)-ny)/.16));
        const alpha=feather*shutter*painted[k+3]/255*original[k+3]/255;
        for(let c=0;c<3;c++)pixels[k+c]=Math.round(Math.min(255,painted[k+c]*ratios[c]));
        pixels[k+3]=Math.round(alpha*255);
      }
      const left=(slot%columns)*cell+2, top=Math.floor(slot/columns)*cell+2;slot++;
      const encoded=await sharp(pixels,{raw:{width:w,height:h,channels:4}}).png().toBuffer();
      layers.push({input:encoded,left,top});frames.push([left,top,w,h]);
      if(amount===1){
        const before=await sharp(original,{raw:{width:w,height:h,channels:4}}).resize(w*3,h*3).png().toBuffer();
        const after=await sharp(original,{raw:{width:w,height:h,channels:4}}).composite([{input:encoded}]).png().toBuffer();
        preview.push({input:before,left:preview.length*140,top:0});
        preview.push({input:await sharp(after).resize(w*3,h*3).png().toBuffer(),left:(preview.length)*140,top:260});
      }
    }
    eyes.push({rect:[x,y,w,h],frames});
  }
  entries.push({art:job.art,index:job.index,canvas:job.canvas,eyes});
}
await sharp({create:{width:columns*cell,height:Math.ceil(slot/columns)*cell,channels:4,background:'#00000000'}}).composite(layers).png().toFile(join(art,'canopy-blink-eyelids-v1.png'));
// Inspection sheet: each pair is also saved independently, without scaling the
// gameplay files. This is QA-only material, not a substituted game asset.
for(let i=0;i<preview.length;i++)await sharp(preview[i].input).png().toFile(join(evidence,'eye-'+String(i).padStart(2,'0')+'.png'));
function save(file,text){const old=existsSync(file)?readFileSync(file,'utf8'):null;let patch='*** Begin Patch\n'+(old===null?'*** Add File: ':'*** Update File: ')+file+'\n';if(old!==null)patch+='@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n';patch+=text.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';execFileSync('apply_patch',[],{input:patch});}
save(join(project,'assets/scripts/vfx/CanopyBlinkData.ts'),`export interface CanopyBlinkSpec { art: string; index: number; canvas: readonly number[]; eyes: readonly { rect: readonly number[]; frames: readonly (readonly number[])[] }[]; }\nexport const CANOPY_BLINKS: readonly CanopyBlinkSpec[] = ${JSON.stringify(entries,null,2)};\n`);
console.log(JSON.stringify({characters:entries.length,eyePatches:slot/2,atlas:[columns*cell,Math.ceil(slot/columns)*cell],evidence}));
