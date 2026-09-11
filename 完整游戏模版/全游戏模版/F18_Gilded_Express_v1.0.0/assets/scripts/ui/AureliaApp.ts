import { _decorator, BlockInputEvents, Color, Component, EditBox, EffectAsset, resources, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
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
import { RailwayAmbience } from '../vfx/RailwayAmbience';
import { StationFloat } from '../vfx/StationFloat';
import { SalonWinStage } from '../vfx/SalonWinStage';
import { SafeAreaAdapter as Safe } from './SafeAreaAdapter';
import { SalonArt, box, text, opacity, bindPress, outlined, COLORS } from './SalonArt';
import { CABINETS, CABINET_ROOM_WIDTH, CABINET_ROOM_HEIGHT, imagePoint, cabinetLayout, type Box } from './CabinetGeometry';
import { LEGAL_SECTIONS, type LegalPage } from './LegalContent';
const { ccclass } = _decorator;
type Page = 'login'|'register'|'home'|'store'|'rewards'|'rank'|'profile'|'game';
type State = {kind:'idle'}|{kind:'spinning';requestId:string}|{kind:'presenting';result:SpinResult}|{kind:'retry';requestId:string};
const MODES = ['3 reels · Match the centre line.', 'Lock gold. Keep the treasure.', '1,024 ways. Next stop: treasure.', 'Clusters tumble. Multipliers grow.'];
const exactMoney=(n:number):string=>Math.floor(n).toLocaleString('en-US');
const money=(n:number):string=>{const v=Math.floor(n),a=Math.abs(v);if(a<1000000)return exactMoney(v);const unit=a>=1000000000?1000000000:1000000;return (Math.trunc(v/unit*100)/100).toFixed(2).replace(/\.?0+$/,'')+(unit===1000000000?'B':'M');};
@ccclass('AureliaApp')
export class AureliaApp extends Component {
  private art=new SalonArt();private stationFloatEffect?:EffectAsset; private services!:GameBootstrap;private root?:Node;private content?:Node;private bg?:Node;
  private retiring?:Node;private modal?:Node;private notification?:Node;private reels?:SalonReels;private plane?:Node;private autoLamp?:Label;private soundLamp?:Label;
  private page:Page='login';private config:GameConfig=GAME_CONFIGS[0];private state:State={kind:'idle'};
  private authExpanded=false;private selectedRoute=0;private selectedBundle=0;private curtainClosed=false;private betIndex=1;private auto=false;private autoWait=0;private visible=true;private busy=false;private generation=0;
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
    text(loading,'GILDED EXPRESS',0,90,950,160,80,COLORS.gold,true);
    const progress=text(loading,'Warming up the golden engine…',0,-70,950,100,38);
    try{
      await this.art.load([...GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),symbolAtlas(c.id)+'-blur',prizeArt(c.id)]),'salon','symbols','interfaces','portraits','symbols-blur','optics','apple-mark','express-brand',...Array.from({length:4},(_,i)=>'express-title-'+i),'express-train','express-steam','express-services',...Array.from({length:16},(_,i)=>'express-button-'+i),'express-hall-soft',...Array.from({length:4},(_,i)=>'express-soft-plate-'+i)],(n,t)=>{
        progress.string=`Loading treasure carriages  ${Math.round(n/t*100)}%`;
        globalThis.dispatchEvent?.(new CustomEvent('aurelia-load-progress',{detail:{progress:n/t*.9}}));
      });
      this.stationFloatEffect=await new Promise<EffectAsset>((resolve,reject)=>resources.load('effects/station-float',EffectAsset,(error,effect)=>error?reject(error):resolve(effect)));
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
    }catch(error){progress.string='Could not open the station. Tap to retry.';loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
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
    const previous=this.root;if(previous){const a=opacity(previous,255);Tween.stopAllByTarget(a);a.opacity=255;for(const edit of previous.getComponentsInChildren(EditBox))edit.enabled=false;}
    if(this.retiring&&this.retiring!==previous)this.retiring.destroy();this.retiring=previous;
    this.height=Safe.visibleHeight;this.top=this.height/2;
    const root=box(this.node,'Golden-Express-interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='home'?'express-hall-soft':this.page==='login'||this.page==='register'?'salon':'express-services';
    this.bg=this.page==='game'||this.page==='home'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);

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
      if(config){loading=this.gameLoading(config);await Promise.all([this.art.load([config.id+'-tall'],(done,total)=>this.loadingProgress?.(done/total*.8,'Preparing your game…')),this.delay(this.reduced?.15:1.65)]);}

      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(.9,'Opening your game…');}if(!this.reduced)await this.delay(.4);
      if(loading){this.loadingProgress?.(1,'Ready');await this.delay(this.reduced?.01:.65);await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.32,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.busy=false;}
  }
  private gameLoading(config:GameConfig):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);
    this.art.cover(n,'express-hall-soft',0,0,Safe.visibleWidth,this.height);
    const veil=box(n,'Boarding veil',0,0,Safe.visibleWidth,this.height).addComponent(Graphics);veil.fillColor=new Color(19,44,52,202);veil.rect(-Safe.visibleWidth/2,-this.height/2,Safe.visibleWidth,this.height);veil.fill();
    const stage=box(n,'Departure loading stage',0,0,1020,1330);const scale=Math.min(1,(Safe.visibleWidth-65)/1020,(this.height-230)/1330);stage.setScale(scale,scale,1);
    const logo=this.art.image(stage,'express-brand',0,459,730,231);this.idleAccent(logo,0,8,.4);
    const ticket=this.art.panel(stage,0,167,890,251,0);this.art.image(ticket,'portraits',-318,0,179,179,GAME_CONFIGS.indexOf(config));
    text(ticket,'NOW BOARDING',95,57,617,57,31,COLORS.ink);text(ticket,config.name,95,-26,626,92,50,COLORS.ink,true);
    const runway=box(stage,'Animated railway',0,-102,1140,420);runway.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    const tracks=box(runway,'Rail sleepers',0,0,1140,60).addComponent(Graphics);tracks.strokeColor=new Color('#A66A38');tracks.lineWidth=7;
    for(let x=-560;x<560;x+=53){tracks.moveTo(x,-177);tracks.lineTo(x+12,-144);}tracks.stroke();tracks.strokeColor=new Color('#E3BB70');tracks.lineWidth=5;tracks.moveTo(-570,-147);tracks.lineTo(570,-147);tracks.moveTo(-570,-174);tracks.lineTo(570,-174);tracks.stroke();
    const train=this.art.image(runway,'express-train',-280,-30,830,260);train.name='Boarding locomotive';
    if(!this.reduced){for(let i=0;i<4;i++){const steam=box(train,'Steam puff',245,110,60,60),g=steam.addComponent(Graphics);g.fillColor=new Color('#FFF6DF');g.circle(0,0,21+i*3);g.fill();const alpha=opacity(steam,0);tween(steam).delay(i*.32).repeatForever(tween().set({position:new Vec3(245,110,0),scale:new Vec3(.4,.4,1)}).to(1.5,{position:new Vec3(155,233,0),scale:new Vec3(1.45,1.45,1)},{easing:'sineOut'})).start();tween(alpha).delay(i*.32).to(.28,{opacity:130}).to(1.22,{opacity:0}).union().repeatForever().start();}}
    const status=text(stage,'Preparing your carriage…',0,-389,960,71,37,COLORS.cream);
    const rail=box(stage,'Departure progress track',0,-489,820,38).addComponent(Graphics);rail.fillColor=new Color('#B38A4A');rail.roundRect(-410,-19,820,38,19);rail.fill();rail.fillColor=new Color('#1B3238');rail.roundRect(-404,-13,808,26,13);rail.fill();
    const fill=box(stage,'Loading bar fill',0,-489,808,26).addComponent(Graphics),percentage=text(stage,'0%',0,-554,280,57,35,COLORS.cream);percentage.node.name='Loading percentage';
    const progress={value:0};let target=0;
    const draw=()=>{if(!n.isValid)return;const width=802*progress.value;fill.clear();if(width>0){fill.fillColor=new Color('#EDC875');fill.roundRect(-401,-10,width,20,Math.min(10,width/2));fill.fill();}train.setPosition(-280+progress.value*480,-30);percentage.string=Math.round(progress.value*100)+'%';};
    this.loadingProgress=(value,caption)=>{target=Math.max(target,Math.min(1,value));status.string=target===1?'All aboard!':caption;Tween.stopAllByTarget(progress);if(this.reduced){progress.value=target;draw();}else tween(progress).to(.5,{value:target},{easing:'sineInOut',onUpdate:draw}).start();};draw();return n;
  }
  private header():void{
    const p=this.services.profile.current(),y=this.top-92-Safe.safeTop;
    const wallet=this.art.panel(this.content!,-235,y,525,107,2);
    this.art.image(wallet,'symbols',-194,0,70,70,0);
    this.balanceLabel=text(wallet,money(this.services.economy.balance()),-4,0,298,76,46,COLORS.cream);
    const topup=this.art.image(wallet,'express-button-2',202,0,74,74);topup.name='Top up';bindPress(topup,topup,()=>void this.navigate('store'));
    this.art.button(this.content!,'Mail',95,y,87,87,'',5,()=>this.mail());
    const avatar=this.art.image(this.content!,'portraits',431,y,109,109,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    outlined(text(this.content!,p?.nickname??'Guest',266,y,208,69,27,COLORS.cream),'#173F49',2);
  }
  private navigation():void{
    const nav=this.art.panel(this.content!,0,-this.top+96+Safe.safeBottom,1050,160,0);
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Luggage','Rewards','Station','Honours','Account'],icons=[1,2,6,3,4];
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
    const stage=box(this.content!,'Living railway world',0,-35,1024,1536);stage.setSiblingIndex(0);
    const scale=Math.min((Safe.visibleWidth-80)/1200,(this.height-480-Safe.safeTop-Safe.safeBottom)/1450);stage.setScale(scale,scale,1);
    const scenery=this.art.image(stage,'express-hall-soft',0,0,2048,3072);const floating:Node[]=[];
    const logo=this.art.image(this.content!,'express-brand',0,this.top-255-Safe.safeTop,620,190);this.idleAccent(logo,0,18,.3,1.5);this.sheen(logo,580,158);
    outlined(text(this.content!,'CHOOSE YOUR WORLD · TAP PLAY',0,this.top-383-Safe.safeTop,930,59,29,COLORS.cream),'#253B42',3);
    const stations=[[176,337,410,47],[838,632,414,47],[175,953,406,45],[844,1312,414,45]];
    GAME_CONFIGS.forEach((cfg,i)=>{
      const anchor=box(stage,'Floating station '+cfg.id,0,0,0,0);floating.push(anchor);
      const [x,y,w,h]=stations[i],hit=box(anchor,'Play '+cfg.name,x-512,768-y+92,390,257);
      const label=text(anchor,cfg.name,x-512,768-y,w-24,h-4,34,COLORS.ink,true);label.lineHeight=36;label.enableWrapText=false;label.overflow=Label.Overflow.SHRINK;
      // The lettering and hit region share the artwork's transform. No floating card covers the station.
      const glow=box(hit,'Station invitation',0,-92,w,h);this.metalEdges(glow,w,h,i*.65);
      bindPress(hit,glow,()=>void this.navigate('game',cfg));
      const enter=this.art.button(anchor,'Enter '+cfg.name,x-512,768-y-69,292,88,'PLAY',0,()=>void this.navigate('game',cfg),i%2?2:3);this.sheen(enter,258,63,i*.75);
      const lamp=this.art.light(anchor,3,x-512+(i%2?-153:151),768-y+26,64,64,0),alpha=lamp.getComponent(UIOpacity)!;
      if(!this.reduced)tween(alpha).delay(i*.7).repeatForever(tween().to(.9,{opacity:245}).to(1.7,{opacity:12}).delay(1.1)).start();
    });
    if(this.stationFloatEffect)stage.addComponent(StationFloat).setup(scenery.getComponent(Sprite)!,this.stationFloatEffect,floating,this.reduced);
    const stationFX=box(stage,'Living station materials',0,0,2048,3072).addComponent(RailwayAmbience);stationFX.reducedMotion=this.reduced;stationFX.setup(this.art);
    const dust=box(stage,'Railway light dust',0,0,1024,1536).addComponent(SalonAtmosphere);dust.setup(this.art,1000,1400,false,14);dust.reducedMotion=this.reduced;
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
    const register=this.page==='register';this.authDecor();
    const stage=box(this.content!,'Conductor sign-in ticket',0,30,1020,1640);
    const scale=Math.min(1,(this.height-260-Safe.safeTop-Safe.safeBottom)/1640,(Safe.visibleWidth-45)/1020);stage.setScale(scale,scale,1);
    const logo=this.art.image(stage,'express-brand',0,655,register?770:760,register?280:250);this.idleAccent(logo,0,11,.5);this.sheen(logo,710,190);
    if(!register&&!this.authExpanded){
      const welcome=outlined(text(stage,'YOUR NEXT FORTUNE',0,-267,912,82,47,COLORS.cream,true),'#1B303C',3);
      text(stage,'One ticket. Four golden journeys.',0,-339,875,59,31,COLORS.cream);
      const enter=this.art.button(stage,'Open sign-in',0,-454,864,147,'SIGN IN & BOARD',0,()=>{this.authExpanded=true;this.render();},3);this.sheen(enter,820,120);this.idleAccent(enter,0,4,.25);
      const apple=this.art.panel(stage,0,-598,790,109,1);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-231,0,42,49);text(apple,'Sign in with Apple',43,0,484,78,35,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));
      this.art.button(stage,'Guest',-210,-717,393,91,'Guest play',0,()=>this.guestConsent(),0);
      this.art.button(stage,'Create account',210,-717,393,91,'Register',4,()=>void this.navigate('register'),0);
    }else{
    const panel=this.art.panel(stage,0,register?-60:-105,906,register?1130:860,0);
    this.metalEdges(panel,886,register?1108:830,0);
    if(!register)this.art.button(panel,'Close sign-in',387,363,75,75,'',9,()=>{this.authExpanded=false;this.render();},0);
    text(panel,register?'JOIN THE GOLDEN LINE':'YOUR BOARDING PASS',register?0:-28,register?462:361,register?860:690,83,47,COLORS.ink,true);
    text(panel,register?'Create your passenger account':'Sign in for your next golden departure',0,register?385:284,840,58,31,COLORS.ink);
    this.field(panel,'Username',register?274:185,this.draft.username,v=>this.draft.username=v);
    this.field(panel,'Password · 10–72 characters',register?145:56,this.draft.password,v=>this.draft.password=v,true);
    if(register){
      this.field(panel,'Confirm password',16,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);
      this.field(panel,'Nickname',-113,this.draft.nickname,v=>this.draft.nickname=v);
      const check=this.art.button(panel,'Accept terms',-337,-232,91,91,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1),mark=opacity(check,this.draft.acceptedTerms?255:65);
      text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',65,-232,649,84,29,COLORS.ink);
      this.art.button(panel,'Create account',0,-357,789,109,'CREATE ACCOUNT',4,()=>void this.authAction('register'),3);
      this.art.button(panel,'Switch account form',0,-478,789,82,'Back to sign in',9,()=>void this.navigate('login'),0);
    }else{
      const primary=this.art.button(panel,'Sign in',0,-100,800,123,'SIGN IN',14,()=>void this.authAction('login'),3);this.sheen(primary,760,110);
      const apple=this.art.panel(panel,0,-248,800,107,1);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-205,0,44,51);text(apple,'Sign in with Apple',47,0,486,76,38,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));
      this.art.button(panel,'Guest',-205,-360,390,94,'Guest play',0,()=>this.guestConsent(),0);
      this.art.button(panel,'Create account',205,-360,390,94,'Register',4,()=>void this.navigate('register'),0);
    }
    }
    const links=box(this.content!,'Legal links',0,-this.top+150+Safe.safeBottom,990,86);
    ['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*320,0,305,78,t,7,()=>this.legal(['terms','privacy','support'][i] as LegalPage),0));
    outlined(text(this.content!,'Virtual coins · No cash prizes · Eligible adults only',0,-this.top+62+Safe.safeBottom,1000,50,26,COLORS.ink),'#FFF3DA',2);
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

    const titlePoint=imagePoint(g.title),title=this.art.image(this.plane,'express-title-'+GAME_CONFIGS.indexOf(cfg),titlePoint[0],titlePoint[1],g.title[2]*.96,g.title[3]*.94);
    title.name='Animated cabinet title · '+cfg.name;
    this.idleAccent(title,GAME_CONFIGS.indexOf(cfg),3,.4);
    this.sheen(title,title.getComponent(UITransform)!.width,title.getComponent(UITransform)!.height,GAME_CONFIGS.indexOf(cfg)*.65);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onStop=(column)=>{this.audio.play('reel-stop');ambient.land(column);};
    const balance=imagePoint(g.balance);this.art.panel(this.plane,balance[0],balance[1],g.balance[2]+17,g.balance[3]+15,1);
    this.balanceLabel=text(this.plane,money(this.services.economy.balance()),balance[0]-g.balance[2]*.065,balance[1],g.balance[2]*.55,g.balance[3]*.82,36,'#59351B');this.balanceLabel.enableWrapText=false;this.balanceLabel.overflow=Label.Overflow.SHRINK;this.balanceLabel.lineHeight=51;
    const recharge=this.art.image(this.plane,'express-button-'+(GAME_CONFIGS.indexOf(cfg)*4+2),balance[0]+g.balance[2]*.41,balance[1],60,60);recharge.name='Recharge';bindPress(recharge,recharge,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const win=imagePoint(g.win);this.art.panel(this.plane,win[0],win[1],g.win[2]+20,g.win[3]+18,1);this.winLabel=text(this.plane,'WIN  0',win[0],win[1],g.win[2]*.65,g.win[3]*.84,34,'#803F25');this.winLabel.enableWrapText=false;this.winLabel.overflow=Label.Overflow.SHRINK;
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
    const betCaption=outlined(text(betPanel,'BET',-g.bet[2]*.17,0,g.bet[2]*.25,g.bet[3]*.8,28,readoutInk),readoutOutline,1);
    betCaption.fontFamily='Arial Black';betCaption.enableWrapText=false;betCaption.overflow=Label.Overflow.SHRINK;
    this.betLabel=outlined(text(betPanel,money(this.bet),g.bet[2]*.16,0,g.bet[2]*.30,g.bet[3]*.82,35,readoutInk),readoutOutline,1);
    this.betLabel.fontFamily='Arial Black';this.betLabel.enableWrapText=false;this.betLabel.overflow=Label.Overflow.SHRINK;
    const ctl=(rect:Box,label:string,index:number,action:()=>void):Node=>{
      const pos=imagePoint(rect);const hit=box(this.plane!,label,pos[0],pos[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset='express-button-'+(theme*4+[0,2,1,3][index]);
      const face=this.art.image(hit,asset,0,0,rect[2],rect[3]);
      this.cabinetButtonMotion(face,rect[2],rect[3],theme,index);
      bindPress(hit,face,()=>{this.audio.play('tap');ambient.land(index);action();},[
        {depth:5,compression:.97,release:.12,tilt:-3},
        {depth:7,compression:.985,release:.14,tilt:0},
        {depth:4,compression:.94,release:.23,tilt:2},
        {depth:4,compression:.96,release:.18,tilt:-2},
      ][theme]);return hit;
    };
    ctl(g.minus,'Decrease bet',2,()=>this.changeBet(-1));ctl(g.plus,'Increase bet',1,()=>this.changeBet(1));
    const spin=ctl(g.spin,'SPIN',0,()=>void this.spin());
    if(cfg.id==='jade-treasury'){const lever=box(this.plane,'Spin lever',896*1.5-768,1152-810*1.5,95*1.5,118*1.5);const feedback=box(lever,'Lever feedback',0,0,95,118);bindPress(lever,feedback,()=>{this.audio.play('tap');ambient.land(0);void this.spin();});}
    const auto=ctl(g.auto,'AUTO',3,()=>{this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');if(this.auto&&this.state.kind==='idle')void this.spin();});
    const autoStatus=imagePoint(g.status);this.art.panel(this.plane,autoStatus[0],autoStatus[1],g.status[2]+18,g.status[3]+16,1);this.autoLamp=text(this.plane,'AUTO OFF',autoStatus[0],autoStatus[1],g.status[2]*.67,g.status[3]*.84,23,readoutInk);this.autoLamp.enableWrapText=false;this.autoLamp.overflow=Label.Overflow.SHRINK;this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const topPanel=display('TOP WIN display',g.topWin,themeIndex*4+1);
    this.topWinLabel=outlined(text(topPanel,'TOP WIN '+money(this.services.profile.current()?.biggestWin??0),0,0,g.topWin[2]*.65,g.topWin[3]*.76,29,readoutInk),readoutOutline,1);
    this.topWinLabel.fontFamily='Arial';this.topWinLabel.lineHeight=34;this.topWinLabel.enableWrapText=false;this.topWinLabel.overflow=Label.Overflow.SHRINK;
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
      const banner=this.art.panel(this.plane!,screen[0],screen[1]-g.screen[3]/2+120,Math.min(680,g.screen[2]-24),204,0);banner.name='Ordinary win celebration';
      const badge=this.art.image(banner,symbolAtlas(this.config.id),-230,0,134,134,[8,14,7,2][GAME_CONFIGS.indexOf(this.config)]);
      text(banner,amount/this.bet>=5?'NICE WIN':'WIN',55,49,420,60,38,'#5B3427',true);
      const total=outlined(text(banner,'0',55,-30,422,94,money(amount).length>9?48:68,'#573225',false),'#FFF2D6',1);
      this.reveal(banner);this.metalEdges(banner,650,190,0);if(!this.reduced){tween(badge).to(.3,{scale:new Vec3(1.16,1.16,1)},{easing:'backOut'}).to(.4,{scale:new Vec3(1,1,1)}).start();
        for(let i=0;i<8;i++){const spark=this.art.light(banner,3,(i%2?1:-1)*(225+i*9),(i-4)*18,50,50,190);tween(spark).by(.65,{position:new Vec3((i%2?1:-1)*45,65,0),angle:90}).start();tween(opacity(spark,190)).to(.85,{opacity:0}).start();}}
      try{if(this.reduced){total.string=money(amount);if(label)label.string='WIN  '+money(amount);await this.delay(.8);}
      else{const v={n:0};await new Promise<void>(resolve=>tween(v).to(.85,{n:amount},{easing:'expoOut',onUpdate:()=>{total.string=money(v.n);if(label?.isValid)label.string='WIN  '+money(v.n);}}).call(()=>resolve()).start());total.string=money(amount);if(label?.isValid)label.string='WIN  '+money(amount);await this.delay(.65);tween(opacity(banner,255)).to(.2,{opacity:0}).start();await this.delay(.2);}}
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
  private count(label:Label,total:number,from=0):void{Tween.stopAllByTarget(label);if(this.reduced){label.string=money(total);return;}tween(label).to(.85,{}, {onUpdate:(_target,ratio)=>{if(label.isValid)label.string=money(from+(total-from)*(1-Math.pow(1-(ratio??0),3)));}}).call(()=>{if(label.isValid)label.string=money(total);}).start();}
  private rewardArrival(before:number,after:number):void{
    if(this.balanceLabel)this.count(this.balanceLabel,after,before);
    if(this.reduced||!this.root||!this.balanceLabel)return;
    const target=this.root.getComponent(UITransform)!.convertToNodeSpaceAR(this.balanceLabel.node.worldPosition);
    for(let i=0;i<9;i++){const coin=this.art.image(this.root,'symbols',(i-4)*25,-110,54,54,0);coin.name='Reward arrival coin';const o=opacity(coin,0);tween(o).delay(i*.045).to(.12,{opacity:255}).delay(.58).to(.16,{opacity:0}).start();tween(coin).delay(i*.045).to(.2,{position:new Vec3((i-4)*39,15,0)},{easing:'sineOut'}).to(.65,{position:target,scale:new Vec3(.4,.4,1)},{easing:'quadIn'}).call(()=>coin.destroy()).start();}
  }
  private storePage():void{
    const stage=this.pageStage('Treasure luggage service');text(stage,'THE LUGGAGE CAR',0,615,730,91,40,COLORS.ink,true);text(stage,'Choose the treasure for your journey',0,534,950,61,32,COLORS.ink);
    const stamp=this.generation;void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;const chosen=items[this.selectedBundle]??items[0];
      const stand=this.art.panel(stage,0,145,920,646,0);const cargo=this.art.image(stand,'symbols',0,133,356,356,[9,1,5,6][this.selectedBundle]);this.breathe(cargo);this.edgeJewels(cargo,328,321);
      text(stand,chosen.label,0,-89,847,68,43,COLORS.ink,true);this.count(text(stand,money(chosen.credits+chosen.bonus)+'',0,-166,850,82,61,COLORS.ink,true),chosen.credits+chosen.bonus);
      this.art.button(stand,'Buy '+chosen.id,0,-265,731,103,chosen.available?chosen.displayPrice:'Purchases unavailable',1,()=>void this.purchase(chosen.id),3);
      items.forEach((item,i)=>{const n=this.art.panel(stage,(i-1.5)*237,-328,222,197,i===this.selectedBundle?2:0);n.name='Bundle '+item.id;const gift=this.art.image(n,'symbols',0,31,112,112,[9,1,5,6][i]);this.idleAccent(gift,i*.5,5,3);text(n,['PURSE','BULLION','TRUNK','VAULT'][i],0,-61,209,46,26,i===this.selectedBundle?COLORS.cream:COLORS.ink);bindPress(n,n,()=>{this.selectedBundle=i;this.render();});});
    }).catch(()=>this.toast('Shop unavailable. Please try again.'));
    this.art.button(stage,'Synchronize purchases',0,-609,840,97,'Restore unfinished purchases',13,()=>void this.services.store.restore().then(r=>{this.refreshBalance();this.toast(r.message);}),0);
  }

  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}finally{this.busy=false;}}
  private rewardsPage():void{
    const stage=this.pageStage('Seven-stop reward railway');text(stage,'SEVEN STOPS OF GOLD',0,615,730,93,38,COLORS.ink,true);
    const progress=this.services.save.currentScope()?.checkIn,today=new Date().toISOString().slice(0,10),claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);
    text(stage,'DAY '+(active+1)+(claimed?' · COLLECTED':' · READY TO COLLECT'),0,529,957,62,34,COLORS.ink,true);
    const ticket=this.art.panel(stage,0,100,965,735,0);text(ticket,'YOUR WEEKLY RAIL PASS',0,295,890,61,38,COLORS.ink,true);
    this.services.checkIn.rewards.forEach((amount,i)=>{const x=i<4?-342+i*228:-302+(i-4)*302,y=i<4?125:-144,w=i<4?211:281,done=i<active||(i===active&&claimed),current=i===active;
      const stop=box(ticket,'Check-in day '+(i+1),x,y,w,260);const seal=this.art.panel(stop,0,12,w-25,145,current?2:1);
      text(stop,'DAY '+(i+1),0,109,w-12,43,33,COLORS.ink,true);const gift=this.art.image(seal,done?'interfaces':'symbols',0,0,91,91,done?14:i===6?5:0);this.idleAccent(gift,i*.5,4,2);
      text(stop,money(amount),0,-79,w-12,37,34,COLORS.ink,true);text(stop,done?'CLAIMED':current?'TODAY':'LOCKED',0,-117,w-12,29,24,COLORS.ink);
      if(current&&!claimed)this.metalEdges(seal,w-40,131,0);bindPress(stop,stop,()=>{if(current&&!claimed)void this.claim('check-in');else this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Available on a later day'));});
    });
    this.art.button(stage,'Check in',0,-350,871,110,claimed?'DAY '+(active+1)+' · COLLECTED':'CLAIM DAY '+(active+1)+' · '+money(this.services.checkIn.rewards[active]),14,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next departure after 00:00 UTC.');},3);
    const daily=this.art.panel(stage,0,-551,947,210,2);const bag=this.art.image(daily,'symbols',-339,0,161,161,9);this.breathe(bag);text(daily,'DAILY LUGGAGE · 5,000',101,54,634,57,34,COLORS.cream,true);this.art.button(daily,'Claim daily',99,-44,618,93,this.services.save.currentScope()?.claims['daily-free:'+today]?'Gift collected':'Collect daily luggage',2,()=>void this.claim('daily'),0);
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
    const stage=this.pageStage('First-class honours');text(stage,'THE HONOURS EXPRESS',0,615,730,92,36,COLORS.ink,true);
    text(stage,this.services.remoteMode?'Verified settled winnings':'Real winnings on this device',0,532,950,58,31,COLORS.ink);
    const stamp=this.generation;const render=(rows=this.services.rank.list('all-time',this.services.profile.current())):void=>{if(stamp!==this.generation)return;
      const trophy=this.art.image(stage,'interfaces',0,345,246,246,3);this.breathe(trophy);this.edgeJewels(trophy,228,232);
      if(!rows.length){text(stage,'Your first settled win\nstarts your honours journey.',0,87,859,148,41,COLORS.ink,true);this.art.button(stage,'Explore games',0,-108,742,108,'Choose a departure',6,()=>void this.navigate('home'),3);return;}
      const leader=rows[0],hero=this.art.panel(stage,0,105,906,192,2);this.art.image(hero,'portraits',-323,0,135,135,leader.avatar);text(hero,'#1  '+leader.nickname,73,45,669,63,40,COLORS.cream,true);this.count(text(hero,money(leader.winnings)+'',73,-32,669,69,48,COLORS.gold,true),leader.winnings);this.metalEdges(hero,883,173,0);
      rows.slice(1,5).forEach((r,i)=>{const row=this.art.panel(stage,0,-87-i*134,920,117,r.current?2:0),ink=r.current?COLORS.cream:COLORS.ink;this.art.image(row,'portraits',-267,0,91,91,r.avatar);text(row,'#'+r.rank,-385,0,121,64,33,ink,true);text(row,r.nickname,-11,0,370,65,32,ink);this.count(text(row,money(r.winnings),291,0,196,63,31,ink,true),r.winnings);this.reveal(row,i*.1);});
      if(rows.length===1){const ticket=this.art.panel(stage,0,-191,831,261,0);this.art.image(ticket,'interfaces',-272,0,147,147,0);text(ticket,'Your next golden record\nstarts at the station.',116,28,543,108,36,COLORS.ink,true);this.art.button(ticket,'Explore games',108,-76,527,76,'Choose a departure',6,()=>void this.navigate('home'),3);}
    };if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load honours.'));else render();
  }

  private profilePage():void{
    const stage=this.pageStage('Passenger club'),p=this.services.profile.current();if(!p)return;text(stage,'THE FIRST-CLASS CLUB',0,614,730,92,36,COLORS.ink,true);
    const face=this.art.image(stage,'portraits',0,405,271,271,p.avatar);this.breathe(face);this.edgeJewels(face,255,253);bindPress(face,face,()=>this.avatars());
    const strip=this.art.panel(stage,0,204,864,103,2);text(strip,p.nickname,0,0,815,78,46,COLORS.cream,true);
    text(stage,p.isGuest?'GUEST PASSENGER':'FIRST-CLASS MEMBER',0,113,866,52,29,COLORS.ink);
    [p.totalWin,p.biggestWin].forEach((v,i)=>{const n=this.art.panel(stage,i?241:-241,-3,458,145,0);text(n,i?'TOP WIN':'TOTAL WON',0,35,424,44,28,COLORS.ink);this.count(text(n,money(v),0,-26,424,63,44,COLORS.ink,true),v);});
    const links:[string,number,()=>void][]=[['Choose portrait',4,()=>this.avatars()],['Coin ledger',1,()=>this.history()],['Privacy & help',7,()=>this.legal('privacy')],['Sign out',9,()=>void this.signOut()]];
    links.forEach(([label,icon,action],i)=>{const n=this.art.button(stage,label,i%2?242:-242,-200-Math.floor(i/2)*172,458,137,label,icon,action,0);this.metalEdges(n,438,120,i*.6);this.reveal(n,i*.08);});
    this.art.button(stage,'Delete account',0,-598,585,86,'Delete account',15,()=>this.deleteAccount(),2);
  }

  private async signOut():Promise<void>{
    if(this.busy)return;this.services.auth.logout();this.authExpanded=false;this.draft.password=this.draft.confirmPassword='';await this.navigate('login');
  }
  private avatars():void{const s=this.sheet('Choose your portrait',1110);for(let i=0;i<4;i++){const n=this.art.image(s,'portraits',(i%2-.5)*330,180-Math.floor(i/2)*350,270,270,i);bindPress(n,n,()=>void this.services.profile.setAvatar(i).then(ok=>{if(ok){this.render();this.audio.play('win');this.toast('Portrait saved to your account.');}else this.toast('Portrait could not be saved.');}));}}
  private history():void{const s=this.sheet('Your coin ledger',1190);const rows=this.services.save.currentScope()?.transactions.slice(-7).reverse()??[];rows.forEach((r,i)=>{const n=this.art.panel(s,0,394-i*132,840,115,1);text(n,r.type.replace(/-/g,' '),-178,0,425,90,31,COLORS.jade);text(n,(r.amount>0?'+':'')+exactMoney(r.amount),233,0,326,79,36,COLORS.ink);});if(!rows.length)text(s,'Your coin activity will appear here.',0,0,850,160,40);}
  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void{const s=this.sheet('Station post',590);this.art.image(s,'interfaces',0,97,225,175,5);text(s,'Welcome to Gilded Express. Your daily gifts\nare waiting in Rewards.',0,-55,820,158,41);this.art.button(s,'Open rewards',0,-200,690,106,'Visit Rewards',2,()=>{this.closeModal();void this.navigate('rewards');});}
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
    symbols.forEach((sym,i)=>{const y=206-i*96;this.art.image(s,symbolAtlas(this.config.id),-346,y,83,83,SYMBOL_ART[sym.id]);const pay=this.config.paytable[sym.id];text(s,sym.label,-141,y,308,69,29);text(s,Object.entries(pay??{}).map(([n,v])=>`${n}: ${v}×`).join(' · '),177,y,488,81,27);});
    text(s,'Values above are raw paytable factors. Payout scale and\nline/ways divisors apply; all awards use whole coins.\nVirtual coins only. No cash-out. Take regular breaks.',0,-512,890,161,31);
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
