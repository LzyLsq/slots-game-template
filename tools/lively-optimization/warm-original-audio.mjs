/** Preserve F25/F28's own compositions/playback; remaster high-frequency energy only.
 * Originals live outside resources so backups cannot inflate the installed game.
 */
import {readFileSync,readdirSync,existsSync,mkdirSync,copyFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve('.'),base=join(root,'完整游戏模版/全游戏模版'),backup=join(root,'tools/lively-optimization/audio-originals');
const temp=mkdtempSync(join(tmpdir(),'warm-original.'));mkdirSync(backup,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex');
const priorFile=join(backup,'manifest.json'),prior=existsSync(priorFile)?JSON.parse(readFileSync(priorFile,'utf8')):{tracks:[]},reports=[];
for(const id of [25,28]){
 const name=readdirSync(base).find(n=>n.startsWith(`F${id}_`)&&(id!==25||n.includes('_Cocos_'))),dir=join(base,name,'assets/resources/audio');
 for(const file of readdirSync(dir).filter(n=>n.endsWith('.wav'))){
  const path=join(dir,file),saved=join(backup,`F${id}-${file}`),current=readFileSync(path),old=prior.tracks.find(t=>t.id===id&&t.file===file);
  if(old&&hash(current)!==old.outputSha256)throw Error('Audio changed externally; refusing overwrite: '+path);
  if(!existsSync(saved))copyFileSync(path,saved);
  const original=readFileSync(saved),decoded=join(temp,`F${id}-${file}`);
  execFileSync('/usr/bin/afconvert',[saved,decoded,'-f','WAVE','-d','LEI16','-r','44100']);
  const wave=readFileSync(decoded);let at=12,data,channels,rate;
  while(at+8<=wave.length){const tag=wave.toString('ascii',at,at+4),n=wave.readUInt32LE(at+4);if(tag==='fmt '){if(wave.readUInt16LE(at+8)!==1||wave.readUInt16LE(at+22)!==16)throw Error('Unsupported PCM');channels=wave.readUInt16LE(at+10);rate=wave.readUInt32LE(at+12);}if(tag==='data')data={start:at+8,length:n};at+=8+n+(n%2);}
  if(!data||!channels||!rate)throw Error('Invalid WAVE '+saved);
  const low=Array(channels).fill(0),top=Array(channels).fill(0),shelf=1-Math.exp(-2*Math.PI*1700/rate),air=1-Math.exp(-2*Math.PI*4800/rate);let before=0,after=0,peak=0;const samples=[];
  for(let j=0;j<data.length/2;j++){const c=j%channels,x=wave.readInt16LE(data.start+j*2)/32768;low[c]+=shelf*(x-low[c]);top[c]+=air*(.26*x+.74*low[c]-top[c]);samples.push(top[c]);before+=x*x;after+=top[c]*top[c];peak=Math.max(peak,Math.abs(top[c]));}
  const gain=Math.min(1.12,Math.sqrt(before/Math.max(after,1e-10)),.82/Math.max(peak,1e-5));
  samples.forEach((x,j)=>wave.writeInt16LE(Math.round(Math.max(-.99,Math.min(.99,x*gain))*32767),data.start+j*2));
  writeFileSync(path,wave);reports.push({id,file,render:'warm-original-v1-4800Hz',sourceSha256:hash(original),outputSha256:hash(wave),duration:data.length/(rate*channels*2),channels,bytes:wave.length});
 }
 console.log('F'+id+': original music + feedback warmed; composition and duration retained');
}
writeFileSync(priorFile,JSON.stringify({version:1,tracks:reports},null,2)+'\n');
