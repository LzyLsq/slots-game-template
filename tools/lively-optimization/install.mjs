/** Exact, repeatable integration. Refuse unknown source layouts; never edit game math. */
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {profiles} from './profiles.mjs';
const here=fileURLToPath(new URL('.',import.meta.url)),root=resolve(here,'../..'),base=join(root,'完整游戏模版/全游戏模版');
const files=new Map();
const read=p=>files.get(p)??readFileSync(p,'utf8');
const set=(p,t)=>files.set(p,t);
function replace(p,old,next){const t=read(p);if(t.includes(next))return;if(t.split(old).length!==2)throw new Error(`Unknown/ambiguous anchor: ${p}: ${old.slice(0,100)}`);set(p,t.replace(old,next));}
function uuid(p){const h=createHash('sha256').update(relative(root,p)).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;}
const themeSource=readFileSync(join(here,'ThemeFestivity.ts'),'utf8');
let audio=readFileSync(join(base,'F20_Golden_Canopy_v1.0.0/assets/scripts/audio/AudioManager.ts'),'utf8');
audio=audio.replaceAll('window.addEventListener','globalThis.window?.addEventListener').replaceAll('window.removeEventListener','globalThis.window?.removeEventListener');
const halls={
  13:["this.art.image(exhibition,'harvest-exhibition',0,0,1024,1536);",'exhibition,1024,1536'],
  14:["this.art.image(world,'harvest-hall-soft',0,0,1000,2000);",'world,1000,2000'],
  15:["const stage=this.pageStage('Parade main stage'),i=this.selectedRoute,cfg=GAME_CONFIGS[i];",'stage,1020,1400'],
  16:["this.art.image(stage,'jamboree-plaza',0,0,1024,2048);",'stage,1024,2048'],
  17:["const stage=this.pageStage('Caravan destination courtyard');",'stage,1020,1400'],
  18:["const scenery=this.art.image(stage,'express-hall-soft',0,0,2048,3072);const floating:Node[]=[];",'stage,1200,1536'],
  19:["const scenery=this.art.image(stage,'treasury-hall-soft',0,0,1536,2688);",'stage,1024,1792'],
  21:["this.art.cover(stage,'canopy-hall-soft',0,0,Math.max(1024,Safe.visibleWidth/scale),this.height/scale);",'stage,1024,1792'],
  22:["stage.setScale(scale,scale,1);\n    const brand=this.art.image(stage,'canopy-brand',0,623",'stage,1024,1480','split'],
  23:["stage.setScale(scale,scale,1);\n    const brand=this.art.image(stage,'canopy-brand',0,568",'stage,1024,1536','split'],
  29:["this.jadeHall(stage,1024,1792);",'stage,1024,1792'],
  30:["this.art.cover(stage,'salon',0,0,Math.max(1024,Safe.visibleWidth/scale),this.height/scale);",'stage,1024,1792'],
  31:["this.art.cover(stage,'carnival-hall-soft',0,0,Math.max(1024,Safe.visibleWidth/scale),this.height/scale);",'stage,1024,1792'],
  33:["this.art.cover(stage,'salon',0,0,Math.max(1024,Safe.visibleWidth/scale),this.height/scale);",'stage,1024,1792'],
};
for(const p of profiles){
  if(p.id===26)continue;
  const project=join(base,readdirSync(base).find(n=>n.startsWith(`F${p.id}_${p.slug}_v`)));
  const fx=join(project,'assets/scripts/vfx/ThemeFestivity.ts');
  const theme={name:p.name,colors:p.colors,shape:p.shape,period:p.period,sway:p.sway};
  set(fx,themeSource.replace(/^const THEME = .*;$/m,`const THEME = ${JSON.stringify(theme)};`));
  if(!existsSync(fx+'.meta'))set(fx+'.meta',JSON.stringify({ver:'4.0.24',importer:'typescript',imported:true,uuid:uuid(fx),files:[],subMetas:{},userData:{}},null,2)+'\n');
  const app=join(project,'assets/scripts/ui/AureliaApp.ts');
  if(!existsSync(app))continue; // Special layouts are adapted explicitly, not by guessing.
  replace(app,"import { SalonAtmosphere } from '../vfx/SalonAtmosphere';","import { SalonAtmosphere } from '../vfx/SalonAtmosphere';\nimport { ThemeFestivity } from '../vfx/ThemeFestivity';");
  if(p.id===24){
    const lobby=join(project,'assets/scripts/ui/AtelierLobby.ts');
    if(!read(lobby).includes("import { ThemeFestivity }"))set(lobby,"import { ThemeFestivity } from '../vfx/ThemeFestivity';\n"+read(lobby));
    replace(lobby,"const stage=box(a.content,'Atelier exhibition',0,-8,1020,1540);stage.setScale(scale,scale,1);","const stage=box(a.content,'Atelier exhibition',0,-8,1020,1540);stage.setScale(scale,scale,1);\n ThemeFestivity.hall(stage,1020,1540,a.reduced);");
  }else{
    const [anchor,args,split]=halls[p.id];
    const next=split?anchor.replace('\n    const brand',`\n    ThemeFestivity.hall(${args},this.reduced);\n    const brand`):anchor+`\n    ThemeFestivity.hall(${args},this.reduced);`;
    replace(app,anchor,next);
  }
  replace(app,'private render():void{',"private render():void{\n    this.audio.setScene(this.page==='game'?'cabinet':'home');");
  const ap=p.id===30?'reelAperture(g)':p.id===33?'reelAperture(g,cfg.id)':'g.screen';
  const anchor='const reelNode=box(this.plane,\'Reels\'';
  replace(app,anchor,`const trimRect=${ap},trimPoint=imagePoint(trimRect);\n    const trim=ThemeFestivity.cabinet(this.plane,trimPoint[0],trimPoint[1],trimRect[2],trimRect[3],cfg.columns,this.reduced);\n    ${anchor}`);
  replace(app,"this.audio.play('reel-stop');ambient.land(column);","this.audio.playReelStop(column);ambient.land(column);trim.land(column);");
  const a=join(project,'assets/scripts/audio/AudioManager.ts');set(a,audio);
  if(p.id===16){
    replace(app,"const celebration=stage.addComponent(SalonWinStage);","this.audio.playWinFanfare(amount/this.bet>=40?3:amount/this.bet>=15?2:1);\n        const celebration=stage.addComponent(SalonWinStage);");
    replace(app,"this.audio.play(cue==='complete'?'reward':cue==='count'?'tap':'win');","this.audio.playWinDetail(cue==='complete'?'collect':cue==='count'?'count':'burst',cue==='count'?.5:1,1);");
    replace(app,"this.audio.play('win');const label=this.winLabel;","this.audio.playSmallWinJingle();const label=this.winLabel;");
    replace(app,'}finally{\n        fades.forEach','}finally{\n        this.audio.finishWinPresentation();\n        fades.forEach');
    replace(app,'finally{if(banner.isValid)banner.destroy();}','finally{this.audio.finishWinPresentation();if(banner.isValid)banner.destroy();}');
    console.log('Integrated F16 with its existing wallet choreography');continue;
  }
  // Add sound callbacks to the existing visual stages; retain their themed artwork.
  const win=join(project,'assets/scripts/vfx/SalonWinStage.ts');
  let ws=read(win);
  if(!ws.includes('private onSound?')){
    ws="import type { WinSoundCue } from '../audio/AudioManager';\n"+ws;
    ws=ws.replace('  public setup(',"  private onSound?:(cue:WinSoundCue,progress:number)=>void;\n  public setup(");
    ws=ws.replace(/(welcomeBonus=false|theme=0)\):Promise<void>/, '$1,onSound?:(cue:WinSoundCue,progress:number)=>void):Promise<void>');
    // Some newer projects do not have newcomer captions.
    if(!ws.includes('onSound?:('))throw new Error('Unsupported win signature '+win);
    ws=ws.replace('this.theme=Math.max', 'this.onSound=onSound;this.theme=Math.max');
    ws=ws.replace('this.revealed=true;',"this.revealed=true;this.onSound?.('reveal',1);");
    ws=ws.replace('this.finished=true;',"this.onSound?.('collect',1);this.finished=true;");
    ws=ws.replace('this.count.string=Math.floor',"this.onSound?.('count',p);this.count.string=Math.floor");
    ws=ws.replace('protected onDestroy():void {', 'protected onDestroy():void {this.onSound=undefined;');set(win,ws);
  }
  let ui=read(app);
  const sound="(cue,progress)=>this.audio.playWinDetail(cue,progress,winTier(amount/this.bet))";
  const call=/this\.audio\.play\('reward'\);await stage\.addComponent\(SalonWinStage\)\.setup\(this\.art,amount,this\.height,this\.reduced,amount\/this\.bet,GAME_CONFIGS\.indexOf\(this\.config\)(,welcomeBonus)?\);/;
  if(!ui.includes('this.audio.playWinFanfare')){
    if(!call.test(ui))throw new Error('Unknown win call '+app);
    const hasWelcome=read(win).includes('welcomeBonus=false');
    ui=ui.replace(call,(_,welcome)=>`this.audio.playWinFanfare(winTier(amount/this.bet));await stage.addComponent(SalonWinStage).setup(this.art,amount,this.height,this.reduced,amount/this.bet,GAME_CONFIGS.indexOf(this.config),${hasWelcome?(welcome?'welcomeBonus,':'false,'):''}${sound});`);
    ui=ui.replace('if(amount>this.presentedWin)this.audio.playAward(0);','if(amount>this.presentedWin)this.audio.playSmallWinJingle();');
    ui=ui.replace(/(private async presentWin\([^\n]+\)\s*:\s*Promise<void>\s*\{)/,'$1\n    this.plane?.getComponentInChildren(ThemeFestivity)?.celebrate(winTier(amount/this.bet));');
    ui=ui.replace(/(\}finally\{\n\s*)(fades\.forEach|if\(stage\.isValid\)stage\.destroy\(\);)/g,'$1this.audio.finishWinPresentation();\n        $2');set(app,ui);
  }
  console.log('Integrated F'+p.id);
}
let patch='*** Begin Patch\n';
for(const [p,t] of files){
  if(existsSync(p)){const old=readFileSync(p,'utf8');if(old===t)continue;patch+=`*** Update File: ${p}\n@@\n`+old.trimEnd().split('\n').map(l=>'-'+l).join('\n')+'\n'+t.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';}
  else patch+=`*** Add File: ${p}\n`+t.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n';
}
patch+='*** End Patch\n';execFileSync('apply_patch',[],{input:patch,cwd:root,maxBuffer:4*1024*1024});
console.log(`Applied ${files.size} explicit file updates. No math, account or purchase files edited.`);
