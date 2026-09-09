import { _decorator, BlockInputEvents, Color, Component, EditBox, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SecureRNG } from '../core/SecureRNG';
import { AudioManager } from '../audio/AudioManager';
import { PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import { GAME_CONFIGS, SYMBOL_ART } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import type { GameConfig, GameId, SpinResult } from '../math/types';
import type { AuthResult } from '../services/AuthService';
import { ApiRequestError } from '../services/ProductionApiClient';
import { RemoteSpinJournal } from '../services/RemoteSpinJournal';
import { STORE_PRODUCTS } from '../services/StoreService';
import { SalonReels } from '../reels/SalonReels';
import { SalonAtmosphere } from '../vfx/SalonAtmosphere';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, outlined, COLORS } from './SalonArt';
import { CABINETS, imagePoint, cabinetLayout, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const MODES = ['One line. Three keys to the vault.', 'Lock gold. Keep the treasure.', '1,024 ways. A palace of pearls.', 'Clusters tumble. Multipliers grow.'];
const money=(n:number):string=>Math.floor(n).toLocaleString('en-US');
@ccclass('AureliaApp')
export class AureliaApp extends Component {
  private art=new SalonArt(); private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
  private balanceLabel?:Label;private betLabel?:Label;private winLabel?:Label;private hintLabel?:Label;
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
    text(loading,'AURELIA',0,90,950,160,80,COLORS.gold,true);
    const progress=text(loading,'Preparing your treasure salon…',0,-70,950,100,38);
    try{
      await this.art.load(['salon','symbols','interfaces','titles','portraits','exhibits','surfaces','ledgers','symbols-blur','celebration','optics'],(n,t)=>{
        progress.string=`Preparing treasures  ${Math.round(n/t*100)}%`;
        globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:n/t*.9}}));
      });
      const resumed=await this.services.resumeSession();
      if(this.debug&&!resumed){this.accept();await this.services.auth.guestLogin();}
      const requested=query.get('screen') as Page|null;
      this.config=GAME_CONFIGS.find(g=>g.id===query.get('game'))??GAME_CONFIGS[0];
      this.page=(resumed||this.debug)?(requested??'home'):'login';
      if(!['home','login','register','game','store','rewards','rank','profile'].includes(this.page))this.page='home';
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
    this.generation++;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.hintLabel=undefined;
    this.root?.destroy();this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Aurelia-interface',0,0,Safe.visibleWidth,this.height);this.root=root;
    this.bg=this.art.image(root,'salon',0,0,Safe.visibleWidth,this.height);
    const bgScale=Math.max(Safe.visibleWidth/1024,this.height/1536);this.bg.getComponent(UITransform)!.setContentSize(1024*bgScale,1536*bgScale);
    if(this.page!=='game'){const ambient=box(root,'Atmosphere',0,0,Safe.visibleWidth,this.height).addComponent(SalonAtmosphere);ambient.setup(this.art,Safe.visibleWidth,this.height);ambient.reducedMotion=this.reduced;}
    this.content=box(root,'Page',0,0,1080,this.height);
    if(this.page==='login'||this.page==='register')this.authPage();
    else if(this.page==='game')this.gamePage();
    else{this.header();if(this.page==='home')this.homePage();if(this.page==='store')this.storePage();if(this.page==='rewards')this.rewardsPage();if(this.page==='rank')this.rankPage();if(this.page==='profile')this.profilePage();this.navigation();}
    this.node.getChildByName('RotateDeviceOverlay')?.setSiblingIndex(this.node.children.length-1);
    const o=opacity(this.content,0);tween(o).to(this.reduced?.01:.28,{opacity:255},{easing:'sineOut'}).start();
  }
  private async navigate(page:Page,config?:GameConfig):Promise<void>{
    if(this.state.kind!=='idle'&&this.page==='game'){this.toast('Finish the current round before leaving.');return;}
    if(this.busy)return;this.busy=true;this.auto=false;
    try{
      if(config){this.config=config;const overlay=this.sheet('Opening '+config.name,570);this.art.image(overlay,'exhibits',0,-20,710,380,GAME_CONFIGS.indexOf(config));text(overlay,'Preparing cabinet & reels…',0,-238,780,62,35);await this.art.load([config.id+'-tall']);}
      if(this.content&&!this.reduced){tween(opacity(this.content,255)).to(.18,{opacity:0},{easing:'sineInOut'}).start();await this.delay(.18);}
      this.page=page;this.render();
    }catch{this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{this.busy=false;}
  }
  private header():void{
    const p=this.services.profile.current();const y=this.top-100-Safe.safeTop;
    const ledger=this.art.panel(this.content!,180,y,610,103,0);
    this.art.image(ledger,'symbols',-241,0,88,88,0);
    this.balanceLabel=text(ledger,money(this.services.economy.balance()),-5,0,362,72,49);
    this.art.button(ledger,'Top up',240,0,99,99,'',8,()=>void this.navigate('store'));
    const avatar=this.art.image(this.content!,'portraits',-440,y,112,112,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    this.art.button(this.content!,'Mail',-285,y,115,110,'',5,()=>this.mail());
  }
  private navigation():void{
    const nav=this.art.panel(this.content!,0,-this.top+104+Safe.safeBottom,1040,166,0);
    const pages:Page[]=['home','store','rewards','rank','profile'];const labels=['Salon','Coins','Rewards','Ranking','Account'];
    pages.forEach((page,i)=>{
      const button=box(nav,labels[i],(i-2)*203,0,196,150);
      const icon=this.art.image(button,'interfaces',0,21,96,96,i);
      text(button,labels[i],0,-47,190,43,34,page===this.page?COLORS.gold:COLORS.cream);
      bindPress(button,icon,()=>void this.navigate(page));
    });
  }
  private homePage():void{
    this.art.image(this.content!,'titles',0,this.top-287,865,280,0);
    outlined(text(this.content!,'Four treasures. Four ways to play.',0,this.top-444,930,48,34,COLORS.cream));
    const available=this.height-800;const base=this.top-483;
    const card=(i:number,x:number,y:number,w:number,h:number):void=>{
      const n=this.art.panel(this.content!,x,y,w,h,i===2?1:0);
      const narrow=w<600;
      const cover=this.art.cover(n,'exhibits',narrow?0:w*.23,narrow?h*.19:0,narrow?w-28:w*.52,narrow?h*.55:h-28,i);
      const copy=this.art.panel(n,narrow?0:-w*.245,narrow?-h*.255:0,narrow?w-26:w*.51,narrow?h*.47:h-27,i===3?2:0);
      this.art.image(copy,'titles',0,narrow?h*.075:h*.19,narrow?w-52:w*.46,narrow?h*.23:h*.40,i+1);
      text(copy,narrow?['','Lock coins · 20 lines','Expanding WILDs\n1,024 ways',''][i]:MODES[i],0,narrow?-h*.13:-h*.13,narrow?w-48:w*.44,narrow?h*.16:h*.25,narrow?30:33);
      if(!narrow)text(copy,'PLAY',0,-h*.35,w*.4,48,36,COLORS.gold);
      const glow=this.art.light(n,3,0,h*.42,w*.64,80,100);
      if(!this.reduced)tween(glow).by(3.2,{position:new Vec3(w*.12,0,0)},{easing:'sineInOut'}).by(3.2,{position:new Vec3(-w*.12,0,0)},{easing:'sineInOut'}).union().repeatForever().start();
      bindPress(n,cover,()=>void this.navigate('game',GAME_CONFIGS[i]));
    };
    const h1=available*.30,h2=available*.34,h3=available*.24;
    card(0,0,base-h1/2,980,h1);
    card(1,-250,base-h1-35-h2/2,480,h2);card(2,250,base-h1-35-h2/2,480,h2);
    card(3,0,base-h1-h2-70-h3/2,980,h3);
    outlined(text(this.content!,'Virtual coins only · No cash-out or real-world prizes',0,-this.top+242,1000,70,33,COLORS.cream));
  }
  private authPage():void{
    const register=this.page==='register';
    this.art.image(this.content!,'titles',0,this.top-340,935,400,0);
    text(this.content!,'A little sparkle. A world of treasure.',0,this.top-534,960,68,39,COLORS.jade,true);
    const panelH=1080;const panelY=-165;
    const panel=this.art.panel(this.content!,0,panelY,940,panelH,0);
    text(panel,register?'Create your account':'Welcome to the salon',0,panelH/2-84,845,88,48,COLORS.cream,true);
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
    this.art.button(panel,register?'Create account':'Sign in',0,y,778,111,register?'Create account':'Sign in',undefined,()=>void this.authAction(register?'register':'login'));y-=137;
    if(!register){
      this.art.button(panel,'Sign in with Apple',0,y,778,103,'Sign in with Apple',undefined,()=>void this.authAction('apple'),1);y-=120;
      this.art.button(panel,'Guest',0,y,778,94,'Continue as guest',undefined,()=>this.guestConsent(),0);y-=112;
      text(panel,'Guest progress stays on this device.',0,y,840,62,31);y-=73;
    }
    this.art.button(panel,'Switch account form',0,y,778,83,register?'Already a member? Sign in':'New here? Create an account',undefined,()=>void this.navigate(register?'login':'register'),0);
    const links=box(this.content!,'Legal links',0,-this.top+164,980,110);
    ['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*312,0,298,86,t,undefined,()=>this.legal(['terms','privacy','support'][i] as LegalPage),1));
    outlined(text(this.content!,'Simulated casino · Virtual coins · No cash prizes',0,-this.top+70,1000,66,33,COLORS.cream));
  }
  private field(parent:Node,placeholder:string,y:number,value:string,onChange:(v:string)=>void,password=false):EditBox{
    // Configure off-stage: EditBox onLoad otherwise creates default labels
    // and clears the existing material before our references are assigned.
    const n=this.art.panel(parent,0,y,778,103,1);n.active=false;const edit=n.addComponent(EditBox);
    edit.backgroundImage=this.art.frame('ledgers',1);
    const label=text(n,value,0,0,704,77,56,'#182F29');label.horizontalAlign=Label.HorizontalAlign.LEFT;label.isBold=true;
    const hint=text(n,placeholder,0,0,704,77,46,'#394339');hint.horizontalAlign=Label.HorizontalAlign.LEFT;
    // EditBox positions labels by their top-left corner, not their center.
    label.node.getComponent(UITransform)!.setAnchorPoint(0,1);hint.node.getComponent(UITransform)!.setAnchorPoint(0,1);
    edit.textLabel=label;edit.placeholderLabel=hint;edit.placeholder=placeholder;edit.inputMode=EditBox.InputMode.SINGLE_LINE;edit.maxLength=password?72:18;
    // Assigning labels while EditBox is still in its default multiline mode
    // changes vertical alignment to TOP. Single-line mode does not reset it.
    label.verticalAlign=hint.verticalAlign=Label.VerticalAlign.CENTER;
    label.lineHeight=64;hint.lineHeight=56;
    edit.inputFlag=password?EditBox.InputFlag.PASSWORD:EditBox.InputFlag.DEFAULT;edit.string=value;
    const save=()=>onChange(edit.string);
    n.on(EditBox.EventType.TEXT_CHANGED,save);
    n.on(EditBox.EventType.EDITING_DID_ENDED,save);
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
  private guestConsent():void{
    const s=this.sheet('Before you enter',650);
    text(s,'This is a simulated casino for eligible adults.\nCoins have no cash value and cannot be withdrawn.\n\nConfirm that you meet your region’s minimum age\nand accept the Terms and Privacy Policy.',0,20,820,330,36);
    this.art.button(s,'Confirm eligibility',0,-225,760,110,'I am eligible · Continue',14,()=>{this.accept();void this.services.auth.guestLogin().then(r=>{if(r.ok){this.page='home';this.render();}else this.toast(r.message??'Unable to enter.');});});
  }
  private gamePage():void{
    const cfg=this.config,g=CABINETS[cfg.id];
    this.plane=box(this.content!,'Cabinet-coordinate-plane',0,0,1024,2304);
    this.art.image(this.plane,cfg.id+'-tall',0,0,1024,2304);
    // Ambient light must render over the opaque integrated environment plate.
    // It shares the cabinet's coordinate plane with the reels and controls.
    const ambient=box(this.plane,'Cabinet reflections',0,0,1024,2304).addComponent(SalonAtmosphere);
    ambient.setup(this.art,1024,2304);ambient.cabinet(this.art,g);ambient.reducedMotion=this.reduced;
    const title=imagePoint(g.title);this.art.image(this.plane,'titles',title[0],title[1],g.title[2],g.title[3],g.titleIndex);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=()=>this.audio.play('reel-stop');
    const balance=imagePoint(g.balance);this.art.image(this.plane,'symbols',balance[0]-g.balance[2]*.39,balance[1],52,52,0);
    this.balanceLabel=text(this.plane,money(this.services.economy.balance()),balance[0]-4,balance[1],g.balance[2]*.66,g.balance[3],43,g.ink);
    this.art.button(this.plane,'Recharge',balance[0]+g.balance[2]*.41,balance[1],65,67,'',8,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const win=imagePoint(g.win);this.winLabel=outlined(text(this.plane,'WIN  0',win[0],win[1],g.win[2],g.win[3],41,COLORS.cream));
    const readoutStyle=cfg.id==='pearl-palace'?1:cfg.id==='ruby-revel'?2:0;
    const readoutInk=readoutStyle===1?COLORS.ink:COLORS.cream;
    const bet=imagePoint(g.bet);const betPanel=this.art.panel(this.plane,bet[0],bet[1],g.bet[2],g.bet[3],readoutStyle);
    this.betLabel=text(betPanel,'BET  '+money(this.bet),0,0,g.bet[2]-18,g.bet[3]-4,33,readoutInk);
    const ctl=(rect:Box,label:string,index:number,action:()=>void):Node=>{
      const pos=imagePoint(rect);const hit=box(this.plane!,label,pos[0],pos[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const icon=this.art.image(hit,'interfaces',0,0,rect[2]*.79,rect[3]*.79,index);bindPress(hit,icon,action);return hit;
    };
    ctl(g.minus,'Decrease bet',9,()=>this.changeBet(-1));ctl(g.plus,'Increase bet',8,()=>this.changeBet(1));
    const spin=ctl(g.spin,'SPIN',12,()=>void this.spin());outlined(text(spin,'SPIN',0,-g.spin[3]*.34,g.spin[2],49,34,COLORS.cream),'#513315',2);
    const auto=ctl(g.auto,'AUTO',10,()=>{this.auto=!this.auto;this.updateAuto();if(this.auto&&this.state.kind==='idle')void this.spin();});
    this.autoLamp=outlined(text(auto,'OFF',g.auto[2]*.34,g.auto[3]*.33,76,43,26,COLORS.cream));this.updateAuto();
    if(cfg.id==='pearl-palace'){
      auto.getChildByName('interfaces')?.setPosition(-g.auto[2]*.28,0);
      text(auto,'AUTO',g.auto[2]*.16,0,g.auto[2]*.62,47,30,COLORS.ink);
    }else outlined(text(auto,'AUTO',0,-g.auto[3]*.44,g.auto[2]+25,43,29,COLORS.cream));
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const topWin=imagePoint(g.topWin),topPanel=this.art.panel(this.plane,topWin[0],topWin[1],g.topWin[2],g.topWin[3],readoutStyle);
    this.art.image(topPanel,'titles',-g.topWin[2]*.25,0,g.topWin[2]*.48,g.topWin[3]*.92,5);text(topPanel,money(this.services.profile.current()?.biggestWin??0),g.topWin[2]*.24,0,g.topWin[2]*.46,g.topWin[3]*.8,38,readoutInk);
    const toolbar=box(this.content!,'Safe top tools',0,this.top-77-Safe.safeTop,1000,130);
    this.art.button(toolbar,'Back to salon',-427,0,127,115,'',0,()=>void this.navigate('home'));
    this.art.button(toolbar,'Rules',290,0,126,115,'',7,()=>this.rules());
    this.art.button(toolbar,'Audio',436,0,126,115,'',6,()=>{const settings=this.services.profile.current()?.settings;if(settings){this.audio.setEffects(!settings.sound);void this.services.profile.updateSettings({sound:!settings.sound});}this.toast(settings?.sound?'Sound off':'Sound on');});
    this.hintLabel=outlined(text(this.content!,MODES[GAME_CONFIGS.indexOf(cfg)],0,-this.top+88+Safe.safeBottom,980,110,38,COLORS.cream));
    this.layoutPlane();
    if(this.force){this.scheduleOnce(()=>void this.spin(),1);}
  }
  private layoutPlane():void{
    if(!this.plane)return;const h=Safe.visibleHeight;
    const layout=cabinetLayout(Safe.visibleWidth,h,CABINETS[this.config.id],Safe.safeTop,Safe.safeBottom);
    this.plane.setScale(layout.scale,layout.scale,1);this.plane.setPosition(0,layout.y);
    if(this.bg){const s=Math.max(Safe.visibleWidth/1024,h/1536);this.bg.getComponent(UITransform)!.setContentSize(1024*s,1536*s);}
    this.content?.getChildByName('Safe top tools')?.setPosition(0,h/2-77-Safe.safeTop);
    this.hintLabel?.node.setPosition(0,-h/2+88+Safe.safeBottom);
  }
  private get bet():number{return this.config.bets[this.betIndex];}
  private changeBet(delta:number):void{if(this.state.kind!=='idle')return;this.betIndex=Math.max(0,Math.min(this.config.bets.length-1,this.betIndex+delta));if(this.betLabel)this.betLabel.string='BET  '+money(this.bet);}
  private updateAuto():void{if(this.autoLamp){this.autoLamp.string=this.auto?'ON':'OFF';this.autoLamp.color=new Color(this.auto?'#61FF94':'#FFF4D8');}}
  private async spin():Promise<void>{
    if(this.page!=='game'||!this.reels||this.modal||this.busy)return;

    if(this.state.kind!=='idle'&&this.state.kind!=='retry')return;
    const requestId=this.state.kind==='retry'?this.state.requestId:SecureRNG.id('salon-spin');
    const api=this.services.api;
    const recovering=this.state.kind==='retry';
    if(api){try{this.journal.begin(requestId,this.config.id,this.bet);}catch{this.toast('Unable to save the round. Free device storage, then try again.');return;}}
    if(!api&&!this.services.economy.reserveSpin(requestId,this.bet)){this.auto=false;this.updateAuto();this.toast('Not enough coins. Visit Rewards or the Coin Shop.');return;}
    this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string='Treasures in motion…';
    let settled=false;
    try{
      let result:SpinResult;
      if(api){const response=await api.spin(this.config.id,this.bet,requestId);result=response.result;this.journal.settle(requestId,result,response.balance);}
      else {
        result=this.generator.generate(this.config,this.bet,this.rng,this.force?{winTier:this.force as 'big'|'mega'|'epic'}:undefined);this.force=undefined;
        if(!this.services.economy.settleSpin(requestId,result.totalWin))throw new Error('Settlement failed');
      }
      settled=true;await this.reels.finish(result);
      this.state={kind:'presenting',result};this.reels.highlight(result.wins.flatMap(w=>[...w.positions]));
      if(result.featureResult)await this.presentFeature(result);
      if(result.totalWin>0)await this.presentWin(result.totalWin,result.totalWin/this.bet>=20);
      if(this.winLabel)this.winLabel.string='WIN  '+money(result.totalWin);
      if(this.hintLabel)this.hintLabel.string=result.totalWin>0?'Treasure added to your wallet.':MODES[GAME_CONFIGS.indexOf(this.config)];
      this.state={kind:'idle'};this.refreshBalance();this.autoWait=.8;
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
      if(this.hintLabel)this.hintLabel.string=feature.type==='ruby-cascade'?`TREASURE TUMBLE · ${round.multiplier}×`:feature.type==='jade-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`PEARL EXPANSION · ${round.index} OF ${feature.rounds.length}`;
      if(feature.type==='ruby-cascade')await reels.collapseTo(round.grid,round.removed??[]);
      else{reels.begin();this.audio.play('spin');await reels.finishGrid(round.grid,true);}
      if(round.locked)reels.lockCoins(round.locked);
      if(round.expandedColumn!==undefined)await reels.expandColumn(round.expandedColumn);
      reels.highlight(round.wins.flatMap(w=>[...w.positions]));
      cumulative+=round.credits;if(this.winLabel)this.winLabel.string='WIN  '+money(cumulative);
      if(round.credits>0)this.audio.play('win');
      await this.delay(round.credits>0?.62:.22);
    }
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
        this.audio.play('reward');await stage.addComponent(SalonWinStage).setup(this.art,amount,this.height,this.reduced);
      }finally{
        fades.forEach((f,i)=>{if(f.node.isValid)tween(f.alpha).to(this.reduced?.01:.3,{opacity:prior[i]},{easing:'sineInOut'}).start();});
        if(this.modal===stage)this.closeModal();
      }
    }else{const v={n:0};tween(v).to(.8,{n:amount},{easing:'expoOut',onUpdate:()=>{if(this.winLabel)this.winLabel.string='WIN  '+money(v.n);}}).start();await this.delay(.9);}
  }
  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=money(this.services.economy.balance());}
  private delay(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,this.reduced?Math.min(.12,seconds):seconds));}
  protected update(dt:number):void{if(this.auto&&this.visible&&this.state.kind==='idle'&&this.page==='game'&&!this.modal){this.autoWait-=dt;if(this.autoWait<=0){this.autoWait=1;void this.spin();}}}
  private hide():void{this.visible=false;this.auto=false;this.updateAuto();}
  private show():void{this.visible=true;}
  private title(value:string,sub:string,icon:number):void{
    this.art.image(this.content!,'interfaces',-368,this.top-306,185,185,icon);
    text(this.content!,value,88,this.top-280,700,108,62,COLORS.jade,true);text(this.content!,sub,65,this.top-370,742,76,34,COLORS.jade);
  }
  private storePage():void{
    this.title('The Coin Atelier','Treasures for every visit',1);const stamp=this.generation;
    const note=text(this.content!,this.services.remoteMode?'Prices are supplied by Apple.':'Preview mode · Purchases unavailable',0,this.top-474,980,79,33,COLORS.jade);
    void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;items.forEach((item,i)=>{
      const n=this.art.panel(this.content!,0,this.top-655-i*240,980,218,i%2?2:0);
      this.art.image(n,'symbols',-354,10,188,188,[9,1,5,8][i]);
      text(n,money(item.credits+item.bonus),-27,37,433,75,55,COLORS.cream,true);
      text(n,item.label,-12,-39,474,60,28);
      this.art.button(n,'Buy '+item.id,330,0,245,110,item.available?item.displayPrice:'Unavailable',undefined,()=>void this.purchase(item.id));
    });});
    this.art.button(this.content!,'Synchronize purchases',0,-this.top+394,920,105,'Sync unfinished purchases',undefined,()=>void this.services.store.restore().then(r=>{this.refreshBalance();this.toast(r.message);}),1);
    outlined(text(this.content!,'Consumable virtual coins. No cash value. No cash-out.',0,-this.top+278,950,68,33,COLORS.cream));
  }
  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}finally{this.busy=false;}}
  private rewardsPage():void{
    this.title('Gifts from the Salon','Your daily treasures, in one place',2);
    const n=this.art.panel(this.content!,0,this.top-790,975,620,2);
    this.art.image(n,'exhibits',0,70,935,450,3);
    const ledger=this.art.panel(n,0,-109,871,229,0);text(ledger,'DAILY TREASURE',0,54,800,60,41,COLORS.gold,true);text(ledger,'5,000 complimentary coins',0,-5,800,66,41);
    this.art.button(n,'Claim daily',0,-231,700,102,'Claim your daily gift',2,()=>void this.claim('daily'));
    const check=this.art.panel(this.content!,0,this.top-1325,975,330,1);
    text(check,'The seven-visit collection',0,88,900,85,43,COLORS.jade,true);text(check,'Visit daily for a growing coin gift.\nYour next gift is saved to your account.',0,-3,863,114,36,COLORS.ink);
    this.art.button(check,'Check in',0,-106,701,90,'Collect today’s check-in',14,()=>void this.claim('check-in'));
    outlined(text(this.content!,'Rewards follow your wallet across all four games.',0,-this.top+283,950,94,34,COLORS.cream));
  }
  private async claim(kind:'daily'|'check-in'):Promise<void>{if(this.busy)return;this.busy=true;try{
    if(this.services.api){await this.services.api.claimReward(kind);const me=await this.services.api.me();this.services.economy.synchronizePurchasedBalance(me.player.credits,SecureRNG.id('reward-sync'));this.toast('Reward collected.');}
    else{const today=new Date().toISOString().slice(0,10);const ok=kind==='daily'?this.services.store.claimDaily(today):this.services.checkIn.claimToday(today).ok;this.toast(ok?'Your gift has been added to the wallet.':'Today’s gift has already been collected.');}
    this.refreshBalance();
  }catch{this.toast('Unable to collect. Please try again.');}finally{this.busy=false;}}
  private rankPage():void{
    this.title('The Winners’ Gallery','Ranked by total coins won',3);const n=this.art.panel(this.content!,0,this.top-789,978,623,0);
    this.art.image(n,'interfaces',0,127,268,270,3);text(n,'ALL-TIME WINNINGS',0,-46,860,76,42,COLORS.gold,true);
    text(n,this.services.remoteMode?'Loading verified rankings…':'On-device record · Not a live global leaderboard',0,-150,890,134,35);
    const stamp=this.generation;const render=():void=>{if(stamp!==this.generation)return;const rows=this.services.rank.list('all-time',this.services.profile.current());
      rows.slice(0,4).forEach((r,i)=>{const row=this.art.panel(this.content!,0,this.top-1201-i*148,974,129,1);this.art.image(row,'portraits',-374,0,103,103,r.avatar);text(row,r.nickname,-101,0,384,90,39,COLORS.jade);text(row,money(r.winnings),276,0,340,84,43,COLORS.ink,true);});
    };if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Ranking unavailable. Try again later.'));else render();
  }
  private profilePage():void{
    this.title('Your Salon Passport','One account. One shared treasure wallet.',4);const p=this.services.profile.current();if(!p)return;
    const passport=this.art.panel(this.content!,0,this.top-746,980,574,0);
    const avatar=this.art.image(passport,'portraits',-281,90,236,236,p.avatar);bindPress(avatar,avatar,()=>this.avatars());
    text(passport,p.nickname,124,155,548,85,48,COLORS.cream,true);text(passport,p.isGuest?'Guest · On-device progress':'Member account',129,73,564,72,33);
    this.art.button(passport,'Change avatar',125,-22,517,89,'Choose portrait',4,()=>this.avatars(),1);
    text(passport,'TOTAL WON',-225,-148,432,64,33,COLORS.gold);text(passport,'BEST WIN',230,-148,420,64,33,COLORS.gold);
    text(passport,money(p.totalWin),-225,-208,431,66,44);text(passport,money(p.biggestWin),230,-208,420,66,44);
    const links:[string,number,()=>void][]=[['Wallet history',1,()=>this.history()],['Terms, privacy & help',7,()=>this.legal('privacy')],['Sign out',4,()=>{this.services.auth.logout();this.page='login';this.render();}],['Delete account & data',13,()=>this.deleteAccount()]];
    links.forEach(([name,i,action],k)=>this.art.button(this.content!,name,0,this.top-1126-k*132,965,113,name,i,action,k===3?2:1));
  }
  private avatars():void{const s=this.sheet('Choose your portrait',1110);for(let i=0;i<16;i++){const n=this.art.image(s,'portraits',(i%4-1.5)*213,326-Math.floor(i/4)*222,189,189,i);bindPress(n,n,()=>void this.services.profile.setAvatar(i).then(ok=>{if(ok)this.render();else this.toast('Portrait could not be saved.');}));}}
  private history():void{const s=this.sheet('Your coin ledger',1190);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,394-i*132,840,115,1);text(n,r.type.replace(/-/g,' '),-178,0,425,90,31,COLORS.jade);text(n,(r.amount>0?'+':'')+money(r.amount),233,0,326,79,36,COLORS.ink);});if(!rows.length)text(s,'Your coin activity will appear here.',0,0,850,160,40);}
  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void{const s=this.sheet('Your invitations',590);this.art.image(s,'interfaces',0,97,225,175,5);text(s,'Welcome to Aurelia. Your daily gifts\nare waiting in Rewards.',0,-55,820,158,41);this.art.button(s,'Open rewards',0,-200,690,106,'Visit Rewards',2,()=>{this.closeModal();void this.navigate('rewards');});}
  private rules():void{
    this.auto=false;this.updateAuto();const s=this.sheet(this.config.name+' · Rules',1350);
    const descriptions:Record<GameId,string>={
      'golden-hour':'Three reels · Three rows · One centre payline.\nMatching symbols pay left to right on the centre line.\nThree safes anywhere reveal a predetermined vault prize.',
      'jade-treasury':'Five reels · Three rows · Twenty fixed paylines.\nSix gold coins trigger three-life lock-and-respin.\nNew coins reset the lives. Full screen adds a bonus.',
      'pearl-palace':'Five reels · Four rows · 1,024 ways.\nThree safes trigger five bonus spins.\nOne column expands to WILD during each bonus spin.',
      'ruby-revel':'Five by five · Connected treasure clusters.\nFive or more matching neighbours pay; diagonals do not.\nWinning clusters collapse, refill and raise the multiplier.',
    };
    text(s,descriptions[this.config.id],0,424,865,293,35);
    const symbols=this.config.symbols.filter(v=>v.tier!=='wild'&&v.tier!=='scatter'&&v.tier!=='bonus').slice(0,6);
    symbols.forEach((sym,i)=>{const y=206-i*96;this.art.image(s,'symbols',-346,y,83,83,SYMBOL_ART[sym.id]);const pay=this.config.paytable[sym.id];text(s,sym.label,-141,y,308,69,29);text(s,Object.entries(pay??{}).map(([n,v])=>`${n}: ${v}×`).join(' · '),177,y,488,81,27);});
    text(s,'Values above are raw paytable factors. Payout scale and\nline/ways divisors apply; all awards use whole coins.\nVirtual coins only. No cash-out. Take regular breaks.',0,-512,890,161,31);
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
    this.modal=overlay;return panel;
  }
  private closeModal():void{if(this.modal){this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,0);text(n,message,0,0,916,144,36);this.notification=n;
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
