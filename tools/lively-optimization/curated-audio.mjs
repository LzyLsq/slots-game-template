// Authored, publicly licensed recordings; no MIDI render or runtime tone synthesis.
import {readFileSync,writeFileSync,existsSync,mkdirSync,readdirSync,copyFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const option=name=>process.argv.find(a=>a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const cache=option('cache'),ffmpeg=option('ffmpeg');
assert(cache&&ffmpeg,'Use --cache=<download directory> --ffmpeg=<executable>');
const ids=(option('games')||'').split(',').filter(Boolean).map(Number);
const selections=[
 [13,'Carefree','Groundwork','PIZZI'],[14,'Crinoline Dreams','Teddy Bear Waltz','PIZZI'],
 [15,'Rainbows','Happy Bee','PIZZI'],[16,'Cheery Monday','Carpe Diem','PIZZI'],
 [17,'Village Consort','Industrious Ferret','PIZZI'],[18,'Jazz Brunch','Backbay Lounge','SAX'],
 [19,'In Your Arms','Easy Lemon','PIZZI'],[20,'Fretless','Fireflies and Stardust','PIZZI'],
 [21,'Thatched Villagers','Life of Riley','PIZZI'],[22,'Bright Wish','Dream Culture','PIZZI'],
 [23,'Desert City','Quasi Motion','PIZZI'],[24,'Apero Hour','Cold Funk','SAX'],
 [25,'Bossa Antigua','Poppers and Prosecco','SAX'],[26,'Samba Isobel','Beachfront Celebration','STEEL'],
 [27,'Lobby Time','Cool Vibes','SAX'],[28,'BossaBossa','Modern Jazz Samba','STEEL'],
 [29,'Cattails','Shenyang','PIZZI'],[30,'March of the Spoons','Mischief Maker','PIZZI'],
 [31,'Look Busy','The Show Must Be Go','SAX'],[33,'Heartwarming','Light Thought var 1','PIZZI'],
].filter(s=>!ids.length||ids.includes(s[0]));
const pieces=JSON.parse(readFileSync(join(cache,'pieces.json')));
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const origins=join(import.meta.dirname,'curated-audio-sources');mkdirSync(origins,{recursive:true});
const licenses={music:'CC BY 4.0',effects:'CC0 1.0'};
for(const pack of ['interface','casino','jingles'])copyFileSync(join(cache,pack,'License.txt'),join(origins,`Kenney-${pack}-License.txt`));
for(const [name,url] of [
 ['Incompetech-FAQ.html','https://incompetech.com/music/royalty-free/faq.html'],
 ['CC-BY-4.0.html','https://creativecommons.org/licenses/by/4.0/legalcode.en'],
]){execFileSync('curl',['--retry','2','--connect-timeout','10','--max-time','90','-fsS','-o',join(origins,name),url]);}
const downloaded=new Map();
await Promise.all(Array.from({length:4},async(_,worker)=>{
 const tracks=selections.flatMap(s=>s.slice(1,3));
 for(let index=worker;index<tracks.length;index+=4){
  const title=tracks[index],p=pieces.find(p=>p.title===title);assert(p,'Unknown title '+title);
  const path=join(cache,p.filename),url=`https://incompetech.com/music/royalty-free/mp3-royaltyfree/${encodeURIComponent(p.filename)}`;
  if(!existsSync(path))await new Promise((ok,no)=>{import('node:child_process').then(({spawn})=>{const c=spawn('curl',['--retry','2','--connect-timeout','15','--max-time','180','-fsS','-o',path,url],{stdio:'inherit'});c.on('error',no);c.on('close',code=>code===0?ok():no(Error('Download failed: '+title)));});});
  downloaded.set(title,{...p,path,url,sourceSha256:hash(path)});console.log('Downloaded '+title);
 }
}));
const soundSources={
 'ui-tap':['interface','click_001',-.8], 'ui-back':['interface','back_001',-1.3],
 'ui-select':['interface','select_001',-1.3], 'bet-up':['interface','switch_001',-1.3],
 'bet-down':['interface','switch_002',-1.3], 'spin-start':['casino','card-slide-1',0],
 'stop-1':['casino','chip-lay-1',0], 'stop-2':['casino','chip-lay-2',0], 'stop-3':['casino','chip-lay-3',0],
 'coin-1':['casino','chips-handle-1',-1.5], 'coin-2':['casino','chips-handle-2',-1.5], 'coin-3':['casino','chips-handle-3',-1.5],
 'burst':['casino','chips-collide-1',-1], 'reveal':['interface','confirmation_001',-1],
 'collect':['casino','chips-stack-1',-1], 'reward':['interface','confirmation_002',-1],
};
const reports=[];
for(const [id,home,cabinet,family] of selections){
 const folder=readdirSync(base).find(n=>n.startsWith(`F${id}_`)&&(id!==25||n.includes('_Cocos_')));assert(folder);
 const project=join(base,folder),out=join(project,id===26?'audio':'build-templates/web-mobile/audio');mkdirSync(out,{recursive:true});
 const tracks=[];
 for(const [kind,title] of [['music-home',home],['music-cabinet',cabinet]]){
  const s=downloaded.get(title),file=kind+'.m4a',target=join(out,file);
  // Beat-length excerpt; 1 second equal-power join avoids an abrupt file boundary.
  // These are edits of complete authored works, not freshly composed jingles.
  const bpm=parseFloat(s.bpm)||96,bars=Math.max(12,Math.floor(Math.min(92,parseDuration(s.length)-3)*bpm/240));
  const length=Math.min(bars*240/bpm,parseDuration(s.length)-2),cross=1;
  const filters=`[0:a]atrim=1:${length-cross},asetpts=PTS-STARTPTS[body];[0:a]atrim=${length-cross}:${length},asetpts=PTS-STARTPTS[tail];[0:a]atrim=0:1,asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=1:c1=qsin:c2=qsin[join];[body][join]concat=n=2:v=0:a=1,highpass=f=35,highshelf=f=4500:g=-2,loudnorm=I=-19:TP=-3:LRA=9[a]`;
  run(['-i',s.path,'-filter_complex',filters,'-map','[a]','-ar','44100','-ac','2','-c:a','aac','-b:a','128k','-movflags','+faststart',target]);
  tracks.push({id:kind,title:s.title,artist:'Kevin MacLeod',license:licenses.music,licenseUrl:'https://creativecommons.org/licenses/by/4.0/',sourceUrl:s.url,sourcePage:`https://incompetech.com/music/royalty-free/index.html?isrc=${s.isrc}`,isrc:s.isrc,published:s.uploaded,sourceSha256:s.sourceSha256,file,sha256:hash(target),duration:length-1,modifications:'Beat-length excerpt, equal-power loop join, gentle EQ, loudness normalization, AAC encoding'});
 }
 const jinglesDir={PIZZI:'Pizzicato jingles',SAX:'Sax jingles',STEEL:'Steel jingles'}[family];
 // Separate success phrases per level, not the same clip played faster/louder.
 for(const [kind,n] of [['win-small',0],['win-big',1],['win-mega',4],['win-epic',7],['win-super',11]]){
  const original=`jingles_${family}${String(n).padStart(2,'0')}.ogg`,source=join(cache,'jingles/Audio',jinglesDir,original),file=kind+'.m4a',target=join(out,file);
  run(['-i',source,'-af','highpass=f=35,highshelf=f=4200:g=-3,loudnorm=I=-18:TP=-3:LRA=7','-ar','44100','-ac','2','-c:a','aac','-b:a','128k','-movflags','+faststart',target]);
  tracks.push({id:kind,title:original,artist:'Kenney Vleugels',license:licenses.effects,sourceUrl:'https://kenney.nl/assets/music-jingles',sourceSha256:hash(source),file,sha256:hash(target),modifications:'Gentle EQ, loudness normalization, AAC encoding'});
 }
 for(const [id,[pack,name,gain]] of Object.entries(soundSources)){
  const source=join(cache,pack,'Audio',name+'.ogg'),file='sfx-'+id+'.wav',target=join(out,file);
  run(['-i',source,'-af',`highpass=f=45,highshelf=f=3800:g=-3,alimiter=limit=.7:level=false,volume=${gain}dB,afade=t=in:d=0.002`,'-ar','44100','-ac','1','-c:a','pcm_s16le',target]);
  tracks.push({id:'sfx-'+id,title:name,artist:'Kenney Vleugels',license:licenses.effects,sourceUrl:`https://kenney.nl/assets/${pack==='casino'?'casino-audio':'interface-sounds'}`,sourceSha256:hash(source),file,sha256:hash(target),modifications:'Mono PCM, gentle EQ, limited peaks, 2ms attack fade'});
 }
 const manifest={version:3,revision:'curated-authored-audio-20261010',theme:folder,licenses,creation:'Published authored music and CC0 sound packs. No runtime oscillator or GM/MIDI background render.',tracks};
 writeFileSync(join(out,'music-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 writeFileSync(join(out,'credits.json'),JSON.stringify({music:tracks.filter(t=>t.artist==='Kevin MacLeod'),effects:{artist:'Kenney Vleugels (Kenney.nl)',license:'CC0 1.0',sourceUrl:'https://kenney.nl',licenseUrl:'https://creativecommons.org/publicdomain/zero/1.0/'}},null,2)+'\n');
 copyFileSync(join(origins,'CC-BY-4.0.html'),join(out,'CC-BY-4.0.html'));
 reports.push({id,project,tracks:tracks.length,backgroundTitles:[home,cabinet],jingleFamily:family});console.log(`F${id}: installed 23 authored audio clips`);
 writeFileSync(join(origins,'selection-manifest.json'),JSON.stringify(reports,null,2)+'\n');
}
function run(args){execFileSync(ffmpeg,['-nostdin','-y','-hide_banner','-loglevel','error',...args],{stdio:'pipe',maxBuffer:4*1024*1024});}
function parseDuration(s){return String(s).split(':').reduce((a,x)=>a*60+Number(x),0);}
