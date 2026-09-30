import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=resolve(fileURLToPath(new URL('.',import.meta.url)),'../..'),base=join(root,'完整游戏模版/全游戏模版'),changes=new Map();
const project=id=>join(base,readdirSync(base).find(n=>n.startsWith(`F${id}_`)&&n.includes(id===25?'_Cocos_':'_v')));
const read=p=>changes.get(p)??readFileSync(p,'utf8');
function edit(p,a,b){let t=read(p);if(t.includes(b))return;if(t.split(a).length!==2)throw Error('Ambiguous anchor '+p+' '+a);changes.set(p,t.replace(a,b));}
function meta(p){if(existsSync(p+'.meta'))return;const h=createHash('sha256').update(relative(root,p)).digest('hex');changes.set(p+'.meta',JSON.stringify({ver:'4.0.24',importer:'typescript',imported:true,uuid:`${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`,files:[],subMetas:{},userData:{}},null,2)+'\n');}
const p25=join(project(25),'assets/scripts/VelvetApp.ts');
if(!read(p25).includes("import { ThemeFestivity }")){
 const source=read(p25),line="import { ThemeFestivity } from './vfx/ThemeFestivity';\n";
 changes.set(p25,source.startsWith('// @ts-nocheck\n')?source.replace('// @ts-nocheck\n','// @ts-nocheck\n'+line):line+source);
}
edit(p25,"const architecture=this.art.image(world,'hall-final',0,0,1024,1536);this.art.architectureLight(architecture);","const architecture=this.art.image(world,'hall-final',0,0,1024,1536);this.art.architectureLight(architecture);\n ThemeFestivity.hall(world,1024,1536,!this.state.motion,512,-768);");
edit(p25,'this.cabinetMaterial=this.art.cabinetLight(shell,g,m);','this.cabinetMaterial=this.art.cabinetLight(shell,g,m);ThemeFestivity.cabinet(this.cabinet,cw*(g.rx+g.rw/2),-ch*(g.ry+g.rh/2),cw*g.rw,ch*g.rh,GAMES[m].cols,!this.state.motion);');
edit(p25,"this.reelLightAt=this.clock;this.cue('stop');","this.reelLightAt=this.clock;this.cue('stop');this.cabinet?.getComponentInChildren(ThemeFestivity)?.land(c);");
const p28=join(project(28),'assets/scripts/RegattaApp.ts');
if(!read(p28).includes("import { ThemeFestivity }"))changes.set(p28,"import { ThemeFestivity } from './vfx/ThemeFestivity';\n"+read(p28));
edit(p28,'this.addHarborReflections(login);','this.addHarborReflections(login);\n    if(!login)ThemeFestivity.hall(this.content,this.width,this.height,this.reduced);');
edit(p28,"const [left, top, width, height] = spec.aperture;","const [left, top, width, height] = spec.aperture;\n    const trim=ThemeFestivity.cabinet(this.scene,(left+width/2-.5)*1024,(.5-top-height/2)*2048,width*1024,height*2048,MODES[this.mode].columns,this.reduced);");
edit(p28,"height * 2048, () => this.sound('stop'));","height * 2048, column => {this.sound('stop');trim.land(column);});");
const p27=join(project(27),'assets/scripts/SovereignApp.ts'),ap=join(project(27),'assets/scripts/audio/AudioManager.ts');
changes.set(ap,readFileSync(join(project(13),'assets/scripts/audio/AudioManager.ts'),'utf8'));meta(ap);
if(!read(p27).includes("import { ThemeFestivity }"))changes.set(p27,"import { ThemeFestivity } from './vfx/ThemeFestivity';\nimport { AudioManager } from './audio/AudioManager';\n"+read(p27));
edit(p27,"private art=new ArtBank();","private audio!:AudioManager;\n  private syncSound(scene:'home'|'cabinet'):void{this.audio.setMusic(this.player.data.sound);this.audio.setEffects(this.player.data.sound);this.audio.setScene(scene);}\n  private art=new ArtBank();");
edit(p27,'protected start():void{','protected start():void{\n    this.audio=this.node.addComponent(AudioManager);this.syncSound(\'home\');');
edit(p27,"this.closeModal();this.page=page;","this.syncSound('home');this.closeModal();this.page=page;");
edit(p27,"this.background(root,'f27/scenes/lobby-treasury');this.header(root);","this.background(root,'f27/scenes/lobby-treasury');ThemeFestivity.hall(root,this.W,this.H,this.reduced);this.header(root);");
edit(p27,"this.closeModal();this.page='game';","this.syncSound('cabinet');this.closeModal();this.page='game';");
edit(p27,'this.metalBorder(root,x,y,this.screenW+10,this.screenH+10,mode,4);','this.metalBorder(root,x,y,this.screenW+10,this.screenH+10,mode,4);\n    const trim=ThemeFestivity.cabinet(root,x,y,this.screenW,this.screenH,cols,this.reduced);trim.node.setSiblingIndex(6);');
edit(p27,'this.reelLand(column);}','this.reelLand(column);this.gameRoot?.getComponentInChildren(ThemeFestivity)?.land(column);this.audio.playReelStop(column);}');
edit(p27,'this.startReels(round.grid);','this.audio.play(\'spin\');this.startReels(round.grid);');
edit(p27,'if(round.totalWin>0){this.coinFlight','if(round.totalWin>0){this.gameRoot?.getComponentInChildren(ThemeFestivity)?.celebrate(Math.min(4,Math.floor(round.totalWin/round.bet/10)));\n      if(round.totalWin/round.bet>=10||round.feature?.wheel)this.audio.playWinFanfare(round.totalWin/round.bet>=40?3:1);else this.audio.playSmallWinJingle();\n      this.coinFlight');
edit(p27,"else await this.ordinaryWin(round.totalWin);}","else await this.ordinaryWin(round.totalWin);this.audio.finishWinPresentation();}");
edit(p27,'if(!armed)return;armed=false;action();','if(!armed)return;armed=false;this.audio.play(\'tap\');action();');
let patch='*** Begin Patch\n';for(const [p,t] of changes){if(existsSync(p)){const old=readFileSync(p,'utf8');if(old===t)continue;patch+=`*** Update File: ${p}\n@@\n`+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+t.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';}else patch+=`*** Add File: ${p}\n`+t.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';}patch+='*** End Patch\n';execFileSync('apply_patch',[],{input:patch,maxBuffer:5*1024*1024});console.log('Adapted F25, F27, F28 without replacing their art, audio or game rules.');
