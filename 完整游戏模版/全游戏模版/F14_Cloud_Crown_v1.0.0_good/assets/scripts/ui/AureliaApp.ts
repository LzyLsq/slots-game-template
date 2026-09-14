import { INBOX_MESSAGES } from '../services/MailService';
import { _decorator, BlockInputEvents, Color, Component, EditBox, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SecureRNG } from '../core/SecureRNG';
import { AudioManager } from '../audio/AudioManager';
import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
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
const MODES = ['One line. Three holds of treasure.', 'Lock gold. Keep the treasure.', '1,024 ways. Next stop: treasure.', 'Clusters tumble. Multipliers grow.'];
const money=(n:number):string=>Math.floor(n).toLocaleString('en-US');
@ccclass('AureliaApp')
export class AureliaApp extends Component {
  private art=new SalonArt(); private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private authExpanded=false;private selectedRoute=0;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
  private balanceLabel?:Label;private betLabel?:Label;private winLabel?:Label;private topWinLabel?:Label;private hintLabel?:Label;
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
    text(loading,'CLOUD CROWN',0,90,950,160,80,COLORS.gold,true);
    const progress=text(loading,'Preparing your sky passage…',0,-70,950,100,38);
    try{
      await this.art.load(['salon','symbols','interfaces','portraits','symbols-blur','celebration','admiral-compass','optics','apple-mark','harvest-brand',...Array.from({length:16},(_,i)=>'harvest-button-'+i),'harvest-hall-soft',...Array.from({length:4},(_,i)=>'harvest-soft-plate-'+i),'harvest-rank','harvest-profile','harvest-rewards','harvest-store',...Array.from({length:4},(_,i)=>'harvest-card-'+i)],(n,t)=>{
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
    }catch(error){progress.string='Could not open the port. Tap to retry.';loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
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
    this.balanceLabel=this.betLabel=this.winLabel=this.topWinLabel=this.hintLabel=this.autoLamp=this.soundLamp=undefined;
    this.root?.destroy();this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Cloud-Crown-interface',0,0,Safe.visibleWidth,this.height);this.root=root;
    const backdrop=this.page==='home'?'harvest-hall-soft':this.page==='rank'?'harvest-rank':this.page==='profile'?'harvest-profile':this.page==='rewards'?'harvest-rewards':this.page==='store'?'harvest-store':'salon';
    this.bg=this.page==='game'||this.page==='home'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);

    if(this.page!=='game'){const ambient=box(root,'Atmosphere',0,0,Safe.visibleWidth,this.height).addComponent(SalonAtmosphere);ambient.setup(this.art,Safe.visibleWidth,this.height,false,this.page==='login'||this.page==='register'?30:18);ambient.reducedMotion=this.reduced;}
    this.content=box(root,'Page',0,0,1080,this.height);
    if(this.page==='login'||this.page==='register')this.authPage();
    else if(this.page==='game')this.gamePage();
    else{this.header();if(this.page==='home')this.homePage();if(this.page==='store')this.storePage();if(this.page==='rewards')this.rewardsPage();if(this.page==='rank')this.rankPage();if(this.page==='profile')this.profilePage();this.navigation();}
    if(this.page!=='login'&&this.page!=='register'&&!complianceCurrent(this.services.save.read().compliance))this.policyConsent();
    this.node.getChildByName('RotateDeviceOverlay')?.setSiblingIndex(this.node.children.length-1);
    const o=opacity(this.content,0);tween(o).to(this.reduced?.01:.28,{opacity:255},{easing:'sineOut'}).start();
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
    const p=this.services.profile.current(),y=this.top-92-Safe.safeTop;
    const wallet=this.art.panel(this.content!,-235,y,525,107,0);
    this.art.image(wallet,'symbols',-194,0,70,70,0);
    this.balanceLabel=text(wallet,money(this.services.economy.balance()),-4,0,298,76,46,COLORS.cream);
    this.art.button(wallet,'Top up',202,0,82,82,'',8,()=>void this.navigate('store'));
    const mailboxButton=this.art.button(this.content!,'Mail',95,y,87,87,'',5,()=>this.mail());const unreadMail=INBOX_MESSAGES.filter(m=>{const state=this.services.mail.state(m.id);return !state.read&&!state.deleted;}).length;if(unreadMail)text(mailboxButton,String(unreadMail),33,33,40,40,27,COLORS.cream,true);
    const avatar=this.art.image(this.content!,'portraits',431,y,109,109,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    outlined(text(this.content!,p?.nickname??'Captain',266,y,208,69,27,COLORS.cream),'#173F49',2);
  }
  private navigation():void{
    const nav=this.art.panel(this.content!,0,-this.top+96+Safe.safeBottom,1050,147,0);
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Cargo','Voyage','Port','Glory','Passport'],icons=[1,2,0,3,4];
    pages.forEach((page,i)=>{
      const center=i===2,active=page===this.page;
      const hit=box(nav,labels[i],(i-2)*205,center?18:0,190,150);
      if(active)this.art.light(hit,1,0,21,155,140,90).setSiblingIndex(0);
      const icon=this.art.image(hit,'interfaces',0,center?23:16,center?135:86,center?123:86,icons[i]);
      text(hit,labels[i],0,center?-54:-40,183,44,26,active?COLORS.gold:COLORS.cream);
      bindPress(hit,icon,()=>void this.navigate(page));
    });
  }
  private metalEdges(parent:Node,w:number,h:number,phase:number):void{
    const fx=box(parent,'Gilded reflection',0,0,w,h).addComponent(SalonAtmosphere);
    fx.metalFrame(this.art,w,h,phase);fx.reducedMotion=this.reduced;
  }
  private pageStage(name:string):Node{
    const available=this.height-520-Safe.safeTop-Safe.safeBottom,scale=Math.min(1.1,available/1400);
    const n=box(this.content!,name,0,(Safe.safeBottom-Safe.safeTop)/2,1020,1400);n.setScale(scale,scale,1);return n;
  }
  private homePage():void{
    const world=box(this.root!,'Living treasure archipelago',0,0,1000,2000);world.setSiblingIndex(0);
    const scale=Math.max(Safe.visibleWidth/1000,this.height/2000);world.setScale(scale,scale,1);
    this.art.image(world,'harvest-hall-soft',0,0,1000,2000);
    // Coordinates are measured on the continuous world illustration, not on separate cards.
    const ports=[[-197,413],[260,81],[-231,-267],[192,-593]];
    GAME_CONFIGS.forEach((cfg,i)=>{
      const [x,y]=ports[i],hit=box(world,'Board '+cfg.name,x,y+65,360,290);
      const name=text(world,['ADMIRAL','PEARL','EXPRESS','CAROUSEL'][i],x,y,i===3?184:215,48,31,COLORS.ink,true);
      name.enableWrapText=false;name.overflow=Label.Overflow.SHRINK;name.node.angle=[2,-5,2,-6][i];
      const rim=box(world,'Destination brass reflections',x,y,215,48);rim.angle=[2,-5,2,-6][i];
      const reflection=rim.addComponent(SalonAtmosphere);reflection.reducedMotion=this.reduced;reflection.metalFrame(this.art,i===3?184:215,48,i*.9);
      const marker=this.art.light(world,3,x+135,y+60,48,48,150);

      if(!this.reduced)tween(marker).to(1.8,{scale:new Vec3(1.2,1.2,1),angle:35}).to(1.8,{scale:new Vec3(.8,.8,1),angle:0}).union().repeatForever().start();
      const enter=this.art.panel(world,x,y-74,223,78,0);enter.name='Play '+cfg.name;
      this.art.image(enter,'harvest-card-'+i,-71,0,65,58);
      text(enter,'PLAY',30,0,132,61,35,COLORS.cream);
      bindPress(enter,enter,()=>void this.navigate('game',cfg));
      if(!this.reduced){
        const clip=box(enter,'Entry sheen',0,0,200,58);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
        const beam=this.art.light(clip,2,-170,0,95,105,80);
        tween(beam).delay(i*.8).to(1.7,{position:new Vec3(170,0,0)}).delay(3.4).set({position:new Vec3(-170,0,0)}).union().repeatForever().start();
        tween(enter).delay(i*.3).to(1.8,{scale:new Vec3(1.035,1.035,1)},{easing:'sineInOut'}).to(1.8,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).union().repeatForever().start();
      }
      bindPress(hit,marker,()=>void this.navigate('game',cfg));
    });
    const brand=this.art.image(this.content!,'harvest-brand',70,this.top-219,440,185);brand.name='Floating hall brand';
    if(!this.reduced){tween(brand).by(3.2,{position:new Vec3(0,12,0)},{easing:'sineInOut'}).by(3.2,{position:new Vec3(0,-12,0)},{easing:'sineInOut'}).union().repeatForever().start();this.sheen(brand,420,160,.6);}
    outlined(text(this.content!,'TAP PLAY TO ENTER A DESTINATION',0,-this.top+230+Safe.safeBottom,970,65,32,COLORS.cream),'#153C45',3);
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
  private authPage():void{
    this.authDecor();
    if(this.page==='register'||this.authExpanded){this.authFormPage();return;}
    const mark=this.art.image(this.content!,'harvest-brand',0,this.top-228,690,300);
    if(!this.reduced)tween(mark).by(3.8,{position:new Vec3(0,9,0)},{easing:'sineInOut'}).by(3.8,{position:new Vec3(0,-9,0)},{easing:'sineInOut'}).union().repeatForever().start();
    outlined(text(this.content!,'WELCOME ABOARD',0,-this.top+815,955,95,55,COLORS.cream,true),'#153C45',3);
    text(this.content!,'Sign in and continue your treasure voyage.',0,-this.top+735,940,66,34,COLORS.cream);
    const primary=this.art.button(this.content!,'Captain sign in',0,-this.top+591,890,148,'SIGN IN & SAIL',4,()=>{this.authExpanded=true;this.render();},3);this.sheen(primary,865,125);this.reveal(primary);
    const rim=this.art.light(this.content!,1,0,-this.top+591,970,175,48);rim.setSiblingIndex(primary.getSiblingIndex());if(!this.reduced)tween(opacity(rim,48)).to(1.8,{opacity:110},{easing:'sineInOut'}).to(1.8,{opacity:48},{easing:'sineInOut'}).union().repeatForever().start();
    const apple=this.art.panel(this.content!,0,-this.top+428,850,120,1);apple.name='Sign in with Apple';
    this.art.image(apple,'apple-mark',-211,0,45,53);text(apple,'Sign in with Apple',46,0,493,83,42,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));
    this.art.button(this.content!,'Guest',-219,-this.top+276,412,110,'Guest play',0,()=>this.guestConsent(),0);
    this.art.button(this.content!,'Create passport',219,-this.top+276,412,110,'Register',13,()=>void this.navigate('register'),0);
    const links=box(this.content!,'Legal links',0,-this.top+154,990,82);
    ['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*320,0,305,77,t,7,()=>this.legal(['terms','privacy','support'][i] as LegalPage),0));
    text(this.content!,'Virtual coins · No cash prizes · Eligible adults only',0,-this.top+66,1000,59,27,COLORS.cream);
    for(const [name,size] of [['Guest',35],['Captain sign in',48],['Create passport',35]] as const){for(const label of this.content!.getChildByName(name)?.getComponentsInChildren(Label)??[]){label.fontSize=size;label.lineHeight=size*1.2;}}
  }
  private authFormPage():void{
    const register=this.page==='register';
    this.art.button(this.content!,'Back to boarding',-429,this.top-468,106,96,'',9,()=>{this.authExpanded=false;if(register)void this.navigate('login');else this.render();});
    const logo=this.art.image(this.content!,'harvest-brand',0,this.top-260,780,335);
    if(!this.reduced)tween(logo).by(4,{position:new Vec3(0,12,0)},{easing:'sineInOut'}).by(4,{position:new Vec3(0,-12,0)},{easing:'sineInOut'}).union().repeatForever().start();
    const panel=this.art.panel(this.content!,0,this.top-1090,942,1110,0);
    const fx=box(panel,'Boarding ticket shimmer',0,0,900,1080).addComponent(SalonAtmosphere);fx.authFrame(this.art,900,1080);fx.reducedMotion=this.reduced;
    text(panel,register?'YOUR CAPTAIN’S PASSPORT':'WELCOME ABOARD',0,455,845,88,47,COLORS.gold,true);
    text(panel,register?'A new voyage begins here':'Your treasure voyage is ready',0,384,830,60,31);
    this.field(panel,'Username',270,this.draft.username,v=>this.draft.username=v);
    this.field(panel,'Password · 10–72 characters',140,this.draft.password,v=>this.draft.password=v,true);
    if(register){
      this.field(panel,'Confirm password',10,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);
      this.field(panel,'Nickname',-120,this.draft.nickname,v=>this.draft.nickname=v);
      const check=this.art.button(panel,'Accept terms',-334,-234,92,92,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1);const mark=opacity(check,this.draft.acceptedTerms?255:65);
      text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',60,-232,650,86,29);
      this.art.button(panel,'Create account',0,-359,778,106,'CREATE PASSPORT',4,()=>void this.authAction('register'),3);
      this.art.button(panel,'Switch account form',0,-482,778,86,'Already a member? Sign in',undefined,()=>{this.authExpanded=true;void this.navigate('login');},1);
    }else{
      const signin=this.art.button(panel,'Sign in',0,-12,800,122,'SIGN IN & SAIL',4,()=>void this.authAction('login'),3);this.sheen(signin,778,105);for(const l of signin.getComponentsInChildren(Label)){l.fontSize=43;l.lineHeight=51;}
      const apple=this.art.panel(panel,0,-157,778,106,1);this.art.image(apple,'apple-mark',-217,0,44,51);text(apple,'Sign in with Apple',45,0,495,80,37,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));apple.name='Sign in with Apple';
      this.art.button(panel,'Guest',0,-286,778,106,'Explore as guest',0,()=>this.guestConsent(),1);
      text(panel,'Guest progress stays on this device.',0,-375,790,54,28);
      this.art.button(panel,'Switch account form',0,-469,778,86,'Create your captain’s passport',4,()=>void this.navigate('register'),1);
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
    this.art.image(this.plane,cfg.id+'-tall',0,0,1536,3072);
    // Ambient light must render over the opaque integrated environment plate.
    // It shares the cabinet's coordinate plane with the reels and controls.
    const ambient=box(this.plane,'Cabinet reflections',0,0,1024,2304).addComponent(SalonAtmosphere);
    ambient.setup(this.art,1024,2304);ambient.cabinet(this.art,g);ambient.reducedMotion=this.reduced;

    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.play('reel-stop');ambient.land(column);};
    const balance=imagePoint(g.balance);this.art.image(this.plane,'symbols',balance[0]-g.balance[2]*.39,balance[1],52,52,0);
    this.balanceLabel=text(this.plane,money(this.services.economy.balance()),balance[0]-4,balance[1],g.balance[2]*.66,g.balance[3],43,'#59351B');
    this.art.button(this.plane,'Recharge',balance[0]+g.balance[2]*.41,balance[1],65,67,'',8,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const win=imagePoint(g.win);this.winLabel=text(this.plane,'WIN  0',win[0],win[1],g.win[2],g.win[3],41,'#803F25');
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
    const betCaption=outlined(text(betPanel,'BET',-g.bet[2]*.14,0,g.bet[2]*.30,g.bet[3]*.8,28,readoutInk),readoutOutline,1);
    betCaption.fontFamily='Arial Black';betCaption.enableWrapText=false;betCaption.overflow=Label.Overflow.SHRINK;
    this.betLabel=outlined(text(betPanel,money(this.bet),g.bet[2]*.25,0,g.bet[2]*.38,g.bet[3]*.82,35,readoutInk),readoutOutline,1);
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
    const autoStatus=imagePoint(g.status);this.autoLamp=text(this.plane,'AUTO OFF',autoStatus[0],autoStatus[1],g.status[2],g.status[3],29,readoutInk);this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const topPanel=display('TOP WIN display',g.topWin,themeIndex*4+1);
    const topCaption=outlined(text(topPanel,'TOP WIN',-g.topWin[2]*.20,-g.topWin[3]*.06,g.topWin[2]*.40,g.topWin[3]*.78,29,readoutInk),readoutOutline,1);
    topCaption.fontFamily='Arial Black';topCaption.enableWrapText=false;topCaption.overflow=Label.Overflow.SHRINK;
    this.topWinLabel=outlined(text(topPanel,money(this.services.profile.current()?.biggestWin??0),g.topWin[2]*.23,-g.topWin[3]*.06,g.topWin[2]*.36,g.topWin[3]*.8,35,readoutInk),readoutOutline,1);
    this.topWinLabel.fontFamily='Arial Black';this.topWinLabel.enableWrapText=false;this.topWinLabel.overflow=Label.Overflow.SHRINK;
    const toolbar=box(this.content!,'Safe top tools',0,this.top-77-Safe.safeTop,1000,130);
    const tool=(name:string,x:number,icon:number,label:string,action:()=>void):Label=>{
      const hit=box(toolbar,name,x,0,127,118),face=box(hit,name+' face',0,0,127,118);
      this.art.image(face,'interfaces',0,12,82,82,icon);
      const caption=outlined(text(face,label,0,-46,124,28,21,COLORS.cream),'#15352F',3);
      caption.fontFamily='Arial Black';caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;
      bindPress(hit,face,()=>{this.audio.play('tap');action();});return caption;
    };
    tool('Back to salon',-427,0,'BACK',()=>void this.navigate('home'));
    tool('Rules',290,7,'RULES',()=>this.rules());
    this.soundLamp=tool('Audio',436,6,'SOUND ON',()=>void this.toggleSound());this.updateSound();
    this.hintLabel=outlined(text(this.content!,MODES[GAME_CONFIGS.indexOf(cfg)],0,-this.top+88+Safe.safeBottom,980,110,38,COLORS.cream));
    this.layoutPlane();
    if(this.force){this.scheduleOnce(()=>void this.spin(),1);}
  }
  private layoutPlane():void{
    if(!this.plane)return;const h=Safe.visibleHeight;
    const layout=cabinetLayout(Safe.visibleWidth,h,CABINETS[this.config.id],Safe.safeTop,Safe.safeBottom);
    this.plane.setScale(layout.scale,layout.scale,1);this.plane.setPosition(0,layout.y);

    this.content?.getChildByName('Safe top tools')?.setPosition(0,h/2-77-Safe.safeTop);
    this.hintLabel?.node.setPosition(0,-h/2+88+Safe.safeBottom);
  }
  private get bet():number{return this.config.bets[this.betIndex];}
  private changeBet(delta:number):void{
    if(this.state.kind!=='idle'){this.toast('Bet is locked while the reels are moving.');return;}
    const next=Math.max(0,Math.min(this.config.bets.length-1,this.betIndex+delta));
    if(next===this.betIndex){this.toast(delta<0?'Minimum bet selected.':'Maximum bet selected.');return;}
    this.betIndex=next;if(this.betLabel)this.betLabel.string=money(this.bet);if(this.hintLabel)this.hintLabel.string=`BET ${money(this.bet)} selected`;
  }
  private updateAuto():void{
    if(!this.autoLamp)return;this.autoLamp.string=this.auto?'AUTO ON':'AUTO OFF';this.autoLamp.color=new Color(this.auto?'#15705B':'#253D51');
    Tween.stopAllByTarget(this.autoLamp.node);this.autoLamp.node.setScale(1,1,1);
    if(this.auto&&!this.reduced)tween(this.autoLamp.node).to(.55,{scale:new Vec3(1.08,1.08,1)},{easing:'sineInOut'}).to(.55,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).union().repeatForever().start();
  }
  private updateSound(enabled=this.services.profile.current()?.settings.sound??true):void{if(this.soundLamp){this.soundLamp.string=enabled?'SOUND ON':'SOUND OFF';this.soundLamp.color=new Color(enabled?'#FFF4D8':'#D8B79A');}}
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
    if(this.winLabel)this.winLabel.string='WIN  0';
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
      if(result.totalWin>=this.bet)await this.presentWin(result.totalWin,result.totalWin/this.bet>=10);
      if(this.winLabel)this.winLabel.string=(result.totalWin>0&&result.totalWin<this.bet?'RETURN  ':'WIN  ')+money(result.totalWin);
      if(this.hintLabel)this.hintLabel.string=result.totalWin>0?'Treasure added to your wallet.':MODES[GAME_CONFIGS.indexOf(this.config)];
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
      if(this.hintLabel)this.hintLabel.string=feature.type==='ruby-cascade'?`MOON CASCADE · ${round.multiplier}×`:feature.type==='jade-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`SUNSTONE WILD · ${round.index} OF ${feature.rounds.length}`;
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
        this.audio.play('reward');await stage.addComponent(SalonWinStage).setup(this.art,amount,this.height,this.reduced,amount/this.bet,GAME_CONFIGS.indexOf(this.config));
      }finally{
        fades.forEach((f,i)=>{if(f.node.isValid)tween(f.alpha).to(this.reduced?.01:.3,{opacity:prior[i]},{easing:'sineInOut'}).start();});
        if(this.modal===stage)this.closeModal();
      }
    }else{
      this.audio.play('win');const label=this.winLabel;
      const g=CABINETS[this.config.id],screen=imagePoint(g.screen);
      const banner=this.art.panel(this.plane!,screen[0],screen[1]-g.screen[3]/2+120,Math.min(680,g.screen[2]-24),204,GAME_CONFIGS.indexOf(this.config)%2?0:3);banner.name='Ordinary win celebration';
      const badge=this.art.image(banner,'symbols',-230,0,134,134,[0,3,2,11][GAME_CONFIGS.indexOf(this.config)]);
      text(banner,amount/this.bet>=5?'NICE WIN':'WIN',60,52,390,61,36,COLORS.cream,true);
      const total=outlined(text(banner,'0',60,-30,400,92,65,COLORS.cream,true),'#583218',2);
      this.reveal(banner);this.sheen(banner,650,190);if(!this.reduced){tween(badge).to(.3,{scale:new Vec3(1.16,1.16,1)},{easing:'backOut'}).to(.4,{scale:new Vec3(1,1,1)}).start();
        for(let i=0;i<8;i++){const spark=this.art.light(banner,3,(i%2?1:-1)*(225+i*9),(i-4)*18,50,50,190);tween(spark).by(.65,{position:new Vec3((i%2?1:-1)*45,65,0),angle:90}).start();tween(opacity(spark,190)).to(.85,{opacity:0}).start();}}
      try{if(this.reduced){total.string=money(amount);if(label)label.string='WIN  '+money(amount);await this.delay(.8);}
      else{const v={n:0};await new Promise<void>(resolve=>tween(v).to(.85,{n:amount},{easing:'expoOut',onUpdate:()=>{total.string=money(v.n);if(label?.isValid)label.string='WIN  '+money(v.n);}}).call(()=>resolve()).start());total.string=money(amount);if(label?.isValid)label.string='WIN  '+money(amount);await this.delay(.65);tween(opacity(banner,255)).to(.2,{opacity:0}).start();await this.delay(.2);}}
      finally{if(banner.isValid)banner.destroy();}
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=money(this.services.economy.balance());}
  private refreshTopWin():void{if(this.topWinLabel)this.topWinLabel.string=money(this.services.profile.current()?.biggestWin??0);}
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
  private sheen(n:Node,w:number,h:number,delay=0):void{if(this.reduced)return;const clip=box(n,'Inset metal sheen',0,0,w-12,h-12);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;const beam=this.art.light(clip,2,-w,0,h*2.2,h*2.2,38);beam.setScale(.35,1.6,1);beam.angle=-24;tween(beam).delay(delay).repeatForever(tween().to(1.6,{position:new Vec3(w,0,0)},{easing:'sineInOut'}).call(()=>beam.setPosition(-w,0)).delay(4.5)).start();}
  private breathe(n:Node,delay=0):void{if(this.reduced)return;tween(n).delay(delay).to(1.8,{angle:5},{easing:'sineInOut'}).to(3.6,{angle:-5},{easing:'sineInOut'}).to(1.8,{angle:0},{easing:'sineInOut'}).union().repeatForever().start();const origin=n.position.clone();tween(n).delay(delay).repeatForever(tween().to(2.8,{position:new Vec3(origin.x,origin.y+27,origin.z)},{easing:'sineInOut'}).to(2.8,{position:origin},{easing:'sineInOut'})).start();}
  private count(label:Label,total:number,from=0):void{Tween.stopAllByTarget(label);if(this.reduced){label.string=money(total);return;}tween(label).to(.85,{}, {onUpdate:(_target,ratio)=>{if(label.isValid)label.string=money(from+(total-from)*(1-Math.pow(1-(ratio??0),3)));}}).call(()=>{if(label.isValid)label.string=money(total);}).start();}
  private rewardArrival(before:number,after:number):void{
    if(this.balanceLabel)this.count(this.balanceLabel,after,before);
    if(this.reduced||!this.root||!this.balanceLabel)return;
    const target=this.root.getComponent(UITransform)!.convertToNodeSpaceAR(this.balanceLabel.node.worldPosition);
    for(let i=0;i<9;i++){const coin=this.art.image(this.root,'symbols',(i-4)*25,-110,54,54,0);coin.name='Reward arrival coin';const o=opacity(coin,0);tween(o).delay(i*.045).to(.12,{opacity:255}).delay(.58).to(.16,{opacity:0}).start();tween(coin).delay(i*.045).to(.2,{position:new Vec3((i-4)*39,15,0)},{easing:'sineOut'}).to(.65,{position:target,scale:new Vec3(.4,.4,1)},{easing:'quadIn'}).call(()=>coin.destroy()).start();}
  }
  private storePage():void{
    const stage=this.pageStage('Cargo manifest');this.art.panel(stage,0,550,1000,195,1);this.art.image(stage,'interfaces',-362,550,145,145,1);
    text(stage,'THE TREASURE CARGO',90,580,760,95,49,COLORS.ink,true);
    text(stage,'Select a shipment for your shared wallet',80,503,760,66,30,COLORS.ink);
    const note=this.art.panel(stage,0,392,960,90,1);text(note,this.services.remoteMode?'Apple prices shown when available':'Preview · Purchases unavailable',0,0,890,60,30,COLORS.ink);
    const stamp=this.generation;
    void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;items.forEach((item,i)=>{
      const y=214-i*210,n=this.art.panel(stage,0,y,962,192,1);
      this.reveal(n,i*.07);this.sheen(n,962,192,i*.65);this.breathe(this.art.image(n,'symbols',-345,0,170,170,[9,1,5,8][i]),i*.3);
      this.count(text(n,money(item.credits+item.bonus),-66,36,380,68,47,COLORS.ink,true),item.credits+item.bonus);
      text(n,item.label,-61,-37,388,56,27,COLORS.ink);
      this.art.button(n,'Buy '+item.id,306,0,288,102,item.available?item.displayPrice:'Unavailable',undefined,()=>void this.purchase(item.id),3);
    });}).catch(()=>this.toast('Cargo unavailable. Please try again.'));
    this.art.button(stage,'Synchronize purchases',0,-615,790,100,'Sync unfinished purchases',13,()=>void this.services.store.restore().then(r=>{this.refreshBalance();this.toast(r.message);}),0);
  }

  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}finally{this.busy=false;}}
  private rewardsPage():void{
    const stage=this.pageStage('Seven day treasure voyage');this.art.panel(stage,0,574,1010,195,1);
    text(stage,'THE SEVEN-DAY VOYAGE',0,606,980,95,53,COLORS.ink,true);
    text(stage,'One shared wallet. A new gift each day.',0,526,970,64,32,COLORS.ink);
    const path=box(stage,'Seven ports',0,110,960,660);const g=path.addComponent(Graphics);g.strokeColor=new Color('#BC9456');g.lineWidth=9;
    const progress=this.services.save.currentScope()?.checkIn;const today=new Date().toISOString().slice(0,10);const claimed=progress?.lastClaimDate===today;
    const points=[[-340,200],[-110,270],[155,215],[335,70],[170,-90],[-90,-160],[-340,-70]];
    points.forEach(([x,y],i)=>{if(i===0)g.moveTo(x,y);else g.lineTo(x,y)});g.stroke();
    points.forEach(([x,y],i)=>{const n=this.art.image(path,'symbols',x,y,136,136,i===6?5:0);if(i===(progress?.cycleDay??0)&&!claimed)this.breathe(n);const plaque=this.art.panel(path,x,y-77,149,51,1);text(plaque,'DAY '+(i+1),0,0,130,43,25,COLORS.ink);if(i===(progress?.cycleDay??0)&&!claimed)this.art.light(path,1,x,y,190,190,90).setSiblingIndex(0);bindPress(n,n,()=>this.toast('Day '+(i+1)+' · '+money(this.services.checkIn.rewards[i])+' coins'));});
    this.art.button(stage,'Check in',0,-241,830,112,claimed?'TODAY’S CHECK-IN COLLECTED':'COLLECT TODAY’S CHECK-IN',14,()=>void this.claim('check-in'),3);
    const daily=this.art.panel(stage,0,-456,947,242,0);this.sheen(daily,947,242,.6);this.breathe(this.art.image(daily,'symbols',-323,0,202,202,9));
    text(daily,'DAILY CARGO · 5,000',110,64,620,69,38,COLORS.gold,true);
    this.art.button(daily,'Claim daily',110,-44,580,106,this.services.save.currentScope()?.claims['daily-free:'+today]?'Daily gift collected':'Collect daily gift',2,()=>void this.claim('daily'),1);
    const note=this.art.panel(stage,0,-642,970,69,1);text(note,'Each reward can be collected once per UTC day.',0,0,900,53,27,COLORS.ink);
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
    const stage=this.pageStage('Regatta winners podium');this.art.panel(stage,0,612,1010,122,1);
    text(stage,'THE CROWN REGATTA',0,612,980,90,56,COLORS.ink,true);

    const head=this.art.panel(stage,0,136,965,108,0);text(head,this.services.remoteMode?'VERIFIED TOTAL WINS':'ON-DEVICE TOTAL WINS',0,0,890,65,35,COLORS.gold);
    const stamp=this.generation;
    const render=(rows=this.services.rank.list('all-time',this.services.profile.current())):void=>{
      if(stamp!==this.generation)return;
      if(!rows.length){const p=this.art.panel(stage,0,-127,910,275,1);text(p,'Your first settled win starts the voyage.\nPlay a cabinet to enter the regatta.',0,0,840,185,37,COLORS.ink);return;}
      this.visibleRanks(rows,5).forEach((r,i)=>{const n=this.art.panel(stage,0,-40-i*136,960,124,r.current?0:1);const ink=r.current?COLORS.cream:COLORS.ink;this.reveal(n,i*.08);if(r.current)this.sheen(n,960,124);
        text(n,'#'+r.rank,-400,0,100,70,35,ink,true);this.art.image(n,'portraits',-285,0,94,94,r.avatar);text(n,r.nickname,-30,0,350,80,33,ink);this.count(text(n,money(r.winnings),315,0,265,75,38,ink,true),r.winnings);
      });
    };
    if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load regatta results.'));else render();
    text(stage,'Total wins · Includes simulated competitors',0,-665,970,53,27,COLORS.ink);
  }

  private profilePage():void{
    const stage=this.pageStage('Captain passport');this.art.panel(stage,0,616,1010,120,1);const p=this.services.profile.current();if(!p)return;
    text(stage,'THE CAPTAIN’S PASSPORT',0,616,980,92,51,COLORS.ink,true);
    const passport=this.art.panel(stage,0,235,970,600,1);
    this.reveal(passport);this.sheen(passport,970,600,1.2);const portrait=this.art.image(passport,'portraits',-283,110,270,270,p.avatar);this.breathe(portrait);bindPress(portrait,portrait,()=>this.avatars());
    const editableName=text(passport,p.nickname+' · EDIT',165,181,510,81,44,COLORS.ink,true);editableName.enableWrapText=false;editableName.node.name='Edit nickname';bindPress(editableName.node,editableName.node,()=>this.editNickname());text(passport,p.isGuest?'GUEST CAPTAIN':'MEMBER CAPTAIN',165,104,510,59,28,COLORS.ink);
    this.art.button(passport,'Change avatar',165,0,500,94,'Choose portrait',4,()=>this.avatars(),0);
    text(passport,'TOTAL WON',-240,-129,420,56,29,COLORS.ink);text(passport,'BEST WIN',240,-129,420,56,29,COLORS.ink);
    this.count(text(passport,money(p.totalWin),-240,-194,425,70,45,COLORS.ink,true),p.totalWin);this.count(text(passport,money(p.biggestWin),240,-194,425,70,45,COLORS.ink,true),p.biggestWin);
    const links:[string,number,()=>void][]=[['Coin ledger',1,()=>this.history()],['Privacy & help',7,()=>this.legal('privacy')],['Sign out',9,()=>void this.signOut()],['Delete account',15,()=>this.deleteAccount()]];
    links.forEach(([label,i,action],k)=>{const x=k%2?-244:244,y=-227-Math.floor(k/2)*227;const n=this.art.panel(stage,x,y,461,194,k===3?3:0);n.name=label;this.reveal(n,.1+k*.06);this.sheen(n,461,194,k*.9);const icon=this.art.image(n,'interfaces',0,30,100,100,i);text(n,label,0,-56,414,55,30);bindPress(n,icon,action);});
    text(stage,'Your identity and treasure travel together.',0,-639,960,60,29,COLORS.ink);
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


  private avatars():void{const s=this.sheet('Choose your portrait',1110);for(let i=0;i<16;i++){const n=this.art.image(s,'portraits',(i%4-1.5)*213,326-Math.floor(i/4)*222,189,189,i);bindPress(n,n,()=>void this.services.profile.setAvatar(i).then(ok=>{if(ok){this.render();this.audio.play('win');this.toast('Portrait saved to your passport.');}else this.toast('Portrait could not be saved.');}));}}
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
    if(!this.reduced){
      const alpha=opacity(overlay,0);tween(alpha).to(.2,{opacity:255}).start();
      panel.setPosition(0,-28);tween(panel).to(.32,{position:new Vec3(0,0,0)},{easing:'cubicOut'}).start();
    }
    this.modal=overlay;return panel;
  }
  private closeModal():void{if(this.modal){this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,0);text(n,message,0,0,916,144,36);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
