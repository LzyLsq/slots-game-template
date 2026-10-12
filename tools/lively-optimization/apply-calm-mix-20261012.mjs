// Mechanical migration of the approved F14 mixer; never copy its compositions.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,cpSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {walk} from '../webp-iap/webp.mjs';
import {base,roots,games,revision} from './calm-mix-projects.mjs';
const require=createRequire(import.meta.url),ts=require('/Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript');
const reference=readFileSync(join(base,'F14_Cloud_Crown_v1.0.0_good/assets/scripts/audio/AudioManager.ts'),'utf8');
const bank=readFileSync(join(base,'F14_Cloud_Crown_v1.0.0_good/assets/scripts/audio/SampleBank.ts'),'utf8');
function members(text){const ast=ts.createSourceFile('audio.ts',text,ts.ScriptTarget.Latest,true);return [...ast.statements].find(ts.isClassDeclaration).members;}
const referenceMembers=new Map(members(reference).map(m=>[m.name?.getText(),m.getText()]));
const hash=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const backup=mkdtempSync('/Users/mengjunzhu/Desktop/其余19款_清爽混音前备份_20261012.');
const sources=[],native=[],audio=[];
for(const g of games){
 const files=[g.audio,g.bank,g.stage,g.id===25?'assets/scripts/VelvetApp.ts':undefined].filter(Boolean);
 for(const rel of files){const file=join(g.project,rel),dest=join(backup,'sources',`F${g.id}`,rel);mkdirSync(join(dest,'..'),{recursive:true});cpSync(file,dest);sources.push({id:g.id,file,backup:dest,hash:hash(file)});}
 const aud=join(g.project,g.id===26?'audio':'build-templates/web-mobile/audio');
 for(const f of walk(aud))audio.push([f,hash(f)]);
 for(const dest of roots){
  for(const folder of [join(dest,g.folder,'DBGame'),join(dest,g.folder,`F${g.id}_H5/ios-wrapper`)]){
   assert(existsSync(folder),'Missing native '+folder);
   for(const f of walk(folder))if(!f.includes('/xcuserdata/')||f.endsWith('.xcscheme'))native.push([f,hash(f)]);
  }
 }
}
for(const [i,dest] of roots.entries())cpSync(join(dest,'manifest.json'),join(backup,`manifest-${i}.json`));
writeFileSync(join(backup,'before.json'),JSON.stringify({revision,sources,native,audio},null,2));
writeFileSync(join(import.meta.dirname,'verification/calm-backup-path.json'),JSON.stringify({backup}));
console.log('Backup: '+backup);
for(const g of games.filter(g=>g.id!==26)){
 const file=join(g.project,g.audio);let text=readFileSync(file,'utf8');assert(!text.includes(revision),'Already migrated F'+g.id);
 const replace=['beginSpin','finishSpin','play','playReelStop','playAward','playWinMusic','playWinDetail','finishWinPresentation','track','retireMusic','duckMusic','restoreMusic','stopCelebration','playMusicTrack'];
 const edits=members(text).filter(m=>replace.includes(m.name?.getText())).map(m=>({start:m.getStart(),end:m.end,text:referenceMembers.get(m.name.getText())}));
 assert.equal(edits.length,replace.length,'Missing mixer method F'+g.id);
 for(const e of edits.sort((a,b)=>b.start-a.start))text=text.slice(0,e.start)+e.text+text.slice(e.end);
 text=text.replace("'burst' | 'reveal' | 'collect'","'burst' | 'reveal' | 'skip' | 'collect'");
 text=text.replace('private duckUntil = 0;','private duckUntil = 0;\n  private musicHandoffAt = 0;\n  private celebrationReadyAt = 0;');
 text=text.replace('private celebrationVoices: VoicePool = new Map();','private celebrationVoices: VoicePool = new Map();\n  private celebrationGains = new Map<AudioScheduledSourceNode, GainNode>();\n  private celebrationFades = new Map<AudioScheduledSourceNode, ReturnType<typeof setTimeout>>();');
 text=text.replace('private lastCount = -Infinity;','private lastCount = -Infinity;\n  private lastCountStep = -1;');
 text=text.replace("this.spinning ? 'spin' : this.scene",'this.scene').replace('this.celebrating ? .07','this.celebrating ? 0');
 text=text.replace('scene: string; spinning: boolean; celebrating: boolean; modal: boolean; track?: string','mix: string; scene: string; spinning: boolean; celebrating: boolean; modal: boolean; track?: string');
 text=text.replace('return { scene: this.scene, spinning:',`return { mix: '${revision}', scene: this.scene, spinning:`);
 text=text.replace('element.preload = \'none\';','gain.gain.value = 0;\n    element.preload = \'none\';');
 text=text.replace('gain.gain.setValueAtTime(0, context.currentTime);\n    const ducked', 'const enterAt = Math.max(context.currentTime, this.musicHandoffAt, this.celebrationReadyAt);\n    gain.gain.setValueAtTime(0, context.currentTime); gain.gain.setValueAtTime(0, enterAt);\n    const ducked');
 text=text.replace('ducked ? .07 : this.situationLevel, context.currentTime + .4','ducked ? 0 : this.situationLevel, enterAt + .4');
 text=text.replace('gain.gain.setValueAtTime(.07, this.duckUntil);','gain.gain.setValueAtTime(0, Math.max(enterAt + .4, this.duckUntil));');
 text=text.replace("'win-small', 1.55, .55","'win-small', 1.55, .45").replace('5.591][i], .64','5.591][i], .50');
 text=text.replace('with a brief crossfade','with sequential fade-out/fade-in');
 writeFileSync(file,text);
 writeFileSync(join(g.project,g.bank),bank);
 if(g.stage){
  const p=join(g.project,g.stage);let s=readFileSync(p,'utf8');
  assert(s.includes('private reveal():void')&&s.includes('this.reveal();return;'),'Unknown stage F'+g.id);
  s=s.replace('private reveal():void','private reveal(manual=false):void').replace("this.onSound?.('reveal',1)","this.onSound?.(manual?'skip':'reveal',1)").replace('this.reveal();return;','this.reveal(true);return;');writeFileSync(p,s);
 }
 if(g.id===25){const p=join(g.project,'assets/scripts/VelvetApp.ts'),s=readFileSync(p,'utf8');assert(s.includes("if(!count.node['countSkip'])this.webMusic?.playWinDetail('reveal')"));writeFileSync(p,s.replace("if(!count.node['countSkip'])this.webMusic?.playWinDetail('reveal')","if(!count.node['countSkip'])this.webMusic?.playWinDetail('skip')"));}
 console.log('Migrated F'+g.id+' (original music paths and lifecycle retained)');
}
// F26 consumes the same bounded sample mixer as native ES modules, not TS.
const g=games.find(g=>g.id===26);
writeFileSync(join(g.project,g.bank),ts.transpileModule(bank,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText);
for(const [file,expected] of audio)assert.equal(hash(file),expected,'Composition changed '+file);
for(const [file,expected] of native)assert.equal(hash(file),expected,'Native changed '+file);
console.log('Source backup and original audio/native hashes verified. F26 music controller needs its separate patch.');
