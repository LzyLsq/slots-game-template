import {tierCaption, winTier} from './WinPresentation';
import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, tween, UIOpacity, Vec3 } from 'cc';
import { SalonArt, box, COLORS, opacity, outlined, text } from '../ui/SalonArt';
import { SalonAtmosphere } from './SalonAtmosphere';
const { ccclass } = _decorator;
/** Match settlement precision; only the in-progress count may use integer steps. */
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});

/** A staged, skippable celebration. Settlement always happens before entry. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private theme=0; private emblems:Node[]=[];
  private countDuration=3.3;private holdUntil=5.5;private tier=0;private revealed=false;private amount=0; private elapsed=0; private lastTick=-1; private finished=false;
  private count!:Label; private hint!:Label; private group!:Node; private veil!:UIOpacity;
  private rays!:Node; private halo!:Node; private done?:()=>void; private reduced=false;
  public setup(art:SalonArt, amount:number, height:number, reduced:boolean,multiplier=20,theme=0):Promise<void> {
    this.theme=Math.max(0,Math.min(3,theme));this.amount=amount;this.reduced=reduced;this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=[3.3,4.1,4.9][this.tier];this.holdUntil=this.countDuration+2.2;
    const shade=box(this.node,'Warm celebration veil',0,0,1600,height);const dim=shade.addComponent(Graphics);dim.fillColor=new Color(49,24,15,150);dim.rect(-800,-height/2,1600,height);dim.fill();
    this.group=box(this.node,'Celebration choreography',0,0,1080,1920);
    this.group.setScale(Math.min(1,(height-180)/1720),Math.min(1,(height-180)/1720),1);
    // Light is additive; no full-screen black card is hidden in the artwork.
    this.rays=art.light(this.group,0,0,170,1470,1470,115);
    this.halo=art.light(this.group,1,0,150,1260,1260,140);
    const stream=box(this.group,'Coin fountain',0,0,1080,1720).addComponent(SalonAtmosphere);
    stream.setup(art,1080,1720,true,[40,52,64][this.tier]);stream.reducedMotion=reduced;
    const treasure=art.image(this.group,'celebration',0,150,1030,1230);
    // The themed nameplate masks baked cabinet lettering without a black overlay.
    const titlePlate=art.panel(this.group,0,635,1040,240,0);titlePlate.name='Grand win title nameplate';
    const title=outlined(text(titlePlate,['BIG WIN','MEGA WIN','EPIC WIN'][this.tier],0,30,840,98,84,COLORS.gold,true),'#582919',2);
    title.enableWrapText=false;
    const subtitle=text(titlePlate,['SKY ADMIRAL · CAPTAIN’S BOUNTY','PEARL VOYAGE · OCEAN TREASURE','SUNSTONE EXPRESS · GOLDEN ARRIVAL','MOON CAROUSEL · CROWN CELEBRATION'][this.theme],0,-55,840,44,28,COLORS.cream);
    subtitle.enableWrapText=false;
    const rulePlate=art.panel(this.group,0,455,940,100,0);rulePlate.name='Grand win explanation nameplate';
    outlined(text(rulePlate,tierCaption(multiplier),0,0,800,60,27,COLORS.cream),'#582919',1);
    // Theme objects occupy the sides of the treasure, away from the title and count.
    for(let i=0;i<4;i++){const n=art.image(this.group,'symbols',(i%2?1:-1)*(i<2?340:380),i<2?300:-180,i<2?210:145,i<2?210:145,[[4,1,0,10],[3,13,0,3],[2,1,6,2],[11,12,14,11]][this.theme][i]);this.emblems.push(n);}
    const plate=art.panel(this.group,0,-503,871,189,0);
    this.count=outlined(text(plate,'0',0,0,650,106,Math.min(78,650/(formatWinAmount(amount).length*.65)),COLORS.gold,true));
    this.count.enableWrapText=false;
    this.hint=outlined(text(this.group,'Tap to reveal the full amount',0,-649,890,78,36));
    const collect=art.button(this.group,'Collect your treasure',0,-760,730,118,'Collect treasure',1,()=>this.advance());
    // A button tap must not also trigger the stage's reveal/dismiss handler.
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    this.veil=opacity(this.group,0);
    if(reduced){this.veil.opacity=255;this.reveal();}
    else{
      treasure.setScale(.72,.72,1);treasure.setPosition(0,126);
      tween(this.veil).to(.42,{opacity:255},{easing:'sineInOut'}).start();
      // Settle gently into the scene; the counter and lettering stay anchored.
      tween(treasure).to(.8,{scale:new Vec3(1,1,1),position:new Vec3(0,150,0)},{easing:'backOut'}).start();
      opacity(title.node,0);tween(title.node.getComponent(UIOpacity)!).delay(.35).to(.3,{opacity:255}).start();
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise(resolve=>{this.done=resolve;});
  }
  private reveal():void {
    if(!this.revealed&&!this.reduced){tween(this.count.node).to(.09,{scale:new Vec3(.97,.97,1)},{easing:'sineOut'}).to(.22,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();}
    this.revealed=true;this.elapsed=Math.max(this.elapsed,this.countDuration);this.count.string=formatWinAmount(this.amount);
    this.hint.string='Added to your wallet · Tap to continue';
  }
  private advance():void {
    if(this.finished)return;
    if(this.elapsed<this.countDuration){this.reveal();return;}
    this.finished=true;
    tween(this.veil).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void {
    if(this.finished)return;this.elapsed+=Math.min(dt,.1);
    if(!this.reduced){this.rays.angle=this.elapsed*6;this.halo.angle=-this.elapsed*4;
      this.emblems.forEach((n,i)=>{const t=this.elapsed*1.4+i*1.7,side=i%2?1:-1;n.setPosition(side*(i<2?340:380)+Math.sin(t)*12,(i<2?300:-180)+Math.sin(t*.8)*24);n.angle=this.theme===0?this.elapsed*side*20:Math.sin(t)*[4,5,12,18][this.theme];const scale=this.theme===0?.75+.25*Math.abs(Math.cos(t)):1;n.setScale(scale,1,1);});}
    const tick=Math.floor(this.elapsed*24);
    if(tick!==this.lastTick&&this.elapsed<this.countDuration){
      this.lastTick=tick;const p=Math.min(1,Math.max(0,(this.elapsed-.55)/(this.countDuration-.55)));
      this.count.string=Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US');
    }
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();
    // A completed amount is held for at least 2 seconds before auto-dismissal.
    if(this.elapsed>=this.holdUntil)this.advance();
  }
  protected onDestroy():void {this.done?.();this.done=undefined;}
}
