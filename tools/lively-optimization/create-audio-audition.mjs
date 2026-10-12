// Mechanical expansion of a reviewed, dependency-free local audition template.
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const roots=[resolve(import.meta.dirname,'../../Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
const template=readFileSync(join(import.meta.dirname,'audio-audition.template.html'),'utf8');
for(const root of roots){
 const manifest=JSON.parse(readFileSync(join(root,'manifest.json')));
 const games=manifest.map(g=>{
  const audioPath=`${g.folder}/F${g.id}_H5/audio`,dir=join(root,audioPath);
  const m=JSON.parse(readFileSync(join(dir,'music-manifest.json'))),d=JSON.parse(readFileSync(join(dir,'feedback-design.json'))),c=JSON.parse(readFileSync(join(dir,'credits.json')));
  return {id:g.id,title:g.title,theme:d.zh,audioPath,tracks:m.tracks.map(t=>({id:t.id,file:t.file})),musicCredits:c.music};
 });
 writeFileSync(join(root,'音频试听.html'),template.replace('__GAME_AUDIO_DATA__',JSON.stringify(games).replaceAll('<','\\u003c')));
 console.log('Audition page: '+join(root,'音频试听.html'));
}
