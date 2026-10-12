import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
export const root=join(import.meta.dirname,'../..');
export const base=join(root,'完整游戏模版/全游戏模版');
export const roots=[join(root,'Xcode_H5/WebP_IAP_20261010'),'/Users/mengjunzhu/Desktop/Xcode_H5/WebP_IAP_20261010'];
export const revision='calm-single-focus-20261012';
export const games=JSON.parse(readFileSync(join(roots[0],'manifest.json'),'utf8')).filter(g=>g.id!==14).map(g=>{
 const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${g.id}_`)&&(g.id!==25||n.includes('_Cocos_'))));
 const audio=g.id===26?'src/tidal-sound.js':[25,28].includes(g.id)?'assets/scripts/SceneMusic.ts':'assets/scripts/audio/AudioManager.ts';
 const bank=g.id===26?'src/sample-bank.js':[25,28].includes(g.id)?'assets/scripts/SampleBank.ts':'assets/scripts/audio/SampleBank.ts';
 const stage='assets/scripts/vfx/SalonWinStage.ts';
 return {...g,project,audio,bank,stage:existsSync(join(project,stage))?stage:undefined,build:join(project,g.id===26?'dist':'build/web-mobile')};
});
