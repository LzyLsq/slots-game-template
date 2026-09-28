import { OrdinaryWinStage } from '../vfx/OrdinaryWinStage';
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
import { _decorator, BlockInputEvents, Color, Component, EditBox, EventTouch, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, sys, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SecureRNG } from '../core/SecureRNG';
import { AudioManager } from '../audio/AudioManager';
import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import { GAME_CONFIGS, SYMBOL_ART, symbolAtlas, prizeArt } from '../math/GameConfigs';
import { ENTRY_ART, pageArt } from './PageArtManifest';
import { ResultGenerator } from '../math/ResultGenerator';
import { shouldForceIntroJackpot } from '../math/IntroJackpot';
import { ruleAward,ruleCounts ,ruleAllCounts} from '../math/PaytableDisplay';
import type { GameConfig, GameId, SpinResult } from '../math/types';
import type { AuthResult } from '../services/AuthService';
import { ApiRequestError } from '../services/ProductionApiClient';
import { RemoteSpinJournal } from '../services/RemoteSpinJournal';
import { hallStandings } from '../services/RankService';
import { STORE_PRODUCTS } from '../services/StoreService';
import { SalonReels } from '../reels/SalonReels';
import { SalonAtmosphere } from '../vfx/SalonAtmosphere';
import { CarnivalConfetti } from '../vfx/CarnivalConfetti';
import { HallTreasuryMotion } from '../vfx/HallTreasuryMotion';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, outlined, COLORS } from './SalonArt';
import { CABINETS, CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT, imagePoint, cabinetLayout, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const exactMoney=(n:number):string=>Math.floor(n).toLocaleString('en-US');
const money=(n:number):string=>{const v=Math.floor(n),a=Math.abs(v);if(a<1000000)return exactMoney(v);const unit=a>=1000000000?1000000000:1000000;return (Math.trunc(v/unit*100)/100).toFixed(2).replace(/\.?0+$/,'')+(unit===1000000000?'B':'M');};
@ccclass('AureliaApp')
export class AureliaApp extends Component {
  private art=new SalonArt();private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private backdrop?:Node;private backdropReady=false;private backdropWidth=0;private backdropHeight=0;private retiring?:Node;private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private homeChanging=false;private navPending=false;private navArrival?:Page;private authExpanded=false;private selectedRoute=0;private selectedBundle=0;private curtainClosed=false;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
  private balanceLabel?:Label;private betLabel?:Label;private winLabel?:Label;private hintLabel?:Label;
  private presentedWin=0;private cancelWinCount?:()=>void;private hintTicket=0;
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
    const runtime=globalThis as typeof globalThis&{__AURELIA_API_URL__?:string};
    this.services=new GameBootstrap(undefined,false,runtime.__AURELIA_API_URL__);
    this.journal=new RemoteSpinJournal(this.services.save);
    // The web shell owns the entire loading screen. Do not leave a second Cocos
    // loading layer behind it: on slow devices it can outlive the artwork fade.
    const webLoader=typeof document!=='undefined'&&!!document.getElementById('csw-preloader');
    const loading=webLoader?undefined:box(this.node,'Loading',0,0,1080,1920);
    let progress:Label|undefined;
    if(loading){
      const g=loading.addComponent(Graphics);g.fillColor=new Color('#EACCB2');g.rect(-1500,-2000,3000,4000);g.fill();
      this.art.titleImage(loading,'FORTUNE CARNIVAL',0,90,950,160,78,'gold',false);
      progress=text(loading,'Opening Fortune Carnival…',0,-70,950,100,38);
    }
    try{
      await this.art.load(ENTRY_ART,(n,t)=>{
        if(progress)progress.string=tr(`Raising the festival lights  ${Math.round(n/t*100)}%`);
        globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:n/t*.78}}));
      });
      this.backdropReady=true;this.ensureBackdrop();
      if(progress)progress.string=tr('Restoring your festival pass…');
      globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:.80}}));
      const resumed=await this.services.resumeSession();
      if(this.debug&&!resumed){this.accept();await this.services.auth.guestLogin();}
      const requested=query.get('screen') as Page|null;
      this.config=GAME_CONFIGS.find(g=>g.id===query.get('game'))??GAME_CONFIGS[0];
      this.page=(resumed||this.debug)?(requested??'home'):'login';
      if(!['home','login','register','game','store','rewards','rank','profile'].includes(this.page))this.page='home';
      this.audio.setEffects(this.services.profile.current()?.settings.sound??true);
      this.restoreRemoteRound();
      await this.art.load(pageArt(this.page,this.config),(n,t)=>{
        if(progress)progress.string=tr(`Preparing the treasury  ${Math.round(n/t*100)}%`);
        globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:.80+n/t*.18}}));
      });
      this.render();loading?.destroy();
      globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:1}}));
      globalThis.dispatchEvent?.(new Event('aurelia-app-ready'));
    }catch(error){if(progress)progress.string=tr('Could not open Fortune Carnival. Tap to retry.');loading?.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
  }
  private accept():void{this.services.save.update(s=>{s.compliance={ageConfirmedAt:new Date().toISOString(),termsVersion:TERMS_VERSION,privacyVersion:PRIVACY_VERSION};});}
  private restoreRemoteRound():boolean{
    if(!this.services.api)return false;const pending=this.journal.pending();if(!pending)return false;
    const config=GAME_CONFIGS.find(c=>c.id===pending.gameId);if(!config)return false;
    this.config=config;this.betIndex=Math.max(0,config.bets.indexOf(pending.bet));this.page='game';this.state={kind:'retry',requestId:pending.requestId};
    return true;
  }
  private resize():void{
    this.height=Safe.visibleHeight;this.top=this.height/2;this.ensureBackdrop();
    if(this.page==='game'&&this.plane&&this.root){this.layoutPlane();return;}
    // Mobile keyboards change the viewport on focus/blur. Keep live EditBoxes
    // (including composition and selection) instead of destroying the form.
    // The Canvas still adapts its projection; navigation builds a fresh layout.
    if(this.root&&(this.page==='login'||this.page==='register'))return;
    if(this.root&&!this.busy)this.render();
  }
  // An always-opaque illustrated floor stays below both pages. A new page may
  // be transparent for a frame while its sprites/masks are uploaded, especially
  // on mobile WebGL and during orientation changes; never reveal the camera clear.
  private ensureBackdrop():void{
    const width=Safe.visibleWidth,height=Safe.visibleHeight;
    if(this.backdrop?.isValid&&this.backdropWidth===width&&this.backdropHeight===height)return;
    if(!this.backdropReady)return;
    const next=box(this.node,'Persistent illustrated transition floor',0,0,width,height);
    this.art.cover(next,'carnival-hall-soft',0,0,width,height);
    next.setSiblingIndex(0);
    this.backdrop?.destroy();this.backdrop=next;this.backdropWidth=width;this.backdropHeight=height;
  }
  private render():void{
    this.cancelWinCount?.();this.presentedWin=0;
    this.art.reducedMotion=this.reduced;
    this.generation++;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.hintLabel=this.autoLamp=this.soundLamp=undefined;
    const previous=this.root;if(previous){const a=opacity(previous,255);Tween.stopAllByTarget(a);a.opacity=255;for(const edit of previous.getComponentsInChildren(EditBox))edit.enabled=false;}
    if(this.retiring&&this.retiring!==previous)this.retiring.destroy();this.retiring=previous;
    this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Fortune-Carnival-interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='home'?'carnival-hall-soft':this.page==='login'||this.page==='register'?'salon':'carnival-services';
    this.bg=this.page==='game'||this.page==='home'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);

    if(this.page!=='game'){box(root,'Fortune confetti atmosphere',0,0,Safe.visibleWidth,this.height).addComponent(CarnivalConfetti).setup(this.art,Safe.visibleWidth,this.height,this.reduced);}
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
      const needed=pageArt(page,config??this.config);
      if(needed.length){loading=this.gameLoading(config??GAME_CONFIGS[this.selectedBundle],page);await Promise.all([this.art.load(needed,(done,total)=>this.loadingProgress?.(done/total*.8,'Preparing the treasury…')),this.delay(this.reduced?.15:1.65)]);}

      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(.9,page==='store'?'Opening the treasury…':'Opening your game…');}if(!this.reduced)await this.delay(.4);
      if(loading){this.loadingProgress?.(1,'Ready');await this.delay(this.reduced?.01:.65);await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.32,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.busy=false;}
  }
  private brandLockup(parent:Node,x:number,y:number,w:number,compact=false):Node{
    const h=compact?132:198,n=box(parent,'Fortune Carnival image title',x,y,w,h);
    const image=this.art.image(n,'treasury-brand-title',0,compact?-8:-10,w,compact?120:185);
    this.idleAccent(image,.008,3,.15,3.5);
    return n;
  }
  private sectionHeading(parent:Node,title:string,subtitle:string,y=620):void{
    this.art.titleImage(parent,title,0,y+7,885,101,44,'ink');
    this.art.titleImage(parent,subtitle,0,y-66,910,51,28,'ivory');
  }
  private gameLoading(config:GameConfig,page:Page='game'):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);this.art.cover(n,'carnival-hall-soft',0,0,Safe.visibleWidth,this.height);
    const shade=box(n,'Boarding twilight',0,0,Safe.visibleWidth,this.height).addComponent(Graphics);shade.fillColor=new Color(36,28,54,170);shade.rect(-Safe.visibleWidth/2,-this.height/2,Safe.visibleWidth,this.height);shade.fill();
    const stage=box(n,'Cabinet boarding pass',0,0,1020,1480),scale=Math.min(1,(Safe.visibleWidth-54)/1020,(this.height-180)/1480);stage.setScale(scale,scale,1);
    this.brandLockup(stage,0,610,720,true);
    const index=GAME_CONFIGS.indexOf(config);this.destinationPortal(stage,0,205,550,index);
    const ticket=this.art.panel(stage,0,-197,850,265,0);ticket.name='Destination boarding ticket';
    this.art.image(ticket,'interfaces',-340,42,88,88,[6,2,8,3][index]);
    this.art.titleImage(ticket,page==='store'?'ROYAL MINT ARCADE':config.name,45,63,640,76,42,'ink');
    this.art.titleImage(ticket,page==='store'?'The treasury is opening':config.modeLabel,45,2,620,46,27,'ink');
    text(ticket,page==='store'?'TREASURY · F31':'CABINET '+String(index+1).padStart(2,'0')+' · F31',45,-58,620,38,23,COLORS.ink).enableWrapText=false;
    const rail=this.art.panel(stage,0,-405,820,82,1);
    const track=box(rail,'Recessed minted progress race',0,0,746,34).addComponent(Graphics);
    track.fillColor=new Color('#3B1E27');track.roundRect(-373,-17,746,34,17);track.fill();
    track.strokeColor=new Color('#885332');track.lineWidth=3;track.roundRect(-370,-14,740,28,14);track.stroke();
    track.strokeColor=new Color('#F8D99B');track.lineWidth=1.5;track.roundRect(-366,-10,732,20,10);track.stroke();
    const fill=box(rail,'Cast gold progress fill',0,0,722,22).addComponent(Graphics);
    const tip=this.art.image(rail,'treasury-loose-coin',-355,0,48,36),tipAlpha=opacity(tip,0);
    tip.name='Moving gold mint seal';
    const percentage=text(stage,'0%',0,-492,240,54,37,COLORS.cream),status=text(stage,'Preparing the cabinet…',0,-563,900,56,31,COLORS.cream);
    const progress={value:0};let target=0;
    const draw=()=>{
      if(!n.isValid)return;
      const width=704*progress.value;
      fill.clear();
      if(width>0){
        fill.fillColor=new Color('#B87C33');fill.roundRect(-352,-9,width,18,Math.min(9,width/2));fill.fill();
        fill.fillColor=new Color('#FFE09A');fill.roundRect(-350,1,Math.max(0,width-4),5,2.5);fill.fill();
        fill.fillColor=new Color('#F7BE55');fill.roundRect(-350,-6,Math.max(0,width-4),5,2.5);fill.fill();
      }
      tip.setPosition(-352+width,0);tipAlpha.opacity=progress.value>0.015?255:0;
      percentage.string=tr(Math.round(progress.value*100)+'%');
    };
    this.loadingProgress=(value,caption)=>{
      target=Math.max(target,Math.min(1,value));status.string=tr(target===1?'Cabinet ready · Welcome aboard':caption);
      Tween.stopAllByTarget(progress);
      if(this.reduced){progress.value=target;draw();}
      else tween(progress).to(.42,{value:target},{easing:'sineInOut',onUpdate:draw}).start();
    };draw();return n;
  }
  private header():void{
    const profile=this.services.profile.current(),y=this.top-90-Safe.safeTop;
    const bar=box(this.content!,'Separate treasury instruments',0,y,1040,116);
    const purse=this.art.counter(bar,-296,0,470,93);purse.name='Inlaid coin purse';
    const coin=this.art.image(purse,'interfaces',-183,0,77,77,13);this.idleAccent(coin,.2,3,.2,2);
    this.balanceLabel=text(purse,money(this.services.economy.balance()),44,0,275,58,37,COLORS.ink,true);this.balanceLabel.enableWrapText=false;
    this.art.button(bar,'Top up',-10,0,91,88,'',11,()=>void this.navigate('store'),2);
    const mail=this.art.button(bar,'Mail',110,0,91,88,'',5,()=>this.mail(),0),unread=INBOX_MESSAGES.filter(m=>{const state=this.services.mail.state(m.id);return !state.read&&!state.deleted;}).length;
    if(unread)outlined(text(mail,String(unread),34,34,35,34,22,COLORS.cream,true),'#422023',2);
    const avatarMount=this.art.coinMount(bar,421,0,104),avatar=this.art.cover(avatarMount,'portraits',0,0,80,80,profile?.avatar??0,40);bindPress(avatarMount,avatar,()=>void this.navigate('profile'));
    const nickname=outlined(text(bar,profile?.nickname??'Guest',267,0,200,65,27,COLORS.cream,false,true),'#48252A',3);nickname.enableWrapText=false;
  }
  private navigation():void{
    const nav=box(this.content!,'Five individual floor-mounted controls',0,-this.top+92+Safe.safeBottom,1060,172);
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['MINT','GIFTS','PLAZA','RANK','ACCOUNT'],icons=[13,2,6,3,7];
    pages.forEach((page,i)=>{const center=i===2,active=page===this.page,arriving=page===this.navArrival,x=(i-2)*208,hit=box(nav,labels[i],x,center?17:0,195,166);
      if(active)this.art.light(hit,1,0,center?31:18,center?150:126,center?150:126,115).setSiblingIndex(0);
      const mount=this.art.coinMount(hit,0,center?27:17,center?122:107);
      const icon=this.art.image(mount,'interfaces',0,0,center?105:91,center?105:91,icons[i]);
      // The authored gilded optics sit over the bezel, not beneath the opaque medallion.
      const glint=this.art.light(hit,1,0,center?27:17,center?157:138,center?157:138,arriving?255:0);
      const glow=glint.getComponent(UIOpacity)!;
      const caption=outlined(text(hit,labels[i],0,center?-55:-48,190,52,36,active?COLORS.gold:COLORS.cream,true),'#24100D',1.5);caption.enableWrapText=false;
      const fade=()=>{Tween.stopAllByTarget(glow);if(glint.isValid){if(this.reduced)glow.opacity=0;else tween(glow).to(.27,{opacity:0}).start();}if(caption.isValid)caption.color=new Color(active?COLORS.gold:COLORS.cream);};
      const sparkle=()=>{Tween.stopAllByTarget(glow);glow.opacity=255;
        if(this.reduced){this.scheduleOnce(()=>{if(glint.isValid)fade();},.2);return;}
        tween(glow).delay(.12).to(.52,{opacity:0},{easing:'sineOut'}).start();
      };
      if(arriving){if(this.reduced)this.scheduleOnce(()=>{if(glint.isValid)fade();},.24);else tween(glow).delay(.33).to(.65,{opacity:0},{easing:'sineOut'}).start();}
      this.idleAccent(icon,i*.35,active?4:2,.2,2);
      bindPress(hit,mount,()=>{
        if(this.busy||this.navPending){fade();return;}
        this.audio.play('tap');this.audio.vibrate(12);sparkle();
        if(page===this.page)return; // Selected tab acknowledges a tap without rebuilding.
        const from=this.page;this.navPending=true;
        // Let the inset medallion visibly depress and glint before replacing its page.
        this.scheduleOnce(()=>{this.navPending=false;if(this.page===from&&!this.busy){this.navArrival=page;void this.navigate(page);}},this.reduced?.08:.17);
      },{depth:11,compression:.9,release:.22,
        onPressStart:()=>{Tween.stopAllByTarget(glow);glow.opacity=195;caption.color=new Color(COLORS.gold);},
        onPressEnd:activated=>{if(!activated)fade();}});
    });
    this.navArrival=undefined;
  }
  /** A clipped viewing aperture and cast bezel, not a rectangular poster over the plaza. */
  private destinationPortal(parent:Node,x:number,y:number,size:number,index:number,atlas='carnival-destinations'):Node{
    const portal=box(parent,'Inlaid destination portal',x,y,size,size),socket=portal.addComponent(Graphics);
    socket.fillColor=new Color(81,39,31,230);socket.circle(0,-size*.012,size*.495);socket.fill();
    socket.fillColor=new Color('#8B573D');socket.circle(0,0,size*.477);socket.fill();
    const aperture=box(portal,'Clipped portal glass',0,0,size*.9,size*.9),mask=aperture.addComponent(Mask);
    mask.type=Mask.Type.GRAPHICS_STENCIL;const cut=aperture.getComponent(Graphics)!;cut.clear();cut.fillColor=Color.WHITE;cut.circle(0,0,size*.449);cut.fill();
    this.art.image(aperture,atlas,0,0,size*.98,size*.98,index);
    const rim=box(portal,'Cast gold portal bezel',0,0,size,size).addComponent(Graphics);
    rim.strokeColor=new Color(95,42,25,250);rim.lineWidth=Math.max(3,size*.028);rim.circle(0,0,size*.463);rim.stroke();
    rim.strokeColor=new Color('#F8D688');rim.lineWidth=Math.max(2,size*.018);rim.circle(0,0,size*.475);rim.stroke();
    rim.strokeColor=new Color(255,246,203,175);rim.lineWidth=Math.max(1,size*.004);rim.circle(0,0,size*.444);rim.stroke();
    for(let i=0;i<8;i++){const a=i*Math.PI/4,px=Math.sin(a)*size*.475,py=Math.cos(a)*size*.475;
      rim.fillColor=new Color('#FFDD84');rim.circle(px,py,Math.max(2,size*.009));rim.fill();}
    return portal;
  }
  private metalEdges(parent:Node,w:number,h:number,phase:number):void{
    const fx=box(parent,'Carnival light reflection',0,0,w,h).addComponent(SalonAtmosphere);
    fx.metalFrame(this.art,w,h,phase);fx.reducedMotion=this.reduced;
  }
  private pageStage(name:string):Node{
    const available=this.height-520-Safe.safeTop-Safe.safeBottom,scale=Math.min(1,available/1400,(Safe.visibleWidth-60)/1020);
    const n=box(this.content!,name,0,(Safe.safeBottom-Safe.safeTop)/2,1020,1400);n.setScale(scale,scale,1);this.festivalDrift(n);return n;
  }
  private homePage():void{
    this.homeChanging=false;
    const stage=box(this.content!,'Fortune Carnival sky plaza',0,0,1024,1792);stage.setSiblingIndex(0);const scale=Math.min(Safe.visibleWidth/1024,this.height/1792);stage.setScale(scale,scale,1);
    this.art.cover(stage,'carnival-hall-soft',0,0,Math.max(1024,Safe.visibleWidth/scale),this.height/scale);
    this.brandLockup(stage,0,704,760);
    this.art.titleImage(stage,'CHOOSE A FORTUNE DESTINATION',0,565,900,61,35,'gold');
    const orbit=box(stage,'Destination orbit',0,22,940,1030);
    // High-value treasure props frame the destination without covering the route title or PLAY control.
    // Circular minted recesses overlap the central bezel. No rectangular symbol
    // atlas cells are pasted into the open hall, and the mounts never float.
    const leftGlow=this.art.light(orbit,1,-405,90,225,225,58),rightGlow=this.art.light(orbit,1,405,90,225,225,58);leftGlow.setSiblingIndex(0);rightGlow.setSiblingIndex(0);
    this.destinationPortal(orbit,-405,90,190,0,'symbols-coin-carousel');this.destinationPortal(orbit,405,90,190,14,'symbols-coin-carousel');
    const cfg=GAME_CONFIGS[this.selectedRoute],portal=this.destinationPortal(orbit,0,165,700,this.selectedRoute);
    stage.addComponent(HallTreasuryMotion).setup(this.art,portal,this.reduced);
    let portalImage=portal.getComponentInChildren(Sprite)!;
    const glass=portalImage.node.parent!;
    const titlePlate=this.art.counter(orbit,0,-232,730,112);
    const title=this.art.titleImage(titlePlate,cfg.name,0,20,670,53,39,'ink',false),mode=this.art.titleImage(titlePlate,cfg.modeLabel,0,-20,650,37,26,'ink',false);
    const titleAlpha=opacity(title,255),modeAlpha=opacity(mode,255);
    let enterWhenSettled=false;
    const play=this.art.button(orbit,'Enter '+cfg.name,0,-365,650,108,'PLAY '+cfg.name,6,()=>{if(this.homeChanging)enterWhenSettled=true;else void this.navigate('game',GAME_CONFIGS[this.selectedRoute]);},2);this.metalEdges(play,620,94,.4);
    const playCaption=play.getComponentsInChildren(Label).find(label=>label.string===tr('PLAY '+cfg.name));
    const playAlpha=playCaption?opacity(playCaption.node,255):undefined;
    // Keep one circular stencil and one stationary bezel. Only the photographs
    // travel under the glass, so there is never a full-page mask/black flash.
    const dock=box(stage,'Four destination seals',0,-552,970,170);
    const seals:{thumb:UIOpacity;glow:UIOpacity;label:Label}[]=[];
    GAME_CONFIGS.forEach((gameConfig,i)=>{
      const active=i===this.selectedRoute,x=(i-1.5)*230,hit=box(dock,'Destination '+gameConfig.id,x,0,210,162);
      const glow=this.art.light(hit,1,0,13,170,145,active?105:0).getComponent(UIOpacity)!;glow.node.setSiblingIndex(0);
      const thumb=this.destinationPortal(hit,0,27,108,i),thumbAlpha=opacity(thumb,active?255:205);
      const label=text(hit,['COIN','LANTERN','PARADE','MINT'][i],0,-55,192,48,36,active?COLORS.gold:COLORS.cream,true);label.enableWrapText=false;
      seals.push({thumb:thumbAlpha,glow,label});bindPress(hit,thumb,()=>select(i),{captureFace:true});
    });
    const highlight=(index:number)=>seals.forEach((seal,i)=>{
      Tween.stopAllByTarget(seal.thumb);Tween.stopAllByTarget(seal.glow);
      tween(seal.thumb).to(.25,{opacity:i===index?255:205},{easing:'sineInOut'}).start();
      tween(seal.glow).to(.25,{opacity:i===index?105:0},{easing:'sineInOut'}).start();
      seal.label.color=new Color(i===index?COLORS.gold:COLORS.cream);
    });
    let shown=this.selectedRoute;
    const slideTo=(index:number):void=>{
      if(!stage.isValid||this.page!=='home'||index===shown)return;
      this.homeChanging=true;
      const length=GAME_CONFIGS.length,distance=(index-shown+length)%length;
      const direction=distance<=length/2?1:-1,travel=portal.getComponent(UITransform)!.width*.88;
      const outgoing=portalImage.node;
      const incoming=this.art.image(glass,'carnival-destinations',direction*travel,0,portal.getComponent(UITransform)!.width*.98,portal.getComponent(UITransform)!.height*.98,index);
      // The nameplate fades while the destination passes under the cast bezel.
      tween(titleAlpha).to(.12,{opacity:0},{easing:'sineInOut'}).call(()=>{this.art.updateTitleImage(title,GAME_CONFIGS[index].name,39,'ink');}).to(.44,{opacity:255},{easing:'sineOut'}).start();
      tween(modeAlpha).to(.12,{opacity:0},{easing:'sineInOut'}).call(()=>{this.art.updateTitleImage(mode,GAME_CONFIGS[index].modeLabel,26,'ink');}).to(.44,{opacity:255},{easing:'sineOut'}).start();
      if(playAlpha)tween(playAlpha).to(.12,{opacity:0},{easing:'sineInOut'}).call(()=>{if(playCaption?.node.isValid)playCaption.string=tr('PLAY '+GAME_CONFIGS[index].name);}).to(.44,{opacity:255},{easing:'sineOut'}).start();
      tween(outgoing).to(.56,{position:new Vec3(-direction*travel,0,0)},{easing:'sineInOut'}).call(()=>{
        if(!stage.isValid)return;
        outgoing.destroy();portalImage=incoming.getComponent(Sprite)!;shown=index;
        play.name='Enter '+GAME_CONFIGS[index].name;
        if(playCaption?.node.isValid)playCaption.string=tr('PLAY '+GAME_CONFIGS[index].name);
        highlight(index);this.homeChanging=false;
        if(this.selectedRoute!==shown)slideTo(this.selectedRoute);
        else if(enterWhenSettled){enterWhenSettled=false;void this.navigate('game',GAME_CONFIGS[shown]);}
      }).start();
      tween(incoming).to(.56,{position:new Vec3(0,0,0)},{easing:'sineInOut'}).start();
    };
    const select=(next:number):void=>{
      const index=(next+GAME_CONFIGS.length)%GAME_CONFIGS.length;
      if(index===this.selectedRoute||this.busy)return;
      this.selectedRoute=index;this.audio.play('tap');
      // Rapid taps update the requested destination; finish the current glide
      // before gliding to the newest choice instead of snapping or losing input.
      if(!this.homeChanging)slideTo(index);
    };
    // The switch controls remain beside the portal and clear of the nameplate.
    for(const x of [-427,427])this.art.light(orbit,1,x,-105,152,152,100);
    this.art.button(orbit,'Previous destination',-427,-105,130,130,'',9,()=>select(this.selectedRoute-1),0);
    const next=this.art.button(orbit,'Next destination',427,-105,130,130,'',9,()=>select(this.selectedRoute+1),0);next.angle=180;
    this.festivalDrift(stage);
    // Peripheral motes belong above the opaque hall photo, below the interface.
    stage.getChildByName('Festival idle margins')?.setSiblingIndex(1);
  }
  private authDecor():void{
    if(this.reduced)return;
    const layer=box(this.content!,'Living treasury lights',0,0,1080,this.height);layer.setSiblingIndex(0);
    // Keep decorative light away from the central form and its text.
    for(let i=0;i<8;i++){
      const side=i%2?-1:1,coin=this.art.image(layer,'symbols-coin-carousel',side*(455-(i%3)*14),-this.top+210,100,100,0);coin.name='Boarding rising coin';const alpha=opacity(coin,0);const start=new Vec3(side*(465-(i%3)*14),-this.top+210,0),end=new Vec3(side*(438+(i%2)*12),this.top-290,0);
      tween(coin).delay(i*.95).repeatForever(tween().set({position:start,angle:0}).to(7.6,{position:end,angle:190},{easing:'sineInOut'})).start();
      tween(alpha).delay(i*.95).repeatForever(tween().to(.8,{opacity:240}).delay(5.4).to(1.4,{opacity:0})).start();
    }
    for(let i=0;i<18;i++){const side=i%2?-1:1,x=side*(447+(i%3)*24),y=-this.top+260+(i/18)*(this.height-420);const star=this.art.light(layer,3,x,y,39+(i%3)*16,39+(i%3)*16,155);const alpha=star.getComponent(UIOpacity)!;tween(star).delay(i*.17).repeatForever(tween().by(2.3,{position:new Vec3(-side*22,48,0),angle:55},{easing:'sineInOut'}).by(2.3,{position:new Vec3(side*22,-48,0),angle:-55},{easing:'sineInOut'})).start();tween(alpha).delay(i*.17).to(1.3,{opacity:245}).to(1.8,{opacity:35}).union().repeatForever().start();}
    for(let i=0;i<2;i++){const halo=this.art.light(layer,1,i?355:-355,this.top-405,510,510,75);tween(halo).delay(i).to(3,{scale:new Vec3(1.22,1.22,1)},{easing:'sineInOut'}).to(3,{scale:new Vec3(.9,.9,1)},{easing:'sineInOut'}).union().repeatForever().start();}
  }
  private authPage():void{
    const register=this.page==='register';this.authDecor();
    this.art.button(this.content!,'Language selector',Safe.visibleWidth/2-166,this.top-Safe.safeTop-86,286,76,'Language',7,()=>this.languages(),0);
    const stage=box(this.content!,'Carnival ticket office',0,24,1020,1660),scale=Math.min(1,(this.height-245-Safe.safeTop-Safe.safeBottom)/1660,(Safe.visibleWidth-42)/1020);stage.setScale(scale,scale,1);
    this.brandLockup(stage,0,690,760);
    const panel=box(stage,'Open-air treasury check-in',0,register?-58:-205,930,register?1180:920);
    const marquee=this.art.counter(panel,0,register?472:343,870,172);this.metalEdges(marquee,830,150,.7);
    this.art.image(panel,'interfaces',-350,register?500:370,82,82,register?7:1);
    this.art.titleImage(panel,register?'CREATE YOUR FESTIVAL PASSPORT':'SKY-PASS CHECK-IN',83,register?505:375,650,77,register?35:40,'ink');
    this.art.titleImage(panel,register?'One account · Four original cabinets':'Ticket holder sign-in',83,register?443:315,650,46,27,'ink');
    this.field(panel,'Username',register?318:190,this.draft.username,v=>this.draft.username=v);
    this.field(panel,'Password · 10–72 characters',register?190:62,this.draft.password,v=>this.draft.password=v,true);
    if(register){
      this.field(panel,'Confirm password',62,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);this.field(panel,'Nickname',-66,this.draft.nickname,v=>this.draft.nickname=v);
      const check=this.art.button(panel,'Accept terms',-335,-192,90,90,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1),mark=opacity(check,this.draft.acceptedTerms?255:65);
      const consent=box(panel,'Legible consent engraving',56,-192,678,91).addComponent(Graphics);consent.fillColor=new Color(69,31,34,225);consent.roundRect(-339,-45,678,90,18);consent.fill();consent.strokeColor=new Color('#F0C77B');consent.lineWidth=3;consent.roundRect(-335,-42,670,84,16);consent.stroke();
      text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',62,-192,655,84,29,COLORS.cream);
      this.art.button(panel,'Create account',0,-337,790,120,'STAMP MY PASSPORT',7,()=>void this.authAction('register'),2);
      this.art.button(panel,'Switch account form',0,-474,780,86,'Back to ticket sign-in',9,()=>void this.navigate('login'),0);
    }else{
      this.art.button(panel,'Sign in',0,-83,805,124,'ENTER THE PLAZA',6,()=>void this.authAction('login'),2);
      const apple=this.art.panel(panel,0,-224,805,98,1);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-235,0,40,48);text(apple,'Sign in with Apple',10,0,520,68,34,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));
      this.art.button(panel,'Guest',-205,-350,388,88,'Guest ticket',0,()=>this.guestConsent(),0);this.art.button(panel,'Create account',205,-350,388,88,'New passport',7,()=>void this.navigate('register'),0);
    }
    const links=box(this.content!,'Legal links',0,-this.top+145+Safe.safeBottom,990,80);['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*320,0,300,72,t,7,()=>this.legal(['terms','privacy','support'][i] as LegalPage),0));
    outlined(text(this.content!,'Virtual coins · No cash prizes · Eligible adults only',0,-this.top+58+Safe.safeBottom,1000,46,25,COLORS.cream),'#583B23',2);
  }
  private field(parent:Node,placeholder:string,y:number,value:string,onChange:(v:string)=>void,password=false):EditBox{
    // Configure off-stage: EditBox onLoad otherwise creates default labels
    // and clears the existing material before our references are assigned.
    const frame=this.art.panel(parent,0,y,778,103,1);
    const n=box(frame,'Text entry',0,0,642,85);n.active=false;
    const focusFrame=box(n,'Focused gold edge',0,0,760,85);const fg=focusFrame.addComponent(Graphics);fg.strokeColor=new Color('#F3D083');fg.lineWidth=4;fg.roundRect(-380,-42.5,760,85,13);fg.stroke();
    const focusOpacity=opacity(focusFrame,0);const edit=n.addComponent(EditBox);
    edit.backgroundImage=null!;
    const label=text(n,value,0,0,630,82,54,'#182F29',false,true,1);label.horizontalAlign=Label.HorizontalAlign.LEFT;label.isBold=true;
    const hint=text(n,placeholder,0,0,630,80,42,'#394339',false,false,1);hint.horizontalAlign=Label.HorizontalAlign.LEFT;hint.isBold=true;
    // EditBox positions labels by their top-left corner, not their center.
    label.node.getComponent(UITransform)!.setAnchorPoint(0,1);hint.node.getComponent(UITransform)!.setAnchorPoint(0,1);
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
      if(result.ok){this.draft.password=this.draft.confirmPassword='';this.page='home';if(this.restoreRemoteRound())await this.art.load(pageArt('game',this.config));this.render();}else this.toast(result.message??'Unable to sign in.');
    }catch{this.toast('Unable to connect. Your form has been kept.');}finally{this.busy=false;}
  }
  private policyConsent():void{
    if(this.modal)return;
    const panel=this.sheet('Fortune Carnival membership terms',710);
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
    const cfg=this.config,g=CABINETS[cfg.id],theme=GAME_CONFIGS.indexOf(cfg);
    this.plane=box(this.content!,'Cabinet-coordinate-plane',0,0,1024,2304);this.plane.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;this.art.image(this.plane,cfg.id+'-tall',0,0,CABINET_ROOM_WIDTH,CABINET_ROOM_HEIGHT);
    // The cabinet and its venue are one illustration in the same coordinate plane.
    // Do not overlay a synthetic floor: on tall phones it breaks the spatial continuity.
    const ambient=box(this.plane,'Cabinet reflections',0,0,1024,2304).addComponent(SalonAtmosphere);ambient.setup(this.art,1024,2304);ambient.cabinet(this.art,g);ambient.reducedMotion=this.reduced;
    // The gilded side rails are part of the cabinet painting. Atlas cells have
    // rectangular backgrounds and must not be pasted over its metalwork.
    const titlePoint=imagePoint(g.title),titleHost=box(this.plane,'Cabinet title · '+cfg.name,titlePoint[0],titlePoint[1],g.title[2],g.title[3]);
    const lightMarquee=theme===0||theme===2;
    if(language()==='en'){
      this.art.image(titleHost,'treasury-title-'+cfg.id,0,g.title[3]*(theme===3?.18:.10),g.title[2]*.92,g.title[3]*.50);
    }else{
      this.art.titleImage(titleHost,cfg.name,0,g.title[3]*(theme===3?.18:.10),g.title[2]*.92,g.title[3]*.58,Math.min(46,g.title[3]*.31),lightMarquee?'ink':'ivory',false);
    }
    this.art.titleImage(titleHost,cfg.modeLabel,0,-g.title[3]*(theme===3?.07:.28),g.title[2]*.86,g.title[3]*.25,Math.min(24,g.title[3]*.16),lightMarquee?'ink':'gold',false);this.idleAccent(titleHost,theme*.4,4,.15,2);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.play('reel-stop');ambient.land(column);};
    const displayInk=COLORS.cream;
    // Print information into the cabinet's authored enamel, not over it as floating cards.
    const readout=(name:string,rect:Box,label:string,value:string,color=displayInk):Label=>{const pos=imagePoint(rect),host=box(this.plane!,name,pos[0],pos[1],rect[2],rect[3]);text(host,label,0,rect[3]*.30,rect[2]*.9,32,24,color,true);const valueLabel=text(host,value,0,-rect[3]*.19,rect[2]*.9,Math.max(34,rect[3]*.48),30,color,true);valueLabel.enableWrapText=false;return valueLabel;};
    this.balanceLabel=readout('BALANCE display',g.balance,'BALANCE',money(this.services.economy.balance()));
    this.winLabel=readout('WIN display',g.win,'WIN','0');
    // The third engraved readout is the current stake, adjacent to the + control.
    // Never put crucial betting information on the decorative console seam.
    this.betLabel=readout('BET display',g.bet,'BET',money(this.bet));
    const balance=imagePoint(g.balance),recharge=box(this.plane,'Recharge',balance[0],balance[1],g.balance[2],g.balance[3]);text(recharge,'+',g.balance[2]*.40,g.balance[3]*.25,30,30,25,displayInk,true);bindPress(recharge,recharge,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const ctl=(rect:Box,kind:'spin'|'auto'|'minus'|'plus'|'max',action:()=>void):Node=>{
      const pos=imagePoint(rect);
      const hit=box(this.plane!,kind.toUpperCase(),pos[0],pos[1],Math.max(82,rect[2]),Math.max(76,rect[3]));
      const legend=box(hit,kind+' recessed legend',0,0,rect[2],rect[3]);
      const label=kind==='spin'?'SPIN':kind==='auto'&&(theme===0||theme===3)?'A':kind==='auto'?'AUTO':kind==='minus'?'−':kind==='max'?'MAX':'+';
      const darkOnGold=theme===3||(theme===0&&kind==='plus')||(theme===2&&(kind==='auto'||kind==='max'));
      const color=kind==='spin'?['#FFF2D2','#103F3C','#722825','#172B51'][theme]:darkOnGold?(theme===2?'#722825':theme===3?'#172B51':'#5A281E'):'#FFF3DD';
      const shadow=darkOnGold?'#FFE8B7':theme===1?'#092D32':'#512A20';
      const size=kind==='spin'?Math.min(39,rect[3]*.23):kind==='auto'||kind==='max'?Math.min(27,rect[3]*.33):Math.min(42,rect[3]*.42);
      const capLift=kind==='spin'?[0,.16,.08,.10][theme]:.18;
      const engraving=outlined(text(legend,label,0,rect[3]*capLift,rect[2]*.84,rect[3]*.56,size,color,true),shadow,kind==='spin'?2:3);
      engraving.enableWrapText=false;
      // Restrained lens shade appears only under the fingertip; unlike a second
      // painted button it never covers the source artwork in the idle state.
      const pressShade=box(hit,kind+' contact shadow',0,rect[3]*capLift,rect[2]*.73,rect[3]*.48),ink=pressShade.addComponent(Graphics);
      ink.fillColor=new Color(8,8,14,36);
      ink.ellipse(0,0,rect[2]*.34,rect[3]*.20);ink.fill();
      pressShade.active=false;
      hit.on(Node.EventType.TOUCH_START,()=>{pressShade.active=true;});
      for(const event of [Node.EventType.TOUCH_END,Node.EventType.TOUCH_CANCEL])hit.on(event,()=>{pressShade.active=false;});
      bindPress(hit,legend,()=>{this.audio.play('tap');ambient.land(-1);action();},{depth:kind==='spin'?7:5,compression:kind==='spin'?.96:.97,release:.18});
      return hit;
    };
    ctl(g.minus,'minus',()=>this.changeBet(-1));ctl(g.plus,'plus',()=>this.changeBet(1));ctl(g.spin,'spin',()=>void this.spin());
    if(g.max)ctl(g.max,'max',()=>this.changeBet(this.config.bets.length));
    ctl(g.auto,'auto',()=>{this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');if(this.auto&&this.state.kind==='idle')void this.spin();});
    const status=imagePoint(g.status),statusHost=box(this.plane,'Engraved auto status',status[0],status[1],g.status[2],g.status[3]);this.autoLamp=outlined(text(statusHost,'AUTO OFF',0,0,g.status[2]*.9,g.status[3]*.75,theme===0?31:27,theme===0?g.ink:displayInk,true),theme===0?'#FFE7B1':'#422C2A',theme===0?2:1);this.autoLamp.enableWrapText=false;this.updateAuto();
    const toolbar=box(this.content!,'Safe top tools',0,this.top-95-Safe.safeTop,1000,154),tool=(name:string,x:number,icon:number,label:string,action:()=>void):Label=>{const hit=box(toolbar,name,x,0,180,150),face=this.art.coinMount(hit,0,12,108);this.art.image(face,'interfaces',0,0,86,86,icon);const caption=outlined(text(hit,cabinetToolText(label),0,-56,174,48,28,COLORS.cream),'#15352F',3);caption.enableWrapText=false;bindPress(hit,face,()=>{this.audio.play('tap');action();});return caption;};
    tool('Back to plaza',-427,9,'BACK',()=>void this.navigate('home'));tool('Rules',290,7,'RULES',()=>this.rules());this.soundLamp=tool('Audio',436,8,'SOUND ON',()=>void this.toggleSound());this.updateSound();
    this.hintLabel=outlined(text(this.content!,'',0,-this.top+88+Safe.safeBottom,980,110,38,COLORS.cream),'#15352F',3);this.hintLabel.enableWrapText=false;this.hintLabel.overflow=Label.Overflow.SHRINK;this.hintLabel.getComponent(UITransform)!.setContentSize(1960,296);
    this.layoutPlane();if(this.force)this.scheduleOnce(()=>void this.spin(),1);
  }
  private layoutPlane():void{
    if(!this.plane)return;const h=Safe.visibleHeight;
    const layout=cabinetLayout(Safe.visibleWidth,h,CABINETS[this.config.id],Safe.safeTop,Safe.safeBottom);
    this.plane.setScale(layout.scale,layout.scale,1);this.plane.setPosition(0,layout.y);

    const toolbar=this.content?.getChildByName('Safe top tools');
    if(toolbar){
      toolbar.setPosition(0,h/2-95-Safe.safeTop);
      const left=-Safe.visibleWidth/2+Safe.safeLeft+110,right=Safe.visibleWidth/2-Safe.safeRight-110;
      toolbar.getChildByName('Back to plaza')?.setPosition(left,0);
      toolbar.getChildByName('Rules')?.setPosition(right-194,0);
      toolbar.getChildByName('Audio')?.setPosition(right,0);
    }
    if(this.hintLabel){
      // A short phone has no free floor below the machine. Keep award details in
      // the win readout/celebration instead of clipping three lines at the edge.
      this.hintLabel.node.active=h>=2100;
      this.hintLabel.node.setPosition(0,-h/2+165+Safe.safeBottom);
    }
  }
  private get bet():number{const pending=this.journal.pending();return pending?.gameId===this.config.id?pending.bet:this.config.bets[this.betIndex];}
  private changeBet(delta:number):void{
    if(this.state.kind!=='idle'){this.toast('Bet is locked while the reels are moving.');return;}
    const next=Math.max(0,Math.min(this.config.bets.length-1,this.betIndex+delta));
    if(next===this.betIndex){this.toast(delta<0?'Minimum bet selected.':'Maximum bet selected.');return;}
    this.betIndex=next;
    if(this.betLabel){
      this.betLabel.string=tr(money(this.bet));
      // The engraved BET window is the feedback; do not print a second,
      // misleading "prompt" onto the painted floor beneath the machine.
      const readout=this.betLabel.node;Tween.stopAllByTarget(readout);
      readout.setScale(1,1,1);
      if(!this.reduced)tween(readout).to(.10,{scale:new Vec3(1.10,1.10,1)},{easing:'quadOut'}).to(.20,{scale:new Vec3(1,1,1)},{easing:'quadInOut'}).start();
    }
    if(this.hintLabel)this.hintLabel.string='';
  }
  private updateAuto():void{
    if(!this.autoLamp)return;this.autoLamp.string=tr(this.auto?'AUTO ON':'AUTO OFF');const statusInk=this.config.id==='lantern-vault'?this.auto?'#FFE57C':'#FFF0D6':this.config.id==='lucky-parade'?this.auto?'#FFE57C':'#FFF0D6':this.config.id==='celestial-mint'?this.auto?'#C6FFCB':'#F6E7C2':this.auto?'#15705B':'#6B3E2A';this.autoLamp.color=new Color(statusInk);
    Tween.stopAllByTarget(this.autoLamp.node);this.autoLamp.node.setScale(.5,.5,1);
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
    const requestId=this.state.kind==='retry'?this.state.requestId:SecureRNG.id('salon-spin');
    const api=this.services.api;
    const recovering=this.state.kind==='retry';
    if(api){try{this.journal.begin(requestId,this.config.id,this.bet);}catch{this.toast('Unable to save the round. Free device storage, then try again.');return;}}
    if(!api&&!this.services.economy.reserveSpin(requestId,this.bet)){this.auto=false;this.updateAuto();this.toast('Not enough coins. Visit Rewards or the Coin Shop.');return;}
    const hintTicket=++this.hintTicket;
    this.resetWinAmount();
    this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string=tr('Treasures in motion…');
    let settled=false;
    try{
      let result:SpinResult;
      if(api){const response=await api.spin(this.config.id,this.bet,requestId);result=response.result;this.journal.settle(requestId,result,response.balance);}
      else {
        const player=this.services.profile.current(),scope=this.services.save.currentScope();
        const welcomeForce=!this.force&&!!player&&!!scope&&shouldForceIntroJackpot(player.gamesPlayed,scope.introSuperAwarded);
        result=this.generator.generate(this.config,this.bet,this.rng,this.force?{winTier:this.force as 'big'|'mega'|'epic'}:welcomeForce?{winTier:'mega'}:undefined);this.force=undefined;
        if(!this.services.economy.settleSpin(requestId,result.totalWin))throw new Error('Settlement failed');
      }
      settled=true;await this.reels.finish(result);
      this.state={kind:'presenting',result};this.reels.highlight(result.wins.flatMap(w=>[...w.positions]));
      await this.presentAwardEvidence(result);
      if(result.featureResult)await this.presentFeature(result);
      if(result.totalWin>0)await this.presentWin(result.totalWin,winTier(result.totalWin/this.bet)>0);
      this.resetWinAmount(result.totalWin);
      if(this.hintLabel)this.hintLabel.string=roundEvidence(result,this.bet);
      this.state={kind:'idle'};this.refreshBalance();this.autoWait=.8;
      // Outcome detail is useful during the reveal, not as a permanent label
      // painted over the treasury floor. A later spin owns its own hint ticket.
      const settledHint=this.hintLabel;
      this.scheduleOnce(()=>{
        if(this.hintTicket===hintTicket&&this.hintLabel===settledHint&&settledHint?.node.isValid&&this.state.kind==='idle')settledHint.string='';
      },3);
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
    const awards=result.wins.filter(w=>awardCredits(w)>0);
    if(!awards.length)return;
    // A bounded sample avoids a long presentation on hundreds of Ways. The
    // denominator remains the full award count; the final total includes all.
    const shown=awards.slice(0,3);
    for(let i=0;i<shown.length;i++){
      this.reels?.highlight(shown[i].positions);
      if(this.hintLabel)this.hintLabel.string=awardEvidence(this.config,shown[i],i+1,awards.length);
      if(i===0)this.audio.playAward(0);
      await Promise.all([this.countWinAmount(result.baseWin),this.delay(this.reduced?.35:1.2)]);
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
        await Promise.all([this.countWinAmount(cumulative),this.delay(this.reduced?.1:round.credits>0?1.1:.18)]);
      }return;
    }
    if(feature.type==='coin-carousel'){
      const panel=this.sheet('The three golden vaults',780);
      this.art.titleImage(panel,'Choose a vault to reveal your treasure',0,190,850,91,39,'gold');
      text(panel,'The prize is already drawn. Your choice does not change the odds.',0,-231,851,120,31);
      await new Promise<void>(resolve=>{
        let chosen=false;
        const reveal=(i:number):void=>{
          if(chosen)return;chosen=true;this.audio.play('win');
          const award=feature.pickAwards?.[i]??feature.totalCredits;
          text(panel,money(award)+' COINS',0,-127,850,106,56,COLORS.gold,true);
          void Promise.all([this.countWinAmount(result.baseWin+feature.totalCredits),this.delay(this.reduced?.15:1.3)]).then(()=>{this.closeModal();resolve();});
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
      await Promise.all([this.countWinAmount(cumulative),this.delay(this.reduced?.1:round.credits>0?1.1:.22)]);
    }
  }
  /** Presentation only: one readout continues through base and feature awards. */
  private writeWinAmount(amount:number):void{
    this.presentedWin=amount;
    // WIN is already engraved above this aperture. Duplicating it in the value
    // shrinks seven-digit payouts to unreadable text on compact phones.
    if(this.winLabel?.isValid)this.winLabel.string=tr(money(amount));
  }
  private resetWinAmount(amount=0):void{
    this.cancelWinCount?.();this.writeWinAmount(amount);
  }
  private countWinAmount(amount:number):Promise<void>{
    this.cancelWinCount?.();
    const label=this.winLabel,from=this.presentedWin;
    if(this.reduced||!label?.isValid||amount<=from){this.writeWinAmount(amount);return Promise.resolve();}
    return new Promise<void>(resolve=>{
      const value={n:from};let done=false;
      const finish=():void=>{if(done)return;done=true;Tween.stopAllByTarget(value);if(this.cancelWinCount===finish)this.cancelWinCount=undefined;resolve();};
      this.cancelWinCount=finish;
      tween(value).to(.34,{n:amount},{easing:'cubicOut',onUpdate:()=>{
        if(!label.isValid||label!==this.winLabel){finish();return;}
        this.writeWinAmount(value.n);
      }}).call(()=>{if(label.isValid&&label===this.winLabel)this.writeWinAmount(amount);finish();}).start();
    });
  }
  private async presentWin(amount:number,big:boolean):Promise<void>{
    if(big){
      const stage=box(this.root!,'Treasure celebration',0,0,1080,this.height);this.modal=stage;stage.addComponent(BlockInputEvents);
      // Keep the integrated scene visible, but do not let cabinet readouts and
      // controls show through the transparent celebration artwork.
      const hidden=(this.plane?.children??[]).filter(n=>n.active&&!['Cabinet reflections','Reels',this.config.id+'-tall'].includes(n.name));
      for(const n of [this.hintLabel?.node,this.content?.getChildByName('Safe top tools')])if(n?.active)hidden.push(n);
      const fades=hidden.map(n=>({node:n,alpha:n.getComponent(UIOpacity)??n.addComponent(UIOpacity)}));
      const prior=fades.map(f=>f.alpha.opacity);
      try{
        fades.forEach(f=>tween(f.alpha).to(this.reduced?.01:.22,{opacity:0},{easing:'sineInOut'}).start());
        await this.delay(.22);
        this.audio.play('reward');
        const awardTier=winTier(amount/this.bet);
        await stage.addComponent(SalonWinStage).setup(this.art,amount,this.height,this.reduced,amount/this.bet,GAME_CONFIGS.indexOf(this.config),()=>{
          this.audio.playAward(awardTier===1?1:awardTier===2?3:4);
          if(!this.reduced)this.audio.vibrate(awardTier===1?[30,35,50]:[40,30,65,30,85]);
        });
      }finally{
        fades.forEach((f,i)=>{if(f.node.isValid)tween(f.alpha).to(this.reduced?.01:.3,{opacity:prior[i]},{easing:'sineInOut'}).start();});
        if(this.modal===stage)this.closeModal();
      }
    }else{
      if(amount>this.presentedWin)this.audio.playAward(0);
      const stage=box(this.content!,'Ordinary win presentation',0,0,1080,this.height);
      const hidden=[this.hintLabel?.node].filter((n):n is Node=>!!n&&n.active);
      hidden.forEach(n=>n.active=false);
      try{
        await Promise.all([this.countWinAmount(amount),stage.addComponent(OrdinaryWinStage).setup(this.art,amount,Safe.visibleHeight,this.reduced,this.bet,{y:-Safe.visibleHeight/2+248+Safe.safeBottom,width:980})]);
      }finally{
        if(stage.isValid)stage.destroy();
        hidden.forEach(n=>{if(n.isValid)n.active=true;});
      }
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=tr(money(this.services.economy.balance()));}
  private delay(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,this.reduced?Math.min(.12,seconds):seconds));}
  protected update(dt:number):void{const fx=this.plane?.getChildByName('Cabinet reflections')?.getComponent(SalonAtmosphere);if(fx)fx.energy=this.state.kind==='spinning'?1:this.state.kind==='presenting'?.6:0;if(this.auto&&this.visible&&this.state.kind==='idle'&&this.page==='game'&&!this.modal){this.autoWait-=dt;if(this.autoWait<=0){this.autoWait=1;void this.spin();}}}
  private hide():void{this.visible=false;this.auto=false;this.updateAuto();}
  private show():void{this.visible=true;}
  private title(value:string,sub:string,icon:number):void{
    this.art.panel(this.content!,88,this.top-280,750,130,1);
    this.art.image(this.content!,'interfaces',-368,this.top-306,155,155,icon);
    this.art.titleImage(this.content!,value,88,this.top-280,700,108,62,'ink');this.art.titleImage(this.content!,sub,65,this.top-370,742,76,34,'ink');
  }
  // Presentation only: these tweens never change saved balances or scores.
  private reveal(n:Node,delay=0):void{if(this.reduced)return;const end=n.position.clone();n.setPosition(end.x,end.y-20,end.z);tween(n).delay(delay).to(.42,{position:end},{easing:'sineOut'}).start();const o=opacity(n,0);tween(o).delay(delay).to(.34,{opacity:255}).start();}
  private edgeJewels(parent:Node,w:number,h:number,phase=0):void{
    if(this.reduced)return;const points=[[-w*.44,h*.34],[w*.44,-h*.34],[w*.40,h*.38],[-w*.40,-h*.38]];
    points.forEach(([x,y],i)=>{const n=this.art.light(parent,3,x,y,42,42,0);n.name='Crafted edge glint';const alpha=n.getComponent(UIOpacity)!;tween(alpha).delay(phase+i*.65).to(.55,{opacity:175},{easing:'sineOut'}).to(1.1,{opacity:0},{easing:'sineInOut'}).delay(3.3).union().repeatForever().start();});
  }
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
      const x=(i%2?1:-1)*481,y=i<2?346:-347,n=this.art.image(layer,'symbols-coin-carousel',x,y,34,34,0);n.name='Idle margin gold';this.idleAccent(n,i*1.1,12,9);this.edgeJewels(n,28,28,i);
    }
  }
  private count(label:Label,total:number,from=0,suffix=''):void{Tween.stopAllByTarget(label);if(this.reduced){label.string=tr(money(total)+suffix);return;}tween(label).to(.85,{}, {onUpdate:(_target,ratio)=>{if(label.isValid)label.string=tr(money(from+(total-from)*(1-Math.pow(1-(ratio??0),3)))+suffix);}}).call(()=>{if(label.isValid)label.string=tr(money(total)+suffix);}).start();}
  private rewardArrival(before:number,after:number):void{
    if(this.balanceLabel)this.count(this.balanceLabel,after,before);
    if(this.reduced||!this.root||!this.balanceLabel)return;
    const target=this.root.getComponent(UITransform)!.convertToNodeSpaceAR(this.balanceLabel.node.worldPosition);
    for(let i=0;i<9;i++){
      const start=new Vec3((i-4)*25,-110,0),control=new Vec3(start.x+(i%2?135:-135),target.y*.5+110,0);
      const coin=this.art.image(this.root,'symbols-coin-carousel',start.x,start.y,54,54,0);coin.name='Reward arrival coin';const alpha=opacity(coin,0);
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
    const stage=this.pageStage('ROYAL MINT ARCADE'),stamp=this.generation;this.sectionHeading(stage,'ROYAL MINT ARCADE',this.services.remoteMode?'Select a minted coin crate':'Preview · Purchases unavailable');
    const track=box(stage,'Mint conveyor',0,350,930,145),tg=track.addComponent(Graphics);tg.strokeColor=new Color('#D4A14D');tg.lineWidth=6;tg.moveTo(-420,0);tg.lineTo(420,0);tg.stroke();for(let x=-390;x<=390;x+=78){tg.fillColor=new Color('#FFE3A0');tg.circle(x,0,7);tg.fill();}
    void this.services.store.catalog().then(items=>{if(stamp!==this.generation||!items.length)return;this.selectedBundle=Math.max(0,Math.min(items.length-1,this.selectedBundle));
      items.forEach((item,i)=>{const active=i===this.selectedBundle,x=(i-(items.length-1)/2)*220,hit=box(track,'Mint crate '+item.id,x,0,190,140);if(active)this.art.light(hit,1,0,0,150,135,120).setSiblingIndex(0);const seal=this.art.image(hit,'symbols-'+GAME_CONFIGS[i].id,0,15,92,92,[0,1,5,9][i]);text(hit,['STARTER','LUCKY','DELUXE','ROYAL'][i],0,-52,180,34,21,active?COLORS.gold:COLORS.cream,true).enableWrapText=false;bindPress(hit,seal,()=>{this.selectedBundle=i;this.audio.play('tap');this.render();});});
      const item=items[this.selectedBundle],gameConfig=GAME_CONFIGS[this.selectedBundle],total=item.credits+item.bonus,bonus=Math.round(item.bonus/item.credits*100),show=box(stage,'Separate mint sculpture and purchase console',0,-65,930,610);this.art.panel(show,215,0,490,588,2);const mount=box(show,'Arched vault display',-272,20,332,435).addComponent(Graphics);mount.fillColor=new Color('#602927');mount.roundRect(-166,-218,332,435,78);mount.fill();mount.fillColor=new Color('#F2CC80');mount.roundRect(-157,-211,314,422,76);mount.fill();
      const character=this.art.cover(show,prizeArt(gameConfig.id),-272,20,305,405,-1,72);this.idleAccent(character,.2,4,.2,1.8);
      this.art.image(show,'interfaces',225,178,95,95,13);this.art.titleImage(show,['POCKET OF JOY','LANTERN TREASURY','PARADE CHEST','CELESTIAL RESERVE'][this.selectedBundle],205,92,430,62,35,'ivory');
      const amount=text(show,money(total)+' COINS',205,12,430,76,45,COLORS.gold,true);amount.enableWrapText=false;text(show,bonus?bonus+'% FESTIVAL BONUS':'STANDARD MINT',205,-54,420,40,24,COLORS.cream,true).enableWrapText=false;
      text(show,'Base '+money(item.credits)+'  ·  Gift '+money(item.bonus),205,-111,420,42,25,COLORS.cream).enableWrapText=false;
      this.art.button(show,'Buy '+item.id,205,-213,410,102,item.available?item.displayPrice:'PREVIEW ONLY',item.available?13:undefined,()=>{if(item.available)void this.purchase(item.id);else this.toast('This coin pack is unavailable on this device. No coins were charged.');},item.available?2:0);
    }).catch(()=>this.toast('Shop unavailable. Please try again.'));
    const canSync=this.services.store.purchaseAvailable();
    this.art.button(stage,'Synchronize purchases',0,-514,780,82,canSync?'SYNC UNFINISHED PURCHASES':'APPLE PURCHASE SYNC UNAVAILABLE',canSync?12:undefined,()=>{if(canSync)void this.restorePurchases();else this.toast('Purchase sync is available only in the signed-in iOS app.');},0);
    text(stage,'Virtual coins · No cash value · Restore-safe receipts',0,-590,900,40,23,COLORS.ink).enableWrapText=false;
  }
  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}catch{this.toast('Unable to connect. Please try again.');}finally{this.busy=false;}}
  private async restorePurchases():Promise<void>{
    if(this.busy)return;this.busy=true;
    try{const r=await this.services.store.restore();this.refreshBalance();this.toast(r.message);}
    catch{this.toast('Unable to restore purchases. Please try again.');}
    finally{this.busy=false;}
  }
  private rewardsPage():void{
    const stage=this.pageStage('SEVEN-DAY FORTUNE WHEEL'),scope=this.services.save.currentScope(),today=new Date().toISOString().slice(0,10),progress=scope?.checkIn,claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);
    this.sectionHeading(stage,'SEVEN-DAY FORTUNE WHEEL',tr('DAY '+(active+1))+' · '+tr(claimed?'COLLECTED':'READY TO CLAIM'));
    const wheel=box(stage,'Seven day fortune wheel',0,105,850,790),wg=wheel.addComponent(Graphics);wg.strokeColor=new Color('#D5A548');wg.lineWidth=7;wg.circle(0,0,305);wg.stroke();wg.strokeColor=new Color(255,236,177,150);wg.lineWidth=3;wg.circle(0,0,225);wg.stroke();
    const hub=this.art.image(wheel,'treasury-day-medallion',0,0,205,205);this.art.image(hub,'interfaces',0,0,170,170,13);this.art.titleImage(wheel,'LUCKY 7',0,-135,210,46,28,'ivory');
    this.services.checkIn.rewards.forEach((amount,i)=>{const angle=-Math.PI/2+i*Math.PI*2/7,x=Math.cos(angle)*305,y=Math.sin(angle)*305,current=i===active,done=i<active||(current&&claimed),node=this.art.image(wheel,'treasury-day-medallion',x,y,166,166);node.name='Fortune day '+(i+1);text(node,'DAY '+(i+1),0,36,145,36,30,COLORS.cream,true);text(node,money(amount),0,-2,145,45,38,current?COLORS.gold:COLORS.cream,true);text(node,done?'✓':current?'TODAY':'·',0,-43,140,33,27,current?COLORS.cream:COLORS.gold,true);bindPress(node,node,()=>{if(current&&!claimed)void this.claim('check-in');else this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Upcoming'));});});
    this.art.button(stage,'Check in',0,-365,820,96,claimed?'DAY '+(active+1)+' COLLECTED':'SPIN & CLAIM '+money(this.services.checkIn.rewards[active]),2,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next reward after 00:00 UTC.');},2);
    const daily=this.art.counter(stage,0,-520,900,160),collected=!!scope?.claims['daily-free:'+today];this.art.image(daily,'interfaces',-350,0,105,105,0);this.art.titleImage(daily,'DAILY COIN ENVELOPE',-40,32,560,43,29,'ink');text(daily,money(ECONOMY.daily)+' COINS',-40,-18,560,45,32,COLORS.jade,true);this.art.button(daily,'Claim daily',330,0,205,92,collected?'COLLECTED':'OPEN',5,()=>{if(!collected)void this.claim('daily');else this.toast('Today’s gift is already collected.');},0);
    text(stage,'Reset 00:00 UTC · Progress follows your account',0,-642,900,42,25,COLORS.ink).enableWrapText=false;
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
    const stage=this.pageStage('Grandstand ranking');this.sectionHeading(stage,'GRANDSTAND OF FORTUNE','ALL-TIME VIRTUAL COIN WINNINGS');
    const stamp=this.generation,render=(players=this.services.rank.list('all-time',this.services.profile.current())):void=>{if(stamp!==this.generation)return;const profile=this.services.profile.current();if(!this.services.remoteMode&&profile&&!players.some(p=>p.current))players=[...players,{rank:players.length+1,nickname:profile.nickname,winnings:profile.totalWin,avatar:profile.avatar,current:true}];
      const ranked=this.services.remoteMode?players.map(p=>({...p,virtual:false})):hallStandings(players),current=ranked.find(p=>p.current),visible=ranked.slice(0,6);if(current&&!visible.some(p=>p.current))visible[5]=current;if(!visible.length){this.art.titleImage(stage,'No settled rankings yet',0,100,800,100,36,'ink');return;}
      const podium=box(stage,'Three gilded winner plinths',0,135,930,650),pg=podium.addComponent(Graphics),spots=[[-275,15,180,250],[0,80,210,330],[275,-10,180,220]];
      spots.forEach(([x,y,w,h],i)=>{const player=visible[[1,0,2][i]??0];if(!player)return;
        const l=x-w/2,r=x+w/2,t=y+h/2,b=y-h/2;
        pg.fillColor=new Color(55,24,26,190);pg.moveTo(l-7,b-17);pg.lineTo(r+7,b-17);pg.lineTo(r+13,b+8);pg.lineTo(l-13,b+8);pg.close();pg.fill();
        pg.fillColor=new Color('#F6CF7B');pg.moveTo(l-7,b+7);pg.lineTo(r+7,b+7);pg.lineTo(r,t-30);pg.lineTo(r-27,t);pg.lineTo(l+27,t);pg.lineTo(l,t-30);pg.close();pg.fill();
        pg.fillColor=new Color(i===1?'#722B35':i===0?'#164C49':'#65452F');pg.moveTo(l+8,b+18);pg.lineTo(r-8,b+18);pg.lineTo(r-10,t-34);pg.lineTo(r-30,t-9);pg.lineTo(l+30,t-9);pg.lineTo(l+10,t-34);pg.close();pg.fill();
        pg.fillColor=new Color('#D3994A');pg.rect(l+12,b+11,w-24,9);pg.fill();
        const medallion=this.art.image(podium,'treasury-day-medallion',x,y+h*.23,i===1?150:126,i===1?150:126);
        const portrait=this.art.cover(medallion,'portraits',0,0,i===1?117:98,i===1?117:98,player.avatar,i===1?58:49);this.idleAccent(portrait,i*.4,4,.2,2);
        outlined(text(podium,'#'+player.rank,x,y+4,w*.9,42,31,COLORS.cream,true),'#37191C',2);
        outlined(text(podium,player.nickname,x,y-48,w*.9,42,25,COLORS.cream,false,true),'#37191C',2).enableWrapText=false;
        outlined(text(podium,money(player.winnings),x,y-h*.33,w*.9,42,28,COLORS.gold,true),'#37191C',2).enableWrapText=false;
      });
      visible.slice(3).forEach((r,i)=>{const y=-262-i*103,row=this.art.counter(stage,0,y,890,88);this.art.cover(row,'portraits',-382,0,62,62,r.avatar,31);text(row,'#'+r.rank,-310,0,80,44,28,COLORS.ink,true);text(row,r.nickname,-95,0,300,44,27,COLORS.ink,false,true).enableWrapText=false;text(row,money(r.winnings),294,0,220,44,28,COLORS.ink,true).enableWrapText=false;this.reveal(row,i*.1);});
      this.art.button(stage,'Explore games',0,-620,820,94,'RETURN TO THE PLAZA',6,()=>void this.navigate('home'),2);
    };if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load rankings.'));else render();
  }
  private profilePage():void{
    const stage=this.pageStage('FORTUNE PASSPORT'),p=this.services.profile.current();if(!p)return;this.sectionHeading(stage,'FORTUNE PASSPORT','IDENTITY · WALLET · PLAY RECORD');
    const book=box(stage,'Two-volume fortune ledger',0,-55,950,1060);this.art.counter(book,-234,0,462,1040);this.art.counter(book,234,0,462,1040);const paper=book.addComponent(Graphics);paper.fillColor=new Color('#6B3028');paper.roundRect(-12,-515,24,1030,7);paper.fill();paper.fillColor=new Color('#F1C36F');paper.rect(-3,-492,6,984);paper.fill();
    this.art.titleImage(book,'PASSPORT HOLDER',-230,414,400,52,29,'ink');this.art.image(book,'treasury-day-medallion',-230,274,208,208);const portrait=this.art.cover(book,'portraits',-230,274,175,175,p.avatar,87);bindPress(portrait,portrait,()=>this.avatars());
    const name=text(book,p.nickname,-230,137,400,55,36,COLORS.ink,true);name.enableWrapText=false;bindPress(name.node,name.node,()=>this.editNickname());text(book,p.isGuest?'GUEST PASS · LEVEL '+p.level:'MEMBER PASS · LEVEL '+p.level,-230,88,390,42,28,COLORS.jade,true);
    this.art.button(book,'Edit nickname',-230,22,340,66,'EDIT NAME',7,()=>this.editNickname(),0);
    const stamp=this.art.image(book,'interfaces',-230,-118,228,228,14);
    this.idleAccent(stamp,.02,3,.10,3);
    this.art.button(book,'Portraits',-330,-350,180,66,'PORTRAIT',4,()=>this.avatars(),0);this.art.button(book,'Language',-130,-350,180,66,'LANGUAGE',7,()=>this.languages(),0);
    this.art.titleImage(book,'ACCOUNT LEDGER',230,414,400,52,29,'ink');const balance=this.services.economy.balance(),stats:[string,number,number][]=[['WALLET',balance,300],['ROUNDS',p.gamesPlayed,190],['BEST WIN',p.biggestWin,80],['TOTAL WON',p.totalWin,-30]];stats.forEach(([label,value,y])=>{text(book,label,120,y,178,45,34,COLORS.jade,true).enableWrapText=false;const v=text(book,money(value),307,y,180,54,40,COLORS.ink,true);v.enableWrapText=false;});
    const ledger=this.services.save.currentScope()?.transactions??[];text(book,ledger.length+' SETTLED LEDGER ENTRIES',230,-138,390,42,29,COLORS.ink,true);this.art.button(book,'Open coin history',230,-222,360,72,'OPEN COIN JOURNAL',13,()=>this.history(),1);this.art.button(book,'Privacy',230,-312,360,66,'PRIVACY & DATA',7,()=>this.legal('privacy'),0);
    this.art.button(book,'Sign out',120,-418,190,66,'SIGN OUT',9,()=>void this.signOut(),0);this.art.button(book,'Delete account',337,-418,190,66,'DELETE',15,()=>this.deleteAccount(),2);
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
  private history():void{const s=this.sheet('Your coin ledger',1190);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,394-i*132,840,115,1);text(n,r.type.replace(/-/g,' '),-168,0,356,68,29,COLORS.jade);const amount=text(n,(r.amount>0?'+':'')+exactMoney(r.amount),209,0,286,64,34,COLORS.ink);amount.enableWrapText=false;});if(!rows.length){const icon=this.art.image(s,'interfaces',0,156,220,220,1);this.idleAccent(icon,0,7,.3,1.5);this.art.titleImage(s,'Your coin ledger is ready',0,-20,820,90,40,'gold');text(s,'Collect a reward or play a round.\nYour coin activity will appear here.',0,-132,820,142,34);this.art.button(s,'Ledger rewards',0,-302,730,108,'Explore rewards',2,()=>{this.closeModal();void this.navigate('rewards');},0);}}
  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void {
    const panel=this.sheet('Mailbox',1110),items=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).deleted);
    this.art.titleImage(panel,'Gifts and notices',0,377,750,60,33,'gold');
    items.forEach((m,i)=>{const state=this.services.mail.state(m.id),row=this.art.panel(panel,0,230-i*210,840,177,0);
      const icon=this.art.image(row,'interfaces',-293,0,94,94,state.read?5:2);
      this.art.titleImage(row,m.title,45,24,540,48,31,'ink');
      text(row,state.claimed?'Attachment collected':m.credits?money(m.credits)+' COINS':state.read?'Read':'Unread',45,-27,530,42,28,COLORS.ink);
      bindPress(row,icon,()=>this.openMail(m.id));row.name='Mail item '+m.id;
    });
    if(!items.length)this.art.titleImage(panel,'Your mailbox is empty',0,90,740,110,39,'gold');
    this.art.button(panel,'Claim all mail',-200,-391,390,100,'Collect all',14,()=>{if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}const amount=this.services.mail.claimAll();this.render();this.mail();this.toast(amount?money(amount)+' coins collected':'No attachments to collect');},0);
    this.art.button(panel,'Clear read mail',200,-391,390,100,'Clear read',9,()=>{this.services.mail.deleteRead();this.render();this.mail();},0);
    text(panel,'Unclaimed gifts are kept when clearing mail',0,-474,770,45,26);
  }
  private openMail(id:string):void {
    const item=INBOX_MESSAGES.find(m=>m.id===id);if(!item)return;
    this.services.mail.read(id);this.render();const panel=this.sheet('Letter',920),state=this.services.mail.state(id);
    this.art.titleImage(panel,item.title,0,254,770,85,38,'ivory');
    text(panel,item.body,0,112,740,160,33);
    const gift=this.art.image(panel,item.credits?'symbols-coin-carousel':'interfaces',0,-70,140,140,item.credits?0:5);
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
      const heading=panel.getChildByName('Dialog image title');
      if(heading)heading.name='Rule dialog title';
      box(panel,'Rule content anchor',0,0,978,1480);
    }else{
      const heading=panel.getChildByName('Rule dialog title');
      if(heading)this.art.updateTitleImage(heading,title,46,'gold');
    }
    const anchor=panel.getChildByName('Rule content anchor')!;
    for(const child of [...anchor.children]){child.active=false;child.destroy();}
    // Retain the panel's text palette/insets without duplicating its background.
    return box(anchor,panel.name,0,0,978,1480);
  }

  private legal(which:LegalPage):void{
    const s=this.sheet(which==='terms'?'Terms of Service':which==='privacy'?'Privacy & Data':'Player Support',1360);
    LEGAL_SECTIONS[which].forEach((section,i)=>{const y=460-i*210;this.art.titleImage(s,section.title,0,y,850,64,34,'gold');text(s,section.body.replace(/\n/g,' '),0,y-88,861,150,31);});
  }
  private sheet(title:string,height:number):Node{
    this.closeModal();const overlay=box(this.root!,'Modal shield',0,0,Safe.visibleWidth,Safe.visibleHeight);overlay.addComponent(BlockInputEvents);
    const dim=overlay.addComponent(Graphics);dim.fillColor=new Color(17,32,27,150);dim.rect(-Safe.visibleWidth/2,-Safe.visibleHeight/2,Safe.visibleWidth,Safe.visibleHeight);dim.fill();
    const panel=this.art.panel(overlay,0,0,978,height,2);const heading=this.art.titleImage(panel,title,-25,height/2-83,797,118,46,'gold',false);heading.name='Dialog image title';
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
