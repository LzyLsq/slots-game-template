import {newcomerAwardCaption, tierCaption, winTier} from './WinPresentation';
import {tr} from '../ui/Language';
import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, tween, Tween, UIOpacity, Vec3 } from 'cc';
import { SalonArt, box, COLORS, opacity, outlined, text } from '../ui/SalonArt';
import { GAME_CONFIGS, symbolAtlas, prizeArt } from '../math/GameConfigs';
import { SalonAtmosphere } from './SalonAtmosphere';
import type { WinSoundCue } from '../audio/AudioManager';
const { ccclass } = _decorator;
/** Match settlement precision; only the in-progress count may use integer steps. */
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});

/** A staged, skippable celebration. Settlement always happens before entry. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private theme=0; private emblems:Node[]=[];private finale:UIOpacity[]=[];private shadeAlpha!:UIOpacity;
  private countDuration=3.3;private holdUntil=5.5;private tier=0;private revealed=false;private amount=0; private elapsed=0; private lastTick=-1; private finished=false;
  private count!:Label; private hint!:Label; private group!:Node; private veil!:UIOpacity; private titlePlate?:Node;
  private rays!:Node; private halo!:Node; private treasure?:Node; private flashAlpha?:UIOpacity; private done?:()=>void; private reduced=false;
  private onReveal?:()=>void;
  private onSound?:(cue:WinSoundCue,progress:number)=>void;
  private crownLight?:Node; private orbitSparks:{node:Node;alpha:UIOpacity}[]=[];
  private victoryWheel?:Node;
  private rimBulbs:{node:Node;alpha:UIOpacity;angle:number}[]=[];
  private ribbons:{node:Node;alpha:UIOpacity;phase:number;side:number;speed:number}[]=[];
  private shockwaves:{node:Node;alpha:UIOpacity;delay:number}[]=[];
  private burst:{node:Node;alpha:UIOpacity;angle:number;delay:number}[]=[]; private burstAnchor=0;
  private spotlights:{node:Node;alpha:UIOpacity;angle:number}[]=[];
  private coinRain:{node:Node;alpha:UIOpacity;side:number;phase:number;speed:number;size:number}[]=[];
  private fireworks:{node:Node;alpha:UIOpacity;side:number;angle:number;delay:number}[]=[];
  private beatsFired=0;
  public setup(art:SalonArt, amount:number, height:number, reduced:boolean,multiplier=20,theme=0,welcomeBonus=false,onReveal?:()=>void,onSound?:(cue:WinSoundCue,progress:number)=>void):Promise<void> {
    this.theme=Math.max(0,Math.min(3,theme));this.amount=amount;this.reduced=reduced;this.tier=Math.max(0,winTier(multiplier)-1);
    this.onReveal=onReveal;
    this.onSound=onSound;
    this.countDuration=[3.3,4.2,4.7,5.1][this.tier];this.holdUntil=this.countDuration+2.2;
    const shade=box(this.node,'Warm celebration veil',0,0,1600,height);const dim=shade.addComponent(Graphics);dim.fillColor=new Color(49,24,15,178);dim.rect(-800,-height/2,1600,height);dim.fill();this.shadeAlpha=opacity(shade,255);
    if(!reduced){
      const flash=box(this.node,'Brief golden celebration impact',0,0,1600,height),light=flash.addComponent(Graphics);
      light.fillColor=new Color(255,221,133,175);light.rect(-800,-height/2,1600,height);light.fill();this.flashAlpha=opacity(flash,0);
    }
    this.group=box(this.node,'Celebration choreography',0,0,1080,1920);
    this.group.setScale(Math.min(1,(height-180)/1720),Math.min(1,(height-180)/1720),1);
    // Light is additive; no full-screen black card is hidden in the artwork.
    this.rays=art.light(this.group,0,0,170,1470,1470,115);
    this.halo=art.light(this.group,1,0,150,1260,1260,140);
    this.createVictoryFrame(art);
    // A bounded orbit adds scale to every grand win without loading new textures.
    if(!reduced){
      this.crownLight=art.light(this.group,0,0,150,1450+this.tier*45,1450+this.tier*45,110);
      for(let i=0;i<3;i++){
        const node=art.light(this.group,1,0,90,730,730,0);
        node.name='Celebration expanding halo';this.shockwaves.push({node,alpha:node.getComponent(UIOpacity)!,delay:i*.21});
      }
      for(let i=0;i<6+this.tier*2;i++){
        const node=art.light(this.group,3,0,0,88+this.tier*5,88+this.tier*5,0);
        this.orbitSparks.push({node,alpha:node.getComponent(UIOpacity)!});
      }
      // One radial burst on entry, then the same bounded pool fires at reveal.
      const count=12+this.tier*4;
      for(let i=0;i<count;i++){
        const node=art.light(this.group,3,0,90,95+this.tier*4,95+this.tier*4,0);
        this.burst.push({node,alpha:node.getComponent(UIOpacity)!,angle:i*Math.PI*2/count,delay:(i%4)*.035});
      }
      for(let i=0;i<5;i++){
        const angle=(i-2)*20,node=art.light(this.group,2,(i-2)*185,110,250,1320,0);
        node.angle=angle;this.spotlights.push({node,alpha:node.getComponent(UIOpacity)!,angle});
      }
      // Reuse one small pool for the opening, counting beats, and final reveal.
      // Both bursts stay at the sides of the prize, clear of the number plate.
      const fireworks=12+this.tier*2;
      for(let i=0;i<fireworks;i++){
        const side=i%2?1:-1,node=art.light(this.group,3,side*350,side*245,78,78,0);
        node.name='Grand win side firework';
        this.fireworks.push({node,alpha:node.getComponent(UIOpacity)!,side,angle:Math.floor(i/2)*Math.PI*2/(fireworks/2),delay:(i%3)*.035});
      }
    }
    const stream=box(this.group,'Coin fountain',0,0,1080,1720).addComponent(SalonAtmosphere);
    stream.setup(art,1080,1720,true,[40,58,64,72][this.tier]);stream.reducedMotion=reduced;
    const treasure=art.image(this.group,prizeArt(GAME_CONFIGS[this.theme].id),0,50,930,860);this.treasure=treasure;
    // Coins cross in front of the prize painting; the later text plates stay legible.
    if(!reduced)for(let i=0;i<24+this.tier*4;i++){
      const side=i%2?1:-1,phase=Math.floor(i/2)/(12+this.tier*2),size=.8+(i%4)*.12;
      const node=art.image(this.group,'symbols',side*290,-300,112,112,0),alpha=opacity(node,0);
      node.name='Twin gold coin cannon';this.coinRain.push({node,alpha,side,phase,speed:.48+(i%3)*.035,size});
    }
    // Crisp gold/red ribbons add a visible celebration, rather than just more
    // translucent glow. Pools are created once and never grow while counting.
    if(!reduced)for(let i=0;i<16+this.tier*4;i++){
      const side=i%2?1:-1,node=box(this.group,'Grand win festival ribbon',side*400,500,24,52),g=node.addComponent(Graphics);
      g.fillColor=[new Color(255,202,67,235),new Color(218,73,57,225),new Color(255,241,179,240)][i%3];
      g.rect(-9,-23,18,46);g.fill();
      this.ribbons.push({node,alpha:opacity(node,0),phase:(i*.381966)%1,side,speed:.34+(i%4)*.035});
    }
    // The themed nameplate masks baked cabinet lettering without a black overlay.
    const titlePlate=art.panel(this.group,0,635,1040,240,0);titlePlate.name='Grand win title nameplate';this.titlePlate=titlePlate;
    const title=outlined(text(titlePlate,['BIG WIN','SUPER BIG WIN','MEGA WIN','EPIC WIN'][this.tier],0,30,860,120,108,'#573225',true),'#FFF4DD',3);
    title.enableWrapText=false;
    title.overflow=Label.Overflow.SHRINK;
    const subtitle=text(titlePlate,GAME_CONFIGS[this.theme].name,0,-55,840,44,28,'#573225');
    subtitle.enableWrapText=false;
    const rulePlate=art.panel(this.group,0,455,940,100,0);rulePlate.name='Grand win explanation nameplate';
    const rule=outlined(text(rulePlate,welcomeBonus?newcomerAwardCaption():tierCaption(multiplier),0,0,800,60,27,'#573225'),'#FFF4DD',1);
    rule.enableWrapText=false;rule.overflow=Label.Overflow.SHRINK;
    // Theme objects occupy the sides of the treasure, away from the title and count.
    for(let i=0;i<4;i++){const n=art.image(this.group,symbolAtlas(GAME_CONFIGS[this.theme].id),(i%2?1:-1)*(i<2?340:380),i<2?300:-180,i<2?210:145,i<2?210:145,[[8,5,0,10],[14,10,0,1],[7,10,0,6],[2,6,0,1]][this.theme][i]);this.emblems.push(n);}
    const plate=art.panel(this.group,0,-503,871,189,0);
    this.count=outlined(text(plate,'0',0,0,816,165,120,'#573225',true),'#FFF4DD',2);
    this.count.enableWrapText=false;
    for(let i=0;i<8;i++){const n=art.light(plate,3,(i%4-1.5)*230,(i<4?1:-1)*72,105,35,0);n.name='Grand win finale glint';this.finale.push(n.getComponent(UIOpacity)!);}
    this.hint=outlined(text(this.group,'Tap to reveal the full amount',0,-649,890,78,36));
    const collect=art.button(this.group,'Collect your treasure',0,-760,730,118,'Collect treasure',1,()=>this.advance(),3,false);
    // A button tap must not also trigger the stage's reveal/dismiss handler.
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    this.veil=opacity(this.group,0);
    if(reduced){this.veil.opacity=255;this.reveal();}
    else{
      treasure.setScale(.58,.58,1);treasure.setPosition(0,-32);
      tween(this.veil).to(.42,{opacity:255},{easing:'sineInOut'}).start();
      // Prize art springs in while the counter, nameplate and buttons stay fixed.
      this.flash();
      tween(treasure).to(.55,{scale:new Vec3(1.16,1.16,1),position:new Vec3(0,64,0)},{easing:'backOut'})
        .to(.36,{scale:new Vec3(1,1,1),position:new Vec3(0,50,0)},{easing:'sineInOut'}).start();
      titlePlate.setScale(.8,.8,1);
      tween(titlePlate).to(.48,{scale:new Vec3(1.12,1.12,1)},{easing:'backOut'})
        .to(.25,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
      opacity(title.node,0);tween(title.node.getComponent(UIOpacity)!).delay(.35).to(.3,{opacity:255}).start();
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise(resolve=>{this.done=resolve;});
  }
  private createVictoryFrame(art:SalonArt):void {
    const wheel=box(this.group,'Golden victory medallion',0,100,1200,1200),g=wheel.addComponent(Graphics);
    // Draw the stage once. No textures or per-frame Graphics rebuilds.
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12,inner=400,outer=575+(i%2)*25,half=.045+(i%2)*.02;
      g.fillColor=i%2?new Color(255,205,78,100):new Color(255,240,163,155);
      g.moveTo(Math.cos(a-half)*inner,Math.sin(a-half)*inner);
      g.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);
      g.lineTo(Math.cos(a+half)*inner,Math.sin(a+half)*inner);g.close();g.fill();
    }
    g.lineWidth=8;g.strokeColor=new Color(252,197,62,200);g.circle(0,0,467);g.stroke();
    g.lineWidth=3;g.strokeColor=new Color(255,241,172,210);g.circle(0,0,484);g.stroke();
    this.victoryWheel=wheel;
    if(!this.reduced)for(let i=0;i<16+this.tier*4;i++){
      const angle=i*Math.PI*2/(16+this.tier*4),node=art.light(this.group,3,Math.cos(angle)*482,100+Math.sin(angle)*482,80,80,0);
      node.name='Victory stage chasing lamp';this.rimBulbs.push({node,alpha:node.getComponent(UIOpacity)!,angle});
    }
  }
  private reveal():void {
    if(this.revealed)return;
    this.elapsed=Math.max(this.elapsed,this.countDuration);
    if(!this.revealed&&!this.reduced){
      this.burstAnchor=this.elapsed;
      this.flash();
      this.finale.forEach((alpha,i)=>tween(alpha).delay(i*.045).to(.14,{opacity:230}).to(.55,{opacity:0},{easing:'sineOut'}).start());
      Tween.stopAllByTarget(this.count.node);
      tween(this.count.node).to(.09,{scale:new Vec3(.88,.88,1)},{easing:'sineOut'}).to(.18,{scale:new Vec3(1.32,1.32,1)},{easing:'backOut'}).to(.3,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
      if(this.titlePlate)tween(this.titlePlate).to(.16,{scale:new Vec3(1.12,1.12,1)},{easing:'backOut'}).to(.3,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
    }
    this.revealed=true;this.count.string=tr(formatWinAmount(this.amount));
    this.hint.string=tr('Added to your wallet · Tap to continue');
    this.onReveal?.();
    this.onSound?.('reveal',1);
  }
  private flash():void {
    if(!this.flashAlpha)return;
    Tween.stopAllByTarget(this.flashAlpha);
    tween(this.flashAlpha).to(.12,{opacity:185},{easing:'sineOut'}).to(.54,{opacity:0},{easing:'sineInOut'}).start();
  }
  private countBeat():void {
    this.burstAnchor=this.elapsed;
    this.beatsFired++;
    this.onSound?.('burst',this.beatsFired/(this.tier>=2?3:2));
    tween(this.count.node).to(.12,{scale:new Vec3(1.15,1.15,1)},{easing:'sineOut'})
      .to(.32,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
    if(this.titlePlate)tween(this.titlePlate).to(.12,{scale:new Vec3(1.07,1.07,1)})
      .to(.32,{scale:new Vec3(1,1,1)},{easing:'sineInOut'}).start();
  }
  private advance():void {
    this.dismiss(true);
  }
  private dismiss(manual:boolean):void {
    if(this.finished)return;
    if(this.elapsed<this.countDuration){this.reveal();return;}
    this.finished=true;
    if(manual)this.onSound?.('collect',1);
    if(this.flashAlpha){Tween.stopAllByTarget(this.flashAlpha);tween(this.flashAlpha).to(.2,{opacity:0}).start();}
    tween(this.shadeAlpha).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).start();
    tween(this.veil).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void {
    if(this.finished)return;this.elapsed+=Math.min(dt,.1);
    if(!this.reduced){this.rays.angle=this.elapsed*10;this.halo.angle=-this.elapsed*7;
      if(this.victoryWheel)this.victoryWheel.angle=Math.sin(this.elapsed*.72)*9;
      this.rimBulbs.forEach(({node,alpha,angle},i)=>{
        const chase=Math.max(0,Math.cos(angle-this.elapsed*3.2)),beat=.5+.5*Math.sin(this.elapsed*3+i*.45);
        alpha.opacity=Math.round(90+chase*115+beat*40);
        const s=.85+chase*.55;node.setScale(s,s,1);
      });
      opacity(this.rays,Math.round(130+32*Math.sin(this.elapsed*2.4)));
      opacity(this.halo,Math.round(158+37*Math.sin(this.elapsed*2.1+.8)));
      if(this.crownLight){this.crownLight.angle=this.elapsed*(12+this.tier*3);opacity(this.crownLight,Math.round(105+38*Math.sin(this.elapsed*2.6)));}
      this.shockwaves.forEach(({node,alpha,delay})=>{
        const p=Math.max(0,Math.min(1,(this.elapsed-this.burstAnchor-delay)/1.35));
        const scale=.48+p*1.75;node.setScale(scale,scale,1);
        alpha.opacity=Math.round(Math.sin(p*Math.PI)*150);
      });
      this.fireworks.forEach(({node,alpha,side,angle,delay})=>{
        const age=this.elapsed-this.burstAnchor-delay,p=Math.max(0,Math.min(1,age/.88));
        const flare=age>=0&&age<.88?Math.sin(p*Math.PI):0;
        node.setPosition(side*350+Math.cos(angle)*(32+185*p),side*245+Math.sin(angle)*(32+185*p));
        node.angle=this.elapsed*80+angle*50;
        node.setScale(.48+flare*1.25,.48+flare*1.25,1);
        alpha.opacity=Math.round(flare*flare*(190+this.tier*17));
      });
      this.spotlights.forEach(({node,alpha,angle},i)=>{node.angle=angle+Math.sin(this.elapsed*1.4+i)*9;alpha.opacity=Math.round(62+42*Math.sin(this.elapsed*2+i*.8));});
      this.orbitSparks.forEach(({node,alpha},i)=>{const phase=i*Math.PI*2/this.orbitSparks.length+this.elapsed*(.55+this.tier*.06);node.setPosition(Math.cos(phase)*(420+this.tier*12),150+Math.sin(phase)*395);const s=.75+.35*Math.sin(this.elapsed*3.2+i);node.setScale(s,s,1);alpha.opacity=Math.round(145+55*Math.sin(this.elapsed*3.2+i));});
      this.burst.forEach(({node,alpha,angle,delay})=>{
        const p=Math.max(0,Math.min(1,(this.elapsed-this.burstAnchor-delay)/1.05)),radius=60+620*(1-(1-p)*(1-p)),flare=Math.sin(p*Math.PI);
        node.setPosition(Math.cos(angle)*radius,90+Math.sin(angle)*radius*.72);
        const scale=.45+flare*1.6;node.setScale(scale,scale,1);alpha.opacity=Math.round(flare*flare*225);
      });
      this.coinRain.forEach(({node,alpha,side,phase,speed,size},i)=>{
        const age=Math.max(0,this.elapsed-this.burstAnchor),p=(age*speed+phase)%1,t=p*2.1;
        // Two outward arcs leave the prize face and number plate readable.
        node.setPosition(side*(265+t*(72+i%3*12)), -310+1250*t-650*t*t);
        node.angle=side*(age*210+i*37);node.setScale(size*(.28+.72*Math.abs(Math.cos(age*6+i))),size,1);
        alpha.opacity=Math.round(Math.min(1,p/.08,(1-p)/.18)*245);
      });
      this.ribbons.forEach(({node,alpha,phase,side,speed},i)=>{
        const p=(this.elapsed*speed+phase)%1;
        node.setPosition(side*(350+Math.sin(this.elapsed*2+i)*95),810-p*1580);
        node.angle=side*(this.elapsed*150+i*29);
        node.setScale(.3+.7*Math.abs(Math.cos(this.elapsed*4+i)),.7+(i%3)*.2,1);
        alpha.opacity=Math.round(Math.sin(p*Math.PI)*225);
      });
      if(this.treasure&&this.elapsed>1.1){const s=1+.035*Math.sin(this.elapsed*2.8);this.treasure.setScale(s,s,1);}
      this.emblems.forEach((n,i)=>{const t=this.elapsed*1.6+i*1.7,side=i%2?1:-1;n.setPosition(side*(i<2?340:380)+Math.sin(t)*22,(i<2?300:-180)+Math.sin(t*.8)*35);n.angle=Math.sin(t)*[8,7,10,9][this.theme];const scale=1+Math.sin(t*.8)*.045;n.setScale(scale,scale,1);});}
    if(!this.reduced&&!this.revealed&&this.beatsFired<2+(this.tier>=2?1:0)
      &&this.elapsed>=[1.08,2.24,3.38][this.beatsFired])this.countBeat();
    const tick=Math.floor(this.elapsed*24);
    if(tick!==this.lastTick&&this.elapsed<this.countDuration){
      this.lastTick=tick;const p=Math.min(1,Math.max(0,(this.elapsed-.55)/(this.countDuration-.55)));
      this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));
      if(p>0)this.onSound?.('count',p);
    }
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();
    // A completed amount is held for at least 2 seconds before auto-dismissal.
    if(this.elapsed>=this.holdUntil)this.dismiss(false);
  }
  protected onDestroy():void {this.finished=true;this.onSound=undefined;this.onReveal=undefined;this.done?.();this.done=undefined;}
}
