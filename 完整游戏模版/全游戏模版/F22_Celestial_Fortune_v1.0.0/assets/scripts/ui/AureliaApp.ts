import {tr,language,setLanguage,initializeLanguage,LANGUAGES} from './Language';
import { _decorator, BlockInputEvents, Color, Component, EditBox, EventTouch, game, Game, Graphics, Label, Mask, Node, ScrollView, Sprite, sys, tween, Tween, UIOpacity, UITransform, Vec3, Widget } from 'cc';
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
import { hallStandings } from '../services/RankService';
import { INBOX_MESSAGES } from '../services/MailService';
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
const MODES = ['3 reels · Fortune bowl picks', '20 lines · Wish lock & respin', '1,024 ways · Lotus wild columns', '5+ clusters · Ingot cascades'];
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
    const loading=box(this.node,'Loading',0,0,1080,1920);
    const g=loading.addComponent(Graphics);g.fillColor=new Color('#EACCB2');g.rect(-1500,-2000,3000,4000);g.fill();
    text(loading,'CELESTIAL FORTUNE',0,90,950,160,80,COLORS.gold,true);
    const progress=text(loading,'Unlocking your treasury…',0,-70,950,100,38);
    try{
      await this.art.load([...GAME_CONFIGS.flatMap(c=>[symbolAtlas(c.id),symbolAtlas(c.id)+'-blur',prizeArt(c.id)]),'salon','symbols','interfaces','portraits','symbols-blur','optics','apple-mark','canopy-brand',...Array.from({length:4},(_,i)=>'canopy-title-'+i),'canopy-services',...Array.from({length:4},(_,i)=>'canopy-frame-'+i),...Array.from({length:16},(_,i)=>'canopy-button-'+i),'canopy-hall-soft','canopy-destinations',...Array.from({length:4},(_,i)=>'canopy-soft-plate-'+i)],(n,t)=>{
        progress.string=tr(`Polishing your treasures  ${Math.round(n/t*100)}%`);
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
    }catch(error){progress.string=tr('Could not open the treasury. Tap to retry.');loading.on(Node.EventType.TOUCH_END,()=>{loading.destroy();void this.boot();});globalThis.dispatchEvent?.(new Event('aurelia-load-error'));console.error(error);}
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
    const root=box(this.node,'Celestial-Fortune-interface',0,0,Safe.visibleWidth,this.height);this.root=root;root.addComponent(BlockInputEvents);
    const backdrop=this.page==='home'?'canopy-hall-soft':this.page==='login'||this.page==='register'?'salon':'canopy-services';
    this.bg=this.page==='game'?undefined:this.art.cover(root,backdrop,0,0,Safe.visibleWidth,this.height);

    if(this.page!=='game'){box(root,'Fortune coin atmosphere',0,0,Safe.visibleWidth,this.height).addComponent(CanopyLeaves).setup(this.art,Safe.visibleWidth,this.height,this.reduced);}
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
    if(this.busy)return;
    if(!config&&page===this.page)return;
    this.busy=true;this.auto=false;this.updateAuto();
    let loading:Node|undefined;
    try{
      if(config){
        const asset=config.id+'-tall',cached=this.art.isLoaded(asset);
        loading=this.gameLoading(config);
        // Keep a readable arrival beat, without replaying the cold-load wait for cached rooms.
        await Promise.all([this.art.load([asset],(done,total)=>this.loadingProgress?.(done/total*.8,'Preparing your game…')),this.delay(this.reduced?.05:cached?.28:.85)]);
      }

      if(config){this.config=config;this.betIndex=Math.min(this.betIndex,config.bets.length-1);}
      this.page=page;this.render();if(loading){loading.setSiblingIndex(this.node.children.length-1);this.loadingProgress?.(.9,'Opening your game…');}if(!this.reduced)await this.delay(.4);
      if(loading){this.loadingProgress?.(1,'Ready');await this.delay(this.reduced?.01:.46);await new Promise<void>(resolve=>tween(opacity(loading!,255)).to(this.reduced?.01:.26,{opacity:0},{easing:'sineInOut'}).call(()=>resolve()).start());loading.destroy();loading=undefined;}
    }catch{if(this.content)opacity(this.content,255);this.closeModal();this.toast('The cabinet could not load. Please try again.');}
    finally{if(loading?.isValid)loading.destroy();this.loadingProgress=undefined;this.busy=false;}
  }
  private gameLoading(config:GameConfig):Node{
    const n=box(this.node,'Game mode loading',0,0,Safe.visibleWidth,this.height);n.addComponent(BlockInputEvents);this.art.cover(n,'canopy-services',0,0,Safe.visibleWidth,this.height);
    const stage=box(n,'Filling the treasure bowl',0,0,1000,1300);const scale=Math.min((Safe.visibleWidth-90)/1000,(this.height-200)/1300);stage.setScale(scale,scale,1);
    const index=GAME_CONFIGS.indexOf(config),title=this.art.image(stage,'canopy-title-'+index,0,464,820,190);this.sheen(title,680,105);
    const bowl=this.art.image(stage,prizeArt(config.id),0,-40,610,465);this.idleAccent(bowl,0,7,0,3.6);
    for(let i=0;i<7;i++){const coin=this.art.image(stage,symbolAtlas(config.id),(i%3-1)*123,205+i%2*49,64,64,0);opacity(coin,0);if(!this.reduced){const motion=()=>{if(!coin.isValid)return;coin.setPosition((i%3-1)*123,205+i%2*49);coin.setScale(1,1,1);coin.angle=0;opacity(coin,0);tween(opacity(coin,0)).delay(i*.2).to(.2,{opacity:255}).delay(.75).to(.25,{opacity:0}).start();tween(coin).delay(i*.2).to(1.2,{position:new Vec3((i%3-1)*28,-57,0),angle:150,scale:new Vec3(.58,.58,1)},{easing:'quadIn'}).delay(.5).call(motion).start();};motion();}}
    const rail=this.art.enamel(stage,0,-386,820,82);
    const well=box(rail,'Loading track inset',0,0,724,30),bed=well.addComponent(Graphics);bed.fillColor=new Color('#79502B');bed.roundRect(-362,-15,724,30,15);bed.fill();
    const clip=box(well,'Clipped loading aperture',0,0,712,22),mask=clip.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_STENCIL;
    const shape=clip.getComponent(Graphics)!;shape.fillColor=Color.WHITE;shape.roundRect(-356,-11,712,22,11);shape.fill();
    const fill=box(clip,'Loading bar fill',0,0,712,22).addComponent(Graphics);
    const percentage=text(stage,'0%',0,-485,450,80,50,COLORS.ink);percentage.node.name='Loading percentage';
    const status=text(stage,'Gathering good fortune…',0,-567,900,65,34,COLORS.ink);
    const progress={value:0};let target=0;const draw=()=>{if(!n.isValid)return;fill.clear();fill.fillColor=new Color('#E6A535');const value=Math.max(0,Math.min(1,progress.value)),w=712*value;if(w>0){fill.roundRect(-356,-11,w,22,Math.min(11,w/2));fill.fill();fill.fillColor=new Color('#FFECC0');fill.roundRect(-356,-2,w,6,Math.min(3,w/2));fill.fill();}percentage.string=tr(Math.round(value*100)+'%');};
    this.loadingProgress=(v,caption)=>{target=Math.max(target,Math.max(0,Math.min(1,Number.isFinite(v)?v:0)));status.string=tr(target===1?'Ready':caption);Tween.stopAllByTarget(progress);if(this.reduced){progress.value=target;draw();}else tween(progress).to(.4,{value:target},{easing:'sineInOut',onUpdate:draw}).start();};draw();return n;
  }

  private header():void{
    const p=this.services.profile.current(),y=this.top-92-Safe.safeTop;
    const wallet=this.art.panel(this.content!,-235,y,525,107,2);
    this.art.image(wallet,'symbols',-194,0,70,70,0);
    this.balanceLabel=text(wallet,money(this.services.economy.balance()),-4,0,298,76,46,COLORS.cream);
    const topup=this.art.image(wallet,'canopy-button-1',202,0,74,74);topup.name='Top up';bindPress(topup,topup,()=>void this.navigate('store'));
    const mail=this.art.button(this.content!,'Mail',95,y,87,87,'',10,()=>this.mail());
    this.refreshMailBadge(mail);
    const avatar=this.art.image(this.content!,'portraits',431,y,109,109,p?.avatar??0);bindPress(avatar,avatar,()=>void this.navigate('profile'));
    outlined(text(this.content!,p?.nickname??'Guest',266,y,208,69,27,COLORS.cream,false,true),'#173F49',2).enableWrapText=false;
  }
  private refreshMailBadge(button?:Node):void{
    const mail=button??this.content?.getChildByName('Mail');if(!mail?.isValid)return;
    const unread=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).read&&!this.services.mail.state(m.id).deleted).length;
    let dot=mail.getChildByName('Unread mail');
    if(!unread){if(dot)dot.active=false;return;}
    if(!dot){dot=box(mail,'Unread mail',32,32,44,44);const g=dot.addComponent(Graphics);g.fillColor=new Color('#A32129');g.circle(0,0,22);g.fill();text(dot,String(unread),0,0,40,40,27,COLORS.cream);}
    dot.active=true;const label=dot.getComponentInChildren(Label);if(label)label.string=String(unread);
  }
  private navigation():void{
    const nav=box(this.content!,'Garden cloud navigation',0,-this.top+132+Safe.safeBottom,984,206);
    // A soft pool of warm light rests on the garden floor without a rigid card edge.
    const mist=box(nav,'Warm cloud footing',0,-13,1000,190).addComponent(Graphics);
    for(let i=0;i<18;i++){mist.fillColor=new Color(255,247,222,9);mist.ellipse(0,0,500-i*7,94-i*3);mist.fill();}
    const pages:Page[]=['store','rewards','home','rank','profile'],labels=['Shop','Gifts','Garden','Honours','Account'],icons=[1,2,5,3,4];
    pages.forEach((page,i)=>{
      const center=i===2,active=page===this.page;
      const hit=box(nav,labels[i],(i-2)*160,0,156,184);
      if(active){const accent=box(hit,'Active garden marker',0,-62,42,6).addComponent(Graphics);accent.fillColor=new Color('#A8422D');accent.roundRect(-21,-3,42,6,3);accent.fill();}
      const icon=this.art.image(hit,'interfaces',0,48,center?111:88,center?102:88,icons[i]);
      const captionY=-25;
      const caption=outlined(text(hit,labels[i],0,captionY,150,50,36,'#35200F'),'#FFF4DD',1.5);caption.enableWrapText=false;
      this.idleAccent(icon,i*.65,active?4:1.5,0,4.8);bindPress(hit,icon,()=>void this.navigate(page));
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
    const stage=box(this.content!,'Celestial garden',0,0,1024,1480);stage.setSiblingIndex(0);
    const scale=Math.min((Safe.visibleWidth-24)/1024,(this.height-440-Safe.safeTop-Safe.safeBottom)/1480);stage.setScale(scale,scale,1);
    const brand=this.art.image(stage,'canopy-brand',0,623,630,190);this.idleAccent(brand,0,9,0,5.5);this.sheen(brand,535,135);
    text(stage,'A JOURNEY TO GOOD FORTUNE',0,494,870,54,30,COLORS.ink,true);
    // Four destinations share one continuous garden instead of another card carousel.
    const world=box(stage,'Garden panorama',0,0,1024,1010);
    const places=[[-250,230],[250,230],[-250,-256],[250,-256]];
    const track=box(world,'Cloud garden trail',0,0,1000,1000).addComponent(Graphics);
    track.strokeColor=new Color(178,119,39,110);track.lineWidth=3;
    track.moveTo(-250,230);track.bezierCurveTo(-70,330,70,330,250,230);track.moveTo(-250,-256);track.bezierCurveTo(-70,-160,70,-160,250,-256);track.stroke();
    const halos:Node[]=[];
    const caption=text(stage,'',0,-536,930,61,34,COLORS.ink,true);
    const select=(index:number,animate=true)=>{
      this.selectedRoute=(index+4)%4;
      halos.forEach((n,i)=>{const o=opacity(halos[i],halos[i].getComponent(UIOpacity)?.opacity??0);Tween.stopAllByTarget(o);if(animate&&!this.reduced)tween(o).to(.38,{opacity:i===this.selectedRoute?145:30},{easing:'sineInOut'}).start();else o.opacity=i===this.selectedRoute?145:30;});
      caption.string=tr('Tap a destination to enter');
    };
    GAME_CONFIGS.forEach((cfg,i)=>{
      const [x,y]=places[i],hit=box(world,'Route '+i,x,y,492,460),face=box(hit,'Destination courtyard',0,0,492,460);
      // Contact shadow anchors each building; only highlights move, never the whole courtyard.
      const ground=box(face,'Courtyard contact shadow',0,-86,400,102).addComponent(Graphics);
      for(let layer=0;layer<5;layer++){ground.fillColor=new Color(88,47,20,8+layer*3);ground.ellipse(0,0,199-layer*18,49-layer*6);ground.fill();}
      const halo=this.art.light(face,1,0,-64,350,115,30);halos.push(halo);
      const art=this.art.image(face,'canopy-destinations',0,28,520,390,i);this.edgeJewels(art,350,270,i*.8);
      const title=this.art.image(face,'canopy-title-'+i,0,-150,450,89);this.sheen(title,393,70,i*1.2);
      outlined(text(face,'Tap to enter',0,-201,350,48,30,'#59321B'),'#FFF3D2',1.5);
      bindPress(hit,title,()=>{if(swiped)return;select(i);this.audio.play('tap');void this.navigate('game',cfg);},{compression:.985,depth:2,release:.28});
      if(!this.reduced){const mote=this.art.light(face,3,-122,-40,36,36,0),o=opacity(mote,0);tween(mote).delay(i*.9).repeatForever(tween().set({position:new Vec3(-122,-40,0)}).to(4.8,{position:new Vec3(111,97,0)},{easing:'sineInOut'}).delay(2)).start();tween(o).delay(i*.9).repeatForever(tween().to(1,{opacity:170}).delay(2.5).to(1.3,{opacity:0}).delay(2)).start();}
    });
    let startX=0,startY=0,swiped=false;
    world.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{const v=e.getUILocation();startX=v.x;startY=v.y;swiped=false;},this,true);
    world.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{const v=e.getUILocation(),dx=v.x-startX,dy=v.y-startY;if(!swiped&&Math.abs(dx)>100&&Math.abs(dx)>Math.abs(dy)*1.2){swiped=true;select(this.selectedRoute+(dx<0?1:-1));this.audio.play('tap');}},this,true);
    this.art.button(stage,'Fortune festival',0,-645,680,110,'CAISHEN’S BLESSING',6,()=>this.celebration(),0);
    select(this.selectedRoute,false);this.festivalDrift(stage);
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
    this.art.button(this.content!,'Language selector',Safe.visibleWidth/2-170,this.top-Safe.safeTop-90,290,80,'Language',7,()=>this.languages(),0);
    const stage=box(this.content!,'Canopy membership',0,30,1020,1640);const scale=Math.min(1,(this.height-260-Safe.safeTop-Safe.safeBottom)/1640,(Safe.visibleWidth-45)/1020);stage.setScale(scale,scale,1);
    const brand=this.art.image(stage,'canopy-brand',register?0:-180,register?690:525,register?700:560,230);this.idleAccent(brand,0,12,.2,1.8);this.sheen(brand,510,150);
    const panel=this.art.panel(stage,0,register?-18:-233,900,register?1240:970,0);this.metalEdges(panel,903,register?1207:937,.8);
    text(panel,register?'JOIN THE FESTIVAL':'WELCOME TO FORTUNE',0,register?525:390,812,82,42,COLORS.ink,true);
    text(panel,register?'Your celestial festival starts here':'Sign in to your world of gold',0,register?448:319,800,56,30,COLORS.ink);
    this.field(panel,'Username',register?334:204,this.draft.username,v=>this.draft.username=v);
    this.field(panel,'Password · 10–72 characters',register?206:76,this.draft.password,v=>this.draft.password=v,true);
    if(register){
      this.field(panel,'Confirm password',78,this.draft.confirmPassword,v=>this.draft.confirmPassword=v,true);this.field(panel,'Nickname',-50,this.draft.nickname,v=>this.draft.nickname=v);
      const check=this.art.button(panel,'Accept terms',-335,-173,91,91,'',14,()=>{this.draft.acceptedTerms=!this.draft.acceptedTerms;mark.opacity=this.draft.acceptedTerms?255:65;},1),mark=opacity(check,this.draft.acceptedTerms?255:65);
      text(panel,'I meet the age requirement and accept\nthe Terms and Privacy Policy.',65,-173,649,84,29,COLORS.ink);
      const primary=this.art.button(panel,'Create account',0,-323,795,126,'CREATE ACCOUNT',4,()=>void this.authAction('register'),3);this.metalEdges(primary,763,110,1.1);
      this.art.button(panel,'Switch account form',0,-477,790,95,'Back to sign in',9,()=>void this.navigate('login'),0);
    }else{
      const primary=this.art.primary(panel,'Sign in',0,-72,790,132,'SIGN IN',()=>void this.authAction('login'));this.metalEdges(primary,778,121,.7);
      const apple=this.art.enamel(panel,0,-216,790,104);apple.name='Sign in with Apple';this.art.image(apple,'apple-mark',-242,0,42,50);text(apple,'Sign in with Apple',0,0,529,75,36,COLORS.ink);bindPress(apple,apple,()=>void this.authAction('apple'));
      this.art.button(panel,'Guest',-211,-356,390,98,'Guest play',0,()=>this.guestConsent(),0);this.art.button(panel,'Create account',211,-356,390,98,'Register',4,()=>void this.navigate('register'),0);
    }
    const links=box(this.content!,'Legal links',0,-this.top+151+Safe.safeBottom,990,86);['Terms','Privacy','Support'].forEach((t,i)=>this.art.button(links,t,(i-1)*320,0,305,78,t,7,()=>this.legal(['terms','privacy','support'][i] as LegalPage),0));
    outlined(text(this.content!,'Virtual coins · No cash prizes · Eligible adults only',0,-this.top+62+Safe.safeBottom,1000,50,26,COLORS.cream),'#583B23',2);
  }

  private field(parent:Node,placeholder:string,y:number,value:string,onChange:(v:string)=>void,password=false):EditBox{
    // Configure off-stage: EditBox onLoad otherwise creates default labels
    // and clears the existing material before our references are assigned.
    const frame=this.art.enamel(parent,0,y,778,103);
    const n=box(frame,'Text entry',0,0,572,76);n.active=false;
    const focusFrame=box(n,'Focused gold edge',0,0,760,85);const fg=focusFrame.addComponent(Graphics);fg.strokeColor=new Color('#F3D083');fg.lineWidth=4;fg.roundRect(-380,-42.5,760,85,13);fg.stroke();
    const focusOpacity=opacity(focusFrame,0);const edit=n.addComponent(EditBox);
    edit.backgroundImage=null!;
    const label=text(n,value,0,0,560,72,49,'#35200F',false,true);label.horizontalAlign=Label.HorizontalAlign.LEFT;label.isBold=true;
    const hint=text(n,placeholder,0,0,560,72,39,'#49351F');hint.horizontalAlign=Label.HorizontalAlign.LEFT;hint.isBold=true;
    // EditBox positions labels by their top-left corner, not their center.
    label.node.getComponent(UITransform)!.setAnchorPoint(0,1);hint.node.getComponent(UITransform)!.setAnchorPoint(0,1);
    edit.textLabel=label;edit.placeholderLabel=hint;edit.placeholder=tr(placeholder);edit.inputMode=EditBox.InputMode.SINGLE_LINE;edit.maxLength=password?72:18;
    // Assigning labels while EditBox is still in its default multiline mode
    // changes vertical alignment to TOP. Single-line mode does not reset it.
    label.verticalAlign=hint.verticalAlign=Label.VerticalAlign.CENTER;
    label.lineHeight=58;hint.lineHeight=49;label.enableWrapText=hint.enableWrapText=false;label.overflow=hint.overflow=Label.Overflow.SHRINK;
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
    const root=this.root,find=(n:Node):Node|undefined=>n.name===(kind==='apple'?'Sign in with Apple':kind==='register'?'Create account':'Sign in')?n:n.children.map(find).find(Boolean);
    const button=root?find(root):undefined;
    const labels=button?.getComponentsInChildren(Label).map(label=>({label,value:label.string}))??[];
    labels.forEach(({label})=>label.string=tr('Connecting…'));
    // A breathing reflection conveys activity without pretending to show network progress.
    const activity=button?box(button,'Authentication activity',0,-43,480,5):undefined;
    if(activity){const g=activity.addComponent(Graphics);g.fillColor=new Color('#FBE6A8');g.roundRect(-240,-2.5,480,5,2.5);g.fill();const a=opacity(activity,150);if(!this.reduced)tween(a).to(.6,{opacity:255},{easing:'sineInOut'}).to(.6,{opacity:90},{easing:'sineInOut'}).union().repeatForever().start();}
    try{
      if(kind==='register'&&this.draft.acceptedTerms)this.accept();
      const result:AuthResult=kind==='register'?await this.services.auth.register(this.draft):kind==='apple'?await this.services.auth.signInWithApple():await this.services.auth.login({username:this.draft.username,password:this.draft.password,remember:true});
      if(result.ok){this.draft.password=this.draft.confirmPassword='';this.page='home';if(this.restoreRemoteRound())await this.art.load([this.config.id+'-tall']);this.render();}else this.toast(result.message??'Unable to sign in.');
    }catch{this.toast('Unable to connect. Your form has been kept.');}finally{
      if(activity?.isValid){Tween.stopAllByTarget(activity.getComponent(UIOpacity)!);activity.destroy();}
      labels.forEach(({label,value})=>{if(label.isValid)label.string=value;});this.busy=false;
    }
  }
  private policyConsent():void{
    if(this.modal)return;
    const panel=this.sheet('Festival membership terms',710);
    panel.getChildByName('Close dialog')!.active=false;
    text(panel,'Confirm that you meet your region’s minimum age\nand accept the current Terms and Privacy Policy.\nVirtual coins have no cash value.',0,105,820,240,36);
    this.art.button(panel,'Accept updated policy',0,-99,760,108,'Accept & continue',14,()=>{this.accept();this.closeModal();},3);
    this.art.button(panel,'Return to sign in',0,-241,760,99,'Sign out to review policies',7,()=>{this.closeModal();void this.signOut();},1);
  }
  private guestConsent():void{
    if(this.busy)return;
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
    this.idleAccent(title,GAME_CONFIGS.indexOf(cfg)*.8,11,0,1.5);
    this.sheen(title,title.getComponent(UITransform)!.width,title.getComponent(UITransform)!.height,GAME_CONFIGS.indexOf(cfg)*.65);
    const reelNode=box(this.plane,'Reels',0,0,g.screen[2],g.screen[3]);this.reels=reelNode.addComponent(SalonReels);this.reels.setup(this.art,cfg,g.screen);this.reels.reducedMotion=this.reduced;this.reels.onMotion=(energy)=>{ambient.motionEnergy=energy;};this.reels.onStop=(column)=>{this.audio.play('reel-stop');ambient.land(column);};this.reels.onWinAccent=(column)=>ambient.land(column,true);
    const summary=[g.balance[0]-24,g.balance[1]-25,g.topWin[0]+g.topWin[2]-g.balance[0]+48,g.balance[3]+50] as const;const summaryPoint=imagePoint(summary);const fascia=this.art.panel(this.plane,summaryPoint[0],summaryPoint[1],summary[2],summary[3],1);fascia.name='Integrated treasury readouts';this.metalEdges(fascia,summary[2]-22,summary[3]-14,.9);const balance=imagePoint(g.balance);
    this.balanceLabel=text(this.plane,money(this.services.economy.balance()),balance[0]+g.balance[2]*.015,balance[1],g.balance[2]*.58,g.balance[3]*.76,50,'#442810');outlined(this.balanceLabel,'#FFF4DD',1.5);this.balanceLabel.enableWrapText=false;this.balanceLabel.overflow=Label.Overflow.SHRINK;this.balanceLabel.lineHeight=51;
    const recharge=this.art.image(this.plane,'canopy-button-'+(GAME_CONFIGS.indexOf(cfg)*4+1),balance[0]+g.balance[2]*.41,balance[1],60,60);recharge.name='Recharge';bindPress(recharge,recharge,()=>{if(this.state.kind==='idle')void this.navigate('store');else this.toast('Finish the round before opening the shop.');});
    const win=imagePoint(g.win);this.winLabel=text(this.plane,'WIN  0',win[0],win[1],g.win[2]*.91,g.win[3]*.84,49,'#442810');outlined(this.winLabel,'#FFF4DD',1.5);this.winLabel.enableWrapText=false;this.winLabel.overflow=Label.Overflow.SHRINK;
    const themeIndex=GAME_CONFIGS.indexOf(cfg);

    const readoutInk='#442810';
    const readoutOutline='#FFF4DD';
    const plateColors:Record<GameId,string>={
      'golden-hour':'#55300F','jade-treasury':'#06382D','pearl-palace':'#E8DDC9','ruby-revel':'#651725',
    };
    const display=(name:string,rect:Box,index:number):Node=>{
      const pos=imagePoint(rect),host=box(this.plane!,name,pos[0],pos[1],rect[2],rect[3]);host.name=name;
      return host;
    };
    const betPanel=display('BET display',g.bet,themeIndex*4);
    const betCaption=outlined(text(betPanel,'BET',0,g.bet[3]*.24,g.bet[2]*.82,g.bet[3]*.36,32,readoutInk),readoutOutline,1);
    betCaption.fontFamily='Arial Black';betCaption.enableWrapText=false;betCaption.overflow=Label.Overflow.SHRINK;
    this.betLabel=outlined(text(betPanel,money(this.bet),0,-g.bet[3]*.17,g.bet[2]*.82,g.bet[3]*.58,43,readoutInk),readoutOutline,1);
    this.betLabel.fontFamily='Arial Black';this.betLabel.enableWrapText=false;this.betLabel.overflow=Label.Overflow.SHRINK;
    const ctl=(rect:Box,label:string,index:number,action:()=>void):Node=>{
      const pos=imagePoint(rect);const hit=box(this.plane!,label,pos[0],pos[1],Math.max(108,rect[2]),Math.max(110,rect[3]));
      const theme=GAME_CONFIGS.indexOf(cfg);
      const asset='canopy-button-'+(theme*4+index);
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
    const spinLabel=box(spin,'Engraved spin caption',0,-g.spin[3]/2-2,221,68);
    outlined(text(spinLabel,'SPIN',0,0,205,59,51,'#442810'),'#FFF4DD',2);

    const auto=ctl(g.auto,'AUTO',3,()=>{this.auto=!this.auto;this.updateAuto();this.toast(this.auto?'Auto spin on · Tap AUTO again to stop.':'Auto spin off.');if(this.auto&&this.state.kind==='idle')void this.spin();});
    const autoStatus=imagePoint(g.status);this.autoLamp=text(this.plane,'AUTO OFF',auto.position.x,autoStatus[1],g.status[2]*.88,g.status[3]*.98,43,readoutInk);outlined(this.autoLamp,'#FFF4DD',2);this.autoLamp.enableWrapText=false;this.autoLamp.overflow=Label.Overflow.SHRINK;this.updateAuto();
    const halo=this.art.light(spin,1,0,0,g.spin[2]*1.65,g.spin[2]*1.65,135);halo.setSiblingIndex(0);
    if(!this.reduced)tween(halo).to(2.4,{scale:new Vec3(1.06,1.06,1),angle:8},{easing:'sineInOut'}).to(2.4,{scale:new Vec3(.95,.95,1),angle:-8},{easing:'sineInOut'}).union().repeatForever().start();
    const topPanel=box(this.plane,'TOP WIN display',...imagePoint(g.topWin),g.topWin[2],g.topWin[3]);
    text(topPanel,'TOP WIN',-g.topWin[2]*.28,0,g.topWin[2]*.29,g.topWin[3]*.78,31,readoutInk);
    this.topWinLabel=outlined(text(topPanel,money(this.services.profile.current()?.biggestWin??0),g.topWin[2]*.16,0,g.topWin[2]*.53,g.topWin[3]*.8,45,readoutInk),readoutOutline,1);
    this.topWinLabel.fontFamily='Arial';this.topWinLabel.lineHeight=43;this.topWinLabel.enableWrapText=false;this.topWinLabel.overflow=Label.Overflow.SHRINK;
    const toolbar=box(this.content!,'Safe top tools',0,this.top-95-Safe.safeTop,1000,154);
    const tool=(name:string,x:number,icon:number,label:string,action:()=>void):Label=>{
      const hit=box(toolbar,name,x,0,160,154),face=box(hit,name+' face',0,0,127,118);
      this.art.image(face,'interfaces',0,12,82,82,icon);
      const caption=outlined(text(face,label,0,-46,146,43,34,COLORS.cream),'#15352F',3);
      caption.fontFamily='Arial Black';caption.enableWrapText=false;caption.overflow=Label.Overflow.SHRINK;
      bindPress(hit,face,()=>{this.audio.play('tap');action();});return caption;
    };
    tool('Back to salon',-427,9,'BACK',()=>void this.navigate('home'));
    tool('Rules',290,7,'RULES',()=>this.rules());
    this.soundLamp=tool('Audio',436,8,'SOUND ON',()=>void this.toggleSound());this.updateSound();
    this.hintLabel=outlined(text(this.content!,MODES[GAME_CONFIGS.indexOf(cfg)],0,-this.top+88+Safe.safeBottom,980,110,44,'#57351D'),'#FFF4DD',2);
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
      toolbar.getChildByName('Back to salon')?.setPosition(left,0);
      toolbar.getChildByName('Rules')?.setPosition(right-176,0);
      toolbar.getChildByName('Audio')?.setPosition(right,0);
    }
    this.hintLabel?.node.setPosition(0,-h/2+88+Safe.safeBottom);
  }
  private get bet():number{return this.config.bets[this.betIndex];}
  private changeBet(delta:number):void{
    if(this.state.kind!=='idle'){this.toast('Bet is locked while the reels are moving.');return;}
    const next=Math.max(0,Math.min(this.config.bets.length-1,this.betIndex+delta));
    if(next===this.betIndex){this.toast(delta<0?'Minimum bet selected.':'Maximum bet selected.');return;}
    this.betIndex=next;if(this.betLabel)this.betLabel.string=tr(money(this.bet));if(this.hintLabel)this.hintLabel.string=tr(`BET ${money(this.bet)} selected`);
  }
  private updateAuto():void{
    if(!this.autoLamp)return;this.autoLamp.string=tr(this.auto?'AUTO ON':'AUTO OFF');this.autoLamp.color=new Color(this.auto?'#17603C':'#442810');
    Tween.stopAllByTarget(this.autoLamp.node);this.autoLamp.node.setScale(1,1,1);
    // Status typography stays fixed. Button enamel carries the motion, not the readout.
  }
  private updateSound(enabled=this.services.profile.current()?.settings.sound??true):void{if(this.soundLamp){this.soundLamp.string=tr(enabled?'SOUND ON':'SOUND OFF');this.soundLamp.color=new Color(enabled?'#FFF4D8':'#D8B79A');}}
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
    if(this.winLabel)this.winLabel.string=tr('WIN  0');
    this.state={kind:'spinning',requestId};this.reels.lockCoins({});this.reels.begin();this.audio.play('spin');this.refreshBalance();if(this.hintLabel)this.hintLabel.string=tr('Treasures in motion…');
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
      if(this.winLabel)this.winLabel.string=tr((result.totalWin>0&&result.totalWin<this.bet?'RETURN  ':'WIN  ')+money(result.totalWin));
      if(this.hintLabel)this.hintLabel.string=tr(result.totalWin>0?'Treasure added to your wallet.':MODES[GAME_CONFIGS.indexOf(this.config)]);
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
      if(this.hintLabel)this.hintLabel.string=tr(feature.type==='ruby-cascade'?`CROWN CASCADE · ${round.multiplier}×`:feature.type==='jade-respin'?`LOCKED GOLD · ${round.remaining} RESPINS LEFT`:`PEARL WILD · ${round.index} OF ${feature.rounds.length}`);
      if(feature.type==='ruby-cascade')await reels.collapseTo(round.grid,round.removed??[]);
      else{reels.begin();this.audio.play('spin');await reels.finishGrid(round.grid,true);}
      if(round.locked)reels.lockCoins(round.locked);
      if(round.expandedColumn!==undefined)await reels.expandColumn(round.expandedColumn);
      reels.highlight(round.wins.flatMap(w=>[...w.positions]));
      cumulative+=round.credits;if(this.winLabel)this.winLabel.string=tr('WIN  '+money(cumulative));
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
      const award=Math.floor(amount).toLocaleString('en-US');
      const width=Math.min(820,g.screen[2]-24),safe=width-250,badgeSize=Math.min(86,safe*.22);
      const badgeX=-safe/2+badgeSize/2,textWidth=safe-2*badgeSize-32;
      const banner=this.art.panel(this.plane!,screen[0],screen[1]-g.screen[3]/2+116,width,196,0);banner.name='Ordinary win celebration';
      const badge=this.art.image(banner,symbolAtlas(this.config.id),badgeX,0,badgeSize,badgeSize,[8,14,7,2][GAME_CONFIGS.indexOf(this.config)]);this.sheen(badge,badgeSize*.8,badgeSize*.8,.1);
      const rightBadge=this.art.image(banner,symbolAtlas(this.config.id),-badgeX,0,badgeSize,badgeSize,[8,14,7,2][GAME_CONFIGS.indexOf(this.config)]);this.sheen(rightBadge,badgeSize*.8,badgeSize*.8,.1);
      const heading=text(banner,amount/this.bet>=5?'NICE WIN':'WIN',0,32,textWidth,40,30,'#5B3427',true);heading.enableWrapText=false;
      const total=outlined(text(banner,'0',0,-23,textWidth/1.04,66,Math.min(54,textWidth/(award.length*.64)),'#573225',false),'#FFF2D6',1);total.enableWrapText=false;
      this.reveal(banner);this.metalEdges(banner,width-22,170,0);if(!this.reduced){for(const emblem of [badge,rightBadge])tween(emblem).to(.3,{scale:new Vec3(1.08,1.08,1)},{easing:'backOut'}).to(.4,{scale:new Vec3(1,1,1)}).start();
        for(let i=0;i<8;i++){const spark=this.art.light(banner,3,(i%2?1:-1)*(width*.38+i*2),(i-4)*15,38,38,160);tween(spark).by(.65,{position:new Vec3((i%2?1:-1)*16,40,0),angle:90}).start();tween(opacity(spark,160)).to(.85,{opacity:0}).start();}}
      try{if(this.reduced){total.string=tr(award);if(label)label.string=tr('WIN  '+money(amount));await this.delay(.8);}
      else{const v={n:0};await new Promise<void>(resolve=>tween(v).to(.85,{n:amount},{easing:'expoOut',onUpdate:()=>{total.string=tr(Math.floor(v.n).toLocaleString('en-US'));if(label?.isValid)label.string=tr('WIN  '+money(v.n));}}).call(()=>resolve()).start());total.string=tr(award);if(label?.isValid)label.string=tr('WIN  '+money(amount));
        tween(total.node).to(.12,{scale:new Vec3(1.035,1.035,1)},{easing:'sineOut'}).to(.24,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
        for(const side of [-1,1]){const glint=this.art.light(banner,3,side*(width*.39),side*65,78,26,0);glint.name='Win amount settled glint';tween(glint.getComponent(UIOpacity)!).to(.1,{opacity:220}).to(.4,{opacity:0},{easing:'sineOut'}).start();}
        await this.delay(.65);tween(opacity(banner,255)).to(.2,{opacity:0}).start();await this.delay(.2);}}
      finally{if(banner.isValid)banner.destroy();}
    }
  }

  private refreshBalance():void{if(this.balanceLabel)this.balanceLabel.string=tr(money(this.services.economy.balance()));}
  private refreshTopWin():void{if(this.topWinLabel)this.topWinLabel.string=money(this.services.profile.current()?.biggestWin??0);}
  private delay(seconds:number):Promise<void>{return new Promise(resolve=>this.scheduleOnce(resolve,this.reduced?Math.min(.12,seconds):seconds));}
  protected update(dt:number):void{const fx=this.plane?.getChildByName('Cabinet reflections')?.getComponent(SalonAtmosphere);if(fx)fx.presentationEnergy=this.state.kind==='presenting'?.6:0;if(this.auto&&this.visible&&this.state.kind==='idle'&&this.page==='game'&&!this.modal){this.autoWait-=dt;if(this.autoWait<=0){this.autoWait=1;void this.spin();}}}
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
    points.forEach(([x,y],i)=>{const n=this.art.light(parent,3,x,y,42,42,0);n.name='Crafted edge glint';const alpha=n.getComponent(UIOpacity)!;tween(n).delay(phase+i*.65).to(.55,{scale:new Vec3(1.18,1.18,1),angle:22},{easing:'sineOut'}).to(1.1,{scale:new Vec3(.72,.72,1),angle:45},{easing:'sineInOut'}).delay(3.3).union().repeatForever().start();tween(alpha).delay(phase+i*.65).to(.55,{opacity:175},{easing:'sineOut'}).to(1.1,{opacity:0},{easing:'sineInOut'}).delay(3.3).union().repeatForever().start();});
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
  private sheen(n:Node,w:number,h:number,delay=0):void{
    if(this.reduced)return;
    const clip=box(n,'Inset metal sheen',0,0,w-12,h-12);clip.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    const beam=this.art.light(clip,2,-w,0,h*2.2,h*2.2,0),alpha=beam.getComponent(UIOpacity)!;
    beam.setScale(.28,1.5,1);beam.angle=-24;
    // The reflection enters and leaves at zero opacity, so its clipped edge cannot flash.
    tween(beam).delay(delay).repeatForever(tween().to(1.9,{}, {onUpdate:(_node,ratio)=>{
      const t=ratio??0;beam.setPosition(-w+2*w*t,0);alpha.opacity=Math.pow(Math.sin(t*Math.PI),1.4)*132;
    }}).call(()=>{alpha.opacity=0;beam.setPosition(-w,0);}).delay(4.3)).start();
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
      const x=(i%2?1:-1)*481,y=i<2?346:-347,n=this.art.image(layer,'symbols',x,y,34,34,0);n.name='Idle margin gold';this.idleAccent(n,i*1.1,12,9);this.edgeJewels(n,28,28,i);
    }
  }
  private count(label:Label,total:number,from=0,suffix='',delay=0):void{Tween.stopAllByTarget(label);label.string=tr(money(from)+suffix);if(this.reduced){label.string=tr(money(total)+suffix);return;}tween(label).delay(delay).to(.85,{}, {onUpdate:(_target,ratio)=>{if(label.isValid)label.string=tr(money(from+(total-from)*(1-Math.pow(1-(ratio??0),3)))+suffix);}}).call(()=>{if(label.isValid)label.string=tr(money(total)+suffix);}).start();}
  private rewardArrival(before:number,after:number):void{
    if(this.balanceLabel)this.count(this.balanceLabel,after,before,'',.44);
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
  /** A short ornamental response never participates in wallet settlement. */
  private treasureTouch(host:Node):void{
    if(host.getChildByName('Treasure touch sparks'))return;
    this.audio.play('tap');
    const fx=box(host,'Treasure touch sparks',0,0,300,300);
    if(this.reduced){this.scheduleOnce(()=>{if(fx.isValid)fx.destroy();},.15);return;}
    for(let i=0;i<9;i++){const angle=i*Math.PI*2/9,n=this.art.light(fx,3,0,0,40,40,190);tween(n).to(.85,{position:new Vec3(Math.cos(angle)*170,Math.sin(angle)*145+40,0),scale:new Vec3(.35,.35,1)},{easing:'quadOut'}).start();tween(opacity(n,190)).delay(.15).to(.7,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(fx.isValid)fx.destroy();},.9);
  }
  /** Soft contact shadows sit behind physical ornaments, never over their lettering. */
  private ornamentShadow(parent:Node,x:number,y:number,w:number,h:number):void{
    const g=box(parent,'Ornament contact shadow',x,y,w,h).addComponent(Graphics);
    for(let i=0;i<6;i++){g.fillColor=new Color(77,38,14,7+i*2);g.ellipse(0,0,w/2-i*w*.045,h/2-i*h*.052);g.fill();}
  }
  private storePage():void{
    const stage=this.pageStage('Treasury market');text(stage,'THE TREASURE MARKET',0,625,940,79,42,COLORS.ink,true);
    text(stage,'Choose a little extra fortune',0,540,900,53,31,COLORS.ink);
    const stamp=this.generation;void this.services.store.catalog().then(items=>{if(stamp!==this.generation)return;
      if(!items.length){this.toast('Shop unavailable. Please try again.');return;}
      let display:Node|undefined,retiring:Node|undefined,shown=-1;const counter={value:0};const markers:Node[]=[];
      stage.on(Node.EventType.NODE_DESTROYED,()=>Tween.stopAllByTarget(counter));
      const choose=(index:number)=>{
        if(index===shown)return;
        if(retiring?.isValid)retiring.destroy();
        const previous=display;shown=index;this.selectedBundle=index;const item=items[index];
        if(previous?.isValid){previous.pauseSystemEvents(true);retiring=previous;}

        display=box(stage,'Treasure showcase',0,0,960,1000);
        this.ornamentShadow(display,0,-67,740,96);
        const shrine=this.art.image(display,'canopy-frame-1',0,229,780,581);shrine.name='Gilded treasure alcove';shrine.getComponent(Sprite)!.type=Sprite.Type.SIMPLE;
        this.metalEdges(shrine,704,500,index*.5);
        const glow=this.art.light(display,1,0,238,650,380,85);
        const hero=box(display,'Touch treasure',0,272,435,340);const image=this.art.image(hero,'prize-'+GAME_CONFIGS[index%4].id,0,0,390,332);this.idleAccent(image,index*.2,8,0,4.5);this.edgeJewels(image,310,230);
        bindPress(hero,image,()=>this.treasureTouch(hero),{compression:.97,depth:3,release:.3});
        const amount=text(display,'',0,79,620,78,55,COLORS.ink,true);Tween.stopAllByTarget(counter);amount.string=tr(money(counter.value));if(this.reduced){counter.value=item.credits+item.bonus;amount.string=tr(money(counter.value));}else tween(counter).to(.42,{value:item.credits+item.bonus},{easing:'cubicOut',onUpdate:()=>{if(amount.isValid)amount.string=tr(money(counter.value));}}).start();text(display,'COINS',0,27,550,40,25,COLORS.ink);
        const buy=this.art.primary(display,'Buy '+item.id,0,-359,660,118,item.available?item.displayPrice:'Unavailable',()=>void this.purchase(item.id));this.metalEdges(buy,604,91,.6);
        markers.forEach((n,i)=>{const alpha=opacity(n,n.getComponent(UIOpacity)?.opacity??0);Tween.stopAllByTarget(alpha);if(this.reduced)alpha.opacity=i===index?255:0;else tween(alpha).to(.24,{opacity:i===index?255:0},{easing:'sineInOut'}).start();});
        if(this.reduced){if(previous?.isValid)previous.destroy();retiring=undefined;}
        else{
          const alpha=opacity(display,0);tween(alpha).to(.28,{opacity:255},{easing:'sineInOut'}).start();
          if(previous?.isValid)tween(opacity(previous,255)).to(.28,{opacity:0},{easing:'sineInOut'}).call(()=>{if(previous.isValid)previous.destroy();if(retiring===previous)retiring=undefined;}).start();
        }
      };
      items.forEach((item,i)=>{
        const hit=box(stage,'Treasure offer '+i,(i-1.5)*220,-190,198,191),face=box(hit,'Treasure pedestal',0,0,198,191);
        this.art.image(face,'interfaces',0,22,112,112,[0,1,2,6][i]);text(face,money(item.credits+item.bonus),0,-65,190,46,29,COLORS.ink);
        const mark=box(face,'Chosen treasure',0,-94,110,6),g=mark.addComponent(Graphics);g.fillColor=new Color('#A74125');g.roundRect(-50,-3,100,6,3);g.fill();opacity(mark,0);markers.push(mark);
        bindPress(hit,face,()=>{choose(i);this.audio.play('tap');});
      });
      choose(Math.min(this.selectedBundle,items.length-1));
    }).catch(()=>this.toast('Shop unavailable. Please try again.'));
    text(stage,'Virtual coins · No cash value',0,-476,850,43,26,COLORS.ink);
    this.art.button(stage,'Synchronize purchases',0,-591,710,96,'Restore purchases',13,()=>void this.restorePurchases(),0);
  }

  private async purchase(id:string):Promise<void>{if(this.busy)return;this.busy=true;try{const r=await this.services.store.purchase(id);this.refreshBalance();this.toast(r.message);}catch{this.toast('Unable to connect. Please try again.');}finally{this.busy=false;}}
  private async restorePurchases():Promise<void>{
    if(this.busy)return;this.busy=true;
    try{const r=await this.services.store.restore();this.refreshBalance();this.toast(r.message);}
    catch{this.toast('Unable to restore purchases. Please try again.');}
    finally{this.busy=false;}
  }
  private rewardsPage():void{
    const stage=this.pageStage('Golden harvest calendar');text(stage,'SEVEN LANTERNS OF LUCK',0,638,940,80,42,COLORS.ink,true);
    const progress=this.services.save.currentScope()?.checkIn,today=new Date().toISOString().slice(0,10),claimed=progress?.lastClaimDate===today,active=claimed?((progress?.cycleDay??0)+6)%7:(progress?.cycleDay??0);
    text(stage,'DAY '+(active+1)+(claimed?' · COLLECTED':' · READY TO CLAIM'),0,562,940,52,30,COLORS.ink);
    this.ornamentShadow(stage,0,-112,820,126);
    const ring=box(stage,'Seven-day blessing ring',0,155,990,730),line=ring.addComponent(Graphics);
    line.strokeColor=new Color(117,65,23,60);line.lineWidth=14;line.ellipse(0,-8,370,270);line.stroke();
    line.strokeColor=new Color('#BA833C');line.lineWidth=9;line.ellipse(0,0,370,270);line.stroke();
    line.strokeColor=new Color('#FFE5A1');line.lineWidth=3;line.ellipse(0,3,370,270);line.stroke();
    if(!this.reduced)for(let i=0;i<2;i++){
      const light=this.art.light(ring,3,0,0,61,61,0);light.name='Calendar gold thread glint';const alpha=opacity(light,0),phase={value:i*.5};
      const draw=()=>{if(!light.isValid)return;const angle=phase.value*Math.PI*2;light.setPosition(Math.sin(angle)*370,Math.cos(angle)*270);light.angle=-phase.value*360;alpha.opacity=110+Math.sin(angle*2)*45;};
      draw();tween(phase).by(16,{value:1},{onUpdate:draw}).union().repeatForever().start();
      light.on(Node.EventType.NODE_DESTROYED,()=>Tween.stopAllByTarget(phase));
    }
    this.ornamentShadow(ring,0,-85,370,85);
    const altar=this.art.image(ring,'canopy-soft-plate-3',0,-83,370,97);altar.name='Bowl gold plinth';
    const hero=box(ring,'Touch blessing bowl',0,52,340,285),bowl=this.art.image(hero,'prize-golden-hour',0,0,330,280);this.idleAccent(bowl,0,6,0,4.5);bindPress(hero,bowl,()=>this.treasureTouch(hero));
    this.edgeJewels(bowl,260,205,.8);
    const treasuryLight=this.art.light(ring,1,0,25,380,340,65);treasuryLight.setSiblingIndex(0);
    text(ring,'FORTUNE AWAITS',0,-126,290,39,24,COLORS.ink,true);
    this.services.checkIn.rewards.forEach((amount,i)=>{
      const theta=i*Math.PI*2/7,x=Math.sin(theta)*370,y=Math.cos(theta)*270,done=i<active||(i===active&&claimed),current=i===active;
      const tile=box(ring,'Check-in day '+(i+1),x,y,220,190);
      const plaque=this.art.enamel(tile,0,0,216,186,current?'ruby':'ivory');
      this.art.image(plaque,'interfaces',-95,75,40,40,0);this.art.image(plaque,'interfaces',95,75,40,40,0);
      const ink=current?COLORS.cream:COLORS.ink;
      const treasure=i===6?this.art.image(tile,'prize-golden-hour',0,14,103,80):this.art.image(tile,'symbols',0,14,83,77,i<3?0:5);
      if(current){this.edgeJewels(treasure,70,60,i*.4);this.idleAccent(treasure,0,4,0,3);}
      if(done)this.art.image(tile,'interfaces',76,11,39,39,14);
      text(tile,'DAY '+(i+1),0,64,155,31,27,ink);text(tile,money(amount),0,-40,185,39,32,ink,true);text(tile,done?'CLAIMED':current?'TODAY':'LOCKED',0,-73,182,28,23,ink);
      bindPress(tile,tile,()=>{if(current&&!claimed)void this.claim('check-in');else{this.treasureTouch(tile);this.toast('Day '+(i+1)+' · '+money(amount)+' coins · '+(done?'Collected':'Available on a later day'));}});
    });
    const seal=box(stage,'Check in',0,-267,730,117),face=this.art.image(seal,'canopy-soft-plate-2',0,0,730,117);
    this.art.image(face,'interfaces',-281,0,91,91,14);text(face,claimed?'DAY '+(active+1)+' · COLLECTED':'CLAIM DAY '+(active+1)+' · '+money(this.services.checkIn.rewards[active]),23,0,486,78,31,COLORS.cream);
    bindPress(seal,face,()=>{if(!claimed)void this.claim('check-in');else this.toast('Next reward after 00:00 UTC.');},{compression:.98,depth:4});
    const daily=box(stage,'Daily gift island',0,-506,940,268);
    const giftTable=this.art.image(daily,'canopy-soft-plate-1',0,0,935,212);giftTable.name='Daily treasure presentation';
    this.metalEdges(giftTable,835,143,1.2);this.ornamentShadow(daily,-295,-78,260,66);this.art.image(daily,'canopy-soft-plate-3',-295,-72,255,78);const chest=box(daily,'Claim daily',-295,17,228,225),gift=this.art.image(chest,'symbols',0,0,192,192,5);this.idleAccent(gift,0,6,1,4);
    const collected=!!this.services.save.currentScope()?.claims['daily-free:'+today];
    text(daily,'DAILY CHEST · 5,000',106,35,545,52,33,COLORS.ink,true);text(daily,collected?'Gift collected':'Collect daily chest',106,-26,520,52,29,COLORS.ink);
    const claim=()=>{if(!collected)void this.claim('daily');else{this.treasureTouch(chest);this.toast('Today’s gift has already been collected.');}};
    bindPress(chest,gift,claim,{compression:.94,depth:5,tilt:-3});
    const ribbon=box(daily,'Daily gift caption',106,0,560,168);ribbon.setSiblingIndex(0);bindPress(ribbon,ribbon,claim);
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
    const stage=this.pageStage('Celestial honours');
    text(stage,'THE CELESTIAL HONOUR ROLL',0,629,930,84,40,COLORS.ink,true);
    text(stage,'TOTAL WON',0,548,910,46,31,COLORS.ink);
    const stamp=this.generation;const render=(players=this.services.rank.list('all-time',this.services.profile.current())):void=>{if(stamp!==this.generation)return;
      const profile=this.services.profile.current();
      if(profile&&!players.some(p=>p.current))players=[...players,{rank:players.length+1,nickname:profile.nickname,winnings:profile.totalWin,avatar:profile.avatar,current:true}];
      const ranked=hallStandings(players),current=ranked.find(p=>p.current),visible=ranked.slice(0,8);
      // Keep the player's actual mixed rank visible even when outside the first six.
      if(current&&!visible.some(p=>p.current))visible[7]=current;
      const first=visible[0];if(first){const crown=this.art.panel(stage,0,366,916,230,3);const face=this.art.image(crown,'portraits',-297,0,181,181,first.avatar);this.idleAccent(face,0,6,0,3.6);text(crown,'#'+first.rank,-139,43,91,51,40,COLORS.ink,true);text(crown,first.nickname,116,28,394,64,35,COLORS.ink,true,true);if(first.current){const me=text(crown,'YOU',-139,-18,100,32,25,COLORS.ink,true);me.node.name='Champion identity';}this.count(text(crown,'',87,-42,530,48,40,COLORS.ink,true),first.winnings);this.edgeJewels(crown,796,185);}
      const ledger=this.art.image(stage,'canopy-frame-3',0,-145,1000,762);ledger.name='Carved honour ledger';ledger.getComponent(Sprite)!.type=Sprite.Type.SIMPLE;
      text(stage,'#',-340,220,100,36,28,COLORS.ink);text(stage,'TOTAL WON',256,220,220,36,28,COLORS.ink);
      visible.slice(1).forEach((r,i)=>{const row=this.art.enamel(stage,0,151-i*96,880,86,r.current?'ruby':'ivory'),ink=r.current?COLORS.cream:COLORS.ink;row.name=r.current?'Your hall rank':'Hall rank '+r.rank;text(row,'#'+r.rank,-344,0,94,50,34,ink);const face=this.art.image(row,'portraits',-252,0,66,66,r.avatar);text(row,r.nickname,-24,0,270,64,29,ink,false,true);if(r.current){face.setScale(.72,.72,1);face.setPosition(-252,10);const me=text(row,'YOU',-252,-27,100,25,20,ink,true);me.node.name='Player identity';}text(row,money(r.winnings),256,0,222,50,33,ink).enableWrapText=false;this.idleAccent(face,i*.4,3,0,3.5);this.reveal(row,i*.055);});
      text(stage,'Includes simulated competitors',0,-529,870,42,25,COLORS.ink);
      this.art.button(stage,'Explore games',0,-640,838,101,'Grow your next record',6,()=>void this.navigate('home'),3);
    };
    if(this.services.remoteMode)void this.services.rank.refresh('all-time').then(render).catch(()=>this.toast('Unable to load honours.'));else render();
  }

  private profilePage():void{
    const stage=this.pageStage('Celestial passport'),p=this.services.profile.current();if(!p)return;
    text(stage,'MY CELESTIAL PASSPORT',0,628,920,82,41,COLORS.ink,true);
    const identity=this.art.image(stage,'canopy-frame-0',0,365,982,450);identity.getComponent(Sprite)!.type=Sprite.Type.SIMPLE;
    const face=this.art.image(identity,'portraits',-266,8,214,214,p.avatar);this.idleAccent(face,0,6,0,4.4);this.edgeJewels(face,176,176);bindPress(face,face,()=>this.avatars());
    text(identity,p.nickname,119,85,454,100,44,COLORS.ink,true,true);
    text(identity,p.isGuest?'FORTUNE GUEST':'FESTIVAL MEMBER',119,7,454,44,30,COLORS.ink);
    this.art.button(identity,'Edit nickname',119,-63,401,88,'Edit nickname',7,()=>this.editNickname(),0);
    [p.totalWin,p.biggestWin].forEach((v,i)=>{
      const medal=this.art.enamel(stage,i?227:-227,50,426,118);medal.name=i?'Profile best win':'Profile total won';
      text(medal,i?'TOP WIN':'TOTAL WON',0,28,358,38,30,COLORS.ink);
      this.edgeJewels(medal,388,92,i*1.8);const amount=text(medal,'',0,-23,350,51,42,COLORS.ink,true);amount.enableWrapText=false;this.count(amount,v);
    });
    const links:[string,number,()=>void][]=[['Choose portrait',4,()=>this.avatars()],['Coin ledger',0,()=>this.history()],['Language',7,()=>this.languages()],['Privacy & help',13,()=>this.legal('privacy')]];
    links.forEach(([label,icon,action],i)=>{const tile=this.art.image(stage,'canopy-soft-plate-'+(i<2?1:0),i%2?228:-228,-138-Math.floor(i/2)*178,440,148);tile.name=label;const symbol=this.art.image(tile,'interfaces',-123,0,78,78,icon);text(tile,label,42,0,230,82,32,COLORS.ink);this.idleAccent(symbol,i*.6,4,0,3.8);bindPress(tile,tile,action,{compression:.98,depth:3});});
    this.art.button(stage,'Sign out',0,-490,802,106,'Sign out',15,()=>void this.signOut(),0);
    this.art.button(stage,'Delete account',0,-620,600,86,'Delete account',15,()=>this.deleteAccount(),2);
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
      if(nickname.length<2||nickname.length>18||/[\u0000-\u001f\u007f]/.test(nickname)){error.string=tr('Use 2–18 characters');return;}
      this.busy=true;
      void this.services.profile.setNickname(nickname).then(ok=>{
        if(!ok){if(error.isValid)error.string=tr('Nickname could not be saved.');return;}
        this.closeModal();this.render();this.toast('Nickname saved.');
      }).catch(()=>{if(error.isValid)error.string=tr('Nickname could not be saved.');}).finally(()=>{this.busy=false;});
    },0);
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
  private avatars():void{const s=this.sheet('Choose your portrait',1270);for(let i=0;i<16;i++){const n=this.art.image(s,'portraits',(i%4-1.5)*210,350-Math.floor(i/4)*248,183,183,i);n.name='Choose avatar '+i;if(this.services.profile.current()?.avatar===i)this.art.image(n,'interfaces',65,-65,43,43,14);bindPress(n,n,()=>void this.selectPortrait(n,i));}}
  private async selectPortrait(portrait:Node,index:number):Promise<void>{
    if(this.busy)return;
    if(this.services.profile.current()?.avatar===index){this.closeModal();return;}
    this.busy=true;const generation=this.generation;
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
    const s=this.sheet('Your coin ledger',1190),records=this.services.save.currentScope()?.transactions??[];
    // EconomyService prepends transactions: preserve that order so recent awards stay visible.
    if(records.length){
      const names:Record<string,string>={'spin-bet':'Round wager','spin-win':'Round winnings','spin-refund':'Round refund','store-sandbox':'Sandbox coins','store-iap':'Coin purchase','balance-sync':'Balance adjustment','daily-free':'Daily chest','check-in':'Check-in gift','wheel':'Festival draw','mail':'Mail attachment','achievement':'Achievement gift','feature-win':'Bonus winnings'};
      text(s,'Latest activity first',0,429,730,44,28,COLORS.cream);
      let page=0,list:Node|undefined;const pages=Math.ceil(records.length/6);
      const pageLabel=text(s,'',0,-465,170,56,30,COLORS.cream);pageLabel.node.name='Ledger page number';
      const previous=this.art.button(s,'Previous ledger page',-275,-465,310,85,'Previous',7,()=>show(page-1),0);
      const next=this.art.button(s,'Next ledger page',275,-465,310,85,'Next',7,()=>show(page+1),0);
      const show=(index:number):void=>{
        if(index<0||index>=pages)return;page=index;list?.destroy();list=box(s,'Ledger entries',0,0,860,800);
        records.slice(page*6,page*6+6).forEach((r,i)=>{
          const row=this.art.enamel(list!,0,326-i*128,840,116);row.name='Ledger transaction '+r.id;
          text(row,names[r.type]??'Coin activity',-158,22,366,43,31,COLORS.ink,true);
          const date=new Date(r.at),stamp=Number.isFinite(date.getTime())?date.toLocaleString(language(),{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}):'—';
          text(row,stamp,-158,-26,366,32,25,COLORS.ink,false,true);
          const amount=text(row,(r.amount>0?'+':'')+exactMoney(r.amount),217,0,302,58,35,r.amount<0?'#823B2B':'#285D46',true);amount.enableWrapText=false;
          this.reveal(row,i*.035);
        });
        pageLabel.string=(page+1)+' / '+pages;opacity(previous,page?255:110);opacity(next,page<pages-1?255:110);
      };show(0);
    }
if(!records.length){const icon=this.art.image(s,'interfaces',0,156,220,220,1);this.idleAccent(icon,0,7,.3,1.5);text(s,'Your coin ledger is ready',0,-20,820,90,40,COLORS.gold,true);text(s,'Collect a reward or play a round.\nYour coin activity will appear here.',0,-132,820,142,34);this.art.button(s,'Ledger rewards',0,-302,730,108,'Explore rewards',2,()=>{this.closeModal();void this.navigate('rewards');},0);}}

  private deleteAccount():void{const s=this.sheet('Delete account & data',670);let password='';text(s,'This permanently deletes your account, progress\nand unused coins. This action cannot be undone.',0,105,830,174,36);this.field(s,'Password (not needed for guest)',-53,'',v=>password=v,true);this.art.button(s,'Confirm deletion',0,-228,780,105,'Permanently delete account',undefined,()=>void this.services.auth.deleteCurrentAccount(password).then(r=>{if(r.ok){this.page='login';this.render();}else this.toast(r.message??'Unable to delete.');}),2);}
  private mail():void {
    const panel=this.sheet('Celestial mailbox',1110),items=INBOX_MESSAGES.filter(m=>!this.services.mail.state(m.id).deleted);
    text(panel,'Palace post · Gifts and notices',0,377,750,55,31);
    items.forEach((m,i)=>{const state=this.services.mail.state(m.id),row=this.art.panel(panel,0,230-i*210,840,177,0);
      const icon=this.art.image(row,'interfaces',-293,0,94,94,state.read?5:2);this.idleAccent(icon,i*.4,3,0,1);
      text(row,m.title,45,24,540,48,31,COLORS.ink).enableWrapText=false;
      if(!state.read){const seal=box(row,'Unread letter seal',-348,49,18,18).addComponent(Graphics);seal.fillColor=new Color('#AE342B');seal.circle(0,0,9);seal.fill();}
      this.reveal(row,i*.045);
      text(row,state.claimed?'Attachment collected':m.credits?money(m.credits)+' COINS':state.read?'Read':'Unread',45,-27,530,42,28,COLORS.ink);
      bindPress(row,icon,()=>this.openMail(m.id));row.name='Mail item '+m.id;
    });
    if(!items.length)text(panel,'Your mailbox is empty',0,90,740,110,39);
    this.art.button(panel,'Claim all mail',-200,-391,390,100,'Collect all',14,()=>{if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}const before=this.services.economy.balance(),amount=this.services.mail.claimAll();this.refreshMailBadge();this.mail();if(amount){this.audio.play('reward');this.rewardArrival(before,this.services.economy.balance());}this.toast(amount?money(amount)+' coins collected':'No attachments to collect');},0);
    this.art.button(panel,'Clear read mail',200,-391,390,100,'Clear read',9,()=>{this.services.mail.deleteRead();this.refreshMailBadge();this.mail();},0);
    text(panel,'Unclaimed gifts are kept when clearing mail',0,-474,770,45,26);
  }
  private openMail(id:string):void {
    const item=INBOX_MESSAGES.find(m=>m.id===id);if(!item)return;
    this.services.mail.read(id);this.refreshMailBadge();const panel=this.sheet('Celestial letter',920),state=this.services.mail.state(id);
    text(panel,item.title,0,254,770,85,38,COLORS.ink,true);
    text(panel,item.body,0,112,740,160,33);
    const gift=this.art.image(panel,item.credits?'symbols':'interfaces',0,-70,140,140,item.credits?0:5);this.idleAccent(gift,0,5,0,1.5);
    text(panel,item.credits?money(item.credits)+' COINS':'Palace notice',0,-173,700,55,37);
    this.art.button(panel,'Collect mail attachment',0,-277,730,100,state.claimed?'Attachment collected':item.credits?'Collect attachment':'Back to mailbox',14,()=>{
      if(!item.credits||state.claimed){this.mail();return;}
      if(this.services.remoteMode){this.toast('Mail rewards require the event server.');return;}
      const before=this.services.economy.balance();
      if(this.services.mail.claim(id)){this.audio.play('reward');this.openMail(id);this.rewardArrival(before,this.services.economy.balance());this.toast(money(item.credits)+' coins collected');}
    },0);
    this.art.button(panel,'Back to mailbox',0,-383,580,76,'Back to mailbox',9,()=>this.mail(),0);
  }
  private celebration():void {
    const panel=this.sheet('CAISHEN’S BLESSING',1440),today=new Date().toISOString().slice(0,10);
    text(panel,'One free treasure draw every day',0,508,770,55,32);
    const wheel=box(panel,'Celebration carousel',0,255,520,520);
    this.art.image(panel,'symbols',0,255,200,200,1);
    this.services.wheel.sectors.forEach((amount,i)=>{const angle=i*Math.PI/4,x=Math.sin(angle)*188,y=Math.cos(angle)*188;
      this.art.image(wheel,'symbols',x,y,105,105,[0,5,11,1,9,5,11,1][i]);
    });
    text(panel,'▼',0,478,64,50,43,COLORS.ink);
    const scope=this.services.save.currentScope(),used=scope?.wheel.date===today&&scope.wheel.remaining===0&&!scope.wheel.pending;
    const result=text(panel,used?'Today’s treasure collected':'1,000–25,000 virtual coins',0,-29,760,64,35);
    this.art.button(panel,'Start celebration draw',0,-140,760,108,used?'Come back tomorrow':'Open my treasure',6,()=>{
      if(this.busy||used)return;
      if(this.services.remoteMode){this.toast('Celebration rewards require the event server.');return;}
      const draw=this.services.wheel.prepare(today);if(!draw)return;
      this.busy=true;result.string=tr('Revealing your treasure…');
      // Match angular velocity at both joins: accelerate to 360 degrees/s,
      // cruise, then decelerate to rest without an abrupt high-speed start.
      const landing=1080+draw.sector*45,cruise=(landing-486)/360;
      const motionDone=new Promise<void>(resolve=>{
        if(this.reduced){wheel.angle=landing;resolve();return;}
        tween(wheel).to(.7,{angle:126},{easing:'quadIn'})
          .to(cruise,{angle:landing-360},{easing:'linear'})
          .to(2,{angle:landing},{easing:'quadOut'}).start();
        // Settlement survives closing the presentation mid-spin.
        this.scheduleOnce(resolve,.7+cruise+2);
      });
      void motionDone.then(async()=>{
        const ok=this.services.wheel.settle(draw.spinId);this.refreshBalance();
        if(ok){this.audio.play('win');if(panel.isValid){result.string=money(draw.amount)+' COINS';this.sheen(panel,790,120,0);}this.toast(money(draw.amount)+' coins collected');await this.delay(1.5);}
      }).finally(()=>{this.busy=false;if(panel.isValid)this.celebration();});
    },3);
    const played=this.services.profile.current()?.gamesPlayed??0;
    [[3,1500],[10,5000]].forEach(([target,amount],i)=>{
      const id='celestial-festival:rounds:'+target,claimed=!!this.services.save.currentScope()?.claims[id];
      const row=this.art.panel(panel,0,-323-i*159,840,137,0);this.art.image(row,'symbols',-295,0,85,85,i?1:9);
      text(row,'Play '+target+' rounds · '+Math.min(played,target)+'/'+target,14,25,490,43,30,COLORS.ink);
      text(row,claimed?'Collected':money(amount)+' COINS',14,-24,490,42,29,COLORS.ink);
      row.name='Celebration milestone '+target;bindPress(row,row,()=>{
        if(claimed){this.toast('Reward already collected');return;}
        if(played<target){this.toast('Play any game to gather good fortune');return;}
        if(this.services.remoteMode){this.toast('Celebration rewards require the event server.');return;}
        if(this.services.rewards.claim(id,amount,'achievement')){this.audio.play('win');this.refreshBalance();this.celebration();this.toast(money(amount)+' coins collected');}
      });
    });
    text(panel,'Round milestones are one-time rewards.\nDaily draw resets at 00:00 UTC.',0,-618,790,76,27);
  }
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
    const panel=this.art.panel(overlay,0,0,978,height,2);panel.name='Parchment dialog';text(panel,title,-25,height/2-83,797,118,46,COLORS.gold,true);
    const close=this.art.button(panel,'Close dialog',413,height/2-73,95,95,'',15,()=>this.dismissModal());
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
  private dismissModal():void{
    const overlay=this.modal;if(!overlay||overlay.getChildByName('Dialog is closing'))return;
    if(this.reduced){this.closeModal();return;}
    box(overlay,'Dialog is closing',0,0,0,0);
    const alpha=opacity(overlay,overlay.getComponent(UIOpacity)?.opacity??255);Tween.stopAllByTarget(alpha);
    const panel=overlay.getChildByName('Parchment dialog');if(panel){Tween.stopAllByTarget(panel);tween(panel).to(.18,{position:new Vec3(0,-12,0)},{easing:'sineIn'}).start();}
    tween(alpha).to(.18,{opacity:0},{easing:'sineIn'}).call(()=>{if(this.modal===overlay)this.modal=undefined;if(overlay.isValid)overlay.destroy();}).start();
  }
  private closeModal():void{if(this.modal){this.modal.destroy();this.modal=undefined;}}
  private toast(message:string):void{
    this.notification?.destroy();const n=this.art.panel(this.root!,0,-this.top+338,990,178,2);text(n,message,0,0,780,100,36,COLORS.cream);this.notification=n;
    if(!this.reduced){const alpha=opacity(n,0);tween(alpha).to(.2,{opacity:255}).delay(3.8).to(.3,{opacity:0}).start();}
    this.scheduleOnce(()=>{if(n.isValid)n.destroy();if(this.notification===n)this.notification=undefined;},4.4);
  }
  protected onDestroy():void{game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.show,this);}
}
