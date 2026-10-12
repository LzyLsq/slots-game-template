import {createRequire} from 'node:module';
import {mkdirSync,readdirSync,readFileSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {profiles} from './profiles.mjs';
import {liveHeads} from './mascot-live-manifest.mjs';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE||'/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=resolve('完整游戏模版/全游戏模版');
const ids=process.argv.slice(2).map(v=>Number(v.replace(/^F/i,''))),tile=256;
function saveText(path,text){
 const old=existsSync(path)?readFileSync(path,'utf8'):null;if(old===text)return;
 let patch='*** Begin Patch\n'+(old===null?'*** Add File: ':'*** Update File: ')+path+'\n';
 if(old!==null)patch+='@@\n'+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n';
 patch+=text.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';execFileSync('apply_patch',[],{input:patch});
}
// Preserve detached crown details as well as the main head. Native alpha is
// not colour-keyed; doing so can punch holes in gold and green characters.
async function cleanHead(buffer, cleanGreen=false){
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true}),{width:w,height:h}=info;
 const mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h),islands=[];let best=[];
 let transparent=0;for(let p=0;p<w*h;p++)if(data[p*4+3]<128)transparent++;
 const nativeAlpha=transparent>w*h*.05;
 for(let p=0;p<w*h;p++){
  const i=p*4,r=data[i],g=data[i+1],b=data[i+2];
  const residue=(r>=248&&g<18&&b<18)||(r>=248&&g>=240&&b<18)||(g>=235&&r<45&&b<45);
  // The brown otter has no green details. Its generated furry edge includes
  // semi-green matte pixels even when an alpha channel is supplied; remove
  // those before component selection so resizing cannot reintroduce a halo.
  // This is opt-in: green turtles and jewellery must keep their true colours.
  const greenMatte=cleanGreen&&g>70&&g>Math.max(r,b)*1.12&&g-Math.max(r,b)>18;
  mask[p]=data[i+3]>=170&&!greenMatte&&(nativeAlpha||!residue)?1:0;
 }
 for(let p=0;p<mask.length;p++)if(mask[p]&&!seen[p]){
  let a=0,z=1;queue[0]=p;seen[p]=1;
  while(a<z){const q=queue[a++],x=q%w,y=Math.floor(q/w);for(const n of [x>0?q-1:-1,x<w-1?q+1:-1,y>0?q-w:-1,y<h-1?q+w:-1])if(n>=0&&mask[n]&&!seen[n]){seen[n]=1;queue[z++]=n;}}
  const island=[...queue.subarray(0,z)];islands.push(island);if(z>best.length)best=island;
 }
 if(best.length<w*h*.06)throw Error('No clean foreground island');
 const kept=new Uint8Array(w*h);let bx0=w,by0=h,bx1=0,by1=0;
 for(const p of best){const x=p%w,y=Math.floor(p/w);bx0=Math.min(bx0,x);by0=Math.min(by0,y);bx1=Math.max(bx1,x);by1=Math.max(by1,y);}
 const margin=Math.max(bx1-bx0,by1-by0)*.3;
 for(const island of islands)if(island===best||island.length>=Math.max(12,best.length*.002)){
  const near=island.every(p=>p%w>=bx0-margin&&p%w<=bx1+margin&&Math.floor(p/w)>=by0-margin&&Math.floor(p/w)<=by1+margin);
  if(near)for(const p of island)kept[p]=1;
 }
 const alpha=new Uint8Array(w*h);let minX=w,minY=h,maxX=0,maxY=0;
 for(let p=0;p<w*h;p++)if(kept[p]){const x=p%w,y=Math.floor(p/w);if(x<1||x>=w-1||y<1||y>=h-1)continue;
  const inside=kept[p-1]&&kept[p+1]&&kept[p-w]&&kept[p+w];alpha[p]=inside?255:80;
  if(inside){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 }
 for(let p=0;p<w*h;p++){
  const i=p*4;data[i+3]=alpha[p];
  if(!alpha[p])data.fill(0,i,i+3);
  // Some providers return an alpha channel with green antialias pixels still
  // attached to the cutout. Despill the edge in either mode, not the interior.
  else if(data[i+1]>Math.max(data[i],data[i+2])*(cleanGreen?1.04:1.2)){
   const x=p%w,y=Math.floor(p/w);let edge=false;
   const radius=cleanGreen?7:3;
   for(let dy=-radius;dy<=radius&&!edge;dy++)for(let dx=-radius;dx<=radius;dx++)if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h&&!kept[(y+dy)*w+x+dx]){edge=true;break;}
   if(edge)data[i+1]=Math.max(data[i],data[i+2]);
  }
 }
 const x0=Math.max(0,minX-2),y0=Math.max(0,minY-2);
 const rect={left:x0,top:y0,width:Math.min(w,maxX+3)-x0,height:Math.min(h,maxY+3)-y0};
 return {image:await sharp(data,{raw:{width:w,height:h,channels:4}}).extract(rect).png().toBuffer(),bounds:rect};
}
// Match the generated open head to source colours at low resolution. Manual
// boxes remain the safety search window, not a reason to enlarge a swan's face.
async function fitHead(source,head,box,crop){
 const side=128,k=side/crop[2],target=await sharp(source).resize(side,side).ensureAlpha().raw().toBuffer();
 const [x,y,w,h]=box,cx=(x+w/2)*k,cy=(y+h/2)*k;let best={score:Infinity,rect:box};
 // Registration stays close to the reviewed source box. Colour-only matching
 // rewards a tiny face on similarly coloured scenery; penalise that shrink.
 for(const sx of [.84,.92,1,1.08])for(const sy of [.84,.92,1,1.08]){
  const tw=Math.max(8,Math.round(w*k*sx)),th=Math.max(8,Math.round(h*k*sy));
  const img=await sharp(head).resize(tw,th).ensureAlpha().raw().toBuffer(),samples=[];
  for(let yy=1;yy<th-1;yy+=2)for(let xx=1;xx<tw-1;xx+=2){const i=(yy*tw+xx)*4;if(img[i+3]>230)samples.push([xx,yy,img[i],img[i+1],img[i+2]]);}
  for(let oy=-4;oy<=4;oy+=2)for(let ox=-4;ox<=4;ox+=2){
   const tx=Math.round(cx-tw/2+ox),ty=Math.round(cy-th/2+oy);if(tx<0||ty<0||tx+tw>side||ty+th>side)continue;
   let sum=0,weight=0;for(const [xx,yy,r,g,b]of samples){const i=((ty+yy)*side+tx+xx)*4,v=Math.min(255,(Math.abs(target[i]-r)+Math.abs(target[i+1]-g)+Math.abs(target[i+2]-b))/3),q=(r+g+b<180?2:1);sum+=v*q;weight+=q;}
   const score=sum/Math.max(1,weight)+200*((sx-1)**2+(sy-1)**2)+100*(sx-sy)**2;if(score<best.score)best={score,rect:[Math.round(tx/k),Math.round(ty/k),Math.round(tw/k),Math.round(th/k)]};
  }
 }
 return best.rect;
}
// The generated portrait circle can be larger than the source circle. Register
// its empty backing against the ORIGINAL rim, then erase only the head's
// silhouette. Never replace a whole portrait tile (frame/body/tail/scarf).
async function portraitBacking(image,source,h,head,fit){
 const w=h.crop[2],height=h.crop[3],original=await sharp(source).ensureAlpha().raw().toBuffer();
 const generated=await sharp(image).resize(w,height).ensureAlpha().raw().toBuffer();
 const [hx,hy,hw,hh]=h.head,samples=[];
 for(let y=1;y<height;y+=2)for(let x=1;x<w;x+=2){
  const r=Math.hypot(x-w/2,y-height/2),i=(y*w+x)*4;
  if(r<95||r>106||original[i+3]<210||(x>=hx&&x<=hx+hw&&y>=hy&&y<=hy+hh))continue;
  samples.push([x,y,i]);
 }
 let best={score:Infinity,scale:1,ox:0,oy:0};
 for(let si=80;si<=98;si++)for(let oy=-6;oy<=6;oy+=2)for(let ox=-6;ox<=6;ox+=2){
  const scale=si/100;let score=0;
  for(const [x,y,i]of samples){
   const gx=Math.round((x-w/2-ox)/scale+w/2),gy=Math.round((y-height/2-oy)/scale+height/2);
   if(gx<0||gy<0||gx>=w||gy>=height){score+=765;continue;}
   const j=(gy*w+gx)*4;
   score+=Math.abs(original[i]-generated[j])+Math.abs(original[i+1]-generated[j+1])+Math.abs(original[i+2]-generated[j+2])+Math.abs(original[i+3]-generated[j+3]);
  }
  if(score<best.score)best={score,scale,ox,oy};
 }
 const bw=Math.round(w*best.scale),bh=Math.round(height*best.scale);
 const backing=await sharp({create:{width:w,height,channels:4,background:'#00000000'}}).composite([{input:await sharp(image).resize(bw,bh).png().toBuffer(),left:Math.round((w-bw)/2+best.ox),top:Math.round((height-bh)/2+best.oy)}]).raw().toBuffer();
 const [fx,fy,fw,fh]=fit,mask=new Uint8Array(w*height),pixels=await sharp(head).resize(fw,fh).ensureAlpha().raw().toBuffer();
 for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)if(pixels[(y*fw+x)*4+3]>80){
  for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
   const xx=fx+x+dx,yy=fy+y+dy,d=Math.max(Math.abs(dx),Math.abs(dy));
   if(xx<0||yy<0||xx>=w||yy>=height||yy>fy+fh+1)continue;
   const value=d<=3?255:d===4?170:85;mask[yy*w+xx]=Math.max(mask[yy*w+xx],value);
  }
 }
 console.log(`  portrait ${h.index}: backing registered scale ${best.scale}, offset ${best.ox},${best.oy}; rim/body outside silhouette retained`);
 return {backing,mask};
}
for(const profile of profiles.filter(p=>(!ids.length||ids.includes(p.id))&&liveHeads.some(h=>h.id===p.id))){
 const heads=liveHeads.filter(h=>h.id===profile.id),project=join(root,readdirSync(root).find(n=>n.startsWith(`F${profile.id}_${profile.slug}_v`))),art=join(project,'assets/resources/art'),out=join(project,'output/imagegen/live-heads');
 mkdirSync(out,{recursive:true});const atlasLayers=[],data=[],backgrounds=new Map();
 for(let n=0;n<heads.length;n++){
  const h=heads[n],stem=h.art+(h.index>=0?'-'+h.index:''),file=join(out,stem+`-layers-v${h.version||2}.png`);
  if(!existsSync(file))throw Error('Missing reviewed generation '+file);
  const normalized=await sharp(file).resize(1536,512).ensureAlpha().png().toBuffer();
  const leftImage=await sharp(normalized).extract({left:0,top:0,width:512,height:512}).png().toBuffer();
  const left=await sharp(leftImage).resize(h.crop[2],h.crop[3]).removeAlpha().raw().toBuffer();
  const sourceFile=join(art,h.art+'.'+h.ext),meta=await sharp(sourceFile).metadata();
  if(!backgrounds.has(h.art)){const b=await sharp(sourceFile).ensureAlpha().raw().toBuffer();backgrounds.set(h.art,{bytes:b,width:meta.width,height:meta.height});}
  const bg=backgrounds.get(h.art),[cx,cy,cw,ch]=h.crop,[hx,hy,hw,hh]=h.head;
  const frames=[],poseBuffers=[],cleaned=[];
  for(let pose=0;pose<2;pose++)cleaned.push(await cleanHead(await sharp(normalized).extract({left:(pose+1)*512,top:0,width:512,height:512}).png().toBuffer(),h.cleanGreen));
  const sourceCrop=await sharp(sourceFile).extract({left:cx,top:cy,width:cw,height:ch}).png().toBuffer(),fit=h.fitRect||await fitHead(sourceCrop,cleaned[0].image,h.head,h.crop),[fx,fy,fw,fh]=fit;
  const portrait=h.art==='portraits'&&h.id===29?await portraitBacking(leftImage,sourceCrop,h,cleaned[0].image,fit):null;
  // Only replace the reviewed head rectangle plus a small edge blend, never the
  // full crop. Preserve source body, props, alpha, borders and scenery elsewhere.
  const pad=20,fade=8;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
   const distance=h.version>=3 ? Math.min(x,cw-1-x,y,ch-1-y) : Math.min(x-(hx-pad),hx+hw+pad-x,y-(hy-pad),hy+hh+pad-y);
   const weight=portrait?portrait.mask[y*cw+x]/255:Math.max(0,Math.min(1,distance/fade));if(!weight)continue;
   const p=((cy+y)*bg.width+cx+x)*4,q=(y*cw+x)*3;
   for(let k=0;k<(portrait?4:3);k++)bg.bytes[p+k]=Math.round(bg.bytes[p+k]*(1-weight)+(portrait?portrait.backing[(y*cw+x)*4+k]:left[q+k])*weight);
  }
  for(let pose=0;pose<2;pose++){
   const w=Math.round(232*fw/Math.max(fw,fh)),height=Math.round(232*fh/Math.max(fw,fh)),l=Math.floor((tile-w)/2),t=Math.floor((tile-height)/2);
   const part=await sharp(cleaned[pose].image).resize(w,height).png().toBuffer();poseBuffers.push(part);
   frames.push([pose*tile+l,n*tile+t,w,height]);
  }
  // Blinking must not make ears/hat/outline jump. If the generated silhouettes
  // differ, keep the approved resting pose rather than introducing a bad blink.
  const a=await sharp(poseBuffers[0]).ensureAlpha().raw().toBuffer(),b=await sharp(poseBuffers[1]).ensureAlpha().raw().toBuffer();let union=0,intersection=0;
  for(let p=3;p<a.length;p+=4){const aa=a[p]>128,bb=b[p]>128;if(aa||bb)union++;if(aa&&bb)intersection++;}
  const blinkIoU=intersection/Math.max(1,union),blinkSafe=blinkIoU>=.965;
  const eyeState=h.eyeState,blinkEnabled=eyeState==='open'&&blinkSafe;
  if(!blinkEnabled)poseBuffers[1]=poseBuffers[0];
  for(let pose=0;pose<2;pose++)atlasLayers.push({input:poseBuffers[pose],left:frames[pose][0],top:frames[pose][1]});
  const frameW=h.cell?.[2]||meta.width,frameH=h.cell?.[3]||meta.height,ox=h.cell?.[0]||0,oy=h.cell?.[1]||0;
  const entry={art:h.art,index:h.index??-1,canvas:[frameW,frameH],rect:[cx+fx-ox,cy+fy-oy,fw,fh],pivot:[cx+cw*h.pivot[0]-ox,cy+ch*h.pivot[1]-oy],frames,phase:n*.83+profile.id*.31,angle:h.angle??3.6,period:h.period??(5.8+n*.47),eyeState,blinkEnabled,blinkSafe,blinkIoU:Number(blinkIoU.toFixed(4))};data.push(entry);
 }
 const atlas=await sharp({create:{width:tile*2,height:tile*heads.length,channels:4,background:'#00000000'}}).composite(atlasLayers).png().toBuffer();
 await sharp(atlas).png().toFile(join(art,'living-mascot-parts.png'));
 for(const [name,bg] of backgrounds){
  await sharp(bg.bytes,{raw:{width:bg.width,height:bg.height,channels:4}}).png().toFile(join(art,name+'-live-bg.png'));
  const preview=sharp(bg.bytes,{raw:{width:bg.width,height:bg.height,channels:4}});
  const layers=[];for(const d of data.filter(d=>d.art===name)){const f=d.frames[0],h=heads.find(h=>h.art===name&&(h.index??-1)===d.index);layers.push({input:await sharp(atlas).extract({left:f[0],top:f[1],width:f[2],height:f[3]}).resize(d.rect[2],d.rect[3]).png().toBuffer(),left:d.rect[0]+(h.cell?.[0]||0),top:d.rect[1]+(h.cell?.[1]||0)});}
  await preview.composite(layers).resize({width:720,withoutEnlargement:true}).png().toFile(join(out,name+'-assembly.png'));
 }
 saveText(join(out,'prepared.json'),JSON.stringify(data,null,2)+'\n');
 console.log(`F${profile.id}: prepared ${heads.length} registered heads; inspect ${out}`);
}
