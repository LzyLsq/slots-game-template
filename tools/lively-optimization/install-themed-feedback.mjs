// Asset-only upgrade. Keep filenames, gameplay, runtime limits and native/IAP files.
// All layers are licensed sample recordings at original pitch and original speed.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,cpSync,mkdirSync,existsSync,mkdtempSync,readdirSync,statSync,renameSync} from 'node:fs';
import {join,dirname,relative,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {themedFeedbackProfiles as profiles,themedFeedbackRevision as revision} from './themed-feedback-profiles.mjs';

const root=resolve(import.meta.dirname,'../..');
const option=n=>process.argv.find(a=>a.startsWith(`--${n}=`))?.slice(n.length+3);
const cache=option('cache'),ffmpeg=option('ffmpeg');
assert(cache&&existsSync(ffmpeg),'Provide --cache and --ffmpeg');
const selections=JSON.parse(readFileSync(join(import.meta.dirname,'curated-audio-sources/selection-manifest.json')));
const roots=[join(root,'Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const backup=mkdtempSync(join(tmpdir(),'themed-feedback-before.')),stage=mkdtempSync(join(tmpdir(),'themed-feedback-render.'));
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const read=f=>JSON.parse(readFileSync(f));
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const sampleRate=44100,decoded=new Map(),native=new Map(),unchanged=new Map(),snapshots=[],rendered=[];
console.log('Recoverable audio backup: '+backup);
const sourcePacks={
 interface:{url:'https://kenney.nl/assets/interface-sounds'},casino:{url:'https://kenney.nl/assets/casino-audio'},jingles:{url:'https://kenney.nl/assets/music-jingles'},
 impact:{url:'https://kenney.nl/assets/impact-sounds'},rpg:{url:'https://kenney.nl/assets/rpg-audio'},
};
for(const [pack,p] of Object.entries(sourcePacks)){
 const file=join(cache,pack,'License.txt');assert(existsSync(file));assert(/CC0|Creative Commons Zero/.test(readFileSync(file,'utf8')));
 p.licenseSha256=hash(file);
}
function source(key){
 if(decoded.has(key))return decoded.get(key);
 const [pack,...rest]=key.split('/'),path=join(cache,pack,'Audio',rest.join('/')+'.ogg');assert(existsSync(path),'Missing '+key);
 const data=execFileSync(ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-i',path,'-ar',String(sampleRate),'-ac','1','-f','f32le','pipe:1'],{maxBuffer:16*1024*1024});
 const raw=new Float32Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
 let peak=0;for(const n of raw)peak=Math.max(peak,Math.abs(n));assert(peak>.005,'Silent source '+key);
 let start=0;while(start<raw.length&&Math.abs(raw[start])<peak*.004)start++;
 const value={pcm:raw.subarray(Math.max(0,start-66)),peak,key,pack,path,sha256:hash(path)};decoded.set(key,value);return value;
}
function layer(key,at=0,gain=1,max=.24){return{key,at,gain,max};}
function compose(recipe,max,normalRms=.20){
 const result=new Float32Array(Math.ceil(max*sampleRate));
 for(const l of recipe){
  const s=source(l.key),offset=Math.round(l.at*sampleRate),length=Math.min(s.pcm.length,Math.ceil(l.max*sampleRate),result.length-offset);
  const attack=88,release=Math.min(1102,Math.round(length/6));
  for(let n=0;n<length;n++){
   const envelope=Math.min(1,n/attack,(length-1-n)/Math.max(1,release));
   result[offset+n]+=s.pcm[n]/s.peak*l.gain*Math.max(0,envelope);
  }
 }
 let peak=0,sum=0;for(const v of result){peak=Math.max(peak,Math.abs(v));sum+=v*v;}
 const rms=Math.sqrt(sum/result.length);assert(rms>.002);
 const gain=Math.min(normalRms/rms,.62/peak);
 for(let n=0;n<result.length;n++)result[n]*=gain;
 return Buffer.from(result.buffer);
}
const actions=['ui-tap','ui-back','ui-select','bet-up','bet-down','spin-start','stop-1','stop-2','stop-3','coin-1','coin-2','coin-3','burst','reveal','collect','reward'];
const winNames=['win-small','win-big','win-mega','win-epic','win-super'];
const families={PIZZI:'Pizzicato jingles',SAX:'Sax jingles',STEEL:'Steel jingles'};
const phraseNumbers=[0,1,4,7,11]; // Success phrases retained; never mix error/loss cues into wins.
const familyOrder=new Map();
function recipes(p){
 const t=p.touch,g=p.gesture,c=p.treasure;
 const a=(name,max,parts)=>({id:'sfx-'+name,file:'sfx-'+name+'.wav',max,parts});
 const index=profiles.findIndex(x=>x.id===p.id),v=index%4+1,button=(name,n=v)=>`interface/${name}_${String(n).padStart(3,'0')}`;
 const list=[
  a('ui-tap',.16,[layer(t[0],0,.85,.15),layer(button('click'),.008,.18,.12)]),
  a('ui-back',.24,[layer(g[0],0,.65,.22),layer(t[1],.022,.35,.16),layer(button('back'),.010,.14,.22)]),
  a('ui-select',.23,[layer(t[2],0,.80,.20),layer(button('select',index%8+1),.020,.25,.19)]),
  a('bet-up',.19,[layer(t[1],0,.70,.18),layer(button('switch',index%7+1),.016,.30,.16)]),
  a('bet-down',.21,[layer(t[0],0,.65,.15),layer(g[1],.014,.24,.18),layer(button('switch',(index+3)%7+1),0,.25,.18)]),
  a('spin-start',.47,[layer(g[1],0,.85,.43),layer(t[2],.045,.42,.22),layer(`casino/card-slide-${index%8+1}`,.012,.25,.38)]),
  ...[0,1,2].map(n=>a('stop-'+(n+1),.20,[layer(t[n],0,.82,.18),layer(c[n%2],.017,.20,.16)])),
  ...[0,1,2].map(n=>a('coin-'+(n+1),.12,[layer(c[n%2],0,.65,.105),layer(t[(n+1)%3],.014,.32,.09)])),
  a('burst',.58,[layer(c[1],0,.65,.48),layer(t[2],.055,.45,.20),layer(g[0],.018,.32,.50)]),
  a('reveal',.55,[layer(g[1],0,.65,.42),layer(t[0],.032,.60,.29),layer(button('confirmation'),.020,.28,.48)]),
  a('collect',.40,[layer(c[0],0,.78,.33),layer(t[1],.028,.42,.23),layer(g[0],.010,.16,.36)]),
  a('reward',.48,[layer(t[2],0,.60,.26),layer(c[1],.048,.53,.32),layer(button('confirmation',(v%4)+1),.012,.22,.42)]),
 ];
 const suite=familyOrder.get(p.family)||0;familyOrder.set(p.family,suite+1);
 const phrase=n=>`jingles/${families[p.family]}/jingles_${p.family}${String(n).padStart(2,'0')}`;
 for(let tier=0;tier<5;tier++){
  // Distinct authored phrase order and material signature; never speed/pitch variants.
  const first=phraseNumbers[(suite+tier)%5],second=phraseNumbers[(suite+tier+1+Math.floor(suite/5))%5];
  const third=phraseNumbers[(suite*2+tier+3)%5];
  // One phrase reused across suites was perceptually near-identical despite
  // distinct low-level material accents. Every tier now has a distinct pair
  // of complete success phrases; higher tiers add a third response.
  const notes=[first,second,...(tier>=3?[third]:[])];
  const parts=[layer(t[(tier+1)%3],0,.23,.22),layer(g[tier%2],.020,.12,.25)];
  let at=.025;
  for(const n of notes){const key=phrase(n),length=source(key).pcm.length/sampleRate;parts.push(layer(key,at,.80,Math.min(length,1.8)));at+=Math.min(length,1.8)-.035;}
  parts.push(layer(c[(tier+suite)%2],Math.max(.045,at-.10),.28,.28));
  list.push({id:winNames[tier],file:winNames[tier]+'.m4a',max:at+.25,parts,phraseOrder:notes});
 }
 assert.deepEqual(list.slice(0,16).map(r=>r.id),actions.map(n=>'sfx-'+n));
 return list;
}
for(const p of profiles){
 const g=selections.find(g=>g.id===p.id);assert(g);
 const sourceAudio=join(g.project,p.id===26?'audio':'build-templates/web-mobile/audio');
 const m=read(join(sourceAudio,'music-manifest.json'));assert.equal(m.tracks.length,24);
 assert.equal(m.situationRevision,'accepted-spin-last-reel-modal-award-20261010');
 const buildAudio=join(g.project,p.id===26?'dist/audio':'build/web-mobile/audio');assert(existsSync(buildAudio));
 const targets=[sourceAudio,buildAudio];
 for(const delivery of roots){
  const game=read(join(delivery,'manifest.json')).find(g=>g.id===p.id);assert(game);
  const audio=join(delivery,game.folder,`F${p.id}_H5/audio`);assert(existsSync(audio));targets.push(audio);
  for(const folder of [join(delivery,game.folder,'DBGame'),join(delivery,game.folder,`F${p.id}_H5/ios-wrapper`)]){
   for(const file of walk(folder))if(!file.includes('/xcuserdata/'))native.set(file,hash(file));
  }
 }
 for(const target of targets){
  const directory=join(backup,`F${p.id}`,String(targets.indexOf(target)));cpSync(target,directory,{recursive:true});snapshots.push({target,backup:directory});
  for(const file of walk(target)){const name=relative(target,file);if(!name.startsWith('sfx-')&&!name.startsWith('win-')&&!['music-manifest.json','credits.json','feedback-design.json'].includes(name))unchanged.set(file,hash(file));}
 }
 const dir=join(stage,'F'+p.id);mkdirSync(dir,{recursive:true});
 const design={id:p.id,revision,label:p.label,zh:p.zh,sourcePacks,originalSpeed:true,originalPitch:true,runtimeExtraVoices:0,recipes:recipes(p)};
 for(const r of design.recipes){
  const target=join(dir,r.file),pcm=compose(r.parts,r.max,r.file.endsWith('.wav')?.20:.16);
  execFileSync(ffmpeg,['-nostdin','-y','-hide_banner','-loglevel','error','-f','f32le','-ar',String(sampleRate),'-ac','1','-i','pipe:0',
   '-af','highpass=f=40,highshelf=f=3600:g=-3,lowpass=f=6200,alimiter=limit=0.70:level=false',
   '-ar',String(sampleRate),'-ac',r.file.endsWith('.wav')?'1':'2','-c:a',r.file.endsWith('.wav')?'pcm_s16le':'aac',
   ...(r.file.endsWith('.wav')?[]:['-b:a','128k','-movflags','+faststart']),target],{input:pcm,maxBuffer:4*1024*1024});
  r.sha256=hash(target);r.sources=r.parts.map(l=>{const s=source(l.key);return{key:l.key,sourceSha256:s.sha256,sourceUrl:sourcePacks[s.pack].url,license:'CC0 1.0',at:l.at,gain:l.gain,maxSeconds:l.max};});
  const track=m.tracks.find(t=>t.id===r.id);assert(track);
  Object.assign(track,{title:p.label+' / '+r.id,artist:'Kenney Vleugels; sample arrangement by project',license:'CC0 1.0',sourceUrl:sourcePacks[r.sources[0].key.split('/')[0]].url,sourceSha256:r.sources[0].sourceSha256,sha256:r.sha256,duration:r.max,
   sources:r.sources,phraseOrder:r.phraseOrder,modifications:'Original-speed recordings; per-theme material palette and distinct phrase arrangement, short envelopes, offline mix, gentle EQ. No runtime oscillator, pitch shift or tempo change.'});
 }
 m.feedbackThemeRevision=revision;m.feedbackPalette=p.label;m.version=Math.max(4,m.version||0);
 const credits=read(join(sourceAudio,'credits.json'));credits.effects.packs=Object.entries(sourcePacks).map(([key,s])=>({name:key,sourceUrl:s.url,license:'CC0 1.0',licenseSha256:s.licenseSha256}));credits.effects.modifications='Distinct themed sample arrangements; original speed/pitch, edited envelopes, offline mixing and gentle EQ. Source recordings shared where appropriate; not 420 original field recordings.';
 writeFileSync(join(dir,'music-manifest.json'),JSON.stringify(m,null,2)+'\n');writeFileSync(join(dir,'credits.json'),JSON.stringify(credits,null,2)+'\n');
 writeFileSync(join(dir,'feedback-design.json'),JSON.stringify(design,null,2)+'\n');
 for(const pack of Object.keys(sourcePacks))copyFileSync(join(cache,pack,'License.txt'),join(dir,`Kenney-${pack}-License.txt`));
 rendered.push({id:p.id,dir,targets,design,files:walk(dir).map(f=>({name:relative(dir,f),sha256:hash(f),bytes:statSync(f).size}))});
 console.log('F'+p.id+': rendered 16 material feedbacks + 5 themed musical stings');
}
// Reject duplicate encoded sound assets BEFORE changing any delivery folder.
for(const id of [...actions.map(n=>'sfx-'+n),...winNames]){
 const signatures=rendered.map(g=>g.design.recipes.find(r=>r.id===id).sha256);assert.equal(new Set(signatures).size,profiles.length,'Duplicate corresponding cue '+id);
 const combinations=rendered.map(g=>JSON.stringify(g.design.recipes.find(r=>r.id===id).parts.map(p=>p.key)));assert.equal(new Set(combinations).size,profiles.length,'Only gain/timing variants '+id);
}
for(const g of rendered){
 for(const target of g.targets)for(const file of g.files){
  const to=join(target,file.name),next=to+'.themed-next';copyFileSync(join(g.dir,file.name),next);assert.equal(hash(next),file.sha256);renameSync(next,to);
 }
 for(const delivery of roots){
  const file=join(delivery,'manifest.json'),manifest=read(file),row=manifest.find(r=>r.id===g.id);
  const audio=join(delivery,row.folder,`F${g.id}_H5/audio`),web=dirname(audio);
  row.feedbackThemeRevision=revision;row.feedbackPalette=g.design.label;row.feedbackAudioUpdatedAt=new Date().toISOString();
  row.webBytes=walk(web).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/')).reduce((sum,f)=>sum+statSync(f).size,0);
  writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
 }
}
for(const [file,h] of native)assert.equal(hash(file),h,'Protected native file changed '+file);
for(const [file,h] of unchanged)assert.equal(hash(file),h,'Background/license file changed '+file);
const report={checkedAt:new Date().toISOString(),revision,backup,stage,snapshots,sourcePacks,games:rendered.map(g=>({id:g.id,label:g.design.label,zh:g.design.zh,targets:g.targets,files:g.files})),nativeFilesChanged:false,protectedNativeFiles:native.size,unchangedBackgroundAndLicenseFiles:unchanged.size,scope:'Asset-only. Playback filenames, runtime behavior, game math, IAP and signing unchanged; old QA reports are historical.'};
mkdirSync(join(import.meta.dirname,'verification/themed-feedback-20261010'),{recursive:true});
writeFileSync(join(import.meta.dirname,'verification/themed-feedback-20261010/install.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(backup,'install.json'),JSON.stringify(report,null,2)+'\n');
console.log('20 suites installed into source, source Web build and both deliveries. '+native.size+' native files unchanged.');
