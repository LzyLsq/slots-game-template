// Situation-based playback, not a probability/payment change. Mechanical edits
// are guarded and backed up; spin passages retain the source music attribution.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,readdirSync,existsSync,mkdtempSync,mkdirSync,copyFileSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const root=join(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const cache=process.argv.find(a=>a.startsWith('--cache='))?.slice(8);
const ffmpeg=process.argv.find(a=>a.startsWith('--ffmpeg='))?.slice(9);
assert(cache&&existsSync(ffmpeg),'Supply --cache and --ffmpeg');
const requested=process.argv.slice(2).filter(a=>/^\d+$/.test(a)).map(Number);
const selections=JSON.parse(readFileSync(join(import.meta.dirname,'curated-audio-sources/selection-manifest.json')));
const pieces=JSON.parse(readFileSync(join(cache,'pieces.json')));
const backup=mkdtempSync(join(tmpdir(),'situation-audio-before.'));
console.log('Source backup: '+backup);
const ts=createRequire(import.meta.url)('/Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript');
const hash=f=>createHash('sha256').update(readFileSync(f)).digest('hex');
function edit(file,update){const s=readFileSync(file,'utf8'),next=update(s);if(s===next)return;
 const dest=join(backup,file.slice(root.length+1));mkdirSync(dirname(dest),{recursive:true});copyFileSync(file,dest);writeFileSync(file,next);}
function once(s,from,to){assert(s.includes(from),'Missing migration anchor: '+from.slice(0,100));return s.replace(from,to);}
function wrapMethod(s,name,before='',after=''){
 const ast=ts.createSourceFile('app.ts',s,ts.ScriptTarget.Latest,true);let method;
 const visit=n=>{if(ts.isMethodDeclaration(n)&&n.name.getText(ast)===name)method=n;ts.forEachChild(n,visit);};visit(ast);
 assert(method?.body,'No method '+name);const a=method.body.getStart(ast)+1,b=method.body.end-1;
 return s.slice(0,a)+before+s.slice(a,b)+after+s.slice(b);
}
const spinMethods=`
  /** BGM changes only after an accepted spin; invalid taps never start a loop. */
  public beginSpin(): void {
    if (this.scene !== 'cabinet' || this.hidden || this.disposed) return;
    if (this.spinning) return;
    this.finishWinPresentation();
    this.spinning = true; this.retireMusic(); this.startMusic();
    // Safety cleanup for interrupted external requests, not an award timer.
    this.spinTimer = setTimeout(() => this.finishSpin(), 20000);
  }
  public finishSpin(): void {
    if (this.spinTimer !== undefined) clearTimeout(this.spinTimer);
    this.spinTimer = undefined;
    if (!this.spinning) return;
    this.spinning = false; this.retireMusic(); this.startMusic();
  }
  public setModalOpen(open: boolean): void {
    if (this.modalOpen === open) return;
    this.modalOpen = open; this.restoreMusic();
  }
  public situationStatus(): { scene: string; spinning: boolean; celebrating: boolean; modal: boolean; track?: string } {
    return { scene: this.scene, spinning: this.spinning, celebrating: this.celebrating, modal: this.modalOpen, track: this.music?.scene };
  }
  private get activeMusicScene(): SoundScene { return this.spinning ? 'spin' : this.scene; }
  private get situationLevel(): number { return this.celebrating ? .07 : this.modalOpen ? .18 : this.spinning ? .30 : this.musicLevel; }
`;
const records=[];
for(const selected of selections.filter(g=>!requested.length||requested.includes(g.id))){
 const id=selected.id,project=selected.project,audioDir=join(project,id===26?'audio':'build-templates/web-mobile/audio');
 const manifestFile=join(audioDir,'music-manifest.json'),manifest=JSON.parse(readFileSync(manifestFile));
 const parent=manifest.tracks.find(t=>t.id==='music-cabinet'),piece=pieces.find(p=>p.title===parent.title);
 assert(parent&&piece);
 if(!manifest.tracks.some(t=>t.id==='music-spin')){
  // Use an actual later passage of this game's authored cabinet composition.
  // No pitch/tempo changes, synthetic percussion or repeated winner jingle.
  const bar=240/Number(piece.bpm),start=Math.ceil(96/bar)*bar,duration=8*bar,cross=.5;
  const seconds=String(piece.length).split(':').reduce((a,n)=>a*60+Number(n),0);
  assert(start+duration<seconds-1,'Spin passage overlaps track ending '+id);
  const source=join(cache,piece.filename),file=join(audioDir,'music-spin.m4a');
  assert.equal(hash(source),parent.sourceSha256,'Original music cache changed');
  const filters=`[0:a]atrim=start=${start}:end=${start+duration-cross},asetpts=PTS-STARTPTS[body];[0:a]atrim=start=${start+duration-cross}:end=${start+duration},asetpts=PTS-STARTPTS[tail];[0:a]atrim=start=${start}:end=${start+cross},asetpts=PTS-STARTPTS[head];[tail][head]acrossfade=d=${cross}:c1=qsin:c2=qsin[join];[body][join]concat=n=2:v=0:a=1,highpass=f=35,highshelf=f=4500:g=-2,loudnorm=I=-21:TP=-3:LRA=9[a]`;
  execFileSync(ffmpeg,['-nostdin','-y','-hide_banner','-loglevel','error','-i',source,'-filter_complex',filters,'-map','[a]','-ar','44100','-ac','2','-c:a','aac','-b:a','128k','-movflags','+faststart',file]);
  manifest.tracks.push({...parent,id:'music-spin',file:'music-spin.m4a',sha256:hash(file),duration:duration-cross,sourcePassage:{start,end:start+duration},modifications:'Later eight-bar spin passage; equal-power join, gentle EQ, normalization, AAC. Original tempo and pitch retained.'});
  manifest.situationRevision='accepted-spin-last-reel-modal-award-20261010';
  edit(manifestFile,()=>JSON.stringify(manifest,null,2)+'\n');
  edit(join(audioDir,'credits.json'),s=>{const c=JSON.parse(s);c.music.find(t=>t.id==='music-cabinet').additionalUse='music-spin.m4a: separate later eight-bar passage of the same work';return JSON.stringify(c,null,2)+'\n';});
 }
 if(id===26){
  const appFile=join(project,'src/app.js');
  edit(appFile,s=>{
   if(s.includes('/* situation audio */'))return s;
   s='/* situation audio */\n'+s;
   s=once(s,"onStop:()=>feedback('stop')", "onStop:c=>{feedback('stop');if(c===mode.cols-1)soundtrack.finishSpin();}");
   s=once(s,'function openModal(title,body){','function openModal(title,body){soundtrack.setModalOpen(true);');
   s=once(s,'function closeModal(){soundtrack.finishAward();','function closeModal(){soundtrack.setModalOpen(false);soundtrack.finishAward();');
   s=once(s,'reels.settle(first.grid,first.coinValues);','reels.settle(first.grid,first.coinValues);soundtrack.finishSpin();');
   s=s.replaceAll('reels.settle(stage.grid,stage.coinValues);','reels.settle(stage.grid,stage.coinValues);soundtrack.finishSpin();');
   s=once(s,"if(stage.kind==='holdspin-respin'){const prev=outcome.stages[i-1];reels.begin", "if(stage.kind==='holdspin-respin'){const prev=outcome.stages[i-1];feedback('spin');reels.begin");
   s=once(s,'finally{if(token===epoch){busy=false;', 'finally{if(token===epoch){soundtrack.finishSpin();busy=false;');
   s=once(s,"setTimeout(()=>{if(token===epoch)app.classList.remove('has-award');},2400);", "setTimeout(()=>{if(token===epoch){soundtrack.finishAward();app.classList.remove('has-award');}},2400);");
   return s;
  });
  records.push({id,spinFile:join(audioDir,'music-spin.m4a'),runtime:'independent TidalSound',app:appFile});continue;
 }
 const file=join(project,[25,28].includes(id)?'assets/scripts/SceneMusic.ts':'assets/scripts/audio/AudioManager.ts');
 edit(file,s=>{
  if(s.includes('public situationStatus()'))return s;
  s=once(s,"type SoundScene = 'home' | 'cabinet';","type SoundScene = 'home' | 'cabinet' | 'spin';");
  s=once(s,"private scene: SoundScene = 'home';","private scene: 'home' | 'cabinet' = 'home';\n  private spinning = false;\n  private celebrating = false;\n  private modalOpen = false;\n  private spinTimer?: ReturnType<typeof setTimeout>;");
  s=once(s,'{ home: 0, cabinet: 0 }','{ home: 0, cabinet: 0, spin: 0 }');
  s=once(s,'this.stopEffects(); this.stopMusic(); this.samples?.close();','this.finishSpin(); this.stopEffects(); this.stopMusic(); this.samples?.close();');
  s=once(s,'public setScene(scene: SoundScene): void',"public setScene(scene: 'home' | 'cabinet'): void");
  s=once(s,'this.scene = scene; this.stopEffects();','this.scene = scene; this.modalOpen = false;\n    if (this.spinTimer !== undefined) clearTimeout(this.spinTimer);\n    this.spinTimer = undefined; this.spinning = false; this.stopEffects();');
  s=once(s,'  public play(cue: Cue): void {',spinMethods+'\n  public play(cue: Cue): void {\n    if (cue === \'spin\') this.beginSpin();');
  s=once(s,"    if (cue === 'spin') this.finishWinPresentation();\n",'');
  s=once(s,'public playReelStop(column = 0): void {','public playReelStop(column = 0, final = false): void {\n    if (final) this.finishSpin();');
  s=once(s,'private playWinMusic(id: string, duration: number, volume: number): void {','private playWinMusic(id: string, duration: number, volume: number): void {\n    this.finishSpin();');
  s=once(s,'    this.duckMusic(duration + .4);','    this.celebrating = true; this.duckMusic(duration + .4);');
  s=once(s,"    } else this.samples?.play('collect', .52, 'collect', 1, .16);","    } else { this.finishWinPresentation(); this.samples?.play('collect', .52, 'collect', 1, .16); }");
  s=once(s,'public finishWinPresentation(): void {','public finishWinPresentation(): void {\n    this.celebrating = false;');
  s=s.replaceAll('this.musicLevel,','this.situationLevel,');
  s=once(s,'element.src = `audio/music-${this.scene}.m4a`;','element.src = `audio/music-${this.activeMusicScene}.m4a`;');
  s=once(s,'{ scene: this.scene, element, source, gain,','{ scene: this.activeMusicScene, element, source, gain,');
  return s;
 });
 // Normalize the first migrated pilot too; do not briefly start two scene loops.
 edit(file,s=>s.replace('this.scene = scene; this.modalOpen = false; this.finishSpin(); this.stopEffects();',
  'this.scene = scene; this.modalOpen = false;\n    if (this.spinTimer !== undefined) clearTimeout(this.spinTimer);\n    this.spinTimer = undefined; this.spinning = false; this.stopEffects();')
  .replace('this.finishWinPresentation();\n    if (this.spinning) return;', 'if (this.spinning) return;\n    this.finishWinPresentation();'));
 const appFile=join(project,id===25?'assets/scripts/VelvetApp.ts':id===27?'assets/scripts/SovereignApp.ts':id===28?'assets/scripts/RegattaApp.ts':'assets/scripts/ui/AureliaApp.ts');
 edit(appFile,s=>{
  if(s.includes('/* situation audio */'))return s;
  s='/* situation audio */\n'+s;
  if(id===25){
   s=wrapMethod(s,'rotate','\n this.webMusic?.beginSpin();\n try {','\n } finally { this.webMusic?.finishSpin(); }\n');
   // openModal calls closeModal first, so apply the new open state afterwards.
   s=once(s,"this.closeModal();const root=group(this.stage,'Modal'","this.closeModal();this.webMusic?.setModalOpen(true);const root=group(this.stage,'Modal'");
   s=wrapMethod(s,'closeModal','this.webMusic?.setModalOpen(false);');
  }else if(id===27){
   s=once(s,'this.audio.playReelStop(column);','this.audio.playReelStop(column,this.reelRuntime.every(r=>r.stopped));');
   s=once(s,'await this.waitForReels();await this.presentStages(round);','await this.waitForReels();this.audio.finishSpin();await this.presentStages(round);');
   s=once(s,'this.closeModal();const root=box(this.node,`Modal ${title}`','this.closeModal();this.audio.setModalOpen(true);const root=box(this.node,`Modal ${title}`');
   s=wrapMethod(s,'closeModal','this.audio.setModalOpen(false);');
  }else if(id===28){
   s=once(s,"this.reels.start(state.round.stages[0]!.grid, state.turbo); this.sound('launch');","this.reels.start(state.round.stages[0]!.grid, state.turbo); this.webMusic?.beginSpin(); this.sound('launch');");
   s=wrapMethod(s,'stopped','this.webMusic?.finishSpin();');
   s=wrapMethod(s,'sessionError','this.webMusic?.finishSpin();');
   s=once(s,"this.modal?.destroy(); const modal = node(this.node, 'Modal');","this.modal?.destroy(); this.webMusic?.setModalOpen(true); const modal = node(this.node, 'Modal');");
   s=once(s,'const close = () => { modal.destroy();','const close = () => { this.webMusic?.setModalOpen(false); modal.destroy();');
   s=once(s,'this.modal?.destroy(); this.modal = null; this.ambience = [];','this.webMusic?.setModalOpen(false); this.modal?.destroy(); this.modal = null; this.ambience = [];');
  }else{
   s=once(s,'this.audio.playReelStop(column);','this.audio.playReelStop(column,column===cfg.columns-1);');
   // All awaited reel operations release spin music, including partial respins.
   const ast=ts.createSourceFile(appFile,s,ts.ScriptTarget.Latest,true),insert=[];
   const visit=n=>{if(ts.isExpressionStatement(n)&&ts.isAwaitExpression(n.expression)&&ts.isCallExpression(n.expression.expression)){
    const text=n.expression.expression.expression.getText(ast);
    if(/^(this\.reels|reels)\.(finish|finishGrid|respinCells)$/.test(text)){
     // An unbraced if/else/loop body needs a block for the second statement.
     // Appending after it would detach a following else from its if.
     if(ts.isBlock(n.parent))insert.push({start:n.end,end:n.end,text:'this.audio.finishSpin();'});
     else insert.push({start:n.getStart(ast),end:n.end,text:'{'+n.getText(ast)+'this.audio.finishSpin();}'});
    }
   }ts.forEachChild(n,visit);};visit(ast);
   assert(insert.length,'No awaited reel finish F'+id);
   for(const change of insert.sort((a,b)=>b.start-a.start))s=s.slice(0,change.start)+change.text+s.slice(change.end);
   // Failure path must not leave a spin song behind.
   s=wrapMethod(s,'spin','', '\n    this.audio.finishSpin();\n');
   s=once(s,'this.modal=overlay;return panel;','this.audio.setModalOpen(true);this.modal=overlay;return panel;');
   s=wrapMethod(s,'closeModal','this.audio.setModalOpen(false);');
   s=once(s,'this.generation++;this.modal=undefined;','this.audio.setModalOpen(false);this.generation++;this.modal=undefined;');
  }
  const syntax=ts.createSourceFile(appFile,s,ts.ScriptTarget.Latest,true).parseDiagnostics;
  assert.equal(syntax.length,0,'Situation migration syntax error F'+id+': '+syntax.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')).join('; '));
  return s;
 });
 records.push({id,manager:file,app:appFile,spinFile:join(audioDir,'music-spin.m4a')});
 console.log('F'+id+': distinct later spin passage, real reel boundary, modal/award mix');
}
writeFileSync(join(backup,'migration.json'),JSON.stringify({at:new Date().toISOString(),records},null,2));
console.log('Situation audio installation complete. No game math, IAP IDs or signing changed.');
