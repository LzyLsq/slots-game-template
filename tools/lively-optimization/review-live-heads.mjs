// Registered composition QA: original, rest, blink and both extremal head tilts.
import {createRequire} from 'node:module';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {profiles} from './profiles.mjs';
import {liveHeads} from './mascot-live-manifest.mjs';
const sharp=createRequire(import.meta.url)(process.env.SHARP_MODULE||'/Users/mengjunzhu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=resolve('完整游戏模版/全游戏模版'),ids=process.argv.slice(2).map(v=>Number(v.replace(/^F/i,'')));
for(const p of profiles.filter(p=>(!ids.length||ids.includes(p.id))&&liveHeads.some(h=>h.id===p.id))){
 const project=join(root,readdirSync(root).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`))),art=join(project,'assets/resources/art'),out=join(project,'output/imagegen/live-heads');
 const data=JSON.parse(readFileSync(join(out,'prepared.json'),'utf8')),heads=liveHeads.filter(h=>h.id===p.id),cells=[];
 for(let n=0;n<heads.length;n++){
  const h=heads[n],d=data[n],[cx,cy,cw,ch]=h.crop,[dx,dy,hw,hh]=d.rect,hx=dx+(h.cell?.[0]||0)-cx,hy=dy+(h.cell?.[1]||0)-cy;
  const background=await sharp(join(art,h.art+'-live-bg.png')).extract({left:cx,top:cy,width:cw,height:ch}).png().toBuffer();
  const source=await sharp(join(art,h.art+'.'+h.ext)).extract({left:cx,top:cy,width:cw,height:ch}).resize(256,256).flatten({background:'#313138'}).png().toBuffer();
  const images=[source];
  for(const [pose,angle] of [[0,0],[1,0],[0,-d.angle*1.3],[0,d.angle*1.3]]){
   const f=d.frames[pose===1&&!d.blinkEnabled?0:pose],head=await sharp(join(art,'living-mascot-parts.png')).extract({left:f[0],top:f[1],width:f[2],height:f[3]}).png().toBuffer();
   const svg=Buffer.from(`<svg width="${cw}" height="${ch}" xmlns="http://www.w3.org/2000/svg"><image href="data:image/png;base64,${background.toString('base64')}" width="${cw}" height="${ch}"/><image href="data:image/png;base64,${head.toString('base64')}" x="${hx}" y="${hy}" width="${hw}" height="${hh}" transform="rotate(${angle} ${cw*h.pivot[0]} ${ch*h.pivot[1]})"/></svg>`);
   images.push(await sharp(svg).resize(256,256).flatten({background:'#313138'}).png().toBuffer());
  }
  const stem=h.art+(h.index>=0?'-'+h.index:''),label=Buffer.from(`<svg width="1280" height="286"><rect width="1280" height="286" fill="#313138"/><text x="8" y="276" fill="white" font-size="14">F${p.id} ${stem} | original / rest / ${d.blinkEnabled?'blink':'held expression'} / -max / +max | eyes ${d.eyeState}, blink ${d.blinkEnabled?'enabled':'disabled'}, silhouette ${d.blinkIoU}</text></svg>`);
  const row=await sharp(label).composite(images.map((input,i)=>({input,left:i*256,top:0}))).png().toBuffer();
  await sharp(row).png().toFile(join(out,stem+'-motion-review.png'));cells.push(row);
 }
 for(let start=0;start<cells.length;start+=4){
  const page=cells.slice(start,start+4);await sharp({create:{width:1280,height:page.length*286,channels:4,background:'#313138'}}).composite(page.map((input,i)=>({input,left:0,top:i*286}))).png().toFile(join(out,`motion-review-${Math.floor(start/4)}.png`));
 }
 console.log(`F${p.id}: ${heads.length} five-pose review strips`);
}
