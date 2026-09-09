import { _decorator, Component, EventTouch, Label, Node, tween, UIOpacity, Vec3 } from 'cc';
import { SalonArt, box, COLORS, opacity, outlined, text } from '../ui/SalonArt';
import { SalonAtmosphere } from './SalonAtmosphere';
const { ccclass } = _decorator;

/** A staged, skippable celebration. Settlement always happens before entry. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private amount=0; private elapsed=0; private lastTick=-1; private finished=false;
  private count!:Label; private hint!:Label; private group!:Node; private veil!:UIOpacity;
  private rays!:Node; private halo!:Node; private done?:()=>void; private reduced=false;
  public setup(art:SalonArt, amount:number, height:number, reduced:boolean):Promise<void> {
    this.amount=amount;this.reduced=reduced;
    this.group=box(this.node,'Celebration choreography',0,0,1080,1920);
    this.group.setScale(Math.min(1,(height-180)/1720),Math.min(1,(height-180)/1720),1);
    // Light is additive; no full-screen black card is hidden in the artwork.
    this.rays=art.light(this.group,0,0,170,1470,1470,115);
    this.halo=art.light(this.group,1,0,150,1260,1260,140);
    const stream=box(this.group,'Coin fountain',0,0,1080,1720).addComponent(SalonAtmosphere);
    stream.setup(art,1080,1720,true);stream.reducedMotion=reduced;
    const treasure=art.image(this.group,'celebration',0,150,970,1390);
    const title=outlined(text(this.group,'A TREASURE TO REMEMBER',0,719,970,80,38,COLORS.cream));
    const plate=art.panel(this.group,0,-503,871,189,0);
    this.count=outlined(text(plate,'0',0,0,816,165,91,COLORS.gold,true));
    this.hint=outlined(text(this.group,'Tap to reveal the full amount',0,-649,890,78,36));
    const collect=art.button(this.group,'Collect your treasure',0,-760,730,118,'Collect treasure',1,()=>this.advance());
    // A button tap must not also trigger the stage's reveal/dismiss handler.
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    this.veil=opacity(this.group,0);
    if(reduced){this.veil.opacity=255;this.reveal();}
    else{
      treasure.setScale(.94,.94,1);treasure.setPosition(0,126);
      tween(this.veil).to(.42,{opacity:255},{easing:'sineInOut'}).start();
      // Settle gently into the scene; the counter and lettering stay anchored.
      tween(treasure).to(.72,{scale:new Vec3(1,1,1),position:new Vec3(0,150,0)},{easing:'cubicOut'}).start();
      opacity(title.node,0);tween(title.node.getComponent(UIOpacity)!).delay(.35).to(.3,{opacity:255}).start();
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise(resolve=>{this.done=resolve;});
  }
  private reveal():void {
    this.elapsed=Math.max(this.elapsed,2.3);this.count.string=Math.floor(this.amount).toLocaleString('en-US');
    this.hint.string='Added to your wallet · Tap to continue';
  }
  private advance():void {
    if(this.finished)return;
    if(this.elapsed<2.3){this.reveal();return;}
    this.finished=true;
    tween(this.veil).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void {
    if(this.finished)return;this.elapsed+=Math.min(dt,.1);
    if(!this.reduced){this.rays.angle=this.elapsed*6;this.halo.angle=-this.elapsed*4;}
    const tick=Math.floor(this.elapsed*24);
    if(tick!==this.lastTick&&this.elapsed<2.3){
      this.lastTick=tick;const p=Math.min(1,Math.max(0,(this.elapsed-.42)/1.7));
      this.count.string=Math.floor(this.amount*(1-Math.pow(1-p,4))).toLocaleString('en-US');
    }
    if(this.elapsed>=2.3&&this.elapsed<2.5)this.reveal();
    // A completed amount is held for at least 2 seconds before auto-dismissal.
    if(this.elapsed>=4.8)this.advance();
  }
  protected onDestroy():void {this.done?.();this.done=undefined;}
}
