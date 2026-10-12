import {AWARD_COUNT_SECONDS, AWARD_HOLD_SECONDS, AWARD_EXIT_SECONDS, AWARD_COUNT_START, AWARD_ENTER_SECONDS, AwardAudioEvents} from './AwardTiming';
import {celebrationCaption, winTier} from './WinPresentation';
import {tr} from '../ui/Language';
import {_decorator, Component, EventTouch, Label, Mask, Node, Sprite, tween, Tween, UIOpacity, UITransform} from 'cc';
import {SalonArt, box, opacity, outlined, text} from '../ui/SalonArt';
import {awardStageLayout} from './AwardStageLayout';
import {AWARD_CHOREOGRAPHY, AwardCoinEnvelope, AwardCoinSpec, awardCoinSpec, awardCoinFrame, awardLightEnvelope} from './AwardChoreography';
const {ccclass}=_decorator;
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});
interface Coin extends AwardCoinSpec {node:Node;alpha:UIOpacity;glint?:Node;glintAlpha?:UIOpacity;}
interface WealthLight {node:Node;alpha:UIOpacity;side:number;pool:boolean;phase:number;}
interface Gleam {node:Node;alpha:UIOpacity;phase:number;peak:number;}
interface TreasureGlow {node:Node;alpha:UIOpacity;base:number;phase:number;}

/** One coherent wealth scene per mode. Visuals never alter the paid result.
 * Tap once to reveal the exact payout, again to leave; every exit resolves. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private countDuration=3;private holdUntil=5.5;private tier=0;private revealed=false;
  private amount=0;private elapsed=0;private resolvedAt=-1;private lastTick=-1;private finished=false;
  private count!:Label;private hint!:Label;private group!:Node;private veil!:UIOpacity;
  private revealClip!:UITransform;private roomHeight=0;private revealMotion={progress:0};
  private title!:Node;private titleSweep?:UIOpacity;private entranceAlphas:UIOpacity[]=[];
  private coins:Coin[]=[];private gleams:Gleam[]=[];private treasureGlows:TreasureGlow[]=[];
  private coinEnvelope!:AwardCoinEnvelope;private titleFlare?:UIOpacity;private revealSweep?:UIOpacity;
  private wealthLights:WealthLight[]=[];
  private audioEvents?:AwardAudioEvents;private done?:()=>void;private restoreScene?:()=>void;private reduced=false;

  public setup(art:SalonArt,amount:number,height:number,reduced:boolean,multiplier=20,theme=0,welcomeBonus=false,restoreScene?:()=>void,audioEvents?:AwardAudioEvents):Promise<void>{
    this.audioEvents=audioEvents;this.amount=amount;this.reduced=reduced;this.restoreScene=restoreScene;this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=AWARD_COUNT_SECONDS[this.tier];this.holdUntil=this.countDuration+AWARD_HOLD_SECONDS;
    const layout=awardStageLayout(theme,height);
    this.coinEnvelope={scale:layout.scale,baseY:layout.point(512,842).y,
      floor:layout.amount.y+layout.amountHeight/2+24,ceiling:layout.captionY-110};
    // Reveal the room from its crown down to the treasure floor. Each visible
    // part is opaque, so two sets of architecture and lettering never overlap.
    const aperture=box(this.node,'Treasury reveal aperture',0,height/2,1080,height);
    this.revealClip=aperture.getComponent(UITransform)!;
    this.revealClip.setAnchorPoint(.5,1);
    aperture.addComponent(Mask).type=Mask.Type.GRAPHICS_RECT;
    this.roomHeight=height;
    this.group=box(aperture,'Wealth celebration scene',0,-height/2,1080,height);
    art.cover(this.group,layout.room.name,0,0,1080,height);
    this.veil=opacity(this.group,255);
    this.setReveal(reduced?1:0);
    const lighting=box(this.group,'Treasure material reflections',0,0,1080,height);
    for(const [i,[x,y]] of layout.room.jewels.entries()){
      const p=layout.point(x,y),n=art.light(lighting,3,p.x,p.y,95,95,0);
      n.name='Painted jewel reflection';this.gleams.push({node:n,alpha:n.getComponent(UIOpacity)!,phase:i*1.17,peak:185});
      // Broad light follows an existing jewel, while pin highlights stay local.
      // The soft optic image provides its own falloff, with no screen flash.
      const bloom=art.light(lighting,i===0?0:1,p.x,p.y,i===0?330:190,i===0?330:190,0);
      bloom.name='Treasure coronation glow';
      this.treasureGlows.push({node:bloom,alpha:bloom.getComponent(UIOpacity)!,base:i===0?1:.66,phase:i*.18});
    }
    // Warm optical fans belong to the room's two treasure sources. They sit
    // behind the physical coins and all lettering, rather than flashing white.
    const sourceY=Math.max(this.coinEnvelope.baseY,this.coinEnvelope.floor+100);
    if(!reduced)for(const side of [-1,1]){
      const fan=art.light(lighting,1,side*330,sourceY+260,310,830,0);
      fan.name='Treasure source light fan';fan.angle=side*28;
      this.wealthLights.push({node:fan,alpha:fan.getComponent(UIOpacity)!,side,pool:false,phase:side*.22});
      const pool=art.light(lighting,0,side*260,sourceY-20,400,150,0);
      pool.name='Gold fountain source reflection';
      this.wealthLights.push({node:pool,alpha:pool.getComponent(UIOpacity)!,side,pool:true,phase:side*.18});
    }
    const stream=box(this.group,'Treasure coin fountain',0,0,1080,height);
    if(!reduced){
      const choreography=AWARD_CHOREOGRAPHY[this.tier];
      for(const [burst,wave,total] of [[false,0,choreography.stream],[true,0,choreography.burst],[true,1,choreography.encore]] as const){
        for(let i=0;i<total;i++){
          const spec=awardCoinSpec(i,burst,wave);
          const n=art.image(stream,'award-coin-flight',0,0,spec.pixels,spec.pixels);
          n.name=burst?wave?'Encore treasure coin':'Coronation coin':'Fountain coin';
          const coin:Coin={...spec,node:n,alpha:opacity(n,0)};
          if(i%8===0){
            const glint=art.light(stream,3,0,0,48,48,0);glint.name='Flying gold material glint';
            coin.glint=glint;coin.glintAlpha=glint.getComponent(UIOpacity)!;
          }
          this.coins.push(coin);
        }
      }
    }
    // The painted number plaque catches the reveal on its gold shoulders.
    // The light never travels through the amount or changes its scale.
    if(!reduced)for(const side of [-1,1]){
      const n=art.light(lighting,3,side*(layout.amountWidth/2+4),layout.amount.y,110,110,0);
      n.name='Payout gold rim highlight';
      this.gleams.push({node:n,alpha:n.getComponent(UIOpacity)!,phase:side>0?.28:0,peak:115});
    }
    const titleName='award-title-'+['big','super','mega','epic'][this.tier];
    this.title=art.image(this.group,titleName,0,Math.round(layout.titleY),layout.titleWidth,layout.titleHeight);
    this.title.name='Award artistic title';
    // Alpha-stencilled reflection follows the sculpted letters, not a rectangle.
    const titleSize=this.title.getComponent(UITransform)!;
    const inlay=box(this.title,'Gold lettering reflection',0,0,titleSize.width,titleSize.height);
    const mask=inlay.addComponent(Mask);mask.type=Mask.Type.SPRITE_STENCIL;
    const stencil=inlay.getComponent(Sprite)!;stencil.sizeMode=Sprite.SizeMode.CUSTOM;stencil.spriteFrame=art.frame(titleName);
    inlay.getComponent(UITransform)!.setContentSize(titleSize.width,titleSize.height);mask.alphaThreshold=.18;
    const sweep=art.light(inlay,2,-titleSize.width/2,0,180,titleSize.height*1.2,0);
    sweep.angle=-16;this.titleSweep=sweep.getComponent(UIOpacity)!;
    const flare=art.light(inlay,0,0,0,titleSize.width,titleSize.width,0);
    flare.name='Coronation lettering glow';this.titleFlare=flare.getComponent(UIOpacity)!;
    const revealSweep=art.light(inlay,1,-titleSize.width*.8,0,250,380,0);
    revealSweep.name='Reveal lettering sweep';this.revealSweep=revealSweep.getComponent(UIOpacity)!;
    const caption=outlined(text(this.group,celebrationCaption(multiplier,welcomeBonus),0,Math.round(layout.captionY),940,94,47,'#FFF8E6',true),'#50321D',2);
    caption.enableWrapText=true;caption.overflow=Label.Overflow.SHRINK;
    // Coordinates are measured on each room's real enamel number plinth.
    const plate=box(this.group,'Painted payout plinth',layout.amount.x,layout.amount.y,layout.amountWidth,layout.amountHeight);
    const label=outlined(text(plate,'Total return',0,layout.amountHeight*.27,layout.amountWidth*.92,48,35,'#654224',true),'#FFF8E8',1);
    label.enableWrapText=false;
    this.count=outlined(text(plate,'0',0,-layout.amountHeight*.09,layout.amountWidth*.94,layout.amountHeight*.65,100,'#462A15',true),'#FFF8E8',1.5);
    this.count.enableWrapText=false;this.count.overflow=Label.Overflow.SHRINK;
    this.hint=outlined(text(this.group,'Tap once to reveal · Tap again to continue',0,Math.round(layout.hintY),960,105,43,'#50331B',true),'#FFF3DB',2.5);
    this.hint.enableWrapText=true;this.hint.overflow=Label.Overflow.SHRINK;
    const collect=art.button(this.group,'Collect your treasure',0,Math.round(layout.collectY),730,118,'Collect treasure',undefined,()=>this.advance(),theme);
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    if(reduced){this.reveal();}
    else{
      tween(this.revealMotion).to(AWARD_ENTER_SECONDS,{progress:1},{easing:'sineInOut',onUpdate:()=>this.setReveal(this.revealMotion.progress)}).call(()=>this.setReveal(1)).start();
      // Reveal details in the room's depth order. Their authored positions and
      // sizes remain fixed; only the material reflection moves across letters.
      this.fadeIn(this.title,.28,.60);
      this.fadeIn(caption.node,.50,.38);
      this.fadeIn(plate,.60,.36);
      this.fadeIn(this.hint.node,.82,.34);
      this.fadeIn(collect,.82,.34);
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);
    return new Promise(resolve=>{this.done=resolve;});
  }
  private fadeIn(node:Node,delay:number,duration:number):void{
    const alpha=opacity(node,0);this.entranceAlphas.push(alpha);
    tween(alpha).delay(delay).to(duration,{opacity:255},{easing:'sineInOut'}).start();
  }
  private reveal():void{
    if(this.revealed)return;
    this.revealed=true;this.resolvedAt=this.elapsed;
    // Revealing the amount must not jump the room's visual clock. Coins and
    // reflections continue from exactly where the player tapped.
    this.holdUntil=this.elapsed+AWARD_HOLD_SECONDS;
    this.audioEvents?.reveal();
    this.count.string=tr(formatWinAmount(this.amount));
    this.hint.string=tr('Added to your wallet · Tap to continue');
  }
  private advance():void{
    if(this.finished)return;
    if(!this.revealed){this.reveal();return;}
    this.finished=true;this.audioEvents?.exit(this.reduced?.01:AWARD_EXIT_SECONDS);this.restoreScene?.();this.restoreScene=undefined;
    Tween.stopAllByTarget(this.revealMotion);
    for(const alpha of [this.veil,...this.entranceAlphas])Tween.stopAllByTarget(alpha);
    tween(this.revealMotion).to(this.reduced?.01:AWARD_EXIT_SECONDS,{progress:0},{easing:'sineInOut',onUpdate:()=>this.setReveal(this.revealMotion.progress)}).call(()=>{this.setReveal(0);this.done?.();this.done=undefined;}).start();
  }
  private setReveal(progress:number):void{
    this.revealMotion.progress=Math.max(0,Math.min(1,progress));
    this.revealClip.setContentSize(1080,Math.max(.01,this.roomHeight*this.revealMotion.progress));
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
        const fanTurn=28+Math.sin(this.elapsed*1.05+g.phase)*8+crest*8;
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
    this.restoreScene?.();this.restoreScene=undefined;
    this.node.off(Node.EventType.TOUCH_END,this.advance,this);
    Tween.stopAllByTarget(this.revealMotion);
    for(const n of [this.title,this.count?.node])if(n)Tween.stopAllByTarget(n);
    // Children are destroyed before this component. Keep tween targets captured
    // during setup; querying a destroyed child interrupts Cocos deferred cleanup.
    for(const a of [this.veil,...this.entranceAlphas,...this.gleams.map(g=>g.alpha)])if(a)Tween.stopAllByTarget(a);
    this.done?.();this.done=undefined;
  }
}
