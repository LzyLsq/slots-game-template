import {tr} from '../ui/Language';
import {formatWinAmount, tierCaption, winTier} from './WinPresentation';
import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, tween, Tween, UIOpacity, Vec3 } from 'cc';
import { SalonArt, box, opacity, outlined, text } from '../ui/SalonArt';
import { GAME_CONFIGS } from '../math/GameConfigs';
const { ccclass } = _decorator;

/** A staged, skippable celebration. Settlement always happens before entry. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private theme=0; private revealAge=0;
  private coins:{node:Node;alpha:UIOpacity;delay:number;side:number;depth:number}[]=[];
  private jewels:{node:Node;alpha:UIOpacity;phase:number}[]=[];
  private countDuration=3.3;private holdUntil=5.5;private tier=0;private revealed=false;private amount=0; private elapsed=0; private lastTick=-1; private finished=false;
  private count!:Label; private hint!:Label; private group!:Node; private veil!:UIOpacity;
  private rays!:Node; private halo!:Node; private done?:()=>void; private reduced=false;
  public setup(art:SalonArt, amount:number, height:number, reduced:boolean,multiplier=20,theme=0):Promise<void> {
    this.theme=Math.max(0,Math.min(3,theme));this.amount=amount;this.reduced=reduced;this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=[3.3,4.1,4.9][this.tier];this.holdUntil=this.countDuration+(reduced?1.2:2.2);
    const shade=box(this.node,'Warm celebration veil',0,0,1600,height);const dim=shade.addComponent(Graphics);dim.fillColor=new Color(29,48,40,85);dim.rect(-800,-height/2,1600,height);dim.fill();
    this.group=box(this.node,'Celebration choreography',0,0,1080,1920);
    this.group.setScale(Math.min(1,(height-180)/1720),Math.min(1,(height-180)/1720),1);
    // Artwork and lettering share a measured 1024 × 1536 coordinate plane.
    // The scene enters as one object, so plaques cannot drift away from text.
    const theatre=box(this.group,'Treasure theatre',0,0,1024,1536);
    const room=art.image(theatre,'win-theatre',0,0,1024,1536);
    art.featherRoom(room);
    this.rays=art.light(theatre,0,0,65,720,720,70);
    this.halo=art.light(theatre,1,0,65,520,520,80);
    // All reward particles originate at the treasure mouth and converge on
    // the payout plaque. Pooled once; no frame-time allocation or text masking.
    for(let i=0;i<[24,36,48][this.tier];i++){
      const node=art.image(theatre,'symbols',0,100,44,44,0);
      this.coins.push({node,alpha:opacity(node,0),delay:.65+i*.055,side:i%2?1:-1,depth:.65+(i%4)*.13});
    }
    for(let i=0;i<8;i++){
      const points=[[-178,130],[140,144],[-85,42],[243,-74],[-265,-110],[0,258],[-323,-181],[298,-170]];
      const node=art.light(theatre,3,points[i][0],points[i][1],80,80,0);
      this.jewels.push({node,alpha:node.getComponent(UIOpacity)!,phase:i*.43});
    }
    const title=outlined(text(theatre,['BIG WIN','MEGA WIN','EPIC WIN'][this.tier],0,540,520,76,65,'#573225',true),'#FFF4DD',1);
    title.enableWrapText=false;
    const subtitle=outlined(text(theatre,GAME_CONFIGS[this.theme].name,0,416,700,48,30,'#FFF5DC'),'#173C3C',2);
    subtitle.enableWrapText=false;
    outlined(text(theatre,tierCaption(multiplier),0,366,730,50,29,'#FFF5DC'),'#173C3C',2);
    this.count=outlined(text(theatre,'0',0,-337,592,94,78,'#573225',false),'#FFF4DD',1);
    this.count.enableWrapText=false;
    this.count.fontSize=Math.min(78,Math.floor(960/Math.max(1,formatWinAmount(amount).length)));
    this.count.lineHeight=this.count.fontSize*1.1;
    this.hint=outlined(text(theatre,'Tap to reveal the full amount',0,-525,840,66,32,'#FFF5DC'),'#173C3C',2);
    const collect=art.button(theatre,'Collect your treasure',0,-642,680,114,'Collect treasure',1,()=>this.advance());
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    // Fade the complete stage, including its backdrop. A sibling opaque veil
    // used to snap on at entry and remain visible after the artwork faded out.
    this.veil=opacity(this.node,0);
    if(reduced){this.veil.opacity=255;this.reveal();}
    else{
      theatre.setScale(.93,.93,1);theatre.setPosition(0,-35);
      tween(this.veil).to(.32,{opacity:255},{easing:'sineOut'}).start();
      tween(theatre).to(.72,{scale:new Vec3(1,1,1),position:new Vec3(0,0,0)},{easing:'backOut'}).start();
      opacity(title.node,0);tween(title.node.getComponent(UIOpacity)!).delay(.28).to(.3,{opacity:255}).start();
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise(resolve=>{this.done=resolve;});
  }
  private reveal():void {
    if(!this.revealed&&!this.reduced){tween(this.count.node).to(.09,{scale:new Vec3(.97,.97,1)},{easing:'sineOut'}).to(.22,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();}
    if(!this.revealed)this.revealAge=0;
    this.revealed=true;this.elapsed=Math.max(this.elapsed,this.countDuration);this.count.string=formatWinAmount(this.amount);
    this.hint.string=tr('Added to your wallet · Tap to continue');
  }
  private advance():void {
    if(this.finished)return;
    if(this.elapsed<this.countDuration){this.reveal();return;}
    if(this.revealed&&this.revealAge<.3&&!this.reduced)return;
    this.finished=true;
    tween(this.veil).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void {
    if(this.finished)return;this.elapsed+=Math.min(dt,.1);
    if(this.revealed)this.revealAge+=Math.max(0,dt);
    if(!this.reduced){
      this.rays.angle=this.elapsed*5;this.halo.angle=-this.elapsed*3;
      const breath=1+Math.sin(this.elapsed*2.4)*.07;
      this.halo.setScale(breath,breath,1);
      for(const c of this.coins){
        const p=(this.elapsed-c.delay)/1.5;
        if(p<=0||p>=1){c.alpha.opacity=0;continue;}
        const x=c.side*(60*(1-p)+(260+c.depth*90)*Math.sin(p*Math.PI));
        const y=105-442*p+210*Math.sin(p*Math.PI);
        c.node.setPosition(x,y);c.node.angle=c.side*p*400;
        const d=c.depth*(1-p*.35);c.node.setScale(d*(.3+.7*Math.abs(Math.cos(p*10))),d,1);
        c.alpha.opacity=Math.min(1,p/.09)*Math.min(1,(1-p)/.12)*230;
      }
      for(const j of this.jewels){
        const pulse=Math.pow(Math.max(0,Math.sin(this.elapsed*2.8-j.phase)),8);
        j.alpha.opacity=pulse*205;j.node.angle=this.elapsed*24;
        j.node.setScale(.55+pulse*.7,.55+pulse*.7,1);
      }
    }
    const tick=Math.floor(this.elapsed*24);
    if(tick!==this.lastTick&&this.elapsed<this.countDuration){
      this.lastTick=tick;const p=Math.min(1,Math.max(0,(this.elapsed-.55)/(this.countDuration-.55)));
      this.count.string=Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US');
    }
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();
    // Hold the complete amount for 2.2 seconds (1.2 with reduced motion).
    if(this.elapsed>=this.holdUntil)this.advance();
  }
  protected onDestroy():void {if(this.veil)Tween.stopAllByTarget(this.veil);this.done?.();this.done=undefined;}
}
