// Asset-only polish. No game math, signing, StoreKit or playback code changes.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,copyFileSync,cpSync,mkdirSync,existsSync,mkdtempSync,readdirSync,statSync,renameSync} from 'node:fs';
import {join,dirname,relative,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {polishedFeedbackProfiles as profiles,polishedFeedbackRevision as revision,polishedEvidenceDirectory} from './polished-feedback-profiles.mjs';

const root=resolve(import.meta.dirname,'../..');
const option=n=>process.argv.find(a=>a.startsWith(`--${n}=`))?.slice(n.length+3);
const cache=option('cache'),ffmpeg=option('ffmpeg');
assert(cache&&existsSync(ffmpeg),'Provide --cache and --ffmpeg');
const selections=JSON.parse(readFileSync(join(import.meta.dirname,'curated-audio-sources/selection-manifest.json')));
const roots=[join(root,'Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const backup=mkdtempSync(join(tmpdir(),'polished-feedback-before.'));
const stage=mkdtempSync(join(tmpdir(),'polished-feedback-render.'));
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const read=f=>JSON.parse(readFileSync(f));
const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(d,e.name)):[join(d,e.name)]);
const sampleRate=44100,channels=2,decoded=new Map(),native=new Map(),unchanged=new Map(),snapshots=[],rendered=[];
console.log('Recoverable audio backup: '+backup);
const sourcePacks=Object.fromEntries(['interface','casino','jingles','impact','rpg'].map(pack=>[pack,{
 url:`https://kenney.nl/assets/${({interface:'interface-sounds',casino:'casino-audio',jingles:'music-jingles',impact:'impact-sounds',rpg:'rpg-audio'})[pack]}`,
}]));
for(const [pack,p] of Object.entries(sourcePacks)){
 const file=join(cache,pack,'License.txt');assert(existsSync(file));
 assert(/CC0|Creative Commons Zero/.test(readFileSync(file,'utf8')));p.licenseSha256=hash(file);
}
function source(key){
 if(decoded.has(key))return decoded.get(key);
 const [pack,...rest]=key.split('/'),path=join(cache,pack,'Audio',rest.join('/')+'.ogg');
 assert(existsSync(path),'Missing '+key);
 const data=execFileSync(ffmpeg,['-nostdin','-hide_banner','-loglevel','error','-i',path,'-ar',String(sampleRate),'-ac','2','-f','f32le','pipe:1'],{maxBuffer:16*1024*1024});
 const pcm=new Float32Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
 let peak=0;for(const n of pcm)peak=Math.max(peak,Math.abs(n));assert(peak>.005,'Silent source '+key);
 // Keep full source audio (including authored leading space and reverb tail).
 const first=pcm.findIndex(n=>Math.abs(n)>peak*.015);
 const onsetFrame=Math.max(0,Math.floor(first/channels)-Math.round(.002*sampleRate));
 const value={pcm,peak,key,pack,path,sha256:hash(path),seconds:pcm.length/channels/sampleRate,onsetFrame};
 decoded.set(key,value);return value;
}
function layer(key,at=0,gain=1,maximumSeconds=Infinity){
 const s=source(key),sourceOffsetFrames=key.startsWith('jingles/')?0:s.onsetFrame;
 const available=s.pcm.length/channels-sourceOffsetFrames;
 const frames=Math.min(available,Math.ceil(maximumSeconds*sampleRate));
 return {key,at,gain,max:frames/sampleRate,sourceSeconds:s.seconds,sourceOffsetFrames,
  naturalTailRetained:frames===available,completeSource:sourceOffsetFrames===0&&frames===available};
}
function compose(recipe,seconds,rmsTarget){
 const result=new Float32Array(Math.ceil(seconds*sampleRate)*channels);
 for(const l of recipe){
  const s=source(l.key),offset=Math.round(l.at*sampleRate),length=Math.min(s.pcm.length/channels-l.sourceOffsetFrames,Math.round(l.max*sampleRate));
  // Only *deliberately shortened foley* receives a tail envelope. Complete
  // musical cues are not shortened or wrapped in a truncating release envelope.
  const release=l.naturalTailRetained?0:Math.min(Math.round(.045*sampleRate),Math.round(length/4));
  for(let n=0;n<length;n++){
   const envelope=release?Math.min(1,(length-1-n)/release):1;
   for(let c=0;c<channels;c++)result[(offset+n)*channels+c]+=s.pcm[(l.sourceOffsetFrames+n)*channels+c]/s.peak*l.gain*Math.max(0,envelope);
  }
 }
 let peak=0,sum=0;for(const v of result){peak=Math.max(peak,Math.abs(v));sum+=v*v;}
 const rms=Math.sqrt(sum/result.length);assert(rms>.001);
 // No gain boost beyond a headroom-safe peak. Frequent counter cues are much
 // quieter than one-time reveal/collect cues; not all actions peak-normalized alike.
 const gain=Math.min(rmsTarget/rms,.56/peak);
 for(let n=0;n<result.length;n++)result[n]*=gain;
 return Buffer.from(result.buffer);
}
const actions=['ui-tap','ui-back','ui-select','bet-up','bet-down','spin-start','stop-1','stop-2','stop-3','coin-1','coin-2','coin-3','burst','reveal','collect','reward'];
const winNames=['win-small','win-big','win-mega','win-epic','win-super'];
const families={PIZZI:'Pizzicato jingles',SAX:'Sax jingles',STEEL:'Steel jingles',HIT:'Hit jingles'};
const successPhrases=[0,1,4,7,11]; // Positive cues already in the licensed bank.
function recipes(p){
 const t=p.touch,g=p.gesture,c=p.treasure;
 const index=profiles.findIndex(x=>x.id===p.id);
 const button=(name,n)=>`interface/${name}_${String(n).padStart(3,'0')}`;
 const cue=(name,rms,parts)=>({id:'sfx-'+name,file:'sfx-'+name+'.wav',rmsTarget:rms,parts});
 // One clear primary material with at most one low-level functional accent.
 // Duration limits suit responsive UI; foley fades only if the original is longer.
 const list=[
  cue('ui-tap',.075,[layer(t[0],0,.90,.30),layer(button('click',index%4+1),.006,.15,.18)]),
  // Treasury's sliding material swells slowly: let its latch confirm the
  // action immediately, without changing either recording's pitch/speed.
  cue('ui-back',.080,[layer(g[0],0,.60,.44),layer(t[1],p.id===19?.002:.025,.20,.28)]),
  cue('ui-select',.090,[layer(t[2],0,.85,.36),layer(button('select',index%8+1),.015,.22,.26)]),
  cue('bet-up',.070,[layer(t[1],0,.80,.30),layer(button('switch',index%7+1),.012,.18,.25)]),
  cue('bet-down',.060,[layer(t[0],0,.68,.30),layer(g[1],.016,.16,.34)]),
  // Caravan's pouch movement benefits from an early chest/leather attack.
  cue('spin-start',.120,[layer(g[1],0,.80,.66),layer(t[p.id===17?1:2],p.id===17?.004:.035,.36,.32)]),
  // A gradual leather handling sound suits navigation but not a precise
  // reel stop. Velvet's middle stop uses a distinct padded impact instead.
  ...[0,1,2].map(n=>cue('stop-'+(n+1),.105,[layer(p.id===25&&n===1?'impact/impactSoft_heavy_000':t[n],0,.85,.34)])),
  ...[0,1,2].map(n=>cue('coin-'+(n+1),.045,[layer(c[n%2],0,.70,.22),...(n===2?[layer(t[0],.045,.18,.18)]:[])])),
  cue('burst',.145,[layer(c[1],0,.70,.76),layer(t[2],.050,.30,.36)]),
  cue('reveal',.140,[layer(g[1],0,.65,.64),layer(t[0],.028,.45,.36)]),
  cue('collect',.120,[layer(c[0],0,.80,.70),layer(t[1],.040,.28,.32)]),
  cue('reward',.135,[layer(t[2],0,.50,.42),layer(c[1],.060,.70,.72)]),
 ];
 for(let tier=0;tier<5;tier++){
  const number=successPhrases[(p.motifIndex+tier)%5];
  const key=`jingles/${families[p.awardFamily]}/jingles_${p.awardFamily}${String(number).padStart(2,'0')}`;
  const musical=layer(key,0,.90);
  const parts=[musical];
  // A short material signature accompanies the opening, not another unrelated
  // melody. Higher awards have a separate treasure release after the cue.
  parts.push(layer(t[tier%3],.012,.10+.015*tier,.32));
  if(tier>=1)parts.push(layer(c[tier%2],Math.max(.08,musical.max-.05),.18+.025*tier,.70));
  list.push({id:winNames[tier],file:winNames[tier]+'.m4a',rmsTarget:.125+.01*tier,parts,
   phraseOrder:[number],primaryMusicalSource:key,completeMusicalCue:true});
 }
 for(const r of list)r.max=Math.max(...r.parts.map(l=>l.at+l.max))+.025;
 assert.deepEqual(list.slice(0,16).map(r=>r.id),actions.map(n=>'sfx-'+n));
 return list;
}
// Preflight all targets before any asset mutation. Back up only the audio scope.
for(const p of profiles){
 const g=selections.find(g=>g.id===p.id);assert(g);
 const sourceAudio=join(g.project,p.id===26?'audio':'build-templates/web-mobile/audio');
 const m=read(join(sourceAudio,'music-manifest.json'));assert.equal(m.tracks.length,24);
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
  const directory=join(backup,`F${p.id}`,String(targets.indexOf(target)));cpSync(target,directory,{recursive:true});
  snapshots.push({target,backup:directory});
  for(const file of walk(target)){const name=relative(target,file);if(!name.startsWith('sfx-')&&!name.startsWith('win-')&&!['music-manifest.json','credits.json','feedback-design.json'].includes(name))unchanged.set(file,hash(file));}
 }
 const dir=join(stage,'F'+p.id);mkdirSync(dir,{recursive:true});
 const design={id:p.id,revision,label:p.label,zh:p.zh,awardFamily:p.awardFamily,sourcePacks,
  originalSpeed:true,originalPitch:true,stereoMusicalCues:true,runtimeExtraVoices:0,
  truncatedMusicalCues:0,unrelatedMusicalPhrasesStitched:0,recipes:recipes(p)};
 for(const r of design.recipes){
  const target=join(dir,r.file),pcm=compose(r.parts,r.max,r.rmsTarget),wav=r.file.endsWith('.wav');
  // A bounded generated intermediate avoids synchronous stdin back-pressure
  // stalls on macOS. It lives outside game folders and is never delivered.
  const intermediate=join(stage,'working-input.f32');writeFileSync(intermediate,pcm);
  // Mild high-shelf only; remove the previous 6.2kHz blanket low-pass. Preserve
  // source timbre/stereo and dynamics instead of treating "soft" as "muffled".
  execFileSync(ffmpeg,['-nostdin','-y','-hide_banner','-loglevel','error','-f','f32le','-ar',String(sampleRate),'-ac','2','-i',intermediate,
   '-af','highpass=f=35,highshelf=f=4800:g=-2',
   '-ar',String(sampleRate),'-ac',wav?'1':'2','-c:a',wav?'pcm_s16le':'aac',
   ...(wav?[]:['-b:a','160k','-movflags','+faststart']),target],{maxBuffer:4*1024*1024,timeout:30000});
  // Validate responsive feedback *after* stereo downmix, EQ and encoding,
  // while still staged. Low source-level onset alone can miss a slow swell.
  if(wav){
   const data=execFileSync(ffmpeg,['-nostdin','-v','error','-i',target,'-ar','8000','-ac','1','-f','f32le','pipe:1'],{maxBuffer:4*1024*1024,timeout:30000});
   const renderedPcm=new Float32Array(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength));
   let finalPeak=0;for(const v of renderedPcm)finalPeak=Math.max(finalPeak,Math.abs(v));
   r.firstTransientMs=renderedPcm.findIndex(v=>Math.abs(v)>finalPeak*.02)/8;
   assert(r.firstTransientMs>=0&&r.firstTransientMs<40,`Staged feedback onset delayed F${p.id} ${r.id}: ${r.firstTransientMs}ms`);
  }
  r.sha256=hash(target);
  r.sources=r.parts.map(l=>{const s=source(l.key);return {key:l.key,sourceSha256:s.sha256,sourceUrl:sourcePacks[s.pack].url,license:'CC0 1.0',at:l.at,gain:l.gain,maxSeconds:l.max,sourceSeconds:s.seconds,sourceOffsetSeconds:l.sourceOffsetFrames/sampleRate,naturalTailRetained:l.naturalTailRetained,completeSource:l.completeSource};});
  const track=m.tracks.find(t=>t.id===r.id);assert(track);
  Object.assign(track,{title:p.label+' / '+r.id,artist:'Kenney Vleugels; sample editing by project',license:'CC0 1.0',
   sourceUrl:r.sources[0].sourceUrl,sourceSha256:r.sources[0].sourceSha256,sha256:r.sha256,duration:r.max,
   sources:r.sources,phraseOrder:r.phraseOrder,primaryMusicalSource:r.primaryMusicalSource,
   modifications:'Original speed/pitch. One complete stock musical cue per award, retained stereo and authored tail, restrained theme foley. Trimmed low-level foley lead-in with 2ms pre-onset, role-balanced feedback, 45ms fades only on shortened foley, mild high-shelf. No stitched melodies or runtime oscillators.'});
 }
 m.feedbackThemeRevision=revision;m.feedbackPalette=p.label;m.version=Math.max(5,m.version||0);
 const credits=read(join(sourceAudio,'credits.json'));
 credits.effects.modifications='Licensed stock musical cues and theme-material foley at original speed/pitch. Each corresponding award uses a different whole source cue across twenty games; the twenty cues are reassigned across tiers, not one hundred exclusive compositions. No stitched musical phrases. Mild EQ and role-balanced offline mix.';
 writeFileSync(join(dir,'music-manifest.json'),JSON.stringify(m,null,2)+'\n');
 writeFileSync(join(dir,'credits.json'),JSON.stringify(credits,null,2)+'\n');
 writeFileSync(join(dir,'feedback-design.json'),JSON.stringify(design,null,2)+'\n');
 rendered.push({id:p.id,dir,targets,design,files:walk(dir).map(f=>({name:relative(dir,f),sha256:hash(f),bytes:statSync(f).size}))});
 console.log('F'+p.id+': 16 restrained feedback cues + 5 complete stock award cues');
}
for(const id of [...actions.map(n=>'sfx-'+n),...winNames]){
 const signatures=rendered.map(g=>g.design.recipes.find(r=>r.id===id).sha256);
 assert.equal(new Set(signatures).size,20,'Duplicate corresponding cue '+id);
}
for(const id of winNames){
 const primaries=rendered.map(g=>g.design.recipes.find(r=>r.id===id).primaryMusicalSource);
 assert.equal(new Set(primaries).size,20,'Repeated primary musical cue '+id);
}
for(const g of rendered){
 for(const target of g.targets)for(const file of g.files){
  const to=join(target,file.name),next=to+'.polished-next';copyFileSync(join(g.dir,file.name),next);
  assert.equal(hash(next),file.sha256);renameSync(next,to);
 }
 for(const delivery of roots){
  const file=join(delivery,'manifest.json'),manifest=read(file),row=manifest.find(r=>r.id===g.id);
  const web=dirname(join(delivery,row.folder,`F${g.id}_H5/audio`));
  row.feedbackThemeRevision=revision;row.feedbackPalette=g.design.label;row.feedbackAudioUpdatedAt=new Date().toISOString();
  row.webBytes=walk(web).filter(f=>!f.includes('/ios-wrapper/')&&!f.includes('/reports/')).reduce((sum,f)=>sum+statSync(f).size,0);
  writeFileSync(file,JSON.stringify(manifest,null,2)+'\n');
 }
}
for(const [file,h] of native)assert.equal(hash(file),h,'Protected native file changed '+file);
for(const [file,h] of unchanged)assert.equal(hash(file),h,'Background/license file changed '+file);
const report={checkedAt:new Date().toISOString(),revision,backup,stage,snapshots,sourcePacks,
 games:rendered.map(g=>({id:g.id,label:g.design.label,zh:g.design.zh,awardFamily:g.design.awardFamily,targets:g.targets,files:g.files})),
 nativeFilesChanged:false,protectedNativeFiles:native.size,unchangedBackgroundAndLicenseFiles:unchanged.size,
 scope:'Asset-only stock-cue editing/mastering; not custom compositions or human listening approval. Gameplay, runtime behavior, background music, IAP and signing unchanged.'};
const out=join(import.meta.dirname,polishedEvidenceDirectory);mkdirSync(out,{recursive:true});
writeFileSync(join(out,'install.json'),JSON.stringify(report,null,2)+'\n');
writeFileSync(join(backup,'install.json'),JSON.stringify(report,null,2)+'\n');
console.log('20 suites / four-way audio sync complete. '+native.size+' native files unchanged.');
