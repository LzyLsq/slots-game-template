import {CabinetGuardian} from '../vfx/CabinetGuardian';
import {AWARD_ENTER_SECONDS,AWARD_EXIT_SECONDS} from '../vfx/AwardTiming';
import {newcomerMinimum, newcomerNextRound} from '../math/NewcomerGuarantee';
import { OrdinaryWinStage } from '../vfx/OrdinaryWinStage';
import {LabelOutline} from 'cc';
import {cabinetToolText} from './CabinetToolText';
import {drawRulePages} from './RulePages';
import {awardCredits, awardEvidence, featureAwardEvidence, awardSummary, newcomerBenefitCaption, cabinetNewcomerCaption, cabinetRoundCaption, roundEvidence, tierRules, winTierForRound} from '../vfx/WinPresentation';
import {primaryRuleText} from '../math/PrimaryRuleText';
import {drawRuleHelp,helpTitle} from './RuleHelp';
import {primaryStatus,HAND_NAMES,HAND_FACTORS} from '../math/IndependentCore';
import {CORE_TITLE,CORE_NOTES,CORE_DESCRIPTIONS,coreSymbols} from '../math/CoreGame';
import {SIGNATURE_TITLE,SIGNATURE_NOTES,FEATURE_PROFILES} from '../math/SignatureFeature';
import {ECONOMY} from '../math/EconomyProfile';
import { INBOX_MESSAGES } from '../services/MailService';
import {tr,language,setLanguage,initializeLanguage,LANGUAGES} from './Language';
import { _decorator, BlockInputEvents, Color, Component, EditBox, EventTouch, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, sys, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SecureRNG } from '../core/SecureRNG';
import { AudioManager } from '../audio/AudioManager';
import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import { GAME_CONFIGS, symbolArt, symbolAtlas, prizeArt } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import { ruleAward,ruleCounts ,ruleAllCounts} from '../math/PaytableDisplay';
import type { GameConfig, GameId, SpinResult } from '../math/types';
import type { AuthResult } from '../services/AuthService';
import { ApiRequestError } from '../services/ProductionApiClient';
import { RemoteSpinJournal } from '../services/RemoteSpinJournal';
import { hallStandings } from '../services/RankService';
import { STORE_PRODUCTS } from '../services/StoreService';
import { SalonReels } from '../reels/SalonReels';
import { SalonAtmosphere } from '../vfx/SalonAtmosphere';
import { CanopyLeaves } from '../vfx/CanopyLeaves';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, setPressFeedback, outlined, COLORS } from './SalonArt';
import { CABINETS, CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT, imagePoint, cabinetLayout, reelAperture, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const MODES = GAME_CONFIGS.map(c=>c.modeLabel);
// Each commissioned title has a different aspect ratio. Give its bitmap enough
// vertical room; SalonArt preserves the artwork ratio within these bounds.
const HALL_TITLE_HEIGHTS=[280,270,305,245] as const;
const CABINET_TITLE_HEIGHTS=[310,260,296,235] as const;
const CABINET_TITLE_RISE=[40,32,16,12] as const;
const exactMoney=(n:number):string=>Math.floor(n).toLocaleString('en-US');
const money=(n:number):string=>{const v=Math.floor(n),a=Math.abs(v);if(a<1000000)return exactMoney(v);const unit=a>=1000000000?1000000000:1000000;return (Math.trunc(v/unit*100)/100).toFixed(2).replace(/\.?0+$/,'')+(unit===1000000000?'B':'M');};
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
  private art=new SalonArt();private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private retiring?:Node;private modal?:Node;private closingModal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;private soundIcon?:Sprite;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private homeChanging=false;private authExpanded=false;private selectedRoute=0;private selectedBundle=0;private curtainClosed=false;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
  private balanceLabel?:Label;private betLabel?:Label;private winLabel?:Label;private topWinLabel?:Label;private hintLabel?:Label;
  private presentedWin=0;private cancelWinCount?:()=>void;
  private top=960;private height=1920;private debug=false;private reduced=false;private force?:string;
  private draft={username:'',password:'',confirmPassword:'',nickname:'',acceptedTerms:false};
  private generator=new ResultGenerator();private rng=new SecureRNG();private audio!:AudioManager;
  private journal!:RemoteSpinJournal;
  protected onLoad():void {
    initializeLanguage(sys.localStorage);
    this.audio=this.node.addComponent(AudioManager);this.audio.setMusic(false);
    setPressFeedback(hit=>{if(hit.name!=='Audio')this.audio.play('tap');});
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
    const loading=box(this.node,'Atelier loading',0,0,Safe.visibleWidth,Safe.visibleHeight);loading.addComponent(BlockInputEvents);
    const fallback=loading.addComponent(Graphics);fallback.fillColor=new Color('#3D2B27');fallback.rect(-1500,-2000,3000,4000);fallback.fill();
    const progress=outlined(text(loading,'Opening the jewel atelier…',0,-505,850,76,38,COLORS.cream),'#382616',2);
    try{
      // Show the authored scene as soon as it is decoded; the numeric progress
      // below counts actual art loads and never waits on a simulated timer.
      await this.art.load(['salon','canopy-brand','canopy-soft-plate-0','canopy-soft-plate-1','optics','canopy-destinations']);
      this.art.cover(loading,'salon',0,0,Safe.visibleWidth,Safe.visibleHeight).setSiblingIndex(0);
      const brand=this.art.image(loading,'canopy-brand',0,175,700,356);this.artTitleMotion(brand);
      // The opening art is the same physical collection players enter in the
      // salon, grounded on the room's marble floor rather than an empty hall.
      const exhibit=this.art.image(loading,'canopy-destinations',0,-115,740,740,0);
      exhibit.name='Opening coin exhibit';
      if(!this.reduced)tween(exhibit).to(2.8,{scale:new Vec3(1.018,1.018,1)},{easing:'sineInOut'})
        .to(3.1,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).union().repeatForever().start();
      const drawBar=this.loadingRail(loading,-412,660,500);
      await this.art.load([...GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),symbolAtlas(c.id)+'-blur',prizeArt(c.id)]),'symbols',...Array.from({length:16},(_,i)=>'interface-'+i),'portraits','symbols-blur','optics','apple-mark',...['coin','sapphire','pearl','ruby'].flatMap(name=>['mascot-'+name,'guardian-'+name,'guardian-'+name+'-wave',name+'-room']),'guardian-contact-shadow','guardian-pearl-offering',...['coin','sapphire','pearl','ruby'].map(name=>'award-'+name+'-room'),...['big','super','mega','epic'].map(name=>'award-title-'+name),'award-coin-flight','canopy-services','salon-hall','canopy-hall-soft',...Array.from({length:4},(_,i)=>'canopy-frame-'+i),...Array.from({length:4},(_,i)=>'win-frame-'+i),...Array.from({length:16},(_,i)=>'canopy-button-'+i),...Array.from({length:4},(_,i)=>'canopy-soft-plate-'+i),...Array.from({length:4},(_,i)=>'canopy-title-'+i)],(n,t)=>{
        const value=n/t;progress.string=tr(`Preparing your treasures  ${Math.round(value*100)}%`);
        drawBar(value);
        globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:value}}));
      });
      const resumed=await this.services.resumeSession();
      if(this.debug&&!resumed){this.accept();await this.services.auth.guestLogin();}
      const requested=query.get('screen') as Page|null;
      this.config=GAME_CONFIGS.find(g=>g.id===query.get('game'))??GAME_CONFIGS[0];
      this.page=(resumed||this.debug)?(requested??'home'):'login';
      if(!['home','login','register','game','store','rewards','rank','profile'].includes(this.page))this.page='home';
      const soundSettings=this.services.profile.current()?.settings;
      this.audio.setEffects(soundSettings?.sound??true);
      await this.audio.prepare();
      this.audio.setMusic((soundSettings?.music??true)&&(soundSettings?.sound??true));
      this.restoreRemoteRound();
      if(this.page==='game')await this.art.load([this.config.id+'-environment']);
      this.render();
      await new Promise<void>(resolve=>tween(opacity(loading,255))
        .to(this.reduced?.01:.26,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());
      loading.destroy();
      globalThis.dispatchEvent?.(new Event('aurelia-app-ready'));
    }catch(error){progress.string=tr('Could not open the atelier. Tap to retry.');loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
  }
  private accept():void{this.services.save.update(s=>{s.compliance={ageConfirmedAt:new Date().toISOString(),termsVersion:TERMS_VERSION,privacyVersion:PRIVACY_VERSION};});}
  private restoreRemoteRound():boolean{
    if(!this.services.api)return false;const pending=this.journal.pending();if(!pending)return false;
    const config=GAME_CONFIGS.find(c=>c.id===pending.gameId);if(!config)return false;
    this.config=config;this.betIndex=Math.max(0,config.bets.indexOf(pending.bet));this.page='game';this.state={kind:'retry',requestId:pending.requestId};
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
    this.cancelWinCount?.();this.presentedWin=0;
    this.art.reducedMotion=this.reduced;
    this.generation++;this.closingModal?.destroy();this.closingModal=undefined;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.topWinLabel=this.hintLabel=this.autoLamp=this.soundLamp=undefined;this.soundIcon=undefined;
    const previous=this.root;if(previous){const a=opacity(previous,255);Tween.stopAllByTarget(a);a.opacity=255;for(const edit of previous.getComponentsInChildren(EditBox))edit.enabled=false;}
    if(this.retiring&&this.retiring!==previous)this.retiring.destroy();this.retiring=previous;
    this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Aurum Atelier interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='home'?'salon':this.page==='login'||this.page==='register'?'salon':'canopy-services';
    // A cabinet and its workshop are one authored canvas. The full environment
    // extends outside the fitted cabinet plane on short or wide phone screens.
    this.bg=this.page==='home'||this.page==='game'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);
    this.audio.setScene(this.page==='game'?this.config.id:'salon');

    if(this.page!=='game'&&this.page!=='home'){box(root,'Atelier lamplight',0,0,Safe.visibleWidth,this.height).addComponent(CanopyLeaves).setup(this.art,Safe.visibleWidth,this.height,this.reduced);}
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
  private loadingArrival?:Promise<void>;
  private async navigate(page:Page,config?:GameConfig):Promise<void>{
    if(this.state.kind!=='idle'&&this.page==='game'){this.toast('Finish the current round before leaving.');return;}
    if(this.busy)return;this.busy=true;this.auto=false;this.updateAuto();
    let loading:Node|undefined;let failedConfig:GameConfig|undefined;
    try{
      if(config){
        loading=this.gameLoading(config);
        // Asset readiness drives the percentage. The separate brief entrance
        // lets even a cached collection settle into the scene before the exit.
        await Promise.all([this.art.load([config.id+'-environment'],(done,total)=>this.loadingProgress?.(done/total,'Preparing your game…')),this.loadingArrival]);
      }
      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();
      if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(1,'Ready');await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.28,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch(error){if(this.content)opacity(this.content,255);failedConfig=config;console.error('Mode arrival failed',error);}
    finally{if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.loadingArrival=undefined;this.busy=false;}
    if(failedConfig){
      const retry=failedConfig;const panel=this.sheet('Collection unavailable',640,1);
      text(panel,'The cabinet could not be prepared.\nYour coins have not been used.',0,75,780,155,38,COLORS.ink);
      this.art.button(panel,'Retry mode loading',0,-98,700,100,'Retry collection',14,()=>{this.closeModal();void this.navigate('game',retry);},3);
      this.art.button(panel,'Return from failed loading',0,-222,700,100,'Return to hall',6,()=>this.closeModal(),0);
    }
  }
  private gameLoading(config:GameConfig):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);
    const index=GAME_CONFIGS.indexOf(config);
    // Two authored rooms and four separate workshop installations. The
    // equipment is the scene's architecture, rather than a small reward badge
    // pasted into an otherwise identical palace loading card.
    this.art.cover(n,index===0||index===2?'salon':'canopy-hall-soft',0,0,Safe.visibleWidth,this.height);
    const stage=box(n,'Mode workshop',0,0,1020,1410);
    const scale=Math.min(1,(Safe.visibleWidth-65)/1020,(this.height-230)/1410);stage.setScale(scale,scale,1);
    const layouts=[
      {titleY:548,workY:117,workW:730,workH:650,ruleY:-275,railY:-443,style:2,focus:[[-153,198,63],[210,-36,55]]},
      {titleY:568,workY:140,workW:660,workH:590,ruleY:-356,railY:-528,style:0,focus:[[54,125,70],[-207,-82,48]]},
      {titleY:559,workY:125,workW:760,workH:625,ruleY:-275,railY:-443,style:2,focus:[[-83,154,72],[163,-57,52]]},
      {titleY:559,workY:135,workW:690,workH:605,ruleY:-356,railY:-528,style:3,focus:[[63,170,70],[-175,-78,50]]}
    ][index];
    const heading=this.art.image(stage,'canopy-title-'+index,0,layouts.titleY-(index===0?18:0),710,HALL_TITLE_HEIGHTS[index]);
    this.artTitleMotion(heading,index*.26);
    const installation=this.art.image(stage,'canopy-destinations',0,layouts.workY,layouts.workW,layouts.workH,index);
    installation.name=['Coin mint station','Sapphire cutting station','Pearl loom station','Crown forge station'][index];
    // A restrained arrival movement resolves while actual resources decode.
    // No whole-room or endless equipment rocking is applied.
    if(this.reduced)this.loadingArrival=Promise.resolve();
    else{
      installation.setScale(.96,.96,1);
      const alpha=opacity(installation,160);
      tween(installation).to(.42,{scale:new Vec3(1,1,1)},{easing:'sineOut'}).start();
      this.loadingArrival=new Promise<void>(resolve=>tween(alpha).to(.42,{opacity:255},{easing:'sineOut'}).call(()=>resolve()).start());
      layouts.focus.forEach(([x,y,size],i)=>{
        const gleam=this.art.light(stage,index===2?1:3,x,y,size,size,i===0?0:30);
        gleam.name=['Mint engraving reflection','Facet lamp reflection','Nacre reflection','Forge reflection'][index];
        const alpha=gleam.getComponent(UIOpacity)!;
        tween(alpha).delay(i*.57+index*.16).repeatForever(tween().to(index===3?.75:1.1,{opacity:index===3?145:125},{easing:'sineInOut'}).to(index===2?2.8:2.1,{opacity:15},{easing:'sineInOut'}).delay(index===0?2.5:1.8)).start();
      });
    }
    const rule=[
      '5 PAYLINES · Mint matching seals',
      '243 WAYS · Facet matching gems',
      'CHANGING WAYS · Weave open pearl rows',
      'GEM COUNT · Eight or more anywhere'
    ][index];
    const [ruleHead,ruleDetail]=rule.split(' · ');
    // An engraved ivory instruction plate keeps copy clear of the workshop's
    // dark pedestal while using the same material as the progress rail.
    this.art.image(stage,'canopy-soft-plate-2',0,layouts.ruleY-41,930,152);
    const ruleTitle=text(stage,ruleHead,0,layouts.ruleY-16,770,68,42,COLORS.ink,true);ruleTitle.enableWrapText=false;
    const ruleCopy=text(stage,ruleDetail,0,layouts.ruleY-66,770,62,35,COLORS.ink);ruleCopy.enableWrapText=false;
    const drawBar=this.loadingRail(stage,layouts.railY,820,645,layouts.style);
    const percentage=outlined(text(stage,'0%',0,layouts.railY-71,250,66,43,COLORS.ink),'#FFF1D3',1);percentage.node.name='Loading percentage';
    const status=outlined(text(stage,'Preparing your collection…',0,layouts.railY-136,790,68,38,COLORS.ink),'#FFF1D3',1);
    const progress={value:0};let target=0;
    const draw=()=>{if(!n.isValid)return;drawBar(progress.value);percentage.string=tr(Math.round(progress.value*100)+'%');};
    this.loadingProgress=(value,caption)=>{target=Math.max(target,Math.min(1,value));status.string=tr(target===1?'Your collection is ready':caption);Tween.stopAllByTarget(progress);if(this.reduced||target===1){progress.value=target;draw();}else tween(progress).to(.16,{value:target},{easing:'sineOut',onUpdate:draw}).start();};
    draw();return n;
  }
  private loadingRail(parent:Node,y:number,plateWidth:number,trackWidth:number,style=1):(value:number)=>void{
    const plate=this.art.panel(parent,0,y,plateWidth,88,style);
    // The carved shoulders belong to the plate. The inset track and its
    // rounded stencil keep even a full bar clear of the gold bezel.
    const recess=box(plate,'Recessed loading track',0,0,trackWidth+18,34);
    const rim=recess.addComponent(Graphics);
    rim.fillColor=new Color('#192B35');rim.roundRect(-(trackWidth+18)/2,-17,trackWidth+18,34,17);rim.fill();
    rim.strokeColor=new Color('#A87B45');rim.lineWidth=2;rim.roundRect(-(trackWidth+18)/2,-17,trackWidth+18,34,17);rim.stroke();
    const aperture=box(recess,'Clipped enamel channel',0,0,trackWidth,22);
    const mask=aperture.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_STENCIL;
    const stencil=aperture.getComponent(Graphics)!;stencil.fillColor=Color.WHITE;stencil.roundRect(-trackWidth/2,-11,trackWidth,22,11);stencil.fill();
    // A moving reflection signals that a one-resource mode is still opening,
    // without filling the channel or inventing a percentage.
    const glint=box(aperture,'Waiting reflection',-trackWidth/2-50,0,82,22);
    const gleam=glint.addComponent(Graphics);gleam.fillColor=new Color(255,227,150,86);gleam.roundRect(-41,-9,82,18,9);gleam.fill();
    if(!this.reduced)tween(glint).repeatForever(tween().to(1.75,{position:new Vec3(trackWidth/2+50,0,0)},{easing:'sineInOut'}).call(()=>glint.setPosition(-trackWidth/2-50,0)).delay(.25)).start();
    const enamel=box(aperture,'Progressive gold enamel',0,0,trackWidth,22).addComponent(Graphics);
    return value=>{
      const width=trackWidth*Math.max(0,Math.min(1,value));
      if(width>0&&glint.isValid){Tween.stopAllByTarget(glint);glint.destroy();}
      enamel.clear();if(width<=0)return;
      const x=-trackWidth/2;
      enamel.fillColor=new Color('#AF6F23');enamel.rect(x,-11,width,22);enamel.fill();
      enamel.fillColor=new Color('#F5CC70');enamel.rect(x,-6,width,15);enamel.fill();
      enamel.fillColor=new Color('#FFF1BD');enamel.rect(x,5,width,4);enamel.fill();
      enamel.fillColor=new Color('#DDA452');enamel.rect(x,-9,width,3);enamel.fill();
    };
  }
  private header():void{
    const p=this.services.profile.current(),y=this.top-92-Safe.safeTop;
    const wallet=this.art.panel(this.content!,-235,y,525,107,2);
    this.art.image(wallet,'symbols',-194,0,70,70,0);
    this.balanceLabel=text(wallet,money(this.services.economy.balance()),-4,0,298,76,46,COLORS.ink);
    const topup=this.art.image(wallet,'canopy-button-2',202,0,74,74);topup.name='Top up';bindPress(topup,topup,()=>void this.navigate('store'));
    const mailboxButton=this.art.button(this.content!,'Mail',95,y,100,100,'',5,()=>this.mail());const unreadMail=INBOX_MESSAGES.filter(m=>{const state=this.services.mail.state(m.id);return !state.read&&!state.deleted;}).length;if(unreadMail)outlined(text(mailboxButton,String(unreadMail),39,38,43,43,31,COLORS.cream,true),'#3A2010',2);outlined(text(this.content!,'Mail',95,y-69,146,50,40,COLORS.cream,true),'#28170E',3).enableWrapText=false;
    const avatar=this.art.image(this.content!,'portraits',431,y,109,109,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    outlined(text(this.content!,p?.nickname??'Guest',263,y,205,72,34,COLORS.cream,false,true),'#173F49',2).enableWrapText=false;
  }
  private navigation():void{
    const nav=this.art.awardPlate(this.content!,0,-this.top+228+Safe.safeBottom,1050,180);
    // The painted console is the navigation surface. Retain fine engraved
    // separators without a full-width dark web-style bar over its carving.
    const track=box(nav,'Navigation engraved separators',0,-51,1005,68).addComponent(Graphics);
    track.strokeColor=new Color(252,219,149,126);track.lineWidth=2;
    for(const x of [-308,-103,102,307]){track.moveTo(x,-19);track.lineTo(x,18);}track.stroke();
    // Match each gilded atlas emblem to its destination: purse, gift, jewel, medal, portrait.
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Shop','Gifts','Hall','Rank','Account'],icons=[1,2,6,3,4];
    pages.forEach((page,i)=>{
      const active=page===this.page;
      const hit=box(nav,labels[i],(i-2)*205,0,194,166);
      const face=box(hit,labels[i]+' rail key',0,0,192,160);
      if(active){
        const socket=face.addComponent(Graphics);
        socket.fillColor=new Color(28,66,67,35);socket.circle(0,33,70);socket.fill();
        socket.strokeColor=new Color(252,212,119,173);socket.lineWidth=2;socket.circle(0,33,69);socket.stroke();
        this.art.light(face,3,0,40,100,34,68);
      }
      const icon=this.art.image(face,'interfaces',0,41,active?120:112,active?120:112,icons[i]);
      const navLabel=outlined(text(face,labels[i],0,-56,194,70,46,COLORS.ink),'#FFF1D3',1);
      navLabel.fontFamily='Arial Black';navLabel.enableWrapText=false;
      if(this.page==='home')this.sheen(icon,96,96,i*.7);
      else this.idleAccent(icon,i*.65,3,2);
      bindPress(hit,face,()=>void this.navigate(page),{depth:3,compression:.97,release:.18});
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
    const stage=box(this.content!,'Aurum Atelier hall',0,0,1024,1792);stage.setSiblingIndex(0);
    const scale=Math.min(Safe.visibleWidth/1024,this.height/1792);stage.setScale(scale,scale,1);
    // The atelier nave supplies depth behind the exhibit; avoid
    // tinting or blurring the whole scene just to support short labels.
    this.art.cover(stage,'salon-hall',0,0,Math.max(1024,Safe.visibleWidth/scale),this.height/scale);
    this.homeAmbient(stage);
    const brand=this.art.image(this.content!,'canopy-brand',0,this.top-310-Safe.safeTop,900,450);this.idleAccent(brand,0,20,.3,1.8);this.sheen(brand,650,170);
    const exhibit=box(stage,'Atelier collection exhibit',0,0,870,910);
    const draw=()=>{
      const cfg=GAME_CONFIGS[this.selectedRoute];const piece=box(exhibit,'Destination '+cfg.id,0,0,870,910);
      const island=this.art.image(piece,'canopy-destinations',0,this.selectedRoute===0?193:160,820,760,this.selectedRoute);this.idleAccent(island,0,13,.35,1.9);
      // The current collection's artisan stands beside the exhibit, above
      // its plinth but beneath the mode title and entry control.
      this.craftMascot(piece,this.selectedRoute,285,137,295,'hall');
      // A low, traveling sheen belongs to the open folio itself; it never
      // moves the exhibit, title, labels or touch area.
      if(!this.reduced){
        const pageLight=this.art.light(piece,3,-172,57,144,70,0);
        pageLight.name='Jewel case reflection';
        const pageOpacity=pageLight.getComponent(UIOpacity)!;
        tween(pageLight).delay(.65).to(3.6,{position:new Vec3(170,57,0)},{easing:'sineInOut'})
          .set({position:new Vec3(-172,57,0)}).delay(2.8).union().repeatForever().start();
        tween(pageOpacity).delay(.65).to(.8,{opacity:92},{easing:'sineOut'})
          .delay(1.5).to(1.3,{opacity:0},{easing:'sineIn'}).delay(2.8).union().repeatForever().start();
        for(const [x,y,phase] of [[-213,217,1.2],[205,241,3.6],[0,-75,2.1]]){
          const jewel=this.art.light(piece,3,x,y,75,75,0);jewel.name='Exhibit jewel reflection';
          const alpha=jewel.getComponent(UIOpacity)!;
          tween(alpha).delay(phase).to(.45,{opacity:175},{easing:'sineOut'})
            .to(1.7,{opacity:0},{easing:'sineInOut'}).delay(4.7).union().repeatForever().start();
        }
      }
      // Two offset highlights stay on the exhibit's carved shoulders.
      if(!this.reduced)for(const [side,phase] of [[-1,.7],[1,2.8]]){
        const glint=this.art.light(piece,3,side*304,102,106,126,0);glint.name='Exhibit brass breathing light';
        const glow=glint.getComponent(UIOpacity)!;
        tween(glint).delay(phase).to(2.6,{position:new Vec3(side*292,111,0),scale:new Vec3(1.16,1.16,1)},{easing:'sineInOut'}).to(3.1,{position:new Vec3(side*304,102,0),scale:new Vec3(.92,.92,1)},{easing:'sineInOut'}).union().repeatForever().start();
        tween(glow).delay(phase).to(1.5,{opacity:112},{easing:'sineInOut'}).to(2.4,{opacity:24},{easing:'sineInOut'}).union().repeatForever().start();
      }
      // The painted lanterns and clasp carry the motion. Their staggered
      // breathing is anchored to the illustration, not to floating particles.
      if(!this.reduced){
        for(const [x,y,w,h,phase] of [[-267,107,128,150,.2],[267,107,128,150,1.55],[0,36,70,74,2.55]] as const){
          const gleam=this.art.light(piece,3,x,y,w,h,20);gleam.name='Exhibit lamp and clasp glow';
          const alpha=gleam.getComponent(UIOpacity)!;
          tween(gleam).delay(phase).to(2.4,{scale:new Vec3(1.2,1.12,1)},{easing:'sineInOut'})
            .to(2.8,{scale:new Vec3(.9,.94,1)},{easing:'sineInOut'}).union().repeatForever().start();
          tween(alpha).delay(phase).to(1.6,{opacity:175},{easing:'sineInOut'})
            .to(2.8,{opacity:25},{easing:'sineInOut'}).union().repeatForever().start();
        }
        // Short specular passes sit on the three existing gold mounts. They
        // alternate rather than flashing in unison or crossing the lettering.
        for(const [x,y,w,h,phase] of [[0,328,135,105,0],[-267,105,112,104,1.65],[267,105,112,104,3.3]] as const){
          const glint=this.art.light(piece,2,x,y,w,h,0);glint.name='Gilded mount reflection';
          const alpha=glint.getComponent(UIOpacity)!;
          tween(alpha).delay(phase).repeatForever(tween()
            .to(.48,{opacity:190},{easing:'sineOut'})
            .to(1.05,{opacity:0},{easing:'sineInOut'}).delay(3.5)).start();
        }
        // A soft reflection travels only across the open pages, beneath the
        // title and control rail. The clipped aperture prevents a stray streak.
        const aperture=box(piece,'Gem case glass',0,142,282,116);
        aperture.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        const reflection=this.art.light(aperture,2,-160,0,115,122,0);
        reflection.name='Page gilding reflection';
        const alpha=reflection.getComponent(UIOpacity)!;
        tween(reflection).delay(.8).repeatForever(tween().to(2.8,{position:new Vec3(160,0,0)},{easing:'sineInOut'})
          .set({position:new Vec3(-160,0,0)}).delay(2.4)).start();
        tween(alpha).delay(.8).repeatForever(tween().to(.65,{opacity:132},{easing:'sineOut'})
          .delay(1.25).to(.9,{opacity:0},{easing:'sineInOut'}).delay(2.4)).start();
      }
      const heading=this.art.image(piece,'canopy-title-'+this.selectedRoute,0,-140,720,HALL_TITLE_HEIGHTS[this.selectedRoute]-20);this.artTitleMotion(heading,this.selectedRoute*.35);
      // An engraved rule caption stays attached to the selected exhibit, clear of the title and PLAY key.
      const rule=outlined(text(piece,cfg.modeLabel.toUpperCase(),0,-286,570,52,42,'#49301A',true),'#FBE6B8',1);
      rule.fontFamily='Arial Black';rule.enableWrapText=false;rule.overflow=Label.Overflow.SHRINK;
      // The loading scene explains each rule; the hall keeps one clear action.
      this.art.button(piece,'Enter '+cfg.name,0,-390,663,122,'PLAY · '+cfg.name.toUpperCase(),6,()=>void this.navigate('game',cfg),3);
      return piece;
    };
    let current=draw();
    const selection=box(stage,'Choose a collection',0,-550,950,145);
    const markers:Node[]=[];
    const setMarker=(marker:Node,selected:boolean):void=>{
      const glow=marker.getComponent(UIOpacity)!;Tween.stopAllByTarget(glow);
      glow.opacity=selected?105:0;
      if(selected&&!this.reduced)tween(glow).to(1.8,{opacity:170},{easing:'sineInOut'}).to(2.2,{opacity:75},{easing:'sineInOut'}).union().repeatForever().start();
    };
    // Keep gestures that begin during the crossfade; apply the latest destination when it finishes.
    let pendingChoice:{index:number;direction:number}|undefined;
    const choose=(index:number,direction=1)=>{if(this.homeChanging){pendingChoice={index,direction};return;}if(index===this.selectedRoute)return;this.homeChanging=true;this.selectedRoute=index;
      const old=current;Tween.stopAllByTarget(old);current=draw();exhibit.getChildByName('Swipe destination')?.setSiblingIndex(exhibit.children.length-1);const duration=this.reduced?.01:.35;const a=opacity(current,0);current.setPosition(direction*60,0);
      tween(a).to(duration,{opacity:255}).start();tween(current).to(duration,{position:new Vec3(0,0,0)},{easing:'sineOut'}).start();
      tween(old).to(duration,{position:new Vec3(old.position.x-direction*70,0,0)},{easing:'sineInOut'}).start();
      tween(opacity(old,255)).to(duration,{opacity:0}).call(()=>{old.destroy();this.homeChanging=false;const pending=pendingChoice;pendingChoice=undefined;if(pending)choose(pending.index,pending.direction);}).start();
      markers.forEach((m,i)=>setMarker(m,i===index));
    };
    // The swipe surface stops above PLAY, so dragging cannot launch a game.
    const swipe=box(exhibit,'Swipe destination',0,80,1024,800);
    let startX=0,startY=0,tracking=false,horizontal=false,touchId:number|null|undefined;
    const settle=()=>{if(!this.homeChanging&&current.isValid){Tween.stopAllByTarget(current);tween(current).to(.22,{position:new Vec3(0,0,0)},{easing:'sineOut'}).start();}};
    swipe.on(Node.EventType.TOUCH_START,(event:EventTouch)=>{
      if(tracking)return;touchId=event.getID();const point=event.getUILocation();startX=point.x;startY=point.y;tracking=true;horizontal=false;if(!this.homeChanging)Tween.stopAllByTarget(current);
    });
    swipe.on(Node.EventType.TOUCH_MOVE,(event:EventTouch)=>{
      if(!tracking||event.getID()!==touchId)return;const point=event.getUILocation(),dx=(point.x-startX)/scale,dy=(point.y-startY)/scale;
      if(!horizontal&&Math.abs(dy)>40&&Math.abs(dy)>Math.abs(dx)){tracking=false;settle();return;}
      if(Math.abs(dx)>25&&Math.abs(dx)>Math.abs(dy)*1.25)horizontal=true;
      if(horizontal){if(!this.homeChanging){Tween.stopAllByTarget(current);current.setPosition(dx*.4/(1+Math.abs(dx)/300),0);}event.propagationStopped=true;}
    });
    const finishSwipe=(event:EventTouch)=>{
      if(!tracking||event.getID()!==touchId)return;tracking=false;touchId=undefined;const point=event.getUILocation(),dx=(point.x-startX)/scale,dy=(point.y-startY)/scale;
      if(Math.abs(dx)>=90&&Math.abs(dx)>Math.abs(dy)*1.25){const direction=dx<0?1:-1;this.audio.play('tap');choose(((pendingChoice?.index??this.selectedRoute)+direction+GAME_CONFIGS.length)%GAME_CONFIGS.length,direction);}else settle();
    };
    swipe.on(Node.EventType.TOUCH_END,finishSwipe);
    swipe.on(Node.EventType.TOUCH_CANCEL,(event:EventTouch)=>{
      // Cocos changes a release outside the hit rectangle into a node cancel.
      // The original event code distinguishes that valid swipe from an OS interruption.
      if(event.getEventCode()===Node.EventType.TOUCH_END){finishSwipe(event);return;}
      if(tracking&&event.getID()===touchId){tracking=false;touchId=undefined;settle();}
    });
    GAME_CONFIGS.forEach((cfg,i)=>{
      const x=(i-1.5)*222,hit=box(selection,'Choose destination '+i,x,0,210,126);
      // A quiet engraved selector leaves the central cabinet as the hero.
      // These are still full-size touch targets for rapid two-way selection.
      const socket=this.art.image(hit,'canopy-button-'+(i*4+2),0,29,146,124);
      socket.name='Engraved collection socket';
      const marker=this.art.light(hit,1,0,29,124,58,i===this.selectedRoute?95:0);
      marker.setSiblingIndex(socket.getSiblingIndex()+1);markers.push(marker);setMarker(marker,i===this.selectedRoute);
      // Each collection gets an artifact from its own symbol atlas. Keep the
      // caption fixed while the artwork responds to selection.
      const emblem=this.art.image(hit,symbolAtlas(cfg.id),0,35,78,78,[0,1,0,0][i]);
      const label=outlined(text(hit,['COIN','GEMS','PEARL','CROWN'][i],0,-54,210,58,49,'#3F2617',true),'#FFF1D2',2);
      if(!this.reduced)this.idleAccent(emblem,i*.42,2,.06,2.5);
      label.enableWrapText=false;
      hit.on(Node.EventType.TOUCH_START,()=>{label.node.setScale(.96,.96,1);});
      hit.on(Node.EventType.TOUCH_CANCEL,()=>{label.node.setScale(1,1,1);});
      hit.on(Node.EventType.TOUCH_END,()=>{label.node.setScale(1,1,1);choose(i);});
    });
    this.art.button(stage,'Previous destination',-438,-160,95,108,'',9,()=>choose((this.selectedRoute+3)%4,-1));
    const next=this.art.button(stage,'Next destination',438,-160,95,108,'',9,()=>choose((this.selectedRoute+1)%4));next.angle=180;
    // The room stays grounded; only the exhibit, jewels and title breathe.
  }

  /** Reflections stay on the brasswork and coin ornaments, behind the exhibit and its controls. */
  private homeAmbient(stage:Node):void{
    if(this.reduced)return;
    const layer=box(stage,'Atelier reflections',0,0,1024,1792);
    const points:[number,number,number,number][]=[
      [-280,665,42,.1],[267,777,38,1.7],[-205,455,40,3.1],
      [202,466,44,4.9],[-323,-642,52,1.1],[322,-645,52,3.4],
    ];
    for(const [x,y,size,phase] of points){
      const glint=this.art.light(layer,3,x,y,size,size,0);
      glint.name='Brass and coin reflection';
      const alpha=glint.getComponent(UIOpacity)!;
      tween(alpha).delay(phase).repeatForever(tween()
        .to(.65,{opacity:145},{easing:'sineOut'})
        .to(1.45,{opacity:0},{easing:'sineInOut'})
        .delay(2.9)).start();
    }
    // Warm side sconces illuminate the architecture, away from the title,
    // selected exhibit and input. Their phases differ from the small brass glints.
    for(const [side,phase] of [[-1,0],[1,2.2]]){
      for(const [y,offset] of [[245,.8],[-165,2.9]]){
        const light=this.art.light(layer,3,side*443,y,132,172,20);
        light.name='Atelier sconce glow';const alpha=light.getComponent(UIOpacity)!;
        tween(alpha).delay(phase+offset).to(2.2,{opacity:105},{easing:'sineInOut'})
          .to(3.3,{opacity:30},{easing:'sineInOut'}).union().repeatForever().start();
      }
    }
    // The room gets a pair of long, architectural reflections. They are
    // clipped to the side columns and take turns crossing the stonework, so
    // the hall feels lit by a real moving source instead of covered in sparks.
    for(const [side,delay] of [[-1,0.4],[1,4.1]] as const){
      const well=box(layer,'Column glass reflection well',side*414,75,94,690);
      well.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
      const beam=this.art.light(well,1,0,-355,112,260,0);beam.name='Column glass reflection';beam.angle=side*10;
      const alpha=beam.getComponent(UIOpacity)!;
      tween(beam).delay(delay).repeatForever(tween()
        .set({position:new Vec3(0,-355,0)})
        .to(2.5,{position:new Vec3(0,355,0)},{easing:'sineInOut'})
        .delay(5.2)).start();
      tween(alpha).delay(delay).repeatForever(tween()
        .set({opacity:0}).to(.55,{opacity:74},{easing:'sineOut'})
        .to(1.45,{opacity:0},{easing:'sineInOut'}).delay(5.7)).start();
    }
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
    const stage=box(this.content!,'Treasury membership',0,30,1020,1640);const scale=Math.min(1,(this.height-260-Safe.safeTop-Safe.safeBottom)/1640,(Safe.visibleWidth-45)/1020);stage.setScale(scale,scale,1);
    const brand=this.art.image(stage,'canopy-brand',0,register?690:667,680,345);this.idleAccent(brand,0,12,.2,1.8);this.sheen(brand,510,150);
    const panel=this.art.panel(stage,0,register?-18:-245,935,register?1240:970,0);this.metalEdges(panel,903,register?1207:937,.8);
    text(panel,register?'JOIN AURUM ATELIER':'WELCOME, GOLDSMITH',0,register?525:390,812,82,50,COLORS.ink,true);
    const authSubtitle=text(panel,register?'Shape a little fortune today':'Sign in to your jewel atelier',0,register?448:319,800,56,42,COLORS.ink);
    this.field(panel,'Username',register?334:204,this.draft.username,v=>this.draft.username=v);
    this.field(panel,'Password',register?206:76,this.draft.password,v=>this.draft.password=v,true);
    if(register){
      this.field(panel,'Confirm password',78,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);this.field(panel,'Nickname',-50,this.draft.nickname,v=>this.draft.nickname=v);
      const check=this.art.button(panel,'Accept terms',-335,-173,91,91,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1),mark=opacity(check,this.draft.acceptedTerms?255:65);
      text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',65,-173,649,102,33,COLORS.ink);
      const primary=this.art.button(panel,'Create account',0,-323,795,126,'CREATE ACCOUNT',4,()=>void this.authAction('register'),3);this.metalEdges(primary,763,110,1.1);
      this.art.button(panel,'Switch account form',0,-477,790,95,'Back to sign in',9,()=>void this.navigate('login'),0);
    }else{
      const primary=this.art.button(panel,'Sign in',0,-72,810,139,'SIGN IN',14,()=>void this.authAction('login'),3);this.metalEdges(primary,778,121,.7);
      const apple=this.art.panel(panel,0,-216,810,104,1);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-242,0,42,50);outlined(text(apple,'Sign in with Apple',0,0,529,75,48,COLORS.cream),'#15213D',2);bindPress(apple,apple,()=>void this.authAction('apple'));
      const guest=this.art.button(panel,'Guest',-211,-356,390,98,'Guest play',0,()=>this.guestConsent(),0);const create=this.art.button(panel,'Create account',211,-356,390,98,'Register',4,()=>void this.navigate('register'),0);
      for(const button of [guest,create])button.getComponentsInChildren(Label).forEach(label=>{label.fontSize=50;});
    }
    const links=box(this.content!,'Engraved legal ribbon',0,-this.top+151+Safe.safeBottom,990,104);
    this.art.awardPlate(links,0,0,990,104);
    ['Terms','Privacy','Support'].forEach((t,i)=>{
      const hit=box(links,t,(i-1)*320,0,312,104);
      const label=outlined(text(hit,t,0,0,282,70,50,COLORS.ink),'#FFF4DE',1);
      label.enableWrapText=false;bindPress(hit,hit,()=>this.legal(['terms','privacy','support'][i] as LegalPage));
    });
    outlined(text(this.content!,'Virtual coins · No cash prizes · Adults only',0,-this.top+62+Safe.safeBottom,1000,55,40,COLORS.ink),'#FFF4DE',2);
    // Add this last so the brand, animated coins and authored backdrop never
    // paint over the language control in the top safe area.
    const localeButton=this.art.button(this.content!,'Language selector',Safe.visibleWidth/2-190,this.top-Safe.safeTop-98,340,92,'Language',7,()=>this.languages(),3);
    localeButton.getComponentsInChildren(Label).forEach(caption=>{caption.fontSize=49;caption.enableWrapText=false;});
  }

  private field(parent:Node,placeholder:string,y:number,value:string,onChange:(v:string)=>void,password=false):EditBox{
    // The input is carved into a single ivory enamel key. A second bright
    // rectangle over the old sapphire plate read as a web form/progress bar.
    const frame=this.art.awardPlate(parent,0,y,778,103);
    const n=box(frame,'Text entry',0,-2,580,76);n.active=false;
    const focusFrame=box(n,'Focused engraved edge',0,0,570,70);
    const fg=focusFrame.addComponent(Graphics);fg.strokeColor=new Color(151,104,37,230);
    fg.lineWidth=2;fg.roundRect(-285,-35,570,70,15);fg.stroke();
    const focusOpacity=opacity(focusFrame,0);const edit=n.addComponent(EditBox);
    edit.backgroundImage=null!;
    const label=text(n,value,0,0,546,70,43,'#24372F',false,true);
    label.horizontalAlign=Label.HorizontalAlign.LEFT;label.isBold=true;
    const hintSize=placeholder.length>24?28:placeholder.length>12?35:40;
    const hint=text(n,placeholder,0,0,546,70,hintSize,'#4D4436');
    hint.horizontalAlign=Label.HorizontalAlign.LEFT;hint.isBold=true;
    // EditBox positions labels by their top-left corner, not their center.
    label.node.getComponent(UITransform)!.setAnchorPoint(0,1);
    hint.node.getComponent(UITransform)!.setAnchorPoint(0,1);
    edit.textLabel=label;edit.placeholderLabel=hint;edit.placeholder=tr(placeholder);edit.inputMode=EditBox.InputMode.SINGLE_LINE;edit.maxLength=password?72:18;
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
      if(result.ok){this.draft.password=this.draft.confirmPassword='';this.page='home';if(this.restoreRemoteRound())await this.art.load([this.config.id+'-environment']);this.render();}else this.toast(result.message??'Unable to sign in.');
    }catch{this.toast('Unable to connect. Your form has been kept.');}finally{this.busy=false;}
  }
  private policyConsent():void{
    if(this.modal)return;
    const panel=this.sheet('Treasury membership terms',910);
    panel.getChildByName('Close dialog')!.active=false;
    text(panel,'Confirm that you meet your region’s minimum age\nand accept the current Terms and Privacy Policy.\nVirtual coins have no cash value.',0,105,880,248,35,COLORS.ink);
    this.art.button(panel,'Accept updated policy',0,-99,760,108,'Accept & continue',14,()=>{this.accept();this.closeModal();},3);
    this.art.button(panel,'Return to sign in',0,-241,760,99,'Sign out to review policies',7,()=>{this.closeModal();void this.signOut();},1);
  }
  private guestConsent():void{
    const s=this.sheet('Before you enter',720);
    text(s,'Simulated casino for eligible adults.\nCoins have no cash value.\n\nConfirm you meet your region’s age\nrequirement and accept the Terms\nand Privacy Policy.',0,0,820,264,33,COLORS.ink);
    this.art.button(s,'Confirm eligibility',0,-225,760,110,'I am eligible · Continue',14,()=>{this.accept();void this.services.auth.guestLogin().then(r=>{if(r.ok){this.page='home';this.render();}else this.toast(r.message??'Unable to enter.');});});
  }
  private gamePage():void{
    const cfg=this.config,g=CABINETS[cfg.id];
    this.plane=box(this.content!,'Cabinet-coordinate-plane',0,0,1024,2304);
    this.art.image(this.plane,cfg.id+'-environment',0,0,2048,3072);
    // Ambient light must render over the opaque integrated environment plate.
    // It shares the cabinet's coordinate plane with the reels and controls.
    const ambient=box(this.plane,'Cabinet reflections',0,0,1024,2304).addComponent(SalonAtmosphere);
    ambient.setup(this.art,1024,2304,false,0);ambient.cabinet(this.art,g);ambient.reducedMotion=this.reduced;

    const titlePoint=imagePoint(g.title);
    const titleIndex=GAME_CONFIGS.indexOf(cfg);
    // The artwork is cropped to its painted alpha bounds, then kept inside
    // the marquee above the glass. Its small motion affects no live text.
    const title=this.art.image(this.plane,'canopy-title-'+titleIndex,titlePoint[0],titlePoint[1]+CABINET_TITLE_RISE[titleIndex],Math.min(844,g.title[2]*1.10),CABINET_TITLE_HEIGHTS[titleIndex]);
    title.name='Cabinet title · '+cfg.name;
    this.artTitleMotion(title,titleIndex*.42);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,reelAperture(g,cfg.id));this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.play('reel-stop');ambient.land(column);if(column===cfg.columns-1)this.audio.setSpinning(false);};
    // Read the three painted counter windows as three separate instruments.
    // BET belongs to the middle window; WIN/TOP share the right window on
    // separate baselines. No continuous smoked strip can cover the console.
    const balance=imagePoint(g.balance),right=imagePoint(g.topWin);
    // Fixed baselines inside the actual dark instrument windows. Decorations
    // animate independently so the numerals stay crisp and centered.
    const meterInk='#FFF0C8',headY=24,valueY=-22;
    const balanceHead=outlined(text(this.plane,'COINS',balance[0]-15,balance[1]+headY,g.balance[2]*.78,54,34,meterInk),'#251A11',1);
    balanceHead.fontFamily='Arial';balanceHead.enableWrapText=false;
    this.balanceLabel=outlined(text(this.plane,money(this.services.economy.balance()),balance[0]-15,balance[1]+valueY,g.balance[2]*.78,66,49,meterInk),'#251A11',1);
    this.balanceLabel.enableWrapText=false;this.balanceLabel.overflow=Label.Overflow.SHRINK;
    this.winLabel=outlined(text(this.plane,'WIN 0',right[0],right[1]+headY,g.topWin[2]*.92,56,38,meterInk),'#251A11',1);
    this.winLabel.enableWrapText=false;this.winLabel.overflow=Label.Overflow.SHRINK;
    this.topWinLabel=outlined(text(this.plane,'TOP '+topWinMoney(this.services.profile.current()?.biggestWin??0),right[0],right[1]+valueY,g.topWin[2]*.92,58,35,meterInk),'#251A11',1);
    this.topWinLabel.fontFamily='Arial';this.topWinLabel.enableWrapText=false;this.topWinLabel.overflow=Label.Overflow.SHRINK;
    const rechargeHit=box(this.plane,'Recharge',balance[0],balance[1],g.balance[2],Math.max(100,g.balance[3]));
    const recharge=this.art.image(rechargeHit,'canopy-button-'+(titleIndex*4+2),76,-2,43,43);
    bindPress(rechargeHit,recharge,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const betPoint=imagePoint(g.bet);
    const betPanel=box(this.plane!,'BET painted register',betPoint[0],betPoint[1],g.bet[2],g.bet[3]);
    const betCaption=outlined(text(betPanel,'BET',0,headY,g.bet[2]*.88,54,34,meterInk),'#251A11',1);
    betCaption.fontFamily='Arial';betCaption.enableWrapText=false;betCaption.overflow=Label.Overflow.SHRINK;
    this.betLabel=outlined(text(betPanel,money(this.bet),0,valueY,g.bet[2]*.92,66,49,meterInk),'#251A11',1);
    this.betLabel.fontFamily='Arial';this.betLabel.enableWrapText=false;this.betLabel.overflow=Label.Overflow.SHRINK;
    const ctl=(rect:Box,label:string,index:number,action:()=>void):{hit:Node;face:Node}=>{
      const pos=imagePoint(rect);const faceWidth=rect[2],faceHeight=rect[3];
      // Center the live button exactly on the circle painted into each
      // console. The old -30 offset straddled its lower fascia.
      const cssScale=cabinetLayout(Safe.visibleWidth,Safe.visibleHeight,g,Safe.safeTop,Safe.safeBottom).scale * (globalThis.innerWidth/Safe.visibleWidth);
      const minTouch=44/Math.max(.15,cssScale);
      const hit=box(this.plane!,label,pos[0],pos[1],Math.max(minTouch,faceWidth),Math.max(minTouch,faceHeight));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset='canopy-button-'+(theme*4+[0,2,1,3][index]);
      const face=this.art.image(hit,asset,0,0,faceWidth,faceHeight);
      this.cabinetButtonMotion(face,faceWidth,faceHeight,theme,index);
      bindPress(hit,face,()=>{ambient.land(-1);action();},[
        {depth:5,compression:.97,release:.12,tilt:-3},
        {depth:7,compression:.985,release:.14,tilt:0},
        {depth:4,compression:.94,release:.23,tilt:2},
        {depth:4,compression:.96,release:.18,tilt:-2},
      ][theme]);return {hit,face};
    };
    ctl(g.minus,'Decrease bet',2,()=>this.changeBet(-1));ctl(g.plus,'Increase bet',1,()=>this.changeBet(1));
    const spinControl=ctl(g.spin,'SPIN',0,()=>void this.spin()),spin=spinControl.hit;
    const spinCaption=outlined(text(spinControl.face,'SPIN',0,-5,142,70,43,'#FFF4D5'),'#422610',2);
    spinCaption.fontFamily='Arial Black';spinCaption.enableWrapText=false;spinCaption.overflow=Label.Overflow.SHRINK;
    // The secondary toggle sits in the opposite half of the lower console
    // fascia, leaving both the sculpted base and the mascot alcove unobstructed.
    const autoPoint=imagePoint(g.auto);
    const autoKey=this.art.button(this.plane,'AUTO',autoPoint[0],autoPoint[1],g.auto[2],g.auto[3],'AUTO OFF',undefined,()=>{
      this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');
      if(this.auto&&this.state.kind==='idle')void this.spin();
    },titleIndex);
    this.autoLamp=autoKey.getComponentInChildren(Label)!;
    autoKey.getComponent(UITransform)!.setContentSize(g.auto[2],Math.max(148,g.auto[3]));
    this.autoLamp.node.getComponent(UITransform)!.setContentSize(g.auto[2]*.82,68);
    this.autoLamp.fontSize=38;this.autoLamp.lineHeight=47;this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.15,g.spin[2]*1.15,65);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    // The cabinet's upper gilding already supplies the material. Separate
    // engraved emblems leave the marquee visible and the labels legible on a phone.
    // Keep the utility controls on the cabinet's side rails. The old centred
    // RULES medallion sat directly on top of the painted marquee crest and made
    // the cabinet look like two unrelated layers.
    // Place the living guardian in the physical foreground at the cabinet foot.
    // It must sit above the painted room, and below the separate safe-area UI.
    this.cabinetMascot(this.plane,titleIndex);
    const toolbar=box(this.content!,'Safe top tools',0,this.top-108-Safe.safeTop,1080,210);
    const tool=(name:string,x:number,label:string,iconIndex:number,action:()=>void,slotY=0):Label=>{
      const hit=box(toolbar,name,x,slotY,228,154);
      const face=this.art.image(hit,'interfaces',0,29,98,98,iconIndex);
      face.name=name+' engraved emblem';
      const caption=outlined(text(hit,tr(label),0,-46,220,62,40,'#FFF2D6',true),'#3F2414',2);
      caption.fontFamily='Arial Black';caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;
      bindPress(hit,face,()=>{action();},{depth:4,compression:.94,release:.19});
      if(name==='Audio')this.soundIcon=face.getComponent(Sprite)!;
      return caption;
    };
    tool('Back to salon',-370,'BACK',9,()=>void this.navigate('home'),0);
    tool('Rules',370,'RULES',12,()=>this.rules(),40);
    this.soundLamp=tool('Audio',370,'SOUND ON',10,()=>void this.toggleSound(),-125);this.updateSound();
    this.hintLabel=outlined(text(this.content!,MODES[GAME_CONFIGS.indexOf(cfg)],0,-this.top+80+Safe.safeBottom,960,108,43,COLORS.cream));
    this.hintLabel.node.getComponent(LabelOutline)!.width=2;this.hintLabel.node.getComponent('TextFit')!.enabled=true;this.hintLabel.fontSize=43;this.hintLabel.lineHeight=52;this.hintLabel.enableWrapText=false;this.hintLabel.overflow=Label.Overflow.SHRINK;this.hintLabel.getComponent(UITransform)!.setContentSize(960,108);
    const newcomer=!this.services.api?this.newcomerBenefit():undefined;
    if(newcomer)this.hintLabel.string=cabinetNewcomerCaption(newcomer.round);
    this.layoutPlane();
    if(this.force){this.scheduleOnce(()=>void this.spin(),1);}
  }
  private syncHintMaterial():void{
    const hint=this.hintLabel?.node;if(!hint||!this.content)return;
    let material=this.content.getChildByName('Award hint material');
    if(!material){
      // Feather into the engraved lower fascia; keep the painted medallion and
      // stone visible instead of laying a dark web-style strip behind the text.
      material=box(this.content,'Award hint material',0,0,930,108);
      material.setSiblingIndex(hint.getSiblingIndex());
      const shade=material.addComponent(Graphics);
      for(let i=0;i<64;i++){
        const u=(i+.5)/64,alpha=Math.round(86*Math.pow(Math.sin(Math.PI*u),1.6));
        const tone=this.config.id==='ruby-revel'?new Color(65,23,33,alpha):this.config.id==='jade-treasury'?new Color(22,39,66,alpha):this.config.id==='pearl-palace'?new Color(27,58,63,alpha):new Color(71,44,27,alpha);
        shade.fillColor=tone;
        shade.rect(-465,-54+i*108/64,930,108/64);shade.fill();
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
      toolbar.setPosition(0,h/2-108-Safe.safeTop);
      // Preserve the rail stacking at narrow widths: BACK stays left while
      // RULES and SOUND share the right rail like a real cabinet header.
      const reach=Math.min(370,Math.max(112,Safe.visibleWidth/2-Math.max(Safe.safeLeft,Safe.safeRight)-56));
      const back=toolbar.getChildByName('Back to salon');
      const rules=toolbar.getChildByName('Rules');
      const audio=toolbar.getChildByName('Audio');
      back?.setPosition(-reach,0);
      rules?.setPosition(reach,40);
      audio?.setPosition(reach,-125);
    }
    // Lift the lower engraving above the bottom edge on compact phones.
    this.hintLabel?.node.setPosition(0,-h/2+(h<1750?126:116)+Safe.safeBottom);
    this.syncHintMaterial();
  }
  private get bet():number{const pending=this.journal.pending();return pending?.gameId===this.config.id?pending.bet:this.config.bets[this.betIndex];}
  private changeBet(delta:number):void{
    if(this.state.kind!=='idle'){this.toast('Bet is locked while the reels are moving.');return;}
    const next=Math.max(0,Math.min(this.config.bets.length-1,this.betIndex+delta));
    if(next===this.betIndex){this.toast(delta<0?'Minimum bet selected.':'Maximum bet selected.');return;}
    this.betIndex=next;if(this.betLabel)this.betLabel.string=tr(money(this.bet));if(this.hintLabel)this.hintLabel.string=tr(`BET ${money(this.bet)} selected`);
  }
  private updateAuto():void{
    if(!this.autoLamp)return;
    this.autoLamp.string=tr(this.auto?'AUTO ON':'AUTO OFF');
    // Ivory and brushed-gold enamel need dark engraving. Updating the toggle
    // must retain that contrast instead of resetting every plaque to white.
    const lightEnamel=this.config.id==='golden-hour'||this.config.id==='pearl-palace';
    this.autoLamp.color=new Color(lightEnamel?(this.auto?'#173E31':'#49301D'):(this.auto?'#C8F7DA':'#FFF2D5'));
    const outline=this.autoLamp.node.getComponent(LabelOutline);
    if(outline){outline.color=new Color(lightEnamel?'#FFF4DC':'#251820');outline.width=lightEnamel?1:2;}
    Tween.stopAllByTarget(this.autoLamp.node);this.autoLamp.node.setScale(1,1,1);
    // Status typography stays fixed. Button enamel carries the motion, not the readout.
  }
  private updateSound(enabled=this.services.profile.current()?.settings.sound??true):void{if(this.soundLamp){this.soundLamp.string=tr(enabled?'SOUND ON':'SOUND OFF');this.soundLamp.color=new Color('#FFF2D6');}if(this.soundIcon)this.soundIcon.spriteFrame=this.art.frame('interfaces',enabled?10:11);}
  private async toggleSound():Promise<void>{
    const settings=this.services.profile.current()?.settings;if(!settings){this.toast('Sound settings are unavailable.');return;}
    const previous=settings.sound,next=!previous;if(previous)this.audio.play('tap');this.audio.setEffects(next);this.audio.setMusic(next);this.updateSound(next);if(next)this.audio.play('tap');
    const saved=await this.services.profile.updateSettings({sound:next,music:next});
    if(!saved){this.audio.setEffects(previous);this.audio.setMusic(settings.music);this.updateSound(previous);this.toast('Sound setting could not be saved.');return;}
    this.toast(next?'Sound on.':'Sound off.');
  }
  private newcomerBenefit():{round:number;minimum?:5|10}|undefined{
    const played=this.services.profile.current()?.gamesPlayed;
    const round=newcomerNextRound(played??-1);
    return round?{round,minimum:newcomerMinimum(played!)}:undefined;
  }
  private async spin():Promise<void>{
    if(this.page!=='game'||!this.reels||this.modal||this.busy)return;
    if(!complianceCurrent(this.services.save.read().compliance)){this.policyConsent();return;}

    if(this.state.kind!=='idle'&&this.state.kind!=='retry')return;
    const requestId=this.state.kind==='retry'?this.state.requestId:SecureRNG.id('salon-spin');
    const api=this.services.api;
    const recovering=this.state.kind==='retry';
    const chargedBet=this.bet;
    const newcomer=!recovering?this.newcomerBenefit():undefined;
    if(api){try{this.journal.begin(requestId,this.config.id,chargedBet);}catch{this.toast('Unable to save the round. Free device storage, then try again.');return;}}
    if(!api&&!this.services.economy.reserveSpin(requestId,chargedBet)){this.auto=false;this.updateAuto();this.toast('Not enough coins. Visit Rewards or the Coin Shop.');return;}
    this.resetWinAmount();
    this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.audio.setSpinning(true);this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string=tr('Treasures in motion…');
    let settled=false;
    try{
      let result:SpinResult;
      if(api){const response=await api.spin(this.config.id,chargedBet,requestId);result=response.result;this.journal.settle(requestId,result,response.balance);}
      else {
        const forcedTier=(['ordinary','big','super','mega','epic'] as const).find(tier=>tier===this.force);
        result=this.generator.generate(this.config,chargedBet,this.rng,{winTier:forcedTier,...(this.force==='frame-check'?{symbolId:this.config.symbols[0].id,count:Math.min(5,this.config.columns) as 3|4|5}:{}),newcomerMinimum:newcomer?.minimum});this.force=undefined;
        if(!this.services.economy.settleSpin(requestId,result.totalWin))throw new Error('Settlement failed');
      }
      settled=true;await this.reels.finish(result);this.audio.setSpinning(false);
      this.state={kind:'presenting',result};if(result.totalWin>0)this.plane?.getComponentInChildren(CabinetGuardian)?.celebrate();this.reels.highlight(result.wins.flatMap(w=>[...w.positions]));
      await this.presentAwardEvidence(result);
      if(result.featureResult)await this.presentFeature(result);
      if(result.totalWin>0)await this.presentWin(result.totalWin,chargedBet,result.wins.some(w=>w.symbolId==='newcomer-benefit'));
      this.resetWinAmount(result.totalWin);
      if(this.hintLabel){const next=this.newcomerBenefit();this.hintLabel.string=cabinetRoundCaption(result,chargedBet,next?.round);}
      this.state={kind:'idle'};this.refreshBalance();this.refreshTopWin();this.autoWait=.8;
    }catch(error){
      this.audio.setSpinning(false);this.audio.endCelebration();this.auto=false;this.updateAuto();console.error(error);
      if(settled){this.closeModal();this.state={kind:'idle'};this.reels.show(this.config.reelStrips.flatMap(s=>s.slice(0,this.config.rows)));this.refreshBalance();this.toast('Your round is settled and your coins are safe. You can spin again.');}
      else if(api){
        this.reels.show(this.config.reelStrips.flatMap(s=>s.slice(0,this.config.rows)));
        if(!recovering&&error instanceof ApiRequestError&&error.definitive){this.journal.reject(requestId);this.state={kind:'idle'};this.toast(error.message);}
        else{this.state={kind:'retry',requestId};this.toast('Round saved. Reconnect and tap SPIN to retrieve the same round, with no second bet.');}
      }
      else{this.services.economy.cancelReservation(requestId);this.state={kind:'idle'};this.reels.show(this.config.reelStrips.flatMap(s=>s.slice(0,this.config.rows)));this.toast('Round interrupted. Your wallet has been preserved.');}
    }
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
        else if(round.motion==='respin'){this.audio.setSpinning(true);this.audio.play('spin');await reels.respinCells(round.grid,round.held??[]);this.audio.setSpinning(false);}
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
      text(panel,'Choose a vault to reveal your treasure',0,190,850,91,39,COLORS.ink);
      text(panel,'The prize is already drawn. Your choice does not change the odds.',0,-231,851,120,31,COLORS.ink);
      await new Promise<void>(resolve=>{
        let chosen=false;
        const reveal=(i:number):void=>{
          if(chosen)return;chosen=true;this.audio.play('win');
          const award=feature.pickAwards?.[i]??feature.totalCredits;
          text(panel,money(award)+' COINS',0,-127,850,106,56,COLORS.ink,true);
          void Promise.all([this.countWinAmount(result.baseWin+feature.totalCredits,result.totalWin),this.delay(this.reduced?.15:1.3)]).then(()=>{this.closeModal();resolve();});
        };
        for(let i=0;i<3;i++){
          const hit=box(panel,'Open vault '+(i+1),(i-1)*278,26,240,270);
          const treasure=this.art.image(hit,symbolAtlas(this.config.id),0,0,237,237,symbolArt(this.config.id,'safe'));bindPress(hit,treasure,()=>reveal(i));
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
      if(this.hintLabel)this.hintLabel.string=tr(round.caption?round.caption:feature.type==='ruby-cascade'?`CROWN CASCADE · ${round.multiplier}×`:feature.type==='jade-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`PEARL WILD · ${round.index} OF ${feature.rounds.length}`);
      if(round.removed||feature.type==='ruby-cascade')await reels.collapseTo(round.grid,round.removed??[]);
      else if(round.caption)await reels.transformTo(round.grid,round.focus);
      else{reels.begin();this.audio.setSpinning(true);this.audio.play('spin');await reels.finishGrid(round.grid,true);this.audio.setSpinning(false);}
      if(round.caption&&this.hintLabel)this.hintLabel.string=tr(round.caption)+' · '+round.index+'/'+feature.rounds.length+(round.multiplier?' · '+round.multiplier+'×':'');
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
    if(this.winLabel?.isValid)this.winLabel.string=tr('WIN  '+money(amount));
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
      }}).call(()=>{if(label.isValid&&label===this.winLabel)this.writeWinAmount(amount,total);finish();}).start();
    });
  }
  private async presentWin(amount:number,chargedBet:number,welcomeBonus=false):Promise<void>{
    if(winTierForRound(amount,chargedBet)>0){
      const stage=box(this.root!,'Treasure celebration',0,0,1080,this.height);this.modal=stage;stage.addComponent(BlockInputEvents);
      // The complete cabinet stays behind the opaque room during its aperture reveal.
      // Only the outer HUD fades with it, so no parts vanish before the scene
      // arrives and no isolated labels linger across the painted architecture.
      const hidden=[this.hintLabel?.node,this.content?.getChildByName('Award hint material'),this.content?.getChildByName('Safe top tools')].filter((n):n is Node=>!!n&&n.active);
      const fades=hidden.map(n=>({node:n,alpha:n.getComponent(UIOpacity)??n.addComponent(UIOpacity)}));
      const prior=fades.map(f=>f.alpha.opacity);
      let restored=false;
      const restoreScene=():void=>{
        if(restored)return;restored=true;
        fades.forEach((f,i)=>{if(f.node.isValid){Tween.stopAllByTarget(f.alpha);tween(f.alpha).to(this.reduced?.01:AWARD_EXIT_SECONDS,{opacity:prior[i]},{easing:'sineInOut'}).start();}});
      };
      try{
        fades.forEach(f=>tween(f.alpha).to(this.reduced?.01:AWARD_ENTER_SECONDS,{opacity:0},{easing:'sineInOut'}).start());
        this.audio.playCelebration(amount/chargedBet);await stage.addComponent(SalonWinStage).setup(this.art,amount,this.height,this.reduced,amount/chargedBet,GAME_CONFIGS.indexOf(this.config),welcomeBonus,restoreScene,{reveal:()=>this.audio.revealCelebration(),exit:seconds=>this.audio.closeCelebration(seconds)});
      }finally{
        this.audio.endCelebration();
        restoreScene();
        if(this.modal===stage)this.closeModal();
      }
    }else{
      if(amount>this.presentedWin)this.audio.playAward(0);
      const stage=box(this.content!,'Ordinary win presentation',0,0,1080,this.height);
      const hidden=[this.hintLabel?.node,this.content?.getChildByName('Award hint material')].filter((n):n is Node=>!!n&&n.active);
      hidden.forEach(n=>n.active=false);
      try{
        await Promise.all([this.countWinAmount(amount),stage.addComponent(OrdinaryWinStage).setup(this.art,amount,Safe.visibleHeight,this.reduced,chargedBet,{y:-Safe.visibleHeight/2+290+Safe.safeBottom,width:980})]);
      }finally{
        if(stage.isValid)stage.destroy();
        hidden.forEach(n=>{if(n.isValid)n.active=true;});
      }
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=tr(money(this.services.economy.balance()));}
  private refreshTopWin():void{if(this.topWinLabel)this.topWinLabel.string='TOP '+topWinMoney(this.services.profile.current()?.biggestWin??0);}
  private delay(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,this.reduced?Math.min(.12,seconds):seconds));}
  protected update(dt:number):void{const fx=this.plane?.getChildByName('Cabinet reflections')?.getComponent(SalonAtmosphere);if(fx)fx.energy=this.state.kind==='spinning'?1:this.state.kind==='presenting'?.6:0;this.plane?.getComponentInChildren(CabinetGuardian)?.watch(this.state.kind==='spinning');if(this.auto&&this.visible&&this.state.kind==='idle'&&this.page==='game'&&!this.modal){this.autoWait-=dt;if(this.autoWait<=0){this.autoWait=1;void this.spin();}}}
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
    // Keep the physical key stationary at rest so its press/release spring
    // remains precise. A single clipped enamel highlight supplies idle life.
    const phase=theme*.47+index*1.31;
    this.sheen(face,w*.69,h*.64,phase);
    const glint=this.art.light(face,3,(index%2?1:-1)*w*.28,h*.23,Math.min(w,h)*.21,Math.min(w,h)*.21,0);
    glint.name='Inset button enamel reflection';
    const alpha=glint.getComponent(UIOpacity)!;alpha.opacity=0;
    tween(alpha).delay(phase).repeatForever(tween()
      .to(.5,{opacity:118},{easing:'sineOut'})
      .to(.9,{opacity:0},{easing:'sineInOut'})
      .delay(4.9+index*.55)).start();
  }
  /** Let the painted letters move gently while the engraved metal stays fixed. */
  private artTitleMotion(n:Node,phase=0):void{
    if(this.reduced)return;
    const home=n.position.clone(),glow=opacity(n,255);
    tween(n).delay(phase).repeatForever(tween()
      .to(2.7,{position:new Vec3(home.x,home.y+3,home.z)},{easing:'sineInOut'})
      .to(3.1,{position:home},{easing:'sineInOut'})).start();
    tween(glow).delay(phase).repeatForever(tween()
      .to(2.7,{opacity:239},{easing:'sineInOut'})
      .to(3.1,{opacity:255},{easing:'sineInOut'})).start();
    this.sheen(n,n.getComponent(UITransform)!.width*.92,n.getComponent(UITransform)!.height*.72,phase+1.3);
  }
  private sheen(n:Node,w:number,h:number,delay=0):void{if(this.reduced)return;const clip=box(n,'Inset metal sheen',0,0,w-12,h-12);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;const beam=this.art.light(clip,2,-w,0,h*2.2,h*2.2,38);beam.setScale(.35,1.6,1);beam.angle=-24;tween(beam).delay(delay).repeatForever(tween().to(1.6,{position:new Vec3(w,0,0)},{easing:'sineInOut'}).call(()=>beam.setPosition(-w,0)).delay(4.5)).start();}
  private breathe(n:Node,delay=0):void{if(this.reduced)return;tween(n).delay(delay).to(1.8,{angle:5},{easing:'sineInOut'}).to(3.6,{angle:-5},{easing:'sineInOut'}).to(1.8,{angle:0},{easing:'sineInOut'}).union().repeatForever().start();const origin=n.position.clone();tween(n).delay(delay).repeatForever(tween().to(2.8,{position:new Vec3(origin.x,origin.y+27,origin.z)},{easing:'sineInOut'}).to(2.8,{position:origin},{easing:'sineInOut'})).start();}
  /** Low-amplitude motion belongs to artwork; labels and hit regions stay fixed. */
  private idleAccent(n:Node,delay=0,lift=6,tilt=3,pace=1):void{
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
    const stage=this.pageStage("THE JEWEL EXCHANGE"),stamp=this.generation;
    this.art.image(stage,'canopy-soft-plate-0',0,625,940,165);
    text(stage,"THE JEWEL EXCHANGE",0,625,820,92,43,COLORS.ink,true);
    // A slim opaque ribbon shields the status from the pendant on the shared
    // service-room artwork, without covering the first supply's engraving.
    this.art.image(stage,'canopy-soft-plate-0',0,485,840,104);
    text(stage,this.services.remoteMode?'Choose a coin supply':'Purchases unavailable',-92,485,555,66,37,COLORS.ink);
    this.art.button(stage,'Synchronize purchases',292,485,225,76,'Sync',undefined,()=>void this.restorePurchases(),0);
    // A single wide enamel ledger per supply keeps the amount and purchase
    // status in the calm center of the material, clear of the sculpted ends.
    const positions=[325,190,55,-80];
    // The environment painting already provides the ivory ledger and rim.
    const separators=box(stage,'Ledger engraved divisions',0,0,850,900).addComponent(Graphics);
    for(const y of [257,122,-13]){
      separators.strokeColor=new Color(83,59,34,80);separators.lineWidth=2;
      separators.moveTo(-368,y);separators.lineTo(368,y);separators.stroke();
      separators.strokeColor=new Color(255,238,194,96);separators.lineWidth=1;
      separators.moveTo(-359,y-3);separators.lineTo(359,y-3);separators.stroke();
    }
    void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;
      items.slice(0,4).forEach((item,i)=>{const node=box(stage,'Supply '+item.id,0,positions[i],868,184);
        const total=item.credits+item.bonus,bonus=Math.round(item.bonus/item.credits*100);
        const art=this.art.image(node,symbolAtlas(GAME_CONFIGS[i].id),-266,0,120,120,[0,1,5,9][i]);
        if(!this.reduced){const alpha=opacity(art,245);tween(alpha).to(2.5+i*.3,{opacity:185},{easing:'sineInOut'}).to(2.5+i*.3,{opacity:245},{easing:'sineInOut'}).union().repeatForever().start();}
        const amount=text(node,money(total),-38,25,350,63,58,COLORS.ink,true);amount.enableWrapText=false;
        text(node,bonus?bonus+'% BONUS':'STANDARD',-25,-31,310,60,38,COLORS.ink,true).enableWrapText=false;
        const price=item.available?item.displayPrice:'Offline';
        this.art.image(node,'canopy-button-'+(i*4+2),260,31,49,49);
        text(node,price,265,-23,164,54,39,COLORS.ink,true).enableWrapText=false;
        bindPress(node,node,()=>void this.purchase(item.id));
      });
    }).catch(()=>this.toast('Shop unavailable. Please try again.'));
    this.art.image(stage,'canopy-soft-plate-0',0,-485,720,68);
    text(stage,'Virtual coins · No cash value',0,-485,620,62,38,COLORS.ink);
  }

  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}catch{this.toast('Unable to connect. Please try again.');}finally{this.busy=false;}}
  private async restorePurchases():Promise<void>{
    if(this.busy)return;this.busy=true;
    try{const r=await this.services.store.restore();this.refreshBalance();this.toast(r.message);}
    catch{this.toast('Unable to restore purchases. Please try again.');}
    finally{this.busy=false;}
  }
  private rewardsPage():void{
    const stage=this.pageStage("SEVEN TURNS OF FORTUNE"),scope=this.services.save.currentScope(),today=new Date().toISOString().slice(0,10),progress=scope?.checkIn,claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);
    this.art.image(stage,'canopy-soft-plate-0',0,625,940,165);
    text(stage,"SEVEN TURNS OF FORTUNE",0,625,820,92,43,COLORS.ink,true);
    // Keep the day state above the check-in grid on its own engraved ribbon.
    this.art.image(stage,'canopy-soft-plate-0',0,480,840,104);
    text(stage,tr('DAY '+(active+1))+' · '+tr(claimed?'COLLECTED':'READY TO CLAIM'),0,480,760,66,37,COLORS.ink);
    // Two-column ledger gives every day a full-width face on compact phones.
    const spots:number[][]=[[-242,362],[242,362],[-242,210],[242,210],[-242,58],[242,58],[0,-94]];
    this.services.checkIn.rewards.forEach((amount,i)=>{const [x,y]=spots[i],current=i===active,done=i<active||(current&&claimed),node=box(stage,'Check-in day '+(i+1),x,y,430,146);
      this.art.image(node,'canopy-soft-plate-0',0,0,430,146);
      // The painted enamel center is a narrow strip: keep both facts on one row.
      text(node,'DAY '+(i+1),-42,0,153,66,38,COLORS.ink,true);
      text(node,money(amount),105,0,154,66,40,COLORS.ink,true);
      if(current){const glint=this.art.light(node,3,79,0,128,38,this.reduced?70:45);glint.setSiblingIndex(1);if(!this.reduced){const alpha=glint.getComponent(UIOpacity)!;tween(alpha).to(1.6,{opacity:140},{easing:'sineInOut'}).to(1.6,{opacity:45},{easing:'sineInOut'}).union().repeatForever().start();}}
      bindPress(node,node,()=>{if(current&&!claimed)void this.claim('check-in');else this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Upcoming'));});
    });
    this.art.button(stage,'Check in',0,-322,836,94,claimed?'DAY '+(active+1)+' COLLECTED':'CLAIM DAY '+(active+1)+' · '+money(this.services.checkIn.rewards[active]),undefined,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next reward after 00:00 UTC.');},2);
    const daily=this.art.panel(stage,0,-534,912,230,0),collected=!!scope?.claims['daily-free:'+today];
    this.art.image(daily,'symbols',-314,0,147,147,5);outlined(text(daily,'DAILY GIFT · '+money(ECONOMY.daily),109,32,573,64,38,COLORS.ink,true),'#FFF1D3',1);
    this.art.button(daily,'Claim daily',109,-39,530,72,collected?'COLLECTED':'Collect daily gift',undefined,()=>{if(!collected)void this.claim('daily');else this.toast('Today’s gift is already collected.');},1);
    text(stage,'Rewards reset at 00:00 UTC',0,-412,750,64,37,COLORS.ink);
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
    const stage=this.pageStage('Atelier honours');
    this.art.image(stage,'canopy-soft-plate-0',0,625,940,165);
    text(stage,'ATELIER HONOURS',0,625,820,92,43,COLORS.ink,true);
    const stamp=this.generation;const render=(players=this.services.rank.list('all-time',this.services.profile.current())):void=>{if(stamp!==this.generation)return;
      const profile=this.services.profile.current();
      if(!this.services.remoteMode&&profile&&!players.some(p=>p.current))players=[...players,{rank:players.length+1,nickname:profile.nickname,winnings:profile.totalWin,avatar:profile.avatar,current:true}];
      const ranked=this.services.remoteMode?players.map(p=>({...p,virtual:false})):hallStandings(players),current=ranked.find(p=>p.current),visible=ranked.slice(0,7);
      // Keep the player's actual mixed rank visible even when outside the first six.
      if(current&&!visible.some(p=>p.current))visible[6]=current;
      // The honours sit inside the room painting's ivory ledger.
      this.art.image(stage,'canopy-soft-plate-0',0,502,832,88);
      text(stage,'VIRTUAL FRIENDS · TOTAL WON',0,502,720,64,35,COLORS.ink);
      const trophy=this.art.image(stage,'interfaces',-306,335,165,165,3);this.idleAccent(trophy,0,7,.4,1.8);
      if(!visible.length){text(stage,'No settled rankings yet',0,150,800,100,36,COLORS.ink);return;}
      const first=visible[0],compactRank=this.height<1950,firstLift=compactRank?0:18;
      const portrait=this.art.image(stage,'portraits',-151,335+firstLift,133,133,first.avatar);this.idleAccent(portrait,0,5,.3,1.8);
      const firstX=compactRank?72:144;
      text(stage,'#'+first.rank,-310,237+firstLift,130,62,40,COLORS.ink,true);
      text(stage,first.nickname,firstX+20,345+firstLift,compactRank?404:424,76,42,COLORS.ink,true).enableWrapText=false;
      text(stage,money(first.winnings),firstX,280+firstLift,compactRank?335:394,67,51,COLORS.ink,true).enableWrapText=false;
      text(stage,first.current?'YOU':first.virtual?'VIRTUAL FRIEND':'PLAYER',firstX,220+firstLift,compactRank?335:394,47,33,COLORS.ink);
      visible.slice(1).forEach((r,i)=>{
        // One reading line per entry: the ledger header identifies example
        // opponents, while names and values keep independent clear columns.
        const row=box(stage,r.current?'Your hall rank':'Hall rank '+r.rank,0,165-i*(compactRank?50:52),854,compactRank?50:52);
        text(row,'#'+r.rank,-338,0,78,49,34,COLORS.ink,true);
        const face=this.art.image(row,'portraits',-248,0,68,68,r.avatar);
        const name=r.current?r.nickname+' · '+tr('YOU'):r.nickname;
        const nickname=text(row,name,-32,0,345,51,39,COLORS.ink,true,true);nickname.enableWrapText=false;
        const winnings=text(row,money(r.winnings),compactRank?225:270,0,compactRank?142:152,53,compactRank?37:39,COLORS.ink,true);winnings.enableWrapText=false;
        if(r.virtual)this.idleAccent(face,i*.7,3,.2,2);
        this.reveal(row,i*.1);
      });
      // Compact phones place the shared navigation immediately below the
      // ranking parchment. Seat this action in its open lower area instead
      // of letting its touch bounds overlap the Hall and Rank rail keys.
      this.art.button(stage,'Explore games',0,this.height<1950?-420:-460,838,101,'Try another vault',6,()=>void this.navigate('home'),3);
    };
    if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load honours.'));else render();
  }

  /** The cabinet base is painted with an empty niche and real stone plinth.
   * The raised limb overlaps a commissioned, solid hidden shoulder,
   * so the mascot stays grounded as it invites the player into the atelier. */
  private cabinetMascot(parent:Node,index:number):void{
    const names=['coin','sapphire','pearl','ruby'] as const;
    // Measurements are in the cabinet plane after the scene is fitted to the
    // live reel opening. The feet land on the four authored plinths.
    const size=[532,528,548,538][index];
    const x=[-262,268,294,-262][index];
    // Contact is measured from the actual sole alpha, not the canvas edge.
    const platformY=[-906,-908,-926,-944][index];
    const solePixel=[974,968,977,977][index];
    const footY=platformY-(1024-solePixel)*size/1024;
    const stand=box(parent,`${names[index]} built-in alcove guardian`,x,footY,1,1);
    // The new complete Pearl/Ruby poses breathe around their actual soles.
    // This keeps the feet grounded instead of pivoting on the canvas centre.
    const contactX=[512,512,355,650][index];
    const contactDx=(contactX-512)*size/1024;
    const contactDy=index>=2?(1024-solePixel)*size/1024:0;
    if(index>=2){
      // Footprints follow the perspective of the original painting, not one
      // generic oval under the canvas centre. All units refer to its 1024px
      // master. The pearl offering has its own stationary contact shadow.
      const footprints:ReadonlyArray<readonly[number,number,number,string]> = index===2
        ? [[267,973,286,'Left webbed foot contact'],[449,948,222,'Right webbed foot contact'],[622,960,202,'Pearl gift contact']]
        : [[374,946,258,'Seated hind paw contact'],[650,976,286,'Planted forepaw contact'],[779,938,134,'Far hind paw contact']];
      for(const [sx,sy,width,name] of footprints){
        const span=width*size/1024;
        const shadow=this.art.image(stand,'guardian-contact-shadow',(sx-512)*size/1024,
          (1024-sy)*size/1024,span,span*.25);
        shadow.name=name;opacity(shadow,name==='Pearl gift contact'?176:208);
      }
    }else{
      const shadow=this.art.image(stand,'guardian-contact-shadow',contactDx,platformY-footY,size*.44,25);
      shadow.name='Soft contact on the carved plinth';
    }
    const body=box(stand,'Guardian standing on the plinth',contactDx,contactDy,1,1);
    this.art.image(body,'guardian-'+names[index],-contactDx,size*.50-contactDy,size,size);
    // Shoulder coordinates are mapped from the matching transparent 1024px
    // sprite sheet. A separate pivot gives a visible fortune beckon without
    // shaking the cabinet or making the character slide off its platform.
    const shoulder:ReadonlyArray<readonly[number,number]>=[
      [-.127757,.141027],[.194205,.075106],[3/1024,-14/1024],[-50/1024,-53/1024],
    ];
    const [px,py]=shoulder[index];
    const arm=box(body,'Raised paw or wing · fortune beckon',px*size-contactDx,(.5+py)*size-contactDy,1,1);
    this.art.image(arm,'guardian-'+names[index]+'-wave',-px*size,-py*size,size,size);
    if(index===2){
      // The pearl is a gift on the plinth, never an extra wing or moving hand.
      const offering=this.art.image(stand,'guardian-pearl-offering',0,size*.50,size,size);
      offering.name='Pearl gift seated on the plinth';
    }
    // Same-master Pearl/Ruby torsos conceal the full limb's shoulder joint;
    // placing the wave behind them prevents a duplicated foreleg/wing edge.
    if(index>=2)arm.setSiblingIndex(0);
    const life=stand.addComponent(CabinetGuardian);life.setup(body,arm,index);life.reducedMotion=this.reduced;
  }

  /** The atelier guides share material language with their own cabinet art.
   *  Animate the figure and the object highlight on different beats; never
   *  move the whole cabinet or any input hit area. */
  private craftMascot(parent:Node,index:number,x:number,y:number,size:number,place:'hall'|'cabinet'):void{
    const names=['coin','sapphire','pearl','ruby'] as const;
    const guide=box(parent,`${names[index]} artisan · ${place}`,x,y,size,size);
    const niche=this.art.light(guide,1,0,-size*.08,size*.9,size*.9,25);
    const nicheOpacity=niche.getComponent(UIOpacity)!;
    const figure=this.art.image(guide,'mascot-'+names[index],0,0,size,size);
    figure.name=`${names[index]} artisan character`;
    const jewelPositions:ReadonlyArray<readonly[number,number]>=[[.29,.20],[.32,.19],[.13,.04],[-.27,.21]];
    const [jx,jy]=jewelPositions[index];
    const jewel=this.art.light(figure,3,jx*size,jy*size,size*.27,size*.27,0);
    jewel.name='Held jewel reflection';
    if(this.reduced)return;
    const phase=index*.52+(place==='hall'?.3:1.1),glow=jewel.getComponent(UIOpacity)!;
    tween(figure).delay(phase).repeatForever(tween()
      .to(2.7,{position:new Vec3(0,place==='hall'?34:32,0),angle:2.3,scale:new Vec3(1.035,1.035,1)},{easing:'sineInOut'})
      .to(3.3,{position:new Vec3(0,-7,0),angle:-1.4,scale:new Vec3(1,1,1)},{easing:'sineInOut'})
      .to(2.1,{position:new Vec3(0,0,0),angle:0},{easing:'sineInOut'})).start();
    tween(glow).delay(phase+1.3).repeatForever(tween()
      .to(.62,{opacity:155},{easing:'sineOut'})
      .to(1.55,{opacity:12},{easing:'sineInOut'}).delay(2.8)).start();
    tween(nicheOpacity).delay(phase+.4).repeatForever(tween()
      .to(2.6,{opacity:65},{easing:'sineInOut'})
      .to(3.4,{opacity:18},{easing:'sineInOut'})).start();
  }

  private profilePage():void{
    const stage=this.pageStage("GOLDSMITH'S JOURNAL"),p=this.services.profile.current();if(!p)return;
    const balance=this.services.economy.balance(),ledger=this.services.save.currentScope()?.transactions??[];
    this.art.image(stage,'canopy-soft-plate-0',0,625,940,165);
    text(stage,"GOLDSMITH'S JOURNAL",0,625,820,92,43,COLORS.ink,true);
    // Print the account directly on the marble journal in the room painting.
    const portrait=this.art.image(stage,'portraits',-290,366,166,166,p.avatar);
    bindPress(portrait,portrait,()=>this.avatars());
    const nickname=outlined(text(stage,p.nickname,125,385,370,60,45,COLORS.ink,true),'#FFF4D8',2);nickname.enableWrapText=false;
    bindPress(nickname.node,nickname.node,()=>this.editNickname());
    text(stage,p.isGuest?'GUEST · LEVEL '+p.level:'MEMBER · LEVEL '+p.level,125,317,410,62,35,COLORS.ink);
    this.art.button(stage,'Edit nickname',125,255,370,92,'Edit name',undefined,()=>this.editNickname(),0);
    const stat=(x:number,y:number,label:string,value:number):void=>{
      text(stage,label,x,y+35,286,62,35,COLORS.ink,true);
      const v=text(stage,money(value),x,y-25,286,66,46,COLORS.ink,true);v.enableWrapText=false;
    };
    const compactProfile=this.height<1950 || Safe.visibleWidth/this.height<.65;
    stat(compactProfile?-160:-190,140,'TREASURY',balance);stat(compactProfile?160:190,140,'ROUNDS',p.gamesPlayed);
    stat(compactProfile?-160:-190,compactProfile?-5:25,'BEST WIN',p.biggestWin);stat(compactProfile?160:190,compactProfile?-5:25,'TOTAL WON',p.totalWin);
    text(stage,'COIN JOURNAL',0,compactProfile?-113:-57,750,55,38,COLORS.ink,true);
    text(stage,compactProfile?ledger.length+' saved entries':ledger.length+' recorded entries · Saved to your account',0,compactProfile?-161:-101,780,49,compactProfile?29:30,COLORS.ink);
    this.art.button(stage,'Open coin history',0,compactProfile?-295:-262,656,100,'View history',undefined,()=>this.history(),2);
    // Portrait phones use two readable keys above a full-width options key.
    // Wider layouts retain direct privacy and account actions.
    if(compactProfile){
      this.art.button(stage,'Account portrait',-226,-477,420,90,'Portrait',undefined,()=>this.avatars(),0);
      this.art.button(stage,'Account language',226,-477,420,90,'Language',undefined,()=>this.languages(),2);
      this.art.button(stage,'Account options',0,-584,744,90,'Options',undefined,()=>this.accountOptions(),0);
    }else{
      const links:[string,()=>void][]=[['Portrait',()=>this.avatars()],['Language',()=>this.languages()],['Privacy',()=>this.legal('privacy')]];
      links.forEach(([label,action],i)=>this.art.button(stage,'Account '+label,(i-1)*306,-526,280,92,label,undefined,action,i===1?2:0));
    }
    if(!compactProfile){
      this.art.button(stage,'Sign out',-229,-654,429,88,'Sign out',undefined,()=>void this.signOut(),0);
      this.art.button(stage,'Delete account',229,-654,429,88,'Delete account',undefined,()=>this.deleteAccount(),0);
    }
  }

  private accountOptions():void{
    const panel=this.sheet('Account options',660);
    // Seat the caption in the clear center of the parchment below the metal rim.
    const heading=panel.getChildByName('Text:Account options');
    heading?.setPosition(0,205);
    heading?.getComponent(UITransform)?.setContentSize(660,84);
    this.art.button(panel,'Account privacy',0,102,720,96,'Privacy & Data',undefined,()=>this.legal('privacy'),0);
    this.art.button(panel,'Account sign out',0,-42,720,96,'Sign out',undefined,()=>void this.signOut(),0);
    this.art.button(panel,'Account delete',0,-187,720,96,'Delete account',undefined,()=>this.deleteAccount(),0);
  }

  private languages():void {
    if(this.busy)return;
    const panel=this.sheet('Choose language',1010);
    LANGUAGES.forEach((entry,i)=>{const n=this.art.button(panel,'Locale '+entry.code,0,270-i*122,760,110,entry.name,entry.code===language()?14:7,()=>{setLanguage(entry.code);this.closeModal();this.render();this.toast('Language saved.');},entry.code===language()?3:0);});
    // The language choice persists locally; confirmation is shown on selection.
    // The old footer landed inside the illustrated frame's bottom ornament.
  }

  private async signOut():Promise<void>{
    if(this.busy)return;this.services.auth.logout();this.authExpanded=false;this.draft.password=this.draft.confirmPassword='';await this.navigate('login');
  }
  private editNickname():void {
    if(this.busy)return;
    const player=this.services.profile.current();if(!player)return;
    const panel=this.sheet('Edit nickname',650);let value=player.nickname;
    text(panel,'Use 2–18 characters',0,103,680,64,35,COLORS.ink);
    this.field(panel,'Nickname',-6,value,v=>value=v);
    const error=text(panel,'',0,-108,710,62,32,COLORS.ink);
    this.art.button(panel,'Save nickname',0,-216,710,106,'Save nickname',14,()=>{
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
  private history():void{const s=this.sheet('Your coin ledger',1190);s.getChildByName('Text:Your coin ledger')?.setPosition(0,420);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,300-i*120,840,115,1);outlined(text(n,r.type.replace(/-/g,' '),-168,0,356,68,34,COLORS.cream),'#3A2010',2);const amount=outlined(text(n,(r.amount>0?'+':'')+exactMoney(r.amount),209,0,286,64,36,COLORS.cream),'#3A2010',2);amount.enableWrapText=false;});if(!rows.length){const icon=this.art.image(s,'interfaces',0,156,220,220,1);this.idleAccent(icon,0,7,.3,1.5);text(s,'Your coin ledger is ready',0,-20,820,90,40,COLORS.ink,true);text(s,'Collect a reward or play a round.\nYour coin activity will appear here.',0,-132,820,142,34,COLORS.ink);this.art.button(s,'Ledger rewards',0,-302,730,108,'Explore rewards',2,()=>{this.closeModal();void this.navigate('rewards');},0);}}
  private deleteAccount():void{const s=this.sheet('Delete account & data',840);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,140,830,174,36,COLORS.ink);this.field(s,'Password (not needed for guest)',-78,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-285,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void {
    const panel=this.sheet('Mailbox',1110),items=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).deleted);
    // The painted rim crosses the generic dialog title. Seat this heading on
    // the clear parchment below it; row copy is light against dark walnut.
    const heading=panel.getChildByName('Text:Mailbox');heading?.setPosition(0,427);
    text(panel,'Gifts and notices',0,352,750,55,34,COLORS.ink);
    items.forEach((m,i)=>{const state=this.services.mail.state(m.id),row=this.art.panel(panel,0,230-i*210,840,177,0);
      const icon=this.art.image(row,'interfaces',-293,0,94,94,state.read?5:2);
      const subject=outlined(text(row,m.title,45,24,540,54,36,COLORS.ink),'#FFF1D3',1);subject.enableWrapText=false;
      outlined(text(row,state.claimed?'Attachment collected':m.credits?money(m.credits)+' COINS':state.read?'Read':'Unread',45,-25,530,48,31,COLORS.ink),'#FFF1D3',1);
      bindPress(row,icon,()=>this.openMail(m.id));row.name='Mail item '+m.id;
    });
    if(!items.length)text(panel,'Your mailbox is empty',0,90,740,110,39,COLORS.ink);
    this.art.button(panel,'Claim all mail',-200,-391,390,100,'Collect all',14,()=>{if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}const amount=this.services.mail.claimAll();this.render();this.mail();this.toast(amount?money(amount)+' coins collected':'No attachments to collect');},0);
    this.art.button(panel,'Clear read mail',200,-391,390,100,'Clear read',9,()=>{this.services.mail.deleteRead();this.render();this.mail();},0);
    outlined(text(panel,'Unclaimed gifts remain',0,-465,700,50,37,COLORS.ink),'#FFF1D3',2);
  }
  private openMail(id:string):void {
    const item=INBOX_MESSAGES.find(m=>m.id===id);if(!item)return;
    this.services.mail.read(id);this.render();const panel=this.sheet('Letter',920),state=this.services.mail.state(id);
    text(panel,item.title,0,254,770,85,38,COLORS.ink,true);
    text(panel,item.body,0,112,740,160,33,COLORS.ink);
    const gift=this.art.image(panel,item.credits?'symbols':'interfaces',0,-70,140,140,item.credits?0:5);
    text(panel,item.credits?money(item.credits)+' COINS':'System notice',0,-173,700,55,37,COLORS.ink);
    this.art.button(panel,'Collect mail attachment',0,-277,730,100,state.claimed?'Attachment collected':item.credits?'Collect attachment':'Back to mailbox',14,()=>{
      if(!item.credits||state.claimed){this.mail();return;}
      if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}
      if(this.services.mail.claim(id)){this.audio.play('win');this.render();this.openMail(id);this.toast(money(item.credits)+' coins collected');}
    },0);
    this.art.button(panel,'Back to mailbox',0,-383,580,76,'Back to mailbox',9,()=>this.mail(),0);
  }
  private ruleTab(parent:Node,name:string,x:number,label:string,selected:boolean,action:()=>void):void{
    // Parchment navigation needs unobstructed copy; a row of miniature framed
    // plates made the metal emblems collide with the words on small phones.
    const hit=box(parent,name,x,550,244,86);
    const face=box(hit,'Engraved tab face',0,0,244,86);
    const line=face.addComponent(Graphics);
    line.strokeColor=new Color(selected?'#F4D187':'#8A613E');line.lineWidth=selected?5:2;
    line.moveTo(-99,-30);line.lineTo(99,-30);line.stroke();
    const caption=outlined(text(face,label,0,6,228,60,selected?38:35,selected?'#183E46':COLORS.ink),'#FFF1D3',1);
    caption.fontFamily='Arial';caption.enableWrapText=false;
    bindPress(hit,face,action,{depth:2,compression:.98,release:.17});
  }
  private howToPlay(page=0):void{
    this.auto=false;this.updateAuto();const cfg=this.config,s=this.ruleSheet(helpTitle());
    this.ruleTab(s,'Payout rules',-270,'PAYOUTS',false,()=>this.rules(0,false,true));
    this.ruleTab(s,'Feature rules',0,'FEATURES',false,()=>this.rules(0,true));
    this.ruleTab(s,'Rule diagram',270,helpTitle(),true,()=>this.howToPlay(page));
    drawRuleHelp(s,cfg,this.art,page,next=>this.howToPlay(next));
  }
  private rules(band=0,features=false,payoutFirst=false):void{
    this.auto=false;this.updateAuto();const cfg=this.config,s=this.ruleSheet(cfg.name+' · Rules');
    this.ruleTab(s,'Payout rules',-270,'PAYOUTS',!features,()=>this.rules(0,false,true));
    this.ruleTab(s,'Feature rules',0,'FEATURES',features,()=>this.rules(0,true));
    this.ruleTab(s,'Rule diagram',270,helpTitle(),false,()=>this.howToPlay());
    drawRulePages(s,cfg,this.art,this.bet,band,features,FEATURE_PROFILES[cfg.id].notes,next=>this.rules(next,features),payoutFirst);
  }

  private ruleSheet(title:string):Node{
    // Paging is an update inside one reading surface, not a new modal transition.
    // Keep the opaque frame and input shield in place throughout rapid taps.
    const overlay=this.modal;
    let panel=overlay?.isValid&&!overlay.getChildByName('Dialog is closing')
      ?overlay.children.find(child=>!!child.getChildByName('Rule content anchor')):undefined;
    if(!panel){
      panel=this.sheet(title,1480,0);
      const heading=panel.children.find(child=>!!child.getComponent(Label));
      if(heading){heading.name='Rule dialog title';heading.setPosition(0,630);heading.getComponent(UITransform)?.setContentSize(690,70);const caption=heading.getComponent(Label);if(caption){outlined(caption,'#FFF1D3',1);caption.color=new Color(COLORS.ink);}}
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

  private legal(which:LegalPage,page=0):void{
    // Two sections per leaf keep real glyphs readable on narrow phones. The
    // library illustration stays in the left margin rather than behind copy.
    const sections=LEGAL_SECTIONS[which],pages=Math.ceil(sections.length/2);
    const s=this.sheet(which==='terms'?'Terms of Service':which==='privacy'?'Privacy & Data':'Player Support',1120,0,!this.modal);
    const title=s.children.find(child=>child.name.startsWith('Text:')&&!!child.getComponent(Label))?.getComponent(Label);
    if(title){title.node.getComponent(UITransform)?.setContentSize(540,82);title.color=new Color(COLORS.ink);outlined(title,'#FFF1D3',1);}
    sections.slice(page*2,page*2+2).forEach((section,i)=>{
      const y=285-i*340;
      const heading=text(s,section.title,118,y,580,68,43,COLORS.ink,true);
      heading.enableWrapText=false;
      const body=text(s,section.body.replace(/\n/g,' '),118,y-130,580,220,37,COLORS.ink);
      body.fontFamily='Arial';body.isBold=false;
    });
    text(s,`${page+1} / ${pages}`,60,-470,145,58,32,COLORS.ink);
    if(page>0)this.art.button(s,'Previous legal page',-208,-470,220,90,'PREV',undefined,()=>this.legal(which,page-1),0);
    if(page<pages-1)this.art.button(s,'Next legal page',315,-470,220,90,'NEXT',undefined,()=>this.legal(which,page+1),0);
  }
  private sheet(title:string,height:number,style=2,animate=true):Node{
    this.closeModal(true);const overlay=box(this.root!,'Modal shield',0,0,Safe.visibleWidth,Safe.visibleHeight);overlay.addComponent(BlockInputEvents);
    const dim=overlay.addComponent(Graphics);dim.fillColor=new Color(17,32,27,150);dim.rect(-Safe.visibleWidth/2,-Safe.visibleHeight/2,Safe.visibleWidth,Safe.visibleHeight);dim.fill();
    const panel=this.art.panel(overlay,0,0,978,height,style);text(panel,title,0,height/2-135,660,82,43,COLORS.ink,true);
    const close=this.art.button(panel,'Close dialog',413,height/2-73,95,95,'',15,()=>this.closeModal());
    close.getComponent(UITransform)!.setContentSize(152,152);
    if(!this.reduced&&animate){
      const alpha=opacity(overlay,0);tween(alpha).to(.2,{opacity:255}).start();
      panel.setPosition(0,-28);tween(panel).to(.32,{position:new Vec3(0,0,0)},{easing:'cubicOut'}).start();
    }
    this.modal=overlay;return panel;
  }
  private closeModal(immediate=false):void{
    if(immediate){this.closingModal?.destroy();this.closingModal=undefined;}
    const modal=this.modal;if(!modal)return;this.modal=undefined;
    if(immediate||this.reduced||modal.name!=='Modal shield'){modal.destroy();return;}
    this.closingModal?.destroy();this.closingModal=modal;
    // Keep the input shield through the fade, but disable its controls at once.
    modal.children.forEach(child=>{child.getComponentsInChildren(UITransform).forEach(t=>{for(const event of [Node.EventType.TOUCH_START,Node.EventType.TOUCH_MOVE,Node.EventType.TOUCH_END,Node.EventType.TOUCH_CANCEL])t.node.off(event);});});
    const alpha=modal.getComponent(UIOpacity)??opacity(modal,255);Tween.stopAllByTarget(alpha);
    const panel=modal.children[0];if(panel){Tween.stopAllByTarget(panel);tween(panel).by(.18,{position:new Vec3(0,-16,0)},{easing:'sineIn'}).start();}
    tween(alpha).to(.18,{opacity:0},{easing:'sineIn'}).call(()=>{if(modal.isValid)modal.destroy();if(this.closingModal===modal)this.closingModal=undefined;}).start();
  }
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,2);text(n,message,0,0,916,144,36,COLORS.ink);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{this.cancelWinCount?.();game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
