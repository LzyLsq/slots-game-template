/* situation audio */
export function isBigWin(total:number,bet:number):boolean{return Number.isFinite(total)&&Number.isFinite(bet)&&bet>0&&total>bet;}
import { StationaryArtwork } from './vfx/StationaryArtwork';
import {LocalCoinStore,deviceAccount} from './LocalCoinStore';
const LOCAL_PRODUCTS=[{"id":"purse","credits":2500,"bonus":0,"appleProductId":"com.publisher.sovereignwealth.coins.purse.v1","label":"PURSE","debugPrice":"$1.99"},{"id":"coffer","credits":9000,"bonus":0,"appleProductId":"com.publisher.sovereignwealth.coins.coffer.v1","label":"COFFER","debugPrice":"$4.99"},{"id":"vault","credits":25000,"bonus":0,"appleProductId":"com.publisher.sovereignwealth.coins.vault.v1","label":"VAULT","debugPrice":"$9.99"}];
import {rewardArtwork,rewardInk} from './ui/RewardArtwork';
import { ThemeFestivity } from './vfx/ThemeFestivity';
import { AudioManager } from './audio/AudioManager';
import {
  _decorator, BlockInputEvents, Button, Color, Component, EventTouch, Graphics, Label, LabelOutline,
  ImageAsset, Mask, Node, Rect, ResolutionPolicy, resources, Size, Sprite, SpriteFrame, sys, Texture2D, tween, Tween,
  UITransform, UIOpacity, Vec3, view,
} from 'cc';
import { MODES, spin } from './logic/SlotMath';
import { PlayerState, Locale } from './PlayerState';
import { tr } from './Copy';

const { ccclass } = _decorator;
const DESIGN_W=1080, BASE_H=1920;
const MODE_IDS=['royal-mint','jade-treasury','diamond-foundry','crown-wheel'] as const;
type ModeId=typeof MODE_IDS[number];
type Page='login'|'home'|'store'|'rewards'|'rank'|'account'|'game';
type Grid=number[][];
interface Geometry { screen:[number,number,number,number]; title:[number,number,number,number]; bet:[number,number]; win:[number,number]; minus:[number,number]; plus:[number,number]; spin:[number,number]; auto:[number,number]; }
interface CabinetLayout { scale:number; y:number; }
interface ReelRuntime { host:Node; symbols:Sprite[]; rows:number; cellH:number; phase:number; speed:number; elapsed:number; stopAt:number; stopped:boolean; result:number[]; lastStep:number; }
interface NativeRound { modeId:ModeId;bet:number;totalWin:number;grid:Grid;stages:any[];feature:any; }

const TITLES:Record<ModeId,string>={
  'royal-mint':'ROYAL MINT','jade-treasury':'JADE TREASURY','diamond-foundry':'DIAMOND FOUNDRY','crown-wheel':'CROWN WHEEL',
};
const RULES:Record<ModeId,string[]>={
  'royal-mint':['3 × 3 reels · 5 fixed paylines.','Matching symbols pay from the leftmost reel.','The crown is WILD. A near miss may nudge reel 3 by one position.'],
  'jade-treasury':['5 × 4 reels · 1024 ways.','Matching symbols pay on adjacent reels from the left.','Any reel containing a WILD expands fully before evaluation.'],
  'diamond-foundry':['6 × 5 reels · clusters of 5 or more.','Touching symbols connect horizontally and vertically.','Winning symbols cascade; each cascade increases the multiplier.'],
  'crown-wheel':['5 × 3 reels · 20 fixed paylines.','Matching symbols pay from the leftmost reel.','3 or more SCATTER crowns trigger the prize wheel.'],
};
const MODE_COPY:Record<ModeId,{tag:string;arrival:string;accent:string;secondary:string}>={
  'royal-mint':{tag:'5 LINES · MECHANICAL NUDGE',arrival:'The royal presses are warming',accent:'#E84D3C',secondary:'#FFD36B'},
  'jade-treasury':{tag:'1024 WAYS · EXPANDING WILDS',arrival:'The jade vault is unlocking',accent:'#1BCB8A',secondary:'#E7C66B'},
  'diamond-foundry':{tag:'CLUSTER PAYS · CASCADES',arrival:'The diamond forge is igniting',accent:'#70C7FF',secondary:'#F1D38D'},
  'crown-wheel':{tag:'20 LINES · SCATTER WHEEL',arrival:'The sovereign wheel is turning',accent:'#D52F4F',secondary:'#FFD05F'},
};
const GEOMETRY:Record<ModeId,Geometry>={
  'royal-mint':{screen:[512,625,620,310],title:[512,310,590,112],bet:[286,875],win:[730,875],minus:[218,946],plus:[316,946],spin:[512,900],auto:[720,946]},
  'jade-treasury':{screen:[512,560,630,350],title:[512,248,470,106],bet:[305,817],win:[710,817],minus:[256,875],plus:[350,875],spin:[512,850],auto:[748,888]},
  'diamond-foundry':{screen:[512,666,620,312],title:[512,434,530,104],bet:[302,905],win:[715,905],minus:[250,961],plus:[342,961],spin:[512,920],auto:[704,965]},
  'crown-wheel':{screen:[512,745,600,300],title:[512,548,540,94],bet:[303,950],win:[724,950],minus:[255,1012],plus:[345,1012],spin:[512,968],auto:[735,1004]},
};
const CABINET_LAYOUT:Record<ModeId,CabinetLayout>={
  'royal-mint':{scale:1.105,y:-45},
  'jade-treasury':{scale:1.095,y:-35},
  'diamond-foundry':{scale:1.105,y:-45},
  'crown-wheel':{scale:1.135,y:-25},
};
const CORE_ASSETS=[
  'f27/scenes/login-antechamber','f27/scenes/lobby-treasury','f27/scenes/service-gallery','f27/emblems/crown-vault',
  'f27/ui/home','f27/ui/shop','f27/ui/gifts','f27/ui/rank','f27/ui/profile','f27/ui/mail','f27/ui/balance','f27/ui/claim',
  'f27/ui/back','f27/ui/rules','f27/ui/history','f27/ui/sound','f27/ui/mute','f27/ui/close','f27/ui/plus','f27/ui/minus',
  'f27/titles/royal-mint','f27/titles/jade-treasury','f27/titles/diamond-foundry','f27/titles/crown-wheel',
] as const;
const UI_KEYS=['auto','back','balance','bet','claim','close','gifts','history','home','last-win','loader','mail','minus','mute','plus','profile','rank','rules','shop','sound'] as const;

function hex(value:string,alpha=255):Color{const h=value.replace('#','');const n=parseInt(h.length===3?h.split('').map(x=>x+x).join(''):h,16);return new Color((n>>16)&255,(n>>8)&255,n&255,alpha);}
function box(parent:Node,name:string,x:number,y:number,w:number,h:number):Node{const n=new Node(name);parent.addChild(n);n.setPosition(x,y);n.addComponent(UITransform).setContentSize(w,h);return n;}
function alpha(node:Node,value=255):UIOpacity{const o=node.getComponent(UIOpacity)||node.addComponent(UIOpacity);o.opacity=value;return o;}
function label(parent:Node,value:string,x:number,y:number,w:number,h:number,size=34,color=Color.WHITE,bold=false):Label{
  const n=box(parent,value,x,y,w,h),l=n.addComponent(Label);l.string=value;l.fontSize=size;l.lineHeight=Math.round(size*1.17);l.color=color;
  l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.SHRINK;l.enableWrapText=true;l.fontFamily=bold?'Arial Black':'Arial';return l;
}
function outlined(l:Label,color='#43240C',width=2):Label{const o=l.node.addComponent(LabelOutline);o.color=hex(color);o.width=width;return l;}
function drawRounded(parent:Node,name:string,x:number,y:number,w:number,h:number,fill:Color,stroke:Color,radius=28,lineWidth=4):Node{
  const n=box(parent,name,x,y,w,h),g=n.addComponent(Graphics);g.fillColor=fill;g.roundRect(-w/2,-h/2,w,h,radius);g.fill();g.strokeColor=stroke;g.lineWidth=lineWidth;g.roundRect(-w/2+lineWidth/2,-h/2+lineWidth/2,w-lineWidth,h-lineWidth,Math.max(1,radius-lineWidth/2));g.stroke();return n;
}
function sleep(ms:number):Promise<void>{return new Promise(resolve=>setTimeout(resolve,ms));}
function dateKey():string{const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;}

class ArtBank{
  private frames=new Map<string,SpriteFrame>();
  async load(key:string):Promise<SpriteFrame>{
    const cached=this.frames.get(key);if(cached)return cached;
    try{
      const frame=await new Promise<SpriteFrame>((resolve,reject)=>resources.load(`${key}/spriteFrame`,SpriteFrame,(e,a)=>e?reject(e):resolve(a)));
      this.frames.set(key,frame);return frame;
    }catch(spriteFrameError){
      // Cocos imports SVG as ImageAsset rather than exposing a spriteFrame bundle entry.
      // Convert it at runtime so title art remains the original high quality image.
      const image=await new Promise<ImageAsset>((resolve,reject)=>resources.load(key,ImageAsset,(e,a)=>e?reject(e):resolve(a)));
      const texture=new Texture2D();texture.image=image;
      const frame=new SpriteFrame();frame.texture=texture;
      this.frames.set(key,frame);return frame;
    }
  }
  async loadMany(keys:readonly string[],progress?:(n:number,total:number)=>void):Promise<void>{let done=0;await Promise.all(keys.map(async key=>{await this.load(key);done++;progress?.(done,keys.length);}));}
  frame(key:string):SpriteFrame{return this.get(key);}
  get(key:string):SpriteFrame{return this.frames.get(key)!;}
  image(parent:Node,key:string,x:number,y:number,w:number,h:number,name=key):Node{
    const n=box(parent,name,x,y,w,h);StationaryArtwork.mark(n,key);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=this.get(key);return n;
  }
  cover(parent:Node,key:string,w:number,h:number,name=key):Node{
    const f=this.get(key),size=f.originalSize,r=Math.max(w/size.width,h/size.height);return this.image(parent,key,0,0,size.width*r,size.height*r,name);
  }
  crop(key:string,seed=0):SpriteFrame{
    const src=this.get(key),texture=src.texture,tw=texture.width,th=texture.height;
    const w=Math.max(64,Math.floor(tw*.66)),h=Math.max(64,Math.floor(th*.18));const x=Math.floor((tw-w)*(.15+(seed%4)*.18));const y=Math.floor((th-h)*(.22+((seed*37)%5)*.11));
    const f=new SpriteFrame();f.texture=texture;f.rect=new Rect(Math.min(tw-w,x),Math.min(th-h,y),w,h);f.originalSize=new Size(w,h);return f;
  }
}

@ccclass('SlotGame')
export class SlotGame extends Component{
  private audio!:AudioManager;
  private syncSound(scene:'home'|'cabinet'):void{this.audio.setMusic(this.player.data.sound);this.audio.setEffects(this.player.data.sound);this.audio.setScene(scene);}
  private localIAP=new LocalCoinStore(LOCAL_PRODUCTS,LOCAL_PRODUCTS,()=>deviceAccount(sys.localStorage,'f27','guest'),(id,amount)=>this.player.grantPurchase(id,amount));
  private art=new ArtBank();private player=new PlayerState();private page:Page='login';private pageRoot?:Node;private modal?:Node;
  private W=DESIGN_W;private H=BASE_H;private top=BASE_H/2;private bottom=-BASE_H/2;private reduced=false;private selected=0;
  private currentMode:ModeId='royal-mint';private gameRoot?:Node;private reelRuntime:ReelRuntime[]=[];private reelMask?:Node;private screenW=0;private screenH=0;
  private spinning=false;private auto=false;private betLabel?:Label;private winLabel?:Label;private balanceLabels:Label[]=[];private statusLabel?:Label;private lastWin=0;
  private loadedModes=new Set<ModeId>();private stopRequested=false;private cabinet?:Node;private idleNodes:Node[]=[];private modeLoadToken=0;

  protected start():void{
    this.audio=this.node.addComponent(AudioManager);this.syncSound('home');
    view.resizeWithBrowserSize(true);view.setDesignResolutionSize(DESIGN_W,BASE_H,ResolutionPolicy.FIXED_WIDTH);
    this.H=Math.max(BASE_H,view.getVisibleSize().height);this.top=this.H/2;this.bottom=-this.H/2;this.reduced=sys.localStorage.getItem('f27.reduced-motion')==='on';
    const t=this.node.getComponent(UITransform)||this.node.addComponent(UITransform);t.setContentSize(this.W,this.H);void this.boot();
  }
  protected update(dt:number):void{this.updateReels(dt);}
  protected onDestroy():void{Tween.stopAll();}

  private async boot():Promise<void>{
    this.buildBoot();
    try{
      await this.art.loadMany(CORE_ASSETS,(n,total)=>this.updateBoot(n/total));
      await sleep(120);this.navigate('login',true);
      // Reward artwork QA on localhost only: no authentication, spin or settlement.
      if(typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname)){
        const query=new URLSearchParams(location.search);
        if(query.get('debug')==='1'&&query.get('awardPreview')){
          const selected=MODE_IDS.find(id=>id===query.get('game'))??MODE_IDS[0];
          this.currentMode=selected;await this.art.load(`f27/controls/${selected}-plaque`);
          const fixture=label(this.node,'LOCAL STYLE PREVIEW · NO COINS CREDITED',0,this.top-40,970,50,22,hex('#FFF1CE'));
          fixture.node.setSiblingIndex(250);
          void this.bigWin(2500).then(()=>fixture.node.destroy());
        }
      }
    }catch(error){this.showBootError(String(error));}
  }
  private buildBoot():void{
    this.pageRoot?.destroy();const root=box(this.node,'Native Cocos boot',0,0,this.W,this.H);this.pageRoot=root;
    const bg=drawRounded(root,'Boot enamel',0,0,this.W+20,this.H+20,hex('#171015'),hex('#5B3217'),0,0);bg.setSiblingIndex(0);
    const rays=box(root,'Crown rays',0,100,680,680),g=rays.addComponent(Graphics);for(let i=0;i<28;i++){const a=(Math.PI*2*i)/28;g.strokeColor=new Color(255,210,95,i%2?42:78);g.lineWidth=i%2?4:8;g.moveTo(Math.cos(a)*90,Math.sin(a)*90);g.lineTo(Math.cos(a)*330,Math.sin(a)*330);g.stroke();}
    if(!this.reduced)tween(rays).by(18,{angle:360}).repeatForever().start();
    const crown=label(root,'♛',0,165,260,250,190,hex('#FFD36B'),true);outlined(crown,'#7B250F',5);this.idle(crown.node,0,16,1.025,1.6);
    outlined(label(root,'SOVEREIGN WEALTH',0,-10,910,100,59,hex('#FFF3CA'),true),'#6A220E',4);
    const track=this.materialPanel(root,0,-205,750,52,2);track.name='Boot progress track';const fill=drawRounded(track,'Boot fill',-358,0,10,24,hex('#F7B83B'),hex('#FFF1B0'),12,2);fill.getComponent(UITransform)!.anchorPoint.set(0,.5);fill.name='BootFill';
    label(root,'COCOS CREATOR · NATIVE SCENE',0,-300,780,48,25,hex('#E7C990'));
  }
  private updateBoot(p:number):void{const fill=this.pageRoot?.getChildByName('Boot progress track')?.getChildByName('BootFill');if(fill){fill.getComponent(UITransform)!.setContentSize(Math.max(10,716*p),24);} }
  private showBootError(message:string):void{if(!this.pageRoot)return;const l=label(this.pageRoot,`LOAD FAILED\n${message}`,0,-390,820,160,26,hex('#FFD4C8'));l.enableWrapText=true;}

  private navigate(page:Page,immediate=false):void{
    this.syncSound('home');this.closeModal();this.page=page;this.reelRuntime=[];this.spinning=false;this.auto=false;this.stopRequested=false;this.idleNodes=[];
    const next=box(this.node,`Page ${page}`,0,0,this.W,this.H);alpha(next,immediate?255:0);const old=this.pageRoot;this.pageRoot=next;
    if(page==='login')this.loginPage(next);else if(page==='home')this.homePage(next);else if(page==='store')this.storePage(next);else if(page==='rewards')this.rewardsPage(next);else if(page==='rank')this.rankPage(next);else if(page==='account')this.accountPage(next);
    if(immediate){old?.destroy();return;}if(old){tween(alpha(old)).to(.24,{opacity:0},{easing:'sineIn'}).call(()=>old.isValid&&old.destroy()).start();}
    tween(alpha(next)).to(.34,{opacity:255},{easing:'sineOut'}).start();
  }
  private background(root:Node,key:string):Node{const bg=this.art.cover(root,key,this.W,this.H,'Full scene');bg.setSiblingIndex(0);const shade=drawRounded(root,'Scene depth',0,0,this.W+10,this.H+10,new Color(18,8,5,58),Color.TRANSPARENT,0,0);shade.setSiblingIndex(1);return bg;}
  private brand(root:Node,y:number,w=870):Node{const n=this.art.image(root,'f27/emblems/crown-vault',0,y,w,w*.625,'Sovereign Wealth crest');this.idle(n,0,10,1.012,2.4);this.sheen(n,w*.72,100,1.2);return n;}
  private header(root:Node):void{
    const y=this.top-88;const wallet=this.materialPanel(root,-268,y,420,88,0);this.art.image(wallet,'f27/ui/balance',-160,0,58,58,'Coin purse');const l=outlined(label(wallet,this.money(this.player.data.balance),28,0,300,70,35,hex('#FFF5CE'),true),'#44230B',2);this.balanceLabels.push(l);
    const mail=this.iconButton(root,'f27/ui/mail',70,y,82,()=>this.toast('No new messages.'));mail.name='Mail';
    const profile=this.iconButton(root,'f27/ui/profile',430,y,90,()=>this.navigate('account'));profile.name='Profile';
  }
  private nav(root:Node,page:Page):void{
    const panel=this.materialPanel(root,0,this.bottom+90,1040,150,1);const entries:[Page,string,string][]=[['store','shop','shop'],['rewards','gifts','rewards'],['home','home','home'],['rank','rank','rank'],['account','profile','account']];
    entries.forEach(([p,icon,key],i)=>{const x=(i-2)*202,active=p===page;const hit=box(panel,`Nav ${p}`,x,0,185,138);if(active){const glow=drawRounded(hit,'Selected',0,0,170,126,new Color(255,208,93,44),hex('#FFD979',190),40,3);this.breathe(glow,.95,1.04,1.9+i*.1);}const face=this.art.image(hit,`f27/ui/${icon}`,0,24,active?80:66,active?80:66);label(hit,tr(this.player.data.locale,key),0,-43,176,44,23,active?hex('#FFF0A7'):hex('#F6E5C8'),true);this.bindPress(hit,face,()=>this.navigate(p));});
  }

  private loginPage(root:Node):void{
    this.background(root,'f27/scenes/login-antechamber');this.brand(root,this.top-360,850);
    const stage=this.materialPanel(root,0,-170,880,710,0);stage.name='Login console';
    outlined(label(stage,'ENTER THE SOVEREIGN VAULT',0,270,770,78,42,hex('#FFF0BD'),true),'#61200C',3);
    label(stage,'A traditional slot collection with four distinct rule sets.',0,190,760,64,26,hex('#F5DDC3'));
    this.largeButton(stage,tr(this.player.data.locale,'guest'),'f27/ui/home',0,60,690,120,()=>this.navigate('home'),0);
    const apple=this.materialPanel(stage,0,-88,690,104,3);this.appleMark(apple,-265,0);label(apple,tr(this.player.data.locale,'apple'),30,0,570,76,24,hex('#D9C7B8'),true);alpha(apple,210);
    const legal=box(stage,'Legal',0,-213,720,75);this.smallButton(legal,tr(this.player.data.locale,'terms'),-190,0,280,70,()=>this.legal('Terms'));this.smallButton(legal,tr(this.player.data.locale,'privacy'),190,0,280,70,()=>this.legal('Privacy'));
    label(stage,'Local guest profile · Purchases and Apple Sign-In are not connected.',0,-300,760,60,22,hex('#DDBF9A'));
    this.ambientCoins(root,16);
  }
  private homePage(root:Node):void{
    this.background(root,'f27/scenes/lobby-treasury');ThemeFestivity.hall(root,this.W,this.H,this.reduced);this.header(root);this.brand(root,this.top-300,690);
    const exhibit=box(root,'Treasury exhibits',0,10,960,1250);const draw=()=>{
      exhibit.removeAllChildren();const mode=MODE_IDS[this.selected],content=box(exhibit,TITLES[mode],0,25,930,1120);const arrival=this.art.image(content,`f27/loading/${mode}`,0,92,610,890,`${TITLES[mode]} environment`);StationaryArtwork.mark(arrival,`f27/loading/${mode}`);this.metalBorder(content,0,90,635,915,mode);
      const plate=this.materialPanel(content,0,-402,800,132,this.selected);outlined(label(plate,TITLES[mode],0,25,740,54,37,hex('#FFF1B7'),true),'#4A210D',3);label(plate,MODE_COPY[mode].tag,0,-28,730,43,23,hex('#EFD3A2'),true);
      this.largeButton(content,`${tr(this.player.data.locale,'enter')} · ${TITLES[mode]}`,'f27/ui/home',0,-527,740,106,()=>void this.enterMode(mode),this.selected);
    };draw();
    const swipe=box(root,'Swipe modes',0,130,960,930);let sx=0,sy=0,tracking=false;swipe.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{const p=e.getUILocation();sx=p.x;sy=p.y;tracking=true;});swipe.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{if(!tracking)return;tracking=false;const p=e.getUILocation(),dx=p.x-sx,dy=p.y-sy;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.25){this.selected=(this.selected+(dx<0?1:3))%4;draw();}});
    const selector=box(root,'Mode selector',0,this.bottom+235,800,64);MODE_IDS.forEach((m,i)=>{const dot=drawRounded(selector,m,(i-1.5)*76,0,i===this.selected?52:28,i===this.selected?28:18,i===this.selected?hex(MODE_COPY[m].accent):new Color(255,232,188,110),hex('#FFE7A2'),14,2);this.bindPress(dot,dot,()=>{this.selected=i;draw();});});
    this.nav(root,'home');this.ambientCoins(root,14);
  }

  private serviceStage(root:Node,title:string,subtitle:string):Node{
    this.background(root,'f27/scenes/service-gallery');this.header(root);const stage=this.materialPanel(root,0,-30,960,1320,1);outlined(label(stage,title,0,570,850,75,46,hex('#FFF1B5'),true),'#4A210D',3);label(stage,subtitle,0,510,820,62,25,hex('#E8CFAD'));return stage;
  }
  private storePage(root:Node):void{
    const stage=this.serviceStage(root,'SOVEREIGN TREASURY',tr(this.player.data.locale,'demo'));
    const packs=[['Coin Purse',2500,'$1.99'],['Royal Coffer',9000,'$4.99'],['Crown Vault',25000,'$9.99']];packs.forEach(([name,coins,price],i)=>{const p=this.materialPanel(stage,0,320-i*270,790,230,i);this.art.image(p,'f27/ui/shop',-280,20,135,135);outlined(label(p,String(name),40,62,430,55,34,hex('#FFF0B0'),true),'#4A210D',2);label(p,`${Number(coins).toLocaleString()} COINS`,40,4,430,50,28,hex('#F4D092'),true);this.smallButton(p,'BUY · UNAVAILABLE',100,-73,410,68,()=>{void this.localIAP.purchase(LOCAL_PRODUCTS[i].id).then(r=>{this.refreshBalances();this.toast(r.message);});});});
    this.smallButton(stage,'Sync unfinished purchases',0,-490,690,68,()=>void this.localIAP.restore().then(r=>{this.refreshBalances();this.toast(r.message);}));
    void this.localIAP.catalog().then(items=>{const labels=stage.getComponentsInChildren(Label).filter(l=>l.string==='BUY · UNAVAILABLE');labels.forEach((l,i)=>{if(l.isValid)l.string=items[i]?.available?'BUY · '+items[i].displayPrice:'UNAVAILABLE';});});
    this.nav(root,'store');
  }
  private rewardsPage(root:Node):void{
    const stage=this.serviceStage(root,'ROYAL REWARDS','Seven-day local reward calendar');const today=dateKey(),claimed=this.player.data.claimedDay===today;
    for(let i=0;i<7;i++){const x=(i%2?215:-215),y=360-Math.floor(i/2)*205;const p=this.materialPanel(stage,x,y,385,165,i);label(p,`DAY ${i+1}`,0,47,300,42,25,hex('#F6D78E'),true);this.art.image(p,'f27/ui/gifts',-105,-21,80,80);label(p,`+${(i+1)*500}`,45,-8,170,48,28,hex('#FFF3C4'),true);if(i===new Date().getDay()){this.smallButton(p,claimed?tr(this.player.data.locale,'claimed'):tr(this.player.data.locale,'claim'),64,-58,210,54,()=>{if(this.player.data.claimedDay===today)return;this.player.data.claimedDay=today;this.player.credit((i+1)*500);this.refreshBalances();this.rewardsPageRefresh();});}else alpha(p,190);}
    this.nav(root,'rewards');
  }
  private rewardsPageRefresh():void{this.navigate('rewards');this.toast('Daily reward added to balance.');}
  private rankPage(root:Node):void{
    const stage=this.serviceStage(root,'SOVEREIGN HONOURS',tr(this.player.data.locale,'virtual'));const rivals=[['Aurelia',420800],['Jade Fox',318600],[this.player.data.nickname,Math.round(this.player.data.balance+this.player.data.biggestWin*8)],['Blue Regent',168400],['Ruby Lion',125700],['Mint Master',94200],['Crown Keeper',78500],['Velvet Ace',63200]];rivals.sort((a,b)=>Number(b[1])-Number(a[1]));rivals.forEach(([name,score],i)=>{const y=400-i*115,p=this.materialPanel(stage,0,y,790,94,i);label(p,String(i+1),-330,0,55,65,28,i<3?hex('#FFD16E'):hex('#E5D2B0'),true);this.art.image(p,`f27/symbols/${MODE_IDS[i%4]}/${i%8}`,-245,0,64,64);label(p,String(name),-30,0,300,60,28,name===this.player.data.nickname?hex('#FFF1A6'):hex('#F3E4D0'),true);label(p,Number(score).toLocaleString(),270,0,230,60,28,hex('#FFD887'),true);});this.nav(root,'rank');
  }
  private accountPage(root:Node):void{
    const stage=this.serviceStage(root,'CAPTAIN ACCOUNT','Local profile, language, sound and avatar');
    const profile=this.materialPanel(stage,0,365,790,200,0);this.art.image(profile,`f27/symbols/${MODE_IDS[this.player.data.avatar%4]}/${this.player.data.avatar%8}`,-280,0,128,128);outlined(label(profile,this.player.data.nickname,45,40,510,60,35,hex('#FFF1B7'),true),'#4A210D',2);label(profile,`${this.player.data.spins} SPINS · BEST ${this.money(this.player.data.biggestWin)}`,45,-35,510,50,24,hex('#E4C99E'));
    label(stage,'SELECT CREST',0,225,700,50,26,hex('#F4D58C'),true);for(let i=0;i<8;i++){const x=(i-3.5)*100,hit=this.iconButton(stage,`f27/symbols/${MODE_IDS[i%4]}/${i%8}`,x,125,78,()=>{this.player.data.avatar=i;this.player.save();this.navigate('account');});if(i===this.player.data.avatar)this.metalBorder(hit,0,0,90,90,MODE_IDS[i%4]);}
    label(stage,tr(this.player.data.locale,'language'),0,20,600,45,26,hex('#F4D58C'),true);const locales:Locale[]=['en','zh-CN','es','ja'];locales.forEach((loc,i)=>this.smallButton(stage,loc,(i-1.5)*190,-65,165,65,()=>{this.player.data.locale=loc;this.player.save();this.navigate('account');}));
    this.largeButton(stage,`${tr(this.player.data.locale,'sound')} · ${this.player.data.sound?'ON':'OFF'}`,this.player.data.sound?'f27/ui/sound':'f27/ui/mute',0,-205,650,90,()=>{this.player.data.sound=!this.player.data.sound;this.player.save();this.navigate('account');},2);
    this.largeButton(stage,tr(this.player.data.locale,'logout'),'f27/ui/back',0,-340,650,90,()=>this.navigate('login'),3);this.smallButton(stage,'Music credits',0,-450,650,70,()=>window.dispatchEvent(new Event('game-music-credits')));this.nav(root,'account');
  }

  private async enterMode(mode:ModeId):Promise<void>{
    const token=++this.modeLoadToken;const overlay=box(this.node,`Load ${mode}`,0,0,this.W,this.H);overlay.addComponent(BlockInputEvents);alpha(overlay,0);tween(alpha(overlay)).to(.2,{opacity:255}).start();
    const bg=await this.art.load(`f27/loading/${mode}`).then(()=>this.art.cover(overlay,`f27/loading/${mode}`,this.W,this.H));bg.setSiblingIndex(0);const shade=drawRounded(overlay,'Arrival shade',0,0,this.W+10,this.H+10,new Color(12,5,8,78),Color.TRANSPARENT,0,0);shade.setSiblingIndex(1);
    outlined(label(overlay,TITLES[mode],0,220,900,100,55,hex('#FFF1B5'),true),'#4A210D',4);label(overlay,MODE_COPY[mode].arrival,0,125,850,60,27,hex('#F3D3AE'));
    const track=this.materialPanel(overlay,0,-130,760,54,MODE_IDS.indexOf(mode)),fill=drawRounded(track,'Mode load fill',-358,0,10,24,hex(MODE_COPY[mode].accent),hex(MODE_COPY[mode].secondary),12,2);fill.getComponent(UITransform)!.anchorPoint.set(0,.5);const pct=label(overlay,'0%',0,-210,300,48,27,hex('#FFF1C3'),true);
    const keys=[`f27/cabinets/${mode}`,`f27/titles/${mode}`,...Array.from({length:8},(_,i)=>`f27/symbols/${mode}/${i}`),...UI_KEYS.map(x=>`f27/ui/${x}`),...['auto','deck','orb','plaque','spin','utility'].map(x=>`f27/controls/${mode}-${x}`),`f27/ui/spin-${mode==='royal-mint'?'mint':mode==='jade-treasury'?'jade':mode==='diamond-foundry'?'foundry':'crown'}`];
    try{await this.art.loadMany(keys,(n,total)=>{const p=n/total;fill.getComponent(UITransform)!.setContentSize(Math.max(10,716*p),24);pct.string=`${Math.round(p*100)}%`;});if(token!==this.modeLoadToken)return;this.loadedModes.add(mode);await sleep(80);tween(alpha(overlay)).to(.28,{opacity:0}).call(()=>{overlay.destroy();this.buildGame(mode);}).start();}
    catch(e){pct.string='LOAD FAILED';this.largeButton(overlay,tr(this.player.data.locale,'retry'),'f27/ui/loader',0,-320,560,90,()=>{overlay.destroy();void this.enterMode(mode);},0);this.smallButton(overlay,tr(this.player.data.locale,'back'),0,-430,420,70,()=>{overlay.destroy();this.navigate('home');});}
  }
  private buildGame(mode:ModeId):void{
    this.syncSound('cabinet');this.closeModal();this.page='game';this.currentMode=mode;this.reelRuntime=[];this.balanceLabels=[];const root=box(this.node,`Game ${mode}`,0,0,this.W,this.H);const old=this.pageRoot;this.pageRoot=root;this.gameRoot=root;alpha(root,0);
    // Keep a fully rendered service-gallery scene underneath the cabinet. It prevents a transparent
    // cabinet cutout or a slow mode texture from exposing the engine's white clear color; the
    // mode-specific arrival art remains the visible layer once its texture is ready.
    const fallback=this.art.image(root,'f27/scenes/service-gallery',0,0,this.W,this.H,'Game fallback scene');fallback.setSiblingIndex(0);
    const bg=this.art.image(root,`f27/loading/${mode}`,0,0,this.W,this.H,`${TITLES[mode]} scene`);bg.setSiblingIndex(1);
    const shade=drawRounded(root,'Game depth',0,0,this.W+10,this.H+10,new Color(13,7,10,95),Color.TRANSPARENT,0,0);shade.setSiblingIndex(2);
    const toolbar=box(root,'Cabinet tools',0,this.top-84,1030,126);this.iconButton(toolbar,'f27/ui/back',-445,0,78,()=>this.navigate('home'));this.iconButton(toolbar,'f27/ui/history',245,0,78,()=>this.history());this.iconButton(toolbar,'f27/ui/rules',345,0,78,()=>this.rules());this.iconButton(toolbar,this.player.data.sound?'f27/ui/sound':'f27/ui/mute',445,0,78,()=>{this.player.data.sound=!this.player.data.sound;this.player.save();this.buildGame(mode);});
    const wallet=this.materialPanel(root,-300,this.top-180,430,84,0);this.art.image(wallet,'f27/ui/balance',-165,0,56,56);const balance=outlined(label(wallet,this.money(this.player.data.balance),35,0,310,60,34,hex('#FFF2BC'),true),'#4A210D',2);this.balanceLabels.push(balance);
    const layout=CABINET_LAYOUT[mode],scale=layout.scale,cabW=1024*scale,cabH=1536*scale,cabY=layout.y;const cabinet=this.art.image(root,`f27/cabinets/${mode}`,0,cabY,cabW,cabH,`${TITLES[mode]} cabinet`);this.cabinet=cabinet;cabinet.setSiblingIndex(3);this.cabinetIdle(cabinet,mode);
    this.buildReelWindow(root,mode,cabW/1024,cabY);this.buildCabinetText(root,mode,cabW/1024,cabY);this.buildCabinetControls(root,mode,cabW/1024,cabY);this.statusLabel=outlined(label(root,MODE_COPY[mode].tag,0,this.bottom+58,980,74,29,hex('#FFF0B9'),true),'#44210D',3);
    tween(alpha(root)).to(.38,{opacity:255},{easing:'sineOut'}).start();if(old)tween(alpha(old)).to(.22,{opacity:0}).call(()=>old.isValid&&old.destroy()).start();
  }
  private p2l(px:number,py:number,scale:number,cabY:number):[number,number]{return [(px-512)*scale,(768-py)*scale+cabY];}
  private buildReelWindow(root:Node,mode:ModeId,scale:number,cabY:number):void{
    const [px,py,w,h]=GEOMETRY[mode].screen,[x,y]=this.p2l(px,py,scale,cabY);this.screenW=w*scale;this.screenH=h*scale;
    const maskNode=box(root,'Reel glass aperture',x,y,this.screenW,this.screenH);maskNode.setSiblingIndex(4);const mask=maskNode.addComponent(Mask);mask.type=Mask.Type.GRAPHICS_RECT;this.reelMask=maskNode;
    const under=this.art.image(maskNode,`f27/loading/${mode}`,0,0,this.screenW*1.04,this.screenH*2.5,'Reel chamber material');under.getComponent(Sprite)!.color=new Color(92,96,110,190);
    const cols=MODES.find((m:any)=>m.id===mode)!.cols,rows=MODES.find((m:any)=>m.id===mode)!.rows,cw=this.screenW/cols,ch=this.screenH/rows;
    this.reelRuntime=[];for(let c=0;c<cols;c++){const host=box(maskNode,`Reel ${c+1}`,-this.screenW/2+cw*(c+.5),0,cw,ch*rows);const symbols:Sprite[]=[];for(let r=0;r<rows+2;r++){const n=box(host,`Symbol ${r}`,0,this.screenH/2-ch*(r-.5),cw*.92,ch*.9);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.spriteFrame=this.art.get(`f27/symbols/${mode}/${(c+r)%8}`);symbols.push(s);if(c>0){const divider=drawRounded(host,`Divider ${r}`,-cw/2,-this.screenH/2,cw?2:2,this.screenH,new Color(255,221,142,48),Color.TRANSPARENT,0,0);divider.setSiblingIndex(0);}}
      this.reelRuntime.push({host,symbols,rows,cellH:ch,phase:0,speed:0,elapsed:0,stopAt:0,stopped:true,result:Array.from({length:rows},(_,r)=>(c+r)%8),lastStep:0});}
    const glass=box(maskNode,'Glass reflection',0,0,this.screenW,this.screenH),g=glass.addComponent(Graphics);g.fillColor=new Color(255,255,255,18);g.moveTo(-this.screenW/2,this.screenH/2);g.lineTo(-this.screenW*.1,this.screenH/2);g.lineTo(-this.screenW*.36,-this.screenH/2);g.lineTo(-this.screenW/2,-this.screenH/2);g.close();g.fill();
    this.metalBorder(root,x,y,this.screenW+10,this.screenH+10,mode,4);
    const trim=ThemeFestivity.cabinet(root,x,y,this.screenW,this.screenH,cols,this.reduced);trim.node.setSiblingIndex(6);
  }
  private buildCabinetText(root:Node,mode:ModeId,scale:number,cabY:number):void{
    const g=GEOMETRY[mode],[tx,ty]=this.p2l(g.title[0],g.title[1],scale,cabY);
    // The supplied title bitmaps have an opaque square canvas and clipped lettering.
    // Use the cabinet's material and a fitted label instead of stretching that canvas.
    const title=this.materialPanel(root,tx,ty,g.title[2]*scale,g.title[3]*scale,MODE_IDS.indexOf(mode));title.name=`${TITLES[mode]} title`;title.setSiblingIndex(6);
    outlined(label(title,TITLES[mode],0,0,g.title[2]*scale*.88,g.title[3]*scale*.76,43*scale,hex('#FFF1B5'),true),'#4A210D',3);
    this.idle(title,0,3,1.004,2.8);this.sheen(title,g.title[2]*scale*.72,60,.6);
    const [bx,by]=this.p2l(g.bet[0],g.bet[1],scale,cabY),[wx,wy]=this.p2l(g.win[0],g.win[1],scale,cabY);
    const plaque=`f27/controls/${mode}-plaque`;
    const betPanel=this.art.image(root,plaque,bx,by,180*scale,58*scale,'Bet plaque'),winPanel=this.art.image(root,plaque,wx,wy,205*scale,58*scale,'Win plaque');betPanel.setSiblingIndex(7);winPanel.setSiblingIndex(7);
    this.betLabel=outlined(label(betPanel,this.money(this.player.data.bet),0,0,170*scale,54*scale,28,hex('#FFF6D0'),true),'#28170C',2);this.winLabel=outlined(label(winPanel,this.money(this.lastWin),0,0,195*scale,54*scale,28,hex('#FFF6D0'),true),'#28170C',2);
  }
  private buildCabinetControls(root:Node,mode:ModeId,scale:number,cabY:number):void{
    const g=GEOMETRY[mode],spinKey=`f27/ui/spin-${mode==='royal-mint'?'mint':mode==='jade-treasury'?'jade':mode==='diamond-foundry'?'foundry':'crown'}`;
    const controls:[keyof Geometry,string,()=>void,number][]=[['minus',`f27/controls/${mode}-utility`,()=>this.changeBet(-1),88],['plus',`f27/controls/${mode}-utility`,()=>this.changeBet(1),88],['spin',`f27/controls/${mode}-spin`,()=>void this.spinRound(),168],['auto',`f27/controls/${mode}-auto`,()=>this.toggleAuto(),92]];
    controls.forEach(([key,asset,action,size])=>{const p=g[key] as [number,number],[x,y]=this.p2l(p[0],p[1],scale,cabY);const hit=box(root,`${String(key).toUpperCase()} control`,x,y,size*scale,size*scale);hit.setSiblingIndex(8);const face=this.art.image(hit,asset,0,0,size*scale*.78,size*scale*.78,`${String(key)} control face`);const overlay=key==='spin'?this.art.image(hit,spinKey,0,0,size*scale*.43,size*scale*.43,`${String(key)} glyph`):undefined;if(key==='spin'){this.breathe(face,.985,1.02,1.8);this.sheen(face,size*.58,70,1.1);}this.bindPress(hit,overlay||face,action,{depth:key==='spin'?9:5,scale:key==='spin'?.92:.94});});
  }
  private changeBet(direction:number):void{if(this.spinning)return;const bets=[25,50,100,200,500,1000],index=Math.max(0,bets.indexOf(this.player.data.bet)),next=(index+direction+bets.length)%bets.length;this.player.data.bet=bets[next];this.audio.play(direction>0?'bet-up':'bet-down');this.player.save();if(this.betLabel)this.betLabel.string=this.money(this.player.data.bet);this.toast(`BET ${this.money(this.player.data.bet)}`);}
  private toggleAuto():void{this.auto=!this.auto;this.toast(this.auto?'AUTO ON · tap again to stop':'AUTO OFF');if(this.auto&&!this.spinning)void this.spinRound();}
  private async spinRound():Promise<void>{
    if(this.spinning){if(this.auto){this.auto=false;this.toast('AUTO OFF');}return;}const bet=this.player.data.bet;if(!this.player.debit(bet)){this.toast(tr(this.player.data.locale,'insufficient'));return;}
    this.refreshBalances();this.spinning=true;this.lastWin=0;if(this.winLabel)this.winLabel.string=this.money(0);if(this.statusLabel)this.statusLabel.string='GOOD LUCK';this.clearWinFrames();const round=spin(this.currentMode,bet,Math.random) as NativeRound;
    this.audio.play('spin');this.startReels(round.grid);await this.waitForReels();this.audio.finishSpin();await this.presentStages(round);this.player.credit(round.totalWin);this.player.record(this.currentMode,bet,round.totalWin);this.lastWin=round.totalWin;this.refreshBalances();if(this.winLabel)this.winLabel.string=this.money(round.totalWin);this.spinning=false;
    if(this.statusLabel)this.statusLabel.string=round.totalWin>0?`${tr(this.player.data.locale,'ordinary')} · +${this.money(round.totalWin)}`:MODE_COPY[this.currentMode].tag;if(this.auto)await sleep(650),this.auto&&void this.spinRound();
  }
  private startReels(grid:Grid):void{this.reelRuntime.forEach((r,c)=>{r.elapsed=0;r.phase=0;r.speed=10+r.rows*.4;r.stopAt=.86+c*.17;r.stopped=false;r.result=grid[c];r.lastStep=-1;});}
  private updateReels(dt:number):void{
    if(!this.reelRuntime.length)return;for(let c=0;c<this.reelRuntime.length;c++){const r=this.reelRuntime[c];if(r.stopped)continue;r.elapsed+=dt;const ramp=Math.min(1,r.elapsed/.18),brake=r.elapsed>r.stopAt?Math.max(0,1-(r.elapsed-r.stopAt)/.32):1;r.phase+=r.speed*r.cellH*dt*ramp*brake;const step=Math.floor(r.phase/r.cellH);if(step!==r.lastStep){r.lastStep=step;r.symbols.forEach((s,i)=>s.spriteFrame=this.art.get(`f27/symbols/${this.currentMode}/${Math.floor(Math.random()*8)}`));}
      const offset=r.phase%r.cellH;r.symbols.forEach((s,i)=>s.node.setPosition(0,this.screenH/2-r.cellH*(i-.5)-offset));if(r.elapsed>=r.stopAt+.32)this.settleReel(r,c);}
  }
  private settleReel(r:ReelRuntime,column:number):void{r.stopped=true;r.symbols.forEach((s,i)=>{s.node.setPosition(0,this.screenH/2-r.cellH*(i+.5));if(i<r.rows)s.spriteFrame=this.art.get(`f27/symbols/${this.currentMode}/${r.result[i]}`);});r.host.setPosition(r.host.position.x,18);tween(r.host).to(.19,{position:new Vec3(r.host.position.x,-7,0)},{easing:'sineIn'}).to(.22,{position:new Vec3(r.host.position.x,0,0)},{easing:'backOut'}).start();this.reelLand(column);this.gameRoot?.getComponentInChildren(ThemeFestivity)?.land(column);this.audio.playReelStop(column,this.reelRuntime.every(r=>r.stopped));}
  private waitForReels():Promise<void>{return new Promise(resolve=>{
    // A scheduleOnce callback cannot re-register itself: Cocos removes its
    // timer after the callback returns. Poll with one repeating timer instead.
    const tick=()=>{if(this.reelRuntime.every(r=>r.stopped)){this.unschedule(tick);resolve();}};
    this.schedule(tick,.04);tick();
  });}
  private reelLand(column:number):void{const x=-this.screenW/2+(column+.5)*(this.screenW/this.reelRuntime.length);const flash=drawRounded(this.reelMask!,`Reel ${column+1} land`,x,0,this.screenW/this.reelRuntime.length*.82,this.screenH,new Color(255,235,170,42),Color.TRANSPARENT,10,0);alpha(flash,0);tween(alpha(flash)).to(.08,{opacity:200}).to(.22,{opacity:0}).call(()=>flash.destroy()).start();}
  private async presentStages(round:NativeRound):Promise<void>{
    let winning:any[]=[];round.stages.forEach(stage=>stage.wins?.forEach((w:any)=>winning.push(...w.cells)));const unique=new Map(winning.map(c=>[`${c.c}:${c.r}`,c]));if(unique.size){this.showWinFrames([...unique.values()]);await sleep(420);}
    if(round.totalWin>0){this.gameRoot?.getComponentInChildren(ThemeFestivity)?.celebrate(isBigWin(round.totalWin,round.bet)?(round.totalWin/round.bet>=100?4:round.totalWin/round.bet>=50?3:round.totalWin/round.bet>=10?2:1):0);
      if(isBigWin(round.totalWin,round.bet))this.audio.playWinFanfare(round.totalWin/round.bet>=100?4:round.totalWin/round.bet>=40?3:round.totalWin/round.bet>=20?2:1);else this.audio.playSmallWinJingle();
      this.coinFlight(Math.min(26,8+unique.size*2));const multiplier=round.totalWin/round.bet;if(isBigWin(round.totalWin,round.bet)){await this.bigWin(round.totalWin,round.feature?.wheel?`WHEEL ×${round.feature.multiplier}`:undefined);}else{await this.ordinaryWin(round.totalWin);this.audio.playWinDetail('collect');}this.audio.finishWinPresentation();}
    if(round.feature?.expandedReels?.length)this.toast(`EXPANDING WILD · REELS ${round.feature.expandedReels.map((x:number)=>x+1).join(', ')}`);if(round.feature?.cascades)this.toast(`${round.feature.cascades} CASCADES · ×${round.feature.maxMultiplier}`);if(round.feature?.nudge)this.toast('MECHANICAL NUDGE');
  }
  private showWinFrames(cells:{c:number;r:number}[]):void{const cols=this.reelRuntime.length,rows=this.reelRuntime[0].rows,cw=this.screenW/cols,ch=this.screenH/rows;cells.forEach(({c,r})=>{const x=-this.screenW/2+cw*(c+.5),y=this.screenH/2-ch*(r+.5),frame=box(this.reelMask!,`WIN ${c}:${r}`,x,y,cw*.9,ch*.88),g=frame.addComponent(Graphics);g.strokeColor=hex('#FFE07A');g.lineWidth=5;g.roundRect(-cw*.43,-ch*.41,cw*.86,ch*.82,Math.min(18,ch*.18));g.stroke();g.strokeColor=new Color(255,255,224,170);g.lineWidth=2;g.roundRect(-cw*.38,-ch*.36,cw*.76,ch*.72,Math.min(14,ch*.14));g.stroke();alpha(frame,0);frame.setScale(.88,.88);tween(alpha(frame)).to(.18,{opacity:255}).start();tween(frame).to(.28,{scale:new Vec3(1.04,1.04,1)},{easing:'backOut'}).to(.2,{scale:Vec3.ONE},{easing:'sineOut'}).start();});}
  private clearWinFrames():void{this.reelMask?.children.filter(n=>n.name.startsWith('WIN ')).forEach(n=>{tween(alpha(n)).to(.16,{opacity:0}).call(()=>n.destroy()).start();});}
  private ordinaryWin(amount:number):Promise<void>{return new Promise(resolve=>{const panel=rewardArtwork(this.art,this.gameRoot!,0,30,680,170,MODE_IDS.indexOf(this.currentMode),'compact');panel.name='Ordinary win';panel.setSiblingIndex(20);alpha(panel,0);panel.setScale(.82,.82);const count=outlined(label(panel,`${tr(this.player.data.locale,'ordinary')}  +${this.money(this.reduced?amount:0)}`,0,0,620,90,46,hex('#FFF2A7'),true),'#7A260D',4);if(!this.reduced){const value={n:0};tween(value).to(.58,{n:amount},{easing:'cubicOut',onUpdate:()=>{if(count.isValid){count.string=`${tr(this.player.data.locale,'ordinary')}  +${this.money(value.n)}`;this.audio.playWinDetail('count',value.n/amount,0);}}}).call(()=>{if(count.isValid)count.string=`${tr(this.player.data.locale,'ordinary')}  +${this.money(amount)}`;}).start();}tween(alpha(panel)).to(.18,{opacity:255}).delay(.72).to(.24,{opacity:0}).call(()=>{panel.destroy();resolve();}).start();tween(panel).to(.32,{scale:Vec3.ONE},{easing:'backOut'}).start();});}
  private bigWin(amount:number,feature?:string):Promise<void>{return new Promise(resolve=>{
    const stage=box(this.node,'Grand fortune stage',0,0,this.W,this.H);stage.addComponent(BlockInputEvents);stage.setSiblingIndex(200);alpha(stage,0);
    this.art.cover(stage,'f27/scenes/service-gallery',this.W,this.H);drawRounded(stage,'Celebration depth',0,0,this.W+10,this.H+10,new Color(45,12,4,135),Color.TRANSPARENT,0,0);
    const crest=this.art.image(stage,'f27/emblems/crown-vault',0,205,920,575);this.idle(crest,0,12,1.025,1.4);
    const theme=MODE_IDS.indexOf(this.currentMode),title=rewardArtwork(this.art,stage,0,15,910,160,theme,'title'),meter=rewardArtwork(this.art,stage,0,-165,850,175,theme,'amount');
    outlined(label(title,tr(this.player.data.locale,'big'),0,0,580,95,58,hex(rewardInk(theme)),true),'#3E2318',2);
    if(feature)label(stage,feature,0,-80,700,40,28,hex('#FFF1BB'),true);
    const count=outlined(label(meter,'0',0,0,560,100,76,hex(rewardInk(theme)),true),'#3E2318',2);count.cacheMode=Label.CacheMode.CHAR;
    this.coinRain(stage,42);let age=0,done=false;
    const finish=()=>{if(done)return;done=true;count.string=`+${this.money(amount)}`;this.unschedule(tick);this.audio.finishWinPresentation();this.audio.playWinDetail('collect');tween(alpha(stage)).to(.26,{opacity:0}).call(()=>{stage.destroy();resolve();}).start();};
    const tick=(dt:number)=>{if(!stage.isValid){this.unschedule(tick);if(!done){done=true;resolve();}return;}if(typeof document!=='undefined'&&document.hidden)return;age+=dt;const p=Math.min(1,age/1.65);count.string=`+${this.money(Math.round(amount*(1-Math.pow(1-p,3))))}`;this.audio.playWinDetail('count',p);if(this.auto&&age>=4.8)finish();};
    this.schedule(tick,0);this.rewardButton(stage,tr(this.player.data.locale,'claim'),0,-365,580,118,finish,0);tween(alpha(stage)).to(.25,{opacity:255}).start();
  });}

  private rules():void{const mode=this.currentMode;this.modalPanel(`${TITLES[mode]} · ${tr(this.player.data.locale,'rules')}`,RULES[mode].map((r,i)=>`${i+1}. ${r}`).join('\n\n')+`\n\n${this.paytableText(mode)}`);}
  private paytableText(mode:ModeId):string{return mode==='royal-mint'?'Top symbol: 15× line bet · WILD: 25× line bet.':mode==='jade-treasury'?'Awards use the number of matching ways across 3–5 adjacent reels.':mode==='diamond-foundry'?'Cluster awards increase on each consecutive cascade.':'SCATTER wheel prizes range from 2× to 50× total bet.';}
  private history():void{const rows=this.player.data.history.length?this.player.data.history.slice(0,8).map(x=>`${TITLES[x.mode as ModeId]}   BET ${this.money(x.bet)}   WIN ${this.money(x.win)}`).join('\n\n'):'No completed spins yet.';this.modalPanel(tr(this.player.data.locale,'history'),rows);}
  private legal(kind:string):void{this.modalPanel(kind,kind==='Privacy'?'Local demo data stays on this device. No analytics, advertising identifier, payment account, or remote profile is connected.':'Guest play is for local demonstration. The iOS app uses Apple-verified coin purchases. Guest progress is device-local. Consumed coins cannot be restored.');}
  private modalPanel(title:string,body:string):void{this.closeModal();this.audio.setModalOpen(true);const root=box(this.node,`Modal ${title}`,0,0,this.W,this.H);root.addComponent(BlockInputEvents);root.setSiblingIndex(300);alpha(root,0);drawRounded(root,'Dim',0,0,this.W+10,this.H+10,new Color(8,4,5,150),Color.TRANSPARENT,0,0);const panel=this.materialPanel(root,0,0,900,1030,0);outlined(label(panel,title,0,410,790,92,43,hex('#FFF1AF'),true),'#4E200C',3);const copy=label(panel,body,0,10,760,710,29,hex('#F6E4C9'));copy.horizontalAlign=Label.HorizontalAlign.LEFT;copy.verticalAlign=Label.VerticalAlign.TOP;copy.lineHeight=42;copy.overflow=Label.Overflow.SHRINK;this.largeButton(panel,tr(this.player.data.locale,'close'),'f27/ui/close',0,-420,580,88,()=>this.closeModal(),2);this.modal=root;tween(alpha(root)).to(.22,{opacity:255}).start();}
  private closeModal():void{this.audio.setModalOpen(false);if(!this.modal)return;const m=this.modal;this.modal=undefined;tween(alpha(m)).to(.16,{opacity:0}).call(()=>m.isValid&&m.destroy()).start();}

  private materialPanel(parent:Node,x:number,y:number,w:number,h:number,style=0):Node{
    const n=box(parent,'Crafted material',x,y,w,h),s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;if(this.art.get('f27/scenes/service-gallery'))s.spriteFrame=this.art.crop('f27/scenes/service-gallery',style);
    // Keep the source material visible. The old strong tint flattened the service/gallery texture into generic color cards.
    s.color=new Color(255,255,255,236);
    const veil=drawRounded(n,'Material depth',0,0,w-18,h-18,new Color(26,10,6,34),Color.TRANSPARENT,Math.min(30,h*.22),0);veil.setSiblingIndex(0);
    const rim=n.addComponent(Graphics);rim.strokeColor=new Color(255,219,132,230);rim.lineWidth=5;rim.roundRect(-w/2+3,-h/2+3,w-6,h-6,Math.min(34,h*.28));rim.stroke();rim.strokeColor=new Color(77,35,15,220);rim.lineWidth=2;rim.roundRect(-w/2+10,-h/2+10,w-20,h-20,Math.min(28,h*.24));rim.stroke();
    const highlight=n.addComponent(Graphics);highlight.strokeColor=new Color(255,244,192,82);highlight.lineWidth=1.2;highlight.roundRect(-w/2+16,-h/2+16,w-32,h-32,Math.min(24,h*.2));highlight.stroke();return n;
  }
  private rewardButton(parent:Node,value:string,x:number,y:number,w:number,h:number,action:()=>void,_style=0):Node {
    const hit=box(parent,'Collect reward',x,y,w,h),face=rewardArtwork(this.art,hit,0,0,w,h,MODE_IDS.indexOf(this.currentMode),'button');
    outlined(label(face,value,0,0,w*.66,h*.58,31,hex('#FFF1CE'),true),'#3E2318',2);this.bindPress(hit,face,action,{depth:6,scale:.975});return hit;
  }
  private largeButton(parent:Node,textValue:string,icon:string,x:number,y:number,w:number,h:number,action:()=>void,style=0):Node{const n=this.materialPanel(parent,x,y,w,h,style);n.name=textValue;const face=box(n,'Button face',0,0,w,h);this.art.image(face,icon,-w*.39,0,h*.56,h*.56);outlined(label(face,textValue,w*.07,0,w*.75,h*.72,Math.min(34,h*.31),hex('#FFF2C2'),true),'#4C210C',2);this.bindPress(n,face,action,{depth:6,scale:.975});this.sheen(n,w*.75,h*.7,style*.3);return n;}
  private smallButton(parent:Node,textValue:string,x:number,y:number,w:number,h:number,action:()=>void):Node{const n=this.materialPanel(parent,x,y,w,h,2);n.name=textValue;const l=outlined(label(n,textValue,0,0,w*.9,h*.75,Math.min(27,h*.38),hex('#FFF1C5'),true),'#4B210C',2);this.bindPress(n,l.node,action,{depth:4,scale:.97});return n;}
  private iconButton(parent:Node,key:string,x:number,y:number,size:number,action:()=>void):Node{const n=this.materialPanel(parent,x,y,size,size,2);n.name=key;const icon=this.art.image(n,key,0,0,size*.66,size*.66);this.bindPress(n,icon,action,{depth:4,scale:.9});return n;}
  private bindPress(hit:Node,face:Node,action:()=>void,feel:{depth?:number;scale?:number}={}):void{hit.addComponent(Button);let armed=true;const y=face.position.y;hit.on(Node.EventType.TOUCH_START,()=>{if(!armed)return;Tween.stopAllByTarget(face);tween(face).to(.07,{position:new Vec3(face.position.x,y-(feel.depth??5),0),scale:new Vec3(feel.scale??.95,feel.scale??.95,1)},{easing:'sineOut'}).start();});const release=()=>{Tween.stopAllByTarget(face);tween(face).to(.16,{position:new Vec3(face.position.x,y,0),scale:Vec3.ONE},{easing:'backOut'}).start();};hit.on(Node.EventType.TOUCH_END,release);hit.on(Node.EventType.TOUCH_CANCEL,release);hit.on(Button.EventType.CLICK,()=>{if(!armed)return;armed=false;if(!['SPIN control','PLUS control','MINUS control'].includes(hit.name))this.audio.play(hit.name.includes('/back')?'back':'tap');action();this.scheduleOnce(()=>armed=true,.12);});}
  private metalBorder(parent:Node,x:number,y:number,w:number,h:number,mode:ModeId,z?:number):Node{const n=box(parent,'Metal aperture',x,y,w,h),g=n.addComponent(Graphics);g.strokeColor=hex(MODE_COPY[mode].secondary,210);g.lineWidth=4;g.roundRect(-w/2,-h/2,w,h,Math.min(28,h*.12));g.stroke();g.strokeColor=new Color(255,255,235,115);g.lineWidth=1.5;g.roundRect(-w/2+7,-h/2+7,w-14,h-14,Math.min(22,h*.1));g.stroke();if(z!==undefined)n.setSiblingIndex(z);return n;}
  private appleMark(parent:Node,x:number,y:number):void{const apple=label(parent,'●',x,y+4,58,70,51,Color.WHITE,true);label(parent,'◒',x+2,y+13,32,28,25,hex('#2D201A'),true);}
  private sheen(target:Node,w:number,h:number,delay=0):void{if(this.reduced)return;const shine=drawRounded(target,'Living sheen',-w*.65,0,w*.16,h,new Color(255,255,240,0),Color.TRANSPARENT,Math.min(20,h*.2),0);const s=shine.getComponent(Graphics)!;s.clear();s.fillColor=new Color(255,255,235,58);s.moveTo(-w*.08,-h/2);s.lineTo(w*.02,-h/2);s.lineTo(w*.08,h/2);s.lineTo(-w*.02,h/2);s.close();s.fill();tween(shine).delay(delay).to(2.2,{position:new Vec3(w*.65,0,0)},{easing:'sineInOut'}).delay(3.2).call(()=>shine.setPosition(-w*.65,0)).union().repeatForever().start();}
  private idle(node:Node,phase=0,dy=8,scale=1.01,duration=2.4):void{if(StationaryArtwork.contains(node))return;if(this.reduced)return;const y=node.position.y;tween(node).delay(phase).to(duration,{position:new Vec3(node.position.x,y+dy,0),scale:new Vec3(scale,scale,1)},{easing:'sineInOut'}).to(duration,{position:new Vec3(node.position.x,y,0),scale:Vec3.ONE},{easing:'sineInOut'}).union().repeatForever().start();this.idleNodes.push(node);}
  private breathe(node:Node,min:number,max:number,duration:number):void{if(StationaryArtwork.contains(node))return;if(this.reduced)return;node.setScale(min,min);tween(node).to(duration,{scale:new Vec3(max,max,1)},{easing:'sineInOut'}).to(duration,{scale:new Vec3(min,min,1)},{easing:'sineInOut'}).union().repeatForever().start();}
  private cabinetIdle(cabinet:Node,mode:ModeId):void{if(this.reduced)return;const glow=alpha(this.art.image(cabinet,`f27/ui/spin-${mode==='royal-mint'?'mint':mode==='jade-treasury'?'jade':mode==='diamond-foundry'?'foundry':'crown'}`,0,-170,240,240,'Cabinet heart glow'),0);glow.node.setSiblingIndex(0);tween(glow).to(1.8,{opacity:88},{easing:'sineInOut'}).to(1.8,{opacity:20},{easing:'sineInOut'}).union().repeatForever().start();this.sheen(cabinet,740,1000,.4);}
  private ambientCoins(root:Node,count:number):void{if(this.reduced)return;for(let i=0;i<count;i++){const coin=this.art.image(root,'f27/ui/balance',(Math.random()-.5)*1000,this.bottom-80+Math.random()*this.H,28+Math.random()*28,28+Math.random()*28,'Ambient coin');alpha(coin,40+Math.random()*70);const x=coin.position.x,y=coin.position.y;tween(coin).delay(i*.21).to(4+Math.random()*3,{position:new Vec3(x+(Math.random()-.5)*80,y+120+Math.random()*160,0),angle:180+Math.random()*360},{easing:'sineInOut'}).call(()=>coin.setPosition(x,y)).union().repeatForever().start();}}
  private coinFlight(count:number):void{const root=this.gameRoot;if(!root)return;this.audio.playWinDetail('burst');for(let i=0;i<count;i++){const coin=this.art.image(root,'f27/ui/balance',(Math.random()-.5)*this.screenW,(Math.random()-.5)*this.screenH,32+Math.random()*24,32+Math.random()*24,'Win coin');coin.setSiblingIndex(30);alpha(coin,0);tween(alpha(coin)).delay(i*.025).to(.08,{opacity:255}).delay(.5).to(.24,{opacity:0}).start();tween(coin).delay(i*.025).to(.85,{position:new Vec3(-300,this.top-180,0),angle:360+Math.random()*360,scale:new Vec3(.55,.55,1)},{easing:'quadIn'}).call(()=>coin.destroy()).start();}}
  private coinRain(root:Node,count:number):void{for(let i=0;i<count;i++){const coin=this.art.image(root,'f27/ui/balance',(Math.random()-.5)*1000,this.top+80+Math.random()*500,28+Math.random()*48,28+Math.random()*48,'Celebration coin');const end=this.bottom-100-Math.random()*250;tween(coin).delay(Math.random()*1.3).to(2+Math.random()*1.8,{position:new Vec3(coin.position.x+(Math.random()-.5)*180,end,0),angle:540+Math.random()*720},{easing:'quadIn'}).call(()=>coin.destroy()).start();}}
  private refreshBalances():void{this.balanceLabels.forEach(l=>l.string=this.money(this.player.data.balance));}
  private money(value:number):string{return Math.round(value).toLocaleString('en-US');}
  private toast(message:string):void{const root=this.pageRoot||this.node;const panel=this.materialPanel(root,0,this.bottom+205,820,86,1);panel.name='Toast';panel.setSiblingIndex(100);alpha(panel,0);outlined(label(panel,message,0,0,760,60,27,hex('#FFF2C3'),true),'#3E1D0A',2);tween(alpha(panel)).to(.15,{opacity:255}).delay(1.35).to(.2,{opacity:0}).call(()=>panel.destroy()).start();}
}
