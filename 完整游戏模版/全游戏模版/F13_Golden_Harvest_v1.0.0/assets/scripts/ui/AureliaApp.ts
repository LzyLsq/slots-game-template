import { OrdinaryWinStage } from '../vfx/OrdinaryWinStage';
import {LabelOutline} from 'cc';
import {cabinetToolText} from './CabinetToolText';
import {drawRulePages} from './RulePages';
import {awardCredits, awardEvidence, featureAwardEvidence, awardSummary, newcomerBenefitCaption, roundEvidence, tierRules, winTier} from '../vfx/WinPresentation';
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
import { GAME_CONFIGS, symbolAtlas, SYMBOL_ART } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import type { GameConfig, GameId, SpinResult } from '../math/types';
import type { AuthResult } from '../services/AuthService';
import { ApiRequestError } from '../services/ProductionApiClient';
import { RemoteSpinJournal } from '../services/RemoteSpinJournal';
import { STORE_PRODUCTS } from '../services/StoreService';
import { SalonReels } from '../reels/SalonReels';
import { SalonAtmosphere } from '../vfx/SalonAtmosphere';
import { ThemeFestivity } from '../vfx/ThemeFestivity';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, outlined, COLORS } from './SalonArt';
import { CABINETS, imagePoint, cabinetLayout, type Box } from './CabinetGeometry';
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
  private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
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
    const g=loading.addComponent(Graphics);g.fillColor=new Color('#153E36');g.rect(-1500,-2000,3000,4000);g.fill();
    text(loading,'GOLDEN HARVEST',0,90,950,160,80,COLORS.gold,true);
    const progress=text(loading,'Opening the Harvest Exhibition…',0,-70,950,100,38);
    try{
      await this.art.load(['salon','symbols','interfaces','portraits','symbols-blur','celebration','optics','apple-mark','harvest-brand','harvest-exhibition',...Array.from({length:16},(_,i)=>'harvest-button-'+i),'harvest-hall-soft',...Array.from({length:4},(_,i)=>'harvest-soft-plate-'+i),'harvest-rank','harvest-profile','harvest-rewards','harvest-store',...Array.from({length:4},(_,i)=>'harvest-card-'+i)],(n,t)=>{
        progress.string=`Preparing treasures  ${Math.round(n/t*100)}%`;
        globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:n/t*.9}}));
      });
      const resumed=await this.services.resumeSession();
      if(this.debug&&!resumed){this.accept();await this.services.auth.guestLogin();}
      const requested=query.get('screen') as Page|null;
      this.config=GAME_CONFIGS.find(g=>g.id===query.get('game'))??GAME_CONFIGS[0];
      this.page=(resumed||this.debug)?(requested??'home'):'login';
      if(!['home','login','register','game','store','rewards','rank','profile'].includes(this.page))this.page='home';
      this.audio.setEffects(this.services.profile.current()?.settings.sound??true);
      this.restoreRemoteRound();
      if(this.page==='game')await this.art.load([this.config.id+'-tall']);
      this.render();loading.destroy();
      globalThis.dispatchEvent?.(new Event('aurelia-app-ready'));
    }catch(error){progress.string='Could not open the salon. Tap to retry.';loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
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
    this.audio.setScene(this.page==='game'?'cabinet':'home');
    this.cancelWinCount?.();this.presentedWin=0;
    this.generation++;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.topWinLabel=this.hintLabel=this.autoLamp=this.soundLamp=undefined;
    this.root?.destroy();this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Harvest-interface',0,0,Safe.visibleWidth,this.height);this.root=root;
    const backdrop=this.page==='home'?'harvest-hall-soft':this.page==='rank'?'harvest-rank':this.page==='profile'?'harvest-profile':this.page==='rewards'?'harvest-rewards':this.page==='store'?'harvest-store':'salon';
    this.bg=this.page==='game'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);
    
    if(this.page!=='game'){const ambient=box(root,'Atmosphere',0,0,Safe.visibleWidth,this.height).addComponent(SalonAtmosphere);ambient.setup(this.art,Safe.visibleWidth,this.height,false,this.page==='login'||this.page==='register'?30:18);ambient.reducedMotion=this.reduced;}
    this.content=box(root,'Page',0,0,1080,this.height);
    if(this.page==='login'||this.page==='register')this.authPage();
    else if(this.page==='game')this.gamePage();
    else{this.header();if(this.page==='home')this.homePage();if(this.page==='store')this.storePage();if(this.page==='rewards')this.rewardsPage();if(this.page==='rank')this.rankPage();if(this.page==='profile')this.profilePage();this.navigation();}
    this.node.getChildByName('RotateDeviceOverlay')?.setSiblingIndex(this.node.children.length-1);
    const o=opacity(this.content,0);tween(o).to(this.reduced?.01:.28,{opacity:255},{easing:'sineOut'}).start();
    if(this.page!=='login'&&this.page!=='register'&&!complianceCurrent(this.services.save.read().compliance))this.policyConsent();
  }
  private async navigate(page:Page,config?:GameConfig):Promise<void>{
    if(this.state.kind!=='idle'&&this.page==='game'){this.toast('Finish the current round before leaving.');return;}
    if(this.busy)return;this.busy=true;this.auto=false;this.updateAuto();
    try{
      if(config){const overlay=this.sheet('Opening '+config.name,570);this.art.image(overlay,'harvest-card-'+GAME_CONFIGS.indexOf(config),0,-20,710,380);text(overlay,'Preparing cabinet & reels…',0,-238,780,62,35);await this.art.load([config.id+'-tall']);}
      if(this.content&&!this.reduced){tween(opacity(this.content,255)).to(.18,{opacity:0},{easing:'sineInOut'}).start();await this.delay(.18);}
      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{this.busy=false;}
  }
  private header():void{
    const p=this.services.profile.current();const y=this.top-100-Safe.safeTop;
    const ledger=this.page==='home'?this.art.image(this.content!,'harvest-soft-plate-1',180,y,610,103):this.art.panel(this.content!,180,y,610,103,0);
    if(this.page==='home')this.metalEdges(ledger,610,103,.8);
    this.art.image(ledger,'symbols',-241,0,88,88,0);
    this.balanceLabel=text(ledger,money(this.services.economy.balance()),-5,0,362,72,49,this.page==='home'?COLORS.ink:COLORS.cream);
    this.art.button(ledger,'Top up',240,0,99,99,'',8,()=>void this.navigate('store'));
    const avatar=this.art.image(this.content!,'portraits',-440,y,112,112,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    const mailboxButton=this.art.button(this.content!,'Mail',-285,y,115,110,'',5,()=>this.mail());const unreadMail=INBOX_MESSAGES.filter(m=>{const state=this.services.mail.state(m.id);return !state.read&&!state.deleted;}).length;if(unreadMail)text(mailboxButton,String(unreadMail),33,33,40,40,27,COLORS.cream,true);
  }
  private navigation():void{
    const nav=this.page==='home'?this.art.image(this.content!,'harvest-soft-plate-1',0,-this.top+104+Safe.safeBottom,1040,166):this.art.panel(this.content!,0,-this.top+104+Safe.safeBottom,1040,166,0);
    if(this.page==='home')this.metalEdges(nav,1040,166,3.1);
    const pages:Page[]=['home','store','rewards','rank','profile'];const labels=['Hall','Treasury','Gifts','Honours','Member'];
    pages.forEach((page,i)=>{
      const button=box(nav,labels[i],(i-2)*203,0,196,150);
      const icon=this.art.image(button,'interfaces',0,21,96,96,i);
      text(button,labels[i],0,-36,190,62,29,this.page==='home'?COLORS.ink:page===this.page?COLORS.gold:COLORS.cream);
      bindPress(button,icon,()=>void this.navigate(page));
    });
  }
  private metalEdges(parent:Node,w:number,h:number,phase:number):void{
    const fx=box(parent,'Gilded reflection',0,0,w,h).addComponent(SalonAtmosphere);
    fx.metalFrame(this.art,w,h,phase);fx.reducedMotion=this.reduced;
  }
  private homePage():void{
    const stage=box(this.content!,'Harvest exhibition floor',0,0,1080,this.height);
    this.art.image(stage,'harvest-brand',0,this.top-300,790,350);
    const scale=Math.min(1080/1024,(this.height-750)/1536);
    const exhibition=box(stage,'Integrated harvest exhibition',0,this.top-490-768*scale,1024,1536);
    exhibition.setScale(scale,scale,1);
    this.art.image(exhibition,'harvest-exhibition',0,0,1024,1536);
    ThemeFestivity.hall(exhibition,1024,1536,this.reduced);
    const apertures=[[112,188,325,380],[586,188,325,380],[112,752,325,382],[586,752,325,382]];
    GAME_CONFIGS.forEach((cfg,i)=>{
      const [x,y,w,h]=apertures[i],cx=x+w/2-512,cy=768-y-h/2;
      const picture=this.art.cover(exhibition,'harvest-card-'+i,cx,cy,w,h,-1,25);
      const lighting=box(picture,'Recessed display lights',0,0,w,h).addComponent(SalonAtmosphere);
      lighting.exhibit(this.art,w,h,['#FFE0A0','#F6D19B','#DCECB1','#FFD3BA'][i],i);lighting.reducedMotion=this.reduced;
      const frame=box(exhibition,'Niche light',cx,cy,w+18,h+18);this.metalEdges(frame,w+18,h+18,i*1.6);
      const labelY=768-(i<2?617:1181);
      text(exhibition,['Mint','Vault','Orchard','Lanterns'][i],cx,labelY,200,68,36,COLORS.ink);
      const hit=box(exhibition,cfg.name,cx,cy-25,w+36,h+140);bindPress(hit,picture,()=>void this.navigate('game',cfg));
    });
  }

  private authPage():void{
    const register=this.page==='register';
    const aura=box(this.content!,'Invitation light',0,0,1080,this.height);
    const leftGlow=this.art.light(aura,0,-330,this.top-470,620,620,40);
    const rightGlow=this.art.light(aura,0,350,this.top-650,540,540,28);
    if(!this.reduced){
      tween(leftGlow).by(5.8,{position:new Vec3(54,-36,0),angle:18},{easing:'sineInOut'}).by(5.8,{position:new Vec3(-54,36,0),angle:-18},{easing:'sineInOut'}).union().repeatForever().start();
      tween(rightGlow).by(7.2,{position:new Vec3(-46,42,0),angle:-20},{easing:'sineInOut'}).by(7.2,{position:new Vec3(46,-42,0),angle:20},{easing:'sineInOut'}).union().repeatForever().start();
    }
    const hero=box(this.content!,'Welcome shimmer',0,this.top-320,920,380);
    const shimmer=hero.addComponent(SalonAtmosphere);shimmer.exhibit(this.art,920,380,'#FFE4AE',0);shimmer.reducedMotion=this.reduced;
    const wordmark=this.art.image(hero,'harvest-brand',0,0,840,480);
    if(!this.reduced)tween(wordmark).to(3.2,{position:new Vec3(0,8,0),scale:new Vec3(1.012,1.012,1)},{easing:'sineInOut'}).to(3.2,{position:new Vec3(0,-3,0),scale:new Vec3(1,1,1)},{easing:'sineInOut'}).union().repeatForever().start();
    outlined(text(this.content!,'A celebration of golden possibilities',0,this.top-535,940,62,32,COLORS.cream));
    const panelH=1080;const panelY=Math.min(-120,this.top-610-panelH/2);
    const panel=this.art.panel(this.content!,0,panelY,940,panelH,0);
    const panelEffects=box(panel,'Living gilded frame',0,0,916,panelH-22).addComponent(SalonAtmosphere);
    panelEffects.authFrame(this.art,916,panelH-22);panelEffects.reducedMotion=this.reduced;
    const authButton=(name:string,y:number,label:string,action:()=>void,primary=false,apple=false):Node=>{
      const hit=box(panel,name,0,y,778,103);
      const face=this.art.panel(hit,0,0,778,103,primary?3:1);
      if(!this.reduced){
        const sheenClip=box(face,'Button sheen',0,0,752,79);sheenClip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        const sheen=this.art.light(sheenClip,2,-470,0,240,170,primary?72:38);
        tween(sheen).delay(primary ? .7 : 1.8).to(primary ? 2.8 : 3.8,{position:new Vec3(470,0,0)},{easing:'sineInOut'}).delay(primary ? 1.3 : 2.4).set({position:new Vec3(-470,0,0)}).union().repeatForever().start();
      }
      if(apple)this.art.image(face,'apple-mark',-180,1,44,50);
      const caption=text(face,label,apple?40:0,0,apple?420:654,74,apple?35:34,primary?COLORS.cream:COLORS.ink);
      if(primary){caption.fontSize=37;caption.lineHeight=46;}
      bindPress(hit,face,action);return hit;
    };
    if(!this.reduced){panel.setPosition(0,panelY-22);tween(panel).to(.5,{position:new Vec3(0,panelY,0)},{easing:'cubicOut'}).start();}

    text(panel,register?'Create your account':'Enter the celebration',0,panelH/2-84,845,88,48,COLORS.cream,true);
    let y=panelH/2-190;
    this.field(panel,'Username',y,this.draft.username,v=>this.draft.username=v);y-=137;
    this.field(panel,'Password · 10–72 characters',y,this.draft.password,v=>this.draft.password=v,true);y-=137;
    if(register){this.field(panel,'Confirm password',y,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);y-=137;this.field(panel,'Nickname',y,this.draft.nickname,v=>this.draft.nickname=v);y-=130;}
    if(register){
      const acceptButton=this.art.button(panel,'Accept terms',-340,y,110,110,'',undefined,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;check.active=this.draft.acceptedTerms;},1);
      const check=this.art.image(acceptButton,'interfaces',0,0,93,93,14);check.active=this.draft.acceptedTerms;
      text(panel,'I meet the regional age requirement\nand accept the Terms & Privacy Policy.',58,y,644,104,32);
      y-=119;
    }
    authButton(register?'Create account':'Sign in',y,register?'Create account':'Sign in',()=>void this.authAction(register?'register':'login'),true);y-=126;
    if(!register){
      const divider=box(panel,'Other sign in methods',0,y,778,48);
      const dg=divider.addComponent(Graphics);dg.strokeColor=new Color('#B99658');dg.lineWidth=2;dg.moveTo(-360,0);dg.lineTo(-82,0);dg.moveTo(82,0);dg.lineTo(360,0);dg.stroke();
      text(divider,'OR',0,0,120,40,27,'#E8D7AE');y-=61;
      authButton('Sign in with Apple',y,'Sign in with Apple',()=>void this.authAction('apple'),false,true);y-=119;
      authButton('Guest',y,'Continue as guest',()=>this.guestConsent());y-=109;
      text(panel,'Guest progress stays on this device.',0,y,840,62,31);y-=73;
    }
    authButton('Switch account form',y,register?'Already a member? Sign in':'New here? Create an account',()=>void this.navigate(register?'login':'register'));
    const links=box(this.content!,'Legal links',0,-this.top+164,980,110);
    ['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*312,0,298,86,t,undefined,()=>this.legal(['terms','privacy','support'][i] as LegalPage),1));
    outlined(text(this.content!,'Simulated casino · Virtual coins · No cash prizes',0,-this.top+70,1000,66,33,COLORS.cream));
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
    const panel=this.sheet('Updated harvest agreement',710);
    const close=panel.getChildByName('Close dialog');if(close)close.active=false;
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
    this.art.image(this.plane,cfg.id+'-tall',0,0,1536,3072);
    // Ambient light must render over the opaque integrated environment plate.
    // It shares the cabinet's coordinate plane with the reels and controls.
    const ambient=box(this.plane,'Cabinet reflections',0,0,1024,2304).addComponent(SalonAtmosphere);
    ambient.setup(this.art,1024,2304);ambient.cabinet(this.art,g);ambient.reducedMotion=this.reduced;
    
    const trimRect=g.screen,trimPoint=imagePoint(trimRect);
    const trim=ThemeFestivity.cabinet(this.plane,trimPoint[0],trimPoint[1],trimRect[2],trimRect[3],cfg.columns,this.reduced);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.playReelStop(column);ambient.land(column);trim.land(column);};
    const balance=imagePoint(g.balance);this.art.image(this.plane,'symbols',balance[0]-g.balance[2]*.39,balance[1],52,52,0);
    this.balanceLabel=text(this.plane,money(this.services.economy.balance()),balance[0]-4,balance[1],g.balance[2]*.66,g.balance[3],43,'#59351B');
    this.art.button(this.plane,'Recharge',balance[0]+g.balance[2]*.41,balance[1],65,67,'',8,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const win=imagePoint(g.win);this.winLabel=text(this.plane,'WIN  0',win[0],win[1],g.win[2],g.win[3],41,'#803F25');
    const winReadout=this.winLabel.node.getComponent(UITransform)!;winReadout.setContentSize(Math.min(winReadout.width,g.win[2]-2*Math.max(16,g.win[2]*.06)),winReadout.height);
    const themeIndex=GAME_CONFIGS.indexOf(cfg);
    
    const readoutInk=COLORS.cream;
    const readoutOutline=cfg.id==='jade-treasury'?'#071F19':'#36100A';
    const plateColors:Record<GameId,string>={
      'golden-hour':'#55300F','jade-treasury':'#06382D','pearl-palace':'#E8DDC9','ruby-revel':'#651725',
    };
    const display=(name:string,rect:Box,index:number):Node=>{
      const pos=imagePoint(rect),host=box(this.plane!,name,pos[0],pos[1],rect[2],rect[3]);
      return host;
    };
    const betPanel=display('BET display',g.bet,themeIndex*4);
    const betCaption=outlined(text(betPanel,'BET',-g.bet[2]*.30,0,g.bet[2]*.34,Math.max(52,g.bet[3]*.8),30,readoutInk),readoutOutline,3);
    betCaption.fontFamily='Arial Black';betCaption.enableWrapText=false;betCaption.overflow=Label.Overflow.SHRINK;
    this.betLabel=outlined(text(betPanel,money(this.bet),g.bet[2]*.19,0,g.bet[2]*.56,Math.max(64,g.bet[3]*.82),40,readoutInk),readoutOutline,3);
    this.betLabel.fontFamily='Arial Black';this.betLabel.enableWrapText=false;this.betLabel.overflow=Label.Overflow.SHRINK;
    const ctl=(rect:Box,label:string,index:number,action:()=>void):Node=>{
      const pos=imagePoint(rect);const hit=box(this.plane!,label,pos[0],pos[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset='harvest-button-'+(theme*4+[0,2,1,3][index]);
      const face=this.art.image(hit,asset,0,0,rect[2],rect[3]);
      bindPress(hit,face,()=>{this.audio.play('tap');action();},[
        {depth:5,compression:.97,release:.12,tilt:-3},
        {depth:7,compression:.985,release:.14,tilt:0},
        {depth:4,compression:.94,release:.23,tilt:2},
        {depth:4,compression:.96,release:.18,tilt:-2},
      ][theme]);return hit;
    };
    ctl(g.minus,'Decrease bet',2,()=>this.changeBet(-1));ctl(g.plus,'Increase bet',1,()=>this.changeBet(1));
    const spin=ctl(g.spin,'SPIN',0,()=>void this.spin());
    const auto=ctl(g.auto,'AUTO',3,()=>{this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');if(this.auto&&this.state.kind==='idle')void this.spin();});
    this.autoLamp=outlined(text(auto,'AUTO OFF',0,-Math.max(43,g.auto[3]*.64),Math.max(154,g.auto[2]*1.25),44,25,COLORS.cream),'#21150E',3);
    this.autoLamp.fontFamily='Arial Black';this.autoLamp.enableWrapText=false;this.autoLamp.overflow=Label.Overflow.SHRINK;this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const topPanel=display('TOP WIN display',g.topWin,themeIndex*4+1);
    const topCaption=outlined(text(topPanel,'TOP WIN',-g.topWin[2]*.20,-g.topWin[3]*.06,g.topWin[2]*.40,g.topWin[3]*.78,34,readoutInk),readoutOutline,3);
    topCaption.fontFamily='Arial Black';topCaption.enableWrapText=false;topCaption.overflow=Label.Overflow.SHRINK;
    this.topWinLabel=outlined(text(topPanel,topWinMoney(this.services.profile.current()?.biggestWin??0),g.topWin[2]*.23,-g.topWin[3]*.06,g.topWin[2]*.36,g.topWin[3]*.8,45,readoutInk),readoutOutline,3);
    this.topWinLabel.fontFamily='Arial Black';this.topWinLabel.enableWrapText=false;this.topWinLabel.overflow=Label.Overflow.SHRINK;
    // Money readouts reserve a full glyph line: TextFit's generic 1.22 line budget
    // previously compressed ordinary zero/bet values to 7px on narrow phones.
    for(const amount of [this.balanceLabel,this.betLabel,this.winLabel,this.topWinLabel]){
      if(!amount)continue;
      const fit=amount.node.getComponent('TextFit');if(fit)fit.enabled=false;
      const rect=amount.node.getComponent(UITransform)!;
      rect.setContentSize(rect.width,Math.max(64,rect.height));
      amount.fontFamily='Arial';amount.fontSize=48;amount.lineHeight=52;
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
    tool('Back to salon',-427,0,'BACK',()=>void this.navigate('home'));
    tool('Rules',290,7,'RULES',()=>this.rules());
    this.soundLamp=tool('Audio',436,6,'SOUND ON',()=>void this.toggleSound());this.updateSound();
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
        shade.fillColor=new Color(66,41,20,alpha);
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
    this.betIndex=next;if(this.betLabel)this.betLabel.string=money(this.bet);if(this.hintLabel)this.hintLabel.string=tr(`BET ${money(this.bet)} selected`);
  }
  private updateAuto():void{
    if(!this.autoLamp)return;this.autoLamp.string=tr(this.auto?'AUTO ON':'AUTO OFF');this.autoLamp.color=new Color(this.auto?'#72FF9F':COLORS.cream);
    Tween.stopAllByTarget(this.autoLamp.node);this.autoLamp.node.setScale(1,1,1);
    if(this.auto&&!this.reduced)tween(this.autoLamp.node).to(.55,{scale:new Vec3(1.08,1.08,1)},{easing:'sineInOut'}).to(.55,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).union().repeatForever().start();
  }
  private updateSound(enabled=this.services.profile.current()?.settings.sound??true):void{if(this.soundLamp){this.soundLamp.string=cabinetToolText(enabled?'SOUND ON':'SOUND OFF');this.soundLamp.color=new Color(enabled?'#FFF4D8':'#D8B79A');}}
  private async toggleSound():Promise<void>{
    const settings=this.services.profile.current()?.settings;if(!settings){this.toast('Sound settings are unavailable.');return;}
    const previous=settings.sound,next=!previous;this.audio.setEffects(next);this.updateSound(next);if(next)this.audio.play('tap');
    const saved=await this.services.profile.updateSettings({sound:next});
    if(!saved){this.audio.setEffects(previous);this.updateSound(previous);this.toast('Sound setting could not be saved.');return;}
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
    if(!complianceCurrent(this.services.save.read().compliance)){this.policyConsent();return;}
    if(this.page!=='game'||!this.reels||this.modal||this.busy)return;

    if(this.state.kind!=='idle'&&this.state.kind!=='retry')return;
    const requestId=this.state.kind==='retry'?this.state.requestId:SecureRNG.id('salon-spin');
    const api=this.services.api;
    const recovering=this.state.kind==='retry';
    const newcomer=!api&&!recovering?this.newcomerBenefit():undefined;
    if(api){try{this.journal.begin(requestId,this.config.id,this.bet);}catch{this.toast('Unable to save the round. Free device storage, then try again.');return;}}
    if(!api&&!this.services.economy.reserveSpin(requestId,this.bet)){this.auto=false;this.updateAuto();this.toast('Not enough coins. Visit Rewards or the Coin Shop.');return;}
    this.resetWinAmount();
    this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string='Treasures in motion…';
    let settled=false;
    try{
      let result:SpinResult;
      if(api){const response=await api.spin(this.config.id,this.bet,requestId);result=response.result;this.journal.settle(requestId,result,response.balance);}
      else {
        const forcedTier=this.force as 'big'|'super'|'mega'|'epic'|undefined;
        result=this.generator.generate(this.config,this.bet,this.rng,{winTier:forcedTier,newcomerSuper:!!newcomer?.guaranteeSuper});this.force=undefined;
        if(!this.services.economy.settleSpin(requestId,result.totalWin))throw new Error('Settlement failed');
      }
      settled=true;await this.reels.finish(result);
      this.state={kind:'presenting',result};this.reels.highlight(result.wins.flatMap(w=>[...w.positions]));
      await this.presentAwardEvidence(result);
      if(result.featureResult)await this.presentFeature(result);
      if(result.totalWin>0)await this.presentWin(result.totalWin,winTier(result.totalWin/this.bet)>0,result.wins.some(w=>w.symbolId==='newcomer-benefit'));
      this.resetWinAmount(result.totalWin);
      if(this.hintLabel){const next=!api?this.newcomerBenefit():undefined;const evidence=roundEvidence(result,this.bet);this.hintLabel.string=next?newcomerBenefitCaption(next.round)+'\n'+evidence:evidence;}
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
          const treasure=this.art.image(hit,'symbols',0,0,237,237,8);bindPress(hit,treasure,()=>reveal(i));
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
      if(this.hintLabel)this.hintLabel.string=round.caption??(feature.type==='ruby-cascade'?`TREASURE TUMBLE · ${round.multiplier}×`:feature.type==='jade-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`PEARL EXPANSION · ${round.index} OF ${feature.rounds.length}`);
      if(round.caption)await reels.transformTo(round.grid,round.focus);
      else if(feature.type==='ruby-cascade')await reels.collapseTo(round.grid,round.removed??[]);
      else{reels.begin();this.audio.play('spin');await reels.finishGrid(round.grid,true);}
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
      }}).call(()=>{if(label.isValid&&label===this.winLabel)this.writeWinAmount(amount,total);finish();}).start();
    });
  }
  private async presentWin(amount:number,big:boolean,welcomeBonus=false):Promise<void>{
    this.plane?.getComponentInChildren(ThemeFestivity)?.celebrate(winTier(amount/this.bet));
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
        this.audio.playWinFanfare(winTier(amount/this.bet));await stage.addComponent(SalonWinStage).setup(this.art,amount,this.height,this.reduced,amount/this.bet,GAME_CONFIGS.indexOf(this.config),welcomeBonus,(cue,progress)=>this.audio.playWinDetail(cue,progress,winTier(amount/this.bet)));
      }finally{
        this.audio.finishWinPresentation();
        fades.forEach((f,i)=>{if(f.node.isValid)tween(f.alpha).to(this.reduced?.01:.3,{opacity:prior[i]},{easing:'sineInOut'}).start();});
        if(this.modal===stage)this.closeModal();
      }
    }else{
      if(amount>this.presentedWin)this.audio.playSmallWinJingle();
      const stage=box(this.content!,'Ordinary win presentation',0,0,1080,this.height);
      const hidden=[this.hintLabel?.node,this.content?.getChildByName('Award hint material')].filter((n):n is Node=>!!n&&n.active);
      hidden.forEach(n=>n.active=false);
      try{
        await Promise.all([this.countWinAmount(amount),stage.addComponent(OrdinaryWinStage).setup(this.art,amount,Safe.visibleHeight,this.reduced,this.bet,{y:-Safe.visibleHeight/2+88+Safe.safeBottom,width:980})]);
      }finally{
        this.audio.finishWinPresentation();
        if(stage.isValid)stage.destroy();
        hidden.forEach(n=>{if(n.isValid)n.active=true;});
      }
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=money(this.services.economy.balance());}
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
  private storePage():void{
    const stage=this.pageStage("HARVEST MARKET"),stamp=this.generation;
    text(stage,"HARVEST MARKET",0,629,932,78,43,COLORS.ink,true);
    text(stage,this.services.remoteMode?'Choose a coin supply':'Preview · Purchases unavailable',0,547,907,47,27,COLORS.ink);
    const layout:number[][]=[[-237, 275, 442, 365], [237, 275, 442, 365], [-237, -153, 442, 365], [237, -153, 442, 365]];
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
    const stage=this.pageStage("SEVEN HARVESTS"),scope=this.services.save.currentScope(),today=new Date().toISOString().slice(0,10),progress=scope?.checkIn,claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);
    text(stage,"SEVEN HARVESTS",0,631,940,78,42,COLORS.ink,true);
    text(stage,tr('DAY '+(active+1))+' · '+tr(claimed?'COLLECTED':'READY TO CLAIM'),0,545,920,47,29,COLORS.ink);
    const spots:number[][]=[[-315, 373], [0, 373], [315, 373], [-315, 147], [0, 147], [315, 147], [0, -104]],thread=box(stage,'Seven day path',0,0,1020,1400).addComponent(Graphics);thread.strokeColor=new Color(175,128,60,90);thread.lineWidth=5;spots.forEach(([x,y],i)=>{if(i)thread.lineTo(x,y);else thread.moveTo(x,y);});thread.stroke();
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

  private async claim(kind:'daily'|'check-in'):Promise<void>{if(this.busy)return;this.busy=true;try{
    if(this.services.api){await this.services.api.claimReward(kind);const me=await this.services.api.me();this.services.economy.synchronizePurchasedBalance(me.player.credits,SecureRNG.id('reward-sync'));this.toast('Reward collected.');}
    else{const today=new Date().toISOString().slice(0,10);const ok=kind==='daily'?this.services.store.claimDaily(today):this.services.checkIn.claimToday(today).ok;this.toast(ok?'Your gift has been added to the wallet.':'Today’s gift has already been collected.');}
    this.refreshBalance();
  }catch{this.toast('Unable to collect. Please try again.');}finally{this.busy=false;}}
  private rankPage():void{
    this.title('Golden Honours','Total wins · Includes simulated competitors',3);const n=box(this.content!,'Honours ceremony',0,this.top-789,978,623);
    this.art.panel(n,0,-104,955,225,0);
    text(n,this.services.remoteMode?'VERIFIED ALL-TIME RANKING':'ON-DEVICE ALL-TIME RANKING',0,-43,900,76,39,COLORS.gold,true);
    const status=text(n,this.services.remoteMode?'Loading verified results…':'Total wins · Includes simulated competitors',0,-146,890,110,32);
    const stamp=this.generation;const render=(rows=this.services.rank.list('all-time',this.services.profile.current())):void=>{
      if(stamp!==this.generation)return;
      if(!rows.length){text(this.content!,'No settled wins yet.',0,this.top-1235,900,110,39,COLORS.cream);return;}
      const head=this.art.panel(this.content!,0,this.top-1127,974,70,0);
      text(head,'RANK',-367,0,150,48,25,COLORS.gold);text(head,'PLAYER',-90,0,360,48,25,COLORS.gold);text(head,'TOTAL WON',304,0,270,48,25,COLORS.gold);
      this.visibleRanks(rows,5).forEach((r,i)=>{
        const gap=Math.min(138,(this.height-1480)/5),rowH=gap-12;
        const row=this.art.panel(this.content!,0,this.top-1225-i*gap,974,rowH,r.current?3:1);
        text(row,'#'+r.rank,-382,0,118,80,34,r.current?COLORS.cream:COLORS.jade,true);
        this.art.image(row,'portraits',-278,0,Math.min(91,rowH-12),Math.min(91,rowH-12),r.avatar);
        text(row,r.nickname,-55,0,340,82,35,r.current?COLORS.cream:COLORS.jade);
        text(row,money(r.winnings),303,0,276,82,39,r.current?COLORS.cream:COLORS.ink,true);
      });
    };
    if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(rows=>{if(stamp!==this.generation)return;status.string='Server results · Updated now';render(rows);}).catch(()=>{if(stamp!==this.generation)return;status.string='Unable to load ranking. Tap Ranking to retry.';this.toast('Ranking unavailable. Try again later.');});else render();
  }
  private pageStage(name:string):Node{const available=this.height-520-Safe.safeTop-Safe.safeBottom,scale=Math.min(1,available/1400,(Safe.visibleWidth-60)/1020);const n=box(this.content!,name,0,(Safe.safeBottom-Safe.safeTop)/2,1020,1400);n.setScale(scale,scale,1);return n;}

  private languages():void{
    if(this.busy)return;const panel=this.sheet('Choose language',1010);
    LANGUAGES.forEach((entry,i)=>this.art.button(panel,'Locale '+entry.code,0,285-i*137,760,110,entry.name,undefined,()=>{setLanguage(entry.code);this.closeModal();this.render();},entry.code===language()?3:0));
    text(panel,'Saved on this device',0,-417,740,58,29,COLORS.cream);
  }
  private profilePage():void{
    const stage=this.pageStage("HARVEST JOURNAL"),p=this.services.profile.current();if(!p)return;
    const balance=this.services.economy.balance(),ledger=this.services.save.currentScope()?.transactions??[];
    text(stage,"HARVEST JOURNAL",0,622,928,82,42,COLORS.ink,true);
    const plate=(name:string,x:number,y:number,w:number,h:number):Node=>{const node=this.art.panel(stage,x,y,w,h,0);node.name=name;return node;};
    const stat=(x:number,y:number,w:number,h:number,label:string,value:number):void=>{const node=plate(label,x,y,w,h);text(node,label,0,h*.22,w*.8,39,25,COLORS.cream,true);const v=text(node,money(value),0,-h*.14,w*.8,61,39,COLORS.cream,true);v.enableWrapText=false;};
    const identity=(x:number,y:number,w:number,h:number):void=>{const node=plate('Editable identity',x,y,w,h),wide=w>600;
      const portrait=this.art.image(node,'portraits',wide?-w*.33:0,wide?0:h*.22,wide?164:126,wide?164:126,p.avatar);bindPress(portrait,portrait,()=>this.avatars());
      const tx=wide?w*.13:0,tw=wide?w*.57:w*.85;
      const name=text(node,p.nickname,tx,wide?54:-h*.055,tw,55,35,COLORS.cream,true);name.enableWrapText=false;bindPress(name.node,name.node,()=>this.editNickname());
      text(node,p.isGuest?'GUEST · LEVEL '+p.level:'MEMBER · LEVEL '+p.level,tx,wide?0:-h*.22,tw,37,23,COLORS.cream);
      this.art.button(node,'Edit nickname',tx,wide?-66:-h*.365,Math.min(tw,350),61,'Edit name',undefined,()=>this.editNickname(),0);
    };
    const activity=(x:number,y:number,w:number,h:number):void=>{const node=plate('Account activity',x,y,w,h);text(node,'COIN JOURNAL',0,h/2-47,w*.82,44,28,COLORS.cream,true);text(node,ledger.length+' recorded entries',0,h/2-97,w*.83,38,24,COLORS.cream);if(h>250)text(node,'Your settled activity is saved\nwith this account.',0,-2,w*.8,81,25,COLORS.cream);this.art.button(node,'Open coin history',0,-h/2+51,w*.78,65,'View history',undefined,()=>this.history(),0);};
    identity(-228,329,444,374);stat(241,437,428,153,'HARVEST RESERVE',balance);stat(241,226,428,153,'BEST HARVEST',p.biggestWin);stat(-228,10,444,151,'ROUNDS SOWN',p.gamesPlayed);stat(241,10,428,151,'TOTAL HARVEST',p.totalWin);activity(0,-259,918,300);
    const links:[string,()=>void][]=[['Language',()=>this.languages()],['Portrait',()=>this.avatars()],['Privacy',()=>this.legal('privacy')]];
    links.forEach(([label,action],i)=>this.art.button(stage,label,(i-(links.length-1)/2)*(910/links.length),-522,880/links.length,75,label,undefined,action,0));
    this.art.button(stage,'Sign out',-229,-626,429,77,'Sign out',undefined,()=>void this.signOut(),0);
    this.art.button(stage,'Delete account',229,-626,429,77,'Delete account',undefined,()=>this.deleteAccount(),0);
  }

  private async signOut():Promise<void>{
    if(this.busy)return;this.services.auth.logout();this.draft.password=this.draft.confirmPassword='';await this.navigate('login');
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


  private avatars():void{const s=this.sheet('Choose your portrait',1110);for(let i=0;i<16;i++){const n=this.art.image(s,'portraits',(i%4-1.5)*213,326-Math.floor(i/4)*222,189,189,i);bindPress(n,n,()=>void this.services.profile.setAvatar(i).then(ok=>{if(ok)this.render();else this.toast('Portrait could not be saved.');}));}}
  private history():void{const s=this.sheet('Your coin ledger',1190);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,394-i*132,840,115,1);text(n,r.type.replace(/-/g,' '),-178,0,425,90,31,COLORS.jade);text(n,(r.amount>0?'+':'')+money(r.amount),233,0,326,79,36,COLORS.ink);});if(!rows.length)text(s,'Your coin activity will appear here.',0,0,850,160,40);}
  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void {
    const panel=this.sheet('Mailbox',1110),items=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).deleted);
    text(panel,'Gifts and notices',0,377,750,55,31);
    items.forEach((m,i)=>{const state=this.services.mail.state(m.id),row=this.art.panel(panel,0,230-i*210,840,177,0);
      const icon=this.art.image(row,'interfaces',-293,0,94,94,state.read?5:2);
      text(row,m.title,45,24,540,48,31,COLORS.cream).enableWrapText=false;
      text(row,state.claimed?'Attachment collected':m.credits?money(m.credits)+' COINS':state.read?'Read':'Unread',45,-27,530,42,28,COLORS.cream);
      bindPress(row,icon,()=>this.openMail(m.id));row.name='Mail item '+m.id;
    });
    if(!items.length)text(panel,'Your mailbox is empty',0,90,740,110,39);
    this.art.button(panel,'Claim all mail',-200,-391,390,100,'Collect',14,()=>{if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}const amount=this.services.mail.claimAll();this.render();this.mail();this.toast(amount?money(amount)+' coins collected':'No attachments to collect');},0);
    this.art.button(panel,'Clear read mail',200,-391,390,100,'Clear',9,()=>{this.services.mail.deleteRead();this.render();this.mail();},0);
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
    const panel=this.art.panel(overlay,0,0,978,height,0);text(panel,title,-25,height/2-83,797,118,46,COLORS.gold,true);
    this.art.button(panel,'Close dialog',413,height/2-73,95,95,'',15,()=>this.closeModal());
    if(!this.reduced){
      const alpha=opacity(overlay,0);tween(alpha).to(.2,{opacity:255}).start();
      panel.setPosition(0,-28);tween(panel).to(.32,{position:new Vec3(0,0,0)},{easing:'cubicOut'}).start();
    }
    this.modal=overlay;return panel;
  }
  private closeModal():void{if(this.modal){this.modal.active=false;this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,0);text(n,message,0,0,916,144,36);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{this.cancelWinCount?.();game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
