/* situation audio */
import {isBigWin} from '../vfx/WinPresentation';
import { StationaryArtwork } from '../vfx/StationaryArtwork';
import { LivingMascotRig } from '../vfx/LivingMascotRig';
import { OrdinaryWinStage } from '../vfx/OrdinaryWinStage';
import {LabelOutline} from 'cc';
import {cabinetToolText} from './CabinetToolText';
import {drawRulePages} from './RulePages';
import {awardCredits, awardEvidence, featureAwardEvidence, awardSummary, newcomerBenefitCaption, roundEvidence, tierRules, winTier, WIN_TIERS} from '../vfx/WinPresentation';
import {primaryRuleText} from '../math/PrimaryRuleText';
import {drawRuleHelp,helpTitle} from './RuleHelp';
import {primaryStatus,HAND_NAMES,HAND_FACTORS} from '../math/IndependentCore';
import {ruleAward,ruleAllCounts} from '../math/PaytableDisplay';
import {tr,language,setLanguage,LANGUAGES} from './Language';
import {CORE_TITLE,CORE_NOTES,CORE_DESCRIPTIONS,coreSymbols} from '../math/CoreGame';
import {SIGNATURE_TITLE,SIGNATURE_NOTES,FEATURE_PROFILES} from '../math/SignatureFeature';
import { INBOX_MESSAGES } from '../services/MailService';
import { _decorator, BlockInputEvents, Color, Component, EditBox, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SecureRNG } from '../core/SecureRNG';
import { AudioManager } from '../audio/AudioManager';
import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import { GAME_CONFIGS, SYMBOL_ART, symbolAtlas, prizeArt } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import type { GameConfig, GameId, SpinResult } from '../math/types';
import type { AuthResult } from '../services/AuthService';
import { ApiRequestError } from '../services/ProductionApiClient';
import { RemoteSpinJournal } from '../services/RemoteSpinJournal';
import { STORE_PRODUCTS } from '../services/StoreService';
import { SalonReels } from '../reels/SalonReels';
import { SalonAtmosphere } from '../vfx/SalonAtmosphere';
import { ThemeFestivity } from '../vfx/ThemeFestivity';
import { SalonCurtains } from '../vfx/SalonCurtains';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, outlined, COLORS } from './SalonArt';
import { CABINETS, CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT, imagePoint, cabinetLayout, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const exactMoney=(n:number)=>Math.floor(n).toLocaleString('en-US');
const MODES = GAME_CONFIGS.map(c=>c.modeLabel);
const money=(n:number):string=>Math.floor(n).toLocaleString('en-US');
// Keep the small cabinet record legible; account/history values retain full precision.
const topWinMoney=(n:number):string=>{
  const value=Math.floor(n),absolute=Math.abs(value);if(absolute<1000)return exactMoney(value);
  const locale=language(),units:readonly (readonly [number,string])[]=locale==='en'?[[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']]:locale==='ko'?[[1e12,'조'],[1e8,'억'],[1e4,'만']]:locale==='ja'?[[1e12,'兆'],[1e8,'億'],[1e4,'万']]:locale==='zh-TW'?[[1e12,'兆'],[1e8,'億'],[1e4,'萬']]:[[1e12,'万亿'],[1e8,'亿'],[1e4,'万']];
  const [divisor,suffix]=units.find(([size])=>absolute>=size)??[1,''],scaled=value/divisor;
  const decimals=Math.abs(scaled)>=100?0:Math.abs(scaled)>=10?1:2,factor=10**decimals;
  return String(Math.trunc(scaled*factor)/factor)+suffix;
};
@ccclass('AureliaApp')
export class AureliaApp extends Component {
  private art=new SalonArt(); private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private retiring?:Node;private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private authExpanded=false;private selectedRoute=0;private curtainClosed=false;private hallCurtains?:SalonCurtains;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
  private balanceLabel?:Label;private betLabel?:Label;private winLabel?:Label;private topWinLabel?:Label;private hintLabel?:Label;
  private presentedWin=0;private cancelWinCount?:()=>void;
  private top=960;private height=1920;private debug=false;private reduced=false;private force?:string;
  private draft={username:'',password:'',confirmPassword:'',nickname:'',acceptedTerms:false};
  private generator=new ResultGenerator();private rng=new SecureRNG();private audio!:AudioManager;
  private journal!:RemoteSpinJournal;
  protected onLoad():void {
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
    const runtime=globalThis as typeof globalThis&{__AURELIA_API_URL__?:string};
    this.services=new GameBootstrap(undefined,false,runtime.__AURELIA_API_URL__);
    this.journal=new RemoteSpinJournal(this.services.save);
    const loading=box(this.node,'Loading',0,0,1080,1920);
    const g=loading.addComponent(Graphics);g.fillColor=new Color('#EACCB2');g.rect(-1500,-2000,3000,4000);g.fill();
    text(loading,'HONEY PARADE',0,90,950,160,80,COLORS.gold,true);
    const progress=text(loading,'Preparing the honey festival…',0,-70,950,100,38);
    try{
      await this.art.load([...GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),symbolAtlas(c.id)+'-blur',prizeArt(c.id)]),'theatre-front','theatre-velvet','salon','symbols','interfaces','portraits','symbols-blur','celebration','optics','apple-mark','harvest-brand',...Array.from({length:16},(_,i)=>'harvest-button-'+i),'harvest-hall-soft',...Array.from({length:4},(_,i)=>'harvest-soft-plate-'+i),'harvest-rank','harvest-profile','harvest-rewards','harvest-store',...Array.from({length:4},(_,i)=>'harvest-card-'+i)],(n,t)=>{
        progress.string=`Preparing treasures  ${Math.round(n/t*100)}%`;
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
      if(this.debug&&this.page==='game'&&query.get('awardPreview'))this.previewAwardStyle(query.get('awardPreview')!);
      globalThis.dispatchEvent?.(new Event('aurelia-app-ready'));
    }catch(error){progress.string='Could not open the festival. Tap to retry.';loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
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
    this.cancelWinCount?.();this.presentedWin=0;
    this.audio.setModalOpen(false);this.generation++;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.topWinLabel=this.hintLabel=this.autoLamp=this.soundLamp=undefined;
    const previous=this.root;if(previous){const a=opacity(previous,255);Tween.stopAllByTarget(a);a.opacity=255;for(const edit of previous.getComponentsInChildren(EditBox))edit.enabled=false;}
    if(this.retiring&&this.retiring!==previous)this.retiring.destroy();this.retiring=previous;
    this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Honey-Parade-interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='home'?'harvest-hall-soft':this.page==='rank'?'harvest-rank':this.page==='profile'?'harvest-profile':this.page==='rewards'?'harvest-rewards':this.page==='store'?'harvest-store':'salon';
    this.bg=this.page==='game'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);

    if(this.page!=='game'){const ambient=box(root,'Atmosphere',0,0,Safe.visibleWidth,this.height).addComponent(SalonAtmosphere);ambient.setup(this.art,Safe.visibleWidth,this.height,false,this.page==='login'||this.page==='register'?30:18);ambient.reducedMotion=this.reduced;}
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
  private async navigate(page:Page,config?:GameConfig):Promise<void>{
    if(this.state.kind!=='idle'&&this.page==='game'){this.toast('Finish the current round before leaving.');return;}
    if(this.busy)return;this.busy=true;this.auto=false;this.updateAuto();
    let loading:Node|undefined;
    try{
      if(config){loading=this.gameLoading(config);await Promise.all([this.art.load([config.id+'-tall'],(done,total)=>this.loadingProgress?.(done/total*.8,'Preparing your game…')),this.delay(this.reduced?.15:.85)]);}

      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(.9,'Opening your game…');}if(!this.reduced)await this.delay(.4);
      if(loading){this.loadingProgress?.(1,'Ready');await this.delay(this.reduced?.01:.25);await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.32,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.busy=false;}
  }
  private gameLoading(config:GameConfig):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);
    this.art.cover(n,'harvest-hall-soft',0,0,Safe.visibleWidth,this.height);
    const veil=box(n,'Loading warm veil',0,0,Safe.visibleWidth,this.height).addComponent(Graphics);veil.fillColor=new Color(255,238,211,228);veil.rect(-Safe.visibleWidth/2,-this.height/2,Safe.visibleWidth,this.height);veil.fill();
    const stage=box(n,'Theme loading stage',0,0,940,1260);const scale=Math.min(1,(Safe.visibleWidth-110)/940,(this.height-240)/1260);stage.setScale(scale,scale,1);
    const poster=this.art.cover(stage,'harvest-card-'+GAME_CONFIGS.indexOf(config),0,140,690,690,-1,38);this.idleAccent(poster,0,8,0);
    text(stage,config.name,0,-280,900,105,57,COLORS.ink,true);
    const status=text(stage,'Preparing your game…',0,-377,850,76,36,COLORS.ink);
    for(let i=0;i<3;i++){const coin=this.art.image(stage,'symbols',(i-1)*94,-567,54,54,0);coin.name='Loading coin';this.idleAccent(coin,i*.18,19,6);if(!this.reduced)tween(coin).delay(i*.17).to(.42,{scale:new Vec3(.7,1,1)}).to(.42,{scale:new Vec3(1,1,1)}).union().repeatForever().start();}
    const rail=box(stage,'Gold loading track',0,-467,690,42).addComponent(Graphics);
    rail.fillColor=new Color('#B7803D');rail.roundRect(-345,-21,690,42,21);rail.fill();rail.fillColor=new Color('#65412E');rail.roundRect(-339,-15,678,30,15);rail.fill();
    const fill=box(stage,'Loading bar fill',0,-467,678,30).addComponent(Graphics);
    const percentage=text(stage,'0%',0,-514,250,42,28,COLORS.ink);percentage.node.name='Loading percentage';
    const progress={value:0};let target=0;
    const draw=()=>{if(!n.isValid)return;fill.clear();const width=674*progress.value;if(width>1){fill.fillColor=new Color('#E9AC43');fill.roundRect(-337,-13,width,26,Math.min(13,width/2));fill.fill();if(width>8){fill.fillColor=new Color('#FFE9AD');fill.roundRect(-334,2,width-6,8,4);fill.fill();}}percentage.string=Math.round(progress.value*100)+'%';};
    this.loadingProgress=(value,caption)=>{target=Math.max(target,Math.min(1,value));status.string=caption;Tween.stopAllByTarget(progress);if(this.reduced){progress.value=target;draw();}else tween(progress).to(.22,{value:target},{easing:'sineOut',onUpdate:draw}).start();};
    draw();
    return n;
  }
  private header():void{
    const p=this.services.profile.current(),y=this.top-92-Safe.safeTop;
    const wallet=this.art.panel(this.content!,-235,y,525,107,2);
    this.art.image(wallet,'symbols',-194,0,70,70,0);
    this.balanceLabel=text(wallet,money(this.services.economy.balance()),-4,0,298,76,46,COLORS.cream);
    const topup=this.art.image(wallet,'harvest-button-2',202,0,74,74);topup.name='Top up';bindPress(topup,topup,()=>void this.navigate('store'));
    const mailboxButton=this.art.button(this.content!,'Mail',95,y,87,87,'',5,()=>this.mail());const unreadMail=INBOX_MESSAGES.filter(m=>{const state=this.services.mail.state(m.id);return !state.read&&!state.deleted;}).length;if(unreadMail)text(mailboxButton,String(unreadMail),33,33,40,40,27,COLORS.cream,true);
    const avatar=this.art.image(this.content!,'portraits',431,y,109,109,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    outlined(text(this.content!,p?.nickname??'Guest',266,y,208,69,27,COLORS.cream),'#173F49',2);
  }
  private navigation():void{
    const nav=this.art.panel(this.content!,0,-this.top+96+Safe.safeBottom,1050,174,2);
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Shop','Gifts','Parade','Honours','Account'],icons=[1,2,6,3,4];
    pages.forEach((page,i)=>{
      const center=i===2,active=page===this.page;
      const hit=box(nav,labels[i],(i-2)*205,center?18:0,190,150);
      if(active)this.art.light(hit,1,0,21,155,140,90).setSiblingIndex(0);
      const icon=this.art.image(hit,'interfaces',0,center?23:16,center?135:86,center?123:86,icons[i]);
      text(hit,labels[i],0,center?-54:-40,183,44,26,active?COLORS.gold:COLORS.cream);
      this.idleAccent(icon,i*.65,5,3);bindPress(hit,icon,()=>void this.navigate(page));
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
    const stage=this.pageStage('Parade main stage'),i=this.selectedRoute,cfg=GAME_CONFIGS[i];
    ThemeFestivity.hall(stage,1020,1400,this.reduced);
    const brand=this.art.image(stage,'harvest-brand',0,645,820,254);brand.name='Hall title';
    if(!this.reduced)tween(brand).by(3.8,{position:new Vec3(0,7,0)},{easing:'sineInOut'}).by(3.8,{position:new Vec3(0,-7,0)},{easing:'sineInOut'}).union().repeatForever().start();this.sheen(brand,565,147);
    const mount=this.art.panel(stage,0,91,720,758,0);mount.name='Framed festival mount';mount.setScale(.92,.92,1);
    if(!this.reduced){for(const side of [-1,1]){const light=this.art.light(stage,2,side*300,150,520,1100,24);light.name='Slow theatre spotlight';light.setSiblingIndex(0);light.angle=side*19;const alpha=light.getComponent(UIOpacity)!;tween(light).to(4.8,{angle:side*7},{easing:'sineInOut'}).to(4.8,{angle:side*19},{easing:'sineInOut'}).union().repeatForever().start();tween(alpha).delay(side>0?2:0).to(3.6,{opacity:54},{easing:'sineInOut'}).to(4.4,{opacity:17},{easing:'sineInOut'}).union().repeatForever().start();}}
    const window=box(mount,'Poster aperture',0,66,654,596);window.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;const art=this.art.image(window,'harvest-card-'+i,0,0,618,594);art.name='Featured festival';this.reveal(window);this.idleAccent(art,0,6,.45);
    this.metalEdges(mount,706,742,i*.7);this.edgeJewels(mount,706,742,i);
    for(const side of [-1,1]){
      const ornament=this.art.image(mount,symbolAtlas(GAME_CONFIGS[i].id),side*331,344,56,56,[8,14,7,2][i]);ornament.name='Theme corner ornament';this.idleAccent(ornament,side===1?1.4:0,4,7);
      if(!this.reduced)for(let k=0;k<7;k++){const light=this.art.light(mount,3,side*347,-270+k*86,29,29,75);light.name='Marquee lamp';const glow=light.getComponent(UIOpacity)!;tween(glow).delay(k*.15+(side+1)*.3).to(.7,{opacity:170},{easing:'sineInOut'}).to(1.4,{opacity:45},{easing:'sineInOut'}).delay(1.9).union().repeatForever().start();}
    }
    const plaque=this.art.panel(mount,0,-260,690,94,0);plaque.name='Card title plaque';text(plaque,cfg.name,0,0,634,74,47,COLORS.ink,true).node.name='Card name';
    const caption=this.art.panel(mount,0,-333,690,57,0);caption.name='Card description plaque';text(caption,cfg.modeLabel,0,0,646,48,32,COLORS.ink).node.name='Card mode';
    const drapes=box(stage,'Living theatre curtains',0,0,1080,1400).addComponent(SalonCurtains);drapes.setup(this.art,this.reduced);this.hallCurtains=drapes;drapes.setClosed(this.curtainClosed);
    // Register fabric to the actual cover-scaled background, independent of menu layout scale.
    const backdrop=this.bg!.children[0],backdropSize=backdrop.getComponent(UITransform)!;
    const stageTransform=stage.getComponent(UITransform)!;const origin=stageTransform.convertToNodeSpaceAR(backdrop.worldPosition);
    const fabricScale=backdropSize.width/887*backdrop.worldScale.x/stage.worldScale.x;
    drapes.node.setPosition(origin);drapes.node.setScale(fabricScale,fabricScale,1);
    Tween.stopAllByTarget(brand);brand.setPosition(origin.x,origin.y+552*fabricScale);
    this.idleAccent(brand,0,12,1.1);brand.setSiblingIndex(stage.children.length-1);
    const play=this.art.button(stage,'Play '+cfg.name,0,-467,630,127,'PLAY NOW',0,()=>void this.navigate('game',GAME_CONFIGS[this.selectedRoute]),3);this.sheen(play,600,110);const playIcon=play.getComponentsInChildren(Sprite).find(s=>s.node.name==='interfaces')?.node;if(playIcon)this.idleAccent(playIcon,0,10,6);
    const change=(step:number)=>{void this.switchShow((this.selectedRoute+step+4)%4);};
    this.art.button(stage,'Previous show',-440,-469,117,112,'‹',undefined,()=>change(-1),2);this.art.button(stage,'Next show',440,-469,117,112,'›',undefined,()=>change(1),2);
    GAME_CONFIGS.forEach((c,k)=>{const n=this.art.panel(stage,(k-1.5)*231,-628,214,118,k===i?2:0);n.name='Select '+c.name;this.idleAccent(this.art.image(n,symbolAtlas(c.id),-59,0,75,75,[8,14,7,2][k]),k*.7,5,5);text(n,['BEE','PEACH','KOI','FOX'][k],36,0,129,54,27,k===i?COLORS.cream:COLORS.ink,true);bindPress(n,n,()=>void this.switchShow(k));});
  }

  private async switchShow(index:number):Promise<void>{
    if(this.busy||index===this.selectedRoute)return;
    this.busy=true;this.audio.play('tap');
    try{
      await this.hallCurtains?.slide(true);
      // Keep the scene, lights, curtain meshes and their animation clocks alive.
      this.selectedRoute=index;const cfg=GAME_CONFIGS[index];
      const all=(n:Node):Node[]=>[n,...n.children.flatMap(all)],nodes=all(this.root!);
      const featured=nodes.find(n=>n.name==='Featured festival')!;Tween.stopAllByTarget(featured);featured.angle=0;featured.setPosition(0,0);this.art.replaceImage(featured,'harvest-card-'+index);
      nodes.find(n=>n.name==='Card name')!.getComponent(Label)!.string=cfg.name;
      nodes.find(n=>n.name==='Card mode')!.getComponent(Label)!.string=tr(GAME_CONFIGS[index].modeLabel);
      for(const n of nodes.filter(n=>n.name==='Theme corner ornament'))n.getComponent(Sprite)!.spriteFrame=this.art.frame(symbolAtlas(cfg.id),[8,14,7,2][index]);
      GAME_CONFIGS.forEach((c,k)=>{const n=nodes.find(n=>n.name==='Select '+c.name)!;n.getComponent(Sprite)!.spriteFrame=this.art.frame('harvest-soft-plate-'+(k===index?2:0));for(const l of n.getComponentsInChildren(Label))l.color=new Color(k===index?COLORS.cream:COLORS.ink);});
      const play=nodes.find(n=>n.name.startsWith('Play '));if(play)play.name='Play '+cfg.name;
      await this.delay(.18);await this.hallCurtains?.slide(false);
    }finally{this.curtainClosed=false;this.busy=false;}
  }

  private authDecor():void{
    if(this.reduced)return;
    const layer=box(this.content!,'Living boarding lights',0,0,1080,this.height);layer.setSiblingIndex(0);
    // Keep decorative light away from the central form and its text.
    for(let i=0;i<8;i++){
      const side=i%2?-1:1,coin=this.art.image(layer,'symbols',side*(455-(i%3)*14),-this.top+210,100,100,0);coin.name='Boarding rising coin';const alpha=opacity(coin,0);const start=new Vec3(side*(465-(i%3)*14),-this.top+210,0),end=new Vec3(side*(438+(i%2)*12),this.top-290,0);
      tween(coin).delay(i*.95).repeatForever(tween().set({position:start,angle:0}).to(7.6,{position:end,angle:190},{easing:'sineInOut'})).start();
      tween(alpha).delay(i*.95).repeatForever(tween().to(.8,{opacity:240}).delay(5.4).to(1.4,{opacity:0})).start();
    }
    for(let i=0;i<18;i++){const side=i%2?-1:1,x=side*(447+(i%3)*24),y=-this.top+260+(i/18)*(this.height-420);const star=this.art.light(layer,3,x,y,39+(i%3)*16,39+(i%3)*16,155);const alpha=star.getComponent(UIOpacity)!;tween(star).delay(i*.17).repeatForever(tween().by(2.3,{position:new Vec3(-side*22,48,0),angle:55},{easing:'sineInOut'}).by(2.3,{position:new Vec3(side*22,-48,0),angle:-55},{easing:'sineInOut'})).start();tween(alpha).delay(i*.17).to(1.3,{opacity:245}).to(1.8,{opacity:35}).union().repeatForever().start();}
    for(let i=0;i<2;i++){const halo=this.art.light(layer,1,i?355:-355,this.top-405,510,510,75);tween(halo).delay(i).to(3,{scale:new Vec3(1.22,1.22,1)},{easing:'sineInOut'}).to(3,{scale:new Vec3(.9,.9,1)},{easing:'sineInOut'}).union().repeatForever().start();}
  }
  private authPage():void{this.authDecor();this.authFormPage();}
  private authFormPage():void{
    const register=this.page==='register';
    if(!register){
      const logo=this.art.image(this.content!,'harvest-brand',0,this.top-229,620,267);this.breathe(logo);
      const panel=this.art.panel(this.content!,0,-this.top+745,934,910,0);panel.name='Festival sign in';
      text(panel,'SIGN IN',0,361,850,85,55,COLORS.ink,true);text(panel,'Your golden moments await',0,288,840,57,30,COLORS.ink);
      this.field(panel,'Username',171,this.draft.username,v=>this.draft.username=v);
      this.field(panel,'Password · 10–72 characters',40,this.draft.password,v=>this.draft.password=v,true);
      const main=this.art.button(panel,'Sign in',0,-103,790,117,'SIGN IN',4,()=>void this.authAction('login'),2);this.sheen(main,750,95);
      const apple=this.art.panel(panel,0,-242,790,100,1);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-201,0,43,50);text(apple,'Sign in with Apple',49,0,486,75,37,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));
      this.art.button(panel,'Guest',-202,-364,389,91,'Guest play',0,()=>this.guestConsent(),0);this.art.button(panel,'Create account',202,-364,389,91,'Register',13,()=>void this.navigate('register'),0);
      const links=box(this.content!,'Legal links',0,-this.top+151,990,83);['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*320,0,305,77,t,7,()=>this.legal(['terms','privacy','support'][i] as LegalPage),0));
      outlined(text(this.content!,'Virtual coins · No cash prizes · Eligible adults only',0,-this.top+63,1000,57,27,COLORS.ink),'#FFF3DA',2);return;
    }

    if(register)this.art.button(this.content!,'Back to boarding',-429,this.top-468,106,96,'',9,()=>{this.authExpanded=false;if(register)void this.navigate('login');else this.render();});
    const logo=this.art.image(this.content!,'harvest-brand',0,this.top-260,690,285);
    if(!this.reduced)tween(logo).by(4,{position:new Vec3(0,12,0)},{easing:'sineInOut'}).by(4,{position:new Vec3(0,-12,0)},{easing:'sineInOut'}).union().repeatForever().start();
    const panel=this.art.panel(this.content!,0,this.top-1090,942,1110,2);
    const fx=box(panel,'Boarding ticket shimmer',0,0,900,1080).addComponent(SalonAtmosphere);fx.authFrame(this.art,900,1080);fx.reducedMotion=this.reduced;
    text(panel,register?'JOIN THE PARADE':'WELCOME TO THE PARADE',0,455,845,88,47,COLORS.gold,true);
    text(panel,register?'A little more luck, a lot more joy':'Sign in to your golden celebration',0,384,830,60,31);
    this.field(panel,'Username',270,this.draft.username,v=>this.draft.username=v);
    this.field(panel,'Password · 10–72 characters',140,this.draft.password,v=>this.draft.password=v,true);
    if(register){
      this.field(panel,'Confirm password',10,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);
      this.field(panel,'Nickname',-120,this.draft.nickname,v=>this.draft.nickname=v);
      const check=this.art.button(panel,'Accept terms',-334,-234,92,92,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1);const mark=opacity(check,this.draft.acceptedTerms?255:65);
      text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',60,-232,650,86,29);
      this.art.button(panel,'Create account',0,-359,778,106,'CREATE ACCOUNT',4,()=>void this.authAction('register'),3);
      this.art.button(panel,'Switch account form',0,-482,778,86,'Already a member? Sign in',undefined,()=>{this.authExpanded=true;void this.navigate('login');},1);
    }else{
      const signin=this.art.button(panel,'Sign in',0,-12,800,122,'SIGN IN',4,()=>void this.authAction('login'),3);this.sheen(signin,778,105);for(const l of signin.getComponentsInChildren(Label)){l.fontSize=43;l.lineHeight=51;}
      const apple=this.art.panel(panel,0,-157,778,106,1);this.art.image(apple,'apple-mark',-217,0,44,51);text(apple,'Sign in with Apple',45,0,495,80,37,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));apple.name='Sign in with Apple';
      this.art.button(panel,'Guest',0,-286,778,106,'Explore as guest',0,()=>this.guestConsent(),1);
      text(panel,'Guest progress stays on this device.',0,-375,790,54,28);
      this.art.button(panel,'Switch account form',0,-469,778,86,'Create an account',4,()=>void this.navigate('register'),1);
    }
    const links=box(this.content!,'Legal links',0,-this.top+160,990,98);
    ['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*320,0,305,86,t,7,()=>this.legal(['terms','privacy','support'][i] as LegalPage),1));
    outlined(text(this.content!,'Virtual coins · No cash prizes · Eligible adults only',0,-this.top+68,1010,60,29,COLORS.cream),'#243C52',3);
  }

  private field(parent:Node,placeholder:string,y:number,value:string,onChange:(v:string)=>void,password=false):EditBox{
    // Configure off-stage: EditBox onLoad otherwise creates default labels
    // and clears the existing material before our references are assigned.
    const frame=this.art.panel(parent,0,y,778,103,1);
    const n=box(frame,'Text entry',0,0,642,85);n.active=false;
    const focusFrame=box(n,'Focused gold edge',0,0,760,85);const fg=focusFrame.addComponent(Graphics);fg.strokeColor=new Color('#F3D083');fg.lineWidth=4;fg.roundRect(-380,-42.5,760,85,13);fg.stroke();
    const focusOpacity=opacity(focusFrame,0);const edit=n.addComponent(EditBox);
    edit.backgroundImage=null!;
    const label=text(n,value,0,0,630,82,54,'#182F29');label.horizontalAlign=Label.HorizontalAlign.LEFT;label.isBold=true;
    const hint=text(n,placeholder,0,0,630,80,42,'#394339');hint.horizontalAlign=Label.HorizontalAlign.LEFT;hint.isBold=true;
    // EditBox positions labels by their top-left corner, not their center.
    label.node.getComponent(UITransform)!.setAnchorPoint(0,1);hint.node.getComponent(UITransform)!.setAnchorPoint(0,1);
    edit.textLabel=label;edit.placeholderLabel=hint;edit.placeholder=placeholder;edit.inputMode=EditBox.InputMode.SINGLE_LINE;edit.maxLength=password?72:18;
    // Assigning labels while EditBox is still in its default multiline mode
    // changes vertical alignment to TOP. Single-line mode does not reset it.
    label.verticalAlign=hint.verticalAlign=Label.VerticalAlign.CENTER;
    label.lineHeight=68;hint.lineHeight=60;
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
    const panel=this.sheet('Updated boarding agreement',710);
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

    const trimRect=g.screen,trimPoint=imagePoint(trimRect);
    const trim=ThemeFestivity.cabinet(this.plane,trimPoint[0],trimPoint[1],trimRect[2],trimRect[3],cfg.columns,this.reduced);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.playReelStop(column,column===cfg.columns-1);ambient.land(column);trim.land(column);};
    const balance=imagePoint(g.balance);this.art.image(this.plane,'symbols',balance[0]-g.balance[2]*.39,balance[1],52,52,0);
    this.balanceLabel=text(this.plane,money(this.services.economy.balance()),balance[0]-4,balance[1],g.balance[2]*.66,g.balance[3],43,'#59351B');
    const recharge=this.art.image(this.plane,'harvest-button-'+(GAME_CONFIGS.indexOf(cfg)*4+2),balance[0]+g.balance[2]*.41,balance[1],60,60);recharge.name='Recharge';bindPress(recharge,recharge,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const win=imagePoint(g.win);this.winLabel=text(this.plane,'WIN  0',win[0],win[1],g.win[2],g.win[3],41,'#803F25');
    const winReadout=this.winLabel.node.getComponent(UITransform)!;winReadout.setContentSize(Math.min(winReadout.width,g.win[2]-2*Math.max(16,g.win[2]*.06)),winReadout.height);
    const themeIndex=GAME_CONFIGS.indexOf(cfg);

    const readoutInk='#253D51';
    const readoutOutline='#FFF2D5';
    const plateColors:Record<GameId,string>={
      'golden-hour':'#55300F','jade-treasury':'#06382D','pearl-palace':'#E8DDC9','ruby-revel':'#651725',
    };
    const display=(name:string,rect:Box,index:number):Node=>{
      const pos=imagePoint(rect),host=box(this.plane!,name,pos[0],pos[1],rect[2],rect[3]);
      return host;
    };
    const betPanel=display('BET display',g.bet,themeIndex*4);
    const betCaption=outlined(text(betPanel,'BET',-g.bet[2]*.30,0,g.bet[2]*.34,Math.max(64,g.bet[3]*.8),40,readoutInk),readoutOutline,1);
    betCaption.fontFamily='Arial';betCaption.fontSize=40;betCaption.lineHeight=44;betCaption.enableWrapText=false;betCaption.overflow=Label.Overflow.SHRINK;const betCaptionFit=betCaption.node.getComponent('TextFit');if(betCaptionFit)betCaptionFit.enabled=false;if(language()==='ja')betCaption.string='掛金';
    this.betLabel=outlined(text(betPanel,money(this.bet),g.bet[2]*.19,0,g.bet[2]*.56,Math.max(64,g.bet[3]*.82),46,readoutInk),readoutOutline,1);
    this.betLabel.fontFamily='Arial Black';this.betLabel.enableWrapText=false;this.betLabel.overflow=Label.Overflow.SHRINK;
    const ctl=(rect:Box,label:string,index:number,action:()=>void):Node=>{
      const pos=imagePoint(rect);const hit=box(this.plane!,label,pos[0],pos[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset='harvest-button-'+(theme*4+[0,2,1,3][index]);
      const face=this.art.image(hit,asset,0,0,rect[2],rect[3]);
      bindPress(hit,face,()=>{if(index!==0&&index!==1&&index!==2)this.audio.play('tap');action();},[
        {depth:5,compression:.97,release:.12,tilt:-3},
        {depth:7,compression:.985,release:.14,tilt:0},
        {depth:4,compression:.94,release:.23,tilt:2},
        {depth:4,compression:.96,release:.18,tilt:-2},
      ][theme]);return hit;
    };
    ctl(g.minus,'Decrease bet',2,()=>this.changeBet(-1));ctl(g.plus,'Increase bet',1,()=>this.changeBet(1));
    const spin=ctl(g.spin,'SPIN',0,()=>void this.spin());
    const auto=ctl(g.auto,'AUTO',3,()=>{this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');if(this.auto&&this.state.kind==='idle')void this.spin();});
    const autoStatus=imagePoint(g.status);this.autoLamp=text(this.plane,'AUTO OFF',autoStatus[0],autoStatus[1],g.status[2]*.88,Math.max(64,g.status[3]),40,readoutInk);this.autoLamp.fontSize=40;this.autoLamp.lineHeight=44;this.autoLamp.enableWrapText=false;this.autoLamp.overflow=Label.Overflow.SHRINK;const autoCaptionFit=this.autoLamp.node.getComponent('TextFit');if(autoCaptionFit)autoCaptionFit.enabled=false;this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const topPanel=display('TOP WIN display',g.topWin,themeIndex*4+1);
    this.topWinLabel=this.compactRecord(topPanel,g.topWin,readoutInk,readoutOutline);
    // Money readouts reserve a full glyph line: TextFit's generic 1.22 line budget
    // previously compressed ordinary zero/bet values to 7px on narrow phones.
    for(const amount of [this.balanceLabel,this.betLabel,this.winLabel,this.topWinLabel]){
      if(!amount)continue;
      const fit=amount.node.getComponent('TextFit');if(fit)fit.enabled=false;
      const rect=amount.node.getComponent(UITransform)!;
      rect.setContentSize(rect.width,Math.max(64,rect.height));
      amount.fontFamily='Arial';amount.fontSize=amount===this.topWinLabel?54:50;amount.lineHeight=amount===this.topWinLabel?58:54;
      amount.enableWrapText=false;amount.overflow=Label.Overflow.SHRINK;
    }
    const toolbar=box(this.content!,'Safe top tools',0,this.top-95-Safe.safeTop,1000,154);
    const tool=(name:string,x:number,icon:number,label:string,action:()=>void):Label=>{
      const hit=box(toolbar,name,x,0,180,160),face=box(hit,name+' face',0,0,180,154);
      this.art.image(face,'interfaces',0,36,64,64,icon);
      const caption=outlined(text(face,cabinetToolText(label),0,-36,172,82,38,COLORS.cream),'#15352F',2);
      const fit=caption.node.getComponent('TextFit');if(fit)fit.enabled=false;
      caption.fontFamily='Arial';caption.lineHeight=40;caption.enableWrapText=false;caption.overflow=Label.Overflow.CLAMP;
      bindPress(hit,face,()=>{this.audio.play('tap');action();});return caption;
    };
    tool('Back to salon',-427,9,'BACK',()=>void this.navigate('home'));
    tool('Rules',290,7,'RULES',()=>this.rules());
    this.soundLamp=tool('Audio',436,8,'SOUND ON',()=>void this.toggleSound());this.updateSound();
    this.hintLabel=outlined(text(this.content!,MODES[GAME_CONFIGS.indexOf(cfg)],0,-this.top+88+Safe.safeBottom,980,110,38,COLORS.cream));
    this.hintLabel.node.getComponent(LabelOutline)!.width=4;this.hintLabel.node.getComponent('TextFit')!.enabled=false;this.hintLabel.fontSize=42;this.hintLabel.lineHeight=46;this.hintLabel.enableWrapText=false;this.hintLabel.overflow=Label.Overflow.SHRINK;this.hintLabel.getComponent(UITransform)!.setContentSize(980,148);
    const newcomer=!this.services.api?this.newcomerBenefit():undefined;
    if(newcomer)this.hintLabel.string=newcomerBenefitCaption(newcomer.round);
    this.layoutPlane();
    if(this.force){this.scheduleOnce(()=>void this.spin(),1);}
  }
  private syncHintMaterial():void{
    const hint=this.hintLabel?.node;if(!hint||!this.content)return;
    let material=this.content.getChildByName('Award hint material');
    if(!material){
      // Feather into the cabinet's own palette; no panel edge or opaque card.
      material=box(this.content,'Award hint material',0,0,1280,184);
      material.setSiblingIndex(hint.getSiblingIndex());
      const shade=material.addComponent(Graphics);
      for(let i=0;i<64;i++){
        const u=(i+.5)/64,alpha=Math.round(190*Math.pow(Math.sin(Math.PI*u),1.4));
        shade.fillColor=new Color(25,46,70,alpha);
        shade.rect(-640,-92+i*184/64,1280,184/64);shade.fill();
      }
    }
    material.setPosition(hint.position);
  }
  private layoutPlane():void{
    if(!this.plane)return;const h=Safe.visibleHeight;
    const layout=cabinetLayout(Safe.visibleWidth,h,CABINETS[this.config.id],Safe.safeTop,Safe.safeBottom);
    this.plane.setScale(layout.scale,layout.scale,1);this.plane.setPosition(0,layout.y);

    const toolbar=this.content?.getChildByName('Safe top tools');
    if(toolbar){
      toolbar.setPosition(0,h/2-95-Safe.safeTop);
      const left=-Safe.visibleWidth/2+Safe.safeLeft+110,right=Safe.visibleWidth/2-Safe.safeRight-110;
      toolbar.getChildByName('Back to salon')?.setPosition(left,0);
      toolbar.getChildByName('Rules')?.setPosition(right-194,0);
      toolbar.getChildByName('Audio')?.setPosition(right,0);
    }
    this.hintLabel?.node.setPosition(0,-h/2+88+Safe.safeBottom);
    this.syncHintMaterial();
  }
  private get bet():number{return this.config.bets[this.betIndex];}
  private changeBet(delta:number):void{
    if(this.state.kind!=='idle'){this.toast('Bet is locked while the reels are moving.');return;}
    const next=Math.max(0,Math.min(this.config.bets.length-1,this.betIndex+delta));
    if(next===this.betIndex){this.toast(delta<0?'Minimum bet selected.':'Maximum bet selected.');return;}
    this.betIndex=next;this.audio.play(delta>0?'bet-up':'bet-down');if(this.betLabel)this.betLabel.string=money(this.bet);if(this.hintLabel)this.hintLabel.string=tr(`BET ${money(this.bet)} selected`);
  }
  private updateAuto():void{
    if(!this.autoLamp)return;this.autoLamp.string=tr(this.auto?'AUTO ON':'AUTO OFF');this.autoLamp.color=new Color(this.auto?'#15705B':'#253D51');
    Tween.stopAllByTarget(this.autoLamp.node);this.autoLamp.node.setScale(1,1,1);
    if(this.auto&&!this.reduced)tween(this.autoLamp.node).to(.55,{scale:new Vec3(1.08,1.08,1)},{easing:'sineInOut'}).to(.55,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).union().repeatForever().start();
  }
  private updateSound(enabled=this.services.profile.current()?.settings.sound??true):void{if(this.soundLamp){this.soundLamp.string=cabinetToolText(enabled?'SOUND ON':'SOUND OFF');this.soundLamp.color=new Color(enabled?'#FFF4D8':'#D8B79A');}}
  private async toggleSound():Promise<void>{
    const settings=this.services.profile.current()?.settings;if(!settings){this.toast('Sound settings are unavailable.');return;}
    const previous=settings.sound,next=!previous;this.audio.setEffects(next);this.audio.setMusic(next);this.updateSound(next);if(next)this.audio.play('tap');
    const saved=await this.services.profile.updateSettings({sound:next});
    if(!saved){this.audio.setEffects(previous);this.audio.setMusic(previous);this.updateSound(previous);this.toast('Sound setting could not be saved.');return;}
    this.toast(next?'Sound on.':'Sound off.');
  }
  private newcomerBenefit():{round:number;guaranteeSuper:boolean}|undefined{
    const player=this.services.profile.current(),userId=this.services.save.read().currentUserId;
    const played=player?.gamesPlayed;
    if(!userId||played===undefined||!Number.isSafeInteger(played)||played<0||played>=5)return undefined;
    let hash=2166136261;
    for(let i=0;i<userId.length;i++)hash=Math.imul(hash^userId.charCodeAt(i),16777619)>>>0;
    const round=played+1,superRound=hash%5+1;
    return {round,guaranteeSuper:round===superRound};
  }
  private async spin():Promise<void>{
    const roundBet=this.bet;
    if(this.page!=='game'||!this.reels||this.modal||this.busy)return;
    if(!complianceCurrent(this.services.save.read().compliance)){this.policyConsent();return;}

    if(this.state.kind!=='idle'&&this.state.kind!=='retry')return;
    const requestId=this.state.kind==='retry'?this.state.requestId:SecureRNG.id('salon-spin');
    const api=this.services.api;
    const recovering=this.state.kind==='retry';
    const newcomer=!api&&!recovering?this.newcomerBenefit():undefined;
    if(api){try{this.journal.begin(requestId,this.config.id,roundBet);}catch{this.toast('Unable to save the round. Free device storage, then try again.');return;}}
    if(!api&&!this.services.economy.reserveSpin(requestId,roundBet)){this.auto=false;this.updateAuto();this.toast('Not enough coins. Visit Rewards or the Coin Shop.');return;}
    this.resetWinAmount();
    this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string='Treasures in motion…';
    let settled=false;
    try{
      let result:SpinResult;
      if(api){const response=await api.spin(this.config.id,roundBet,requestId);result=response.result;this.journal.settle(requestId,result,response.balance);}
      else {
        const forcedTier=this.force as 'big'|'super'|'mega'|'epic'|undefined;
        result=this.generator.generate(this.config,roundBet,this.rng,{winTier:forcedTier,newcomerSuper:!!newcomer?.guaranteeSuper});this.force=undefined;
        if(!this.services.economy.settleSpin(requestId,result.totalWin))throw new Error('Settlement failed');
      }
      settled=true;await this.reels.finish(result);this.audio.finishSpin();
      this.state={kind:'presenting',result};this.reels.highlight(result.wins.flatMap(w=>[...w.positions]));
      await this.presentAwardEvidence(result);
      if(result.featureResult)await this.presentFeature(result);
      if(result.totalWin>0)await this.presentWin(result.totalWin,isBigWin(result.totalWin,roundBet),result.wins.some(w=>w.symbolId==='newcomer-benefit'),roundBet);
      this.resetWinAmount(result.totalWin);
      if(this.hintLabel){const next=!api?this.newcomerBenefit():undefined;const evidence=roundEvidence(result,roundBet);this.hintLabel.string=next?newcomerBenefitCaption(next.round)+'\n'+evidence:evidence;}
      this.state={kind:'idle'};this.refreshBalance();this.refreshTopWin();this.autoWait=.8;
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
  /** Show the actual awarded cells before any feature replaces this grid. */
  private async presentAwardEvidence(result:SpinResult):Promise<void>{
    const awards=result.wins.filter(w=>awardCredits(w)>0);
    if(!awards.length)return;
    // A bounded sample avoids a long presentation on hundreds of Ways. The
    // denominator remains the full award count; the final total includes all.
    const benefit=awards.find(w=>w.symbolId==='newcomer-benefit');
    const shown=benefit&&!awards.slice(0,3).includes(benefit)?[...awards.slice(0,2),benefit]:awards.slice(0,3);
    for(let i=0;i<shown.length;i++){
      this.reels?.highlight(shown[i].positions);
      if(this.hintLabel)this.hintLabel.string=awardEvidence(this.config,shown[i],awards.indexOf(shown[i])+1,awards.length);
      if(i===0)this.audio.playAward(0);
      await Promise.all([this.countWinAmount(result.baseWin,result.totalWin),this.delay(this.reduced?.35:1.2)]);
    }
    this.reels?.highlight(awards.flatMap(w=>[...w.positions]));
    if(awards.length>1){if(this.hintLabel)this.hintLabel.string=awardSummary(awards,result.baseWin);await this.delay(this.reduced?.35:.7);}
  }
  private async presentFeature(result:SpinResult):Promise<void>{
    const feature=result.featureResult!;const reels=this.reels!;
    if(feature.type==='cabinet-feature'){
      let cumulative=result.baseWin;
      for(const round of feature.rounds){
        if(this.hintLabel)this.hintLabel.string=tr(round.caption??'BONUS')+' · '+round.index+'/'+feature.rounds.length+(round.multiplier?' · '+round.multiplier+'×':'');
        if(round.motion==='drop')await reels.collapseTo(round.grid,round.removed??[]);
        else if(round.motion==='rise')await reels.riseTo(round.grid,round.removed??[]);
        else if(round.motion==='move')await reels.moveSymbols(round.grid,round.moved??[],round.held??[]);
        else if(round.motion==='respin'){this.audio.play('spin');await reels.respinCells(round.grid,round.held??[]);this.audio.finishSpin();}
        else await reels.transformTo(round.grid,round.focus??[]);
        if(round.locked)reels.lockCoins(round.locked,round.lockedSymbol);
        for(const col of round.expandedColumns??[])await reels.expandColumn(col);
        reels.highlight(round.wins.flatMap(w=>Array.from(w.positions)));
        cumulative+=round.credits;
        if(round.credits>0){this.audio.playAward(round.index-1);if(this.hintLabel)this.hintLabel.string=featureAwardEvidence(this.config,round.wins,round.credits,round.index,feature.rounds.length);}
        await Promise.all([this.countWinAmount(cumulative,result.totalWin),this.delay(this.reduced?.1:round.credits>0?1.1:.18)]);
      }return;
    }
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
          void Promise.all([this.countWinAmount(result.baseWin+feature.totalCredits,result.totalWin),this.delay(this.reduced?.15:1.3)]).then(()=>{this.closeModal();resolve();});
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
      if(this.hintLabel)this.hintLabel.string=round.caption??(feature.type==='ruby-cascade'?`MOON CASCADE · ${round.multiplier}×`:feature.type==='jade-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`SUNSTONE WILD · ${round.index} OF ${feature.rounds.length}`);
      if(round.caption)await reels.transformTo(round.grid,round.focus);
      else if(feature.type==='ruby-cascade')await reels.collapseTo(round.grid,round.removed??[]);
      else{reels.begin();this.audio.play('spin');await reels.finishGrid(round.grid,true);this.audio.finishSpin();}
      if(round.locked)reels.lockCoins(round.locked);
      if(round.expandedColumn!==undefined)await reels.expandColumn(round.expandedColumn);
      reels.highlight(round.wins.flatMap(w=>[...w.positions]));
      cumulative+=round.credits;
      if(round.credits>0){this.audio.playAward(round.index-1);if(this.hintLabel)this.hintLabel.string=featureAwardEvidence(this.config,round.wins,round.credits,round.index,feature.rounds.length);}
      await Promise.all([this.countWinAmount(cumulative,result.totalWin),this.delay(this.reduced?.1:round.credits>0?1.1:.22)]);
    }
  }
  /** Presentation only: one readout continues through base and feature awards. */
  private writeWinAmount(amount:number,total=amount):void{
    this.presentedWin=amount;
    if(this.winLabel?.isValid)this.winLabel.string=tr((total>0&&total<this.bet?'RETURN  ':'WIN  ')+money(amount));
  }
  private resetWinAmount(amount=0):void{
    this.cancelWinCount?.();this.writeWinAmount(amount);
  }
  private countWinAmount(amount:number,total=amount):Promise<void>{
    this.cancelWinCount?.();
    const label=this.winLabel,from=this.presentedWin;
    if(this.reduced||!label?.isValid||amount<=from){this.writeWinAmount(amount,total);return Promise.resolve();}
    return new Promise<void>(resolve=>{
      const value={n:from};let done=false;
      const finish=():void=>{if(done)return;done=true;Tween.stopAllByTarget(value);if(this.cancelWinCount===finish)this.cancelWinCount=undefined;resolve();};
      this.cancelWinCount=finish;
      tween(value).to(.34,{n:amount},{easing:'cubicOut',onUpdate:()=>{
        if(!label.isValid||label!==this.winLabel){finish();return;}
        this.writeWinAmount(value.n,total);
        this.audio.playWinDetail('count',(value.n-from)/(amount-from),0);
      }}).call(()=>{if(label.isValid&&label===this.winLabel)this.writeWinAmount(amount,total);finish();}).start();
    });
  }
  private async presentWin(amount:number,big:boolean,welcomeBonus=false,roundBet=this.bet):Promise<void>{
    big=isBigWin(amount,roundBet);
    this.plane?.getComponentInChildren(ThemeFestivity)?.celebrate(winTier(amount/roundBet));
    if(big){
      const stage=box(this.root!,'Treasure celebration',0,0,1080,this.height);this.modal=stage;stage.addComponent(BlockInputEvents);
      // Keep the integrated scene visible, but do not let cabinet readouts and
      // controls show through the transparent celebration artwork.
      const hidden=(this.plane?.children??[]).filter(n=>n.active&&!['Cabinet reflections','Reels',this.config.id+'-tall'].includes(n.name));
      for(const n of [this.hintLabel?.node,this.content?.getChildByName('Award hint material'),this.content?.getChildByName('Safe top tools')])if(n?.active)hidden.push(n);
      const fades=hidden.map(n=>({node:n,alpha:n.getComponent(UIOpacity)??n.addComponent(UIOpacity)}));
      const prior=fades.map(f=>f.alpha.opacity);
      try{
        fades.forEach(f=>tween(f.alpha).to(this.reduced?.01:.22,{opacity:0},{easing:'sineInOut'}).start());
        await this.delay(.22);
        this.audio.playWinFanfare(winTier(amount/roundBet));await stage.addComponent(SalonWinStage).setup(this.art,amount,this.height,this.reduced,amount/roundBet,GAME_CONFIGS.indexOf(this.config),welcomeBonus,(cue,progress)=>this.audio.playWinDetail(cue,progress,winTier(amount/roundBet)));
      }finally{
        this.audio.finishWinPresentation();
        fades.forEach((f,i)=>{if(f.node.isValid)tween(f.alpha).to(this.reduced?.01:.3,{opacity:prior[i]},{easing:'sineInOut'}).start();});
        if(this.modal===stage)this.closeModal();
      }
    }else{
      if(amount>0)this.audio.playSmallWinJingle();
      const stage=box(this.content!,'Ordinary win presentation',0,0,1080,this.height);
      const hidden=[this.hintLabel?.node,this.content?.getChildByName('Award hint material')].filter((n):n is Node=>!!n&&n.active);
      hidden.forEach(n=>n.active=false);
      try{
        await Promise.all([this.countWinAmount(amount),stage.addComponent(OrdinaryWinStage).setup(this.art,amount,Safe.visibleHeight,this.reduced,roundBet,{y:-Safe.visibleHeight/2+88+Safe.safeBottom,width:980,theme:GAME_CONFIGS.indexOf(this.config),feedback:p=>this.audio.playWinDetail('count',p,0)})]);
      }finally{
        this.audio.finishWinPresentation();
        if(amount>0&&stage.isValid&&stage.activeInHierarchy&&this.page==='game'&&this.visible)this.audio.playWinDetail('collect',1,0);
        if(stage.isValid)stage.destroy();
        hidden.forEach(n=>{if(n.isValid)n.active=true;});
      }
    }
  }

  /** Local-only visual fixture: no spin, settlement, wallet write or paid purchase. */
  private previewAwardStyle(kind:string):void {
    if(!this.debug||!this.root||this.page!=='game')return;
    const theme=GAME_CONFIGS.indexOf(this.config),stage=box(this.root,'Local reward style preview',0,0,1080,this.height);
    if(kind==='small'){
      const effect=stage.addComponent(OrdinaryWinStage);
      void effect.setup(this.art,50,Safe.visibleHeight,true,this.bet,{y:-Safe.visibleHeight/2+88+Safe.safeBottom,width:980,theme});
      effect.enabled=false;
    }else{
      stage.addComponent(BlockInputEvents);
      const multiplier=WIN_TIERS[kind==='super'?1:kind==='mega'?2:kind==='epic'?3:0];
      const effect=stage.addComponent(SalonWinStage);
      void effect.setup(this.art,this.bet*multiplier,this.height,true,multiplier,theme).then(()=>{if(stage.isValid)stage.destroy();});
      effect.enabled=false;
    }
    text(stage,'LOCAL STYLE PREVIEW · NO COINS CREDITED',0,this.height/2-45,920,50,23,COLORS.cream);
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=money(this.services.economy.balance());}
  /** A small engraved trophy leaves the existing record plate to its number. */
  private compactRecord(panel:Node,rect:Box,ink:string,outline:string):Label{
    const size=Math.min(rect[3]*.58,rect[2]*.12),icon=box(panel,'TOP WIN trophy',-rect[2]*.40,0,size,size),g=icon.addComponent(Graphics);
    g.fillColor=new Color(ink);g.strokeColor=new Color(outline);g.lineWidth=1;
    g.moveTo(-size*.32,size*.36);g.lineTo(size*.32,size*.36);g.lineTo(size*.24,-size*.02);g.lineTo(size*.08,-size*.18);g.lineTo(size*.08,-size*.32);g.lineTo(size*.27,-size*.32);g.lineTo(size*.27,-size*.44);g.lineTo(-size*.27,-size*.44);g.lineTo(-size*.27,-size*.32);g.lineTo(-size*.08,-size*.32);g.lineTo(-size*.08,-size*.18);g.lineTo(-size*.24,-size*.02);g.close();g.fill();g.stroke();
    g.strokeColor=new Color(ink);g.lineWidth=Math.max(2,size*.075);g.moveTo(-size*.31,size*.25);g.lineTo(-size*.44,size*.25);g.lineTo(-size*.40,0);g.lineTo(-size*.20,-size*.08);g.stroke();g.moveTo(size*.31,size*.25);g.lineTo(size*.44,size*.25);g.lineTo(size*.40,0);g.lineTo(size*.20,-size*.08);g.stroke();
    const label=outlined(text(panel,topWinMoney(this.services.profile.current()?.biggestWin??0),rect[2]*.075,0,rect[2]*.78,Math.max(64,rect[3]*.86),48,ink),outline,1);
    const fit=label.node.getComponent('TextFit');if(fit)fit.enabled=false;
    label.fontFamily='Arial';label.fontSize=48;label.lineHeight=52;label.enableWrapText=false;label.overflow=Label.Overflow.SHRINK;
    bindPress(panel,icon,()=>this.toast(tr('TOP WIN')+' · '+exactMoney(this.services.profile.current()?.biggestWin??0)));
    return label;
  }
  private refreshTopWin():void{if(this.topWinLabel)this.topWinLabel.string=topWinMoney(this.services.profile.current()?.biggestWin??0);}
  private delay(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,this.reduced?Math.min(.12,seconds):seconds));}
  protected update(dt:number):void{const fx=this.plane?.getChildByName('Cabinet reflections')?.getComponent(SalonAtmosphere);if(fx)fx.energy=this.state.kind==='spinning'?1:this.state.kind==='presenting'?.6:0;if(this.auto&&this.visible&&this.state.kind==='idle'&&this.page==='game'&&!this.modal){this.autoWait-=dt;if(this.autoWait<=0){this.autoWait=1;void this.spin();}}}
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
  private sheen(n:Node,w:number,h:number,delay=0):void{if(this.reduced)return;const clip=box(n,'Inset metal sheen',0,0,w-12,h-12);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;const beam=this.art.light(clip,2,-w,0,h*2.2,h*2.2,38);beam.setScale(.35,1.6,1);beam.angle=-24;tween(beam).delay(delay).repeatForever(tween().to(1.6,{position:new Vec3(w,0,0)},{easing:'sineInOut'}).call(()=>beam.setPosition(-w,0)).delay(4.5)).start();}
  private breathe(n:Node,delay=0):void{if(StationaryArtwork.contains(n))return;if(StationaryArtwork.contains(n))return;if(LivingMascotRig.contains(n))return;if(this.reduced)return;tween(n).delay(delay).to(1.8,{angle:5},{easing:'sineInOut'}).to(3.6,{angle:-5},{easing:'sineInOut'}).to(1.8,{angle:0},{easing:'sineInOut'}).union().repeatForever().start();const origin=n.position.clone();tween(n).delay(delay).repeatForever(tween().to(2.8,{position:new Vec3(origin.x,origin.y+27,origin.z)},{easing:'sineInOut'}).to(2.8,{position:origin},{easing:'sineInOut'})).start();}
  /** Low-amplitude motion belongs to artwork; labels and hit regions stay fixed. */
  private idleAccent(n:Node,delay=0,lift=6,tilt=3):void{if(StationaryArtwork.contains(n))return;if(LivingMascotRig.contains(n))return;
    if(StationaryArtwork.contains(n))return;
    if(LivingMascotRig.contains(n))return;
    if(this.reduced)return;const origin=n.position.clone(),angle=n.angle;
    tween(n).delay(delay).to(2.6,{position:new Vec3(origin.x,origin.y+lift,origin.z),angle:angle+tilt},{easing:'sineInOut'}).to(3.4,{position:new Vec3(origin.x,origin.y-lift*.3,origin.z),angle:angle-tilt},{easing:'sineInOut'}).to(2.6,{position:origin,angle},{easing:'sineInOut'}).union().repeatForever().start();
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
  private count(label:Label,total:number,from=0):void{Tween.stopAllByTarget(label);if(this.reduced){label.string=money(total);return;}tween(label).to(.85,{}, {onUpdate:(_target,ratio)=>{if(label.isValid)label.string=money(from+(total-from)*(1-Math.pow(1-(ratio??0),3)));}}).call(()=>{if(label.isValid)label.string=money(total);}).start();}
  private rewardArrival(before:number,after:number):void{
    if(this.balanceLabel)this.count(this.balanceLabel,after,before);
    if(this.reduced||!this.root||!this.balanceLabel)return;
    const target=this.root.getComponent(UITransform)!.convertToNodeSpaceAR(this.balanceLabel.node.worldPosition);
    for(let i=0;i<9;i++){const coin=this.art.image(this.root,'symbols',(i-4)*25,-110,54,54,0);coin.name='Reward arrival coin';const o=opacity(coin,0);tween(o).delay(i*.045).to(.12,{opacity:255}).delay(.58).to(.16,{opacity:0}).start();tween(coin).delay(i*.045).to(.2,{position:new Vec3((i-4)*39,15,0)},{easing:'sineOut'}).to(.65,{position:target,scale:new Vec3(.4,.4,1)},{easing:'quadIn'}).call(()=>coin.destroy()).start();}
  }
  private storePage():void{
    const stage=this.pageStage("FESTIVAL FAIR"),stamp=this.generation;
    text(stage,"FESTIVAL FAIR",0,629,932,78,43,COLORS.ink,true);
    text(stage,this.services.remoteMode?'Choose a coin supply':'Preview · Purchases unavailable',0,547,907,47,27,COLORS.ink);
    const layout:number[][]=[[-311, 225, 284, 479], [0, 225, 284, 479], [311, 225, 284, 479], [0, -268, 910, 338]];
    void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;
      items.forEach((item,i)=>{const [x,y,w,h]=layout[i],wide=w>600,compact=h<260&&!wide,node=this.art.panel(stage,x,y,w,h,0);node.name='Supply '+item.id;
        const total=item.credits+item.bonus,bonus=Math.round(item.bonus/item.credits*100);
        const art=this.art.image(node,symbolAtlas(GAME_CONFIGS[i].id),wide?-w*.36:0,wide?0:h*.27,wide?127:Math.min(129,h*.24),wide?127:Math.min(129,h*.24),[0,1,5,9][i]);
        if(!this.reduced){const alpha=opacity(art,245);tween(alpha).to(2.5+i*.3,{opacity:190},{easing:'sineInOut'}).to(2.5+i*.3,{opacity:245},{easing:'sineInOut'}).union().repeatForever().start();}
        if(compact)art.active=false;const tx=compact?-w*.20:wide?-w*.06:0,tw=compact?w*.5:wide?w*.42:w*.84;
        const amount=text(node,money(total),tx,compact?30:wide?42:h*.03,tw,65,wide?42:36,COLORS.ink,true);amount.enableWrapText=false;
        text(node,bonus?bonus+'% BONUS':'STANDARD',compact?0:tx,compact?-h*.27:wide?-14:-h*.13,compact?w*.86:tw,36,22,COLORS.ink,true);
        if(h>=300)text(node,'Base '+money(item.credits)+'\nGift '+money(item.bonus),tx,-h*.285,tw,68,24,COLORS.ink);
        this.art.button(node,'Buy '+item.id,compact?w*.27:wide?w*.33:0,compact?28:wide?0:-h*.40,compact?w*.36:wide?w*.255:w*.84,Math.min(75,h*.29),item.available?item.displayPrice:'Offline',undefined,()=>void this.purchase(item.id),0);
      });
    }).catch(()=>this.toast('Shop unavailable. Please try again.'));
    this.art.button(stage,'Synchronize purchases',0,-611,780,82,'Sync unfinished purchases',undefined,()=>void this.services.store.restore().then(r=>{this.refreshBalance();this.toast(r.message);}),0);
    const legal=this.art.panel(stage,0,-680,830,58,0);text(legal,'Virtual coins · No cash value',0,0,750,36,24,COLORS.ink);
  }

  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}finally{this.busy=false;}}
  private rewardsPage():void{
    const stage=this.pageStage("PARADE STAMP TRAIL"),scope=this.services.save.currentScope(),today=new Date().toISOString().slice(0,10),progress=scope?.checkIn,claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);
    text(stage,"PARADE STAMP TRAIL",0,631,940,78,42,COLORS.ink,true);
    text(stage,tr('DAY '+(active+1))+' · '+tr(claimed?'COLLECTED':'READY TO CLAIM'),0,545,920,47,29,COLORS.ink);
    const spots:number[][]=[[-321, 394], [0, 302], [321, 210], [321, -37], [0, -128], [-321, -36], [0, 82]],thread=box(stage,'Seven day path',0,0,1020,1400).addComponent(Graphics);thread.strokeColor=new Color(175,128,60,90);thread.lineWidth=5;spots.forEach(([x,y],i)=>{if(i)thread.lineTo(x,y);else thread.moveTo(x,y);});thread.stroke();
    this.services.checkIn.rewards.forEach((amount,i)=>{const [x,y]=spots[i],current=i===active,done=i<active||(current&&claimed),node=box(stage,'Check-in day '+(i+1),x,y,274,205);const face=node.addComponent(Graphics);face.fillColor=new Color('#FFF2D2');face.strokeColor=new Color('#B88738');face.lineWidth=4;face.roundRect(-131,-96,262,192,21);face.fill();face.stroke();face.strokeColor=new Color('#E7C882');face.lineWidth=2;face.roundRect(-120,-85,240,170,15);face.stroke();
      text(node,'DAY '+(i+1),0,62,232,48,34,COLORS.ink,true);text(node,money(amount),0,8,234,53,35,COLORS.ink,true);text(node,done?'COLLECTED':current?'TODAY':'UPCOMING',0,-53,235,44,32,COLORS.ink,true);
      if(current){const g=box(node,'Today outline',0,0,274,205).addComponent(Graphics);g.strokeColor=new Color('#B78C37');g.lineWidth=3;g.roundRect(-120,-83,240,166,18);g.stroke();if(!this.reduced){const alpha=opacity(g.node,240);tween(alpha).to(1.8,{opacity:85},{easing:'sineInOut'}).to(1.8,{opacity:240},{easing:'sineInOut'}).union().repeatForever().start();}}
      bindPress(node,node,()=>{if(current&&!claimed)void this.claim('check-in');else this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Upcoming'));});
    });
    this.art.button(stage,'Check in',0,-322,836,94,claimed?'DAY '+(active+1)+' COLLECTED':'CLAIM DAY '+(active+1)+' · '+money(this.services.checkIn.rewards[active]),undefined,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next reward after 00:00 UTC.');},0);
    const daily=this.art.panel(stage,0,-534,912,230,0),collected=!!scope?.claims['daily-free:'+today];
    this.art.image(daily,'symbols',-314,0,147,147,5);text(daily,'DAILY GIFT · '+money(5000),109,52,573,46,30,COLORS.ink,true);
    this.art.button(daily,'Claim daily',109,-28,530,80,collected?'COLLECTED':'Collect daily gift',undefined,()=>{if(!collected)void this.claim('daily');else this.toast('Today’s gift is already collected.');},0);
    text(stage,'Daily reset 00:00 UTC · Progress saved to your account',0,-677,936,38,23,COLORS.ink);
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
    const stage=this.pageStage('Festival honours');text(stage,'FESTIVAL HONOURS',0,617,970,93,56,COLORS.ink,true);text(stage,this.services.remoteMode?'Verified total wins':'On-device total wins',0,529,900,65,32,COLORS.ink);const stamp=this.generation;
    const render=(rows=this.services.rank.list('all-time',this.services.profile.current())):void=>{if(stamp!==this.generation)return;
      if(!rows.length){const prize=this.art.image(stage,'interfaces',0,332,210,210,3);this.breathe(prize);this.edgeJewels(prize,195,195);text(stage,'Your first settled win\nstarts your place in the parade.',0,90,890,190,42,COLORS.ink,true);return;}
      this.visibleRanks(rows,6).slice(0,3).forEach((r,i)=>{const x=[0,-317,317][i],y=[229,103,103][i],n=box(stage,'Honour podium '+i,x,y,300,440);this.reveal(n,i*.12);const face=this.art.image(n,'portraits',0,75,i?172:218,i?172:218,r.avatar);if(i===0)this.breathe(face);else this.idleAccent(face,i*.7,7,3);this.edgeJewels(face,i?162:204,i?162:204,i);const plate=this.art.panel(n,0,-105,300,197,r.current?2:0);text(plate,'#'+r.rank+' '+r.nickname,0,47,272,68,28,r.current?COLORS.cream:COLORS.ink,true);this.count(text(plate,money(r.winnings),0,-36,278,80,36,r.current?COLORS.cream:COLORS.ink,true),r.winnings);});
      this.visibleRanks(rows,6).slice(3,6).forEach((r,i)=>{const n=this.art.panel(stage,0,-237-i*145,940,124,r.current?2:0),ink=r.current?COLORS.cream:COLORS.ink;this.reveal(n,i*.1);text(n,'#'+r.rank,-390,0,110,64,33,ink);this.idleAccent(this.art.image(n,'portraits',-275,0,96,96,r.avatar),i*.8,4,2);text(n,r.nickname,-20,0,370,74,31,ink);this.count(text(n,money(r.winnings),317,0,240,72,35,ink,true),r.winnings);});};
    if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load honours.'));else render();
    text(stage,'Real results · No invented opponents',0,-655,950,58,28,COLORS.ink);
  }


  private languages():void{
    if(this.busy)return;const panel=this.sheet('Choose language',1010);
    LANGUAGES.forEach((entry,i)=>this.art.button(panel,'Locale '+entry.code,0,285-i*137,760,110,entry.name,undefined,()=>{setLanguage(entry.code);this.closeModal();this.render();},entry.code===language()?3:0));
    text(panel,'Saved on this device',0,-417,740,58,29,COLORS.cream);
  }
  private profilePage():void{
    const stage=this.pageStage("FESTIVAL STAMPBOOK"),p=this.services.profile.current();if(!p)return;
    const balance=this.services.economy.balance(),ledger=this.services.save.currentScope()?.transactions??[];
    text(stage,"FESTIVAL STAMPBOOK",0,622,928,82,42,COLORS.ink,true);
    const plate=(name:string,x:number,y:number,w:number,h:number):Node=>{const node=this.art.panel(stage,x,y,w,h,0);node.name=name;return node;};
    const stat=(x:number,y:number,w:number,h:number,label:string,value:number):void=>{const node=plate(label,x,y,w,h);text(node,label,0,h*.22,w*.8,39,25,COLORS.ink,true);const v=text(node,money(value),0,-h*.14,w*.8,61,39,COLORS.ink,true);v.enableWrapText=false;};
    const identity=(x:number,y:number,w:number,h:number):void=>{const node=plate('Editable identity',x,y,w,h),wide=w>600;
      const portrait=this.art.image(node,'portraits',wide?-w*.33:0,wide?0:h*.22,wide?164:126,wide?164:126,p.avatar);bindPress(portrait,portrait,()=>this.avatars());
      const tx=wide?w*.13:0,tw=wide?w*.57:w*.85;
      const name=text(node,p.nickname,tx,wide?54:-h*.055,tw,55,35,COLORS.ink,true);name.enableWrapText=false;bindPress(name.node,name.node,()=>this.editNickname());
      text(node,p.isGuest?'GUEST · LEVEL '+p.level:'MEMBER · LEVEL '+p.level,tx,wide?0:-h*.22,tw,37,23,COLORS.ink);
      this.art.button(node,'Edit nickname',tx,wide?-66:-h*.365,Math.min(tw,350),61,'Edit name',undefined,()=>this.editNickname(),0);
    };
    const activity=(x:number,y:number,w:number,h:number):void=>{const node=plate('Account activity',x,y,w,h);text(node,'COIN JOURNAL',0,h/2-47,w*.82,44,28,COLORS.ink,true);text(node,ledger.length+' recorded entries',0,h/2-97,w*.83,38,24,COLORS.ink);if(h>250)text(node,'Your settled activity is saved\nwith this account.',0,-2,w*.8,81,25,COLORS.ink);this.art.button(node,'Open coin history',0,-h/2+51,w*.78,65,'View history',undefined,()=>this.history(),0);};
    identity(-258,342,380,370);stat(209,466,484,143,'FESTIVAL COINS',balance);stat(209,258,484,143,'ROUNDS PLAYED',p.gamesPlayed);stat(-230,18,430,157,'BEST PARADE',p.biggestWin);stat(230,18,430,157,'TOTAL WON',p.totalWin);activity(0,-266,912,292);
    const links:[string,()=>void][]=[['Language',()=>this.languages()],['Portrait',()=>this.avatars()],['Privacy',()=>this.legal('privacy')],['Credits',()=>window.dispatchEvent(new Event('game-music-credits'))]];
    links.forEach(([label,action],i)=>this.art.button(stage,label,(i-(links.length-1)/2)*(910/links.length),-522,880/links.length,75,label,undefined,action,0));
    this.art.button(stage,'Sign out',-229,-626,429,77,'Sign out',undefined,()=>void this.signOut(),0);
    this.art.button(stage,'Delete account',229,-626,429,77,'Delete account',undefined,()=>this.deleteAccount(),0);
  }

  private async signOut():Promise<void>{
    if(this.busy)return;this.services.auth.logout();this.authExpanded=false;this.draft.password=this.draft.confirmPassword='';await this.navigate('login');
  }
  private visibleRanks<T extends {current:boolean}>(rows:T[],limit:number):T[]{
    const visible=rows.slice(0,limit),player=rows.find(r=>r.current);
    if(player&&!visible.includes(player))visible[limit-1]=player;
    return visible;
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
      if(nickname.length<2||nickname.length>18||/[\u0000-\u001f\u007f]/.test(nickname)){error.string='Use 2–18 characters';return;}
      this.busy=true;
      void this.services.profile.setNickname(nickname).then(ok=>{
        if(!ok){if(error.isValid)error.string='Nickname could not be saved.';return;}
        this.closeModal();this.render();this.toast('Nickname saved.');
      }).catch(()=>{if(error.isValid)error.string='Nickname could not be saved.';}).finally(()=>{this.busy=false;});
    },0);
  }


  private avatars():void{const s=this.sheet('Choose your portrait',1110);for(let i=0;i<16;i++){const n=this.art.image(s,'portraits',(i%4-1.5)*213,326-Math.floor(i/4)*222,189,189,i);bindPress(n,n,()=>void this.services.profile.setAvatar(i).then(ok=>{if(ok){this.render();this.audio.play('win');this.toast('Portrait saved to your account.');}else this.toast('Portrait could not be saved.');}));}}
  private history():void{const s=this.sheet('Your coin ledger',1190);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,394-i*132,840,115,1);text(n,r.type.replace(/-/g,' '),-178,0,425,90,31,COLORS.jade);text(n,(r.amount>0?'+':'')+money(r.amount),233,0,326,79,36,COLORS.ink);});if(!rows.length)text(s,'Your coin activity will appear here.',0,0,850,160,40);}
  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void {
    const panel=this.sheet('Mailbox',1110),items=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).deleted);
    text(panel,'Gifts and notices',0,377,750,55,31);
    items.forEach((m,i)=>{const state=this.services.mail.state(m.id),row=this.art.panel(panel,0,230-i*210,840,177,0);
      const icon=this.art.image(row,'interfaces',-293,0,94,94,state.read?5:2);
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
    this.services.mail.read(id);this.render();const panel=this.sheet('Letter',920),state=this.services.mail.state(id);
    text(panel,item.title,0,254,770,85,38,COLORS.cream,true);
    text(panel,item.body,0,112,740,160,33);
    const gift=this.art.image(panel,item.credits?'symbols':'interfaces',0,-70,140,140,item.credits?0:5);
    text(panel,item.credits?money(item.credits)+' COINS':'System notice',0,-173,700,55,37);
    this.art.button(panel,'Collect mail attachment',0,-277,730,100,state.claimed?'Attachment collected':item.credits?'Collect attachment':'Back to mailbox',14,()=>{
      if(!item.credits||state.claimed){this.mail();return;}
      if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}
      if(this.services.mail.claim(id)){this.audio.play('win');this.render();this.openMail(id);this.toast(money(item.credits)+' coins collected');}
    },0);
    this.art.button(panel,'Back to mailbox',0,-383,580,76,'Back to mailbox',9,()=>this.mail(),0);
  }
  private howToPlay(page=0):void{
    this.auto=false;this.updateAuto();const cfg=this.config,s=this.ruleSheet(cfg.name+' · '+helpTitle());
    this.art.button(s,'Payout rules',-286,550,274,87,'PAYOUTS',undefined,()=>this.rules(0,false,true));
    this.art.button(s,'Feature rules',0,550,274,87,'FEATURES',undefined,()=>this.rules(0,true));
    this.art.button(s,'Rule diagram',286,550,274,87,helpTitle(),undefined,()=>this.howToPlay(page),3);
    drawRuleHelp(s,cfg,this.art,page,next=>this.howToPlay(next));
  }
  private rules(band=0,features=false,payoutFirst=false):void{
    this.auto=false;this.updateAuto();const cfg=this.config,s=this.ruleSheet(cfg.name+' · Rules');
    this.art.button(s,'Payout rules',-286,550,274,87,'PAYOUTS',undefined,()=>this.rules(0,false,true),features?0:3);
    this.art.button(s,'Feature rules',0,550,274,87,'FEATURES',undefined,()=>this.rules(0,true),features?3:0);
    this.art.button(s,'Rule diagram',286,550,274,87,helpTitle(),undefined,()=>this.howToPlay());
    drawRulePages(s,cfg,this.art,this.bet,band,features,FEATURE_PROFILES[cfg.id].notes,next=>this.rules(next,features),payoutFirst);
  }

  private ruleSheet(title:string):Node{
    // Paging is an update inside one reading surface, not a new modal transition.
    // Keep the opaque frame and input shield in place throughout rapid taps.
    const overlay=this.modal;
    let panel=overlay?.isValid&&!overlay.getChildByName('Dialog is closing')
      ?overlay.children.find(child=>!!child.getChildByName('Rule content anchor')):undefined;
    if(!panel){
      panel=this.sheet(title,1480);
      const heading=panel.children.find(child=>!!child.getComponent(Label));
      if(heading)heading.name='Rule dialog title';
      box(panel,'Rule content anchor',0,0,978,1480);
    }else{
      const heading=panel.getChildByName('Rule dialog title')?.getComponent(Label);
      if(heading)heading.string=tr(title);
    }
    const anchor=panel.getChildByName('Rule content anchor')!;
    for(const child of [...anchor.children]){child.active=false;child.destroy();}
    // Retain the panel's text palette/insets without duplicating its background.
    return box(anchor,panel.name,0,0,978,1480);
  }

  private legal(which:LegalPage):void{
    const s=this.sheet(which==='terms'?'Terms of Service':which==='privacy'?'Privacy & Data':'Player Support',1360);
    LEGAL_SECTIONS[which].forEach((section,i)=>{const y=460-i*210;text(s,section.title,0,y,850,56,34,COLORS.gold);text(s,section.body.replace(/\n/g,' '),0,y-88,861,150,31);});
  }
  private sheet(title:string,height:number):Node{
    this.closeModal();const overlay=box(this.root!,'Modal shield',0,0,Safe.visibleWidth,Safe.visibleHeight);overlay.addComponent(BlockInputEvents);
    const dim=overlay.addComponent(Graphics);dim.fillColor=new Color(17,32,27,150);dim.rect(-Safe.visibleWidth/2,-Safe.visibleHeight/2,Safe.visibleWidth,Safe.visibleHeight);dim.fill();
    const panel=this.art.panel(overlay,0,0,978,height,2);text(panel,title,-25,height/2-83,797,118,46,COLORS.gold,true);
    this.art.button(panel,'Close dialog',413,height/2-73,95,95,'',15,()=>this.closeModal());
    if(!this.reduced){
      const alpha=opacity(overlay,0);tween(alpha).to(.2,{opacity:255}).start();
      panel.setPosition(0,-28);tween(panel).to(.32,{position:new Vec3(0,0,0)},{easing:'cubicOut'}).start();
    }
    this.audio.setModalOpen(true);this.modal=overlay;return panel;
  }
  private closeModal():void{this.audio.setModalOpen(false);if(this.modal){this.modal.active=false;this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,2);text(n,message,0,0,916,144,36);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{this.cancelWinCount?.();game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
