// Integrity and decoder checks only. They are not a subjective sound-quality approval.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const ffmpeg=process.argv.find(x=>x.startsWith('--ffmpeg='))?.slice(9);
assert(ffmpeg&&existsSync(ffmpeg),'Supply --ffmpeg=<executable>');
const ids=[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33];
const hash=b=>createHash('sha256').update(b).digest('hex'),unique=new Map(),games=[],titles=[];
for(const id of ids){
 const dir=join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)),id===26?'audio':'build-templates/web-mobile/audio');
 const manifest=JSON.parse(readFileSync(join(dir,'music-manifest.json'))),credits=JSON.parse(readFileSync(join(dir,'credits.json')));
 assert.equal(manifest.revision,'curated-authored-audio-20261010');assert.equal(manifest.situationRevision,'accepted-spin-last-reel-modal-award-20261010');assert.equal(manifest.tracks.length,24);assert.equal(credits.music.length,2);
 const spin=manifest.tracks.find(t=>t.id==='music-spin'),cabinet=manifest.tracks.find(t=>t.id==='music-cabinet');
 assert(spin&&spin.sourceSha256===cabinet.sourceSha256&&spin.sourcePassage.start>=96,'Spin must retain source attribution and use a distinct later passage');
 assert(existsSync(join(dir,'CC-BY-4.0.html')));assert(existsSync(join(dir,'credits.js')));
 const audioFiles=readdirSync(dir).filter(f=>/\.(m4a|wav|mp3|ogg)$/.test(f));assert.equal(audioFiles.length,24,'Unexpected audio remains F'+id);
 let bytes=0;
 for(const t of manifest.tracks){const file=join(dir,t.file),b=readFileSync(file),sha=hash(b);assert.equal(sha,t.sha256,'Stale manifest F'+id+' '+t.file);assert(t.sourceUrl&&t.sourceSha256&&t.license);bytes+=b.length;unique.set(sha,{...t,file});}
 titles.push(...credits.music.map(t=>t.title));games.push({id,tracks:24,bytes,backgroundTitles:credits.music.map(t=>t.title),spinPassage:spin.sourcePassage,licensesBundled:true});
}
assert.equal(new Set(titles).size,40,'BGM titles reused between games');
const decoded=[];
for(const [sha,t] of unique){
 const r=spawnSync(ffmpeg,['-nostdin','-hide_banner','-i',t.file,'-af','volumedetect','-f','null','-'],{encoding:'utf8',maxBuffer:2*1024*1024});
 assert.equal(r.status,0,'Cannot decode '+t.file);const max=Number(r.stderr.match(/max_volume: ([\-\d.]+) dB/)?.[1]),mean=Number(r.stderr.match(/mean_volume: ([\-\d.]+) dB/)?.[1]);
 assert(Number.isFinite(max)&&Number.isFinite(mean)&&mean> -55,'Silent or invalid '+t.file);assert(max< -1,'Peak too close to clipping '+t.file+' '+max);
 decoded.push({sha,id:t.id,title:t.title,maxDb:max,meanDb:mean,duration:r.stderr.match(/Duration: ([^,]+)/)?.[1]});
}
const out=join(import.meta.dirname,'verification/situation-audio-20261010');mkdirSync(out,{recursive:true});
writeFileSync(join(out,'decoded-audio.json'),JSON.stringify({checkedAt:new Date().toISOString(),scope:'24-track manifest/hash/source-license integrity: 40 distinct authored works plus 20 later spin passages, all unique files decode, sample peaks below -1dBFS. Not human listening or real-device testing.',games,uniqueFiles:decoded.length,decoded},null,2)+'\n');
console.log(`PASS: ${games.length} games / 40 distinct authored works + 20 spin passages / ${decoded.length} unique decodable clips; source attribution bundled.`);
