import {AWARD_COUNT_SECONDS, AWARD_HOLD_SECONDS, AWARD_EXIT_SECONDS, AWARD_COUNT_START, AWARD_ENTER_SECONDS, AwardAudioEvents} from './AwardTiming';
import {celebrationCaption, winTier} from './WinPresentation';
import {tr} from '../ui/Language';
import {_decorator, Color, Component, EventTouch, Graphics, Label, Mask, Node, Sprite, tween, Tween, UIOpacity, UITransform} from 'cc';
import {SalonArt, bindPress, box, opacity, outlined, text} from '../ui/SalonArt';
import {awardStageLayout, AwardStagePlacement} from './AwardStageLayout';
import {AWARD_CHOREOGRAPHY, AwardCoinEnvelope, AwardCoinSpec, awardCoinSpec, awardCoinFrame, awardLightEnvelope} from './AwardChoreography';
const {ccclass}=_decorator;
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});
interface Coin extends AwardCoinSpec {node:Node;alpha:UIOpacity;glint?:Node;glintAlpha?:UIOpacity;}
interface WealthLight {node:Node;alpha:UIOpacity;side:number;pool:boolean;phase:number;}
interface Gleam {node:Node;alpha:UIOpacity;phase:number;peak:number;}
interface TreasureGlow {node:Node;alpha:UIOpacity;base:number;phase:number;}

/** A celebration layer in the live cabinet's exact coordinate plane. The
 * paid reel result, animal, architecture and meters remain on screen throughout.
 * Tap to reveal, then continue; presentation never modifies the settled wallet. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private countDuration=3;private holdUntil=5.5;private tier=0;private revealed=false;
  private amount=0;private elapsed=0;private resolvedAt=-1;private lastTick=-1;private finished=false;
  private count!:Label;private hint!:Label;private group!:Node;private veil!:UIOpacity;
  private revealMotion={progress:0};private exitMotion={progress:0};
  private title!:Node;private titleSweep?:UIOpacity;private entranceAlphas:UIOpacity[]=[];
  private coins:Coin[]=[];private gleams:Gleam[]=[];private treasureGlows:TreasureGlow[]=[];
  private coinEnvelope!:AwardCoinEnvelope;private titleFlare?:UIOpacity;private revealSweep?:UIOpacity;
  private wealthLights:WealthLight[]=[];
  private walletCoins:{node:Node;alpha:UIOpacity;phase:number}[]=[];
  private layout!:ReturnType<typeof awardStageLayout>;
  private audioEvents?:AwardAudioEvents;private done?:()=>void;private restoreScene?:()=>void;private reduced=false;

  public setup(art:SalonArt,amount:number,height:number,reduced:boolean,multiplier=20,theme=0,welcomeBonus=false,restoreScene?:()=>void,audioEvents?:AwardAudioEvents,placement?:AwardStagePlacement):Promise<void>{
    this.audioEvents=audioEvents;this.amount=amount;this.reduced=reduced;this.restoreScene=restoreScene;this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=AWARD_COUNT_SECONDS[this.tier];this.holdUntil=this.countDuration+AWARD_HOLD_SECONDS;
    const layout=this.layout=awardStageLayout(theme,height,1080,placement);
    this.coinEnvelope=layout.coins;
    this.group=box(this.node,'Cabinet celebration layer',0,layout.y,832,1460);
    this.group.setScale(layout.scale,layout.scale,1);
    this.veil=opacity(this.group,reduced?255:0);
    // A feathered glass reflection stays inside the real aperture. The outer
    // result columns remain visible; there is no opaque room or page-sized veil.
    const upper=layout.titleY+layout.titleHeight/2+8,lower=layout.amount.y-layout.amountHeight/2-6;
    const shade=box(this.group,'Award reading reflection',layout.screen.x,(upper+lower)/2,layout.amountWidth+18,upper-lower);
    const glass=shade.addComponent(Graphics);
    for(let i=0;i<22;i++){
      const inset=i*.65,w=layout.amountWidth+18-inset*2,h=upper-lower-inset*2;
      glass.fillColor=new Color(12,25,24,7);glass.roundRect(-w/2,-h/2,w,h,14);glass.fill();
    }
    const lighting=box(this.group,'Original cabinet gold reflections',0,0,832,1460);
    for(const [i,[x,y]] of layout.jewels.entries()){
      const n=art.light(lighting,3,x,y,58,58,0);n.name='Cabinet gilding coronation reflection';
      this.gleams.push({node:n,alpha:n.getComponent(UIOpacity)!,phase:i*.41,peak:115});
      const bloom=art.light(lighting,0,x,y,180,150,0);bloom.name='Original treasure shelf bloom';
      this.treasureGlows.push({node:bloom,alpha:bloom.getComponent(UIOpacity)!,base:.5,phase:i*.18});
    }
    if(!reduced)for(const side of [-1,1]){
      const fan=art.light(lighting,1,side*342,layout.coins.baseY+320,164,620,0);
      fan.name='Cabinet treasury side fan';fan.angle=side*16;
      this.wealthLights.push({node:fan,alpha:fan.getComponent(UIOpacity)!,side,pool:false,phase:side*.22});
      const pool=art.light(lighting,0,side*300,layout.coins.baseY,210,90,0);
      pool.name='Original shelf gold reflection';
      this.wealthLights.push({node:pool,alpha:pool.getComponent(UIOpacity)!,side,pool:true,phase:side*.18});
    }
    const stream=box(this.group,'Cabinet treasury coin fountains',0,0,832,1460);
    if(!reduced){
      const choreography=AWARD_CHOREOGRAPHY[this.tier];
      for(const [burst,wave,total] of [[false,0,choreography.stream],[true,0,choreography.burst],[true,1,choreography.encore]] as const){
        for(let i=0;i<total;i++){
          const spec=awardCoinSpec(i,burst,wave),n=art.image(stream,'award-coin-flight',0,0,spec.pixels,spec.pixels);
          n.name=burst?wave?'Encore treasury coin':'Coronation treasury coin':'Shelf fountain coin';
          const coin:Coin={...spec,node:n,alpha:opacity(n,0)};
          if(i%12===0){const glint=art.light(stream,3,0,0,28,28,0);coin.glint=glint;coin.glintAlpha=glint.getComponent(UIOpacity)!;}
          this.coins.push(coin);
        }
      }
    }
    const titleName='award-title-'+['big','super','mega','epic'][this.tier];
    this.title=art.image(this.group,titleName,layout.screen.x,Math.round(layout.titleY),layout.titleWidth,layout.titleHeight);
    this.title.name='Award artistic title';
    const titleSize=this.title.getComponent(UITransform)!;
    const inlay=box(this.title,'Gold lettering reflection',0,0,titleSize.width,titleSize.height);
    const mask=inlay.addComponent(Mask);mask.type=Mask.Type.SPRITE_STENCIL;
    const stencil=inlay.getComponent(Sprite)!;stencil.sizeMode=Sprite.SizeMode.CUSTOM;stencil.spriteFrame=art.frame(titleName);
    inlay.getComponent(UITransform)!.setContentSize(titleSize.width,titleSize.height);mask.alphaThreshold=.18;
    const sweep=art.light(inlay,2,-titleSize.width/2,0,65,titleSize.height*1.2,0);sweep.angle=-16;this.titleSweep=sweep.getComponent(UIOpacity)!;
    const flare=art.light(inlay,0,0,0,titleSize.width,titleSize.width,0);this.titleFlare=flare.getComponent(UIOpacity)!;
    const revealSweep=art.light(inlay,1,-titleSize.width*.8,0,85,190,0);this.revealSweep=revealSweep.getComponent(UIOpacity)!;
    const caption=outlined(text(this.group,celebrationCaption(multiplier,welcomeBonus),layout.screen.x,Math.round(layout.captionY),layout.screen.width*.92,46,24,'#FFF2CF',true),'#2D2114',1.2);
    caption.enableWrapText=true;caption.overflow=Label.Overflow.SHRINK;
    const plate=box(this.group,'Cabinet payout inlay',layout.amount.x,layout.amount.y,layout.amountWidth,layout.amountHeight);
    // The payout is engraved into the existing reel glass. A square ornamental
    // frame squeezed into a horizontal strip made the award look pasted on.
    // The shared feathered glass reflection supplies contrast without new art.
    const label=outlined(text(plate,'Total return',0,25,layout.amountWidth-80,30,22,'#FFF0C6',true),'#2D2114',1);
    label.enableWrapText=false;
    this.count=outlined(text(plate,'0',0,-12,layout.amountWidth-66,70,62,'#FFF1B3',true),'#372414',1.2);
    this.count.enableWrapText=false;this.count.overflow=Label.Overflow.SHRINK;
    const collect=box(this.group,'Collect your treasure',layout.collectX,layout.collectY,layout.collectWidth,layout.collectHeight);
    const collectCaption=outlined(text(collect,'COLLECT',0,-2,112,58,25,'#FFF4D5',true),'#422610',2);
    collectCaption.fontFamily='Arial Black';collectCaption.enableWrapText=false;collectCaption.overflow=Label.Overflow.SHRINK;
    // The existing physical SPIN key becomes the continue key. No second
    // button image or independent popup control is placed over the console.
    bindPress(collect,collectCaption.node,()=>this.advance(),{depth:2,compression:.97,release:.18});
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    this.hint=outlined(text(this.node,'Tap once to reveal · Tap again to continue',0,layout.hintY,960,height<2050?88:108,height<2050?36:43,'#FFF2D6',true),'#3F2414',2);
    this.hint.enableWrapText=true;this.hint.overflow=Label.Overflow.SHRINK;
    if(!reduced){
      const flight=box(this.node,'Settled coins to original wallet',0,layout.y,832,1460);flight.setScale(layout.scale,layout.scale,1);
      for(let i=0;i<5;i++){const n=art.image(flight,'award-coin-flight',0,0,37,37);this.walletCoins.push({node:n,alpha:opacity(n,0),phase:i*.055});}
    }
    if(reduced){this.reveal();}
    else{
      tween(this.revealMotion).to(AWARD_ENTER_SECONDS,{progress:1},{easing:'sineInOut',onUpdate:()=>this.setReveal(this.revealMotion.progress)}).call(()=>this.setReveal(1)).start();
      this.fadeIn(this.title,.08,.48);this.fadeIn(caption.node,.24,.38);this.fadeIn(plate,.30,.42);
      this.fadeIn(this.hint.node,.27,.34);this.fadeIn(collect,.27,.34);
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise(resolve=>{this.done=resolve;});
  }
  public relayout(height:number,width:number,placement:AwardStagePlacement):void{
    this.layout=awardStageLayout(this.layout.theme,height,width,placement);
    this.group.setPosition(0,this.layout.y);this.group.setScale(this.layout.scale,this.layout.scale,1);
    const flight=this.node.getChildByName('Settled coins to original wallet');
    flight?.setPosition(0,this.layout.y);flight?.setScale(this.layout.scale,this.layout.scale,1);
    this.node.getComponent(UITransform)!.setContentSize(width,height);
    this.hint.node.setPosition(0,this.layout.hintY);
    this.hint.fontSize=height<2050?36:43;this.hint.lineHeight=height<2050?44:52;
    this.hint.node.getComponent(UITransform)!.setContentSize(960,height<2050?88:108);
  }
  private fadeIn(node:Node,delay:number,duration:number):void{
    const alpha=opacity(node,0);this.entranceAlphas.push(alpha);
    tween(alpha).delay(delay).to(duration,{opacity:255},{easing:'sineInOut'}).start();
  }
  private reveal():void{
    if(this.revealed)return;
    this.revealed=true;this.resolvedAt=this.elapsed;this.holdUntil=this.elapsed+AWARD_HOLD_SECONDS;
    this.audioEvents?.reveal();this.count.string=tr(formatWinAmount(this.amount));
    this.hint.string=tr('Added to your wallet · Tap to continue');
  }
  private advance():void{
    if(this.finished)return;
    if(!this.revealed){this.reveal();return;}
    this.finished=true;this.audioEvents?.exit(this.reduced?.01:AWARD_EXIT_SECONDS);
    Tween.stopAllByTarget(this.revealMotion);
    for(const alpha of this.entranceAlphas){Tween.stopAllByTarget(alpha);tween(alpha).to(this.reduced?.01:AWARD_EXIT_SECONDS,{opacity:0},{easing:'sineInOut'}).start();}
    const from=this.veil.opacity;
    tween(this.exitMotion).to(this.reduced?.01:AWARD_EXIT_SECONDS,{progress:1},{easing:'sineInOut',onUpdate:()=>{
      const progress=this.exitMotion.progress;this.veil.opacity=Math.round(from*(1-progress));
      for(const coin of this.walletCoins){
        const p=Math.max(0,Math.min(1,(progress-coin.phase)/(1-coin.phase))),q=1-p;
        const start=this.layout.amount,wallet=this.layout.wallet;
        coin.node.setPosition(q*q*(start.x+coin.phase*100)+2*q*p*(wallet.x*.3)+p*p*wallet.x,q*q*start.y+2*q*p*(start.y+65)+p*p*wallet.y);
        coin.node.angle=p*180;coin.alpha.opacity=Math.round(Math.min(1,p*12,(1-p)*8)*230);
      }
    }}).call(()=>{this.veil.opacity=0;this.restoreScene?.();this.restoreScene=undefined;this.done?.();this.done=undefined;}).start();
  }
  private setReveal(progress:number):void{
    this.revealMotion.progress=Math.max(0,Math.min(1,progress));
    this.veil.opacity=Math.round(this.revealMotion.progress*255);
  }
  protected update(dt:number):void{
    if(this.finished)return;this.elapsed+=Math.min(dt,.1);
    if(!this.reduced){
      const choreography=AWARD_CHOREOGRAPHY[this.tier];
      const resolvedAge=this.revealed?this.elapsed-this.resolvedAt:-1;
      const light=awardLightEnvelope(this.elapsed,resolvedAge,this.tier,this.countDuration);
      const {crest,buildup}=light;
      if(this.revealSweep){
        const p=Math.min(1,Math.max(0,(resolvedAge-.12)/1.15)),w=this.title.getComponent(UITransform)!.width;
        this.revealSweep.node.setPosition(-w*.8+p*w*1.6,0);
        this.revealSweep.opacity=resolvedAge>=0?Math.round(Math.sin(p*Math.PI)*160):0;
      }
      this.wealthLights.forEach(g=>{
        g.alpha.opacity=g.pool?light.poolOpacity:light.fanOpacity;
        const fanTurn=16+Math.sin(this.elapsed*.85+g.phase)*3+crest*3;
        g.node.angle=g.pool?0:g.side*fanTurn;
        const expand=1+crest*(g.pool?.26:.12);
        g.node.setScale(expand,expand,1);
      });
      if(this.titleSweep){
        const p=(Math.max(0,this.elapsed-.90)%2.8)/2.8,w=this.title.getComponent(UITransform)!.width;
        this.titleSweep.node.setPosition(-w*.66+p*w*1.32,0);
        this.titleSweep.opacity=Math.round(Math.sin(p*Math.PI)*(125+this.tier*15));
      }
      if(this.titleFlare)this.titleFlare.opacity=Math.round(crest*choreography.flare*.75);
      this.treasureGlows.forEach(g=>{
        const age=resolvedAge-g.phase;
        const bloom=age>=0&&age<1.8?Math.sin(age/1.8*Math.PI):0;
        const breathing=.5+.5*Math.sin(this.elapsed*1.6-g.phase*3);
        g.alpha.opacity=Math.min(255,Math.round(g.base*(25+breathing*28+buildup*32+Math.max(bloom,crest*.85)*choreography.flare))); 
        g.node.setScale(1+bloom*.16,1+bloom*.16,1);
        g.node.angle=Math.sin(this.elapsed*.85+g.phase)*12;
      });
      this.gleams.forEach((g,i)=>{
        const p=(this.elapsed+g.phase)%2.9;
        const ambient=Math.max(0,1-Math.abs(p-.85)/.67)*g.peak;
        const since=resolvedAge-i*.12;
        const resolved=this.revealed&&since>=0&&since<1.3?Math.sin(since/1.3*Math.PI)*235:0;
        g.alpha.opacity=Math.round(Math.max(ambient,resolved));
        const lift=resolved/235;
        g.node.setScale(1+lift*.38,1+lift*.38,1);
        g.node.angle=lift*22;
      });
      for(const c of this.coins){
        const age=c.burst?(this.revealed?resolvedAge-c.delay:-1):this.elapsed-.82-c.delay;
        const frame=awardCoinFrame(c,age,this.tier,this.coinEnvelope);
        c.alpha.opacity=frame.alpha;
        if(c.glintAlpha){
          const shine=Math.pow(Math.max(0,Math.sin(frame.progress*Math.PI)),12);
          c.glintAlpha.opacity=Math.round(frame.alpha*shine*.83);
          c.glint!.setPosition(frame.x,frame.y);c.glint!.angle=frame.angle*.30;
          const scale=.7+shine*.65;c.glint!.setScale(scale,scale,1);
        }
        if(frame.alpha===0)continue;
        c.node.setPosition(frame.x,frame.y);c.node.angle=frame.angle;
        c.node.setScale(frame.sx,frame.sy,1);
      }
    }
    const tick=Math.floor(this.elapsed*30);
    if(tick!==this.lastTick&&!this.revealed&&this.elapsed<this.countDuration){
      this.lastTick=tick;
      const p=Math.min(1,Math.max(0,(this.elapsed-AWARD_COUNT_START)/(this.countDuration-AWARD_COUNT_START)));
      this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));
    }
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();
    if(this.elapsed>=this.holdUntil)this.advance();
  }
  protected onDestroy():void{
    this.restoreScene?.();this.restoreScene=undefined;this.node.off(Node.EventType.TOUCH_END,this.advance,this);
    Tween.stopAllByTarget(this.revealMotion);Tween.stopAllByTarget(this.exitMotion);
    for(const n of [this.title,this.count?.node])if(n)Tween.stopAllByTarget(n);
    for(const a of [this.veil,...this.entranceAlphas,...this.gleams.map(g=>g.alpha)])if(a)Tween.stopAllByTarget(a);
    this.done?.();this.done=undefined;
  }
}
