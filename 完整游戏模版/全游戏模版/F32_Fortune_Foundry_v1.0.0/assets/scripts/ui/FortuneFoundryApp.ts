import { OrdinaryWinStage } from '../vfx/OrdinaryWinStage';
import {applyWelcomeAward} from '../math/WelcomeAwards';
import {LabelOutline} from 'cc';
import {cabinetToolText} from './CabinetToolText';
import {drawRulePages} from './RulePages';
import {awardCredits, awardEvidence, featureAwardEvidence, awardSummary, roundEvidence, tierRules, winTier} from '../vfx/WinPresentation';
import {primaryRuleText} from '../math/PrimaryRuleText';
import {drawRuleHelp,helpTitle} from './RuleHelp';
import {primaryStatus,HAND_NAMES,HAND_FACTORS} from '../math/IndependentCore';
import {CORE_TITLE,CORE_NOTES,CORE_DESCRIPTIONS,coreSymbols} from '../math/CoreGame';
import {SIGNATURE_TITLE,SIGNATURE_NOTES,FEATURE_PROFILES} from '../math/SignatureFeature';
import {ECONOMY} from '../math/EconomyProfile';
import { INBOX_MESSAGES } from '../services/MailService';
import {tr,language,setLanguage,initializeLanguage,LANGUAGES} from './Language';
import { _decorator, BlockInputEvents, Color, Component, EditBox, EventTouch, game, Game, Label, Mask, Node, ScrollView, Sprite, sys, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SecureRNG } from '../core/SecureRNG';
import { AudioManager } from '../audio/AudioManager';
import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import { GAME_CONFIGS, SYMBOL_ART, symbolAtlas, prizeArt } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import { ruleAward,ruleCounts ,ruleAllCounts} from '../math/PaytableDisplay';
import type { GameConfig, GameId, SpinResult } from '../math/types';
import type { AuthResult } from '../services/AuthService';
import { ApiRequestError } from '../services/ProductionApiClient';
import { RemoteSpinJournal } from '../services/RemoteSpinJournal';
import { hallStandings } from '../services/RankService';
import { STORE_PRODUCTS } from '../services/StoreService';
import { FoundryReels } from '../reels/FoundryReels';
import { FoundryAtmosphere } from '../vfx/FoundryAtmosphere';
import { FoundryFixtureMotion } from '../vfx/FoundryFixtureMotion';
import { FoundryWinStage } from '../vfx/FoundryWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { FoundryArt, box, text, opacity, bindPress, outlined, COLORS } from './FoundryArt';
import { CABINETS, CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT, imagePoint, cabinetLayout, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const MODES = GAME_CONFIGS.map(c=>c.modeLabel);
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
// The narrow engraved cabinet counters show a short form; account and history keep exact amounts.
const cabinetMoney=(n:number):string=>Math.abs(n)>=100000?topWinMoney(n):money(n);
@ccclass('FortuneFoundryApp')
export class FortuneFoundryApp extends Component {
  private art=new FoundryArt();private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private retiring?:Node;private modal?:Node;private notification?:Node;private reels?:FoundryReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private authExpanded=false;private selectedBundle=0;private curtainClosed=false;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
  private balanceLabel?:Label;private betLabel?:Label;private winLabel?:Label;private topWinLabel?:Label;private hintLabel?:Label;
  private rewardNotice?:{kind:'daily'|'check-in';amount:number};
  private presentedWin=0;private cancelWinCount?:()=>void;
  private top=960;private height=1920;private debug=false;private reduced=false;private force?:string;
  private draft={username:'',password:'',confirmPassword:'',nickname:'',acceptedTerms:false};
  private generator=new ResultGenerator();private rng=new SecureRNG();private audio!:AudioManager;
  private journal!:RemoteSpinJournal;
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
    const runtime=globalThis as typeof globalThis&{__FORTUNE_FOUNDRY_API_URL__?:string};
    this.services=new GameBootstrap(undefined,false,runtime.__FORTUNE_FOUNDRY_API_URL__);
    this.journal=new RemoteSpinJournal(this.services.save);
    let loading:Node|undefined,progress:Label|undefined;
    try{
      // The first visible frame is generated artwork too. Load the tiny visual
      // bootstrap set before constructing the loading surface, then render every
      // progress/veil element from CC Switch bitmaps rather than vector drawing.
      const visualBootstrap=['foundry-loading-scene','foundry-ui-components','foundry-brand-lettered','foundry-veil','optics'] as const;
      await this.art.load(visualBootstrap);
      this.node.getComponent(Safe)?.setRotateBackdrop(this.art.frame('foundry-loading-scene'));
      loading=box(this.node,'Loading',0,0,Safe.visibleWidth,this.height);
      this.art.cover(loading,'foundry-loading-scene',0,0,Safe.visibleWidth,this.height);
      const bootBrand=this.art.image(loading,'foundry-brand-lettered',0,this.height*.32,880,250);this.titleLuster(bootBrand,880,250,'brand');
      const bootTrack=this.art.stretch(loading,'foundry-ui-components',0,-this.height*.19,750,118,7,true);
      progress=text(loading,'Igniting the fortune line…',0,-this.height*.27,900,62,35,COLORS.cream,true);
      const bootFillNode=this.art.stretch(bootTrack,'foundry-ui-components',0,0,730,58,1);
      const bootFill=bootFillNode.getComponent(Sprite)!;bootFill.type=Sprite.Type.FILLED;bootFill.fillType=Sprite.FillType.HORIZONTAL;bootFill.fillStart=0;bootFill.fillRange=0;
      const setBootProgress=(value:number):void=>{bootFill.fillRange=Math.max(0,Math.min(1,value));};
      const allArt=Array.from(new Set([...GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),symbolAtlas(c.id)+'-blur',prizeArt(c.id)]),'symbols','interfaces','portraits','symbols-blur','optics','apple-mark','foundry-brand-lettered','foundry-page-titles',...Array.from({length:4},(_,i)=>'foundry-title-'+i),'foundry-services','foundry-arrival',...Array.from({length:4},(_,i)=>'foundry-frame-'+i),...Array.from({length:4},(_,i)=>'foundry-plate-'+i),...Array.from({length:16},(_,i)=>'foundry-button-'+i),'foundry-hall','foundry-home-hall-tall','foundry-treasures','foundry-win-machines','foundry-award-ordinary','foundry-award-big','foundry-award-super','foundry-celebration-big','foundry-celebration-super','foundry-loading-scene','foundry-hall-seals','foundry-title-strips','foundry-auth-gate','foundry-nav-rail','foundry-shop-rack','foundry-reward-dial','foundry-rank-wall','foundry-passport','foundry-modal-drawer']));
      await this.art.load(allArt,(n,t)=>{
        const value=n/t*.9;setBootProgress(value);progress!.string=tr(`Calibrating the mint line  ${Math.round(value*100)}%`);
        globalThis.dispatchEvent?.(new CustomEvent('foundry-load-progress',{detail:{progress:value}}));
      });
      const resumed=await this.services.resumeSession();
      if(this.debug&&!resumed){this.accept();await this.services.auth.guestLogin();}
      const requested=query.get('screen') as Page|null;
      this.config=GAME_CONFIGS.find(g=>g.id===query.get('game'))??GAME_CONFIGS[0];
      this.page=(resumed||this.debug)?(requested??'home'):'login';
      if(!['home','login','register','game','store','rewards','rank','profile'].includes(this.page))this.page='home';
      this.audio.setEffects(this.services.profile.current()?.settings.sound??true);
      this.restoreRemoteRound();
      if(this.page==='game')await this.art.load([this.config.id+'-room',this.config.id+'-tall-plane']);
      setBootProgress(1);this.render();loading.destroy();
      globalThis.dispatchEvent?.(new Event('foundry-app-ready'));
    }catch(error){if(progress&&loading){progress.string=tr('Could not start the mint line. Tap to retry.');loading.on(Node.EventType.TOUCH_END,()=>{loading?.destroy();void this.boot();});}globalThis.dispatchEvent?.(new Event('foundry-load-error'));console.error(error);}
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
    // Only preserve a live form while its native keyboard is actively editing.
    // Initial browser orientation and the actual viewport can differ during
    // async asset loading; a stale 1920-high root leaves black letterboxes.
    const editing=typeof document!=='undefined'&&['INPUT','TEXTAREA'].includes(document.activeElement?.tagName??'');
    if(this.root&&(this.page==='login'||this.page==='register')&&editing)return;
    if(this.root&&!this.busy)this.render();
  }
  private render():void{
    this.node.getComponent(Safe)?.refresh();
    this.cancelWinCount?.();this.presentedWin=0;
    this.art.reducedMotion=this.reduced;
    this.generation++;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.topWinLabel=this.hintLabel=this.autoLamp=this.soundLamp=undefined;
    const previous=this.root;if(previous){const a=opacity(previous,255);Tween.stopAllByTarget(a);a.opacity=255;for(const edit of previous.getComponentsInChildren(EditBox))edit.enabled=false;}
    if(this.retiring&&this.retiring!==previous)this.retiring.destroy();this.retiring=previous;
    this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Fortune-Foundry-interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='home'?'foundry-hall':this.page==='login'||this.page==='register'?'foundry-arrival':'foundry-services';
    this.bg=this.page==='game'||this.page==='home'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);

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
    if(page!=='rewards')this.rewardNotice=undefined;
    let loading:Node|undefined;
    try{
      if(config){loading=this.gameLoading(config);await Promise.all([this.art.load([config.id+'-room',config.id+'-tall-plane'],(done,total)=>this.loadingProgress?.(done/total*.8,'Heating the cabinet line…')),this.delay(this.reduced?.15:1.65)]);}

      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(.9,'Opening the cabinet gate…');}if(!this.reduced)await this.delay(.4);
      if(loading){this.loadingProgress?.(1,'Ready');await this.delay(this.reduced?.01:.65);await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.32,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet line could not start. Please try again.');}
    finally{if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.busy=false;}
  }
  private gameLoading(config:GameConfig):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);this.art.cover(n,'foundry-loading-scene',0,0,Safe.visibleWidth,this.height);
    const stage=box(n,'Coin press loading line',0,0,1020,1410);const scale=Math.min(1,(Safe.visibleWidth-65)/1020,(this.height-230)/1410);stage.setScale(scale,scale,1);
    const rail=this.art.stretch(stage,'foundry-ui-components',0,-this.height*.19/scale,750,118,7,true);rail.name='Generated loading progress track';
    const fillNode=this.art.stretch(rail,'foundry-ui-components',0,0,730,58,1);fillNode.name='Generated molten progress fill';const fill=fillNode.getComponent(Sprite)!;fill.type=Sprite.Type.FILLED;fill.fillType=Sprite.FillType.HORIZONTAL;fill.fillStart=0;fill.fillRange=0;
    const percentage=text(stage,'0%',0,-this.height*.20/scale,250,58,42,COLORS.cream);percentage.node.name='Loading percentage';const status=text(stage,'Heating the coin die…',0,-this.height*.24/scale,900,64,40,COLORS.cream);
    const progress={value:0};let target=0,caption='Cooling the enamel…';const draw=()=>{if(!n.isValid)return;fill.fillRange=Math.max(0,Math.min(1,progress.value));percentage.string=tr(Math.round(progress.value*100)+'%');status.string=tr(progress.value>=1?'Coin polished · Line ready':progress.value<.32?'Heating the coin die…':progress.value<.66?'Pressing the fortune seal…':progress.value<.92?'Cooling the enamel…':caption);};
    this.loadingProgress=(value,message)=>{target=Math.max(target,Math.min(1,value));caption=message;Tween.stopAllByTarget(progress);if(this.reduced){progress.value=target;draw();}else tween(progress).to(.45,{value:target},{easing:'sineInOut',onUpdate:draw}).start();};draw();return n;
  }
  private header():void{
    const p=this.services.profile.current(),y=this.top-92-Safe.safeTop;
    const manifold=this.art.panel(this.content!,-165,y,600,108,2);manifold.name='Foundry pressure manifold';
    const gauge=this.art.image(manifold,'symbols',-247,0,66,66,0);this.idleAccent(gauge,0,3,.6,1.8);
    text(manifold,'MINT BALANCE',-125,24,192,33,26,COLORS.ink,true);
    this.balanceLabel=text(manifold,money(this.services.economy.balance()),22,-8,278,58,41,COLORS.ink);this.balanceLabel.enableWrapText=false;
    const topup=this.art.image(manifold,'foundry-button-5',246,0,70,70);topup.name='Open coin dispensary';bindPress(topup,topup,()=>void this.navigate('store'));
    const mailboxButton=this.art.button(this.content!,'Mail chute',190,y,91,91,'',5,()=>this.mail());const unreadMail=INBOX_MESSAGES.filter(m=>{const state=this.services.mail.state(m.id);return !state.read&&!state.deleted;}).length;if(unreadMail)text(mailboxButton,String(unreadMail),33,33,40,40,27,COLORS.cream,true);
    const avatar=this.art.image(this.content!,'portraits',431,y,109,109,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    outlined(text(this.content!,p?.nickname??'Guest',306,y-61,205,42,29,COLORS.cream,false,true),'#173F49',2).enableWrapText=false;
  }
  private navigation():void{
    const nav=box(this.content!,'Foundry rail navigation',0,-this.top+108+Safe.safeBottom,1024,220);this.art.image(nav,'foundry-nav-rail',0,0,1024,220);
    // Short visible names keep the five destinations legible on 320px phones.
    // Full semantic names remain on the hit targets via the page routes.
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Shop','Daily','Mint','Rank','Me'],icons=[1,2,6,3,4];
    // The generated rail is not five mathematically even circles: its inlay
    // centres are measured from the artwork, including the raised mint seal.
    const inlays=[{x:-409,y:-9},{x:-217,y:-9},{x:0,y:2},{x:217,y:-9},{x:409,y:-9}];
    pages.forEach((page,i)=>{
      const center=i===2,active=page===this.page,{x,y}=inlays[i];
      const hit=box(nav,labels[i],x,y,176,202);
      if(active){const glow=this.art.light(hit,1,0,8,142,142,100);glow.setSiblingIndex(0);if(!this.reduced)tween(glow).to(1.5,{scale:new Vec3(1.12,1.12,1)},{easing:'sineInOut'}).to(1.5,{scale:new Vec3(.94,.94,1)},{easing:'sineInOut'}).union().repeatForever().start();}
      const icon=this.art.image(hit,'interfaces',0,15,center?80:67,center?80:67,icons[i]);
      outlined(text(hit,labels[i].toUpperCase(),0,-29,148,38,30,active?COLORS.gold:COLORS.cream,true),'#093C3A',1);
      this.idleAccent(icon,i*.54,center?7:4,center?3:2);bindPress(hit,icon,()=>void this.navigate(page));
    });
  }
  private metalEdges(parent:Node,w:number,h:number,phase:number):void{
    const fx=box(parent,'Gilded reflection',0,0,w,h).addComponent(FoundryAtmosphere);
    fx.metalFrame(this.art,w,h,phase);fx.reducedMotion=this.reduced;
  }
  private pageTitle(stage:Node,index:number,caption:string,y=635):void{
    const english=language()==='en';
    const plaque=this.art.image(stage,english?'foundry-page-titles':'foundry-title-strips',0,y,900,160,index);
    this.titleLuster(plaque,900,160,'page',index*.5);
    // Translation is part of the plaque, not a detached overlay. Both stay anchored.
    if(!english)outlined(text(plaque,tr(caption),0,0,740,66,43,index===1||index===3?COLORS.cream:COLORS.ink,true),index===1||index===3?'#083D42':'#D4AD5E',2).enableWrapText=false;
  }
  private pageStage(name:string):Node{
    const available=this.height-320-Safe.safeTop-Safe.safeBottom;
    const widthLimit=name==='FOUNDRY PASSPORT'?(Safe.visibleWidth-24)/1024:(Safe.visibleWidth+150)/1020;
    const scale=Math.min(1.3,available/1400,widthLimit);
    const n=box(this.content!,name,0,(Safe.safeBottom-Safe.safeTop)/2,1020,1400);n.setScale(scale,scale,1);return n;
  }
  // CC Switch illustrated treasures stay outside the reading / touch column.
  // They share the world perspective of the mint floor, not the button layer.
  private treasureFlanks(stage:Node, leftIndex:number, rightIndex:number, y=-400):void{
    const left=this.art.image(stage,'foundry-treasures',-446,y,170,170,leftIndex);
    const right=this.art.image(stage,'foundry-treasures',446,y+18,170,170,rightIndex);
    this.idleAccent(left,.3,4,.2,2.4);this.idleAccent(right,1.1,5,.2,2.7);
  }
  private homePage():void{
    // A single CC Switch illustrated treasury, rather than another cabinet
    // showroom. The live entrances are embedded in its brass balustrade.
    const scene=box(this.content!,'Grand treasury fountain',0,0,1024,2208);
    scene.setSiblingIndex(0);
    const scale=Math.max(Safe.visibleWidth/1024,this.height/2208);
    scene.setScale(scale,scale,1);
    this.art.image(scene,'foundry-home-hall-tall',0,0,1024,2208);
    const fountain=box(scene,'Minted fountain current',0,0,1024,900).addComponent(FoundryFixtureMotion);
    fountain.setup(this.art,'hall',this.reduced);
    const stations=box(scene,'Four engraved mint entrances',0,-135,1024,210);
    const positions=[-360,-120,120,360],short=['PRESS','LEDGER','CLOUD','VAULT'];
    GAME_CONFIGS.forEach((cfg,i)=>{
      const hit=box(stations,'Enter '+cfg.name,positions[i],0,195,300);
      const picture=this.art.image(hit,'foundry-hall-seals',0,16,119,119,i);this.idleAccent(picture,i*.7,3,.25,2.2);
      fountain.attachHallSeal(this.art,hit,i);
      // Each caption is engraved in a generated ivory recess, not set directly
      // on the dark balustrade. Keep the whole row inside its station hit box.
      this.art.image(hit,'foundry-plate-0',0,-67,184,100);
      const label=text(hit,short[i],0,-67,152,43,25,COLORS.ink,true);label.enableWrapText=false;
      // A minted seal is the entrance itself: one tap starts loading its cabinet.
      // navigate's busy guard prevents rapid taps from launching two rooms.
      bindPress(hit,hit,()=>{this.audio.play('tap');void this.navigate('game',cfg);});
    });
  }
  private authDecor():void{
    if(this.reduced)return;
    const layer=box(this.content!,'Mint entrance machinery',0,0,1080,this.height);layer.setSiblingIndex(0);
    for(let i=0;i<10;i++){
      const side=i%2?-1:1,x=side*(468-(i%3)*13),node=this.art.image(layer,'symbols',x,-this.top+190,42+i%3*8,42+i%3*8,[0,10,13][i%3]);node.name='Rising minted token';const alpha=opacity(node,0),start=new Vec3(x,-this.top+190,0),end=new Vec3(x-side*24,this.top-250,0);
      tween(node).delay(i*.72).repeatForever(tween().set({position:start,angle:0}).to(7.2,{position:end,angle:220*(i%2?1:-1)},{easing:'sineInOut'})).start();tween(alpha).delay(i*.72).repeatForever(tween().to(.65,{opacity:225}).delay(5.2).to(1.25,{opacity:0})).start();
    }
    for(let i=0;i<12;i++){const side=i%2?-1:1,x=side*(474+(i%3)*12),y=-this.top+270+(i/12)*(this.height-480),star=this.art.light(layer,3,x,y,36+(i%3)*13,36+(i%3)*13,145),alpha=star.getComponent(UIOpacity)!;tween(star).delay(i*.21).repeatForever(tween().by(2.2,{position:new Vec3(-side*17,38,0),angle:50},{easing:'sineInOut'}).by(2.2,{position:new Vec3(side*17,-38,0),angle:-50},{easing:'sineInOut'})).start();tween(alpha).delay(i*.21).to(1.1,{opacity:235}).to(1.7,{opacity:28}).union().repeatForever().start();}
  }
  private authPage():void{
    const register=this.page==='register';this.authDecor();
    this.art.button(this.content!,'Language selector',Safe.visibleWidth/2-170,this.top-Safe.safeTop-88,290,80,'Language',7,()=>this.languages(),0);
    const stage=box(this.content!,'Foundry entry pass',0,28,1020,1640),scale=Math.min(1,(this.height-235-Safe.safeTop-Safe.safeBottom)/1640,(Safe.visibleWidth-38)/1020);stage.setScale(scale,scale,1);
    // A CC Switch nameplate leaves its central enamel field blank so the
    // actual localized game title remains sharp rather than AI-rendered type.
    const brand=this.art.image(stage,'foundry-brand-lettered',0,738,990,330);this.titleLuster(brand,990,330,'brand');
    // One taller generated gate physically includes the quiet parchment, three
    // legal recesses and compliance strip. Its top stays aligned with the nameplate.
    const gate=this.art.image(stage,'foundry-auth-gate',0,-234.5,1163,1744);gate.name='Mechanical foundry admission gate';this.metalEdges(gate,1080,1670,.8);
    box(stage,'Embedded admission pipe lights',0,0,1020,1640).addComponent(FoundryFixtureMotion).setup(this.art,'entry',this.reduced);
    const passPlate=this.art.image(stage,'foundry-title-strips',0,210,540,90,3);this.titleLuster(passPlate,540,90,'page',.4);
    outlined(text(passPlate,register?'CREATE YOUR PASS':'FOUNDRY PASS',0,0,475,62,34,COLORS.cream,true),'#0D4541',1);
    this.field(stage,'Username',register?128:121,this.draft.username,v=>this.draft.username=v,false,true);
    this.field(stage,'Password',register?20:12,this.draft.password,v=>this.draft.password=v,true,true);
    if(register){
      this.field(stage,'Confirm password',-88,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true,true);
      this.field(stage,'Nickname',-196,this.draft.nickname,v=>this.draft.nickname=v,false,true);
      const check=this.art.button(stage,'Accept terms',-202,-311,76,76,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1),mark=opacity(check,this.draft.acceptedTerms?255:65);
      text(stage,'I meet the age requirement\nand accept Terms and Privacy.',55,-311,345,98,26,COLORS.ink);
      const primary=this.art.button(stage,'Create foundry pass',0,-429,475,106,'CREATE FOUNDRY PASS',undefined,()=>void this.authAction('register'),3);this.metalEdges(primary,450,96,1.1);
      this.art.button(stage,'Switch account form',0,-550,465,82,'Return to sign in',undefined,()=>void this.navigate('login'),0);
    }else{
      const primary=this.art.button(stage,'Sign in',0,-117,480,111,'OPEN THE MINT FLOOR',undefined,()=>void this.authAction('login'),3);this.metalEdges(primary,450,99,.7);
      const apple=this.art.panel(stage,0,-247,482,95,1);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-174,0,38,46);outlined(text(apple,'Sign in with Apple',32,0,382,65,31,COLORS.cream),'#12373C',2);bindPress(apple,apple,()=>void this.authAction('apple'));
      this.art.button(stage,'Guest',-125,-377,230,86,'Visitor pass',undefined,()=>this.guestConsent(),0);
      this.art.button(stage,'Create account',125,-377,230,86,'Create pass',undefined,()=>void this.navigate('register'),0);
    }
    // Live, tappable labels sit on the generated brass legal recesses, rather
    // than attaching three independent sticker buttons below the artwork.
    ['Terms','Privacy','Support'].forEach((title,i)=>{
      const link=box(stage,title+' legal recess',(i-1)*284,-843,230,84);
      text(link,title,0,0,215,50,29,COLORS.ink,true);
      bindPress(link,link,()=>this.legal(['terms','privacy','support'][i] as LegalPage));
    });
    text(stage,'Virtual coins · No cash prizes · Eligible adults only',0,-941,850,43,25,COLORS.cream,true);
  }
  private field(parent:Node,placeholder:string,y:number,value:string,onChange:(v:string)=>void,password=false,compact=false):EditBox{
    // Configure off-stage: EditBox onLoad otherwise creates default labels
    // and clears the existing material before our references are assigned.
    // The enlarged gate has a ~500-unit parchment width: compact auth plates
    // fit entirely within it. Other account dialogs retain their old width.
    const frame=this.art.panel(parent,0,y,compact?475:620,90,0);
    const n=box(frame,'Text entry',0,0,compact?408:532,78);n.active=false;
    const focusFrame=this.art.stretch(n,'foundry-ui-components',0,0,compact?448:582,72,2,true);focusFrame.name='Generated focused gold edge';
    const focusOpacity=opacity(focusFrame,0);const edit=n.addComponent(EditBox);
    edit.backgroundImage=null!;
    const label=text(n,value,0,0,compact?402:526,72,37,COLORS.ink,false,true);label.horizontalAlign=Label.HorizontalAlign.LEFT;label.isBold=true;
    const hint=text(n,placeholder,0,0,compact?402:526,72,33,COLORS.ink);hint.horizontalAlign=Label.HorizontalAlign.LEFT;hint.isBold=true;
    // EditBox positions labels by their top-left corner, not their center.
    label.node.getComponent(UITransform)!.setAnchorPoint(0,1);hint.node.getComponent(UITransform)!.setAnchorPoint(0,1);
    edit.textLabel=label;edit.placeholderLabel=hint;edit.placeholder=tr(placeholder);edit.inputMode=EditBox.InputMode.SINGLE_LINE;edit.maxLength=password?72:18;
    // Assigning labels while EditBox is still in its default multiline mode
    // changes vertical alignment to TOP. Single-line mode does not reset it.
    label.verticalAlign=hint.verticalAlign=Label.VerticalAlign.CENTER;
    label.lineHeight=54;hint.lineHeight=48;
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
      if(result.ok){this.draft.password=this.draft.confirmPassword='';this.page='home';if(this.restoreRemoteRound())await this.art.load([this.config.id+'-room',this.config.id+'-tall-plane']);this.render();}else this.toast(result.message??'Unable to sign in.');
    }catch{this.toast('Unable to connect. Your form has been kept.');}finally{this.busy=false;}
  }
  private policyConsent():void{
    if(this.modal)return;
    const panel=this.sheet('Foundry pass terms',710);
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
    // The extra tablet gutters show a separately generated EMPTY room, never
    // a second cabinet. The feathered foreground remains the measured single
    // 1024×2048 cabinet plane shared by every reel and touch aperture.
    this.art.cover(this.content!,cfg.id+'-room',0,0,Safe.visibleWidth,this.height);
    this.plane=box(this.content!,'Cabinet-coordinate-plane',0,0,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT);
    this.art.image(this.plane,cfg.id+'-tall-plane',0,0,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT);
    // Ambient light must render over the opaque integrated environment plate.
    // It shares the cabinet's coordinate plane with the reels and controls.
    const ambient=box(this.plane,'Cabinet reflections',0,0,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT).addComponent(FoundryAtmosphere);
    ambient.setup(this.art,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT);ambient.cabinet(this.art,g);ambient.reducedMotion=this.reduced;

    const titlePoint=imagePoint(g.title),title=this.art.image(this.plane,'foundry-title-'+GAME_CONFIGS.indexOf(cfg),titlePoint[0],titlePoint[1],g.title[2]*.96,g.title[3]*.94);
    title.name='Animated cabinet title · '+cfg.name;
    // The metal nameplate is bolted to the machine. Animate its enamel and
    // gemstones, never the whole title (which would visibly unseat the mount).
    this.titleLuster(title,title.getComponent(UITransform)!.width,title.getComponent(UITransform)!.height,'cabinet',GAME_CONFIGS.indexOf(cfg)*.65);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(FoundryReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.play('reel-stop');ambient.land(column);};
    // The CC Switch painting already contains sculpted console pockets. Keep
    // only live numerals on top: no extra rectangular fascia or glued-on cards.
    const readoutInk=g.ink,readoutOutline=cfg.id==='coin-press'?'#402313':'#FFF8E7';
    const readout=(label:string,rect:Box,value:string,options:{reserveRight?:number;shiftX?:number;inline?:boolean}={}):Label=>{
      const [x,y]=imagePoint(rect),reserve=options.reserveRight??0,shift=options.shiftX??0;
      const host=box(this.plane!,label,x+shift,y,rect[2],rect[3]);
      if(options.inline){
        const single=outlined(text(host,label.toUpperCase()+'  '+value,0,0,rect[2]*.88,rect[3]*.83,38,readoutInk),readoutOutline,1);
        single.enableWrapText=false;return single;
      }
      // The right edge of BALANCE belongs to the inlaid + key, not to the numerals.
      // Use the same measured aperture on every device; shrink text before it can
      // cross the metal divider, and never put the win prefix in the number slot.
      const liveWidth=rect[2]-reserve-20,liveX=-reserve/2;
      const caption=text(host,label.toUpperCase(),liveX,rect[3]*.24,liveWidth,rect[3]*.25,24,readoutInk);
      caption.enableWrapText=false;
      const number=outlined(text(host,value,liveX,-rect[3]*.14,liveWidth,rect[3]*.48,42,readoutInk),readoutOutline,1);
      number.enableWrapText=false;return number;
    };
    this.balanceLabel=readout('Balance',g.balance,cabinetMoney(this.services.economy.balance()),{reserveRight:42});
    const balance=imagePoint(g.balance);
    const recharge=this.art.image(this.plane,'foundry-button-'+(GAME_CONFIGS.indexOf(cfg)*4+1),balance[0]+g.balance[2]*.41,balance[1]-g.balance[3]*.10,37,37);
    recharge.name='Recharge';bindPress(recharge,recharge,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    this.betLabel=readout('Bet',g.bet,cabinetMoney(this.bet),{inline:cfg.id==='jubilee-vault'});
    this.winLabel=readout('Win',g.win,'0',{shiftX:cfg.id==='cloud-conveyor'?-44:0});
    const ctl=(rect:Box,label:string,index:number,action:()=>void):Node=>{
      const pos=imagePoint(rect);const hit=box(this.plane!,label,pos[0],pos[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset='foundry-button-'+(theme*4+index);
      const face=this.art.image(hit,asset,0,0,rect[2],rect[3]);
      this.cabinetButtonMotion(face,rect[2],rect[3],theme,index);
      bindPress(hit,face,()=>{this.audio.play('tap');ambient.land(-1);action();},[
        {depth:5,compression:.97,release:.12,tilt:-3},
        {depth:7,compression:.985,release:.14,tilt:0},
        {depth:4,compression:.94,release:.23,tilt:2},
        {depth:4,compression:.96,release:.18,tilt:-2},
      ][theme]);return hit;
    };
    ctl(g.minus,'Decrease bet',2,()=>this.changeBet(-1));ctl(g.plus,'Increase bet',1,()=>this.changeBet(1));
    const spin=ctl(g.spin,'SPIN',0,()=>void this.spin());
    // The generated enamel button is the complete tactile spin face.
    text(spin,'SPIN',0,-g.spin[3]*.32,g.spin[2]*1.24,35,28,'#FFF6DB');

    const auto=ctl(g.auto,'AUTO',3,()=>{this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');if(this.auto&&this.state.kind==='idle')void this.spin();});
    const autoStatus=imagePoint(g.status);this.autoLamp=outlined(text(this.plane,'AUTO OFF',autoStatus[0],autoStatus[1],g.status[2],g.status[3],31,'#432B20'),'#FFF8E7',1);this.autoLamp.enableWrapText=false;this.autoLamp.overflow=Label.Overflow.SHRINK;this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const toolbar=box(this.content!,'Safe top tools',0,this.top-95-Safe.safeTop,1000,154);
    const tool=(name:string,x:number,icon:number,label:string,action:()=>void):Label=>{
      const hit=box(toolbar,name,x,0,180,160),face=box(hit,name+' face',0,0,180,154);
      this.art.image(face,'interfaces',0,36,64,64,icon);
      const caption=outlined(text(face,cabinetToolText(label),0,-36,172,82,38,COLORS.cream),'#15352F',2);
      const fit=caption.node.getComponent('TextFit');if(fit)fit.enabled=false;
      caption.fontFamily='Arial';caption.lineHeight=40;caption.enableWrapText=false;caption.overflow=Label.Overflow.CLAMP;
      bindPress(hit,face,()=>{this.audio.play('tap');action();});return caption;
    };
    tool('Back to mint floor',-427,9,'BACK',()=>void this.navigate('home'));
    tool('Rules',290,7,'RULES',()=>this.rules());
    this.soundLamp=tool('Audio',436,8,'SOUND ON',()=>void this.toggleSound());this.updateSound();
    this.hintLabel=outlined(text(this.content!,MODES[GAME_CONFIGS.indexOf(cfg)],0,-this.top+88+Safe.safeBottom,980,110,38,COLORS.cream));
    this.hintLabel.node.getComponent(LabelOutline)!.width=4;this.hintLabel.node.getComponent('TextFit')!.enabled=false;this.hintLabel.fontSize=42;this.hintLabel.lineHeight=46;this.hintLabel.enableWrapText=false;this.hintLabel.overflow=Label.Overflow.SHRINK;this.hintLabel.getComponent(UITransform)!.setContentSize(980,148);
    this.layoutPlane();
    if(this.force){this.scheduleOnce(()=>void this.spin(),1);}
  }
  private layoutPlane():void{
    if(!this.plane)return;const h=Safe.visibleHeight;
    const layout=cabinetLayout(Safe.visibleWidth,h,CABINETS[this.config.id],Safe.safeTop,Safe.safeBottom);
    this.plane.setScale(layout.scale,layout.scale,1);this.plane.setPosition(0,layout.y);

    const toolbar=this.content?.getChildByName('Safe top tools');
    if(toolbar){
      toolbar.setPosition(0,h/2-95-Safe.safeTop);
      const left=-Safe.visibleWidth/2+Safe.safeLeft+110,right=Safe.visibleWidth/2-Safe.safeRight-110;
      toolbar.getChildByName('Back to mint floor')?.setPosition(left,0);
      toolbar.getChildByName('Rules')?.setPosition(right-194,0);
      toolbar.getChildByName('Audio')?.setPosition(right,0);
    }
    this.hintLabel?.node.setPosition(0,-h/2+88+Safe.safeBottom);
  }
  private get bet():number{const pending=this.journal.pending();return pending?.gameId===this.config.id?pending.bet:this.config.bets[this.betIndex];}
  private changeBet(delta:number):void{
    if(this.state.kind!=='idle'){this.toast('Bet is locked while the reels are moving.');return;}
    const next=Math.max(0,Math.min(this.config.bets.length-1,this.betIndex+delta));
    if(next===this.betIndex){this.toast(delta<0?'Minimum bet selected.':'Maximum bet selected.');return;}
    this.betIndex=next;if(this.betLabel)this.betLabel.string=tr(this.config.id==='jubilee-vault'?'BET  '+cabinetMoney(this.bet):cabinetMoney(this.bet));if(this.hintLabel)this.hintLabel.string=tr(`BET ${money(this.bet)} selected`);
  }
  private updateAuto():void{
    if(!this.autoLamp)return;this.autoLamp.string=tr(this.auto?'AUTO ON':'AUTO OFF');this.autoLamp.color=new Color(this.auto?'#15705B':'#253D51');
    Tween.stopAllByTarget(this.autoLamp.node);this.autoLamp.node.setScale(1,1,1);
    // Status typography stays fixed. Button enamel carries the motion, not the readout.
  }
  private updateSound(enabled=this.services.profile.current()?.settings.sound??true):void{if(this.soundLamp){this.soundLamp.string=cabinetToolText(enabled?'SOUND ON':'SOUND OFF');this.soundLamp.color=new Color(enabled?'#FFF4D8':'#D8B79A');}}
  private async toggleSound():Promise<void>{
    const settings=this.services.profile.current()?.settings;if(!settings){this.toast('Sound settings are unavailable.');return;}
    const previous=settings.sound,next=!previous;this.audio.setEffects(next);this.updateSound(next);if(next)this.audio.play('tap');
    const saved=await this.services.profile.updateSettings({sound:next});
    if(!saved){this.audio.setEffects(previous);this.updateSound(previous);this.toast('Sound setting could not be saved.');return;}
    this.toast(next?'Sound on.':'Sound off.');
  }
  private async spin():Promise<void>{
    if(this.page!=='game'||!this.reels||this.modal||this.busy)return;
    if(!complianceCurrent(this.services.save.read().compliance)){this.policyConsent();return;}

    if(this.state.kind!=='idle'&&this.state.kind!=='retry')return;
    const requestId=this.state.kind==='retry'?this.state.requestId:SecureRNG.id('foundry-spin');
    const api=this.services.api;
    const recovering=this.state.kind==='retry';
    if(api){try{this.journal.begin(requestId,this.config.id,this.bet);}catch{this.toast('Unable to save the round. Free device storage, then try again.');return;}}
    if(!api&&!this.services.economy.reserveSpin(requestId,this.bet)){this.auto=false;this.updateAuto();this.toast('Not enough coins. Visit Rewards or the Coin Shop.');return;}
    this.resetWinAmount();
    this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string=tr('Treasures in motion…');
    let settled=false;
    try{
      let result:SpinResult;
      if(api){const response=await api.spin(this.config.id,this.bet,requestId);result=response.result;this.journal.settle(requestId,result,response.balance);}
      else {
        result=this.generator.generate(this.config,this.bet,this.rng,this.force?{winTier:this.force as 'big'|'mega'|'epic'}:undefined);this.force=undefined;
        const player=this.services.profile.current(),scope=this.services.save.currentScope();
        if(player&&scope)result=applyWelcomeAward(result,this.bet,this.config.maxWinMultiplier,{completed:player.gamesPlayed,bigSeen:scope.welcomeBigSeen,superSeen:scope.welcomeSuperSeen});
        if(!this.services.economy.settleSpin(requestId,result.totalWin,result,this.bet))throw new Error('Settlement failed');
      }
      settled=true;await this.reels.finish(result);
      this.state={kind:'presenting',result};this.reels.highlight(result.wins.flatMap(w=>[...w.positions]));
      await this.presentAwardEvidence(result);
      if(result.featureResult)await this.presentFeature(result);
      if(result.totalWin>0)await this.presentWin(result.totalWin,winTier(result.totalWin/this.bet)>0,result.welcomeAward?.tier);
      this.resetWinAmount(result.totalWin);
      if(this.hintLabel)this.hintLabel.string=roundEvidence(result,this.bet);
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
  }
  /** Show the actual awarded cells before any feature replaces this grid. */
  private async presentAwardEvidence(result:SpinResult):Promise<void>{
    const awards=result.wins.filter(w=>awardCredits(w)>0&&w.symbolId!=='welcome-treasure');
    const reelCredits=result.baseWin-(result.welcomeAward?.credits??0);
    // A bounded sample avoids a long presentation on hundreds of Ways. Never
    // count the separate welcome grant as part of the highlighted reel awards.
    const shown=awards.slice(0,3);
    for(let i=0;i<shown.length;i++){
      this.reels?.highlight(shown[i].positions);
      if(this.hintLabel)this.hintLabel.string=awardEvidence(this.config,shown[i],i+1,awards.length);
      if(i===0)this.audio.playAward(0);
      await Promise.all([this.countWinAmount(reelCredits,result.totalWin),this.delay(this.reduced?.35:1.2)]);
    }
    this.reels?.highlight(awards.flatMap(w=>[...w.positions]));
    if(awards.length>1){if(this.hintLabel)this.hintLabel.string=awardSummary(awards,reelCredits);await this.delay(this.reduced?.35:.7);}
    if(result.welcomeAward){
      this.reels?.highlight([]);
      if(this.hintLabel)this.hintLabel.string=tr('Welcome treasure bonus · separate from reel wins')+' +'+money(result.welcomeAward.credits);
      await Promise.all([this.countWinAmount(result.baseWin,result.totalWin),this.delay(this.reduced?.35:.85)]);
    }
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
    if(feature.type==='coin-press'){
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
    if(feature.type==='lantern-respin'){
      const initial:Record<number,number>={};const first=feature.rounds[0]?.locked??{};
      result.grid.forEach((id,i)=>{if(id===this.config.bonusId)initial[i]=first[i]??0;});
      reels.lockCoins(initial);await this.delay(.65);
    }
    let cumulative=result.baseWin;
    for(const round of feature.rounds){
      if(this.hintLabel)this.hintLabel.string=tr(round.caption?round.caption:feature.type==='jubilee-cascade'?`CROWN CASCADE · ${round.multiplier}×`:feature.type==='lantern-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`PEARL WILD · ${round.index} OF ${feature.rounds.length}`);
      if(round.removed||feature.type==='jubilee-cascade')await reels.collapseTo(round.grid,round.removed??[]);
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
    if(this.winLabel?.isValid)this.winLabel.string=tr(cabinetMoney(amount));
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
  private async presentWin(amount:number,big:boolean,welcome?:'big'|'super'):Promise<void>{
    if(big){
      const stage=box(this.root!,'Treasure celebration',0,0,1080,this.height);this.modal=stage;stage.addComponent(BlockInputEvents);
      // Keep the integrated scene visible, but do not let cabinet readouts and
      // controls show through the transparent celebration artwork.
      const hidden=(this.plane?.children??[]).filter(n=>n.active&&!['Cabinet reflections','Reels',this.config.id+'-tall-plane'].includes(n.name));
      for(const n of [this.hintLabel?.node,this.content?.getChildByName('Award hint material'),this.content?.getChildByName('Safe top tools')])if(n?.active)hidden.push(n);
      const fades=hidden.map(n=>({node:n,alpha:n.getComponent(UIOpacity)??n.addComponent(UIOpacity)}));
      const prior=fades.map(f=>f.alpha.opacity);
      try{
        fades.forEach(f=>tween(f.alpha).to(this.reduced?.01:.22,{opacity:0},{easing:'sineInOut'}).start());
        await this.delay(.22);
        this.audio.play('reward');await stage.addComponent(FoundryWinStage).setup(this.art,amount,this.height,this.reduced,amount/this.bet,GAME_CONFIGS.indexOf(this.config),welcome);
      }finally{
        fades.forEach((f,i)=>{if(f.node.isValid)tween(f.alpha).to(this.reduced?.01:.3,{opacity:prior[i]},{easing:'sineInOut'}).start();});
        if(this.modal===stage)this.closeModal();
      }
    }else{
      if(amount>this.presentedWin)this.audio.playAward(0);
      const stage=box(this.content!,'Ordinary win presentation',0,0,1080,this.height);
      const hidden=[this.hintLabel?.node,this.content?.getChildByName('Award hint material')].filter((n):n is Node=>!!n&&n.active);
      hidden.forEach(n=>n.active=false);
      try{
        await Promise.all([this.countWinAmount(amount),stage.addComponent(OrdinaryWinStage).setup(this.art,amount,Safe.visibleHeight,this.reduced,this.bet,{y:-Safe.visibleHeight/2+88+Safe.safeBottom,width:980})]);
      }finally{
        if(stage.isValid)stage.destroy();
        hidden.forEach(n=>{if(n.isValid)n.active=true;});
      }
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=tr(this.page==='game'?cabinetMoney(this.services.economy.balance()):money(this.services.economy.balance()));}
  private refreshTopWin():void{if(this.topWinLabel)this.topWinLabel.string=topWinMoney(this.services.profile.current()?.biggestWin??0);}
  private delay(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,this.reduced?Math.min(.12,seconds):seconds));}
  protected update(dt:number):void{const fx=this.plane?.getChildByName('Cabinet reflections')?.getComponent(FoundryAtmosphere);if(fx)fx.energy=this.state.kind==='spinning'?1:this.state.kind==='presenting'?.6:0;if(this.auto&&this.visible&&this.state.kind==='idle'&&this.page==='game'&&!this.modal){this.autoWait-=dt;if(this.autoWait<=0){this.autoWait=1;void this.spin();}}}
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
  /** Image-based gemstone gleam. Structural nameplates stay still; only their
   *  tiny inset jewels catch a passing light. Never sweep across the lettering. */
  private titleLuster(plate:Node,w:number,h:number,kind:'brand'|'page'|'cabinet',phase=0):void{
    if(this.reduced)return;
    const jewels=kind==='brand'?[[-.472,-.055],[.472,-.055],[0,-.385]]
      :kind==='page'?[[-.457,0],[.457,0]]:[[-.402,0],[.402,0]];
    jewels.forEach(([u,v],i)=>{
      const size=kind==='brand'?48:kind==='page'?37:Math.min(42,h*.31);
      const glint=this.art.light(plate,i%2?5:4,u*w,v*h,size,size,0);
      glint.name='Inset jewel light';const alpha=glint.getComponent(UIOpacity)!;
      tween(alpha).delay(phase+i*1.65).repeatForever(
        tween().to(.42,{opacity:kind==='brand'?156:125},{easing:'sineOut'})
          .to(1.15,{opacity:0},{easing:'sineInOut'}).delay(4.4)
      ).start();
    });
  }
  private cabinetButtonMotion(face:Node,w:number,h:number,theme:number,index:number):void{
    if(this.reduced)return;
    // The visual breathes independently of the fixed input target and press spring.
    const phase=theme*.37+index*.61;
    tween(face).delay(phase).repeatForever(tween().to(2.1+theme*.2,{scale:new Vec3(1.026,1.026,1)},{easing:'sineInOut'}).to(2.7,{scale:new Vec3(1,1,1)},{easing:'sineInOut'})).start();
    this.sheen(face,w*.76,h*.72,phase);
    for(let i=0;i<2;i++){
      const glint=this.art.light(face,3,(i?1:-1)*w*.29,(i?-.24:.25)*h,Math.min(w,h)*.28,Math.min(w,h)*.28,0);glint.name='Button enamel glint';
      const alpha=glint.getComponent(UIOpacity)!;
      tween(alpha).delay(phase+i*1.8).repeatForever(tween().to(.65,{opacity:205},{easing:'sineInOut'}).to(.95,{opacity:0},{easing:'sineInOut'}).delay(2.2)).start();
      tween(glint).repeatForever(tween().to(3.4,{angle:85}).to(3.4,{angle:0})).start();
    }
  }
  private sheen(n:Node,w:number,h:number,delay=0):void{if(this.reduced)return;const clip=box(n,'Inset metal sheen',0,0,w-12,h-12);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;const beam=this.art.light(clip,2,-w,0,h*2.2,h*2.2,38);beam.setScale(.35,1.6,1);beam.angle=-24;tween(beam).delay(delay).repeatForever(tween().to(1.6,{position:new Vec3(w,0,0)},{easing:'sineInOut'}).call(()=>beam.setPosition(-w,0)).delay(4.5)).start();}
  private breathe(n:Node,delay=0):void{if(this.reduced)return;tween(n).delay(delay).to(1.8,{angle:5},{easing:'sineInOut'}).to(3.6,{angle:-5},{easing:'sineInOut'}).to(1.8,{angle:0},{easing:'sineInOut'}).union().repeatForever().start();const origin=n.position.clone();tween(n).delay(delay).repeatForever(tween().to(2.8,{position:new Vec3(origin.x,origin.y+27,origin.z)},{easing:'sineInOut'}).to(2.8,{position:origin},{easing:'sineInOut'})).start();}
  /** Low-amplitude motion belongs to artwork; labels and hit regions stay fixed. */
  private idleAccent(n:Node,delay=0,lift=6,tilt=3,pace=1):void{
    if(this.reduced)return;const origin=n.position.clone(),angle=n.angle;
    tween(n).delay(delay).to(2.6*pace,{position:new Vec3(origin.x,origin.y+lift,origin.z),angle:angle+tilt},{easing:'sineInOut'}).to(3.4*pace,{position:new Vec3(origin.x,origin.y-lift*.3,origin.z),angle:angle-tilt},{easing:'sineInOut'}).to(2.6*pace,{position:origin,angle},{easing:'sineInOut'}).union().repeatForever().start();
  }
  private count(label:Label,total:number,from=0,suffix=''):void{Tween.stopAllByTarget(label);if(this.reduced){label.string=tr((this.page==='game'?cabinetMoney(total):money(total))+suffix);return;}tween(label).to(.85,{}, {onUpdate:(_target,ratio)=>{if(label.isValid)label.string=tr((this.page==='game'?cabinetMoney(from+(total-from)*(1-Math.pow(1-(ratio??0),3))):money(from+(total-from)*(1-Math.pow(1-(ratio??0),3))))+suffix);}}).call(()=>{if(label.isValid)label.string=tr((this.page==='game'?cabinetMoney(total):money(total))+suffix);}).start();}
  private rewardArrival(before:number,after:number,kind:'daily'|'check-in'):void{
    if(this.balanceLabel)this.count(this.balanceLabel,after,before);
    if(this.reduced||!this.root||!this.balanceLabel)return;
    const stage=this.content?.getChildByName('SEVEN-DIE REWARD PRESS');
    if(!stage)return;
    const root=this.root,target=root.getComponent(UITransform)!.convertToNodeSpaceAR(this.balanceLabel.node.worldPosition);
    // bindPress re-parents the visual button under its spring wrapper, so use
    // the stable die recess in stage space rather than looking for a child.
    const pressPoint=stage.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(kind==='daily'?160:-160,-367,0));
    const start=root.getComponent(UITransform)!.convertToNodeSpaceAR(pressPoint);
    // The generated coins leave the actual press key and travel up its side
    // conduit; unlike a generic screen-wide shower this reads as a payout.
    for(let i=0;i<6;i++){
      const coin=this.art.image(root,'symbols-coin-press',start.x+(i-2.5)*13,start.y,36,36,0);
      coin.name='Pressed reward coin';const alpha=opacity(coin,0);
      const viaX=Math.min(root.getComponent(UITransform)!.width/2-80,start.x+135),lift=45+i*22;
      tween(coin).delay(i*.075).to(1.05,{}, {onUpdate:(_node,ratio)=>{
        const t=ratio??0,u=1-t;
        coin.setPosition(u*u*start.x+2*u*t*viaX+t*t*target.x,u*u*start.y+2*u*t*(start.y+lift)+t*t*target.y);
        const size=1-.54*t;coin.setScale(size,size,1);coin.angle=t*(i%2?90:-90);
        alpha.opacity=Math.round(170*Math.min(1,t*8,(1-t)*9));
      }}).call(()=>coin.destroy()).start();
    }
    const glint=this.art.light(root,3,target.x,target.y,110,42,0);
    tween(glint.getComponent(UIOpacity)!).delay(.9).to(.16,{opacity:180}).to(.55,{opacity:0}).call(()=>glint.destroy()).start();
  }
  private storePage():void{
    const stage=this.pageStage('COIN DISPENSARY'),stamp=this.generation;this.art.image(stage,'foundry-shop-rack',0,0,1024,1320);box(stage,'Embedded shop metal lights',0,0,1020,1320).addComponent(FoundryFixtureMotion).setup(this.art,'shop',this.reduced);this.treasureFlanks(stage,0,1,-420);
    this.pageTitle(stage,0,'COIN DISPENSARY');
    this.art.panel(stage,0,563,765,64,1);
    text(stage,this.services.remoteMode?'Choose a sealed coin canister':'Preview mode · StoreKit is offline',0,563,710,45,27,COLORS.cream);
    // Centers measured from the three blank enamel plates in the generated rack.
    const rows=[275,45,-185];
    void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;
      let offset=0;
      const cards=box(stage,'Dispensary selection',0,0,1020,1320);
      const turn=this.art.button(stage,'Next coin canisters',0,-522,420,75,'NEXT CANISTERS  ›',undefined,()=>{offset=(offset+1)%items.length;draw();},0);
      const draw=():void=>{
        cards.removeAllChildren();
        for(let i=0;i<Math.min(3,items.length);i++){
          const item=items[(offset+i)%items.length],y=rows[i],total=item.credits+item.bonus,bonus=Math.round(item.bonus/item.credits*100);
          const hit=box(cards,'Coin canister '+item.id,0,y,500,160);
          const amount=text(hit,money(total),-62,15,200,40,34,COLORS.ink,true);amount.enableWrapText=false;
          const detail=text(hit,bonus?`+${bonus}% BONUS`:'STANDARD CANISTER',-62,-19,196,30,23,COLORS.ink,true);detail.enableWrapText=false;
          if(item.available)text(hit,item.displayPrice,118,0,88,54,23,COLORS.cream,true);
          bindPress(hit,hit,()=>void this.purchase(item.id));
        }
        turn.active=items.length>3;
      };
      draw();
    }).catch(()=>this.toast('Coin dispensary unavailable. Please try again.'));
    // Keep this control above the illustrated rail. The old disclaimer sat
    // underneath the rail at 320×568, and duplicated the entry disclosure.
    this.art.button(stage,'Synchronize purchases',0,-612,710,84,'Restore & sync purchases',5,()=>void this.restorePurchases(),0);
  }
  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}catch{this.toast('Unable to connect. Please try again.');}finally{this.busy=false;}}
  private async restorePurchases():Promise<void>{
    if(this.busy)return;this.busy=true;
    try{const r=await this.services.store.restore();this.refreshBalance();this.toast(r.message);}
    catch{this.toast('Unable to restore purchases. Please try again.');}
    finally{this.busy=false;}
  }
  private rewardsPage():void{
    const stage=this.pageStage('SEVEN-DIE REWARD PRESS'),scope=this.services.save.currentScope(),today=new Date().toISOString().slice(0,10),progress=scope?.checkIn,claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);this.art.image(stage,'foundry-reward-dial',0,0,1024,1320);box(stage,'Embedded reward metal lights',0,0,1020,1320).addComponent(FoundryFixtureMotion).setup(this.art,'reward',this.reduced);this.treasureFlanks(stage,2,0,-414);
    this.pageTitle(stage,1,'SEVEN-DIE REWARD PRESS');
    this.art.panel(stage,0,562,660,60,1);
    text(stage,tr('DAY '+(active+1))+' · '+tr(claimed?'COLLECTED':'READY TO PRESS'),0,562,610,44,28,COLORS.cream);
    const diePositions:[number,number][]=[[-110,350],[110,350],[-185,222],[185,222],[-128,94],[128,94],[0,26]];
    this.services.checkIn.rewards.forEach((amount,i)=>{const [x,y]=diePositions[i],current=i===active,done=i<active||(current&&claimed),hit=box(stage,'Reward die '+(i+1),x,y,116,116);
      // Generated treasury emblems occupy the seven molded dies. The day
      // numeral remains live text; no vector-painted symbol is introduced.
      const emblem=this.art.image(hit,'symbols',0,11,76,76,[0,10,13,12,5,8,1][i]);
      if(current)this.idleAccent(emblem,i*.22,2,.08,2.8);
      text(hit,String(i+1),0,-29,76,35,22,COLORS.ink,true);
      if(current&&!this.reduced){const halo=this.art.light(hit,1,0,0,132,132,90);halo.setSiblingIndex(0);tween(halo).to(1.3,{scale:new Vec3(1.12,1.12,1)},{easing:'sineInOut'}).to(1.3,{scale:new Vec3(.92,.92,1)},{easing:'sineInOut'}).union().repeatForever().start();}
      bindPress(hit,hit,()=>{if(current&&!claimed)void this.claim('check-in');else this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Upcoming'));});
    });
    const earned=this.rewardNotice;
    outlined(text(stage,earned?(earned.kind==='daily'?'DAILY GIFT PRESSED':'DIE '+(active+1)+' PRESSED'):'DIE '+(active+1)+' PAYOUT',0,-184,550,39,28,COLORS.cream,true),'#103D3C',2);
    outlined(text(stage,(earned?'+': '')+money(earned?.amount??this.services.checkIn.rewards[active])+' COINS',0,-241,610,67,42,COLORS.cream,true),'#3E442A',3);
    if(earned&&!this.reduced){const inset=this.art.light(stage,3,0,-225,80,50,0);const alpha=inset.getComponent(UIOpacity)!;tween(alpha).to(.25,{opacity:170}).to(.7,{opacity:0}).union().repeat(3).start();}
    // The illustrated press already contains two sculpted keys. Live text and
    // touch surfaces sit inside their enamel, instead of bridging the seam.
    const press=box(stage,'Press reward die',-160,-367,240,96);
    text(press,claimed?'COLLECTED':'PRESS DIE '+(active+1),0,0,210,48,27,COLORS.ink,true).enableWrapText=false;
    bindPress(press,press,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next reward after 00:00 UTC.');});
    const collected=!!scope?.claims['daily-free:'+today];
    const daily=box(stage,'Claim daily coins',160,-367,240,96);
    text(daily,collected?'CLAIMED':'DAILY +'+money(ECONOMY.daily),0,0,215,48,26,COLORS.ink,true).enableWrapText=false;
    bindPress(daily,daily,()=>{if(!collected)void this.claim('daily');else this.toast('Daily gift already collected.');});
    text(stage,'Rewards reset at 00:00 UTC · Virtual coins only',0,-606,820,38,23,COLORS.ink);
  }
  private async claim(kind:'daily'|'check-in'):Promise<void>{if(this.busy)return;this.busy=true;const before=this.services.economy.balance();try{
    let ok=false;
    if(this.services.api){await this.services.api.claimReward(kind);const me=await this.services.api.me();this.services.economy.synchronizePurchasedBalance(me.player.credits,SecureRNG.id('reward-sync'));ok=this.services.economy.balance()>before;}
    else{const today=new Date().toISOString().slice(0,10);ok=kind==='daily'?this.services.store.claimDaily(today):this.services.checkIn.claimToday(today).ok;}
    const after=this.services.economy.balance();
    if(ok&&after>before){this.audio.play('reward');this.rewardNotice={kind,amount:after-before};if(this.page==='rewards')this.render();this.rewardArrival(before,after,kind);}
    else{this.refreshBalance();this.toast('Today’s gift has already been collected.');}
  }catch{this.refreshBalance();this.toast('Unable to collect. Please try again.');}finally{this.busy=false;}}
  private rankPage():void{
    const stage=this.pageStage('FOUNDRY MEDAL WALL'),stamp=this.generation;this.art.image(stage,'foundry-rank-wall',0,0,1024,1320);box(stage,'Embedded medal metal lights',0,0,1020,1320).addComponent(FoundryFixtureMotion).setup(this.art,'medal',this.reduced);this.treasureFlanks(stage,1,3,-413);this.pageTitle(stage,2,'FOUNDRY MEDAL WALL');this.art.panel(stage,0,560,745,60,1);text(stage,'All-time settled virtual winnings',0,560,685,42,27,COLORS.cream);
    const render=(players=this.services.rank.list('all-time',this.services.profile.current())):void=>{
      if(stamp!==this.generation)return;
      const profile=this.services.profile.current();
      if(!this.services.remoteMode&&profile&&!players.some(p=>p.current))players=[...players,{rank:players.length+1,nickname:profile.nickname,winnings:profile.totalWin,avatar:profile.avatar,current:true}];
      const ranked=this.services.remoteMode?players.map(p=>({...p,virtual:false})):hallStandings(players);
      const current=ranked.find(p=>p.current),leaders=ranked.slice(0,6);
      // This large illustrated medal is reserved for the player's own rank.
      // The leaderboard below remains independent, even for a top-six player.
      if(current){
        const face=this.art.image(stage,'portraits',0,342,210,210,current.avatar);this.idleAccent(face,.2,3,.14,2.5);
        text(stage,'MY RANK  #'+current.rank,0,170,355,43,31,COLORS.ink,true).enableWrapText=false;
        this.art.panel(stage,0,75,580,105,1);
        text(stage,current.nickname+'  ·  '+money(current.winnings)+' COINS',0,75,510,43,28,COLORS.cream,true).enableWrapText=false;
      }else{
        text(stage,'MY RANK',0,170,355,43,31,COLORS.ink,true);
        this.art.panel(stage,0,75,580,105,1);
        text(stage,'Finish a round to join',0,75,500,42,29,COLORS.cream);
      }
      const podium=[{x:0,y:-69},{x:-221,y:-132},{x:221,y:-132}],sizes=[132,127,127];
      leaders.slice(0,3).forEach((r,i)=>{
        const point=podium[i],face=this.art.image(stage,'portraits',point.x,point.y,sizes[i],sizes[i],r.avatar);
        // Each generated podium has a narrow enamel ledge below the portrait.
        // Reserve that ledge for the name, rather than burying it under #1/#2/#3.
        const nameY=point.y-(i===0?107:104);
        this.art.stretch(stage,'foundry-plate-1',point.x,nameY,214,54,-1,true);
        const name=text(stage,r.nickname,point.x,nameY,200,37,25,COLORS.cream,true);name.enableWrapText=false;
        text(stage,'#'+r.rank,point.x,point.y-175,110,34,26,COLORS.cream,true);
        if(i===0)this.idleAccent(face,0,3,.12,2.8);
      });
      leaders.slice(3,6).forEach((r,i)=>{
        const x=(i-1)*224,medal=box(stage,'Medal rank '+r.rank,x,-493,184,80);
        text(medal,'#'+r.rank+'  '+(r.nickname.split(' ')[0].length>8?r.nickname.split(' ')[0].slice(0,7)+'…':r.nickname.split(' ')[0]),0,12,160,29,19,COLORS.ink,true).enableWrapText=false;
        text(medal,money(r.winnings),0,-17,158,29,21,COLORS.ink).enableWrapText=false;
      });
      this.art.button(stage,'Explore games',0,-639,700,78,'Return to the mint floor',6,()=>void this.navigate('home'),0);
    };if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load medal wall.'));else render();
  }
  private profilePage():void{
    const stage=this.pageStage('FOUNDRY PASSPORT'),p=this.services.profile.current();if(!p)return;const balance=this.services.economy.balance(),ledger=this.services.save.currentScope()?.transactions??[];this.art.image(stage,'foundry-passport',0,0,1024,1320);box(stage,'Embedded passport metal lights',0,0,1020,1320).addComponent(FoundryFixtureMotion).setup(this.art,'passport',this.reduced);this.treasureFlanks(stage,0,2,-345);this.pageTitle(stage,3,'FOUNDRY PASSPORT',658);
    const portrait=this.art.image(stage,'portraits',-216,327,176,176,p.avatar);bindPress(portrait,portrait,()=>this.avatars());this.edgeJewels(portrait,160,160,.2);
    const name=text(stage,p.nickname,-216,188,300,52,34,COLORS.ink,true);name.enableWrapText=false;bindPress(name.node,name.node,()=>this.editNickname());text(stage,p.isGuest?'VISITOR PASS · LEVEL '+p.level:'MEMBER PASS · LEVEL '+p.level,-216,145,300,34,21,COLORS.ink);
    // The engraved teal passport page needs a pale generated enamel key here;
    // dark ink directly on the illustration made this action disappear.
    this.art.button(stage,'Edit identity',-216,87,296,80,'Edit identity',undefined,()=>this.editNickname(),0,40);
    const stat=(y:number,label:string,value:number):void=>{text(stage,label,214,y+26,260,31,21,COLORS.ink,true);const v=text(stage,money(value),214,y+1,285,44,30,COLORS.ink,true);v.enableWrapText=false;};stat(429,'MINT BALANCE',balance);stat(273,'ROUNDS PRESSED',p.gamesPlayed);stat(150,'LIFETIME WINNINGS',p.totalWin);
    text(stage,'COIN JOURNAL',0,-62,650,42,29,COLORS.ink,true);text(stage,ledger.length+' settled ledger entries',0,-113,660,36,24,COLORS.ink);text(stage,'Best single press  '+money(p.biggestWin),0,-167,650,42,27,COLORS.ink,true);const ledgerKey=box(stage,'Open coin history',0,-310,520,88);text(ledgerKey,'OPEN FULL LEDGER',0,0,460,46,29,COLORS.ink,true);bindPress(ledgerKey,ledgerKey,()=>this.history());
    const links:[string,()=>void][]=[['Portrait',()=>this.avatars()],['Language',()=>this.languages()],['Privacy',()=>this.legal('privacy')]];links.forEach(([label,action],i)=>this.art.button(stage,label,(i-1)*240,-455,220,90,label,undefined,action,0));
    this.art.button(stage,'Sign out',-220,-574,390,94,'Sign out',undefined,()=>void this.signOut(),0);this.art.button(stage,'Delete account',220,-574,390,94,'Delete account',undefined,()=>this.deleteAccount(),2);
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


  private avatars():void{const s=this.sheet('Choose passport portrait',1270);for(let i=0;i<16;i++){const n=this.art.image(s,'portraits',(i%4-1.5)*210,350-Math.floor(i/4)*248,183,183,i);n.name='Choose avatar '+i;if(this.services.profile.current()?.avatar===i)this.art.image(n,'interfaces',65,-65,43,43,14);bindPress(n,n,()=>void this.selectPortrait(n,i));}}
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
  private history():void{const s=this.sheet('Foundry transaction ledger',1190);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,394-i*132,840,115,1);text(n,r.type.replace(/-/g,' '),-168,0,356,68,29,COLORS.jade);const amount=text(n,(r.amount>0?'+':'')+exactMoney(r.amount),209,0,286,64,34,COLORS.ink);amount.enableWrapText=false;});if(!rows.length){const icon=this.art.image(s,'interfaces',0,156,220,220,1);this.idleAccent(icon,0,7,.3,1.5);text(s,'Your transaction ledger is ready',0,-20,820,90,40,COLORS.gold,true);text(s,'Collect a reward or play a round.\nYour coin activity will appear here.',0,-132,820,142,34);this.art.button(s,'Ledger rewards',0,-302,730,108,'Explore rewards',2,()=>{this.closeModal();void this.navigate('rewards');},0);}}
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
    const dim=this.art.cover(overlay,'foundry-veil',0,0,Safe.visibleWidth,Safe.visibleHeight);dim.name='Generated modal atmosphere';opacity(dim,205);
    const panel=this.art.panel(overlay,0,0,978,height,2);text(panel,title,-25,height/2-83,797,118,46,COLORS.gold,true);
    const close=this.art.button(panel,'Close dialog',413,height/2-73,95,95,'',15,()=>this.closeModal());
    close.getComponent(UITransform)!.setContentSize(152,152);
    // Preserve the sculpted frame while making both its purpose and touch target clear.
    const face=close.getChildByName('Press motion · Close dialog')?.getChildByName('Icon face')??close;
    const cross=text(face,'×',0,1,66,66,60,COLORS.cream);cross.lineHeight=66;
    if(!this.reduced){
      const alpha=opacity(overlay,0);tween(alpha).to(.2,{opacity:255}).start();
      panel.setPosition(0,-28);tween(panel).to(.32,{position:new Vec3(0,0,0)},{easing:'cubicOut'}).start();
    }
    this.modal=overlay;return panel;
  }
  private closeModal():void{if(this.modal){this.modal.active=false;this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,2);text(n,message,0,0,916,144,36);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{this.cancelWinCount?.();game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
