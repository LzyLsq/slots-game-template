/** Decode the actual shipped recordings; signal checks do not replace listening. */
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {profiles} from './profiles.mjs';
const root=resolve('.'),base=join(root,'完整游戏模版/全游戏模版');
const output=mkdtempSync(join(tmpdir(),'lively-warmth.')),reports=[],hash=b=>createHash('sha256').update(b).digest('hex');
function pcm(file,label){
 const dest=join(output,label+'.wav');execFileSync('/usr/bin/afconvert',[file,dest,'-f','WAVE','-d','LEI16','-r','44100']);
 const b=readFileSync(dest);let rate,channels,start,length;
 for(let i=12;i+8<=b.length;){const size=b.readUInt32LE(i+4),tag=b.toString('ascii',i,i+4);if(tag==='fmt '){const format=b.readUInt16LE(i+8);assert(format===1||(format===65534&&size>=40&&b.readUInt16LE(i+32)===1),'PCM or extensible PCM');assert.equal(b.readUInt16LE(i+22),16);channels=b.readUInt16LE(i+10);rate=b.readUInt32LE(i+12);}if(tag==='data'){start=i+8;length=size;}i+=8+size+size%2;}
 assert(rate&&channels&&length);const frames=length/(2*channels),mono=new Float64Array(frames);let square=0,peak=0;
 for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){const x=b.readInt16LE(start+(i*channels+c)*2)/32768;mono[i]+=x/channels;square+=x*x;peak=Math.max(peak,Math.abs(x));}
 const n=4096;let energy=0,high=0;
 for(let w=0;w<8;w++){
  const offset=Math.floor(Math.max(0,frames-n)*w/7),re=new Float64Array(n),im=new Float64Array(n);
  for(let i=0;i<n;i++)re[i]=(mono[offset+i]??0)*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
  for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}
  for(let len=2;len<=n;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<n;i+=len)for(let j=0;j<len/2;j++){const co=Math.cos(a*j),si=Math.sin(a*j),k=i+j+len/2,r=re[k]*co-im[k]*si,t=re[k]*si+im[k]*co;re[k]=re[i+j]-r;im[k]=im[i+j]-t;re[i+j]+=r;im[i+j]+=t;}}
  for(let i=1;i<n/2;i++){const e=re[i]**2+im[i]**2;energy+=e;if(i*rate/n>=3500)high+=e;}
 }
 return {duration:frames/rate,channels,rms:Math.sqrt(square/(frames*channels)),peak,highFraction:high/Math.max(energy,1e-12)};
}
const unique=new Set();
for(const p of [...profiles,{id:20,slug:'Golden_Canopy'}].sort((a,b)=>a.id-b.id)){
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`))),dir=join(project,p.id===26?'audio':'build-templates/web-mobile/audio');
 const manifest=JSON.parse(readFileSync(join(dir,'music-manifest.json'),'utf8'));
 for(const t of manifest.tracks){const file=join(dir,t.file),h=hash(readFileSync(file));assert(!unique.has(h),'Each theme/cue has its own recording');unique.add(h);const m=pcm(file,`F${p.id}-${t.file}`);assert(Math.abs(m.duration-t.duration)<.1);assert(m.rms>.02&&m.peak<.95,'No clipped or silent recording');assert(m.highFraction<.05,'High-frequency energy is bounded');reports.push({id:p.id,file:t.file,...m});}
 console.log(`F${p.id} PASS decoded ${manifest.tracks.length} distinct AAC recordings: duration, RMS/peak, upper-band budget`);
}
const originalDir=join(root,'tools/lively-optimization/audio-originals'),originalManifest=JSON.parse(readFileSync(join(originalDir,'manifest.json'),'utf8'));
for(const t of originalManifest.tracks){
 const p=profiles.find(p=>p.id===t.id),project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`))),source=join(originalDir,`F${t.id}-${t.file}`),file=join(project,'assets/resources/audio',t.file);
 assert.equal(hash(readFileSync(source)),t.sourceSha256);assert.equal(hash(readFileSync(file)),t.outputSha256);
 const a=pcm(source,`F${t.id}-original-${t.file}`),b=pcm(file,`F${t.id}-warm-${t.file}`);assert.equal(a.channels,b.channels);assert.equal(a.duration,b.duration);assert(b.peak<=.83);assert(a.highFraction<1e-7||b.highFraction<a.highFraction,'Upper-band proportion decreases without altering duration');
 reports.push({id:t.id,file:t.file,before:a,after:b});console.log(`F${t.id} ${t.file} PASS original retained, duration unchanged, >3.5kHz ${(a.highFraction*100).toFixed(4)}% → ${(b.highFraction*100).toFixed(4)}%`);
}
writeFileSync(join(output,'results.json'),JSON.stringify({checkedAt:new Date().toISOString(),method:'8 evenly spaced Hann/4096 FFT windows; >3500Hz fraction; whole decoded PCM RMS/peak',reports},null,2)+'\n');
console.log('Signal report: '+join(output,'results.json'));
