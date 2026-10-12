// Preserve wallet, native IAP, artwork, and existing explicit sound preferences.
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base=join(import.meta.dirname,'../../完整游戏模版/全游戏模版');
let patch='*** Begin Patch\n',changes=0;
function edit(file,fn){const old=readFileSync(file,'utf8'),next=fn(old);if(next===old)return;patch+=`*** Update File: ${file}\n@@\n`+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+next.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';changes++;}
function replace(s,a,b){assert(s.includes(a),'Missing music integration anchor: '+a);return s.replace(a,b);}
const project=id=>join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)&&(id!==25||n.includes('_Cocos_'))));
for(const id of [13,14,15,16,17,18,19,21,22,23,24,29,30,31,33]){
 edit(join(project(id),'assets/scripts/ui/AureliaApp.ts'),s=>{
  if(s.includes('this.audio.setMusic(next)'))return s;
  s=replace(s,'this.audio.setEffects(this.services.profile.current()?.settings.sound??true);','const sound=this.services.profile.current()?.settings.sound??true;\n      this.audio.setEffects(sound);this.audio.setMusic(sound);');
  s=replace(s,'private render():void{','private render():void{\n    const sound=this.services.profile.current()?.settings.sound??true;\n    this.audio.setEffects(sound);this.audio.setMusic(sound);');
  s=replace(s,'this.audio.setEffects(next);this.updateSound(next);','this.audio.setEffects(next);this.audio.setMusic(next);this.updateSound(next);');
  return replace(s,'this.audio.setEffects(previous);this.updateSound(previous);','this.audio.setEffects(previous);this.audio.setMusic(previous);this.updateSound(previous);');
 });
}
edit(join(project(25),'assets/scripts/model/store.ts'),s=>s.includes('sound:false,motion:true')?replace(s,'sound:false,motion:true','sound:true,motion:true'):s);
const manager=readFileSync(join(project(20),'assets/scripts/audio/AudioManager.ts'),'utf8');
for(const id of [25,28]){
 const file=join(project(id),'assets/scripts/SceneMusic.ts');
 const content=manager.replace("@ccclass('AudioManager')","@ccclass('SceneMusic')").replace('export class AudioManager','export class SceneMusic');
 patch+=`*** Add File: ${file}\n`+content.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';changes++;
}
edit(join(project(25),'assets/scripts/VelvetApp.ts'),s=>{
 if(s.includes('webMusic?:SceneMusic'))return s;
 s=replace(s,"import {_decorator,Component", "import {SceneMusic} from './SceneMusic';\nimport {_decorator,Component");
 s=replace(s,'clips=new Map();music:AudioSource;','clips=new Map();music:AudioSource;webMusic?:SceneMusic;');
 s=replace(s,'async loadAudio(){this.music=',"async loadAudio(){if(typeof window!=='undefined'&&typeof window.Audio==='function'){this.webMusic=this.node.addComponent(SceneMusic);this.webMusic.setEffects(false);this.webMusic.setMusic(false)}this.music=");
 s=replace(s,'syncMusic(){if(!this.music)return;',"syncMusic(){if(this.webMusic){this.music?.stop();this.webMusic.setScene(this.page==='game'?'cabinet':'home');this.webMusic.setMusic(!!this.state.sound&&!this.hidden);return}if(!this.music)return;");
 return replace(s,'stopAudio(){this.audio.forEach', 'stopAudio(){this.webMusic?.setMusic(false);this.audio.forEach');
});
edit(join(project(28),'assets/scripts/RegattaApp.ts'),s=>{
 if(s.includes('private webMusic?: SceneMusic'))return s;
 s=replace(s,"import { ThemeMotion }", "import { SceneMusic } from './SceneMusic';\nimport { ThemeMotion }");
 s=replace(s,'private music!: AudioSource;','private music!: AudioSource;\n  private webMusic?: SceneMusic;');
 s=replace(s,'this.music.loop = true; this.music.volume = .15;',"this.music.loop = true; this.music.volume = .15;\n    if (typeof window !== 'undefined' && typeof window.Audio === 'function') {\n      this.webMusic = this.node.addComponent(SceneMusic);this.webMusic.setEffects(false);this.webMusic.setMusic(false);\n    }");
 s=replace(s,'    this.refreshBalance();\n  }\n  private header(', '    this.refreshBalance();this.syncMusic();\n  }\n  private header(');
 return replace(s,'private syncMusic(): void {',"private syncMusic(): void {\n    if (this.webMusic) {\n      this.music?.pause();this.webMusic.setScene(this.page === 'game' ? 'cabinet' : 'home');\n      this.webMusic.setMusic(!this.hidden && !!this.wallet?.snapshot().settings.music);return;\n    }");
});
patch+='*** End Patch\n';if(changes)execFileSync('apply_patch',[],{input:patch,maxBuffer:12*1024*1024});console.log('Music wiring patched: '+changes+' files. Existing explicitly muted saves remain muted.');
