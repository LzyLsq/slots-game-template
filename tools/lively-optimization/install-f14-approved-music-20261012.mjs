// Installs only the human-approved F14 listening selection. Not a commissioned
// score or stem-based adaptive system. Runtime and source edits are separate.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync,copyFileSync,renameSync,statSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
const exec = promisify(execFile), root = join(import.meta.dirname,'../..');
const arg = key => process.argv.find(a=>a.startsWith('--'+key+'='))?.slice(key.length+3);
const ffmpeg=arg('ffmpeg'),backup=arg('backup');
const candidate='/Users/mengjunzhu/Desktop/F14_音乐试听候选_20261012';
const project=join(root,'完整游戏模版/全游戏模版/F14_Cloud_Crown_v1.0.0_good');
const audio=join(project,'build-templates/web-mobile/audio');
const approved=JSON.parse(readFileSync(join(candidate,'音乐清单与授权.json')));
const revision='f14-approved-compositions-event-aligned-20261012';
assert(existsSync(ffmpeg)&&existsSync(join(backup,'backup.json')),'Supply FFmpeg and the saved pre-change backup');
const old=JSON.parse(readFileSync(join(audio,'music-manifest.json')));
assert.notEqual(old.revision,revision,'Already installed; do not overwrite again');
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
const ff=args=>exec(ffmpeg,['-nostdin','-hide_banner',...args],{maxBuffer:8*1024*1024});
const backgrounds=[
 ['music-home','music-simplicity','大厅 · 温暖迎宾'],
 ['music-home-alt','music-wonderful','大厅 · 活泼轮播'],
 ['music-cabinet-golden-hour','music-felicity','SKY ADMIRAL'],
 ['music-cabinet-jade-treasury','music-quirky-lane','PEARL VOYAGE'],
 ['music-cabinet-pearl-palace','music-high-games','SUNSTONE EXPRESS'],
 ['music-cabinet-ruby-revel','music-ice-cream','MOON CAROUSEL'],
];
const tracks=[];
for(const [id,from,label] of backgrounds){
 const t=approved.tracks.find(t=>t.id===from),source=join(candidate,t.file);
 assert.equal(hash(source),t.sha256,'Approved candidate changed');
 const file=id+'.m4a';copyFileSync(source,join(audio,file));
 tracks.push({...t,id,label,file,role:label,bytes:statSync(join(audio,file)).size,sha256:hash(join(audio,file)),
  modifications:t.modifications+' Playback: natural ending/restart, lobby alternates two works; not a seamless loop.'});
}
// The animation already counts/holds for these durations. No settlement, tier,
// animation duration or payout is changed to accommodate an audio recording.
for(const [id,seconds] of [['win-small',1.8],['win-big',5.5],['win-mega',6.4],['win-epic',6.9],['win-super',7.3]]){
 const t=approved.tracks.find(t=>t.id===id),composition=approved.compositions.find(c=>c.title===t.title);
 const source=join(approved.cache,composition.slug+'.mp3');
 assert.equal(hash(source),composition.sourceSha256,'Authored source changed');
 const start=t.sourceRange.start+t.sourceRange.seconds-seconds;
 const {stderr}=await ff(['-ss',String(start),'-t',String(seconds),'-i',source,'-af','loudnorm=I=-18:TP=-4:LRA=11:print_format=json','-f','null','-']);
 const measured=JSON.parse(stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
 const gainDb=Math.min(-18-Number(measured.input_i),-4-Number(measured.input_tp));
 const file=id+'.m4a';
 await ff(['-y','-ss',String(start),'-t',String(seconds),'-i',source,'-vn','-af',
  `volume=${gainDb.toFixed(4)}dB,afade=t=in:d=0.07,afade=t=out:st=${(seconds-.045).toFixed(4)}:d=0.045`,
  '-ar','48000','-ac','2','-c:a','aac','-b:a','160k','-movflags','+faststart','-metadata','artist=Scott Buckley',
  '-metadata',`title=${t.title} / F14 ${id}`,join(audio,file)]);
 tracks.push({...t,id,file,duration:seconds,role:t.label,sourceRange:{start,seconds},bytes:statSync(join(audio,file)).size,
  sha256:hash(join(audio,file)),gainDb,measuredSourceLufs:Number(measured.input_i),
  modifications:'Single-source closing excerpt aligned to existing animation duration; static gain, 70ms entry/45ms exit fade, AAC 160kb/s. Original speed/pitch. Not an independently composed victory cue.'});
 console.log(`${id}: ${seconds}s · ${t.title}`);
}
// Obsolete loops are recoverably moved, not kept as unused app-bundle content.
mkdirSync(join(backup,'unused-original-loops'),{recursive:true});
for(const name of ['music-cabinet.m4a','music-spin.m4a']){
 assert(existsSync(join(backup,'source/build-templates/web-mobile/audio',name)),'Original not backed up');
 if(existsSync(join(audio,name)))renameSync(join(audio,name),join(backup,'unused-original-loops',name));
}
const manifest={...old,revision,installedAt:new Date().toISOString(),tracks,
 selectionApprovedInChat:true,sourceCandidate:candidate,backup,
 playback:{lobbyPlaylist:backgrounds.slice(0,2).map(x=>x[0]),cabinetTracks:Object.fromEntries(backgrounds.slice(2).map(x=>[x[0].replace('music-cabinet-',''),x[0]])),
  longMusic:'HTMLAudioElement streaming, at most two players during a scene transition; no full-background PCM decoding',
  awards:'Two-item PCM LRU, bounded voices, automatic reveal keeps phrase, manual skip/collect fades, no award replay after backgrounding',
  spin:'Keep cabinet composition continuous; adjust mix on actual spin/reel boundaries',
  loops:'Full works with natural endings and playlist restart; NOT validated seamless loops or actual stems'},
 limitations:['No professionally commissioned score or independent victory compositions.','No human in-game listening or iPhone listening QA yet.','Background full works have natural endings, not sample-accurate seamless looping.']};
writeFileSync(join(audio,'music-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const credits=JSON.parse(readFileSync(join(audio,'credits.json')));
credits.music=tracks;credits.effects.modifications='Existing Kenney authored short UI/reel/coin feedback retained at original speed/pitch. Win music now separately credited to Scott Buckley above.';
credits.selectionNotes=manifest.playback;
writeFileSync(join(audio,'credits.json'),JSON.stringify(credits,null,2)+'\n');
const report={installedAt:manifest.installedAt,revision,backup,tracks:tracks.map(t=>({id:t.id,file:t.file,title:t.title,duration:t.duration,bytes:t.bytes,sha256:t.sha256})),
 musicBytes:tracks.reduce((a,t)=>a+t.bytes,0),originalLoopsRecoverablyMoved:true,nativeFilesChanged:false};
writeFileSync(join(backup,'audio-installation.json'),JSON.stringify(report,null,2)+'\n');
console.log(`Installed ${tracks.length} recordings, ${(report.musicBytes/1024/1024).toFixed(2)} MiB; original game retained in ${backup}`);
