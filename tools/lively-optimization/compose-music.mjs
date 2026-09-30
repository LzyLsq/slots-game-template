/** Deterministic original scores. Offline AAC render; no runtime synthesizer or sound bank shipped. */
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,statSync,readdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {profiles} from './profiles.mjs';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..');
const base=join(root,'完整游戏模版/全游戏模版'),temporary=mkdtempSync(join(tmpdir(),'theme-music.'));
const renderer=join(temporary,'render-music');
execFileSync('swiftc',[join(base,'F20_Golden_Canopy_v1.0.0/tools/render-music.swift'),'-o',renderer]);
const styles={
 folk:{bpm:112,scale:[0,2,4,7,9],motif:[2,4,3,2,0,1,2,3],rhythm:[0,1,1.5,2.5],harmony:[0,3,0,4,5,3,1,4],bass:[0,1.5,2,3.5]},
 celestial:{bpm:102,scale:[0,2,4,7,9],motif:[4,3,1,2,0,2,3,1],rhythm:[0,.75,2,3],harmony:[0,5,3,4,0,3,1,4],bass:[0,2]},
 parade:{bpm:118,scale:[0,2,4,5,7,9,11],motif:[2,4,5,4,2,1,0,2],rhythm:[0,.5,1.5,2.5],harmony:[0,3,0,4,5,1,3,4],bass:[0,1,2,3]},
 caravan:{bpm:106,scale:[0,2,4,7,9],motif:[0,2,3,2,4,3,1,0],rhythm:[0,.75,1.5,3],harmony:[0,5,3,4,0,3,5,4],bass:[0,1.5,3]},
 swing:{bpm:114,scale:[0,2,4,5,7,9,11],motif:[2,3,4,6,5,3,1,2],rhythm:[0,.67,1.67,2.67],harmony:[0,5,1,4,3,0,1,4],bass:[0,1,2,3]},
 royal:{bpm:108,scale:[0,2,4,5,7,9,11],motif:[0,2,4,5,4,2,1,0],rhythm:[0,1,2,2.5],harmony:[0,3,5,4,0,5,1,4],bass:[0,2]},
 atelier:{bpm:104,scale:[0,2,4,5,7,9,11],motif:[2,1,0,4,3,2,5,4],rhythm:[0,1.5,2,3],harmony:[0,5,1,4,3,0,1,4],bass:[0,1.5,2.5]},
 sea:{bpm:110,scale:[0,2,4,7,9],motif:[0,1,3,4,3,2,1,2],rhythm:[.5,1.5,2,3.5],harmony:[0,3,0,4,5,3,1,4],bass:[0,1.5,2.5,3.5]},
 jade:{bpm:102,scale:[0,2,4,7,9],motif:[0,3,2,4,3,1,2,0],rhythm:[0,.5,2,3],harmony:[0,3,5,4,0,5,3,4],bass:[0,2.5]},
 clockwork:{bpm:112,scale:[0,2,4,5,7,9,11],motif:[0,2,1,3,2,4,3,1],rhythm:[0,.75,1.5,2.75],harmony:[0,5,3,4,0,1,3,4],bass:[0,1,2,3]},
 library:{bpm:98,scale:[0,2,4,5,7,9,11],motif:[4,2,1,0,2,3,1,2],rhythm:[0,1,2.5,3],harmony:[0,5,3,4,0,3,1,4],bass:[0,2]},
};
const gm=['Piano','Bright piano'];
const inst=(program,volume,pan=0,percussion=false)=>({program,volume,pan,percussion});
function compose(p,kind){
 const st=styles[p.style],loop=kind.startsWith('music-'),home=kind==='music-home';
 const rank=['win-small','win-big','win-mega','win-epic','win-super'].indexOf(kind);
 const bpm=loop?st.bpm+(home?0:4):112+rank*4;
 const beats=loop?(home?64:32):[3,6,8,10,12][rank];
 const s={id:kind,title:`${p.name} ${kind}`,description:`${p.style}: ${home?'welcoming call/answer':'lighter cabinet accompaniment'}; separate melody, rhythm and instruments.`,bpm,loop,duration:beats*60/bpm+(loop?0:.48),
  instruments:[inst(p.lead,.68,-.14),inst(p.answer,.48,.18),inst(p.comp,.38,-.22),inst(32,.65),inst(45,.29,.22),inst(0,.29,-.08,true),inst(rank>=2?60:9,.30,.06)],notes:[]};
 let seed=p.id*9137+kind.length*129;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const key=48+[0,2,5,7][p.id%4],major=[0,2,4,5,7,9,11];
 const degree=(d)=>key+major[((d%7)+7)%7]+Math.floor(d/7)*12;
 const note=(instrument,pitch,beat,length,velocity=70)=>s.notes.push({instrument,note:pitch,time:Math.max(0,beat*60/bpm+(rnd()-.5)*.008),duration:length*60/bpm,velocity:Math.round(Math.min(115,Math.max(20,velocity+(rnd()-.5)*6)))});
 const chord=(i,pitches,b,len,v)=>pitches.forEach((n,j)=>note(i,n,b+j*.015,len,v));
 if(loop)for(let bar=0;bar<beats/4;bar++){
   const b=bar*4,d=st.harmony[(bar+(home?0:2))%8],bass=degree(d),voicing=[degree(d+7),degree(d+9),degree(d+11)];
   st.bass.forEach((t,j)=>note(3,bass+(j%2?7:0),b+t,.5,home?74:63));
   const rhythm=home?st.rhythm:[.5,2.5];rhythm.forEach(t=>chord(2,voicing,b+t,home?.38:.30,home?55:48));
   const rotation=(p.id+Math.floor(bar/4)+(home?0:3))%st.motif.length;
   const melodyIndex=bar%4===3?1:0;
   if(home||bar%2===0)st.rhythm.forEach((t,j)=>{
     const n=st.motif[(rotation+j+bar*2)%st.motif.length];
     const pitch=key+24+st.scale[n%st.scale.length]+(bar>=8&&j===0?12:0);
     note(melodyIndex,pitch,b+t,j===3?.65:.42,home?72:58);
   });
   if(home&&bar%2===1)[2,2.75,3.5].forEach((t,j)=>note(1,voicing[2-j]+12,b+t,.27,57));
   if(home)[1.5,3.5].forEach((t,j)=>note(4,voicing[j]+12,b+t,.18,49));
   if(bar%4===0)note(6,voicing[2]+12,b+.15,.5,48);
   [0,2].forEach(t=>note(5,36,b+t,.10,home?50:38));
   [1,3].forEach(t=>note(5,p.style==='swing'?37:54,b+t,.08,home?48:33));
   for(let j=0;j<8;j++)note(5,p.style==='sea'||p.style==='jade'?69:42,b+j*.5,.04,home?(j%2?36:28):24);
   if(home&&bar%4===3)[3,3.25,3.5].forEach((t,j)=>note(5,[60,61,54][j],b+t,.09,48));
 }else{
   // Short awards have an arrival, melodic rise and resolved cadence, not sped-up BGM.
   const seq=rank===0?[4,7,9,7,12]:[0,4,7,9,12,16,14,19,16,12];
   seq.slice(0,rank===0?5:6+rank).forEach((n,j)=>note(rank>=2?6:0,key+24+n+(p.id%2?2:0),j*.38,.34,rank===0?61:76));
   const finale=beats-(rank===0?.8:1.5);
   chord(2,[key+12,key+16,key+19],0,.6,50);
   chord(6,[key+24,key+28,key+31,key+36],finale,rank===0?.6:1.15,rank===0?50:65);
   if(rank>0){note(5,36,0,.16,66);note(5,55,finale,.25,48);[0,.5,1].forEach((t,j)=>note(4,key+19+j*5,finale+t,.35,55));}
 }
 s.notes.sort((a,b)=>a.time-b.time);return s;
}
const selected=profiles.filter(p=>![25,28].includes(p.id)&&(!process.argv[2]||process.argv.slice(2).map(Number).includes(p.id)));
for(const p of selected){
 const dir=readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`));
 const output=join(base,dir,p.id===26?'audio':'build-templates/web-mobile/audio');mkdirSync(output,{recursive:true});
 const reports=[];
 for(const kind of ['music-home','music-cabinet','win-small','win-big','win-mega','win-epic','win-super']){
  const s=compose(p,kind),scorePath=join(temporary,`f${p.id}-${kind}.json`),rawPath=scorePath+'.f32',wavPath=scorePath+'.wav';
  const scoreSha256=createHash('sha256').update(JSON.stringify(s)).digest('hex'),target=join(output,kind+'.m4a');
  const old=existsSync(join(output,'music-manifest.json'))?JSON.parse(readFileSync(join(output,'music-manifest.json'))).tracks?.find(t=>t.id===kind):undefined;
  if(old?.scoreSha256===scoreSha256&&existsSync(target)){reports.push(old);continue;}
  writeFileSync(scorePath,JSON.stringify(s));execFileSync(renderer,[scorePath,rawPath],{stdio:'pipe'});
  const raw=readFileSync(rawPath),samples=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4),frames=samples.length/2;
  let mean=0;for(const n of samples){if(!Number.isFinite(n))throw new Error('Invalid PCM');mean+=n;}mean/=samples.length;
  let rms=0,peak=0;for(const n of samples){const x=n-mean;rms+=x*x;peak=Math.max(peak,Math.abs(x));}rms=Math.sqrt(rms/samples.length);
  if(rms<.0001)throw new Error('Silent score');const gain=Math.min((s.loop?.10:.15)/rms,.78/peak);
  const wave=Buffer.alloc(44+frames*4);wave.write('RIFF');wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(2,22);wave.writeUInt32LE(44100,24);wave.writeUInt32LE(176400,28);wave.writeUInt16LE(4,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(frames*4,40);
  let outRms=0,outPeak=0;for(let i=0;i<samples.length;i++){const frame=i>>1,t=frame/44100,fade=Math.max(0,Math.min(1,t/(s.loop?.004:.006),(frames-1-frame)/(44100*(s.loop?.004:.34))));const x=(samples[i]-mean)*gain*fade;outRms+=x*x;outPeak=Math.max(outPeak,Math.abs(x));wave.writeInt16LE(Math.round(x*32767),44+i*2);}
  writeFileSync(wavPath,wave);execFileSync('/usr/bin/afconvert',[wavPath,target,'-f','m4af','-d','aac','-b','96000','-q','127']);
  reports.push({id:kind,title:s.title,description:s.description,file:kind+'.m4a',duration:frames/44100,loop:s.loop,bpm:s.bpm,programs:s.instruments.map(i=>i.program),notes:s.notes.length,scoreSha256,bytes:statSync(target).size,sha256:createHash('sha256').update(readFileSync(target)).digest('hex'),peak:outPeak,rms:Math.sqrt(outRms/samples.length)});
 }
 writeFileSync(join(output,'music-manifest.json'),JSON.stringify({version:1,format:'AAC-LC stereo 44100 Hz 96kbps',creation:'Original deterministic score: tools/lively-optimization/compose-music.mjs. Offline macOS instrument render; no external recording or runtime sound bank.',theme:p.name,tracks:reports},null,2)+'\n');
 console.log(`F${p.id}: 7 distinct scores, ${Math.round(reports.reduce((a,t)=>a+t.bytes,0)/1024)} KiB`);
}
console.log('Offline scores/PCM retained for inspection: '+temporary);
