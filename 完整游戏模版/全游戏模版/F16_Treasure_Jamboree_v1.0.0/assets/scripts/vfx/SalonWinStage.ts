import {tr} from '../ui/Language';
import { _decorator, Color, Component, EventTouch, game, Game, Graphics, Label, Node, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { SalonArt, box, COLORS, opacity, outlined, text } from '../ui/SalonArt';
import { GAME_CONFIGS, prizeArt } from '../math/GameConfigs';
import { SalonAtmosphere } from './SalonAtmosphere';
const { ccclass } = _decorator;

/** A staged, skippable celebration. Settlement always happens before entry. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private theme=0;private finale:UIOpacity[]=[];private shadeAlpha!:UIOpacity;
  private countDuration=3.3;private holdUntil=5.5;private tier=0;private revealed=false;private amount=0; private elapsed=0; private lastTick=-1; private finished=false;
  private count!:Label; private hint!:Label; private group!:Node; private veil!:UIOpacity;
  private rays!:Node; private halo!:Node; private done?:()=>void; private reduced=false;
  /** Optional hook: sounds follow the visual timeline, never a second timer. */
  public onCue?:(cue:'reveal'|'count'|'complete')=>void;
  private lastCue=-1;private cueRevealed=false;
  private hidden=false;private fountain?:SalonAtmosphere;
  private countStart=.82;private flightAt=-1;private walletTarget?:Vec3;
  private arrivals:{node:Node;alpha:UIOpacity;delay:number;start:Vec3}[]=[];
  private counterPlate!:Node;private collect!:Node;private treasure!:Node;
  protected onLoad():void{game.on(Game.EVENT_HIDE,this.hide,this);game.on(Game.EVENT_SHOW,this.resume,this);}
  private hide():void{this.hidden=true;this.pauseTree(this.node,true);if(this.fountain)this.fountain.enabled=false;}
  private resume():void{this.hidden=false;this.pauseTree(this.node,false);if(this.fountain)this.fountain.enabled=true;}
  private pauseTree(node:Node,paused:boolean):void{
    if(paused)Tween.pauseAllByTarget(node);else Tween.resumeAllByTarget(node);
    const alpha=node.getComponent(UIOpacity);if(alpha){if(paused)Tween.pauseAllByTarget(alpha);else Tween.resumeAllByTarget(alpha);}
    for(const child of node.children)this.pauseTree(child,paused);
  }
  public setup(art:SalonArt, amount:number, height:number, reduced:boolean,multiplier=20,theme=0,walletTarget?:Vec3):Promise<void> {
    this.theme=Math.max(0,Math.min(3,theme));this.amount=amount;this.reduced=reduced;this.tier=multiplier>=100?2:multiplier>=50?1:0;
    this.countDuration=this.countStart+[1.65,2.2,2.8][this.tier];this.holdUntil=this.countDuration+1.75;this.walletTarget=walletTarget;
    const shade=box(this.node,'Warm celebration veil',0,0,1600,height);const dim=shade.addComponent(Graphics);dim.fillColor=new Color(49,24,15,150);dim.rect(-800,-height/2,1600,height);dim.fill();this.shadeAlpha=opacity(shade,255);
    this.group=box(this.node,'Celebration choreography',0,0,1080,1920);
    this.group.setScale(Math.min(1,(height-180)/1720),Math.min(1,(height-180)/1720),1);
    // Light is additive; no full-screen black card is hidden in the artwork.
    this.rays=art.light(this.group,0,0,170,1250,1250,60);
    this.halo=art.light(this.group,1,0,150,980,980,85);
    const stream=box(this.group,'Coin fountain',0,0,1080,1720).addComponent(SalonAtmosphere);
    this.fountain=stream;
    stream.setup(art,1080,1720,true,[16,22,28][this.tier]);stream.reducedMotion=reduced;stream.enabled=false;
    const treasure=art.image(this.group,prizeArt(GAME_CONFIGS[this.theme].id),0,50,930,860);
    this.treasure=treasure;
    const title=outlined(text(this.group,['BIG WIN','MEGA WIN','EPIC WIN'][this.tier],0,660,980,160,104,COLORS.gold,true),'#582919',5);
    text(this.group,GAME_CONFIGS[this.theme].name,0,543,960,70,30,COLORS.cream);
    // One hero, one amount. No floating reel-symbol collage or generic card.
    const plate=box(this.group,'Award typography',0,-480,930,220);this.counterPlate=plate;
    text(plate,'TOTAL WIN',0,91,800,42,25,COLORS.cream,true);
    this.count=outlined(text(plate,'0',0,-8,900,170,amount>=10000000?85:112,'#FFE9A0',true),'#482512',5);
    this.count.cacheMode=Label.CacheMode.CHAR;
    for(let i=0;i<4;i++){const n=art.light(plate,3,(i%2?1:-1)*350,(i<2?1:-1)*72,105,35,0);n.name='Grand win finale glint';this.finale.push(n.getComponent(UIOpacity)!);}
    this.hint=outlined(text(this.group,'Tap to reveal the full amount',0,-649,890,78,36));
    const collect=art.button(this.group,'Continue after celebration',0,-760,660,108,'Continue',1,()=>this.advance());this.collect=collect;
    // Preallocate a small terminal stream; update only transforms and alpha.
    if(walletTarget&&!reduced)for(let i=0;i<10;i++){
      const coin=art.image(this.node,'symbols',0,0,56,56,0);coin.name='Celebration wallet arrival';
      this.arrivals.push({node:coin,alpha:opacity(coin,0),delay:i*.055,start:new Vec3()});
    }
    // A button tap must not also trigger the stage's reveal/dismiss handler.
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    this.veil=opacity(this.group,0);
    if(reduced){this.veil.opacity=255;this.reveal();}
    else{
      treasure.setScale(.84,.84,1);treasure.setPosition(0,18);
      tween(this.veil).to(.28,{opacity:255},{easing:'sineInOut'}).start();
      // Settle gently into the scene; the counter and lettering stay anchored.
      tween(treasure).to(.56,{scale:new Vec3(1,1,1),position:new Vec3(0,50,0)},{easing:'backOut'}).start();
      title.node.setScale(.9,.9,1);opacity(title.node,0);
      tween(title.node.getComponent(UIOpacity)!).delay(.12).to(.24,{opacity:255}).start();
      tween(title.node).delay(.12).to(.35,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
      opacity(plate,0);opacity(collect,0);opacity(this.hint.node,0);
      tween(plate.getComponent(UIOpacity)!).delay(.5).to(.3,{opacity:255},{easing:'sineOut'}).start();
      tween(collect.getComponent(UIOpacity)!).delay(this.countDuration).to(.25,{opacity:255},{easing:'sineOut'}).start();
      tween(this.hint.node.getComponent(UIOpacity)!).delay(.8).to(.3,{opacity:255}).start();
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise(resolve=>{this.done=resolve;});
  }
  private reveal():void {
    if(!this.revealed)this.onCue?.('complete');
    if(!this.revealed&&!this.reduced){this.finale.forEach((alpha,i)=>tween(alpha).delay(i*.06).to(.12,{opacity:225}).to(.5,{opacity:0},{easing:'sineOut'}).start());tween(this.count.node).to(.16,{scale:new Vec3(1.09,1.09,1)}).to(.24,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();}
    this.revealed=true;this.elapsed=Math.max(this.elapsed,this.countDuration);this.count.string=tr(Math.floor(this.amount).toLocaleString('en-US'));
    this.hint.string=tr('Added to your wallet · Tap to continue');
    if(this.flightAt<0){
      this.flightAt=this.elapsed;
      this.node.getComponent(UITransform)!.convertToNodeSpaceAR(this.counterPlate.worldPosition,this.flightOrigin);
      for(const arrival of this.arrivals)arrival.start.set(this.flightOrigin);
      if(this.fountain)tween(opacity(this.fountain.node,255)).to(.3,{opacity:0},{easing:'sineOut'}).start();
      Tween.stopAllByTarget(this.collect.getComponent(UIOpacity)!);this.collect.getComponent(UIOpacity)!.opacity=255;
    }
  }
  private readonly flightOrigin=new Vec3();
  private advance():void {
    if(this.finished)return;
    if(!this.revealed){this.reveal();return;}
    // Preserve a short landing beat even after a skip; never cut coins in flight.
    if(!this.reduced&&this.elapsed<this.flightAt+1.1){this.holdUntil=Math.min(this.holdUntil,this.flightAt+1.1);return;}
    this.finished=true;
    tween(this.shadeAlpha).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).start();
    tween(this.veil).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void {
    if(this.finished||this.hidden)return;this.elapsed+=Math.min(dt,.1);
    if(this.fountain)this.fountain.enabled=!this.reduced&&this.elapsed>=.55&&this.flightAt<0;
    if(!this.cueRevealed&&this.elapsed>=.12){this.cueRevealed=true;this.onCue?.('reveal');}
    if(!this.reduced){this.rays.angle=this.elapsed*3;this.halo.angle=-this.elapsed*2;}
    if(!this.reduced){
      if(this.elapsed>.56)this.treasure.setPosition(0,50+Math.sin((this.elapsed-.56)*1.25)*5);
      for(const arrival of this.arrivals){
        if(this.flightAt<0||!this.walletTarget)continue;
        const p=Math.max(0,Math.min(1,(this.elapsed-this.flightAt-arrival.delay)/.65)),u=1-p;
        const end=this.walletTarget,start=arrival.start;
        arrival.node.setPosition(u*u*start.x+2*u*p*(start.x+210)+p*p*end.x,u*u*start.y+2*u*p*(end.y+100)+p*p*end.y);
        const size=1-p*.6;arrival.node.setScale(size*(.45+.55*Math.abs(Math.cos(p*8))),size,1);arrival.node.angle=p*150;
        arrival.alpha.opacity=p>0&&p<1?Math.min(1,p*10)*Math.min(1,(1-p)*8)*255:0;
      }
    }
    const tick=Math.floor(this.elapsed*30);
    if(tick!==this.lastTick&&this.elapsed<this.countDuration){
      this.lastTick=tick;const p=Math.min(1,Math.max(0,(this.elapsed-this.countStart)/(this.countDuration-this.countStart)));
      this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));
      const cue=Math.floor(p*8);if(p>0&&cue!==this.lastCue){this.lastCue=cue;this.onCue?.('count');}
    }
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();
    // Hold the complete amount; a first tap reveals, a later tap dismisses.
    if(this.elapsed>=this.holdUntil)this.advance();
  }
  protected onDestroy():void {
    game.off(Game.EVENT_HIDE,this.hide,this);game.off(Game.EVENT_SHOW,this.resume,this);
    this.finished=true;this.node.off(Node.EventType.TOUCH_END,this.advance,this);
    if(this.veil)Tween.stopAllByTarget(this.veil);if(this.shadeAlpha)Tween.stopAllByTarget(this.shadeAlpha);
    for(const alpha of this.finale)Tween.stopAllByTarget(alpha);
    const done=this.done;this.done=undefined;done?.();
  }
}
