/* situation audio */
export function isBigWin(total:number,bet:number):boolean{return Number.isFinite(total)&&Number.isFinite(bet)&&bet>0&&total>bet;}
import { StationaryArtwork } from '../vfx/StationaryArtwork';
import {tr,language,setLanguage,initializeLanguage,LANGUAGES} from './Language';
import {rewardInk,rewardOutline} from './RewardArtwork';
import { _decorator, BlockInputEvents, Color, Component, EditBox, EventTouch, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, sys, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SecureRNG } from '../core/SecureRNG';
import { AudioManager } from '../audio/AudioManager';
import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import { GAME_CONFIGS, SYMBOL_ART, symbolAtlas, prizeArt } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import { ruleAward,ruleCounts } from '../math/PaytableDisplay';
import {explainWins,winCaption,type WinExplanation} from '../math/WinExplanation';
import type { GameConfig, GameId, SpinResult, WinResult } from '../math/types';
import type { AuthResult } from '../services/AuthService';
import { ApiRequestError } from '../services/ProductionApiClient';
import { RemoteSpinJournal } from '../services/RemoteSpinJournal';
import { hallStandings } from '../services/RankService';
import { INBOX_MESSAGES } from '../services/MailService';
import { STORE_PRODUCTS } from '../services/StoreService';
import { SalonReels } from '../reels/SalonReels';
import { SalonAtmosphere } from '../vfx/SalonAtmosphere';
import { ThemeFestivity } from '../vfx/ThemeFestivity';
import { CanopyLeaves } from '../vfx/CanopyLeaves';
import { HallConsoleLights } from '../vfx/HallConsoleLights';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, outlined, COLORS } from './SalonArt';
import { CABINETS, CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT, imagePoint, cabinetLayout, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const MODES = ['3 reels · Treasure picks', '20 lines · Lock & respin', '1,024 ways · Wild columns', '5+ clusters · Cascades'];
const exactMoney=(n:number):string=>Math.floor(n).toLocaleString('en-US');
const money=(n:number):string=>{const v=Math.floor(n),a=Math.abs(v);if(a<1000000)return exactMoney(v);const unit=a>=1000000000?1000000000:1000000;return (Math.trunc(v/unit*100)/100).toFixed(2).replace(/\.?0+$/,'')+(unit===1000000000?'B':'M');};
@ccclass('AureliaApp')
export class AureliaApp extends Component {
  private art=new SalonArt();private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private retiring?:Node;private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;private turboLamp?:Label;private turbo=false;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private homeChanging=false;private authExpanded=false;private selectedRoute=0;private selectedBundle=0;private curtainClosed=false;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
  private loadedCabinets=new Set<string>();
  private balanceLabel?:Label;private betLabel?:Label;private winLabel?:Label;private topWinLabel?:Label;private hintLabel?:Label;
  private top=960;private height=1920;private debug=false;private reduced=false;private force?:string;
  private draft={username:'',password:'',confirmPassword:'',nickname:'',acceptedTerms:false};
  private generator=new ResultGenerator();private rng=new SecureRNG();private audio!:AudioManager;
  private journal!:RemoteSpinJournal;
  private lastAwards:WinExplanation[]=[];private lastAwardTotal=0;private lastAwardGame?:GameId;
  private cabinetControls:{index:number;face:Node;alpha:UIOpacity;enabled:boolean}[]=[];
  private spinActivity?:Node;
  protected onLoad():void {
    initializeLanguage(sys.localStorage);
    this.audio=this.node.addComponent(AudioManager);this.audio.setMusic(false);
    this.node.addComponent(Safe);this.node.on('csw-layout-changed',this.resize,this);
    game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.show,this);
    void this.boot();
  }
  private async boot():Promise<void>{
    const query=new URLSearchParams(globalThis.location?.search??'');
    this.debug=['localhost','127.0.0.1'].includes(globalThis.location?.hostname??'')&&query.get('debug')==='1';
    this.force=this.debug?query.get('force')??undefined:undefined;
    this.reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false;
    const runtime=globalThis as typeof globalThis&{__JAMBOREE_API_URL__?:string};
    this.services=new GameBootstrap(undefined,false,runtime.__JAMBOREE_API_URL__);
    this.journal=new RemoteSpinJournal(this.services.save);
    const loading=box(this.node,'Loading',0,0,1080,1920);
    const g=loading.addComponent(Graphics);g.fillColor=new Color('#EACCB2');g.rect(-1500,-2000,3000,4000);g.fill();
    text(loading,'TREASURE JAMBOREE',0,90,950,160,72,COLORS.ink,true);
    const progress=text(loading,'Unlocking your treasury…',0,-70,950,100,38);
    try{
      await this.art.load(['jamboree-premium-spin','jamboree-premium-plus','jamboree-premium-minus','jamboree-premium-auto','jamboree-soft-plus','jamboree-soft-coin']);
      await this.art.load([...GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),symbolAtlas(c.id)+'-blur',prizeArt(c.id)]),'jamboree-plaza','symbols','interfaces','portraits','optics','apple-mark','canopy-brand',...Array.from({length:4},(_,i)=>'canopy-title-'+i),'canopy-services',...Array.from({length:4},(_,i)=>'canopy-frame-'+i),...Array.from({length:16},(_,i)=>'canopy-button-'+i),...Array.from({length:4},(_,i)=>'canopy-soft-plate-'+i)],(n,t)=>{
        progress.string=tr(`Polishing your treasures  ${Math.round(n/t*100)}%`);
        globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:n/t*.9}}));
      });
      const resumed=await this.services.resumeSession();
      if(this.debug&&!resumed){this.accept();await this.services.auth.guestLogin();}
      const requested=query.get('screen') as Page|null;
      this.config=GAME_CONFIGS.find(g=>g.id===query.get('game'))??GAME_CONFIGS[0];
      this.page=(resumed||this.debug)?(requested??'home'):'login';
      if(!['home','login','register','game','store','rewards','rank','profile'].includes(this.page))this.page='home';
      const sound=this.services.profile.current()?.settings.sound??true;
      this.audio.setEffects(sound);this.audio.setMusic(sound);
      this.restoreRemoteRound();
      if(this.page==='game')await this.art.load([this.config.id+'-tall']);
      this.render();loading.destroy();
      globalThis.dispatchEvent?.(new Event('aurelia-app-ready'));
    }catch(error){progress.string=tr('Could not open the treasury. Tap to retry.');loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
  }
  private accept():void{this.services.save.update(s=>{s.compliance={ageConfirmedAt:new Date().toISOString(),termsVersion:TERMS_VERSION,privacyVersion:PRIVACY_VERSION};});}
  private restoreRemoteRound():boolean{
    if(!this.services.api)return false;const pending=this.journal.pending();if(!pending)return false;
    const config=GAME_CONFIGS.find(c=>c.id===pending.gameId);if(!config)return false;
    this.config=config;this.betIndex=config.bets.indexOf(pending.bet);this.page='game';this.state={kind:'retry',requestId:pending.requestId};
    return true;
  }
  private resize():void{
    this.height=Safe.visibleHeight;this.top=this.height/2;
    if(this.page==='game'&&this.plane&&this.root){this.layoutPlane();return;}
    // Mobile keyboards change the viewport on focus/blur. Keep live EditBoxes
    // (including composition and selection) instead of destroying the form.
    // The Canvas still adapts its projection; navigation builds a fresh layout.
    if(this.root&&(this.page==='login'||this.page==='register'))return;
    if(this.root&&!this.busy)this.render();
  }
  private render():void{
    const sound=this.services.profile.current()?.settings.sound??true;
    this.audio.setEffects(sound);this.audio.setMusic(sound);
    this.audio.setScene(this.page==='game'?'cabinet':'home');
    this.cabinetControls=[];this.spinActivity=undefined;
    this.art.reducedMotion=this.reduced;
    this.audio.setModalOpen(false);this.generation++;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.topWinLabel=this.hintLabel=this.autoLamp=this.soundLamp=this.turboLamp=undefined;
    const previous=this.root;if(previous){const a=opacity(previous,255);Tween.stopAllByTarget(a);a.opacity=255;for(const edit of previous.getComponentsInChildren(EditBox))edit.enabled=false;}
    if(this.retiring&&this.retiring!==previous)this.retiring.destroy();this.retiring=previous;
    this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Treasure Jamboree interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='login'||this.page==='register'?'jamboree-plaza':'canopy-services';
    this.bg=this.page==='game'||this.page==='home'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);

    if(this.page!=='game'){box(root,'Royal coin atmosphere',0,0,Safe.visibleWidth,this.height).addComponent(CanopyLeaves).setup(this.art,Safe.visibleWidth,this.height,this.reduced);}
    this.content=box(root,'Page',0,0,1080,this.height);
    if(this.page==='login'||this.page==='register')this.authPage();
    else if(this.page==='game')this.gamePage();
    else{this.header();if(this.page==='home')this.homePage();if(this.page==='store')this.storePage();if(this.page==='rewards')this.rewardsPage();if(this.page==='rank')this.rankPage();if(this.page==='profile')this.profilePage();this.navigation();}
    if(this.page!=='login'&&this.page!=='register'&&!complianceCurrent(this.services.save.read().compliance))this.policyConsent();
    this.node.getChildByName('RotateDeviceOverlay')?.setSiblingIndex(this.node.children.length-1);
    // Retain an opaque outgoing scene until the new scene is fully visible.
    const crossfade=!!previous&&!this.reduced&&!this.curtainClosed;
    const o=opacity(root,crossfade?0:255);
    const complete=()=>{if(previous?.isValid)previous.destroy();if(this.retiring===previous)this.retiring=undefined;};
    if(crossfade)tween(o).to(.38,{opacity:255},{easing:'sineInOut'}).call(complete).start();else complete();
  }
  private loadingProgress?: (value:number,caption:string)=>void;
  private loadingCleanup?:()=>void;
  private async navigate(page:Page,config?:GameConfig):Promise<void>{
    if(this.state.kind!=='idle'&&this.page==='game'){this.toast('Finish the current round before leaving.');return;}
    if(this.busy)return;this.busy=true;this.auto=false;this.updateAuto();
    let loading:Node|undefined;
    try{
      if(config){const cached=this.loadedCabinets.has(config.id);loading=this.gameLoading(config);await Promise.all([this.art.load([config.id+'-tall'],(done,total)=>this.loadingProgress?.(done/total*.8,'Preparing your game…')),this.delay(this.reduced?.01:cached?.18:.48)]);this.loadedCabinets.add(config.id);}

      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(.9,'Opening your game…');}if(!this.reduced)await this.delay(.24);
      if(loading){this.loadingProgress?.(1,'Ready');await this.delay(.2);await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.24,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{this.loadingCleanup?.();this.loadingCleanup=undefined;if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.busy=false;}
  }
  private gameLoading(config:GameConfig):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);this.art.cover(n,'jamboree-plaza',0,0,Safe.visibleWidth,this.height);
    const veil=box(n,'Warm scene depth',0,0,Safe.visibleWidth,this.height).addComponent(Graphics);veil.fillColor=new Color(43,32,26,172);veil.rect(-Safe.visibleWidth/2,-this.height/2,Safe.visibleWidth,this.height);veil.fill();
    const stage=box(n,'Treasure arrival',0,0,1020,1340);const scale=Math.min(1,(Safe.visibleWidth-48)/1020,(this.height-Safe.safeTop-Safe.safeBottom-100)/1340);stage.setScale(scale,scale,1);
    const index=GAME_CONFIGS.indexOf(config);
    const halo=this.art.light(stage,1,0,105,830,830,100);
    const title=this.art.image(stage,'canopy-title-'+index,0,510,840,160);this.sheen(title,725,100);
    const world=this.art.image(stage,prizeArt(config.id),0,115,706,646);
    const motion:Tween<UIOpacity>[]=[];
    if(!this.reduced){
      motion.push(tween(opacity(n,0)).to(.16,{opacity:255},{easing:'sineOut'}).start());
      // One settled arrival, then small glints: the treasure never wobbles like a sticker.
      world.setPosition(0,90);tween(world).to(.42,{position:new Vec3(0,115,0)},{easing:'cubicOut'}).start();
      motion.push(tween(opacity(world,0)).to(.28,{opacity:255},{easing:'sineOut'}).start());
      motion.push(tween(opacity(halo,55)).to(1.8,{opacity:120},{easing:'sineInOut'}).to(1.8,{opacity:55},{easing:'sineInOut'}).union().repeatForever().start());
      for(let i=0;i<6;i++){
        const angle=i*Math.PI/3+.3,glint=this.art.light(stage,3,Math.cos(angle)*300,115+Math.sin(angle)*260,32+i%2*14,32+i%2*14,0);
        motion.push(tween(opacity(glint,0)).delay(i*.19).to(.38,{opacity:175},{easing:'sineOut'}).to(.7,{opacity:0},{easing:'sineInOut'}).delay(1.1).union().repeatForever().start());
      }
    }
    const rail=this.art.panel(stage,0,-421,930,274,0);
    const status=text(rail,'Preparing your game…',-68,80,670,56,44,COLORS.ink,true);status.enableWrapText=false;status.overflow=Label.Overflow.SHRINK;
    const percentage=text(rail,'0%',352,80,120,56,44,COLORS.ink,true);percentage.node.name='Loading percentage';
    const track=box(rail,'Inset gold progress channel',0,15,810,24).addComponent(Graphics);track.fillColor=new Color('#C8A777');track.roundRect(-405,-12,810,24,12);track.fill();
    const fill=box(rail,'Loading gold inlay',0,15,802,16).addComponent(Graphics);
    const tip=text(rail,MODES[index],0,-82,826,50,40,COLORS.ink);tip.enableWrapText=false;tip.overflow=Label.Overflow.SHRINK;
    const phases=['ARTWORK','CABINET','READY'].map((label,i)=>text(rail,label,(i-1)*292,-31,270,44,36,'#826849',true));
    const progress={value:0};let target=0,lastPercent=-1;
    const gold=new Color('#E9AD38'),shine=new Color('#FFF0B4');
    const draw=()=>{if(!n.isValid)return;const width=802*progress.value;fill.clear();if(width>0){fill.fillColor=gold;fill.roundRect(-401,-8,width,16,Math.min(8,width/2));fill.fill();fill.fillColor=shine;fill.roundRect(-401,-1,width,7,Math.min(3.5,width/2));fill.fill();}const percent=Math.round(progress.value*100);if(percent!==lastPercent){percentage.string=percent+'%';lastPercent=percent;}};
    this.loadingProgress=(value,caption)=>{target=Math.max(target,Math.min(1,value));status.string=tr(caption);phases.forEach((phase,i)=>{phase.node.getComponent(UIOpacity)!.opacity=target>=[0,.8,1][i]?255:100;});Tween.stopAllByTarget(progress);if(this.reduced){progress.value=target;draw();}else tween(progress).to(.18,{value:target},{easing:'sineOut',onUpdate:draw}).start();};
    phases.forEach(phase=>opacity(phase.node,100));
    const pause=()=>{motion.forEach(t=>t.pause());Tween.stopAllByTarget(progress);};
    const resume=()=>{motion.forEach(t=>t.resume());progress.value=target;draw();};
    game.on(Game.EVENT_HIDE,pause);game.on(Game.EVENT_SHOW,resume);
    this.loadingCleanup=()=>{Tween.stopAllByTarget(progress);motion.forEach(t=>t.stop());game.off(Game.EVENT_HIDE,pause);game.off(Game.EVENT_SHOW,resume);};
    draw();return n;
  }
  private header():void{
    const p=this.services.profile.current(),y=this.top-92-Safe.safeTop;
    const wallet=this.art.panel(this.content!,-250,y,500,110,2);
    this.art.image(wallet,'jamboree-soft-coin',-194,0,74,74);
    this.balanceLabel=text(wallet,money(this.services.economy.balance()),-4,0,278,76,46,COLORS.cream);
    this.balanceLabel.enableWrapText=false;this.balanceLabel.overflow=Label.Overflow.SHRINK;
    const topupHit=box(wallet,'Top up',190,0,112,112);
    const topup=this.art.image(topupHit,'jamboree-soft-plus',0,0,74,74);bindPress(topupHit,topup,()=>void this.navigate('store'));
    const mail=this.art.button(this.content!,'Mail',75,y,116,116,'',5,()=>this.mail());
    const unread=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).read&&!this.services.mail.state(m.id).deleted).length;
    if(unread){const dot=box(mail,'Unread mail',32,32,44,44),g=dot.addComponent(Graphics);g.fillColor=new Color('#A32129');g.circle(0,0,22);g.fill();text(dot,String(unread),0,0,40,40,27,COLORS.cream);}
    const account=this.art.panel(this.content!,327,y,326,110,0);account.name='Open your treasure passport';
    const avatar=this.art.image(account,'portraits',105,0,98,98,p?.avatar??0);
    const nickname=text(account,p?.nickname??'Guest',-48,0,198,66,34,COLORS.ink,false,true);
    nickname.enableWrapText=false;nickname.overflow=Label.Overflow.SHRINK;
    bindPress(account,avatar,()=>void this.navigate('profile'));
  }
  private navigation():void{
    const nav=this.art.panel(this.content!,0,-this.top+132+Safe.safeBottom,1010,220,0);
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Shop','Rewards','Plaza','Rank','Account'],icons=[1,2,6,3,4];
    pages.forEach((page,i)=>{
      const center=i===2,active=page===this.page;
      const hit=box(nav,labels[i],(i-2)*160,0,156,184);
      if(active){
        this.art.panel(hit,0,13,152,169,1).setSiblingIndex(0);
        const marker=box(hit,'Current page indicator',0,-61,56,6).addComponent(Graphics);
        marker.fillColor=new Color('#A66921');marker.roundRect(-28,-3,56,6,3);marker.fill();
      }
      const icon=this.art.image(hit,'interfaces',0,48,center?111:88,center?102:88,icons[i]);
      const captionY=-25;
      const caption=outlined(text(hit,labels[i],0,captionY,150,50,36,'#35200F'),'#FFF4DD',1.5);caption.enableWrapText=false;
      if(!active)opacity(icon,210);
      bindPress(hit,icon,()=>{if(page!==this.page)void this.navigate(page);});
    });
  }
  private metalEdges(parent:Node,w:number,h:number,phase:number):void{
    const fx=box(parent,'Gilded reflection',0,0,w,h).addComponent(SalonAtmosphere);
    fx.metalFrame(this.art,w,h,phase);fx.reducedMotion=this.reduced;
  }
  private pageStage(name:string):Node{
    const available=this.height-520-Safe.safeTop-Safe.safeBottom,scale=Math.min(1,available/1400,(Safe.visibleWidth-60)/1020);
    const n=box(this.content!,name,0,(Safe.safeBottom-Safe.safeTop)/2,1020,1400);n.setScale(scale,scale,1);this.festivalDrift(n);return n;
  }
  private homePage():void{
    this.homeChanging=false;
    const stage=box(this.content!,'Continuous treasure plaza',0,0,1024,2048);stage.setSiblingIndex(0);
    const scale=Math.max(Safe.visibleWidth/1024,this.height/2048);stage.setScale(scale,scale,1);
    this.art.image(stage,'jamboree-plaza',0,0,1024,2048);
    ThemeFestivity.hall(stage,1024,2048,this.reduced);
    const brand=this.art.image(this.content!,'canopy-brand',0,this.top-Safe.safeTop-318,760,238);this.sheen(brand,650,155);
    // Landmarks belong to the same camera plane as the painting; there are no
    // floating destination cards. A separate, safe-area rail carries controls.
    const landmarks:readonly (readonly[number,number])[]=[[-330,-165],[325,10],[-290,370],[305,350]];
    const lamps:Node[]=[];
    GAME_CONFIGS.forEach((cfg,i)=>{
      const [x,y]=landmarks[i];const door=box(stage,cfg.name+' pavilion',x,y,260,300);
      const lamp=this.art.light(door,1,0,0,280,280,0);lamps.push(lamp);
      const sign=this.art.panel(door,0,85,290,78,1);sign.name='Enter pavilion · '+cfg.name;
      text(sign,cfg.name,0,0,260,60,32,'#402C25');
      bindPress(door,sign,()=>enter(i),{jelly:.2});
    });
    const rail=box(this.content!,'Treasure fair entrances',0,-this.top+Safe.safeBottom+565,940,430);
    // One continuous lacquered console, rather than a stack of unrelated pills.
    const console=this.art.panel(rail,0,-65,940,440,0);
    console.name='Treasure entrance console';
    if(!this.reduced)box(rail,'Console gold light rig',0,0,0,0).addComponent(HallConsoleLights).setup(this.art);
    const title=text(rail,'CHOOSE YOUR TREASURE',0,94,820,65,43,COLORS.ink,true);
    title.enableWrapText=false;title.overflow=Label.Overflow.SHRINK;
    const detail=text(rail,'Tap a treasure to play',0,40,820,44,32,COLORS.ink);
    detail.isBold=false;
    const rule=box(rail,'Console engraved divider',0,-8,818,2).addComponent(Graphics);
    rule.strokeColor=new Color(151,108,46,105);rule.lineWidth=2;rule.moveTo(-409,0);rule.lineTo(409,0);rule.stroke();
    const entryCaptions:Label[]=[];
    const select=(index:number,animate=true)=>{
      const next=(index+GAME_CONFIGS.length)%GAME_CONFIGS.length;this.selectedRoute=next;
      detail.string=animate?`${GAME_CONFIGS[next].name} · ${tr(MODES[next])}`:tr('Tap a treasure to play');
      lamps.forEach((lamp,i)=>{const o=lamp.getComponent(UIOpacity)!;Tween.stopAllByTarget(o);if(this.reduced||!animate)o.opacity=i===next?175:0;else tween(o).to(.22,{opacity:i===next?175:0},{easing:'sineOut'}).start();});
      if(animate){this.audio.play('tap');if(!this.reduced){const o=opacity(title.node,150);Tween.stopAllByTarget(o);tween(o).to(.18,{opacity:255},{easing:'sineOut'}).start();}}
    };
    // Every attraction is a direct entrance; selection is only for swipe previews.
    const enter=(index:number)=>{
      if(this.homeChanging||this.busy||this.modal||this.page!=='home')return;
      select(index,false);
      this.homeChanging=true;
      const caption=entryCaptions[index];caption.string=tr('OPENING');
      this.audio.play('tap');
      void this.navigate('game',GAME_CONFIGS[this.selectedRoute]).finally(()=>{
        this.homeChanging=false;
        if(caption.isValid)caption.string=tr('PLAY');
      });
    };
    GAME_CONFIGS.forEach((cfg,i)=>{
      const hit=box(rail,'Enter '+cfg.name,(i-1.5)*216,-139,206,260);
      // Icon, name and action are one press surface, not a selector above a
      // separate confirmation. The fixed hitbox also permits dragging away.
      const pressSurface=box(hit,'Treasure entrance press',0,0,206,260);
      this.art.image(pressSurface,symbolAtlas(cfg.id),0,69,126,110,[SYMBOL_ART.chest,SYMBOL_ART.ruby,SYMBOL_ART.pearl,SYMBOL_ART.crown][i]);
      const caption=text(pressSurface,cfg.name.replace(' ','\n'),0,-10,198,68,32,'#402C25');caption.lineHeight=33;
      const action=this.art.panel(pressSurface,0,-88,166,65,3);
      entryCaptions.push(text(action,'PLAY',0,0,142,48,30,'#402C25'));
      bindPress(hit,pressSurface,()=>enter(i),{jelly:.25,compression:.975,depth:3});
    });
    let touch:number|undefined,startX=0,startY=0;
    stage.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{if(touch!==undefined)return;const id=e.getID();if(id===null)return;touch=id;const p=e.getUILocation();startX=p.x;startY=p.y;});
    stage.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{if(touch!==e.getID())return;touch=undefined;if(this.homeChanging||this.busy||this.modal||this.page!=='home')return;const p=e.getUILocation(),dx=p.x-startX,dy=p.y-startY;if(Math.abs(dx)>90&&Math.abs(dx)>Math.abs(dy)*1.4)select(this.selectedRoute+(dx<0?1:-1));});
    stage.on(Node.EventType.TOUCH_CANCEL,()=>{touch=undefined;});
    // A few reflections on the fountain, never whole-building wobble.
    for(let i=0;i<5;i++){const light=this.art.light(stage,3,-110+i*54,120-(i%2)*24,24,24,100);if(!this.reduced)tween(opacity(light,35)).delay(i*.47).to(1.1,{opacity:190},{easing:'sineInOut'}).to(1.8,{opacity:35},{easing:'sineInOut'}).union().repeatForever().start();}
    select(this.selectedRoute,false);
  }

  private authDecor():void{
    if(this.reduced)return;
    const layer=box(this.content!,'Living treasury lights',0,0,1080,this.height);layer.setSiblingIndex(0);
    // Keep decorative light away from the central form and its text.
    for(let i=0;i<8;i++){
      const side=i%2?-1:1,coin=this.art.image(layer,'symbols',side*(455-(i%3)*14),-this.top+210,100,100,0);coin.name='Boarding rising coin';const alpha=opacity(coin,0);const start=new Vec3(side*(465-(i%3)*14),-this.top+210,0),end=new Vec3(side*(438+(i%2)*12),this.top-290,0);
      tween(coin).delay(i*.95).repeatForever(tween().set({position:start,angle:0}).to(7.6,{position:end,angle:190},{easing:'sineInOut'})).start();
      tween(alpha).delay(i*.95).repeatForever(tween().to(.8,{opacity:240}).delay(5.4).to(1.4,{opacity:0})).start();
    }
    for(let i=0;i<18;i++){const side=i%2?-1:1,x=side*(447+(i%3)*24),y=-this.top+260+(i/18)*(this.height-420);const star=this.art.light(layer,3,x,y,39+(i%3)*16,39+(i%3)*16,155);const alpha=star.getComponent(UIOpacity)!;tween(star).delay(i*.17).repeatForever(tween().by(2.3,{position:new Vec3(-side*22,48,0),angle:55},{easing:'sineInOut'}).by(2.3,{position:new Vec3(side*22,-48,0),angle:-55},{easing:'sineInOut'})).start();tween(alpha).delay(i*.17).to(1.3,{opacity:245}).to(1.8,{opacity:35}).union().repeatForever().start();}
    for(let i=0;i<2;i++){const halo=this.art.light(layer,1,i?355:-355,this.top-405,510,510,75);tween(halo).delay(i).to(3,{scale:new Vec3(1.22,1.22,1)},{easing:'sineInOut'}).to(3,{scale:new Vec3(.9,.9,1)},{easing:'sineInOut'}).union().repeatForever().start();}
  }
  private authPage():void{
    const register=this.page==='register';this.authDecor();
    this.art.button(this.content!,'Language selector',Safe.visibleWidth/2-170,this.top-Safe.safeTop-90,290,80,'Language',7,()=>this.languages(),0);
    const stage=box(this.content!,'Canopy membership',0,30,1020,1640);const scale=Math.min(1,(this.height-260-Safe.safeTop-Safe.safeBottom)/1640,(Safe.visibleWidth-45)/1020);stage.setScale(scale,scale,1);
    const brand=this.art.image(stage,'canopy-brand',0,register?690:602,register?740:780,240);this.idleAccent(brand,0,12,.2,1.8);this.sheen(brand,510,150);
    const panel=this.art.panel(stage,0,register?-18:-160,935,register?1240:970,0);this.metalEdges(panel,903,register?1207:937,.8);
    text(panel,register?'JOIN TREASURE JAMBOREE':'YOUR TREASURE INVITATION',0,register?525:390,812,82,42,COLORS.ink,true);
    text(panel,register?'Your treasure adventure starts here':'Sign in to your world of gold',0,register?448:319,800,56,30,COLORS.ink);
    this.field(panel,'Username',register?334:204,this.draft.username,v=>this.draft.username=v);
    this.field(panel,'Password · 10–72 characters',register?206:76,this.draft.password,v=>this.draft.password=v,true);
    if(register){
      this.field(panel,'Confirm password',78,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);this.field(panel,'Nickname',-50,this.draft.nickname,v=>this.draft.nickname=v);
      const check=this.art.button(panel,'Accept terms',-335,-173,91,91,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1),mark=opacity(check,this.draft.acceptedTerms?255:65);
      text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',65,-173,649,84,29,COLORS.ink);
      const primary=this.art.button(panel,'Create account',0,-323,795,126,'CREATE ACCOUNT',4,()=>void this.authAction('register'),3);this.metalEdges(primary,763,110,1.1);
      this.art.button(panel,'Switch account form',0,-477,790,95,'Back to sign in',9,()=>void this.navigate('login'),0);
    }else{
      const primary=this.art.button(panel,'Sign in',0,-72,810,139,'SIGN IN',14,()=>void this.authAction('login'),3);this.metalEdges(primary,778,121,.7);
      const apple=this.art.panel(panel,0,-216,810,104,1);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-242,0,42,50);text(apple,'Sign in with Apple',0,0,529,75,36,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));
      this.art.button(panel,'Guest',-211,-356,390,98,'Guest play',0,()=>this.guestConsent(),0);this.art.button(panel,'Create account',211,-356,390,98,'Register',4,()=>void this.navigate('register'),0);
    }
    const links=box(this.content!,'Legal links',0,-this.top+151+Safe.safeBottom,990,86);['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*320,0,305,78,t,7,()=>this.legal(['terms','privacy','support'][i] as LegalPage),0));
    outlined(text(this.content!,'Virtual coins · No cash prizes · Eligible adults only',0,-this.top+62+Safe.safeBottom,1000,50,26,COLORS.cream),'#583B23',2);
  }

  private field(parent:Node,placeholder:string,y:number,value:string,onChange:(v:string)=>void,password=false):EditBox{
    // Configure off-stage: EditBox onLoad otherwise creates default labels
    // and clears the existing material before our references are assigned.
    const frame=this.art.panel(parent,0,y,778,103,1);
    const n=box(frame,'Text entry',0,0,572,76);n.active=false;
    const focusFrame=box(n,'Focused gold edge',0,0,760,85);const fg=focusFrame.addComponent(Graphics);fg.strokeColor=new Color('#F3D083');fg.lineWidth=4;fg.roundRect(-380,-42.5,760,85,13);fg.stroke();
    const focusOpacity=opacity(focusFrame,0);const edit=n.addComponent(EditBox);
    edit.backgroundImage=null!;
    const label=text(n,value,0,0,560,72,49,'#35200F',false,true);label.horizontalAlign=Label.HorizontalAlign.LEFT;label.isBold=true;
    const hint=text(n,placeholder,0,0,560,72,39,'#49351F');hint.horizontalAlign=Label.HorizontalAlign.LEFT;hint.isBold=true;
    // EditBox positions labels by their top-left corner, not their center.
    label.node.getComponent(UITransform)!.setAnchorPoint(0,1);hint.node.getComponent(UITransform)!.setAnchorPoint(0,1);
    edit.textLabel=label;edit.placeholderLabel=hint;edit.placeholder=tr(placeholder);edit.inputMode=EditBox.InputMode.SINGLE_LINE;edit.maxLength=password?72:18;
    // Assigning labels while EditBox is still in its default multiline mode
    // changes vertical alignment to TOP. Single-line mode does not reset it.
    label.verticalAlign=hint.verticalAlign=Label.VerticalAlign.CENTER;
    label.lineHeight=58;hint.lineHeight=49;label.enableWrapText=hint.enableWrapText=false;label.overflow=hint.overflow=Label.Overflow.SHRINK;
    edit.inputFlag=password?EditBox.InputFlag.PASSWORD:EditBox.InputFlag.DEFAULT;edit.string=value;
    const save=()=>onChange(edit.string);
    n.on(EditBox.EventType.TEXT_CHANGED,save);
    n.on(EditBox.EventType.EDITING_DID_BEGAN,()=>{Tween.stopAllByTarget(focusOpacity);if(this.reduced)focusOpacity.opacity=210;else tween(focusOpacity).to(.18,{opacity:230}).to(1.05,{opacity:150},{easing:'sineInOut'}).to(1.05,{opacity:230},{easing:'sineInOut'}).union().repeatForever().start();});
    n.on(EditBox.EventType.EDITING_DID_ENDED,()=>{save();Tween.stopAllByTarget(focusOpacity);if(this.reduced)focusOpacity.opacity=0;else tween(focusOpacity).to(.18,{opacity:0}).start();});
    n.on(EditBox.EventType.EDITING_RETURN,save);
    n.active=true;return edit;
  }
  private async authAction(kind:'login'|'register'|'apple'):Promise<void>{
    if(this.busy)return;this.busy=true;
    try{
      if(kind==='register'&&this.draft.acceptedTerms)this.accept();
      const result:AuthResult=kind==='register'?await this.services.auth.register(this.draft):kind==='apple'?await this.services.auth.signInWithApple():await this.services.auth.login({username:this.draft.username,password:this.draft.password,remember:true});
      if(result.ok){this.draft.password=this.draft.confirmPassword='';this.page='home';if(this.restoreRemoteRound())await this.art.load([this.config.id+'-tall']);this.render();}else this.toast(result.message??'Unable to sign in.');
    }catch{this.toast('Unable to connect. Your form has been kept.');}finally{this.busy=false;}
  }
  private policyConsent():void{
    if(this.modal)return;
    const panel=this.sheet('Royal membership terms',710);
    panel.getChildByName('Close dialog')!.active=false;
    text(panel,'Confirm that you meet your region’s minimum age\nand accept the current Terms and Privacy Policy.\nVirtual coins have no cash value.',0,105,820,240,36);
    this.art.button(panel,'Accept updated policy',0,-99,760,108,'Accept & continue',14,()=>{this.accept();this.closeModal();},3);
    this.art.button(panel,'Return to sign in',0,-241,760,99,'Sign out to review policies',7,()=>{this.closeModal();void this.signOut();},1);
  }
  private guestConsent():void{
    const s=this.sheet('Before you enter',650);
    text(s,'This is a simulated casino for eligible adults.\nCoins have no cash value and cannot be withdrawn.\n\nConfirm that you meet your region’s minimum age\nand accept the Terms and Privacy Policy.',0,20,820,330,36);
    this.art.button(s,'Confirm eligibility',0,-225,760,110,'I am eligible · Continue',14,()=>{this.accept();void this.services.auth.guestLogin().then(r=>{if(r.ok){this.page='home';this.render();}else this.toast(r.message??'Unable to enter.');});});
  }
  private gamePage():void{
    const cfg=this.config,g=CABINETS[cfg.id];
    this.plane=box(this.content!,'Cabinet-coordinate-plane',0,0,1024,2304);
    this.art.image(this.plane,cfg.id+'-tall',0,0,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT);
    // Ambient light must render over the opaque integrated environment plate.
    // It shares the cabinet's coordinate plane with the reels and controls.
    const ambient=box(this.plane,'Cabinet reflections',0,0,1024,2304).addComponent(SalonAtmosphere);
    ambient.setup(this.art,1024,2304);ambient.cabinet(this.art,g);ambient.reducedMotion=this.reduced;

    const titlePoint=imagePoint(g.title),title=this.art.image(this.plane,'canopy-title-'+GAME_CONFIGS.indexOf(cfg),titlePoint[0],titlePoint[1],g.title[2]*.96,g.title[3]*.94);
    title.name='Animated cabinet title · '+cfg.name;
    this.idleAccent(title,GAME_CONFIGS.indexOf(cfg)*.8,11,.35,1.5);
    this.sheen(title,title.getComponent(UITransform)!.width,title.getComponent(UITransform)!.height,GAME_CONFIGS.indexOf(cfg)*.65);
    const trimRect=g.screen,trimPoint=imagePoint(trimRect);
    const trim=ThemeFestivity.cabinet(this.plane,trimPoint[0],trimPoint[1],trimRect[2],trimRect[3],cfg.columns,this.reduced);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.playReelStop(column,column===cfg.columns-1);ambient.land(column);trim.land(column);};
    // Readouts belong to the ivory recesses already painted into the room.
    // No additional rectangular fascia obscures the material or its bevels.
    const balance=imagePoint(g.balance);
    this.art.image(this.plane,'jamboree-soft-coin',balance[0]-g.balance[2]*.39,balance[1],g.balance[3]*.95,g.balance[3]*.95);
    this.balanceLabel=text(this.plane,money(this.services.economy.balance()),balance[0]+g.balance[2]*.015,balance[1],g.balance[2]*.58,g.balance[3]*.76,50,'#442810');outlined(this.balanceLabel,'#FFF4DD',1.5);this.balanceLabel.enableWrapText=false;this.balanceLabel.overflow=Label.Overflow.SHRINK;this.balanceLabel.lineHeight=51;
    const rechargeHit=box(this.plane,'Recharge',balance[0]+g.balance[2]*.41,balance[1],116,116);
    const recharge=this.art.image(rechargeHit,'jamboree-soft-plus',0,0,60,60);bindPress(rechargeHit,recharge,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const win=imagePoint(g.win);this.winLabel=text(this.plane,'WIN  0',win[0],win[1],g.win[2]*.91,g.win[3]*.84,49,'#442810');outlined(this.winLabel,'#FFF4DD',1.5);this.winLabel.enableWrapText=false;this.winLabel.overflow=Label.Overflow.SHRINK;
    const themeIndex=GAME_CONFIGS.indexOf(cfg);

    const readoutInk='#442810';
    const readoutOutline='#FFF4DD';
    const display=(name:string,rect:Box,index:number):Node=>{
      const pos=imagePoint(rect),host=box(this.plane!,name,pos[0],pos[1],rect[2],rect[3]);
      return host;
    };
    const betPanel=display('BET display',g.bet,themeIndex*4);
    const betCaption=outlined(text(betPanel,'BET',-g.bet[2]*.30,0,g.bet[2]*.30,g.bet[3]*.80,32,readoutInk),readoutOutline,1);
    betCaption.fontFamily='Arial Black';betCaption.enableWrapText=false;betCaption.overflow=Label.Overflow.SHRINK;
    this.betLabel=outlined(text(betPanel,money(this.bet),g.bet[2]*.15,0,g.bet[2]*.60,g.bet[3]*.84,43,readoutInk),readoutOutline,1);
    this.betLabel.fontFamily='Arial Black';this.betLabel.enableWrapText=false;this.betLabel.overflow=Label.Overflow.SHRINK;
    const ctl=(rect:Box,label:string,index:number,action:()=>void):Node=>{
      const pos=imagePoint(rect);const hit=box(this.plane!,label,pos[0],pos[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset=['jamboree-premium-spin','jamboree-premium-plus','jamboree-premium-minus'][index];
      const face=this.art.image(hit,asset,0,0,rect[2],rect[3]);
      this.cabinetControls.push({index,face,alpha:opacity(face,255),enabled:true});
      if(index===0){
        // Small inset status arc: never rotate the mounted button or its hitbox.
        const activity=box(hit,'Round in progress',0,0,rect[2],rect[3]);
        const ink=activity.addComponent(Graphics);ink.lineWidth=3;ink.strokeColor=new Color('#FFF4CD');
        ink.arc(0,0,Math.min(rect[2],rect[3])*.44,.15,1.8,false);ink.stroke();
        activity.active=false;this.spinActivity=activity;
      }
      this.cabinetButtonMotion(face,rect[2],rect[3],theme,index);
      bindPress(hit,face,()=>{
        // Re-evaluate at release: a preceding tap can have started a round.
        // Locked controls must not imply success through sound or cabinet light.
        if(this.modal)return;
        const available=index===0?(this.state.kind==='idle'||this.state.kind==='retry'):
          this.state.kind==='idle'&&(index===1?this.betIndex<cfg.bets.length-1:this.betIndex>0);
        if(available){if(index!==0)this.audio.play(index===1?'bet-up':'bet-down');ambient.land(-1);}
        action();
      },[
        {depth:3,compression:.97,release:.14,jelly:.8},
        {depth:2,compression:.985,release:.14,jelly:.55},
        {depth:3,compression:.97,release:.16,jelly:1},
        {depth:3,compression:.97,release:.16,jelly:.9},
      ][theme]);return hit;
    };
    ctl(g.minus,'Decrease bet',2,()=>this.changeBet(-1));ctl(g.plus,'Increase bet',1,()=>this.changeBet(1));
    const spin=ctl(g.spin,'SPIN',0,()=>void this.spin());
    // Spin artwork carries its own recognizable arrow; a second caption below
    // the key used to straddle the console's lower gold bevel.

    const topPanel=box(this.plane,'TOP WIN display',...imagePoint(g.topWin),g.topWin[2],g.topWin[3]);
    text(topPanel,'BEST',0,g.topWin[3]*.27,g.topWin[2]*.96,g.topWin[3]*.35,24,readoutInk).enableWrapText=false;
    this.topWinLabel=outlined(text(topPanel,money(this.services.profile.current()?.biggestWin??0),0,-g.topWin[3]*.15,g.topWin[2]*.96,g.topWin[3]*.55,35,readoutInk),readoutOutline,1);
    this.topWinLabel.fontFamily='Arial';this.topWinLabel.lineHeight=43;this.topWinLabel.enableWrapText=false;this.topWinLabel.overflow=Label.Overflow.SHRINK;
    const toolbar=box(this.content!,'Safe top tools',0,this.top-77-Safe.safeTop,1000,136);
    const tool=(name:string,x:number,icon:number|string,label:string,action:()=>void):Label=>{
      // Fixed 160-unit hit areas remain separate from animated bitmap faces.
      const hit=box(toolbar,name,x,0,160,148),face=box(hit,name+' face',0,0,160,136);
      if(icon==='turbo'){
        this.art.image(face,'interfaces',-20,12,54,78,0);
        this.art.image(face,'interfaces',20,12,54,78,0);
      }else if(typeof icon==='string')this.art.image(face,icon,0,12,94,94);
      else this.art.image(face,'interfaces',0,12,82,82,icon);
      const caption=outlined(text(face,label,0,-46,166,36,29,COLORS.cream),'#15352F',3);
      caption.fontFamily='Arial Black';caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;
      bindPress(hit,face,()=>{this.audio.play('tap');action();});return caption;
    };
    tool('Back to salon',-420,9,'BACK',()=>void this.navigate('home'));
    this.autoLamp=tool('Auto spin',-210,'jamboree-premium-auto','AUTO OFF',()=>{
      if(!this.auto&&this.state.kind!=='idle'){this.toast('Finish this round before enabling Auto.');return;}
      this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');
      if(this.auto)void this.spin();
    });
    this.turboLamp=tool('Turbo speed',0,'turbo','TURBO OFF',()=>{
      if(this.state.kind!=='idle'){this.toast('Change speed after this round finishes.');return;}
      this.turbo=!this.turbo;this.updateAuto();this.toast(this.turbo?'Turbo on · Faster reel stops.':'Turbo off · Classic reel rhythm.');
    });
    this.updateAuto();
    tool('Rules',210,7,'RULES',()=>this.rules());
    this.soundLamp=tool('Audio',420,8,'SOUND ON',()=>void this.toggleSound());this.updateSound();
    const receipt=box(this.content!,'Cabinet result receipt',0,-this.top+88+Safe.safeBottom,930,114);
    const receiptFace=this.art.panel(receipt,0,0,930,114,0);
    this.hintLabel=text(receiptFace,MODES[GAME_CONFIGS.indexOf(cfg)],0,0,850,80,34,readoutInk);
    this.hintLabel.lineHeight=38;this.hintLabel.overflow=Label.Overflow.SHRINK;
    bindPress(receipt,receiptFace,()=>{if(this.state.kind==='idle')this.winDetails();});
    this.layoutPlane();
    if(this.force){this.scheduleOnce(()=>void this.spin(),1);}
  }
  private layoutPlane():void{
    if(!this.plane)return;const h=Safe.visibleHeight;
    const layout=cabinetLayout(Safe.visibleWidth,h,CABINETS[this.config.id],Safe.safeTop,Safe.safeBottom);
    this.plane.setScale(layout.scale,layout.scale,1);this.plane.setPosition(0,layout.y);

    this.content?.getChildByName('Safe top tools')?.setPosition(0,h/2-77-Safe.safeTop);
    this.content?.getChildByName('Cabinet result receipt')?.setPosition(0,-h/2+88+Safe.safeBottom);
  }
  private get bet():number{return this.config.bets[this.betIndex];}
  private refreshCabinetControls(dt:number):void{
    if(this.page!=='game'||!this.visible)return;
    const idle=this.state.kind==='idle',retry=this.state.kind==='retry';
    for(const control of this.cabinetControls){
      if(!control.face.isValid)continue;
      const enabled=control.index===0?(idle||retry):idle&&(control.index===1?this.betIndex<this.config.bets.length-1:this.betIndex>0);
      if(enabled!==control.enabled){
        control.enabled=enabled;Tween.stopAllByTarget(control.alpha);
        const target=enabled?255:control.index===0?205:145;
        if(this.reduced)control.alpha.opacity=target;
        else tween(control.alpha).to(.16,{opacity:target},{easing:'sineOut'}).start();
      }
    }
    if(this.spinActivity?.isValid){
      this.spinActivity.active=!idle&&!retry;
      if(this.spinActivity.active&&!this.reduced)this.spinActivity.angle=(this.spinActivity.angle-dt*110)%360;
      else this.spinActivity.angle=0;
    }
  }
  private changeBet(delta:number):void{
    if(this.modal)return;
    if(this.state.kind!=='idle'){this.toast('Bet is locked while the reels are moving.');return;}
    const next=Math.max(0,Math.min(this.config.bets.length-1,this.betIndex+delta));
    if(next===this.betIndex){this.toast(delta<0?'Minimum bet selected.':'Maximum bet selected.');return;}
    this.betIndex=next;if(this.betLabel)this.betLabel.string=tr(money(this.bet));if(this.hintLabel)this.hintLabel.string=tr(`BET ${money(this.bet)} selected`);
  }
  private updateAuto():void{
    for(const [lamp,on,name] of [[this.autoLamp,this.auto,'AUTO'],[this.turboLamp,this.turbo,'TURBO']] as const){
      if(!lamp||!lamp.node.isValid)continue;
      lamp.string=tr(name+(on?' ON':' OFF'));lamp.color=new Color(on?'#BFF5CF':'#FFF4D8');
      Tween.stopAllByTarget(lamp.node);lamp.node.setScale(1,1,1);
    }
  }
  private updateSound(enabled=this.services.profile.current()?.settings.sound??true):void{if(this.soundLamp){this.soundLamp.string=tr(enabled?'SOUND ON':'SOUND OFF');this.soundLamp.color=new Color(enabled?'#FFF4D8':'#D8B79A');}}
  private async toggleSound():Promise<void>{
    const settings=this.services.profile.current()?.settings;if(!settings){this.toast('Sound settings are unavailable.');return;}
    const previous=settings.sound,next=!previous;this.audio.setEffects(next);this.audio.setMusic(next);this.updateSound(next);if(next)this.audio.play('tap');
    const saved=await this.services.profile.updateSettings({sound:next});
    if(!saved){this.audio.setEffects(previous);this.audio.setMusic(previous);this.updateSound(previous);this.toast('Sound setting could not be saved.');return;}
    this.toast(next?'Sound on.':'Sound off.');
  }
  private async spin():Promise<void>{
    const roundBet=this.bet;
    if(this.page!=='game'||!this.reels||this.modal||this.busy)return;
    if(!complianceCurrent(this.services.save.read().compliance)){this.policyConsent();return;}

    if(this.state.kind!=='idle'&&this.state.kind!=='retry')return;
    const requestId=this.state.kind==='retry'?this.state.requestId:SecureRNG.id('salon-spin');
    const api=this.services.api;
    const recovering=this.state.kind==='retry';
    if(api){try{this.journal.begin(requestId,this.config.id,roundBet);}catch{this.toast('Unable to save the round. Free device storage, then try again.');return;}}
    if(!api&&!this.services.economy.reserveSpin(requestId,roundBet)){this.auto=false;this.updateAuto();this.toast('Not enough coins. Visit Rewards or the Coin Shop.');return;}
    if(this.winLabel)this.winLabel.string=tr('WIN  0');
    this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string=tr('Treasures in motion…');
    let settled=false;
    try{
      let result:SpinResult;
      if(api){const response=await api.spin(this.config.id,roundBet,requestId);result=response.result;this.journal.settle(requestId,result,response.balance);}
      else {
        result=this.generator.generate(this.config,roundBet,this.rng,this.force?{winTier:this.force as 'big'|'mega'|'epic'}:undefined);this.force=undefined;
        if(!this.services.economy.settleSpin(requestId,result.totalWin))throw new Error('Settlement failed');
      }
      settled=true;await this.reels.finishGrid(result.grid,this.turbo);this.audio.finishSpin();
      this.lastAwards=explainWins(result);this.lastAwardTotal=result.totalWin;this.lastAwardGame=this.config.id;
      this.state={kind:'presenting',result};await this.showWinningGroups(result.wins);
      if(result.featureResult)await this.presentFeature(result);
      if(result.totalWin>0)await this.presentWin(result.totalWin,isBigWin(result.totalWin,roundBet),roundBet);
      if(this.winLabel)this.winLabel.string=tr((result.totalWin>0&&result.totalWin<roundBet?'RETURN  ':'WIN  ')+money(result.totalWin));
      if(this.hintLabel)this.hintLabel.string=result.totalWin>0?this.winText(`ROUND +${exactMoney(result.totalWin)} · TAP FOR WIN DETAILS`,`本局 +${exactMoney(result.totalWin)} · 点击查看中奖明细`):tr(MODES[GAME_CONFIGS.indexOf(this.config)]);
      this.state={kind:'idle'};this.refreshBalance();this.refreshTopWin();this.autoWait=this.turbo?.4:.8;
    }catch(error){
      this.auto=false;this.updateAuto();console.error(error);
      if(settled){this.closeModal();this.state={kind:'idle'};this.reels.show(this.config.reelStrips.flatMap(s=>s.slice(0,this.config.rows)));this.refreshBalance();this.toast('Your round is settled and your coins are safe. You can spin again.');}
      else if(api){
        this.reels.show(this.config.reelStrips.flatMap(s=>s.slice(0,this.config.rows)));
        if(!recovering&&error instanceof ApiRequestError&&error.definitive){this.journal.reject(requestId);this.state={kind:'idle'};this.toast(error.message);}
        else{this.state={kind:'retry',requestId};this.toast('Round saved. Reconnect and tap SPIN to retrieve the same round, with no second bet.');}
      }
      else{this.services.economy.cancelReservation(requestId);this.state={kind:'idle'};this.reels.show(this.config.reelStrips.flatMap(s=>s.slice(0,this.config.rows)));this.toast('Round interrupted. Your wallet has been preserved.');}
    }
  
    this.audio.finishSpin();
}
  private async presentFeature(result:SpinResult):Promise<void>{
    const feature=result.featureResult!;const reels=this.reels!;
    if(feature.type==='golden-hour'){
      const panel=this.sheet('The three golden vaults',780);
      text(panel,'Choose a vault to reveal your treasure',0,190,850,91,39);
      text(panel,'The prize is already drawn. Your choice does not change the odds.',0,-231,851,120,31);
      await new Promise<void>(resolve=>{
        let chosen=false;
        const reveal=(i:number):void=>{
          if(chosen)return;chosen=true;this.audio.play('win');
          const award=feature.pickAwards?.[i]??feature.totalCredits;
          text(panel,money(award)+' COINS',0,-127,850,106,56,COLORS.gold,true);
          this.scheduleOnce(()=>{this.closeModal();resolve();},this.reduced?.15:1.3);
        };
        for(let i=0;i<3;i++){
          const hit=box(panel,'Open vault '+(i+1),(i-1)*278,26,240,270);
          const treasure=this.art.image(hit,symbolAtlas(this.config.id),0,0,237,237,SYMBOL_ART.safe);bindPress(hit,treasure,()=>reveal(i));
        }
        // A feature cannot be dismissed before revealing its already-settled award.
        panel.getChildByName('Close dialog')!.active=false;
        if(this.auto)this.scheduleOnce(()=>reveal(1),.8);
      });return;
    }
    if(feature.type==='jade-respin'){
      const initial:Record<number,number>={};const first=feature.rounds[0]?.locked??{};
      result.grid.forEach((id,i)=>{if(id===this.config.bonusId)initial[i]=first[i]??0;});
      reels.lockCoins(initial);await this.delay(.65);
    }
    let cumulative=result.baseWin;
    for(const round of feature.rounds){
      if(this.hintLabel)this.hintLabel.string=tr(feature.type==='ruby-cascade'?`CROWN CASCADE · ${round.multiplier}×`:feature.type==='jade-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`PEARL WILD · ${round.index} OF ${feature.rounds.length}`);
      if(feature.type==='ruby-cascade')await reels.collapseTo(round.grid,round.removed??[]);
      else{reels.begin();this.audio.play('spin');await reels.finishGrid(round.grid,true);this.audio.finishSpin();}
      if(round.locked)reels.lockCoins(round.locked);
      if(round.expandedColumn!==undefined)await reels.expandColumn(round.expandedColumn);
      await this.showWinningGroups(round.wins,round.multiplier??1);
      cumulative+=round.credits;if(this.winLabel)this.winLabel.string=tr('WIN  '+money(cumulative));
      if(round.credits>0)this.audio.play('win');
      await this.delay(round.credits>0?.62:.22);
    }
  }
  private winText(en:string,zh:string):string{return language().startsWith('zh')?zh:en;}
  private async showWinningGroups(wins:readonly WinResult[],multiplier=1):Promise<void>{
    const paid=wins.filter(w=>w.credits>0&&w.positions.length>0);
    // A bounded preview keeps multi-line rounds responsive; every award is reviewable.
    for(const win of paid.slice(0,3)){
      this.reels?.highlight(win.positions,win.kind==='line');
      if(this.hintLabel)this.hintLabel.string=winCaption(this.config,win,language().startsWith('zh'))+(multiplier>1?` · ${multiplier}×`:'');
      this.audio.play('win');await this.delay(this.turbo?.7:1.15);
    }
    if(paid.length>1)this.reels?.highlight(paid.flatMap(w=>[...w.positions]));
    if(!paid.length)this.reels?.highlight([]);
  }
  private winDetails(index=0):void{
    if(this.state.kind!=='idle')return;
    this.auto=false;this.updateAuto();
    if(this.lastAwardGame!==this.config.id||!this.lastAwards.length){this.toast(this.winText('No winning round to review yet.','暂无可查看的中奖记录。'));return;}
    const entry=this.lastAwards[index],w=entry.win,c=this.config,s=this.sheet(this.winText('LAST ROUND · WIN DETAILS','本局中奖明细'),1480);
    s.name='Win review dialog';for(const child of s.children){const label=child.getComponent(Label);if(label)label.color=new Color(COLORS.gold);}
    text(s,this.winText(`TOTAL +${exactMoney(this.lastAwardTotal)} · ${index+1} / ${this.lastAwards.length}`,`合计 +${exactMoney(this.lastAwardTotal)} · ${index+1} / ${this.lastAwards.length}`),0,525,850,65,37,COLORS.gold,true);
    text(s,entry.round?this.winText(`BONUS ROUND ${entry.round} · ${entry.multiplier}×`,`奖励第 ${entry.round} 轮 · ${entry.multiplier}×`):this.winText('INITIAL SPIN','初始盘面'),0,447,850,55,30);
    const board=box(s,'Settled winning positions',0,100,770,570),cw=750/c.columns,ch=Math.min(112,550/c.rows),g=board.addComponent(Graphics);
    entry.grid.forEach((id,p)=>{const x=(Math.floor(p/c.rows)-(c.columns-1)/2)*cw,y=((c.rows-1)/2-p%c.rows)*ch,won=w.positions.includes(p);g.fillColor=new Color('#243F37');g.roundRect(x-cw*.46,y-ch*.46,cw*.92,ch*.92,12);g.fill();const icon=this.art.image(board,symbolAtlas(c.id),x,y,Math.min(cw,ch)*.84,Math.min(cw,ch)*.84,SYMBOL_ART[id]);opacity(icon,w.positions.length&&!won?90:255);});
    const outline=box(board,'Winning outlines',0,0,770,570).addComponent(Graphics);outline.strokeColor=new Color('#FFE6A0');outline.lineWidth=5;
    for(const p of w.positions){const x=(Math.floor(p/c.rows)-(c.columns-1)/2)*cw,y=((c.rows-1)/2-p%c.rows)*ch;outline.roundRect(x-cw*.46,y-ch*.46,cw*.92,ch*.92,12);}outline.stroke();
    text(s,winCaption(c,w,language().startsWith('zh')),0,-267,850,130,38,COLORS.gold,true);
    text(s,this.winText('Outlined symbols paid this award. Review only — no additional bet or payout.','金框标出本组中奖位置。仅回看，不会再次投注或派奖。'),0,-388,835,90,29);
    this.art.button(s,'Previous award',-220,-510,400,95,this.winText('PREVIOUS','上一组'),0,()=>this.winDetails((index+this.lastAwards.length-1)%this.lastAwards.length));
    this.art.button(s,'Next award',220,-510,400,95,this.winText('NEXT','下一组'),0,()=>this.winDetails((index+1)%this.lastAwards.length));
    text(s,this.winText('Amounts are final, including the round payout limit.','金额已计入单局上限，与实际结算一致。'),0,-627,820,60,28);
  }
  private async presentWin(amount:number,big:boolean,roundBet=this.bet):Promise<void>{
    big=isBigWin(amount,roundBet);
    if(big){
      const stage=box(this.root!,'Treasure celebration',0,0,1080,this.height);this.modal=stage;stage.addComponent(BlockInputEvents);
      // Keep the integrated scene visible, but do not let cabinet readouts and
      // controls show through the transparent celebration artwork.
      const hidden=(this.plane?.children??[]).filter(n=>n.active&&!['Cabinet reflections','Reels',this.config.id+'-tall'].includes(n.name));
      for(const n of [this.content?.getChildByName('Cabinet result receipt'),this.content?.getChildByName('Safe top tools')])if(n?.active)hidden.push(n);
      const fades=hidden.map(n=>({node:n,alpha:n.getComponent(UIOpacity)??n.addComponent(UIOpacity)}));
      const prior=fades.map(f=>f.alpha.opacity);
      try{
        fades.forEach(f=>tween(f.alpha).to(this.reduced?.01:.22,{opacity:65},{easing:'sineInOut'}).start());
        await this.delay(.22);
        this.audio.playWinFanfare(amount/roundBet>=40?3:amount/roundBet>=15?2:1);
        const celebration=stage.addComponent(SalonWinStage);
        celebration.onCue=(cue)=>{
          this.audio.playWinDetail(cue==='complete'?'collect':cue==='count'?'count':'burst',cue==='count'?.5:1,1);
          if(cue==='complete')for(let i=0;i<fades.length;i++)if(fades[i].node===this.balanceLabel?.node)
            tween(fades[i].alpha).to(.3,{opacity:prior[i]},{easing:'sineOut'}).start();
        };
        const destination=this.balanceLabel?stage.getComponent(UITransform)!.convertToNodeSpaceAR(this.balanceLabel.node.worldPosition):undefined;
        await celebration.setup(this.art,amount,this.height,this.reduced,amount/roundBet,GAME_CONFIGS.indexOf(this.config),destination);
      }finally{
        this.audio.finishWinPresentation();
        fades.forEach((f,i)=>{if(f.node.isValid)tween(f.alpha).to(this.reduced?.01:.3,{opacity:prior[i]},{easing:'sineInOut'}).start();});
        if(this.modal===stage)this.closeModal();
      }
    }else{
      this.audio.playSmallWinJingle();const label=this.winLabel;
      const g=CABINETS[this.config.id],screen=imagePoint(g.screen);
      const theme=GAME_CONFIGS.indexOf(this.config);
      const banner=this.art.rewardPanel(this.plane!,screen[0],screen[1]-g.screen[3]/2+120,Math.min(680,g.screen[2]-24),204,theme,'compact');banner.name='Ordinary win celebration';
      const badge=this.art.image(banner,symbolAtlas(this.config.id),-230,0,134,134,[8,14,7,2][GAME_CONFIGS.indexOf(this.config)]);this.sheen(badge,108,108,.1);
      text(banner,amount/roundBet>=5?'NICE WIN':'WIN',55,49,370,60,38,rewardInk(theme),true);
      const total=outlined(text(banner,'0',55,-30,370,94,money(amount).length>9?48:68,rewardInk(theme),false),rewardOutline(theme),1);
      this.reveal(banner);if(!this.reduced){tween(badge).to(.3,{scale:new Vec3(1.16,1.16,1)},{easing:'backOut'}).to(.4,{scale:new Vec3(1,1,1)}).start();
        for(let i=0;i<8;i++){const spark=this.art.light(banner,3,(i%2?1:-1)*(225+i*9),(i-4)*18,50,50,190);tween(spark).by(.65,{position:new Vec3((i%2?1:-1)*45,65,0),angle:90}).start();tween(opacity(spark,190)).to(.85,{opacity:0}).start();}}
      try{if(this.reduced){total.string=tr(money(amount));if(label)label.string=tr('WIN  '+money(amount));await this.delay(.8);}
      else{const v={n:0};await new Promise<void>(resolve=>tween(v).to(.85,{n:amount},{easing:'expoOut',onUpdate:()=>{if(!total.isValid)return;this.audio.playWinDetail('count',v.n/amount,0);total.string=tr(money(v.n));if(label?.isValid)label.string=tr('WIN  '+money(v.n));}}).call(()=>resolve()).start());total.string=tr(money(amount));if(label?.isValid)label.string=tr('WIN  '+money(amount));
        tween(total.node).to(.12,{scale:new Vec3(1.065,1.065,1)},{easing:'sineOut'}).to(.24,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
        for(const side of [-1,1]){const glint=this.art.light(banner,3,side*285,side*74,78,26,0);glint.name='Win amount settled glint';tween(glint.getComponent(UIOpacity)!).to(.1,{opacity:220}).to(.4,{opacity:0},{easing:'sineOut'}).start();}
        await this.delay(.65);tween(opacity(banner,255)).to(.2,{opacity:0}).start();await this.delay(.2);}}
      finally{this.audio.finishWinPresentation();if(banner.isValid&&banner.activeInHierarchy&&this.page==='game'&&this.visible)this.audio.playWinDetail('collect',1,0);if(banner.isValid)banner.destroy();}
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=tr(money(this.services.economy.balance()));}
  private refreshTopWin():void{if(this.topWinLabel)this.topWinLabel.string=money(this.services.profile.current()?.biggestWin??0);}
  private delay(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,this.reduced?Math.min(.12,seconds):seconds));}
  protected update(dt:number):void{this.refreshCabinetControls(dt);const fx=this.plane?.getChildByName('Cabinet reflections')?.getComponent(SalonAtmosphere);if(fx)fx.energy=this.state.kind==='spinning'?1:this.state.kind==='presenting'?.6:0;if(this.auto&&this.visible&&this.state.kind==='idle'&&this.page==='game'&&!this.modal){this.autoWait-=dt;if(this.autoWait<=0){this.autoWait=1;void this.spin();}}}
  private hide():void{this.visible=false;this.auto=false;this.updateAuto();}
  private show():void{this.visible=true;}
  private title(value:string,sub:string,icon:number):void{
    this.art.panel(this.content!,88,this.top-280,750,130,1);
    this.art.image(this.content!,'interfaces',-368,this.top-306,155,155,icon);
    text(this.content!,value,88,this.top-280,700,108,62,COLORS.jade,true);text(this.content!,sub,65,this.top-370,742,76,34,COLORS.jade);
  }
  // Presentation only: these tweens never change saved balances or scores.
  private reveal(n:Node,delay=0):void{if(this.reduced)return;const end=n.position.clone();n.setPosition(end.x,end.y-20,end.z);tween(n).delay(delay).to(.42,{position:end},{easing:'sineOut'}).start();const o=opacity(n,0);tween(o).delay(delay).to(.34,{opacity:255}).start();}
  private edgeJewels(parent:Node,w:number,h:number,phase=0):void{
    if(this.reduced)return;const points=[[-w*.44,h*.34],[w*.44,-h*.34],[w*.40,h*.38],[-w*.40,-h*.38]];
    points.forEach(([x,y],i)=>{const n=this.art.light(parent,3,x,y,42,42,0);n.name='Crafted edge glint';const alpha=n.getComponent(UIOpacity)!;tween(alpha).delay(phase+i*.65).to(.55,{opacity:175},{easing:'sineOut'}).to(1.1,{opacity:0},{easing:'sineInOut'}).delay(3.3).union().repeatForever().start();});
  }
  private cabinetButtonMotion(face:Node,w:number,h:number,theme:number,index:number):void{
    if(this.reduced)return;
    // Solid mounted controls do not inflate or wobble. Only the primary cap
    // catches a quiet reflection; bindPress exclusively owns its transform.
    if(index!==0)return;
    const size=face.getComponent(UITransform)!;
    const clip=box(face,'Cap-only reflection',0,0,size.width,size.height);
    const mask=clip.addComponent(Mask);mask.type=Mask.Type.SPRITE_STENCIL;
    mask.spriteFrame=face.getComponent(Sprite)!.spriteFrame;mask.alphaThreshold=.5;
    const beam=this.art.light(clip,2,-size.width,0,size.height*.32,size.height*1.3,0);
    beam.name='Polished surface reflection';beam.angle=-18;
    const alpha=beam.getComponent(UIOpacity)!;
    tween(beam).delay(1.2+theme*.7).repeatForever(tween()
      .call(()=>{beam.setPosition(-size.width,0);alpha.opacity=0;})
      .to(1.3,{}, {onUpdate:(_node,ratio)=>{
        const t=ratio??0;beam.setPosition((t*2-1)*size.width,0);
        alpha.opacity=Math.sin(t*Math.PI)*48;
      }})
      .call(()=>{alpha.opacity=0;}).delay(5.8+theme*.6)).start();
  }
  private sheen(n:Node,w:number,h:number,delay=0):void{if(this.reduced)return;const clip=box(n,'Inset metal sheen',0,0,w-12,h-12);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;const beam=this.art.light(clip,2,-w,0,h*2.2,h*2.2,38);beam.setScale(.35,1.6,1);beam.angle=-24;tween(beam).delay(delay).repeatForever(tween().to(1.6,{position:new Vec3(w,0,0)},{easing:'sineInOut'}).call(()=>beam.setPosition(-w,0)).delay(4.5)).start();}
  private breathe(n:Node,delay=0):void{if(StationaryArtwork.contains(n))return;if(StationaryArtwork.contains(n))return;if(this.reduced)return;tween(n).delay(delay).to(1.8,{angle:5},{easing:'sineInOut'}).to(3.6,{angle:-5},{easing:'sineInOut'}).to(1.8,{angle:0},{easing:'sineInOut'}).union().repeatForever().start();const origin=n.position.clone();tween(n).delay(delay).repeatForever(tween().to(2.8,{position:new Vec3(origin.x,origin.y+27,origin.z)},{easing:'sineInOut'}).to(2.8,{position:origin},{easing:'sineInOut'})).start();}
  /** Low-amplitude motion belongs to artwork; labels and hit regions stay fixed. */
  private idleAccent(n:Node,delay=0,lift=6,tilt=3,pace=1):void{if(StationaryArtwork.contains(n))return;if(StationaryArtwork.contains(n))return;
    if(this.reduced)return;const origin=n.position.clone(),angle=n.angle;
    tween(n).delay(delay).to(2.6*pace,{position:new Vec3(origin.x,origin.y+lift,origin.z),angle:angle+tilt},{easing:'sineInOut'}).to(3.4*pace,{position:new Vec3(origin.x,origin.y-lift*.3,origin.z),angle:angle-tilt},{easing:'sineInOut'}).to(2.6*pace,{position:origin,angle},{easing:'sineInOut'}).union().repeatForever().start();
  }
  private festivalDrift(stage:Node):void{
    if(this.reduced)return;
    // Two narrow peripheral lanes keep gold dust clear of headings and controls.
    const layer=box(stage,'Festival idle margins',0,0,1020,1400);layer.setSiblingIndex(0);
    for(let i=0;i<10;i++){
      const side=i%2?1:-1,x=side*(476+(i%3)*9),y=-520+(i%5)*218;
      const n=this.art.light(layer,3,x,y,25+(i%3)*9,25+(i%3)*9,0);n.name='Drifting festival spark';const o=n.getComponent(UIOpacity)!;
      tween(n).delay(i*.43).to(4.4,{position:new Vec3(x-side*13,y+76,0),angle:80},{easing:'sineInOut'}).to(4.4,{position:new Vec3(x,y,0),angle:0},{easing:'sineInOut'}).union().repeatForever().start();
      tween(o).delay(i*.43).to(1.6,{opacity:190},{easing:'sineInOut'}).to(2.8,{opacity:35},{easing:'sineInOut'}).union().repeatForever().start();
    }
    for(let i=0;i<4;i++){
      const x=(i%2?1:-1)*481,y=i<2?346:-347,n=this.art.image(layer,'symbols',x,y,34,34,0);n.name='Idle margin gold';this.idleAccent(n,i*1.1,12,9);this.edgeJewels(n,28,28,i);
    }
  }
  private count(label:Label,total:number,from=0,suffix=''):void{Tween.stopAllByTarget(label);if(this.reduced){label.string=tr(money(total)+suffix);return;}tween(label).to(.85,{}, {onUpdate:(_target,ratio)=>{if(label.isValid)label.string=tr(money(from+(total-from)*(1-Math.pow(1-(ratio??0),3)))+suffix);}}).call(()=>{if(label.isValid)label.string=tr(money(total)+suffix);}).start();}
  private rewardArrival(before:number,after:number):void{
    if(this.balanceLabel)this.count(this.balanceLabel,after,before);
    if(this.reduced||!this.root||!this.balanceLabel)return;
    const target=this.root.getComponent(UITransform)!.convertToNodeSpaceAR(this.balanceLabel.node.worldPosition);
    for(let i=0;i<9;i++){
      const start=new Vec3((i-4)*25,-110,0),control=new Vec3(start.x+(i%2?135:-135),target.y*.5+110,0);
      const coin=this.art.image(this.root,'symbols',start.x,start.y,54,54,0);coin.name='Reward arrival coin';const alpha=opacity(coin,0);
      tween(coin).delay(i*.055).to(.95,{}, {onUpdate:(_node,ratio)=>{
        const t=ratio??0,p=t*t,u=1-p,scale=1-p*.6;
        coin.setPosition(u*u*start.x+2*u*p*control.x+p*p*target.x,u*u*start.y+2*u*p*control.y+p*p*target.y);
        coin.setScale(scale*(.32+.68*Math.abs(Math.cos(t*Math.PI*3+i*.4))),scale,1);coin.angle=t*95*(i%2?1:-1);
        alpha.opacity=255*Math.min(1,t*9,(1-t)*12);
      }}).call(()=>coin.destroy()).start();
    }
    for(const side of [-1,1]){
      const glint=this.art.light(this.root,3,target.x+side*130,target.y+side*41,116,27,0);glint.name='Wallet arrival glint';
      tween(glint.getComponent(UIOpacity)!).delay(.84).to(.14,{opacity:220}).to(.55,{opacity:0},{easing:'sineOut'}).call(()=>glint.destroy()).start();
    }
  }
  private storePage():void{
    const stage=this.pageStage('Royal treasury boutique');text(stage,'THE TREASURE EMPORIUM',0,627,910,84,41,COLORS.ink,true);
    text(stage,'Treasures fit for a royal celebration',0,552,910,55,30,COLORS.ink);
    const stamp=this.generation;void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;
      items.forEach((item,i)=>{
        const x=i%2?239:-239,y=i<2?283:-145;
        const plinth=this.art.panel(stage,x,y,444,382,0);plinth.name='Royal treasure offer '+i;
        const hero=this.art.image(plinth,'symbols',0,72,190,171,[9,5,11,1][i]);this.idleAccent(hero,i*.6,6,0,2.5);this.edgeJewels(hero,152,139,i*.7);
        const amount=text(plinth,'',0,-50,340,60,37,COLORS.ink,true);this.count(amount,item.credits+item.bonus,0,' COINS');
        this.art.button(plinth,'Buy '+item.id,0,-127,370,80,item.available?item.displayPrice:'Unavailable',1,()=>void this.purchase(item.id),3);
      });
    }).catch(()=>this.toast('Shop unavailable. Please try again.'));
    text(stage,'Virtual coins for your royal games',0,-405,890,55,29,COLORS.ink);
    this.art.button(stage,'Synchronize purchases',0,-530,823,106,'Restore purchases',13,()=>void this.restorePurchases(),0);
  }

  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}catch{this.toast('Unable to connect. Please try again.');}finally{this.busy=false;}}
  private async restorePurchases():Promise<void>{
    if(this.busy)return;this.busy=true;
    try{const r=await this.services.store.restore();this.refreshBalance();this.toast(r.message);}
    catch{this.toast('Unable to restore purchases. Please try again.');}
    finally{this.busy=false;}
  }
  private rewardsPage():void{
    const stage=this.pageStage('Golden harvest calendar');text(stage,'SEVEN DAYS OF GOLD',0,626,900,84,44,COLORS.ink,true);
    const progress=this.services.save.currentScope()?.checkIn,today=new Date().toISOString().slice(0,10),claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);
    text(stage,'DAY '+(active+1)+(claimed?' · COLLECTED':' · READY TO CLAIM'),0,550,900,58,31,COLORS.ink);
    const display=this.art.panel(stage,0,160,947,645,0);display.name='Royal gift display';
    this.services.checkIn.rewards.forEach((amount,i)=>{
      const x=i<3?(i-1)*290:i<6?(i-4)*290:0,y=i<3?355:i<6?150:-40,done=i<active||(i===active&&claimed),current=i===active;
      const tile=this.art.panel(stage,x,y,242,185,current?3:0);tile.name='Check-in day '+(i+1);const ink=COLORS.ink;
      text(tile,'DAY '+(i+1),0,47,170,32,28,ink);const gift=this.art.image(tile,done?'interfaces':'symbols',0,5,62,62,done?14:i===6?11:0);this.idleAccent(gift,i*.5,4,.4,1.8);
      text(tile,money(amount),0,-28,168,30,27,ink,true);text(tile,done?'CLAIMED':current?'TODAY':'LOCKED',0,-51,166,25,22,ink);
      if(current&&!claimed)this.sheen(gift,66,68,.6);bindPress(tile,tile,()=>{if(current&&!claimed)void this.claim('check-in');else this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Available on a later day'));});
    });
    const prize=this.art.image(stage,'prize-golden-hour',-300,-271,233,221);this.idleAccent(prize,0,7,.3,1.7);
    text(stage,claimed?'TODAY’S HARVEST SAVED':'YOUR NEXT GOLDEN GIFT',135,-209,605,62,30,COLORS.ink,true);
    this.art.button(stage,'Check in',135,-305,613,115,claimed?'DAY '+(active+1)+' · COLLECTED':'CLAIM DAY '+(active+1)+' · '+money(this.services.checkIn.rewards[active]),14,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next reward after 00:00 UTC.');},3);
    const daily=this.art.panel(stage,0,-504,927,244,0);const chest=this.art.image(daily,'symbols',-317,0,166,166,5);this.idleAccent(chest,0,7,.3,1.8);text(daily,'DAILY CHEST · 5,000',108,55,580,55,34,COLORS.ink,true);
    this.art.button(daily,'Claim daily',107,-45,587,94,this.services.save.currentScope()?.claims['daily-free:'+today]?'Gift collected':'Collect daily chest',2,()=>void this.claim('daily'),3);
  }

  private async claim(kind:'daily'|'check-in'):Promise<void>{if(this.busy)return;this.busy=true;const before=this.services.economy.balance();try{
    let ok=false;
    if(this.services.api){await this.services.api.claimReward(kind);const me=await this.services.api.me();this.services.economy.synchronizePurchasedBalance(me.player.credits,SecureRNG.id('reward-sync'));ok=this.services.economy.balance()>before;}
    else{const today=new Date().toISOString().slice(0,10);ok=kind==='daily'?this.services.store.claimDaily(today):this.services.checkIn.claimToday(today).ok;}
    const after=this.services.economy.balance();
    if(ok&&after>before){this.audio.play('reward');if(this.page==='rewards')this.render();this.rewardArrival(before,after);this.toast('+'+money(after-before)+' coins · Added to your wallet');}
    else{this.refreshBalance();this.toast('Today’s gift has already been collected.');}
  }catch{this.refreshBalance();this.toast('Unable to collect. Please try again.');}finally{this.busy=false;}}
  private rankPage():void{
    const stage=this.pageStage('Royal honours');
    text(stage,'THE GOLDEN HONOUR ROLL',0,629,930,84,40,COLORS.ink,true);
    text(stage,'TOTAL WON',0,548,910,46,25,COLORS.ink);
    const stamp=this.generation;const render=(players=this.services.rank.list('all-time',this.services.profile.current())):void=>{if(stamp!==this.generation)return;
      const profile=this.services.profile.current();
      if(profile&&!players.some(p=>p.current))players=[...players,{rank:players.length+1,nickname:profile.nickname,winnings:profile.totalWin,avatar:profile.avatar,current:true}];
      const ranked=hallStandings(players),current=ranked.find(p=>p.current),visible=ranked.slice(0,8);
      // Keep the player's actual mixed rank visible even when outside the first six.
      if(current&&!visible.some(p=>p.current))visible[7]=current;
      visible.slice(0,3).forEach((r,i)=>{
        const x=[0,-309,309][i],y=i===0?337:302;
        const dais=this.art.panel(stage,x,y,284,340,0);dais.name='Royal podium '+r.rank;
        const face=this.art.image(dais,'portraits',0,30,130,130,r.avatar);this.idleAccent(face,i*.7,5,0,2.6);this.edgeJewels(face,110,110,i*.4);
        text(dais,'#'+r.rank,0,115,190,34,30,COLORS.ink,true);
        text(dais,r.nickname,0,-40,220,54,29,COLORS.ink,true,true).enableWrapText=false;
        this.count(text(dais,'',0,-95,216,51,34,COLORS.ink,true),r.winnings);
        text(dais,r.current?'YOU':'',0,-136,211,34,24,COLORS.ink);
      });
      visible.slice(3).forEach((r,i)=>{const row=this.art.panel(stage,0,28-i*114,916,103,r.current?3:0),ink=COLORS.ink;row.name=r.current?'Your hall rank':'Hall rank '+r.rank;text(row,'#'+r.rank,-302,0,94,50,35,ink);const face=this.art.image(row,'portraits',-207,0,73,73,r.avatar);text(row,r.nickname,4,r.current?13:0,296,36,30,ink,false,true).enableWrapText=false;text(row,r.current?'YOU':'',4,-19,296,23,21,ink);this.idleAccent(face,i*.7,3,0,2.8);text(row,money(r.winnings),269,0,172,46,32,ink).enableWrapText=false;this.reveal(row,i*.1);});
      const disclosure=this.art.panel(stage,0,-529,890,70,1);
      text(disclosure,'Includes simulated competitors',0,0,840,48,30,COLORS.ink);
      this.art.button(stage,'Explore games',0,-640,838,101,'Grow your next record',6,()=>void this.navigate('home'),3);
    };
    if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load honours.'));else render();
  }

  private profilePage():void{
    const stage=this.pageStage('Royal member passport'),p=this.services.profile.current();if(!p)return;
    text(stage,'YOUR TREASURE PASSPORT',0,628,940,83,41,COLORS.ink,true);
    const face=this.art.image(stage,'portraits',-286,417,278,278,p.avatar);this.idleAccent(face,0,9,.4,1.8);this.edgeJewels(face,204,204);bindPress(face,face,()=>this.avatars());
    text(stage,p.nickname,136,454,572,83,47,COLORS.ink,true,true).enableWrapText=false;text(stage,p.isGuest?'TREASURE GUEST':'JAMBOREE MEMBER',136,376,572,51,28,COLORS.ink);
    this.art.button(stage,'Edit nickname',136,310,470,78,'Edit nickname',7,()=>this.editNickname(),0);
    const stats=this.art.panel(stage,0,181,915,176,0);[p.totalWin,p.biggestWin].forEach((v,i)=>{text(stats,i?'TOP WIN':'TOTAL WON',i?213:-213,23,300,34,27,COLORS.ink);const amount=text(stats,'',i?213:-213,-23,300,49,40,COLORS.ink,true);amount.enableWrapText=false;this.count(amount,v);});
    const links:[string,number,()=>void][]=[['Choose portrait',4,()=>this.avatars()],['Coin ledger',1,()=>this.history()],['Privacy & help',7,()=>this.legal('privacy')],['Sign out',9,()=>void this.signOut()]];
    links.forEach(([label,icon,action],i)=>{const tile=this.art.panel(stage,0,-12-i*122,892,107,0);tile.name=label;const symbol=this.art.image(tile,'interfaces',-342,0,74,74,icon);const caption=text(tile,label,0,0,570,72,33,COLORS.ink);caption.lineHeight=35;bindPress(tile,symbol,action);});
    this.art.button(stage,'Language selector',-225,-478,430,86,'Language',7,()=>this.languages(),0);
    this.art.button(stage,'Music credits',225,-478,430,86,'Music credits',7,()=>window.dispatchEvent(new Event('game-music-credits')),0);
    this.art.button(stage,'Delete account',0,-591,682,87,'Delete account',15,()=>this.deleteAccount(),2);
  }

  private editNickname():void {
    if(this.busy)return;
    const player=this.services.profile.current();if(!player)return;
    const panel=this.sheet('Edit nickname',650);let value=player.nickname;
    text(panel,'Use 2–18 characters',0,157,680,56,32,COLORS.cream);
    this.field(panel,'Nickname',42,value,v=>value=v);
    const error=text(panel,'',0,-55,710,68,29,COLORS.cream);
    this.art.button(panel,'Save nickname',0,-191,710,106,'Save nickname',14,()=>{
      if(this.busy)return;
      const nickname=value.trim();
      if(nickname.length<2||nickname.length>18||/[\u0000-\u001f\u007f]/.test(nickname)){error.string=tr('Use 2–18 characters');return;}
      this.busy=true;
      void this.services.profile.setNickname(nickname).then(ok=>{
        if(!ok){if(error.isValid)error.string=tr('Nickname could not be saved.');return;}
        this.closeModal();this.render();this.toast('Nickname saved.');
      }).catch(()=>{if(error.isValid)error.string=tr('Nickname could not be saved.');}).finally(()=>{this.busy=false;});
    },0);
  }

  private languages():void {
    if(this.busy)return;
    const panel=this.sheet('Choose language',1010);
    LANGUAGES.forEach((entry,i)=>{const n=this.art.button(panel,'Locale '+entry.code,0,285-i*137,760,110,entry.name,entry.code===language()?14:7,()=>{setLanguage(entry.code);this.closeModal();this.render();this.toast('Language saved.');},entry.code===language()?3:0);});
    text(panel,'Saved on this device',0,-417,740,58,29,COLORS.cream);
  }

  private async signOut():Promise<void>{
    if(this.busy)return;this.services.auth.logout();this.authExpanded=false;this.draft.password=this.draft.confirmPassword='';await this.navigate('login');
  }
  private avatars():void{const s=this.sheet('Choose your portrait',1270);for(let i=0;i<16;i++){const n=this.art.image(s,'portraits',(i%4-1.5)*210,350-Math.floor(i/4)*248,183,183,i);n.name='Choose avatar '+i;if(this.services.profile.current()?.avatar===i)this.art.image(n,'interfaces',65,-65,43,43,14);bindPress(n,n,()=>void this.selectPortrait(n,i));}}
  private async selectPortrait(portrait:Node,index:number):Promise<void>{
    if(this.busy)return;this.busy=true;const generation=this.generation;
    try{
      if(!await this.services.profile.setAvatar(index)){this.toast('Portrait could not be saved.');return;}
      this.audio.play('win');
      if(portrait.isValid&&!this.reduced){
        tween(portrait).to(.14,{scale:new Vec3(1.09,1.09,1)},{easing:'sineOut'}).to(.22,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
        for(const side of [-1,1]){const glint=this.art.light(portrait,3,side*58,side*58,69,43,0);glint.name='Portrait saved glint';tween(glint.getComponent(UIOpacity)!).to(.1,{opacity:230}).to(.26,{opacity:0}).call(()=>glint.destroy()).start();}
        await this.delay(.38);
      }
      if(generation===this.generation&&this.page==='profile')this.render();
      this.toast('Portrait saved to your account.');
    }catch{this.toast('Portrait could not be saved. Please try again.');}
    finally{this.busy=false;}
  }
  private history():void{const s=this.sheet('Your coin ledger',1190);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,394-i*132,840,115,1);text(n,r.type.replace(/-/g,' '),-120,0,280,48,29,COLORS.jade);const amount=text(n,(r.amount>0?'+':'')+exactMoney(r.amount),190,0,220,48,34,COLORS.ink);amount.enableWrapText=false;});if(!rows.length){const icon=this.art.image(s,'interfaces',0,156,220,220,1);this.idleAccent(icon,0,7,.3,1.5);text(s,'Your coin ledger is ready',0,-20,820,90,40,COLORS.gold,true);text(s,'Collect a reward or play a round.\nYour coin activity will appear here.',0,-132,820,142,34);this.art.button(s,'Ledger rewards',0,-302,730,108,'Explore rewards',2,()=>{this.closeModal();void this.navigate('rewards');},0);}}
  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void {
    const panel=this.sheet('Royal mailbox',1110),items=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).deleted);
    text(panel,'Palace post · Gifts and notices',0,377,750,55,31);
    items.forEach((m,i)=>{const state=this.services.mail.state(m.id),row=this.art.panel(panel,0,230-i*210,840,177,0);
      const icon=this.art.image(row,'interfaces',-293,0,94,94,state.read?5:2);this.idleAccent(icon,i*.4,3,0,1);
      text(row,m.title,45,24,540,48,31,COLORS.ink).enableWrapText=false;
      text(row,state.claimed?'Attachment collected':m.credits?money(m.credits)+' COINS':state.read?'Read':'Unread',45,-27,530,42,28,COLORS.ink);
      bindPress(row,icon,()=>this.openMail(m.id));row.name='Mail item '+m.id;
    });
    if(!items.length)text(panel,'Your mailbox is empty',0,90,740,110,39);
    this.art.button(panel,'Claim all mail',-200,-391,390,100,'Collect all',14,()=>{if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}const amount=this.services.mail.claimAll();this.render();this.mail();this.toast(amount?money(amount)+' coins collected':'No attachments to collect');},0);
    this.art.button(panel,'Clear read mail',200,-391,390,100,'Clear read',9,()=>{this.services.mail.deleteRead();this.render();this.mail();},0);
    text(panel,'Unclaimed gifts are kept when clearing mail',0,-474,770,45,26);
  }
  private openMail(id:string):void {
    const item=INBOX_MESSAGES.find(m=>m.id===id);if(!item)return;
    this.services.mail.read(id);this.render();const panel=this.sheet('Royal letter',920),state=this.services.mail.state(id);
    text(panel,item.title,0,254,770,85,38,COLORS.ink,true);
    text(panel,item.body,0,112,740,160,33);
    const gift=this.art.image(panel,item.credits?'symbols':'interfaces',0,-70,140,140,item.credits?0:5);this.idleAccent(gift,0,5,0,1.5);
    text(panel,item.credits?money(item.credits)+' COINS':'Palace notice',0,-173,700,55,37);
    this.art.button(panel,'Collect mail attachment',0,-277,730,100,state.claimed?'Attachment collected':item.credits?'Collect attachment':'Back to mailbox',14,()=>{
      if(!item.credits||state.claimed){this.mail();return;}
      if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}
      if(this.services.mail.claim(id)){this.audio.play('win');this.render();this.openMail(id);this.toast(money(item.credits)+' coins collected');}
    },0);
    this.art.button(panel,'Back to mailbox',0,-383,580,76,'Back to mailbox',9,()=>this.mail(),0);
  }
  private celebration():void {
    const panel=this.sheet('TREASURE CELEBRATION',1440),today=new Date().toISOString().slice(0,10);
    text(panel,'One free treasure draw every day',0,508,770,55,32);
    const wheel=box(panel,'Celebration carousel',0,255,520,520);
    this.art.image(panel,'symbols',0,255,200,200,1);
    this.services.wheel.sectors.forEach((amount,i)=>{const angle=i*Math.PI/4,x=Math.sin(angle)*188,y=Math.cos(angle)*188;
      this.art.image(wheel,'symbols',x,y,105,105,[0,5,11,1,9,5,11,1][i]);
    });
    text(panel,'▼',0,478,64,50,43,COLORS.ink);
    const scope=this.services.save.currentScope(),used=scope?.wheel.date===today&&scope.wheel.remaining===0&&!scope.wheel.pending;
    const result=text(panel,used?'Today’s treasure collected':'1,000–25,000 virtual coins',0,-29,760,64,35);
    this.art.button(panel,'Start celebration draw',0,-140,760,108,used?'Come back tomorrow':'Open my treasure',6,()=>{
      if(this.busy||used)return;
      if(this.services.remoteMode){this.toast('Celebration rewards require the event server.');return;}
      const draw=this.services.wheel.prepare(today);if(!draw)return;
      this.busy=true;result.string=tr('Revealing your treasure…');
      // Match angular velocity at both joins: accelerate to 360 degrees/s,
      // cruise, then decelerate to rest without an abrupt high-speed start.
      const landing=1080+draw.sector*45,cruise=(landing-486)/360;
      const motionDone=new Promise<void>(resolve=>{
        if(this.reduced){wheel.angle=landing;resolve();return;}
        tween(wheel).to(.7,{angle:126},{easing:'quadIn'})
          .to(cruise,{angle:landing-360},{easing:'linear'})
          .to(2,{angle:landing},{easing:'quadOut'}).start();
        // Settlement survives closing the presentation mid-spin.
        this.scheduleOnce(resolve,.7+cruise+2);
      });
      void motionDone.then(async()=>{
        const ok=this.services.wheel.settle(draw.spinId);this.refreshBalance();
        if(ok){this.audio.play('win');if(panel.isValid){result.string=money(draw.amount)+' COINS';this.sheen(panel,790,120,0);}this.toast(money(draw.amount)+' coins collected');await this.delay(1.5);}
      }).finally(()=>{this.busy=false;if(panel.isValid)this.celebration();});
    },3);
    const played=this.services.profile.current()?.gamesPlayed??0;
    [[3,1500],[10,5000]].forEach(([target,amount],i)=>{
      const id='royal-celebration:rounds:'+target,claimed=!!this.services.save.currentScope()?.claims[id];
      const row=this.art.panel(panel,0,-323-i*159,840,137,0);this.art.image(row,'symbols',-295,0,85,85,i?1:9);
      text(row,'Play '+target+' rounds · '+Math.min(played,target)+'/'+target,14,25,490,43,30,COLORS.ink);
      text(row,claimed?'Collected':money(amount)+' COINS',14,-24,490,42,29,COLORS.ink);
      row.name='Celebration milestone '+target;bindPress(row,row,()=>{
        if(claimed){this.toast('Reward already collected');return;}
        if(played<target){this.toast('Play any royal game to advance this task');return;}
        if(this.services.remoteMode){this.toast('Celebration rewards require the event server.');return;}
        if(this.services.rewards.claim(id,amount,'achievement')){this.audio.play('win');this.refreshBalance();this.celebration();this.toast(money(amount)+' coins collected');}
      });
    });
    text(panel,'Round milestones are one-time rewards.\nDaily draw resets at 00:00 UTC.',0,-618,790,76,27);
  }
  private rules(band=0,features=false,overview=true):void{
    this.auto=false;this.updateAuto();const cfg=this.config,s=this.sheet(cfg.name+' · Rules',1480);
    s.name='Win rules dialog';for(const child of s.children){const label=child.getComponent(Label);if(label)label.color=new Color(COLORS.gold);}
    this.art.button(s,'How to win',-290,550,275,87,this.winText('HOW TO WIN','如何中奖'),0,()=>this.rules(),overview?3:0);
    this.art.button(s,'Payout rules',0,550,275,87,'PAYOUTS',0,()=>this.rules(band,false,false),!overview&&!features?3:0);
    this.art.button(s,'Feature rules',290,550,275,87,'FEATURES',2,()=>this.rules(band,true,false),!overview&&features?3:0);
    if(overview){
      const notes:Record<GameId,[string,string,string]>={
        'golden-hour':[
          this.winText('Only the middle row pays line wins. Match 3 identical symbols across all 3 reels. Top and bottom rows do not pay line wins.','只有中间一行是中奖线。3 个转轴从左至右出现相同符号才有连线奖；上、下行不算连线。'),
          this.winText('The entire bet is on this one line. WILD replaces regular symbols, not vaults. Only the highest award on the line pays.','全部投注用于这一条线。WILD 可替代普通符号，不替代宝库；同一条线只付最高奖。'),
          this.winText('3 or more Treasure Vault symbols anywhere also pay a scatter award and open a vault pick. See FEATURES for awards.','任意位置出现至少 3 个宝库，还可获得散布奖并开启宝库选择。详细金额见 FEATURES。')],
        'jade-treasury':[
          this.winText('20 fixed paths are active on every spin. Match 3, 4 or 5 consecutive symbols from the LEFTMOST reel on the same path.','每次启用 20 条固定线。同一路径从最左列开始连续出现 3、4 或 5 个相同符号即中奖。'),
          this.winText('Bet per line = total bet ÷ 20. WILD substitutes for regular symbols, not coins. Only the highest award per line pays; different lines add up.','每线投注 = 总投注 ÷ 20。WILD 替代普通符号，不替代金币。每线只付最高奖，多条中奖线累加。'),
          this.winText('6 or more gold coins anywhere start Lock & Respin. Coins do not pay regular line awards. See FEATURES for coin values and resets.','任意位置至少 6 枚金币开启锁定重转。金币不付普通连线奖。金币金额与重转重置规则见 FEATURES。')],
        'pearl-palace':[
          this.winText('No fixed lines. Match a symbol on 3 or more consecutive reels starting at the LEFTMOST reel; any row counts.','不使用固定线。从最左列开始，连续至少 3 列含相同符号即可；每列可在任意行。'),
          this.winText('Matching positions multiply: 2 × 1 × 3 = 6 ways. All-WILD ways are paid only as WILD, not again for every symbol.','每列匹配数量相乘：2 × 1 × 3 = 6 路。纯 WILD 组合仅按 WILD 支付，不再作为每种符号重复支付。'),
          this.winText('Awards use total bet ÷ 1,024 × paytable × ways, then round once per symbol. 3+ vaults anywhere award 5 bonus spins; see FEATURES.','按总投注 ÷ 1,024 × 赔率 × 路数计算，每种符号合并后四舍五入。任意 3 个以上宝库送 5 次奖励旋转，详见 FEATURES。')],
        'ruby-revel':[
          this.winText('5 or more matching symbols must touch side-to-side or up-and-down. Diagonal contact never joins a group. Groups can start anywhere.','至少 5 个相同符号上下或左右相邻才中奖。斜角不相连，中奖组可出现在任意位置。'),
          this.winText('WILD joins regular-symbol groups. Each connected group pays once using the TOTAL bet, not a line bet. Separate groups add up.','WILD 可加入普通符号组。每个相连组按总投注计奖一次，不按单线投注；不同组金额累加。'),
          this.winText('Winning cells clear and refill. Refills pay at 2× through 9×, stopping when no group wins or after 8 refills. The initial grid pays at 1×.','中奖格消除并补充。初始盘面 1×，补充盘面依次 2× 至 9×；无中奖组或完成 8 次补充后结束。')]
      };
      notes[cfg.id].forEach((note,i)=>{const y=393-i*235;text(s,`${i+1}`, -391,y,60,65,42,COLORS.gold,true);text(s,note,40,y-42,720,185,33,COLORS.cream);});
      text(s,this.winText('Gold outlines mark winners; other symbols dim. Tap the result beneath the controls to review every award and its original grid.','金框标出中奖位置，其余符号变暗。点击操作区下方的结果，可逐组回看原始盘面与结算。'),0,-360,835,144,32,COLORS.gold);
      this.art.button(s,'Last round details',0,-502,760,88,this.winText('LAST ROUND DETAILS','本局中奖明细'),0,()=>this.winDetails());
      text(s,this.winText('One bet per round; feature spins cost no extra bet.\nWins are gross returns, not profit. Round limit: ','每局只扣一次投注，奖励旋转不再扣注。\n中奖额为返还总额，不是净利润。单局上限：')+exactMoney(this.bet*cfg.maxWinMultiplier),0,-620,835,108,28,COLORS.cream);
      return;
    }
    text(s,'COIN AWARDS AT BET '+money(this.bet),0,458,820,60,35,COLORS.gold,true);
    if(features){
      const coin=(n:number)=>exactMoney(Math.round(this.bet*n*cfg.payoutScale));
      const notes:Record<GameId,[string,string,string]>={
        'golden-hour':['3+ TREASURE VAULTS · VAULT PICK','Vaults anywhere pay '+coin(1)+' coins. The pick adds one of:\n'+[1,2,3,5,8,12].map(coin).join(' · '),'Choose one of three vaults to reveal your prize.\nThe award is already drawn; choice does not change the odds.'],
        'jade-treasury':['6+ COINS · LOCK & RESPIN','Each locked coin is worth one of:\n'+[.1,.2,.4,1,2].map(coin).join(' · ')+' coins.','Start with 3 respins. A new coin resets them to 3.\nAll 15 positions filled adds '+coin(20)+' coins.\nThe feature ends after 40 rounds at most.'],
        'pearl-palace':['3+ TREASURE VAULTS · 5 BONUS SPINS','Vault awards: 3 = '+coin(1)+' · 4 = '+coin(2)+'\n5 or more = '+coin(4)+' coins.','Five included bonus spins, with one full WILD column each.\nBonus spins cannot retrigger.\nWinning ways multiply across consecutive reels from the left.'],
        'ruby-revel':['5+ NEIGHBOURS · CASCADES','Groups join horizontally or vertically, never diagonally.\nWinning symbols leave; new treasures drop in.','First awards use the payout table. Up to 8 refills follow.\nTheir multipliers rise: 2×, 3×, 4×, 5×, 6×, 7×, 8×, 9×.\nEach refill multiplies its rounded base award.'],
      };
      const note=notes[cfg.id];const prize=this.art.image(s,prizeArt(cfg.id),0,265,300,275);this.idleAccent(prize,0,6,.3,1.5);
      text(s,note[0],0,55,830,75,36,COLORS.gold,true);
      text(s,note[1],0,-83,824,163,33,COLORS.cream);
      text(s,note[2],0,-278,828,220,32,COLORS.cream);
    }else{
      const cluster=cfg.payMode==='clusters',counts=ruleCounts(cfg,band);
      const basis=cfg.payMode==='paylines'?(cfg.columns===3?'ONE CENTRE LINE':'PER WINNING LINE · 20 FIXED LINES'):cfg.payMode==='ways'?'PER SINGLE WINNING WAY':'PER CONNECTED GROUP · BEFORE CASCADES';
      text(s,basis,0,390,846,57,29,COLORS.cream);
      text(s,'SYMBOL',-262,313,277,55,28,COLORS.gold);
      const cx=(i:number)=>counts.length===1?188:20+i*148;
      counts.forEach((n,i)=>text(s,cluster?({5:'5',6:'6–7',8:'8–9',10:'10–11',12:'12–14',15:'15+'} as Record<number,string>)[n]:n+' MATCH',cx(i),313,counts.length===1?350:148,55,27,COLORS.gold));
      const symbols=cfg.symbols.filter(v=>v.tier!=='scatter'&&v.tier!=='bonus');
      symbols.forEach((sym,i)=>{const y=221-i*83;const row=this.art.image(s,'canopy-frame-1',0,y,852,76);this.art.image(row,symbolAtlas(cfg.id),-371,0,62,62,SYMBOL_ART[sym.id]);const label=text(row,sym.tier==='wild'?'WILD':sym.label,-217,0,231,65,25,COLORS.ink);label.lineHeight=29;
        counts.forEach((n,j)=>{const award=ruleAward(cfg,sym.id,n,this.bet);text(row,award===null?'—':exactMoney(award),cx(j),0,counts.length===1?330:138,57,32,COLORS.ink);});
      });
      if(cluster)this.art.button(s,'Change payout band',0,-443,776,87,band?'Show groups 5–9':'Show groups 10–25',9,()=>this.rules(band?0:1,false,false),0);
      else text(s,cfg.payMode==='ways'?'Multiple ways combine before rounding.\n1,024 is the maximum number of five-reel ways.':'Match consecutive reels from the left.\nWILD substitutes; the best result pays once per line.',0,-442,824,127,31,COLORS.cream);
    }
    text(s,'Round limit: '+exactMoney(this.bet*cfg.maxWinMultiplier)+' coins.\nVirtual coins only · No cash-out',0,-616,830,108,29,COLORS.cream);
  }
  private legal(which:LegalPage):void{
    const s=this.sheet(which==='terms'?'Terms of Service':which==='privacy'?'Privacy & Data':'Player Support',1360);
    LEGAL_SECTIONS[which].forEach((section,i)=>{const y=460-i*210;text(s,section.title,0,y,850,56,34,COLORS.gold);text(s,section.body.replace(/\n/g,' '),0,y-88,861,150,31);});
  }
  private sheet(title:string,height:number):Node{
    this.closeModal();const overlay=box(this.root!,'Modal shield',0,0,Safe.visibleWidth,Safe.visibleHeight);overlay.addComponent(BlockInputEvents);
    const dim=overlay.addComponent(Graphics);dim.fillColor=new Color(17,32,27,150);dim.rect(-Safe.visibleWidth/2,-Safe.visibleHeight/2,Safe.visibleWidth,Safe.visibleHeight);dim.fill();
    const panel=this.art.panel(overlay,0,0,978,height,2);panel.name='Parchment dialog';text(panel,title,-25,height/2-83,797,118,46,COLORS.gold,true);
    const close=this.art.button(panel,'Close dialog',413,height/2-73,95,95,'',15,()=>this.closeModal());
    close.getComponent(UITransform)!.setContentSize(152,152);
    // Preserve the sculpted frame while making both its purpose and touch target clear.
    const face=close.getChildByName('Press motion · Close dialog')?.getChildByName('Icon face')??close;
    const cross=text(face,'×',0,1,66,66,60,COLORS.cream);cross.lineHeight=66;
    if(!this.reduced){
      const alpha=opacity(overlay,0);tween(alpha).to(.2,{opacity:255}).start();
      panel.setPosition(0,-28);tween(panel).to(.32,{position:new Vec3(0,0,0)},{easing:'cubicOut'}).start();
    }
    this.audio.setModalOpen(true);this.modal=overlay;return panel;
  }
  private closeModal():void{this.audio.setModalOpen(false);if(this.modal){this.modal.active=false;this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,2);text(n,message,0,0,780,100,36,COLORS.cream);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{this.loadingCleanup?.();game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
