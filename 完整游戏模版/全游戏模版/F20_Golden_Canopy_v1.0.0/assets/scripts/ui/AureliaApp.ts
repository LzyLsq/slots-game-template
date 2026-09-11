import { _decorator, BlockInputEvents, Color, Component, EditBox, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
import { GameBootstrap } from '../core/GameBootstrap';
import { SecureRNG } from '../core/SecureRNG';
import { AudioManager } from '../audio/AudioManager';
import { complianceCurrent, PRIVACY_VERSION, TERMS_VERSION } from '../core/ReleaseConfig';
import { GAME_CONFIGS, SYMBOL_ART, symbolAtlas, prizeArt } from '../math/GameConfigs';
import { ResultGenerator } from '../math/ResultGenerator';
import { ruleAward,ruleCounts } from '../math/PaytableDisplay';
import type { GameConfig, GameId, SpinResult } from '../math/types';
import type { AuthResult } from '../services/AuthService';
import { ApiRequestError } from '../services/ProductionApiClient';
import { RemoteSpinJournal } from '../services/RemoteSpinJournal';
import { STORE_PRODUCTS } from '../services/StoreService';
import { SalonReels } from '../reels/SalonReels';
import { SalonAtmosphere } from '../vfx/SalonAtmosphere';
import { CanopyLeaves } from '../vfx/CanopyLeaves';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, outlined, COLORS } from './SalonArt';
import { CABINETS, CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT, imagePoint, cabinetLayout, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const MODES = ['3 reels · Golden acorn picks', '20 lines · Ruby lock & respin', '1,024 ways · Pearl wild columns', '5+ clusters · Crown cascades'];
const exactMoney=(n:number):string=>Math.floor(n).toLocaleString('en-US');
const money=(n:number):string=>{const v=Math.floor(n),a=Math.abs(v);if(a<1000000)return exactMoney(v);const unit=a>=1000000000?1000000000:1000000;return (Math.trunc(v/unit*100)/100).toFixed(2).replace(/\.?0+$/,'')+(unit===1000000000?'B':'M');};
@ccclass('AureliaApp')
export class AureliaApp extends Component {
  private art=new SalonArt();private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private retiring?:Node;private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private homeChanging=false;private authExpanded=false;private selectedRoute=0;private selectedBundle=0;private curtainClosed=false;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
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
    text(loading,'GOLDEN CANOPY',0,90,950,160,80,COLORS.gold,true);
    const progress=text(loading,'Unlocking your treasury…',0,-70,950,100,38);
    try{
      await this.art.load([...GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),symbolAtlas(c.id)+'-blur',prizeArt(c.id)]),'salon','symbols','interfaces','portraits','symbols-blur','optics','apple-mark','canopy-brand',...Array.from({length:4},(_,i)=>'canopy-title-'+i),'canopy-services',...Array.from({length:4},(_,i)=>'canopy-frame-'+i),...Array.from({length:16},(_,i)=>'canopy-button-'+i),'canopy-hall-soft','canopy-destinations',...Array.from({length:4},(_,i)=>'canopy-soft-plate-'+i)],(n,t)=>{
        progress.string=`Polishing your treasures  ${Math.round(n/t*100)}%`;
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
    }catch(error){progress.string='Could not open the treasury. Tap to retry.';loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
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
    this.art.reducedMotion=this.reduced;
    this.generation++;this.modal=undefined;this.notification=undefined;this.reels=undefined;this.plane=undefined;
    this.balanceLabel=this.betLabel=this.winLabel=this.topWinLabel=this.hintLabel=this.autoLamp=this.soundLamp=undefined;
    const previous=this.root;if(previous){const a=opacity(previous,255);Tween.stopAllByTarget(a);a.opacity=255;for(const edit of previous.getComponentsInChildren(EditBox))edit.enabled=false;}
    if(this.retiring&&this.retiring!==previous)this.retiring.destroy();this.retiring=previous;
    this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Golden-Canopy-interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='home'?'canopy-hall-soft':this.page==='login'||this.page==='register'?'salon':'canopy-services';
    this.bg=this.page==='game'||this.page==='home'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);

    if(this.page!=='game'){box(root,'Canopy leaf atmosphere',0,0,Safe.visibleWidth,this.height).addComponent(CanopyLeaves).setup(this.art,Safe.visibleWidth,this.height,this.reduced);}
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
      if(config){loading=this.gameLoading(config);await Promise.all([this.art.load([config.id+'-tall'],(done,total)=>this.loadingProgress?.(done/total*.8,'Preparing your game…')),this.delay(this.reduced?.15:1.65)]);}

      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(.9,'Opening your game…');}if(!this.reduced)await this.delay(.4);
      if(loading){this.loadingProgress?.(1,'Ready');await this.delay(this.reduced?.01:.65);await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.32,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.busy=false;}
  }
  private gameLoading(config:GameConfig):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);this.art.cover(n,'canopy-hall-soft',0,0,Safe.visibleWidth,this.height);
    const veil=box(n,'Soft canopy loading veil',0,0,Safe.visibleWidth,this.height).addComponent(Graphics);veil.fillColor=new Color(50,32,17,200);veil.rect(-Safe.visibleWidth/2,-this.height/2,Safe.visibleWidth,this.height);veil.fill();
    const stage=box(n,'Growing your golden path',0,0,1020,1410);const scale=Math.min(1,(Safe.visibleWidth-65)/1020,(this.height-230)/1410);stage.setScale(scale,scale,1);
    const index=GAME_CONFIGS.indexOf(config),title=this.art.image(stage,'canopy-title-'+index,0,507,840,160);this.sheen(title,725,100);
    const world=this.art.image(stage,'canopy-destinations',0,139,706,646,index);this.idleAccent(world,0,8,.3,1.7);
    const buds:Node[]=[];for(let i=0;i<4;i++){const bud=this.art.image(stage,'symbols',(i-1.5)*180,-306,72,72,[8,2,3,6][i]);opacity(bud,45);buds.push(bud);}
    const rail=this.art.panel(stage,0,-421,820,88,1);const fill=box(rail,'Loading bar fill',0,0,750,24).addComponent(Graphics);
    const percentage=text(stage,'0%',0,-513,250,64,40,COLORS.cream);percentage.node.name='Loading percentage';const status=text(stage,'Preparing your woodland journey…',0,-606,900,61,33,COLORS.cream);
    const progress={value:0};let target=0;const draw=()=>{if(!n.isValid)return;const width=740*progress.value;fill.clear();if(width>0){fill.fillColor=new Color('#FFE5A1');fill.roundRect(-370,-10,width,20,Math.min(10,width/2));fill.fill();}buds.forEach((bud,i)=>{bud.getComponent(UIOpacity)!.opacity=progress.value>=(i+1)/4?255:60;});percentage.string=Math.round(progress.value*100)+'%';};
    this.loadingProgress=(value,caption)=>{target=Math.max(target,Math.min(1,value));status.string=target===1?'Your garden is ready':caption;Tween.stopAllByTarget(progress);if(this.reduced){progress.value=target;draw();}else tween(progress).to(.45,{value:target},{easing:'sineInOut',onUpdate:draw}).start();};draw();return n;
  }
  private header():void{
    const p=this.services.profile.current(),y=this.top-92-Safe.safeTop;
    const wallet=this.art.panel(this.content!,-235,y,525,107,2);
    this.art.image(wallet,'symbols',-194,0,70,70,0);
    this.balanceLabel=text(wallet,money(this.services.economy.balance()),-4,0,298,76,46,COLORS.cream);
    const topup=this.art.image(wallet,'canopy-button-2',202,0,74,74);topup.name='Top up';bindPress(topup,topup,()=>void this.navigate('store'));
    this.art.button(this.content!,'Mail',95,y,87,87,'',5,()=>this.mail());
    const avatar=this.art.image(this.content!,'portraits',431,y,109,109,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    outlined(text(this.content!,p?.nickname??'Guest',266,y,208,69,27,COLORS.cream),'#173F49',2).enableWrapText=false;
  }
  private navigation():void{
    const nav=this.art.panel(this.content!,0,-this.top+96+Safe.safeBottom,1050,160,0);
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Boutique','Rewards','Canopy','Honours','Account'],icons=[1,2,6,3,4];
    pages.forEach((page,i)=>{
      const center=i===2,active=page===this.page;
      const hit=box(nav,labels[i],(i-2)*205,center?18:0,190,150);
      if(active)this.art.light(hit,1,0,21,155,140,90).setSiblingIndex(0);
      const icon=this.art.image(hit,'interfaces',0,center?23:16,center?135:86,center?123:86,icons[i]);
      text(hit,labels[i],0,center?-54:-40,183,44,26,active?COLORS.jade:COLORS.ink);
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
    const stage=box(this.content!,'Golden canopy pavilion',0,0,1024,1792);stage.setSiblingIndex(0);
    const scale=Math.min(Safe.visibleWidth/1024,this.height/1792);stage.setScale(scale,scale,1);
    this.art.cover(stage,'canopy-hall-soft',0,0,Math.max(1024,Safe.visibleWidth/scale),this.height/scale);
    const brand=this.art.image(this.content!,'canopy-brand',0,this.top-282-Safe.safeTop,760,235);this.idleAccent(brand,0,14,.2,1.8);this.sheen(brand,650,170);
    const exhibit=box(stage,'Canopy destination exhibit',0,-40,870,910);
    const draw=()=>{
      const cfg=GAME_CONFIGS[this.selectedRoute];const piece=box(exhibit,'Destination '+cfg.id,0,0,870,910);
      const island=this.art.image(piece,'canopy-destinations',0,88,790,730,this.selectedRoute);this.idleAccent(island,0,8,.2,1.9);this.edgeJewels(island,620,500,this.selectedRoute*.4);
      const title=this.art.image(piece,'canopy-title-'+this.selectedRoute,0,-279,720,116);this.sheen(title,630,84,.5);
      const caption=this.art.panel(piece,0,-369,760,70,1);text(caption,MODES[this.selectedRoute],0,0,690,51,30,COLORS.ink);
      const play=this.art.button(piece,'Enter '+cfg.name,0,-479,663,122,'PLAY · '+['ACORN VAULT','RUBY ORCHARD','PEARL BROOK','CROWN NEST'][this.selectedRoute],6,()=>void this.navigate('game',cfg),3);this.metalEdges(play,630,106,.4);
      return piece;
    };
    let current=draw();
    const selection=box(stage,'Choose a woodland destination',0,-619,950,167);
    const markers:Node[]=[];
    const choose=(index:number)=>{if(this.homeChanging||index===this.selectedRoute)return;this.homeChanging=true;this.selectedRoute=index;this.audio.play('tap');
      const old=current;current=draw();const a=opacity(current,0);current.setPosition(32,0);tween(a).to(.35,{opacity:255}).start();tween(current).to(.4,{position:new Vec3(0,0,0)},{easing:'sineOut'}).start();tween(opacity(old,255)).to(.35,{opacity:0}).call(()=>{old.destroy();this.homeChanging=false;}).start();
      markers.forEach((m,i)=>{m.getComponent(UIOpacity)!.opacity=i===index?255:95;});
    };
    GAME_CONFIGS.forEach((cfg,i)=>{const x=(i-1.5)*222,hit=box(selection,'Choose destination '+i,x,0,210,166);const face=this.art.image(hit,'portraits',0,18,109,109,i);const marker=this.art.image(hit,'interfaces',44,-20,35,35,14);opacity(marker,i===this.selectedRoute?255:95);markers.push(marker);text(hit,['ACORN','RUBY','PEARL','CROWN'][i],0,-56,208,46,27,COLORS.ink);bindPress(hit,face,()=>choose(i));});
    this.art.button(stage,'Previous destination',-438,-188,95,108,'',9,()=>choose((this.selectedRoute+3)%4));
    const next=this.art.button(stage,'Next destination',438,-188,95,108,'',9,()=>choose((this.selectedRoute+1)%4));next.angle=180;
    this.festivalDrift(stage);
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
    const stage=box(this.content!,'Canopy membership',0,30,1020,1640);const scale=Math.min(1,(this.height-260-Safe.safeTop-Safe.safeBottom)/1640,(Safe.visibleWidth-45)/1020);stage.setScale(scale,scale,1);
    const brand=this.art.image(stage,'canopy-brand',register?0:220,register?690:656,register?740:590,220);this.idleAccent(brand,0,12,.2,1.8);this.sheen(brand,510,150);
    const panel=this.art.panel(stage,0,register?-18:-293,935,register?1240:970,0);this.metalEdges(panel,903,register?1207:937,.8);
    text(panel,register?'JOIN GOLDEN CANOPY':'WELCOME, EXPLORER',0,register?525:390,812,82,42,COLORS.ink,true);
    text(panel,register?'Your woodland story starts here':'Sign in to your world of gold',0,register?448:319,800,56,30,COLORS.ink);
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
      const apple=this.art.panel(panel,0,-216,810,104,1);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-242,0,42,50);text(apple,'Sign in with Apple',25,0,529,75,36,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));
      this.art.button(panel,'Guest',-211,-356,390,98,'Guest play',0,()=>this.guestConsent(),0);this.art.button(panel,'Create account',211,-356,390,98,'Register',4,()=>void this.navigate('register'),0);
    }
    const links=box(this.content!,'Legal links',0,-this.top+151+Safe.safeBottom,990,86);['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*320,0,305,78,t,7,()=>this.legal(['terms','privacy','support'][i] as LegalPage),0));
    outlined(text(this.content!,'Virtual coins · No cash prizes · Eligible adults only',0,-this.top+62+Safe.safeBottom,1000,50,26,COLORS.cream),'#583B23',2);
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
    const panel=this.sheet('Canopy membership terms',710);
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
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.play('reel-stop');ambient.land(column);};
    const summary=[g.balance[0]-24,g.balance[1]-25,g.topWin[0]+g.topWin[2]-g.balance[0]+48,g.balance[3]+50] as const;const summaryPoint=imagePoint(summary);const fascia=this.art.panel(this.plane,summaryPoint[0],summaryPoint[1],summary[2],summary[3],1);fascia.name='Integrated treasury readouts';this.metalEdges(fascia,summary[2]-22,summary[3]-14,.9);const balance=imagePoint(g.balance);
    this.balanceLabel=text(this.plane,money(this.services.economy.balance()),balance[0]-g.balance[2]*.065,balance[1],g.balance[2]*.72,g.balance[3]*.82,46,'#59351B');this.balanceLabel.enableWrapText=false;this.balanceLabel.overflow=Label.Overflow.SHRINK;this.balanceLabel.lineHeight=51;
    const recharge=this.art.image(this.plane,'canopy-button-'+(GAME_CONFIGS.indexOf(cfg)*4+2),balance[0]+g.balance[2]*.41,balance[1],60,60);recharge.name='Recharge';bindPress(recharge,recharge,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const win=imagePoint(g.win);this.winLabel=text(this.plane,'WIN  0',win[0],win[1],g.win[2]*.91,g.win[3]*.84,44,'#803F25');this.winLabel.enableWrapText=false;this.winLabel.overflow=Label.Overflow.SHRINK;
    const themeIndex=GAME_CONFIGS.indexOf(cfg);

    const readoutInk='#253D51';
    const readoutOutline='#FFF2D5';
    const plateColors:Record<GameId,string>={
      'golden-hour':'#55300F','jade-treasury':'#06382D','pearl-palace':'#E8DDC9','ruby-revel':'#651725',
    };
    const display=(name:string,rect:Box,index:number):Node=>{
      const pos=imagePoint(rect),host=this.art.panel(this.plane!,pos[0],pos[1],rect[2]+18,rect[3]+16,1);host.name=name;
      return host;
    };
    if(cfg.id==='jade-treasury'){
      const left=g.minus[0],right=g.plus[0]+g.plus[2],top=g.minus[1],height=g.minus[3];
      const tune=imagePoint([left,top,right-left,height]);const bed=this.art.panel(this.plane,tune[0],tune[1],right-left+145,height+90,1);bed.name='Unified bet tuner';
      this.metalEdges(bed,right-left+110,height+62,.8);
    }
    const betPanel=cfg.id==='jade-treasury'?box(this.plane,'BET display',...imagePoint(g.bet),g.bet[2],g.bet[3]):display('BET display',g.bet,themeIndex*4);
    const betCaption=outlined(text(betPanel,'BET',0,g.bet[3]*.24,g.bet[2]*.82,g.bet[3]*.36,24,readoutInk),readoutOutline,1);
    betCaption.fontFamily='Arial Black';betCaption.enableWrapText=false;betCaption.overflow=Label.Overflow.SHRINK;
    this.betLabel=outlined(text(betPanel,money(this.bet),0,-g.bet[3]*.17,g.bet[2]*.82,g.bet[3]*.58,43,readoutInk),readoutOutline,1);
    this.betLabel.fontFamily='Arial Black';this.betLabel.enableWrapText=false;this.betLabel.overflow=Label.Overflow.SHRINK;
    const ctl=(rect:Box,label:string,index:number,action:()=>void):Node=>{
      const pos=imagePoint(rect);const hit=box(this.plane!,label,pos[0],pos[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset='canopy-button-'+(theme*4+[0,2,1,3][index]);
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

    const auto=ctl(g.auto,'AUTO',3,()=>{this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');if(this.auto&&this.state.kind==='idle')void this.spin();});
    const autoStatus=imagePoint(g.status);this.art.panel(this.plane,autoStatus[0],autoStatus[1],g.status[2]+18,g.status[3]+16,1);this.autoLamp=text(this.plane,'AUTO OFF',autoStatus[0],autoStatus[1],g.status[2]*.67,g.status[3]*.84,35,readoutInk);this.autoLamp.enableWrapText=false;this.autoLamp.overflow=Label.Overflow.SHRINK;this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const topPanel=box(this.plane,'TOP WIN display',...imagePoint(g.topWin),g.topWin[2],g.topWin[3]);
    this.topWinLabel=outlined(text(topPanel,'TOP WIN '+money(this.services.profile.current()?.biggestWin??0),0,0,g.topWin[2]*.93,g.topWin[3]*.85,36,readoutInk),readoutOutline,1);
    this.topWinLabel.fontFamily='Arial';this.topWinLabel.lineHeight=44;this.topWinLabel.enableWrapText=false;this.topWinLabel.overflow=Label.Overflow.SHRINK;
    const toolbar=box(this.content!,'Safe top tools',0,this.top-77-Safe.safeTop,1000,130);
    const tool=(name:string,x:number,icon:number,label:string,action:()=>void):Label=>{
      const hit=box(toolbar,name,x,0,127,118),face=box(hit,name+' face',0,0,127,118);
      this.art.image(face,'interfaces',0,12,82,82,icon);
      const caption=outlined(text(face,label,0,-46,124,28,21,COLORS.cream),'#15352F',3);
      caption.fontFamily='Arial Black';caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;
      bindPress(hit,face,()=>{this.audio.play('tap');action();});return caption;
    };
    tool('Back to salon',-427,9,'BACK',()=>void this.navigate('home'));
    tool('Rules',290,7,'RULES',()=>this.rules());
    this.soundLamp=tool('Audio',436,8,'SOUND ON',()=>void this.toggleSound());this.updateSound();
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
    // Status typography stays fixed. Button enamel carries the motion, not the readout.
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
      if(this.hintLabel)this.hintLabel.string=feature.type==='ruby-cascade'?`CROWN CASCADE · ${round.multiplier}×`:feature.type==='jade-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`PEARL WILD · ${round.index} OF ${feature.rounds.length}`;
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
      const banner=this.art.panel(this.plane!,screen[0],screen[1]-g.screen[3]/2+120,Math.min(680,g.screen[2]-24),204,0);banner.name='Ordinary win celebration';
      const badge=this.art.image(banner,symbolAtlas(this.config.id),-230,0,134,134,[8,14,7,2][GAME_CONFIGS.indexOf(this.config)]);this.sheen(badge,108,108,.1);
      text(banner,amount/this.bet>=5?'NICE WIN':'WIN',55,49,420,60,38,'#5B3427',true);
      const total=outlined(text(banner,'0',55,-30,422,94,money(amount).length>9?48:68,'#573225',false),'#FFF2D6',1);
      this.reveal(banner);this.metalEdges(banner,650,190,0);if(!this.reduced){tween(badge).to(.3,{scale:new Vec3(1.16,1.16,1)},{easing:'backOut'}).to(.4,{scale:new Vec3(1,1,1)}).start();
        for(let i=0;i<8;i++){const spark=this.art.light(banner,3,(i%2?1:-1)*(225+i*9),(i-4)*18,50,50,190);tween(spark).by(.65,{position:new Vec3((i%2?1:-1)*45,65,0),angle:90}).start();tween(opacity(spark,190)).to(.85,{opacity:0}).start();}}
      try{if(this.reduced){total.string=money(amount);if(label)label.string='WIN  '+money(amount);await this.delay(.8);}
      else{const v={n:0};await new Promise<void>(resolve=>tween(v).to(.85,{n:amount},{easing:'expoOut',onUpdate:()=>{total.string=money(v.n);if(label?.isValid)label.string='WIN  '+money(v.n);}}).call(()=>resolve()).start());total.string=money(amount);if(label?.isValid)label.string='WIN  '+money(amount);
        tween(total.node).to(.12,{scale:new Vec3(1.065,1.065,1)},{easing:'sineOut'}).to(.24,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
        for(const side of [-1,1]){const glint=this.art.light(banner,3,side*285,side*74,78,26,0);glint.name='Win amount settled glint';tween(glint.getComponent(UIOpacity)!).to(.1,{opacity:220}).to(.4,{opacity:0},{easing:'sineOut'}).start();}
        await this.delay(.65);tween(opacity(banner,255)).to(.2,{opacity:0}).start();await this.delay(.2);}}
      finally{if(banner.isValid)banner.destroy();}
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=money(this.services.economy.balance());}
  private refreshTopWin():void{if(this.topWinLabel)this.topWinLabel.string='TOP WIN '+money(this.services.profile.current()?.biggestWin??0);}
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
  private count(label:Label,total:number,from=0,suffix=''):void{Tween.stopAllByTarget(label);if(this.reduced){label.string=money(total)+suffix;return;}tween(label).to(.85,{}, {onUpdate:(_target,ratio)=>{if(label.isValid)label.string=money(from+(total-from)*(1-Math.pow(1-(ratio??0),3)))+suffix;}}).call(()=>{if(label.isValid)label.string=money(total)+suffix;}).start();}
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
    const stage=this.pageStage('Woodland emporium');text(stage,'THE TREASURE EMPORIUM',0,627,910,84,41,COLORS.ink,true);
    text(stage,'Choose a little woodland abundance',0,552,910,55,30,COLORS.ink);
    const stamp=this.generation;void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;
      const item=items[this.selectedBundle%items.length],names=['COIN SATCHEL','GOLDEN RESERVE','JEWEL CHEST','ROYAL HARVEST'];
      const hero=this.art.image(stage,'symbols',0,301,388,360,[9,1,5,6][this.selectedBundle]);this.idleAccent(hero,0,12,.4,1.7);this.edgeJewels(hero,320,280);this.sheen(hero,286,280,.6);
      text(stage,names[this.selectedBundle],0,75,820,80,43,COLORS.ink,true);
      this.count(text(stage,'',0,-7,830,80,49,COLORS.ink,true),item.credits+item.bonus,0,' COINS');
      items.forEach((entry,i)=>{const slot=this.art.panel(stage,(i-1.5)*231,-166,206,164,i===this.selectedBundle?3:0);const icon=this.art.image(slot,'symbols',0,16,89,86,[9,1,5,6][i]);text(slot,money(entry.credits+entry.bonus),0,-48,182,44,25,i===this.selectedBundle?COLORS.cream:COLORS.ink);bindPress(slot,icon,()=>{if(this.busy)return;this.selectedBundle=i;this.render();});});
      this.art.button(stage,'Buy '+item.id,0,-344,840,127,item.available?item.displayPrice:'Purchases unavailable',1,()=>void this.purchase(item.id),3);
      text(stage,'Virtual coins for your woodland games',0,-444,850,60,29,COLORS.ink);
    }).catch(()=>this.toast('Shop unavailable. Please try again.'));
    this.art.button(stage,'Synchronize purchases',0,-570,823,99,'Restore purchases',13,()=>void this.restorePurchases(),0);
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
    text(stage,'DAY '+(active+1)+(claimed?' · COLLECTED':' · READY TO HARVEST'),0,550,900,58,31,COLORS.ink);
    const branch=box(stage,'Calendar connecting branch',0,0,940,700).addComponent(Graphics);branch.strokeColor=new Color('#CFA256');branch.lineWidth=9;branch.moveTo(-360,342);branch.bezierCurveTo(550,510,580,-55,-230,68);branch.stroke();
    this.services.checkIn.rewards.forEach((amount,i)=>{
      const x=i<4?(i-1.5)*235:(i-5)*280,y=i<4?339:69,done=i<active||(i===active&&claimed),current=i===active;
      const tile=this.art.panel(stage,x,y,211,222,current?3:0);tile.name='Check-in day '+(i+1);const ink=current?COLORS.cream:COLORS.ink;
      text(tile,'DAY '+(i+1),0,72,180,43,30,ink);const gift=this.art.image(tile,done?'interfaces':'symbols',0,11,88,86,done?14:i===6?5:8);this.idleAccent(gift,i*.5,4,.4,1.8);
      text(tile,money(amount),0,-38,164,36,27,ink,true);text(tile,done?'CLAIMED':current?'TODAY':'LOCKED',0,-69,162,27,19,ink);
      if(current&&!claimed)this.sheen(gift,66,68,.6);bindPress(tile,tile,()=>{if(current&&!claimed)void this.claim('check-in');else this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Available on a later day'));});
    });
    const prize=this.art.image(stage,'prize-golden-hour',-300,-243,233,221);this.idleAccent(prize,0,7,.3,1.7);
    text(stage,claimed?'TODAY’S HARVEST SAVED':'YOUR NEXT GOLDEN GIFT',135,-175,605,62,30,COLORS.ink,true);
    this.art.button(stage,'Check in',135,-273,613,115,claimed?'DAY '+(active+1)+' · COLLECTED':'CLAIM DAY '+(active+1)+' · '+money(this.services.checkIn.rewards[active]),14,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next reward after 00:00 UTC.');},3);
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
    const stage=this.pageStage('Woodland honours');text(stage,'THE GOLDEN HONOUR ROLL',0,629,930,84,40,COLORS.ink,true);text(stage,this.services.remoteMode?'Verified settled winnings':'Real winnings on this device',0,553,910,53,29,COLORS.ink);
    const stamp=this.generation;const render=(rows=this.services.rank.list('all-time',this.services.profile.current())):void=>{if(stamp!==this.generation)return;
      const trophy=this.art.image(stage,'interfaces',-311,359,228,228,3);this.idleAccent(trophy,0,9,.4,1.8);this.edgeJewels(trophy,188,182);
      if(!rows.length){text(stage,'Your first win starts\nyour woodland story.',137,360,567,182,42,COLORS.ink,true);this.art.button(stage,'Explore games',0,-20,830,122,'Explore the canopy',6,()=>void this.navigate('home'),3);return;}
      const first=rows[0];const portrait=this.art.image(stage,'portraits',33,380,146,146,first.avatar);this.idleAccent(portrait,0,6,.3,1.8);text(stage,'#1  '+first.nickname,187,260,630,70,36,COLORS.ink,true).enableWrapText=false;this.count(text(stage,'',187,185,630,70,46,COLORS.ink,true),first.winnings);
      rows.slice(1,5).forEach((r,i)=>{const row=this.art.panel(stage,0,38-i*144,916,124,r.current?3:0),ink=r.current?COLORS.cream:COLORS.ink;text(row,'#'+r.rank,-365,0,108,64,35,ink);this.art.image(row,'portraits',-254,0,82,82,r.avatar);text(row,r.nickname,-33,0,350,65,31,ink).enableWrapText=false;text(row,money(r.winnings),293,0,203,64,33,ink);this.reveal(row,i*.1);});
      this.art.button(stage,'Explore games',0,-605,838,107,'Grow your next record',6,()=>void this.navigate('home'),3);
    };if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load honours.'));else render();
  }

  private profilePage():void{
    const stage=this.pageStage('Woodland member passport'),p=this.services.profile.current();if(!p)return;
    text(stage,'YOUR WOODLAND PASSPORT',0,628,940,83,41,COLORS.ink,true);
    const face=this.art.image(stage,'portraits',0,444,233,233,p.avatar);this.idleAccent(face,0,9,.4,1.8);this.edgeJewels(face,204,204);bindPress(face,face,()=>this.avatars());
    text(stage,p.nickname,0,277,900,83,47,COLORS.ink,true).enableWrapText=false;text(stage,p.isGuest?'GUEST EXPLORER':'CANOPY MEMBER',0,210,860,51,28,COLORS.ink);
    const stats=this.art.panel(stage,0,92,915,147,0);[p.totalWin,p.biggestWin].forEach((v,i)=>{text(stats,i?'TOP WIN':'TOTAL WON',i?221:-221,35,410,40,27,COLORS.ink);this.count(text(stats,'',i?221:-221,-29,410,65,42,COLORS.ink,true),v);});
    const links:[string,number,()=>void][]=[['Choose portrait',4,()=>this.avatars()],['Coin ledger',1,()=>this.history()],['Privacy & help',7,()=>this.legal('privacy')],['Sign out',9,()=>void this.signOut()]];
    links.forEach(([label,icon,action],i)=>{const tile=this.art.panel(stage,(i%2?1:-1)*235,-139-Math.floor(i/2)*192,437,160,0);tile.name=label;const symbol=this.art.image(tile,'interfaces',-133,0,94,94,icon);text(tile,label,65,0,273,76,32,COLORS.ink);bindPress(tile,symbol,action);});
    this.art.button(stage,'Delete account',0,-573,682,87,'Delete account',15,()=>this.deleteAccount(),2);
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
  private history():void{const s=this.sheet('Your coin ledger',1190);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,394-i*132,840,115,1);text(n,r.type.replace(/-/g,' '),-178,0,425,90,31,COLORS.jade);text(n,(r.amount>0?'+':'')+exactMoney(r.amount),233,0,326,79,36,COLORS.ink);});if(!rows.length){const icon=this.art.image(s,'interfaces',0,156,220,220,1);this.idleAccent(icon,0,7,.3,1.5);text(s,'Your coin ledger is ready',0,-20,820,90,40,COLORS.gold,true);text(s,'Collect a reward or play a round.\nYour coin activity will appear here.',0,-132,820,142,34);this.art.button(s,'Ledger rewards',0,-302,730,108,'Explore rewards',2,()=>{this.closeModal();void this.navigate('rewards');},0);}}
  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void{const s=this.sheet('Canopy post',590);this.art.image(s,'interfaces',0,97,225,175,5);text(s,'Welcome to Golden Canopy. Your daily gifts\nare waiting in Rewards.',0,-55,820,158,41);this.art.button(s,'Open rewards',0,-200,690,106,'Visit Rewards',2,()=>{this.closeModal();void this.navigate('rewards');});}
  private rules(band=0,features=false):void{
    this.auto=false;this.updateAuto();const cfg=this.config,s=this.sheet(cfg.name+' · Rules',1480);
    const tabs=this.art.button(s,'Payout rules',-219,550,413,87,'PAYOUTS',0,()=>this.rules(band,false),features?0:3);
    this.art.button(s,'Feature rules',219,550,413,87,'FEATURES',2,()=>this.rules(band,true),features?3:0);
    text(s,'COIN AWARDS AT BET '+money(this.bet),0,458,820,60,35,COLORS.gold,true);
    if(features){
      const coin=(n:number)=>exactMoney(Math.round(this.bet*n*cfg.payoutScale));
      const notes:Record<GameId,[string,string,string]>={
        'golden-hour':['3+ SAFES · VAULT PICK','Safes pay '+coin(1)+' coins. The vault adds one of:\n'+[1,2,3,5,8,12].map(coin).join(' · '),'Choose one of three vaults to reveal your prize.\nThe award is already drawn; choice does not change the odds.'],
        'jade-treasury':['6+ COINS · LOCK & RESPIN','Each locked coin is worth one of:\n'+[.1,.2,.4,1,2].map(coin).join(' · ')+' coins.','Start with 3 respins. A new coin resets them to 3.\nAll 15 positions filled adds '+coin(20)+' coins.\nThe feature ends after 40 rounds at most.'],
        'pearl-palace':['3+ SAFES · 5 BONUS SPINS','Safe awards: 3 = '+coin(1)+' · 4 = '+coin(2)+'\n5 or more = '+coin(4)+' coins.','Five included bonus spins, with one full WILD column each.\nBonus spins cannot retrigger.\nWinning ways multiply across consecutive reels from the left.'],
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
      if(cluster)this.art.button(s,'Change payout band',0,-443,776,87,band?'Show groups 5–9':'Show groups 10–25',9,()=>this.rules(band?0:1,false),0);
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
  private closeModal():void{if(this.modal){this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,2);text(n,message,0,0,916,144,36);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
