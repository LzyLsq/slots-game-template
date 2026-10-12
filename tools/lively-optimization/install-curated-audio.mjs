// Mechanical, assertion-guarded migration. Preserve lifecycle/music/IAP/game logic.
import {readFileSync,writeFileSync,existsSync,readdirSync,copyFileSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=resolve(import.meta.dirname,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const ids=[13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,33];
const requested=process.argv.slice(2).filter(x=>/^\d+$/.test(x)).map(Number);
const publicCues=`  public play(cue: Cue): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    if (cue === 'reel-stop') { this.playReelStop(); return; }
    if (cue === 'spin') this.finishWinPresentation();
    this.audioContext();
    const names: Record<Cue, string> = {tap:'ui-tap',back:'ui-back',select:'ui-select','bet-up':'bet-up','bet-down':'bet-down',spin:'spin-start','reel-stop':'stop-1',win:'reward',reward:'reward'};
    this.samples?.play(names[cue], cue === 'tap' ? .42 : .55, cue === 'spin' ? 'reel' : 'ui');
  }
  public playReelStop(column = 0): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    this.audioContext(); const index = Math.max(0, Math.floor(column)) % 3;
    this.samples?.play('stop-' + (index + 1), .50, 'reel', 1, .035);
  }
  public playAward(step = 0): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    this.audioContext(); this.samples?.play('reward', .46, 'detail', 1, .22);
  }

`;
const details=`  public playWinDetail(cue: WinSoundCue, progress = 0, tier = 1): void {
    if (!this.effectsEnabled || this.hidden || this.disposed) return;
    const context = this.audioContext(); if (!context) return;
    const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
    if (cue === 'count') {
      if (p <= 0 || p >= 1 || context.currentTime - this.lastCount < .17) return;
      this.lastCount = context.currentTime;
      this.samples?.play('coin-' + (1 + Math.min(2, Math.floor(p * 3))), tier ? .24 : .17, 'detail', 1, .17);
    } else if (cue === 'burst') {
      this.samples?.play('burst', .28, 'detail', 1, .35);
    } else if (cue === 'reveal') {
      this.stopCelebration(); this.samples?.stop('detail');
      this.duckMusic(.8); this.samples?.play('reveal', .48, 'detail');
    } else this.samples?.play('collect', .52, 'collect', 1, .16);
  }
  public soundStatus(): ReturnType<SampleBank['status']> | undefined { return this.samples?.status(); }
`;
function replace(s,from,to,label){assert(s.includes(from),'Missing anchor '+label);return s.replace(from,to);}
function span(s,start,end,body){const a=s.indexOf(start),b=s.indexOf(end,a);assert(a>=0&&b>a,'Missing span '+start);return s.slice(0,a)+body+s.slice(b);}
const creditsAction="()=>window.dispatchEvent(new Event('game-music-credits'))";
for(const id of ids.filter(id=>!requested.length||requested.includes(id))){
 const folder=readdirSync(base).find(n=>n.startsWith(`F${id}_`)&&(id!==25||n.includes('_Cocos_'))),project=join(base,folder);
 const output=join(project,id===26?'audio':'build-templates/web-mobile/audio');
 copyFileSync(join(import.meta.dirname,'audio-credits.js'),join(output,'credits.js'));
 const templates=id===26?[join(project,'index.html')]:readdirSync(join(project,'build-templates/web-mobile')).filter(n=>/^index\.(ejs|html)$/.test(n)).map(n=>join(project,'build-templates/web-mobile',n));
 if(!templates.length&&[25,27,28].includes(id)){
  const generated=join(project,'build/web-mobile/index.html'),template=join(project,'build-templates/web-mobile/index.html');
  assert(existsSync(generated),'Missing standard Web entry F'+id);
  // These variants use the stock, unhashed Creator entry. Preserve its bootstrap.
  const entry=readFileSync(generated,'utf8');assert(entry.includes("System.import('./index.js')"),'Unexpected bootstrap F'+id);
  copyFileSync(generated,template);templates.push(template);
 }
 assert(templates.length,'No Web template F'+id);
 for(const file of templates){let s=readFileSync(file,'utf8');if(!s.includes('audio/credits.js'))s=replace(s,'</head>','  <script defer src="audio/credits.js"></script>\n</head>','credits script');writeFileSync(file,s);}
 if(id===26){const require=createRequire(import.meta.url),ts=require('/Applications/CocosCreator.app/Contents/Resources/app.asar.unpacked/node_modules/typescript');writeFileSync(join(project,'src/sample-bank.js'),ts.transpileModule(readFileSync(join(import.meta.dirname,'SampleBank.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ES2020}}).outputText);continue;}
 const audio=join(project,[25,28].includes(id)?'assets/scripts/SceneMusic.ts':'assets/scripts/audio/AudioManager.ts');
 let s=readFileSync(audio,'utf8');
 if(!s.includes('private samples?: SampleBank')){
  s="import { SampleBank } from './SampleBank';\n"+s;
  s=replace(s,'private noise?: AudioBuffer;','private samples?: SampleBank;','sample member');
  s=replace(s,'this.noise = undefined;', 'this.samples?.close(); this.samples = undefined;', 'dispose');
  s=span(s,'  public play(cue: Cue)','  public playSmallWinJingle()',publicCues);
  s=span(s,'  public playWinDetail(', '  public finishWinPresentation()',details);
  s=replace(s,'this.stopCelebration(); this.clearVoices(this.winDetailVoices); this.lastCount', "this.stopCelebration(); this.clearVoices(this.winDetailVoices); this.samples?.stop('detail'); this.lastCount",'finish');
  s=span(s,'  private tone(', '  private readonly unlockMusic','');
  s=replace(s,'this.context = new Constructor();','this.context = new Constructor(); this.samples = new SampleBank(this.context);','context');
  s=replace(s,'private stopEffects(): void {','private stopEffects(): void { this.samples?.stop();','stop');
  s=replace(s,'source.buffer = buffer; gain.gain.value = volume;','source.buffer = buffer; gain.gain.value = volume; this.duckMusic(buffer.duration + .25);','actual duration');
  s=replace(s,'this.track(source, [gain], this.celebrationVoices);','this.track(source, [gain], this.celebrationVoices, 2);','short voice cap');
  s=replace(s,'this.startMusic();\n          else', 'this.startMusic();\n          else','context lifecycle');
  // Warm preload happens before the first meaningful player action; no sound is scheduled.
  s=replace(s,'  protected onDestroy(): void {','  protected onEnable(): void { this.audioContext(); }\n  protected onDestroy(): void {','preload');
  s=s.replace('/** Local arranged music; stream long AAC loops, decode only two short award clips. */','/** Licensed authored music, streamed AAC, bounded short PCM feedback. */');
 }
 assert(!s.includes('createOscillator')&&!s.includes('private tone('),'Synthetic cues remain F'+id);
 writeFileSync(audio,s);copyFileSync(join(import.meta.dirname,'SampleBank.ts'),join(dirname(audio),'SampleBank.ts'));
 const appFile=join(project,id===25?'assets/scripts/VelvetApp.ts':id===28?'assets/scripts/RegattaApp.ts':id===27?'assets/scripts/SovereignApp.ts':'assets/scripts/ui/AureliaApp.ts');
 let app=readFileSync(appFile,'utf8');
 if(!app.includes('game-music-credits')){
  if(id===16)app=replace(app,"this.art.button(stage,'Language selector',0,-478,682,86,'Language',7,()=>this.languages(),0);",`this.art.button(stage,'Language selector',-225,-478,430,86,'Language',7,()=>this.languages(),0);\n    this.art.button(stage,'Music credits',225,-478,430,86,'Music credits',7,${creditsAction},0);`,'F16 credits');
  else if(id===25)app=replace(app,'if(currentProfile())button(this.art,p,',`button(this.art,p,phrase('Music credits','音乐署名'),35,1740,650,70,${creditsAction},'ui7');if(currentProfile())button(this.art,p,`,'F25 credits');
  else if(id===28)app=replace(app,"    text(m, 'Choose your on-board atmosphere.",`    this.action(m, 'Music credits', 0, -365, 650, 65, ${creditsAction}, 'control-switch');\n    text(m, 'Choose your on-board atmosphere.`,'F28 credits');
  else if(id===27)app=replace(app,"this.nav(root,'account');",`this.smallButton(stage,'Music credits',0,-450,650,70,${creditsAction});this.nav(root,'account');`,'F27 credits');
  else if(id===31)app=replace(app,"    this.art.button(book,'Sign out',120,-418",`    this.art.button(book,'Music credits',-230,-418,430,66,'MUSIC CREDITS',7,${creditsAction},0);\n    this.art.button(book,'Sign out',120,-418`,'F31 credits');
  else app=replace(app,"['Privacy',()=>this.legal('privacy')]];",`['Privacy',()=>this.legal('privacy')],['Credits',${creditsAction}]];`,'profile credits F'+id);
 }
 if(id===25&&!app.includes('curated web cues')){
  app=replace(app,"['touch','spin','stop','win','grand',...(this.webMusic?[]:['salon'])]", "(this.webMusic?[]:['touch','spin','stop','win','grand','salon'])",'F25 skip old Web clips');
  app=replace(app,'cue(name:string){','cue(name:string){/* curated web cues */ if(this.webMusic){if(!this.state.sound||this.hidden)return;this.webMusic.setEffects(true);if(name===\'grand\')this.webMusic.playWinFanfare(4);else if(name===\'win\')this.webMusic.playSmallWinJingle();else if(name===\'stop\')this.webMusic.playReelStop(this.landedReels);else this.webMusic.play(name===\'spin\'?\'spin\':\'tap\');return;}','F25 bridge');
  app=replace(app,"this.webMusic.setMusic(!!this.state.sound&&!this.hidden);return", "this.webMusic.setMusic(!!this.state.sound&&!this.hidden);this.webMusic.setEffects(!!this.state.sound&&!this.hidden);return",'F25 settings');
  app=replace(app,'stopAudio(){this.webMusic?.setMusic(false);', 'stopAudio(){this.webMusic?.setEffects(false);this.webMusic?.setMusic(false);','F25 stop');
 }
 if(id===28&&!app.includes('curated web cues')){
  app=replace(app,"['press', 'launch', 'stop', 'win', 'collect', ...(this.webMusic ? [] : ['marina'])]", "(this.webMusic ? [] : ['press','launch','stop','win','collect','marina'])",'F28 skip old Web clips');
  app=replace(app,'private sound(key: string): void {',`private sound(key: string): void { /* curated web cues */ if(this.webMusic){if(this.hidden||!this.wallet?.snapshot().settings.sound)return;this.webMusic.setEffects(true);if(key==='win'){const ratio=(this.round?.totalWin||0)/(this.round?.bet||1);if(ratio>1)this.webMusic.playWinFanfare(ratio>=100?4:ratio>=40?3:ratio>=20?2:1);else this.webMusic.playSmallWinJingle();}else if(key==='collect')this.webMusic.playWinDetail('collect');else if(key==='stop')this.webMusic.playReelStop();else this.webMusic.play(key==='launch'?'spin':'tap');return;} `,'F28 bridge');
  app=replace(app,'this.webMusic.setMusic(!this.hidden && !!this.wallet?.snapshot().settings.music);return;', 'this.webMusic.setMusic(!this.hidden && !!this.wallet?.snapshot().settings.music);this.webMusic.setEffects(!this.hidden && !!this.wallet?.snapshot().settings.sound);return;','F28 settings');
  app=replace(app,"this.wallet.setting('sound', !state.sound); this.settings();", "this.wallet.setting('sound', !state.sound); this.syncMusic(); this.settings();",'F28 mute');
 }
 writeFileSync(appFile,app);console.log(`F${id}: authored cue player + discoverable credits installed`);
}
