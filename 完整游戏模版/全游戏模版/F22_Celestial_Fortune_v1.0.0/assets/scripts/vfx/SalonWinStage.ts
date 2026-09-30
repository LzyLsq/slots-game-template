import type { WinSoundCue } from '../audio/AudioManager';
import {tierCaption, winTier} from './WinPresentation';
import {tr} from '../ui/Language';
import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, tween, UIOpacity, Vec3 } from 'cc';
import { SalonArt, box, COLORS, opacity, outlined, text } from '../ui/SalonArt';
import { GAME_CONFIGS, symbolAtlas, prizeArt } from '../math/GameConfigs';
import { SalonAtmosphere } from './SalonAtmosphere';
const { ccclass } = _decorator;
/** Match settlement precision; only the in-progress count may use integer steps. */
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});

/** A staged, skippable celebration. Settlement always happens before entry. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private theme=0; private emblems:Node[]=[];private finale:UIOpacity[]=[];private shadeAlpha!:UIOpacity;
  private countDuration=3.3;private revealedAt=-1;private tier=0;private revealed=false;private amount=0; private elapsed=0; private lastTick=-1; private finished=false;
  private count!:Label; private hint!:Label; private group!:Node; private veil!:UIOpacity;
  private rays!:Node; private halo!:Node; private done?:()=>void; private reduced=false;
  private onSound?:(cue:WinSoundCue,progress:number)=>void;
  public setup(art:SalonArt, amount:number, height:number, reduced:boolean,multiplier=20,theme=0,onSound?:(cue:WinSoundCue,progress:number)=>void):Promise<void> {
    this.onSound=onSound;this.theme=Math.max(0,Math.min(3,theme));this.amount=amount;this.reduced=reduced;this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=[3.3,4.1,4.9][this.tier];
    const shade=box(this.node,'Warm celebration veil',0,0,1600,height);const dim=shade.addComponent(Graphics);dim.fillColor=new Color(49,24,15,150);dim.rect(-800,-height/2,1600,height);dim.fill();this.shadeAlpha=opacity(shade,reduced?255:0);
    if(!reduced)tween(this.shadeAlpha).to(.38,{opacity:255},{easing:'sineInOut'}).start();
    this.group=box(this.node,'Celebration choreography',0,0,1080,1920);
    this.group.setScale(Math.min(1,(height-180)/1720),Math.min(1,(height-180)/1720),1);
    // Light is additive; no full-screen black card is hidden in the artwork.
    this.rays=art.light(this.group,0,0,170,1470,1470,115);
    this.halo=art.light(this.group,1,0,150,1260,1260,140);
    const stream=box(this.group,'Coin fountain',0,0,1080,1720).addComponent(SalonAtmosphere);
    stream.setup(art,1080,1720,true,[40,52,64][this.tier]);stream.reducedMotion=reduced;
    const fountainAlpha=opacity(stream.node,0);
    if(!reduced)tween(fountainAlpha).delay(.3).to(.85,{opacity:255},{easing:'sineInOut'}).start();
    const treasure=art.image(this.group,prizeArt(GAME_CONFIGS[this.theme].id),0,50,930,860);
    // The themed nameplate masks baked cabinet lettering without a black overlay.
    const titlePlate=art.panel(this.group,0,635,1040,240,0);titlePlate.name='Grand win title nameplate';
    const title=outlined(text(titlePlate,['BIG WIN','MEGA WIN','EPIC WIN'][this.tier],0,30,840,98,84,'#573225',true),'#FFF4DD',2);
    title.enableWrapText=false;
    const subtitle=text(titlePlate,GAME_CONFIGS[this.theme].name,0,-55,840,44,28,'#573225');
    subtitle.enableWrapText=false;
    const rulePlate=art.panel(this.group,0,455,940,100,0);rulePlate.name='Grand win explanation nameplate';
    outlined(text(rulePlate,tierCaption(multiplier),0,0,800,60,27,'#573225'),'#FFF4DD',1);
    // Theme objects occupy the sides of the treasure, away from the title and count.
    for(let i=0;i<4;i++){const n=art.image(this.group,symbolAtlas(GAME_CONFIGS[this.theme].id),(i%2?1:-1)*(i<2?340:380),i<2?300:-180,i<2?210:145,i<2?210:145,[[8,5,0,10],[14,10,0,1],[7,10,0,6],[2,6,0,1]][this.theme][i]);this.emblems.push(n);}
    const plate=art.panel(this.group,0,-503,871,189,0);
    this.count=outlined(text(plate,'0',0,0,650,106,Math.min(78,650/(formatWinAmount(amount).length*.65)),'#573225',false),'#FFF4DD',1);
    this.count.enableWrapText=false;
    for(let i=0;i<4;i++){const n=art.light(plate,3,(i%2?1:-1)*350,(i<2?1:-1)*72,105,35,0);n.name='Grand win finale glint';this.finale.push(n.getComponent(UIOpacity)!);}
    this.hint=outlined(text(this.group,'Tap to reveal the full amount',0,-649,890,78,36));
    const collect=art.button(this.group,'Collect your treasure',0,-760,730,118,'Collect treasure',1,()=>this.advance());
    // A button tap must not also trigger the stage's reveal/dismiss handler.
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    this.veil=opacity(this.group,0);
    if(reduced){this.veil.opacity=255;this.reveal();}
    else{
      treasure.setScale(.72,.72,1);treasure.setPosition(0,26);
      tween(this.veil).to(.42,{opacity:255},{easing:'sineInOut'}).start();
      // Settle gently into the scene; the counter and lettering stay anchored.
      tween(treasure).to(.8,{scale:new Vec3(1,1,1),position:new Vec3(0,50,0)},{easing:'backOut'}).start();
      opacity(title.node,0);tween(title.node.getComponent(UIOpacity)!).delay(.35).to(.3,{opacity:255}).start();
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise(resolve=>{this.done=resolve;});
  }
  private reveal():void {
    if(this.revealed)return;
    if(!this.reduced){this.finale.forEach((alpha,i)=>tween(alpha).delay(i*.06).to(.12,{opacity:225}).to(.5,{opacity:0},{easing:'sineOut'}).start());tween(this.count.node).to(.09,{scale:new Vec3(.97,.97,1)},{easing:'sineOut'}).to(.22,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();}
    this.revealed=true;this.onSound?.('reveal',1);this.revealedAt=this.elapsed;this.count.string=tr(formatWinAmount(this.amount));
    this.hint.string=tr('Added to your wallet · Tap to continue');
  }
  private advance():void {
    if(this.finished)return;
    if(!this.revealed){this.reveal();return;}
    // Ignore a double tap that would otherwise dismiss the just-revealed total.
    if(this.elapsed-this.revealedAt<.3)return;
    this.onSound?.('collect',1);this.finished=true;
    tween(this.shadeAlpha).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).start();
    tween(this.veil).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void {
    if(this.finished)return;this.elapsed+=Math.min(dt,.1);
    if(!this.reduced){this.rays.angle=this.elapsed*6;this.halo.angle=-this.elapsed*4;
      this.emblems.forEach((n,i)=>{const t=this.elapsed*1.4+i*1.7,side=i%2?1:-1;n.setPosition(side*(i<2?340:380)+Math.sin(t)*12,(i<2?300:-180)+Math.sin(t*.8)*24);n.angle=Math.sin(t)*[5,4,7,6][this.theme];const scale=1+Math.sin(t*.8)*.025;n.setScale(scale,scale,1);});}
    const tick=Math.floor(this.elapsed*24);
    if(!this.revealed&&tick!==this.lastTick&&this.elapsed<this.countDuration){
      this.lastTick=tick;const p=Math.min(1,Math.max(0,(this.elapsed-.55)/(this.countDuration-.55)));
      this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));
    }
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();
    // A completed amount is held for at least 2 seconds before auto-dismissal.
    if(this.revealed&&this.elapsed-this.revealedAt>=2.2)this.advance();
  }
  protected onDestroy():void {this.onSound=undefined;this.done?.();this.done=undefined;}
}
