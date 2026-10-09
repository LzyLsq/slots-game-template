import {TextFit} from './TextFit';
import {plateTextBox} from './TextLayout';
import {validPressCue,type PressFeedback} from './PressFeedback';
import {GuardianSprite} from './GuardianSprite';
import {guardianAwardCue} from './GuardianMotion';
import {newcomerMinimum, newcomerNextRound} from '../math/NewcomerGuarantee';
import { OrdinaryWinStage } from '../vfx/OrdinaryWinStage';
import {LabelOutline} from 'cc';
import {cabinetToolText} from './CabinetToolText';
import {drawRulePages} from './RulePages';
import {awardCredits, awardEvidence, featureAwardEvidence, awardSummary, newcomerBenefitCaption, cabinetNewcomerCaption, cabinetRoundCaption, roundEvidence, tierRules, winTier} from '../vfx/WinPresentation';
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
import {TreasuryLife} from '../vfx/TreasuryLife';
import {lobbyLifeZones,cabinetLifeZones} from '../vfx/TreasuryMotion';
import { CanopyLeaves } from '../vfx/CanopyLeaves';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, outlined, COLORS } from './SalonArt';
import { CABINETS, CABINET_BUTTON_SEATS, CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT, CABINET_TOOLBAR_OFFSET, imagePoint, cabinetLayout, responsiveCabinet, reelAperture, registerContent, type CabinetGeometry, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const MODES = GAME_CONFIGS.map(c=>c.modeLabel);
const exactMoney=(n:number):string=>Math.floor(n).toLocaleString('en-US');
const money=(n:number):string=>{const v=Math.floor(n),a=Math.abs(v);if(a<1000000)return exactMoney(v);const unit=a>=1000000000?1000000000:1000000;return (Math.trunc(v/unit*100)/100).toFixed(2).replace(/\.?0+$/,'')+(unit===1000000000?'B':'M');};
@ccclass('AureliaApp')
export class AureliaApp extends Component {
  private art=new SalonArt();private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private life?:TreasuryLife;private guardian?:GuardianSprite;private retiring?:Node;private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private authExpanded=false;private selectedBundle=0;private curtainClosed=false;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
  private balanceLabel?:Label;private betLabel?:Label;private winLabel?:Label;private hintLabel?:Label;
  private activeCabinet?:CabinetGeometry;private cabinetResizePending=false;
  private presentedWin=0;private cancelWinCount?:()=>void;
  private top=960;private height=1920;private debug=false;private reduced=false;private force?:string;
  private draft={username:'',password:'',confirmPassword:'',nickname:'',acceptedTerms:false};
  private generator=new ResultGenerator();private rng=new SecureRNG();private audio!:AudioManager;
  private soundSaving=false;
  private readonly playUiPress=(event:Event):void=>{
    const feedback=(event as CustomEvent<PressFeedback>).detail;
    if(validPressCue(feedback?.cue))this.audio.play(feedback.cue);
    this.audio.vibrate(Math.min(18,Math.max(0,feedback?.vibration??8)));
  };
  private journal!:RemoteSpinJournal;
  protected onLoad():void {
    initializeLanguage(sys.localStorage);
    this.audio=this.node.addComponent(AudioManager);globalThis.addEventListener?.('aurelia-ui-press',this.playUiPress);
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
    const loading=box(this.node,'Mint loading',0,0,Safe.visibleWidth,Safe.visibleHeight);loading.addComponent(BlockInputEvents);
    const fallback=loading.addComponent(Graphics);fallback.fillColor=new Color('#3D2B27');fallback.rect(-1500,-2000,3000,4000);fallback.fill();
    const progress=outlined(text(loading,'Opening the sovereign mint…',0,-505,850,76,38,COLORS.cream),'#382616',2);
    try{
      // Show the authored scene as soon as it is decoded; the numeric progress
      // below counts actual art loads and never waits on a simulated timer.
      await this.art.load(['salon','canopy-services','canopy-brand','canopy-soft-plate-0','canopy-soft-plate-1','optics']);
      this.art.cover(loading,'salon',0,0,Safe.visibleWidth,Safe.visibleHeight).setSiblingIndex(0);
      const brand=this.art.image(loading,'canopy-brand',0,175,800,280);this.artTitleMotion(brand);
      const drawBar=this.loadingRail(loading,-412,660,500);
      await this.art.load([...GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),symbolAtlas(c.id)+'-blur',prizeArt(c.id)]),'award-optics','award-coin-detail','award-title-big','award-title-super','award-title-mega','award-title-epic','symbols','interfaces','portraits','symbols-blur','optics','apple-mark','canopy-services',...Array.from({length:4},(_,i)=>'canopy-frame-'+i),...Array.from({length:4},(_,i)=>'win-frame-'+i),...Array.from({length:16},(_,i)=>'canopy-button-'+i),'canopy-hall','canopy-guardian',...GAME_CONFIGS.map(c=>'guardian-'+c.id),...GAME_CONFIGS.map(c=>'cabinet-foreground-'+c.id),...Array.from({length:4},(_,i)=>'canopy-soft-plate-'+i),...Array.from({length:4},(_,i)=>'canopy-title-'+i)],(n,t)=>{
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
      this.applyAudioSettings();
      this.restoreRemoteRound();
      if(this.page==='game')await this.art.load([this.config.id+'-tall']);
      this.render();
      await new Promise<void>(resolve=>tween(opacity(loading,255))
        .to(this.reduced?.01:.26,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());
      loading.destroy();
      globalThis.dispatchEvent?.(new Event('aurelia-app-ready'));
    }catch(error){progress.string=tr('Could not open the mint. Tap to retry.');loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
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
    if(this.page==='game'&&this.plane&&this.root){
      const next=responsiveCabinet(this.config.id,Safe.visibleWidth,Safe.visibleHeight,Safe.safeTop,Safe.safeBottom,Safe.safeLeft,Safe.safeRight);
      this.cabinetResizePending=next.screenExtension!==this.activeCabinet?.screenExtension;
      // Preserve any in-flight spin/settlement. Reflow the existing shared plane
      // immediately, and rebuild the glass only at a safe idle boundary.
      if(this.cabinetResizePending&&this.state.kind==='idle'&&!this.busy&&!this.modal){this.reflowCabinet();return;}
      this.layoutPlane();return;
    }
    // Mobile keyboards change the viewport on focus/blur. Keep live EditBoxes
    // (including composition and selection) instead of destroying the form.
    // The Canvas still adapts its projection; navigation builds a fresh layout.
    if(this.root&&(this.page==='login'||this.page==='register'))return;
    if(this.root&&!this.busy)this.render();
  }
  private render():void{
    this.cancelWinCount?.();this.presentedWin=0;
    this.art.reducedMotion=this.reduced;
    this.applyAudioSettings();this.audio.setScene(this.page==='game'?this.config.id:'lobby');
    this.activeCabinet=undefined;this.cabinetResizePending=false;
    this.generation++;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;this.guardian=undefined;this.life=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.hintLabel=this.autoLamp=this.soundLamp=undefined;
    const previous=this.root;if(previous){const a=opacity(previous,255);Tween.stopAllByTarget(a);a.opacity=255;for(const edit of previous.getComponentsInChildren(EditBox))edit.enabled=false;}
    if(this.retiring&&this.retiring!==previous)this.retiring.destroy();this.retiring=previous;
    this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Sovereign Mint interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='home'?'canopy-hall':this.page==='login'||this.page==='register'?'salon':'canopy-services';
    this.bg=this.art.cover(root,this.page==='game'?this.config.id+'-tall':backdrop,0,0,Safe.visibleWidth,this.height);

    if(this.page!=='game'&&this.page!=='home'){box(root,'Mint sunlight',0,0,Safe.visibleWidth,this.height).addComponent(CanopyLeaves).setup(this.art,Safe.visibleWidth,this.height,this.reduced);}
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
    let loading:Node|undefined;
    try{
      if(config){
        loading=this.gameLoading(config);
        // Asset readiness drives the percentage. The separate brief entrance
        // lets even a cached collection settle into the scene before the exit.
        await Promise.all([this.art.load([config.id+'-tall'],(done,total)=>this.loadingProgress?.(done/total,'Preparing your game…')),this.loadingArrival]);
      }
      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();
      if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(1,'Ready');await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.28,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.loadingArrival=undefined;this.busy=false;}
  }
  private gameLoading(config:GameConfig):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);
    // The room already has a marble exhibition table. Present each mode as a
    // physical collection on that table, instead of pasting a second arch and
    // miniature room over the architecture.
    this.art.cover(n,'canopy-services',0,0,Safe.visibleWidth,this.height);
    const stage=box(n,'Opening a mint chamber',0,0,1020,1410);const scale=Math.min(1,(Safe.visibleWidth-65)/1020,(this.height-230)/1410);stage.setScale(scale,scale,1);
    const index=GAME_CONFIGS.indexOf(config);
    const heading=this.art.image(stage,'canopy-title-'+index,0,507,710,172);this.artTitleMotion(heading,0);
    const pool=this.art.light(stage,1,0,-93,600,84,this.reduced?28:52);pool.name='Collection contact reflection';
    if(!this.reduced){const reflection=pool.getComponent(UIOpacity)!;tween(reflection).to(2.8,{opacity:95},{easing:'sineInOut'}).to(3.2,{opacity:48},{easing:'sineInOut'}).union().repeatForever().start();}
    const collection=this.art.image(stage,prizeArt(config.id),0,130,650,620);
    if(this.reduced)this.loadingArrival=Promise.resolve();
    else{
      collection.setScale(.955,.955,1);
      const collectionAlpha=opacity(collection,195);
      tween(collection).to(.36,{scale:new Vec3(1,1,1)},{easing:'sineOut'}).start();
      this.loadingArrival=new Promise<void>(resolve=>tween(collectionAlpha).to(.36,{opacity:255},{easing:'sineOut'}).call(()=>resolve()).start());
    }
    // Anchor the treasure to the marble rather than floating the whole cutout.
    // Small reflections are attached to the mint metal and room lamps.
    if(!this.reduced){for(const [x,y,phase] of [[-194,40,0],[207,56,.14],[-341,352,.27],[344,355,.38]] as const){
      const glint=this.art.light(stage,3,x,y,57,57,0);glint.name='Collection and sconce reflection';const a=glint.getComponent(UIOpacity)!;
      tween(a).delay(phase).repeatForever(tween().to(.65,{opacity:155},{easing:'sineOut'}).to(1.4,{opacity:0},{easing:'sineInOut'}).delay(3.1)).start();
    }}
    const rule=[
      '7 PAYLINES · Match from the left',
      '243 WAYS · Match across any row',
      'CHANGING WAYS · Two to four open rows',
      'COIN COUNT · Eight or more anywhere'
    ][index];
    // The full-bleed room moves the green rail and ivory crest under this
    // copy at different aspect ratios. Ivory type with a dark outline stays
    // readable on BOTH materials; dark ink disappeared outside the crest.
    const [ruleHead,ruleDetail]=rule.split(' · ');
    const ruleTitle=outlined(text(stage,ruleHead,0,-230,800,58,44,COLORS.cream,true),'#2B1D12',3);
    const ruleCopy=outlined(text(stage,ruleDetail,0,-285,840,49,35,COLORS.cream),'#2B1D12',3);
    for(const label of [ruleTitle,ruleCopy]){label.enableWrapText=false;label.node.getComponent(TextFit)!.compactLine=true;}
    const drawBar=this.loadingRail(stage,-421,820,645);
    const percentage=outlined(text(stage,'0%',0,-492,250,58,43,COLORS.cream),'#2B1D12',2);percentage.node.name='Loading percentage';
    const status=outlined(text(stage,'Preparing your chamber…',0,-557,790,55,36,COLORS.cream),'#2B1D12',2);
    const progress={value:0};let target=0;const draw=()=>{if(!n.isValid)return;drawBar(progress.value);percentage.string=tr(Math.round(progress.value*100)+'%');};
    this.loadingProgress=(value,caption)=>{target=Math.max(target,Math.min(1,value));status.string=tr(target===1?'Your chamber is ready':caption);Tween.stopAllByTarget(progress);if(this.reduced||target===1){progress.value=target;draw();}else tween(progress).to(.16,{value:target},{easing:'sineOut',onUpdate:draw}).start();};draw();return n;
  }
  private loadingRail(parent:Node,y:number,plateWidth:number,trackWidth:number):(value:number)=>void{
    const plate=this.art.panel(parent,0,y,plateWidth,88,1);
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
    // Preserve a readable meter at 320px: the old 34px seat became ~5px
    // type after multiline leading and outline padding. The taller enamel
    // face stays below the safe-area edge and does not change header targets.
    const wallet=this.art.panel(this.content!,-235,y,525,160,2),walletSeat=plateTextBox(525,160);
    this.art.image(wallet,'symbols',-194,0,70,70,0);
    this.balanceLabel=outlined(text(wallet,money(this.services.economy.balance()),walletSeat.x,walletSeat.y,walletSeat.width,walletSeat.height,42,COLORS.cream),'#183D43',2);
    this.balanceLabel.enableWrapText=false;this.balanceLabel.node.getComponent(TextFit)!.compactLine=true;
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
    // Match each gilded atlas emblem to its destination: purse, gift, coin, medal, portrait.
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Shop','Gifts','Slots','Rank','Account'],icons=[3,13,6,5,7];
    pages.forEach((page,i)=>{
      const active=page===this.page;
      const hit=box(nav,labels[i],(i-2)*205,0,194,166);
      const face=box(hit,labels[i]+' rail key',0,0,192,160);
      if(active){
        const socket=face.addComponent(Graphics);
        socket.fillColor=new Color(10,40,65,86);socket.circle(0,33,70);socket.fill();
        socket.strokeColor=new Color(252,212,119,173);socket.lineWidth=2;socket.circle(0,33,69);socket.stroke();
        this.art.light(face,3,0,40,100,34,68);
      }
      const icon=this.art.image(face,'interfaces',0,33,active?131:119,active?131:119,icons[i]);
      const navLabel=outlined(text(face,labels[i],0,-52,184,52,46,'#FFF2DC'),'#142B3A',2);
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
  /** The four permanent vault doors are baked into one perspective-correct
   * rotunda. Image plaques and invisible door-sized touch surfaces are the only
   * overlays, so no floating preview cabinet or false reel outcome appears. */
  private homePage():void{
    const stage=this.pageStage('Four playable treasure vaults');
    stage.setSiblingIndex(1); // One architectural image below wallet/dock.
    const brandY=Math.min(850,this.top-230);
    const brand=this.art.image(stage,'canopy-brand',0,brandY,540,160);
    this.artTitleMotion(brand);
    const tall=this.height>2050;
    const x=tall?330:300;
    const life=box(stage,'Living treasure hall',0,0,1020,1400).addComponent(TreasuryLife);
    life.setup(this.art,lobbyLifeZones(tall),'lobby',this.reduced);this.life=life;
    const doors=[
      {x:-x,y:tall?510:440,plaque:-178,rule:'7 LINES · 3 REELS'},
      {x:x,y:tall?510:440,plaque:-178,rule:'243 WAYS · 5 REELS'},
      {x:-x,y:tall?-250:-240,plaque:-180,rule:'CHANGING WAYS'},
      {x:x,y:tall?-250:-240,plaque:-180,rule:'8+ COINS · 5 REELS'},
    ] as const;
    doors.forEach(({x,y,plaque,rule},index)=>{
      const config=GAME_CONFIGS[index];
      const hit=box(stage,`Open ${config.name} vault`,x,y,390,455);
      const title=this.art.image(hit,'canopy-title-'+index,0,plaque,430,120);
      title.name=`Vault title ${config.name}`;
      const detail=outlined(text(hit,rule,index>=2?(index%2?32:-32):0,plaque-82,index>=2?360:380,53,index>=2?33:35,COLORS.cream,true),'#362719',3);
      detail.enableWrapText=false;
      // The door is structural art; only engraved threshold jewellery glints.
      if(!this.reduced){
        const reflection=this.art.light(stage,3,x+(index%2?148:-148),y+173,34,42,0);
        const alpha=reflection.getComponent(UIOpacity)!;
        tween(alpha).delay(index*.55).repeatForever(tween().to(.75,{opacity:145},{easing:'sineOut'}).to(1.7,{opacity:0},{easing:'sineInOut'}).delay(2.6)).start();
      }
      hit.on(Node.EventType.TOUCH_START,()=>life.bless(index));
      bindPress(hit,title,()=>{void this.navigate('game',config);},{depth:3,compression:.965,release:.16,instant:true});
    });

    // A readable foreground character, visually spanning the central coin river.
    // Keep its interactive hit region narrow so neither vault door loses input.
    const keeperY=tall?-510:-420;
    const keeperHit=box(stage,'Mint guardian mascot',0,keeperY,tall?224:198,tall?345:325);
    const keeper=this.art.image(keeperHit,'canopy-guardian',0,0,tall?350:320,tall?396:362);
    if(!this.reduced){
      tween(keeper).repeatForever(tween().to(2.2,{position:new Vec3(0,5,0),angle:-1.1},{easing:'sineInOut'}).to(2.2,{position:new Vec3(0,0,0),angle:1.1},{easing:'sineInOut'})).start();
      const glint=this.art.light(keeperHit,3,tall?-96:-86,76,35,35,0);
      const glow=glint.getComponent(UIOpacity)!;
      tween(glow).repeatForever(tween().to(.5,{opacity:170},{easing:'sineOut'}).to(1.3,{opacity:0},{easing:'sineInOut'}).delay(2.5)).start();
    }
    bindPress(keeperHit,keeper,()=>{
      if(this.reduced)return;
      life.bless();
      this.audio.playGuardian(0);
    },{depth:3,compression:.94,release:.18,instant:true});
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
    const brand=this.art.image(stage,'canopy-brand',0,register?690:667,register?740:760,220);this.idleAccent(brand,0,12,.2,1.8);this.sheen(brand,510,150);
    const panel=this.art.panel(stage,0,register?-18:-245,935,register?1480:1240,0);this.metalEdges(panel,903,register?1207:937,.8);
    text(panel,register?'JOIN THE MINT':'WELCOME TO THE MINT',0,register?375:242,780,76,50,COLORS.cream,true);
    const authSubtitle=text(panel,register?'Make your fortune in the mint':'Sign in to the Sovereign Mint',0,register?306:169,780,52,42,COLORS.cream);
    outlined(authSubtitle,'#39200F',3);
    this.field(panel,'Username',register?212:74,this.draft.username,v=>this.draft.username=v);
    this.field(panel,'Password',register?84:-54,this.draft.password,v=>this.draft.password=v,true);
    if(register){
      this.field(panel,'Confirm password',-44,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);this.field(panel,'Nickname',-172,this.draft.nickname,v=>this.draft.nickname=v);
      const check=this.art.button(panel,'Accept terms',-335,-294,91,91,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1),mark=opacity(check,this.draft.acceptedTerms?255:65);
      outlined(text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',65,-294,649,84,29,COLORS.cream),'#223B30',2);
      const primary=this.art.button(panel,'Create account',0,-428,795,126,'CREATE ACCOUNT',4,()=>void this.authAction('register'),3);this.metalEdges(primary,763,110,1.1);
      this.art.button(panel,'Switch account form',0,-550,790,95,'Back to sign in',9,()=>void this.navigate('login'),0);
    }else{
      const primary=this.art.button(panel,'Sign in',0,-190,810,139,'SIGN IN',14,()=>void this.authAction('login'),3);this.metalEdges(primary,778,121,.7);
      const apple=this.art.panel(panel,0,-316,810,104,1);apple.name='Sign in with Apple';
      const appleMark=this.art.image(apple,'apple-mark',-242,0,42,50);appleMark.active=false;
      const appleCaption=outlined(text(apple,'Apple sign-in unavailable',0,-3.3,625,32,28,COLORS.cream),'#15213D',2);
      const appleOpacity=opacity(apple,205);
      // A browser/local preview has no native Apple bridge. Do not present a
      // decorative plate as an enabled sign-in method until one is available.
      void this.services.auth.appleSignInAvailable().then(available=>{
        if(!available||!apple.isValid||this.page!=='login')return;
        appleCaption.string=tr('Sign in with Apple');appleCaption.fontSize=30;appleMark.active=true;appleOpacity.opacity=255;
        bindPress(apple,apple,()=>void this.authAction('apple'));
      }).catch(()=>{});
      const guest=this.art.button(panel,'Guest',-211,-424,390,98,'Guest play',0,()=>this.guestConsent(),0);const create=this.art.button(panel,'Create account',211,-424,390,98,'Register',4,()=>void this.navigate('register'),0);
      for(const button of [guest,create])button.getComponentsInChildren(Label).forEach(label=>{label.fontSize=50;});
    }
    const links=box(this.content!,'Engraved legal ribbon',0,-this.top+151+Safe.safeBottom,990,86);
    const ribbon=links.addComponent(Graphics);
    ribbon.fillColor=new Color(89,54,27,69);ribbon.roundRect(-485,-40,970,80,12);ribbon.fill();
    ribbon.strokeColor=new Color(235,194,121,146);ribbon.lineWidth=2;ribbon.roundRect(-485,-40,970,80,12);ribbon.stroke();
    for(const x of [-160,160]){ribbon.moveTo(x,-25);ribbon.lineTo(x,25);ribbon.stroke();}
    ['Terms','Privacy','Support'].forEach((t,i)=>{
      const hit=box(links,t,(i-1)*320,0,312,80);
      const label=outlined(text(hit,t,0,0,282,62,46,COLORS.cream),'#14283A',2);
      label.enableWrapText=false;bindPress(hit,hit,()=>this.legal(['terms','privacy','support'][i] as LegalPage));
    });
    outlined(text(this.content!,'Virtual coins · No cash prizes · Adults only',0,-this.top+62+Safe.safeBottom,1000,55,38,COLORS.cream),'#583B23',2);
    // Add this last so the brand, animated coins and authored backdrop never
    // paint over the language control in the top safe area.
    const localeButton=this.art.button(this.content!,'Language selector',Safe.visibleWidth/2-190,this.top-Safe.safeTop-98,340,92,'Language',7,()=>this.languages(),3);
    localeButton.getComponentsInChildren(Label).forEach(caption=>{caption.fontSize=49;caption.enableWrapText=false;});
  }

  private field(parent:Node,placeholder:string,y:number,value:string,onChange:(v:string)=>void,password=false):EditBox{
    // Configure off-stage: EditBox onLoad otherwise creates default labels
    // and clears the existing material before our references are assigned.
    const frame=this.art.panel(parent,0,y,778,118,1);
    // The commissioned plate already has a continuous sapphire enamel face.
    // Keep the editor inside it rather than pasting a second, half-width
    // vellum rectangle over the artwork.
    const n=box(frame,'Text entry',0,-3.7,590,36);n.active=false;
    const focusFrame=box(n,'Focused gold edge',0,0,590,36);
    const fg=focusFrame.addComponent(Graphics);fg.strokeColor=new Color('#F5D38B');fg.lineWidth=3;
    fg.roundRect(-295,-18,590,36,7);fg.stroke();
    const focusOpacity=opacity(focusFrame,0);const edit=n.addComponent(EditBox);
    edit.backgroundImage=null!;
    const label=text(n,value,0,0,568,34,30,'#FFF8E7',false,true);label.horizontalAlign=Label.HorizontalAlign.LEFT;label.isBold=true;
    const hintSize=placeholder.length>24?24:placeholder.length>12?27:30;
    const hint=text(n,placeholder,0,0,568,34,hintSize,'#F5DDA8');hint.horizontalAlign=Label.HorizontalAlign.LEFT;hint.isBold=true;
    // EditBox positions labels by their top-left corner, not their center.
    label.node.getComponent(UITransform)!.setAnchorPoint(0,1);hint.node.getComponent(UITransform)!.setAnchorPoint(0,1);
    edit.textLabel=label;edit.placeholderLabel=hint;edit.placeholder=tr(placeholder);edit.inputMode=EditBox.InputMode.SINGLE_LINE;edit.maxLength=password?72:18;
    // Assigning labels while EditBox is still in its default multiline mode
    // changes vertical alignment to TOP. Single-line mode does not reset it.
    label.verticalAlign=hint.verticalAlign=Label.VerticalAlign.CENTER;
    label.enableWrapText=hint.enableWrapText=false;label.node.getComponent(TextFit)!.compactLine=true;hint.node.getComponent(TextFit)!.compactLine=true;
    label.lineHeight=hint.lineHeight=32;
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
    const panel=this.sheet('Treasury membership terms',1120);
    panel.getChildByName('Close dialog')!.active=false;
    text(panel,'Confirm that you meet your region’s minimum age\nand accept the current Terms and Privacy Policy.\nVirtual coins have no cash value.',0,105,820,240,36,COLORS.ink);
    this.art.button(panel,'Accept updated policy',0,-99,760,108,'Accept & continue',14,()=>{this.accept();this.closeModal();},3);
    this.art.button(panel,'Return to sign in',0,-241,760,99,'Sign out to review policies',7,()=>{this.closeModal();void this.signOut();},1);
  }
  private guestConsent():void{
    const s=this.sheet('Before you enter',650);
    text(s,'Simulated casino for eligible adults.\nCoins have no cash value.\n\nConfirm you meet your region’s age\nrequirement and accept the Terms\nand Privacy Policy.',0,20,820,330,36,COLORS.ink);
    this.art.button(s,'Confirm eligibility',0,-225,760,110,'I am eligible · Continue',14,()=>{this.accept();void this.services.auth.guestLogin().then(r=>{if(r.ok){this.page='home';this.render();}else this.toast(r.message??'Unable to enter.');});});
  }
  private gamePage():void{
    const cfg=this.config,g=responsiveCabinet(cfg.id,Safe.visibleWidth,Safe.visibleHeight,Safe.safeTop,Safe.safeBottom,Safe.safeLeft,Safe.safeRight);
    this.activeCabinet=g;
    this.plane=box(this.content!,'Cabinet-coordinate-plane',0,0,1024,2304);
    this.art.cabinetRoom(this.plane,cfg.id+'-tall',CABINETS[cfg.id],g.screenExtension);
    // Ambient light must render over the opaque integrated environment plate.
    // It shares the cabinet's coordinate plane with the reels and controls.
    const ambient=box(this.plane,'Cabinet reflections',0,0,1024,2304).addComponent(SalonAtmosphere);
    ambient.setup(this.art,1024,2304);ambient.cabinet(this.art,g);ambient.reducedMotion=this.reduced;
    this.life=box(this.plane,'Living cabinet treasury',0,0,1024,2304).addComponent(TreasuryLife);
    this.life.setup(this.art,cabinetLifeZones(g),cfg.id,this.reduced);

    // Each guardian is the individually commissioned statue for this cabinet.
    // Its fixed brass plinth rests behind pixels taken from the SAME alcove's
    // ledge; the sculpture never floats over the title or reel aperture.
    const titleIndex=GAME_CONFIGS.indexOf(cfg);
    const {centre,width,height,bottom}=g.guardian;
    const guardianSeat=box(this.plane,'Integrated '+cfg.id+' guardian',centre-512,1152-bottom+height/2,width,height);
    this.guardian=guardianSeat.addComponent(GuardianSprite);
    this.guardian.setup(this.art,cfg.id,this.art.frame('guardian-'+cfg.id),width,height,this.reduced,this.audio);
    this.guardian.onReact=()=>this.life?.bless();
    this.art.image(this.plane,'cabinet-foreground-'+cfg.id,0,1152-825,1024,70);
    const titlePoint=imagePoint(g.title);
    const title=this.art.image(this.plane,'canopy-title-'+titleIndex,titlePoint[0],titlePoint[1]+16,g.title[2]*.94,g.title[3]*.94);
    title.name='Cabinet title · '+cfg.name;
    this.artTitleMotion(title,titleIndex*.42);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,reelAperture(g,cfg.id));this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.play('reel-stop');if(column>=cfg.columns-1)this.audio.stopSpin();ambient.land(column);};
    // Source-space seats are INSIDE each theme's actual painted glass. Reuse
    // the original brass frame: a second oversized plate obscured its edges.
    const register=(area:Box,caption:string,value:string):Label=>{
      const p=imagePoint(area),content=registerContent(area);
      const window=box(this.plane!,caption+' · inset cabinet glass',p[0],p[1],area[2],area[3]);
      window.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
      const line=(rect:Box,value:string,size:number):Label=>{
        const point=imagePoint(rect);
        const label=outlined(text(window,value,point[0]-p[0],point[1]-p[1],rect[2],rect[3],size,'#FFF3D2'),'#382513',.6);
        label.enableWrapText=false;label.node.getComponent(TextFit)!.compactLine=true;
        label.node.getComponent(TextFit)!.fit();return label;
      };
      line(content.caption,caption,24);
      return line(content.value,value,43);
    };
    this.balanceLabel=register(g.balance,'COINS',money(this.services.economy.balance()));
    this.winLabel=register(g.topWin,'WIN','0');
    this.betLabel=register(g.bet,'BET',money(this.bet));
    const ctl=(rect:Box,label:string,index:number,action:()=>void):{hit:Node;face:Node}=>{
      const pos=imagePoint(rect),seat=CABINET_BUTTON_SEATS[cfg.id][index];
      const hit=box(this.plane!,label,pos[0]+seat[0],pos[1]+seat[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset='canopy-button-'+(theme*4+[0,2,1,3][index]);
      const face=this.art.image(hit,asset,0,0,rect[2],rect[3]);
      // The painted metal recess supplies the idle finish; only the face moves on touch.
      bindPress(hit,face,()=>{ambient.land(-1);action();},[
        {depth:3,compression:.968,release:.12,instant:true},
        {depth:3,compression:.968,release:.12,instant:true},
        {depth:3,compression:.968,release:.12,instant:true},
        {depth:3,compression:.968,release:.12,instant:true},
      ][theme]);return {hit,face};
    };
    ctl(g.minus,'Decrease bet',2,()=>this.changeBet(-1));ctl(g.plus,'Increase bet',1,()=>this.changeBet(1));
    const spinControl=ctl(g.spin,'SPIN',0,()=>void this.spin()),spin=spinControl.hit;
    // Lettering is etched into the lower button rim and moves with the metal
    // face. The former full-width ivory bar floated across the round control.
    const spinCaption=outlined(text(spinControl.face,'SPIN',0,-g.spin[3]*.43-CABINET_BUTTON_SEATS[cfg.id][0][1],g.spin[2]*.82,52,47,'#FFF4D5'),'#422610',3);
    spinCaption.fontFamily='Arial Black';spinCaption.enableWrapText=false;

    ctl(g.auto,'AUTO',3,()=>{this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');if(this.auto&&this.state.kind==='idle')void this.spin();});
    // Keep AUTO's state beside its physical button. The former low register
    // sat behind the fixed bottom award readout on compact phones.
    const autoPoint=imagePoint(g.auto),autoSeat=CABINET_BUTTON_SEATS[cfg.id][3],autoStatus:[number,number]=[autoPoint[0]+autoSeat[0],autoPoint[1]-g.auto[3]/2-(cfg.id==='pearl-palace'||cfg.id==='ruby-revel'?68:38)];
    const consoleWindow=(name:string,x:number,y:number,w:number,h:number):Node=>{
      const frame=box(this.plane!,name,x,y,w,h),glass=frame.addComponent(Graphics);
      glass.fillColor=cfg.id==='pearl-palace'?new Color(37,60,76,108):cfg.id==='ruby-revel'?new Color(72,31,42,104):new Color(39,53,57,101);
      glass.roundRect(-w/2,-h/2,w,h,h*.42);glass.fill();
      glass.fillColor=new Color(251,219,151,21);glass.roundRect(-w/2+9,h*.15,w-18,h*.21,h*.09);glass.fill();
      glass.strokeColor=new Color(242,194,110,124);glass.lineWidth=1.5;
      glass.roundRect(-w/2+1,-h/2+1,w-2,h-2,h*.42);glass.stroke();return frame;
    };
    const autoWindow=consoleWindow('AUTO inlaid status',autoStatus[0],autoStatus[1],g.status[2]+4,g.status[3]+8);
    this.autoLamp=outlined(text(autoWindow,'AUTO OFF',0,0,g.status[2]*.82,g.status[3]*.82,35,'#FFF2D5'),'#1D2A39',2);this.autoLamp.enableWrapText=false;this.autoLamp.overflow=Label.Overflow.SHRINK;this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const toolbar=box(this.content!,'Safe top tools',0,this.top-CABINET_TOOLBAR_OFFSET-Safe.safeTop,1080,148);
    const tool=(name:string,x:number,plate:number,label:string,action:()=>void):Label=>{
      const hit=box(toolbar,name,x,0,244,152);
      const face=this.art.image(hit,'canopy-soft-plate-'+plate,0,0,244,144);
      const sound=label.startsWith('SOUND'),area=plateTextBox(244,144);
      const caption=outlined(text(face,cabinetToolText(sound?'SOUND':label),area.x,area.y,area.width,area.height,42,'#FFF4DC'),'#36220E',1.5);
      caption.fontFamily='Arial Black';caption.enableWrapText=false;caption.node.getComponent(TextFit)!.compactLine=true;
      // SOUND retains an independent ON/OFF readout under the plate, without
      // squeezing two lines into the narrow engraved enamel strip.
      const state=sound?outlined(text(hit,'ON',0,-55,100,30,25,'#FFF4DC'),'#36220E',1):caption;
      state.enableWrapText=false;state.node.getComponent(TextFit)!.compactLine=true;
      bindPress(hit,face,()=>{action();},{depth:2,compression:.975,release:.12,instant:true});
      return state;
    };
    tool('Back to slots',-370,0,'BACK',()=>void this.navigate('home'));
    tool('Rules',0,2,'RULES',()=>this.rules());
    this.soundLamp=tool('Audio',370,3,'SOUND ON',()=>this.soundOptions());this.updateSound();
    this.hintLabel=outlined(text(this.content!,MODES[GAME_CONFIGS.indexOf(cfg)],0,-this.top+140+Safe.safeBottom,900,96,39,COLORS.cream));
    this.hintLabel.node.getComponent(LabelOutline)!.width=2;this.hintLabel.node.getComponent('TextFit')!.enabled=true;this.hintLabel.fontSize=39;this.hintLabel.lineHeight=46;this.hintLabel.enableWrapText=true;this.hintLabel.overflow=Label.Overflow.SHRINK;this.hintLabel.getComponent(UITransform)!.setContentSize(900,96);
    const newcomer=!this.services.api?this.newcomerBenefit():undefined;
    if(newcomer)this.hintLabel.string=cabinetNewcomerCaption(newcomer.round);
    this.layoutPlane();
    // Local QA may wait for a real SPIN gesture, allowing mobile audio unlock.
    // `force` is already guarded by localhost + debug=1; production is unchanged.
    if(this.force&&new URLSearchParams(globalThis.location?.search??'').get('autospin')!=='0'){this.scheduleOnce(()=>void this.spin(),1);}
  }
  private syncHintMaterial():void{
    const hint=this.hintLabel?.node;if(!hint||!this.content)return;
    let material=this.content.getChildByName('Award hint material');
    if(!material){
      // Feather into the cabinet's own palette; no panel edge or opaque card.
      material=box(this.content,'Award hint material',0,0,910,174);
      material.setSiblingIndex(hint.getSiblingIndex());
      const shade=material.addComponent(Graphics);
      for(let i=0;i<64;i++){
        const u=(i+.5)/64,alpha=Math.round(81*Math.pow(Math.sin(Math.PI*u),1.5));
        const tone=this.config.id==='ruby-revel'?new Color(81,34,39,alpha):this.config.id==='jade-treasury'?new Color(29,65,54,alpha):new Color(92,59,34,alpha);
        shade.fillColor=tone;
        shade.rect(-455,-87+i*174/64,910,174/64);shade.fill();
      }
    }
    material.setPosition(hint.position);
  }
  private reflowCabinet():void{
    const board=this.reels?.snapshot(),win=this.presentedWin,hint=this.hintLabel?.string;
    this.render();
    if(board){this.reels?.setPrimaryLayout(board.layout);this.reels?.show(board.grid);}
    this.resetWinAmount(win);if(hint&&this.hintLabel)this.hintLabel.string=hint;
  }
  private layoutPlane():void{
    if(!this.plane)return;const h=Safe.visibleHeight;
    const layout=cabinetLayout(Safe.visibleWidth,h,this.activeCabinet??CABINETS[this.config.id],Safe.safeTop,Safe.safeBottom,Safe.safeLeft,Safe.safeRight);
    this.plane.setScale(layout.scale,layout.scale,1);this.plane.setPosition(0,layout.y);

    const toolbar=this.content?.getChildByName('Safe top tools');
    if(toolbar){
      toolbar.setPosition(0,h/2-CABINET_TOOLBAR_OFFSET-Safe.safeTop);
      const reach=Math.min(370,Safe.visibleWidth/2-Math.max(Safe.safeLeft,Safe.safeRight)-112);
      toolbar.getChildByName('Back to slots')?.setPosition(-reach,0);
      toolbar.getChildByName('Rules')?.setPosition(0,0);
      toolbar.getChildByName('Audio')?.setPosition(reach,0);
    }
    this.hintLabel?.node.setPosition(0,-h/2+140+Safe.safeBottom);
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
    if(!this.autoLamp)return;this.autoLamp.string=tr(this.auto?'AUTO ON':'AUTO OFF');this.autoLamp.color=new Color(this.auto?'#C8F7DA':'#FFF2D5');
    Tween.stopAllByTarget(this.autoLamp.node);this.autoLamp.node.setScale(1,1,1);
    // Status typography stays fixed. Button enamel carries the motion, not the readout.
  }
  private applyAudioSettings():void{
    const settings=this.services.profile.current()?.settings;
    this.audio.setEffects(settings?.sound??true);this.audio.setMusic(settings?.music??true);this.audio.setVibration(settings?.vibration??true);
  }
  private updateSound():void{
    const settings=this.services.profile.current()?.settings,enabled=(settings?.sound??true)||(settings?.music??true);
    if(this.soundLamp){this.soundLamp.string=tr(enabled?'ON':'OFF');this.soundLamp.color=new Color(enabled?'#FFF4DC':'#DEC6A2');}
  }
  private soundOptions():void{
    this.auto=false;this.updateAuto();
    const panel=this.sheet('Sound & feedback',1200);
    const heading=panel.getChildByName('Text:Sound & feedback');heading?.setPosition(0,320);heading?.getComponent(UITransform)?.setContentSize(728,76);
    text(panel,'Music, effects and touch are independent.',0,241,736,60,31,COLORS.cream);
    const settings=this.services.profile.current()?.settings;if(!settings)return;
    const rows:[keyof Pick<typeof settings,'music'|'sound'|'vibration'>,string][]=[['music','Background music'],['sound','Button & win sounds'],['vibration','Touch vibration']];
    const update=():void=>{
      if(!panel.isValid)return;
      const current=this.services.profile.current()?.settings;if(!current)return;
      for(const [key,label] of rows){
        const caption=panel.getChildByName('Sound options '+key)?.getComponentsInChildren(Label)[0];
        if(caption)caption.string=tr(label)+'  ·  '+tr(current[key]?'ON':'OFF');
      }
      const mute=panel.getChildByName('Mute all audio')?.getComponentsInChildren(Label)[0];
      if(mute)mute.string=tr(current.music||current.sound?'Mute all audio':'Enable all audio');
    };
    const save=async(patch:Partial<Pick<typeof settings,'music'|'sound'|'vibration'>>):Promise<void>=>{
      if(this.soundSaving)return;this.soundSaving=true;
      try{
        const request=this.services.profile.updateSettings(patch); // optimistic local save
        this.applyAudioSettings();this.updateSound();update();
        if(patch.sound===true)this.audio.play('toggle');
        if(patch.vibration===true)this.audio.vibrate(10);
        if(!await request)this.toast('Sound setting could not be saved.');
      }catch{this.toast('Sound setting could not be saved.');}
      finally{this.soundSaving=false;this.applyAudioSettings();this.updateSound();update();}
    };
    rows.forEach(([key,label],i)=>this.art.button(panel,'Sound options '+key,0,140-i*140,744,122,tr(label)+'  ·  '+tr(settings[key]?'ON':'OFF'),undefined,()=>{
      const current=this.services.profile.current()?.settings;if(current)void save({[key]:!current[key]});
    },0));
    this.art.button(panel,'Mute all audio',0,-300,744,122,'Mute all audio',undefined,()=>{
      const current=this.services.profile.current()?.settings;if(current){const next=!(current.music||current.sound);void save({music:next,sound:next});}
    },2);
    text(panel,'Vibration depends on device support.',0,-403,734,56,28,COLORS.cream);update();
  }
  private newcomerBenefit():{round:number;minimum?:10}|undefined{
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
    const newcomer=!recovering?this.newcomerBenefit():undefined;
    if(api){try{this.journal.begin(requestId,this.config.id,this.bet);}catch{this.audio.play('error');this.toast('Unable to save the round. Free device storage, then try again.');return;}}
    if(!api&&!this.services.economy.reserveSpin(requestId,this.bet)){this.auto=false;this.updateAuto();this.audio.play('error');this.toast('Not enough coins. Visit Rewards or the Coin Shop.');return;}
    this.resetWinAmount();
    this.life?.bless();this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.guardian?.react('spin');this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string=tr('Treasures in motion…');
    let settled=false;
    try{
      let result:SpinResult;
      if(api){const response=await api.spin(this.config.id,this.bet,requestId);result=response.result;this.journal.settle(requestId,result,response.balance);}
      else {
        const forcedTier=(['ordinary','big','super','mega','epic'] as const).find(tier=>tier===this.force);
        result=this.generator.generate(this.config,this.bet,this.rng,{winTier:forcedTier,...(this.force==='frame-check'?{symbolId:this.config.symbols[0].id,count:Math.min(5,this.config.columns) as 3|4|5}:{}),newcomerMinimum:newcomer?.minimum});this.force=undefined;
        if(!this.services.economy.settleSpin(requestId,result.totalWin))throw new Error('Settlement failed');
      }
      settled=true;await this.reels.finish(result);this.audio.stopSpin();
      this.state={kind:'presenting',result};if(result.totalWin>0)this.guardian?.react('ordinary');this.reels.highlight(result.wins.flatMap(w=>[...w.positions]));
      await this.presentAwardEvidence(result);
      if(result.featureResult)await this.presentFeature(result);
      if(result.totalWin>0)await this.presentWin(result.totalWin,winTier(result.totalWin/this.bet)>0,result.wins.some(w=>w.symbolId==='newcomer-benefit'));
      this.resetWinAmount(result.totalWin);
      if(this.hintLabel){const next=this.newcomerBenefit();this.hintLabel.string=cabinetRoundCaption(result,this.bet,next?.round);}
      this.state={kind:'idle'};this.refreshBalance();this.autoWait=.8;
    }catch(error){
      this.audio.stopSpin();this.audio.play('error');this.auto=false;this.updateAuto();console.error(error);
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
        else if(round.motion==='respin'){this.audio.play('spin');await reels.respinCells(round.grid,round.held??[]);}
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
      text(panel,'Choose a vault to reveal your treasure',0,145,760,72,39,COLORS.ink);
      text(panel,'The prize is already drawn. Your choice does not change the odds.',0,-283,760,100,31,COLORS.ink);
      await new Promise<void>(resolve=>{
        let chosen=false;
        const reveal=(i:number):void=>{
          if(chosen)return;chosen=true;this.audio.play('win');
          const award=feature.pickAwards?.[i]??feature.totalCredits;
          text(panel,money(award)+' COINS',0,-180,760,72,56,COLORS.ink,true);
          void Promise.all([this.countWinAmount(result.baseWin+feature.totalCredits,result.totalWin),this.delay(this.reduced?.15:1.3)]).then(()=>{this.closeModal();resolve();});
        };
        for(let i=0;i<3;i++){
          const hit=box(panel,'Open vault '+(i+1),(i-1)*250,-10,220,220);
          const treasure=this.art.image(hit,symbolAtlas(this.config.id),0,0,217,217,symbolArt(this.config.id,'safe'));bindPress(hit,treasure,()=>reveal(i));
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
      else{reels.begin();this.audio.play('spin');await reels.finishGrid(round.grid,true);}
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
    if(this.winLabel?.isValid)this.winLabel.string=money(amount);
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
  private async presentWin(amount:number,big:boolean,welcomeBonus=false):Promise<void>{
    if(big){
      this.guardian?.react(guardianAwardCue(winTier(amount/this.bet)));
      // Let the anchored guardian bow before the full-screen treasury opens.
      // Settlement is already complete; no extra payout or input latency.
      if(!this.reduced)await this.delay(.64);
      const stage=box(this.root!,'Treasure celebration',0,0,1080,this.height);this.modal=stage;stage.addComponent(BlockInputEvents);
      // Keep the integrated scene visible, but do not let cabinet readouts and
      // controls show through the transparent celebration artwork.
      const hidden=(this.plane?.children??[]).filter(n=>n.active&&!['Cabinet reflections','Reels','Continuous cabinet room'].includes(n.name));
      for(const n of [this.hintLabel?.node,this.content?.getChildByName('Award hint material'),this.content?.getChildByName('Safe top tools')])if(n?.active)hidden.push(n);
      const fades=hidden.map(n=>({node:n,alpha:n.getComponent(UIOpacity)??n.addComponent(UIOpacity)}));
      const prior=fades.map(f=>f.alpha.opacity);
      try{
        fades.forEach(f=>tween(f.alpha).to(this.reduced?.01:.22,{opacity:0},{easing:'sineInOut'}).start());
        await this.delay(.22);
        await stage.addComponent(SalonWinStage).setup(this.art,amount,this.height,this.reduced,amount/this.bet,GAME_CONFIGS.indexOf(this.config),welcomeBonus,this.audio);
      }finally{
        fades.forEach((f,i)=>{if(f.node.isValid)tween(f.alpha).to(this.reduced?.01:.3,{opacity:prior[i]},{easing:'sineInOut'}).start();});
        if(this.modal===stage)this.closeModal();
      }
    }else{
      // The stage owns its sound lease; partial/even returns receive a neutral cadence.
      const stage=box(this.content!,'Ordinary win presentation',0,0,1080,this.height);
      const hidden=[this.hintLabel?.node,this.content?.getChildByName('Award hint material')].filter((n):n is Node=>!!n&&n.active);
      hidden.forEach(n=>n.active=false);
      try{
        await Promise.all([this.countWinAmount(amount),stage.addComponent(OrdinaryWinStage).setup(this.art,amount,Safe.visibleHeight,this.reduced,this.bet,{y:-Safe.visibleHeight/2+290+Safe.safeBottom,width:980},this.audio)]);
      }finally{
        if(stage.isValid)stage.destroy();
        hidden.forEach(n=>{if(n.isValid)n.active=true;});
      }
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=tr(money(this.services.economy.balance()));}
  private delay(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,this.reduced?Math.min(.12,seconds):seconds));}
  protected update(dt:number):void{if(this.life){this.life.energy=this.state.kind==='spinning'?1:this.state.kind==='presenting'?.5:0;this.life.quiet=!!this.modal||this.state.kind==='presenting';}if(this.cabinetResizePending&&this.page==='game'&&this.state.kind==='idle'&&!this.busy&&!this.modal){this.reflowCabinet();return;}const fx=this.plane?.getChildByName('Cabinet reflections')?.getComponent(SalonAtmosphere);if(fx)fx.energy=this.state.kind==='spinning'?1:this.state.kind==='presenting'?.6:0;if(this.auto&&this.visible&&this.state.kind==='idle'&&this.page==='game'&&!this.modal){this.autoWait-=dt;if(this.autoWait<=0){this.autoWait=1;void this.spin();}}}
  private hide():void{this.audio.stopSpin();this.visible=false;this.auto=false;this.updateAuto();}
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
  /** One-line UI copy uses the full measured enamel height, not paragraph leading. */
  private compactCaption(label:Label):Label{
    label.enableWrapText=false;const fit=label.node.getComponent(TextFit)!;fit.compactLine=true;fit.fit();return label;
  }
  private storePage():void{
    const stage=this.pageStage("THE GILDED EXCHANGE"),stamp=this.generation;
    const titlePlate=this.art.image(stage,'canopy-soft-plate-0',0,625,940,180);
    this.compactCaption(text(titlePlate,"THE GILDED EXCHANGE",0,-5.6,820,56,44,COLORS.cream,true));
    // A slim opaque ribbon shields the status from the pendant on the shared
    // service-room artwork, without covering the first supply's engraving.
    const statusPlate=this.art.image(stage,'canopy-soft-plate-0',0,470,840,156);
    // A restore control is meaningful only when a native purchase bridge and
    // verification server are present. In browser preview it looked actionable
    // beside an explicitly unavailable catalog, then produced a dead-end toast.
    const purchasesReady=this.services.store.purchaseAvailable();
    this.compactCaption(text(statusPlate,purchasesReady?'Choose a coin supply':'Purchases unavailable',purchasesReady?-65:0,-4.875,purchasesReady?468:760,48,40,COLORS.cream));
    if(purchasesReady)this.art.button(stage,'Synchronize purchases',292,470,225,156,'Sync',undefined,()=>void this.restorePurchases(),0);
    // A single wide enamel ledger per supply keeps the amount and purchase
    // status in the calm center of the material, clear of the sculpted ends.
    const positions=[198,53,-92,-237];
    // Coin supplies are four touch regions on one carved exchange ledger.
    // Repeating a square frame as four thin strips flattened the painted
    // ornament and made the exchange resemble a list of web cards.
    // Extend only the sliced enamel, keeping the top relief in place.
    // The last exact amount must sit above the lower central finial.
    this.art.image(stage,'canopy-frame-0',0,-99,934,1138);
    const separators=box(stage,'Ledger engraved divisions',0,0,850,900).addComponent(Graphics);
    for(const y of [128,-17,-162]){
      separators.strokeColor=new Color(83,59,34,80);separators.lineWidth=2;
      separators.moveTo(-368,y);separators.lineTo(368,y);separators.stroke();
      separators.strokeColor=new Color(255,238,194,96);separators.lineWidth=1;
      separators.moveTo(-359,y-3);separators.lineTo(359,y-3);separators.stroke();
    }
    void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;
      items.slice(0,4).forEach((item,i)=>{const node=box(stage,'Supply '+item.id,0,positions[i],868,196);
        const total=item.credits+item.bonus,bonus=Math.round(item.bonus/item.credits*100);
        const art=this.art.image(node,symbolAtlas(GAME_CONFIGS[i].id),-330,0,90,90,[0,1,5,9][i]);
        if(!this.reduced){const alpha=opacity(art,245);tween(alpha).to(2.5+i*.3,{opacity:185},{easing:'sineInOut'}).to(2.5+i*.3,{opacity:245},{easing:'sineInOut'}).union().repeatForever().start();}
        // A row has only 155 design units before the next engraving. Keep
        // each line within that band so the next amount cannot cover the base.
        this.compactCaption(text(node,money(total),-26,44,468,52,43,COLORS.cream,true));
        this.compactCaption(text(node,bonus?bonus+'% BONUS':'STANDARD',-26,0,468,36,32,COLORS.cream,true));
        // The exact base/gift amount has a separate broad line, clear of both
        // the supply image and its price/status column. No number truncation.
        this.compactCaption(text(node,'Base '+money(item.credits)+' · Gift '+money(item.bonus),26,-48,568,42,32,COLORS.cream));
        // A decorative medallion occupied the first letters of "Offline".
        // Preview supplies must not look like an enabled purchase button.
        if(item.available){
          this.compactCaption(text(node,item.displayPrice,293,0,150,52,34,COLORS.cream,true));
          bindPress(node,node,()=>void this.purchase(item.id));
        }else{
          this.compactCaption(text(node,'Preview',293,0,150,52,34,COLORS.cream,true));
        }
      });
    }).catch(()=>this.toast('Shop unavailable. Please try again.'));
    const noticePlate=this.art.image(stage,'canopy-soft-plate-0',0,-526,840,156);
    this.compactCaption(text(noticePlate,'Virtual coins · No cash value',0,-4.875,740,48,35,COLORS.cream));
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
    const titlePlate=this.art.image(stage,'canopy-soft-plate-0',0,625,940,180);
    this.compactCaption(text(titlePlate,"SEVEN TURNS OF FORTUNE",0,-5.6,820,56,44,COLORS.cream,true));
    // Keep the day state above the check-in grid on its own engraved ribbon.
    const statusPlate=this.art.image(stage,'canopy-soft-plate-0',0,482,840,148);
    this.compactCaption(text(statusPlate,tr('DAY '+(active+1))+' · '+tr(claimed?'COLLECTED':'READY TO CLAIM'),0,-4.625,760,46,37,COLORS.cream));
    // Two-column ledger gives every day a full-width face on compact phones.
    const spots:number[][]=[[-242,362],[242,362],[-242,210],[242,210],[-242,58],[242,58],[0,-94]];
    this.services.checkIn.rewards.forEach((amount,i)=>{const [x,y]=spots[i],current=i===active,done=i<active||(current&&claimed),node=box(stage,'Check-in day '+(i+1),x,y,430,146);
      const dayPlate=this.art.image(node,'canopy-soft-plate-0',0,0,430,146);
      // One fitted caption prevents separate day/amount boxes from converging
      // into each other when the carved shoulders reduce the usable face.
      const caption=text(dayPlate,tr('DAY '+(i+1))+' · '+money(amount),0,-4.5,300,44,35,COLORS.cream,true,true);caption.enableWrapText=false;caption.node.getComponent(TextFit)!.compactLine=true;
      if(current){const glint=this.art.light(node,3,79,0,128,38,this.reduced?70:45);glint.setSiblingIndex(1);if(!this.reduced){const alpha=glint.getComponent(UIOpacity)!;tween(alpha).to(1.6,{opacity:140},{easing:'sineInOut'}).to(1.6,{opacity:45},{easing:'sineInOut'}).union().repeatForever().start();}}
      bindPress(node,node,()=>{if(current&&!claimed)void this.claim('check-in');else this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Upcoming'));});
    });
    this.art.button(stage,'Check in',0,-322,836,168,claimed?'DAY '+(active+1)+' COLLECTED':'CLAIM DAY '+(active+1)+' · '+money(this.services.checkIn.rewards[active]),undefined,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next reward after 00:00 UTC.');},2);
    const daily=box(stage,'Daily reward',0,-544,912,230),collected=!!scope?.claims['daily-free:'+today];
    this.art.image(daily,'symbols',-314,0,147,147,5);outlined(text(daily,'DAILY GIFT · '+money(ECONOMY.daily),109,68,573,50,35,COLORS.cream,true),'#352011',2);
    this.art.button(daily,'Claim daily',109,-60,660,156,collected?'COLLECTED':'Collect daily gift',undefined,()=>{if(!collected)void this.claim('daily');else this.toast('Today’s gift is already collected.');},1);
    this.compactCaption(outlined(text(stage,'Rewards reset at 00:00 UTC',0,-430,750,38,30,COLORS.cream),'#2B382F',2));
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
    const stage=this.pageStage('Mint honours');
    const titlePlate=this.art.image(stage,'canopy-soft-plate-0',0,625,940,180);
    this.compactCaption(text(titlePlate,'MINT HONOURS',0,-5.6,820,56,44,COLORS.cream,true));
    const stamp=this.generation;const render=(players=this.services.rank.list('all-time',this.services.profile.current())):void=>{if(stamp!==this.generation)return;
      const profile=this.services.profile.current();
      if(!this.services.remoteMode&&profile&&!players.some(p=>p.current))players=[...players,{rank:players.length+1,nickname:profile.nickname,winnings:profile.totalWin,avatar:profile.avatar,current:true}];
      const ranked=this.services.remoteMode?players.map(p=>({...p,virtual:false})):hallStandings(players),current=ranked.find(p=>p.current),visible=ranked.slice(0,7);
      // Keep the player's actual mixed rank visible even when outside the first six.
      if(current&&!visible.some(p=>p.current))visible[6]=current;
      // An almost-square engraved ledger keeps its ornament at its authored
      // proportions. The former 916×128 square frames crushed the border into
      // each name and score on a phone.
      this.art.image(stage,'canopy-frame-0',0,-16,948,1110);
      // Draw this inside the ledger after its opaque parchment; the previous
      // draw order buried the rank definition underneath the frame.
      const rankHeading=this.art.image(stage,'canopy-soft-plate-0',0,484,940,156);
      this.compactCaption(text(rankHeading,this.services.remoteMode?'PLAYERS · TOTAL WON':'VIRTUAL FRIENDS · TOTAL WON',0,-4.875,820,48,37,COLORS.cream));
      const trophy=this.art.image(stage,'interfaces',-306,247,140,140,3);this.idleAccent(trophy,0,7,.4,1.8);
      if(!visible.length){text(stage,'No settled rankings yet',0,150,800,100,36,COLORS.cream);return;}
      const first=visible[0],portrait=this.art.image(stage,'portraits',-151,247,118,118,first.avatar);this.idleAccent(portrait,0,5,.3,1.8);
      text(stage,'#'+first.rank+'  '+first.nickname,166,251,478,56,39,COLORS.cream,true).enableWrapText=false;
      text(stage,money(first.winnings),166,196,478,67,47,COLORS.cream,true).enableWrapText=false;
      text(stage,first.current?'YOU':first.virtual?'VIRTUAL FRIEND':'PLAYER',166,153,460,47,31,COLORS.cream);
      visible.slice(1).forEach((r,i)=>{
        // One reading line per entry: the ledger header identifies example
        // opponents, while names and values keep independent clear columns.
        const row=box(stage,r.current?'Your hall rank':'Hall rank '+r.rank,0,75-i*60,854,64);
        text(row,'#'+r.rank,-338,0,78,49,34,COLORS.cream,true);
        const face=this.art.image(row,'portraits',-248,0,68,68,r.avatar);
        const name=r.current?r.nickname+' · '+tr('YOU'):r.nickname;
        const nickname=text(row,name,-18,0,384,51,34,COLORS.cream,true,true);nickname.enableWrapText=false;
        const winnings=text(row,money(r.winnings),292,0,186,53,38,COLORS.cream,true);winnings.enableWrapText=false;
        if(r.virtual)this.idleAccent(face,i*.7,3,.2,2);
        this.reveal(row,i*.1);
      });
      // Compact phones place the shared navigation immediately below the
      // ranking parchment. Seat this action in its open lower area instead
      // of letting its touch bounds overlap the Hall and Rank rail keys.
      this.art.button(stage,'Explore games',0,-426,838,168,'Explore the mint',6,()=>void this.navigate('home'),3);
    };
    if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load honours.'));else render();
  }

  private profilePage():void{
    const stage=this.pageStage("MINT ACCOUNT"),p=this.services.profile.current();if(!p)return;
    const balance=this.services.economy.balance(),ledger=this.services.save.currentScope()?.transactions??[];
    const titlePlate=this.art.image(stage,'canopy-soft-plate-0',0,625,940,180);
    this.compactCaption(text(titlePlate,"MINT ACCOUNT",0,-5.6,820,56,44,COLORS.cream,true));
    // A single full-height journal page preserves the engraved frame's
    // geometry. Short, repeated frames squeezed their decorative ends over
    // the account values and made the page look like stacked web cards.
    // Keep the authored upper carving, but extend the sliced enamel so
    // journal copy no longer crosses the bottom finial on compact phones.
    this.art.image(stage,'canopy-frame-0',0,-76,940,1210);
    const portrait=this.art.image(stage,'portraits',-290,280,142,142,p.avatar);
    bindPress(portrait,portrait,()=>this.avatars());
    const nickname=outlined(text(stage,p.nickname,140,300,495,60,45,COLORS.cream,true),'#352011',3);nickname.enableWrapText=false;
    bindPress(nickname.node,nickname.node,()=>this.editNickname());
    this.compactCaption(text(stage,p.isGuest?'GUEST · LEVEL '+p.level:'MEMBER · LEVEL '+p.level,140,267,492,40,31,COLORS.cream));
    this.art.button(stage,'Edit nickname',140,165,530,144,'Edit name',undefined,()=>this.editNickname(),0);
    const stat=(x:number,y:number,label:string,value:number):void=>{
      this.compactCaption(text(stage,label,x,y+35,364,45,31,COLORS.cream,true));
      this.compactCaption(text(stage,money(value),x,y-25,364,66,46,COLORS.cream,true));
    };
    stat(-222,30,'TREASURY',balance);stat(222,30,'ROUNDS',p.gamesPlayed);
    stat(-222,-100,'BEST WIN',p.biggestWin);stat(222,-100,'TOTAL WON',p.totalWin);
    this.compactCaption(text(stage,'COIN JOURNAL',0,-193,750,48,38,COLORS.cream,true));
    this.compactCaption(outlined(text(stage,ledger.length+' recorded entries · '+(this.services.remoteMode?'Saved to your account':'Saved on this device'),0,-242,780,36,30,COLORS.cream),'#223B30',2));
    this.art.button(stage,'Open coin history',0,-340,744,156,'View history',undefined,()=>this.history(),2);
    const links:[string,()=>void][]=[['Portrait',()=>this.avatars()],['Language',()=>this.languages()],['Options',()=>this.accountOptions()]];
    // One continuous vellum register separates account links from the
    // journal's lower metal edge. Individual ornamental plates had their
    // medallions directly underneath the short labels on narrow phones.
    const accountLinks=this.art.image(stage,'canopy-soft-plate-0',0,-553,944,168);
    links.forEach(([label,action],i)=>{
      const hit=box(accountLinks,'Account '+label,[-240,0,240][i],-4.4,210,90);
      const caption=this.compactCaption(text(hit,label,0,-.85,204,46,36,COLORS.cream,true));
      bindPress(hit,caption.node,action);
    });
    // Sign out/deletion remain in Options on every viewport. Duplicating them
    // below this rail made tall phones collide with the shared navigation.
  }

  private accountOptions():void{
    const panel=this.sheet('Account options',1360);
    this.art.button(panel,'Account sound options',0,245,744,156,'Sound & feedback',undefined,()=>this.soundOptions(),0);
    this.art.button(panel,'Account privacy',0,65,744,156,'Privacy & Data',undefined,()=>this.legal('privacy'),0);
    this.art.button(panel,'Account sign out',0,-115,744,156,'Sign out',undefined,()=>void this.signOut(),0);
    this.art.button(panel,'Account delete',0,-295,744,156,'Delete account',undefined,()=>this.deleteAccount(),0);
  }

  private languages():void {
    if(this.busy)return;
    const panel=this.sheet('Choose language',1200);
    LANGUAGES.forEach((entry,i)=>{const n=this.art.button(panel,'Locale '+entry.code,0,230-i*122,760,118,entry.name,entry.code===language()?14:7,()=>{setLanguage(entry.code);this.closeModal();this.render();this.toast('Language saved.');},entry.code===language()?3:0);});
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
    text(panel,'Use 2–18 characters',0,157,680,56,32,COLORS.ink);
    this.field(panel,'Nickname',42,value,v=>value=v);
    const error=text(panel,'',0,-55,710,68,29,COLORS.ink);
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


  private avatars():void{const s=this.sheet('Choose your portrait',1480);for(let i=0;i<16;i++){const n=this.art.image(s,'portraits',(i%4-1.5)*210,330-Math.floor(i/4)*220,176,176,i);n.name='Choose avatar '+i;if(this.services.profile.current()?.avatar===i)this.art.image(n,'interfaces',65,-65,43,43,14);bindPress(n,n,()=>void this.selectPortrait(n,i));}}
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
  private history():void{
    const s=this.sheet('Your coin ledger',1480),rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];
    rows.forEach((r,i)=>{
      const row=box(s,'Coin ledger entry '+i,0,340-i*112,780,94);
      outlined(text(row,r.type.replace(/-/g,' '),-177,0,386,62,36,COLORS.cream),'#3A2010',2).enableWrapText=false;
      outlined(text(row,(r.amount>0?'+':'')+exactMoney(r.amount),215,0,334,62,38,COLORS.cream),'#3A2010',2).enableWrapText=false;
    });
    if(!rows.length){const icon=this.art.image(s,'interfaces',0,156,220,220,1);this.idleAccent(icon,0,7,.3,1.5);text(s,'Your coin ledger is ready',0,-20,820,90,40,COLORS.ink,true);text(s,'Collect a reward or play a round.\nYour coin activity will appear here.',0,-132,820,142,34,COLORS.ink);this.art.button(s,'Ledger rewards',0,-302,730,118,'Explore rewards',2,()=>{this.closeModal();void this.navigate('rewards');},0);}
  }
  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36,COLORS.ink);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void {
    const panel=this.sheet('Mailbox',1280),items=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).deleted);
    // The painted rim crosses the generic dialog title. Seat this heading on
    // the clear parchment below it; row copy is light against dark walnut.
    const heading=panel.getChildByName('Text:Mailbox');heading?.setPosition(0,395);
    text(panel,'Gifts and notices',0,310,750,55,34,COLORS.ink);
    items.forEach((m,i)=>{const state=this.services.mail.state(m.id),row=this.art.panel(panel,0,190-i*210,840,177,0);
      const icon=this.art.image(row,'interfaces',-293,0,94,94,state.read?5:2);
      const subject=outlined(text(row,m.title,45,0,450,54,34,COLORS.cream),'#352011',2);subject.enableWrapText=false;
      outlined(text(panel,state.claimed?'Attachment collected':m.credits?money(m.credits)+' COINS':state.read?'Read':'Unread',45,132-i*210,530,46,30,COLORS.cream),'#352011',2);
      bindPress(row,icon,()=>this.openMail(m.id));row.name='Mail item '+m.id;
    });
    if(!items.length)text(panel,'Your mailbox is empty',0,90,740,110,39,COLORS.ink);
    this.art.button(panel,'Claim all mail',-200,-426,390,118,'Collect all',14,()=>{if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}const amount=this.services.mail.claimAll();if(amount>0)this.audio.play('reward');this.render();this.mail();this.toast(amount?money(amount)+' coins collected':'No attachments to collect');},0);
    this.art.button(panel,'Clear read mail',200,-426,390,118,'Clear read',9,()=>{this.services.mail.deleteRead();this.render();this.mail();},0);
  }
  private openMail(id:string):void {
    const item=INBOX_MESSAGES.find(m=>m.id===id);if(!item)return;
    this.services.mail.read(id);this.render();const panel=this.sheet('Letter',1280),state=this.services.mail.state(id);
    text(panel,item.title,0,260,740,76,38,COLORS.ink,true);
    text(panel,item.body,0,112,740,160,33,COLORS.ink);
    const gift=this.art.image(panel,item.credits?'symbols':'interfaces',0,-70,140,140,item.credits?0:5);
    text(panel,item.credits?money(item.credits)+' COINS':'System notice',0,-173,700,55,37,COLORS.ink);
    this.art.button(panel,'Collect mail attachment',0,-277,730,100,state.claimed?'Attachment collected':item.credits?'Collect attachment':'Back to mailbox',14,()=>{
      if(!item.credits||state.claimed){this.mail();return;}
      if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}
      if(this.services.mail.claim(id)){this.audio.play('reward');this.render();this.openMail(id);this.toast(money(item.credits)+' coins collected');}
    },0);
    this.art.button(panel,'Back to mailbox',0,-383,580,76,'Back to mailbox',9,()=>this.mail(),0);
  }
  private ruleTab(parent:Node,name:string,x:number,label:string,selected:boolean,action:()=>void):void{
    // Parchment navigation needs unobstructed copy; a row of miniature framed
    // plates made the metal emblems collide with the words on small phones.
    const hit=box(parent,name,x,411,244,86);
    const face=box(hit,'Engraved tab face',0,0,244,86);
    const line=face.addComponent(Graphics);
    line.strokeColor=new Color(selected?'#F4D187':'#8A613E');line.lineWidth=selected?5:2;
    line.moveTo(-99,-30);line.lineTo(99,-30);line.stroke();
    const caption=outlined(text(face,label,0,6,228,60,selected?38:35,selected?'#FFF4D4':'#F1DBB4'),'#39200F',3);
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
      if(heading){heading.name='Rule dialog title';heading.setPosition(0,506);heading.getComponent(UITransform)?.setContentSize(690,70);const caption=heading.getComponent(Label);if(caption){outlined(caption,'#3A2010',3);caption.color=new Color(COLORS.cream);}}
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
    // Two centred sections per leaf use the enamel reading area; reserve the
    // carved side rails and bottom ornament rather than offsetting copy onto them.
    const sections=LEGAL_SECTIONS[which],pages=Math.ceil(sections.length/2);
    const s=this.sheet(which==='terms'?'Terms of Service':which==='privacy'?'Privacy & Data':'Player Support',1340,0,!this.modal);
    const title=s.children.find(child=>child.name.startsWith('Text:')&&!!child.getComponent(Label))?.getComponent(Label);
    if(title){title.node.getComponent(UITransform)?.setContentSize(540,82);title.color=new Color(COLORS.cream);outlined(title,'#39200F',4);}
    sections.slice(page*2,page*2+2).forEach((section,i)=>{
      const y=300-i*340;
      const heading=text(s,section.title,0,y,740,68,43,COLORS.ink,true);
      heading.enableWrapText=false;
      const body=text(s,section.body.replace(/\n/g,' '),0,y-135,710,190,37,COLORS.ink);
      body.fontFamily='Arial';body.isBold=false;
    });
    text(s,`${page+1} / ${pages}`,0,-305,145,44,32,COLORS.ink);
    if(page>0)this.art.button(s,'Previous legal page',-258,-305,240,100,'PREV',undefined,()=>this.legal(which,page-1),0);
    if(page<pages-1)this.art.button(s,'Next legal page',258,-305,240,100,'NEXT',undefined,()=>this.legal(which,page+1),0);
  }
  private sheet(title:string,height:number,style=2,animate=true):Node{
    height=Math.max(1000,height);
    this.closeModal();const overlay=box(this.root!,'Modal shield',0,0,Safe.visibleWidth,Safe.visibleHeight);overlay.addComponent(BlockInputEvents);
    const dim=overlay.addComponent(Graphics);dim.fillColor=new Color(17,32,27,150);dim.rect(-Safe.visibleWidth/2,-Safe.visibleHeight/2,Safe.visibleWidth,Safe.visibleHeight);dim.fill();
    const panel=this.art.panel(overlay,0,0,978,height,style);panel.name='Enamel dialog';
    outlined(text(panel,title,0,height/2-245,740,76,43,COLORS.cream,true),'#273D31',3);
    const close=this.art.button(panel,'Close dialog',413,height/2-73,95,95,'',15,()=>this.closeModal());
    close.getComponent(UITransform)!.setContentSize(152,152);
    // Preserve the sculpted frame while making both its purpose and touch target clear.
    const face=close.getChildByName('Press motion · Close dialog')?.getChildByName('Icon face')??close;
    const cross=text(face,'×',0,1,66,66,60,COLORS.cream);cross.lineHeight=66;
    if(!this.reduced&&animate){
      const alpha=opacity(overlay,0);tween(alpha).to(.2,{opacity:255}).start();
      panel.setPosition(0,-28);tween(panel).to(.32,{position:new Vec3(0,0,0)},{easing:'cubicOut'}).start();
    }
    this.modal=overlay;return panel;
  }
  private closeModal():void{if(this.modal){this.modal.active=false;this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,238,2);outlined(text(n,message,0,-7.4,650,74,36,COLORS.cream),'#223B30',2);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{globalThis.removeEventListener?.('aurelia-ui-press',this.playUiPress);this.cancelWinCount?.();game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
