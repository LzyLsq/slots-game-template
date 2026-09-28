import {winTier} from './WinPresentation';
import {tr} from '../ui/Language';
import { _decorator, Component, Label, Node, tween, UIOpacity, Vec3 } from 'cc';
import { FoundryArt, box, opacity, outlined, text } from '../ui/FoundryArt';
import { GAME_CONFIGS, prizeArt } from '../math/GameConfigs';
import { SafeAreaAdapter as Safe } from '../ui/SafeAreaAdapter';
const { ccclass } = _decorator;
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});

interface FallingCoin { node:Node; alpha:UIOpacity; x:number; phase:number; duration:number; sway:number; size:number; spin:number; }
/** Recycled CC Switch coin sprites. Their two depth layers share the source art,
 * not procedural shapes, and the foreground stays off the award lettering. */
class CoinRain {
  private readonly coins:FallingCoin[]=[];
  constructor(art:FoundryArt,back:Node,front:Node,superWin:boolean){
    const backCount=superWin?32:23,frontCount=superWin?12:9;
    for(let i=0;i<backCount+frontCount;i++){
      const foreground=i>=backCount,j=foreground?i-backCount:i;
      const seed=(j*.6180339887+(foreground?.31:0))%1;
      const lane=foreground?(j%2?-1:1)*(462+seed*105):(seed-.5)*1060;
      const size=(foreground?72:54)+(i%5)*(foreground?8:8);
      const node=art.image(foreground?front:back,'symbols',lane,960,size,size,0);
      node.name=foreground?'Generated coin · foreground':'Generated coin · background';
      const alpha=opacity(node,0);
      this.coins.push({node,alpha,x:lane,phase:(i*.381966+seed*.19)%1,
        duration:(foreground?3.2:4.2)+(i%7)*.18,sway:foreground?26:50,size,spin:(i%2?-1:1)*(78+(i%5)*21)});
    }
  }
  update(t:number):void{
    const entrance=Math.min(1,Math.max(0,(t-.1)/.46));
    for(const coin of this.coins){
      const p=(coin.phase+t/coin.duration)%1;
      coin.node.setPosition(coin.x+Math.sin(t*1.6+coin.phase*13)*coin.sway+(p-.5)*45,1000-p*1550);
      coin.node.angle=(t*coin.spin+coin.phase*360)%360;
      coin.node.setScale(.72+.28*Math.abs(Math.cos(t*3.1+coin.phase*9)),1,1);
      const edge=Math.min(1,p/.09,(1-p)/.18);
      coin.alpha.opacity=Math.round(entrance*Math.max(0,edge)*225);
    }
  }
}

/** A separate, generated victory room for BIG and SUPER; settlement precedes it.
 * Everything visible is CC Switch art (including coins, light and both stages).
 * A first tap reveals the exact amount, a second tap collects it.
 */
@ccclass('FoundryWinStage')
export class FoundryWinStage extends Component {
  private tier=0;private amount=0;private elapsed=0;private lastTick=-1;
  private countDuration=3;private holdUntil=6;private revealed=false;private finished=false;private reduced=false;
  private count!:Label;private hint!:Label;private title!:Node;private hero!:Node;
  private group!:Node;private groupAlpha!:UIOpacity;private backdropAlpha!:UIOpacity;
  private rays!:Node;private halo!:Node;private rain?:CoinRain;private burst:UIOpacity[]=[];private done?:()=>void;

  public setup(art:FoundryArt,amount:number,height:number,reduced:boolean,multiplier=20,theme=0,welcome?:'big'|'super'):Promise<void>{
    this.amount=amount;this.reduced=reduced;this.elapsed=0;this.lastTick=-1;this.revealed=false;this.finished=false;
    this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=this.tier===0?3.0:this.tier===1?4.0:4.6;
    this.holdUntil=this.countDuration+(this.tier===0?2.3:2.8);
    const superWin=this.tier>=1;
    const room=art.cover(this.node,superWin?'foundry-celebration-super':'foundry-celebration-big',0,0,Safe.visibleWidth,height);
    room.name=superWin?'Generated royal vault victory room':'Generated mint theatre victory room';
    this.backdropAlpha=opacity(room,reduced?255:0);
    this.group=box(this.node,'Victory choreography',0,0,1080,1920);
    const scale=Math.min(1,(height-180)/1720);this.group.setScale(scale,scale,1);
    this.groupAlpha=opacity(this.group,reduced?255:0);

    // Focused light lies behind the prize, never on the title or number.
    this.rays=art.light(this.group,0,0,38,1010,1010,superWin?105:75);
    this.halo=art.light(this.group,1,0,22,830,830,superWin?125:90);
    const rainBack=box(this.group,'Generated coins · deep rain',0,0,1080,1920);

    const cfg=GAME_CONFIGS[Math.max(0,Math.min(GAME_CONFIGS.length-1,theme))];
    this.hero=art.image(this.group,prizeArt(cfg.id),0,18,920,800);
    this.hero.name='Generated signature prize · '+cfg.id;
    this.title=art.image(this.group,superWin?'foundry-award-super':'foundry-award-big',0,696,980,190);
    this.title.name='Generated '+(superWin?'SUPER':'BIG')+' WIN title';
    // The generated tier title and hero are the focus; extra text cluttered
    // the upper arch at 320px and competed with the jewel and coins.

    // The number belongs to the empty enamel plaque painted into the room.
    this.count=outlined(text(this.group,'0',0,superWin?-660:-837,850,100,84,'#62321B',true),'#FFF3CA',2);
    this.count.enableWrapText=false;
    this.hint=outlined(text(this.group,welcome?tr('Welcome treasure · included in total'):tr('Tap to reveal the full amount'),0,superWin?-760:-927,840,44,27,'#62321B',true),'#FFF3CA',1);
    this.hint.enableWrapText=false;
    const rainFront=box(this.group,'Generated coins · near rain',0,0,1080,1920);
    if(!reduced)this.rain=new CoinRain(art,rainBack,rainFront,superWin);
    // Two bursts of generated optical starlets, with the second wave reserved for SUPER.
    if(!reduced){
      const n=superWin?16:10;
      for(let i=0;i<n;i++){
        const theta=i*2.3999632297,rad=340+(i%3)*45;
        const sparkle=art.light(this.group,3,0,30,superWin?96:78,superWin?96:78,0);
        const alpha=sparkle.getComponent(UIOpacity)!;this.burst.push(alpha);
        sparkle.setScale(.16,.16,1);
        const end=new Vec3(Math.cos(theta)*rad,35+Math.sin(theta)*rad*.86,0);
        tween(sparkle).delay(.37+i*.035+(superWin&&i>=10?.55:0)).to(.44,{position:end,scale:new Vec3(1.12,1.12,1),angle:110},{easing:'quadOut'}).to(.48,{scale:new Vec3(.2,.2,1),angle:180}).start();
        tween(alpha).delay(.37+i*.035+(superWin&&i>=10?.55:0)).to(.12,{opacity:225}).to(.58,{opacity:0},{easing:'sineOut'}).start();
      }
      // Flash, snap to title, treasure spring, count-up: intentionally staged like S05,
      // not an endlessly rotating cabinet pasted over the game.
      const impact=art.light(this.group,0,0,28,1550,1550,0);
      tween(impact.getComponent(UIOpacity)!).delay(.12).to(.1,{opacity:superWin?205:145}).to(.55,{opacity:0},{easing:'sineOut'}).start();
      this.title.setScale(.48,.48,1);this.title.setPosition(0,785);
      tween(this.title).delay(.16).to(.38,{scale:new Vec3(1.08,1.08,1),position:new Vec3(0,696,0)},{easing:'backOut'}).to(.15,{scale:new Vec3(1,1,1)}).start();
      this.hero.setScale(.28,.28,1);this.hero.setPosition(0,-164);
      tween(this.hero).delay(.34).to(.55,{scale:new Vec3(1.1,1.1,1),position:new Vec3(0,34,0)},{easing:'backOut'}).to(.18,{scale:new Vec3(1,1,1),position:new Vec3(0,18,0)}).start();
      tween(this.backdropAlpha).to(.32,{opacity:255},{easing:'sineOut'}).start();
      tween(this.groupAlpha).delay(.06).to(.28,{opacity:255}).start();
    }else this.reveal();
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise<void>(resolve=>{this.done=resolve;});
  }
  private reveal():void{
    if(this.revealed)return;
    this.revealed=true;this.elapsed=Math.max(this.elapsed,this.countDuration);
    this.count.string=tr(formatWinAmount(this.amount));
    this.hint.string=tr('Added to your wallet · Tap to continue');
    if(!this.reduced){
      tween(this.count.node).to(.1,{scale:new Vec3(1.13,1.13,1)}).to(.24,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
      tween(this.halo).to(.19,{scale:new Vec3(1.22,1.22,1)}).to(.5,{scale:new Vec3(1,1,1)}).start();
    }
  }
  private advance():void{
    if(this.finished)return;
    if(!this.revealed){this.reveal();return;}
    this.finished=true;
    const duration=this.reduced?.01:.34;
    tween(this.groupAlpha).to(duration,{opacity:0},{easing:'sineInOut'}).start();
    tween(this.backdropAlpha).to(duration,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void{
    if(this.finished)return;
    this.elapsed+=Math.max(0,Math.min(dt,.1));
    if(!this.reduced){
      this.rays.angle=this.elapsed*(this.tier>=1?10:6);this.halo.angle=-this.elapsed*5;
      this.rain?.update(this.elapsed);
      if(this.elapsed>1.1){const bob=Math.sin(this.elapsed*2.1)*5;this.hero.setPosition(0,18+bob);}
    }
    const tick=Math.floor(this.elapsed*24);
    if(!this.revealed&&tick!==this.lastTick){
      this.lastTick=tick;const p=Math.max(0,Math.min(1,(this.elapsed-.55)/(this.countDuration-.55)));
      this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));
    }
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();
    if(this.elapsed>=this.holdUntil)this.advance();
  }
  protected onDestroy():void{this.done?.();this.done=undefined;}
}
