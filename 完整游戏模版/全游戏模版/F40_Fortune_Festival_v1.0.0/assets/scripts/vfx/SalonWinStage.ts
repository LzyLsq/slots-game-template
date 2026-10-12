import {AWARD_COUNT_SECONDS, AWARD_HOLD_SECONDS, AWARD_EXIT_SECONDS, AWARD_COUNT_START, AWARD_ENTER_SECONDS, AWARD_REVEAL_IMPACTS, AwardAudioEvents} from './AwardTiming';
import {AwardDigits} from './AwardDigits';
import {celebrationCaption, winTier} from './WinPresentation';
import {tr} from '../ui/Language';
import {_decorator, Color, Component, EventTouch, gfx, Graphics, Label, Mask, Node, Sprite, tween, Tween, UIOpacity, UITransform} from 'cc';
import {SalonArt, featheredReadingShade, bindPress, box, opacity, outlined, text} from '../ui/SalonArt';
import {awardStageLayout, AwardStagePlacement} from './AwardStageLayout';
import {AWARD_CHOREOGRAPHY, AwardCoinEnvelope, AwardCoinSpec, awardCoinSpec, awardCoinFrame, awardAccentEnvelope, awardCountProgress, awardVisibleTier} from './AwardChoreography';
const {ccclass}=_decorator;
const imagePointForTitle=(layout:ReturnType<typeof awardStageLayout>):number=>730-layout.geometry.title[1]-layout.geometry.title[3]/2;
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});
interface Coin extends AwardCoinSpec {node:Node;alpha:UIOpacity;glint?:Node;glintAlpha?:UIOpacity;}
interface WealthLight {node:Node;alpha:UIOpacity;side:number;pool:boolean;phase:number;}
interface Gleam {node:Node;alpha:UIOpacity;phase:number;peak:number;}
interface TreasureGlow {node:Node;alpha:UIOpacity;base:number;phase:number;}
interface AwardScene {room?:Node;response?:(energy:number)=>void;}
interface FestivalPlume {node:Node;alpha:UIOpacity;sprite:Sprite;side:number;wave:number;}
interface FestivalFirework {node:Node;alpha:UIOpacity;at:number;life:number;size:number;peak:number;angle:number;}
interface AwardTitle {node:Node;alpha:UIOpacity;sweep:UIOpacity;flare:UIOpacity;revealSweep:UIOpacity;}

/** A celebration layer in the live cabinet's exact coordinate plane. The
 * paid reel result, animal, architecture and meters remain on screen throughout.
 * Tap to reveal, then continue; presentation never modifies the settled wallet. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private countDuration=3;private holdUntil=5.5;private tier=0;private revealed=false;
  private amount=0;private elapsed=0;private resolvedAt=-1;private lastTick=-1;private finished=false;
  private digits!:AwardDigits;private count!:Label;private hint!:Label;private hintMaterial!:Node;private group!:Node;private veil!:UIOpacity;
  private revealMotion={progress:0};private exitMotion={progress:0};
  private title!:Node;private titles:AwardTitle[]=[];private shownTier=0;private accentAt=-1;private multiplier=0;private welcomeBonus=false;
  private caption!:Label;private payoutGlow?:UIOpacity;private crownGlow?:UIOpacity;private walletGlow?:UIOpacity;
  private entranceAlphas:UIOpacity[]=[];
  private fireworks:FestivalFirework[]=[];private fireworkHost?:Node;private fireworkVeil?:UIOpacity;private scene?:AwardScene;
  private accentCoins:Coin[]=[];
  private rays?:{node:Node;alpha:UIOpacity;sprite:Sprite};private plumes:FestivalPlume[]=[];
  private coins:Coin[]=[];private gleams:Gleam[]=[];private treasureGlows:TreasureGlow[]=[];
  private coinEnvelope!:AwardCoinEnvelope;
  private wealthLights:WealthLight[]=[];
  private walletCoins:{node:Node;alpha:UIOpacity;phase:number}[]=[];
  private layout!:ReturnType<typeof awardStageLayout>;
  private audioEvents?:AwardAudioEvents;private done?:()=>void;private restoreScene?:()=>void;private reduced=false;

  public setup(art:SalonArt,amount:number,height:number,reduced:boolean,multiplier=20,theme=0,welcomeBonus=false,restoreScene?:()=>void,audioEvents?:AwardAudioEvents,placement?:AwardStagePlacement,scene?:AwardScene):Promise<void>{
    this.scene=scene;this.audioEvents=audioEvents;this.amount=amount;this.multiplier=multiplier;this.welcomeBonus=welcomeBonus;this.reduced=reduced;this.restoreScene=restoreScene;this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=AWARD_COUNT_SECONDS[this.tier];this.holdUntil=this.countDuration+AWARD_HOLD_SECONDS;
    const layout=this.layout=awardStageLayout(theme,height,1080,placement);
    this.coinEnvelope=layout.coins;
    this.group=box(this.node,'Cabinet celebration layer',0,layout.y,832,1460);
    this.group.setScale(layout.scale,layout.scale,1);
    this.veil=opacity(this.group,reduced?255:0);
    if(!reduced){
      // This room child renders beneath the existing articulated guardian,
      // reels and controls, so bursts belong to the cabinet's real space.
      this.fireworkHost=box(scene?.room??this.group,'Festival fireworks behind guardian',0,scene?.room?-28:0,1024,1536);
      this.fireworkHost.setSiblingIndex(0);this.fireworkVeil=opacity(this.fireworkHost,0);
      for(let i=0;i<16;i++){
        const n=art.image(this.fireworkHost,'festival-firework-v1',0,0,512,512);
        // Emissive trails add light to the painted room instead of tinting it
        // brown as an ordinary translucent surface would.
        n.getComponent(Sprite)!.getMaterialInstance(0)?.overridePipelineStates({blendState:{targets:[{blend:true,blendSrc:gfx.BlendFactor.SRC_ALPHA,blendDst:gfx.BlendFactor.ONE,blendSrcAlpha:gfx.BlendFactor.ZERO,blendDstAlpha:gfx.BlendFactor.ONE}]}});
        this.fireworks.push({node:n,alpha:opacity(n,0),at:Infinity,life:1.45,size:400,peak:215,angle:0});
      }
    }
    if(!reduced){
      const rays=art.image(this.group,'festival-gold-rays-v2',layout.screen.x,layout.amount.y+200,850,590);
      rays.name='Festival treasury light curtain';
      const sprite=rays.getComponent(Sprite)!;this.emissive(sprite);sprite.type=Sprite.Type.FILLED;sprite.fillType=Sprite.FillType.VERTICAL;sprite.fillStart=0;sprite.fillRange=0;
      this.rays={node:rays,alpha:opacity(rays,0),sprite};
      // Gold fountains open behind the articulated guardian and main prize art.
      // Their authored silhouette stays fixed: an upward reveal supplies the motion.
      for(const side of [-1,1])for(let wave=0;wave<2;wave++){
        const plume=art.image(this.fireworkHost!,'festival-spark-plume-v2',side*(350+wave*65),635+wave*65,320-wave*34,480-wave*52);
        plume.name='Crown ledge festival fountain';
        const paint=plume.getComponent(Sprite)!;this.emissive(paint);paint.type=Sprite.Type.FILLED;paint.fillType=Sprite.FillType.VERTICAL;paint.fillStart=0;paint.fillRange=0;
        this.plumes.push({node:plume,alpha:opacity(plume,0),sprite:paint,side,wave});
      }
    }
    // A feathered glass reflection stays inside the real aperture. The outer
    // result columns remain visible; there is no opaque room or page-sized veil.
    const upper=layout.screen.y+layout.screen.height/2-4,lower=layout.screen.y-layout.screen.height/2+4;
    const shade=box(this.group,'Award reading reflection',layout.screen.x,(upper+lower)/2,layout.amountWidth+18,upper-lower);
    const glass=shade.addComponent(Graphics);
    featheredReadingShade(glass,layout.amountWidth+18,upper-lower,
      [[46,20,11],[9,30,25],[25,27,45],[38,21,12]][layout.theme] as [number,number,number],92);
    const lighting=box(this.group,'Original cabinet gold reflections',0,0,832,1460);
    const payoutGlow=art.light(lighting,0,layout.amount.x,layout.amount.y,layout.amountWidth+40,220,0);
    payoutGlow.name='Payout warm reflection';this.payoutGlow=payoutGlow.getComponent(UIOpacity)!;
    const crownGlow=art.light(lighting,0,0,imagePointForTitle(layout)+190,480,164,0);
    crownGlow.name='Guardian treasure reflection';this.crownGlow=crownGlow.getComponent(UIOpacity)!;
    for(const [i,[x,y]] of layout.jewels.entries()){
      const n=art.light(lighting,3,x,y,58,58,0);n.name='Cabinet gilding coronation reflection';
      this.gleams.push({node:n,alpha:n.getComponent(UIOpacity)!,phase:i*.41,peak:115});
      const bloom=art.light(lighting,0,x,y,180,150,0);bloom.name='Original treasure shelf bloom';
      this.treasureGlows.push({node:bloom,alpha:bloom.getComponent(UIOpacity)!,base:.5,phase:i*.18});
    }
    if(!reduced)for(const side of [-1,1]){
      const pool=art.light(lighting,0,side*270,layout.coins.baseY,310,110,0);
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
    if(!reduced)for(let i=0;i<14+this.tier*2;i++){
      const spec=awardCoinSpec(i,true),n=art.image(stream,'award-coin-flight',0,0,spec.pixels,spec.pixels);
      n.name='Prize upgrade treasury coin';this.accentCoins.push({...spec,node:n,alpha:opacity(n,0)});
    }
    this.title=box(this.group,'Award artistic title',layout.screen.x,Math.round(layout.titleY),layout.titleWidth,layout.titleHeight);
    // Each title keeps its original painted aspect. Upgrades are a short
    // crossfade on the same cabinet mount, never a separate screen or sticker.
    for(let tier=0;tier<=this.tier;tier++){
      const titleName='award-title-'+['big','super','mega','epic'][tier];
      const root=box(this.title,'Award title tier '+tier,0,0,layout.titleWidth,layout.titleHeight);
      const paint=art.image(root,titleName,0,0,layout.titleWidth,layout.titleHeight);
      const size=paint.getComponent(UITransform)!;
      const inlay=box(root,'Gold lettering reflection',0,0,size.width,size.height);
      const mask=inlay.addComponent(Mask);mask.type=Mask.Type.SPRITE_STENCIL;
      const stencil=inlay.getComponent(Sprite)!;stencil.sizeMode=Sprite.SizeMode.CUSTOM;stencil.spriteFrame=art.frame(titleName);
      inlay.getComponent(UITransform)!.setContentSize(size.width,size.height);mask.alphaThreshold=.18;
      const sweep=art.light(inlay,2,-size.width/2,0,92,size.height*1.2,0);sweep.angle=-16;
      const flare=art.light(inlay,0,0,0,size.width,size.height,0);
      const revealSweep=art.light(inlay,1,-size.width*.8,0,115,size.height*1.3,0);
      this.titles.push({node:root,alpha:opacity(root,tier===0?255:0),sweep:sweep.getComponent(UIOpacity)!,flare:flare.getComponent(UIOpacity)!,revealSweep:revealSweep.getComponent(UIOpacity)!});
    }
    this.caption=outlined(text(this.group,celebrationCaption(2,welcomeBonus),layout.screen.x,Math.round(layout.captionY),layout.screen.width*.91,44,27,'#F4DCA6',false),'#3C2B17',.8);
    this.caption.enableWrapText=true;this.caption.overflow=Label.Overflow.SHRINK;
    const plate=box(this.group,'Cabinet payout inlay',layout.amount.x,layout.amount.y,layout.amountWidth,layout.amountHeight);
    // The payout is engraved into the existing reel glass. A square ornamental
    // frame squeezed into a horizontal strip made the award look pasted on.
    // The shared feathered glass reflection supplies contrast without new art.
    const label=outlined(text(plate,'Total return',0,84,layout.amountWidth-36,36,29,'#F2D8A0',false),'#3C2B17',.8);
    label.enableWrapText=false;
    this.count=outlined(text(plate,'0',0,-20,layout.amountWidth-24,144,128,'#FFF1B3',true),'#372414',1.2);
    this.count.enableWrapText=false;this.count.overflow=Label.Overflow.SHRINK;
    this.digits=new AwardDigits(art,plate,this.count,layout.amountWidth-16,150);
    const collect=box(this.group,'Collect your treasure',layout.collectX,layout.collectY,layout.collectWidth,layout.collectHeight);
    const collectCaption=outlined(text(collect,'COLLECT',0,-2,112,58,25,'#FFF4D5',true),'#422610',2);
    collectCaption.fontFamily='Arial Black';collectCaption.enableWrapText=false;collectCaption.overflow=Label.Overflow.SHRINK;
    // The existing physical SPIN key becomes the continue key. No second
    // button image or independent popup control is placed over the console.
    bindPress(collect,collectCaption.node,()=>this.advance(),{depth:2,compression:.97,release:.18});
    collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    // Keep the continuation hint readable on the painted floor reflection.
    // This material fades on both axes and stays in the cabinet's room plane.
    this.hintMaterial=box(this.node,'Celebration floor reading reflection',0,layout.hintY,930,0);
    this.hintMaterial.addComponent(Graphics);this.syncHintMaterial(height);
    this.hint=outlined(text(this.node,'Tap once to reveal · Tap again to continue',0,layout.hintY,960,height<2050?88:108,height<2050?36:43,'#F4DFA8',false),'#49351B',1.1);
    this.hint.enableWrapText=true;this.hint.overflow=Label.Overflow.SHRINK;
    if(!reduced){
      const flight=box(this.node,'Settled coins to original wallet',0,layout.y,832,1460);flight.setScale(layout.scale,layout.scale,1);
      for(let i=0;i<9+this.tier*3;i++){const n=art.image(flight,'award-coin-flight',0,0,42+(i%3)*6,42+(i%3)*6);this.walletCoins.push({node:n,alpha:opacity(n,0),phase:i*.020});}
      const walletGlow=art.light(flight,0,layout.wallet.x,layout.wallet.y,245,100,0);walletGlow.name='Settled wallet material response';this.walletGlow=walletGlow.getComponent(UIOpacity)!;
    }
    if(reduced){this.reveal();}
    else{
      tween(this.revealMotion).to(AWARD_ENTER_SECONDS,{progress:1},{easing:'sineInOut',onUpdate:()=>this.setReveal(this.revealMotion.progress)}).call(()=>this.setReveal(1)).start();
      this.fadeIn(this.title,.08,.48);this.fadeIn(this.caption.node,.24,.38);this.fadeIn(plate,.30,.42);
      this.fadeIn(this.hintMaterial,.27,.34);this.fadeIn(this.hint.node,.27,.34);this.fadeIn(collect,.27,.34);
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
    this.syncHintMaterial(height);
  }
  private syncHintMaterial(height:number):void{
    const readingHeight=height<2050?88:108,transform=this.hintMaterial.getComponent(UITransform)!;
    if(transform.height!==readingHeight){
      transform.setContentSize(930,readingHeight);
      const tone:readonly [number,number,number]=[[69,42,26],[30,45,35],[80,45,32],[65,29,26]][this.layout.theme] as [number,number,number];
      featheredReadingShade(this.hintMaterial.getComponent(Graphics)!,930,readingHeight,tone,this.layout.theme===2?136:112);
    }
    this.hintMaterial.setPosition(0,this.layout.hintY);
  }
  private fadeIn(node:Node,delay:number,duration:number):void{
    const alpha=opacity(node,0);this.entranceAlphas.push(alpha);
    tween(alpha).delay(delay).to(duration,{opacity:255},{easing:'sineInOut'}).start();
  }
  private reveal():void{
    if(this.revealed)return;
    this.revealed=true;this.resolvedAt=this.elapsed;this.holdUntil=this.elapsed+AWARD_HOLD_SECONDS;
    this.showTier(this.tier);this.launchFireworks(true);this.audioEvents?.reveal();this.digits.set(tr(formatWinAmount(this.amount)));
    this.caption.string=tr(celebrationCaption(this.multiplier,this.welcomeBonus));
    this.hint.string=tr('Added to your wallet · Tap to continue');
  }
  private showTier(tier:number):void{
    if(tier<=this.shownTier)return;
    const before=this.titles[this.shownTier],next=this.titles[tier];
    this.shownTier=tier;
    // Final reveal owns its two volleys; a skipped count must not pile a
    // tier-up fanfare and a second coin ignition onto the final resolution.
    if(!this.revealed){this.accentAt=this.elapsed;this.launchFireworks(false);}
    this.caption.string=tr(celebrationCaption([2,10,50,100][tier],this.welcomeBonus));
    Tween.stopAllByTarget(before.alpha);Tween.stopAllByTarget(next.alpha);
    if(this.reduced){before.alpha.opacity=0;next.alpha.opacity=255;}
    else{
      tween(before.alpha).to(.22,{opacity:0},{easing:'sineInOut'}).start();
      tween(next.alpha).to(.28,{opacity:255},{easing:'sineInOut'}).start();
      if(!this.revealed)this.audioEvents?.accent?.(tier);
    }
  }
  private launchFireworks(final:boolean):void{
    if(this.reduced||!this.fireworks.length)return;
    // Two spaced reveal crests continue the same sequence. Bursts at tier
    // upgrades are smaller, allowing the final fireworks to feel earned.
    const events=final?[
      [-265,920,470,AWARD_REVEAL_IMPACTS[0]-.155,235],[285,760,520,.13,230],
      [-345,590,370,.24,200],[245,970,470,AWARD_REVEAL_IMPACTS[1]-.155,235],
      [-280,745,520,.98,230],[340,545,350,1.06,200],
    ]:[[-300,815,330,0,190],[290,950,300,.20,185]];
    const count=final?Math.min(events.length,4+this.tier):events.length;
    for(let i=0;i<count;i++){
      const [x,y,size,delay,peak]=events[i];
      const f=this.fireworks.find(f=>this.elapsed>f.at+f.life)||this.fireworks.find(f=>f.at===Infinity);
      if(!f)continue;
      f.at=this.elapsed+delay;f.life=final?1.55:1.15;f.size=size;f.peak=peak;f.angle=(i%2?1:-1)*(6+i*3);
      f.node.setPosition(x,this.scene?.room?y:this.layout.titleY+150+i*35);
      f.node.angle=f.angle;
    }
  }
  private emissive(sprite:Sprite):void{
    sprite.getMaterialInstance(0)?.overridePipelineStates({blendState:{targets:[{blend:true,blendSrc:gfx.BlendFactor.SRC_ALPHA,blendDst:gfx.BlendFactor.ONE,blendSrcAlpha:gfx.BlendFactor.ZERO,blendDstAlpha:gfx.BlendFactor.ONE}]}});
  }
  private advance():void{
    if(this.finished)return;
    if(!this.revealed){this.reveal();return;}
    this.finished=true;this.audioEvents?.exit(this.reduced?.01:AWARD_EXIT_SECONDS);
    Tween.stopAllByTarget(this.revealMotion);
    for(const alpha of this.entranceAlphas){Tween.stopAllByTarget(alpha);tween(alpha).to(this.reduced?.01:AWARD_EXIT_SECONDS,{opacity:0},{easing:'sineInOut'}).start();}
    const from=this.veil.opacity;
    tween(this.exitMotion).to(this.reduced?.01:AWARD_EXIT_SECONDS,{progress:1},{easing:'sineInOut',onUpdate:()=>{
      const progress=this.exitMotion.progress;this.veil.opacity=Math.round(from*(1-progress));if(this.fireworkVeil)this.fireworkVeil.opacity=this.veil.opacity;
      for(const coin of this.walletCoins){
        const p=Math.max(0,Math.min(1,(progress-coin.phase)/(1-coin.phase))),q=1-p;
        const start=this.layout.amount,wallet=this.layout.wallet;
        coin.node.setPosition(q*q*(start.x+coin.phase*100)+2*q*p*(wallet.x*.3)+p*p*wallet.x,q*q*start.y+2*q*p*(start.y+65)+p*p*wallet.y);
        coin.node.angle=p*180;coin.alpha.opacity=Math.round(Math.min(1,p*12,(1-p)*8)*230);
        if(this.walletGlow)this.walletGlow.opacity=Math.round(Math.sin(Math.max(0,(progress-.25)/.75)*Math.PI)*135);
      }
    }}).call(()=>{this.veil.opacity=0;if(this.fireworkVeil)this.fireworkVeil.opacity=0;this.scene?.response?.(0);this.restoreScene?.();this.restoreScene=undefined;this.done?.();this.done=undefined;}).start();
  }
  private setReveal(progress:number):void{
    this.revealMotion.progress=Math.max(0,Math.min(1,progress));
    this.veil.opacity=Math.round(this.revealMotion.progress*255);if(this.fireworkVeil)this.fireworkVeil.opacity=this.veil.opacity;
  }
  protected update(dt:number):void{
    this.elapsed+=Math.min(dt,.1);
    if(!this.reduced){
      const choreography=AWARD_CHOREOGRAPHY[this.tier];
      const resolvedAge=this.revealed?this.elapsed-this.resolvedAt:-1;
      const light=awardAccentEnvelope(this.elapsed,resolvedAge,this.tier,this.countDuration,this.accentAt<0?-1:this.elapsed-this.accentAt);
      const {crest,buildup,accent}=light;
      const tail=this.revealed?1-Math.max(0,Math.min(1,(resolvedAge-.55)/1.10)):1;
      const roomTail=.38+.62*tail;
      this.scene?.response?.(Math.min(1,.16+buildup*.30+crest*.62+accent*.42)*(this.veil.opacity/255));
      if(this.rays){
        const opening=Math.max(0,Math.min(1,(this.elapsed-.28)/1.05));
        this.rays.sprite.fillRange=opening*opening*(3-2*opening);
        this.rays.alpha.opacity=Math.round(opening*((24+buildup*22)*roomTail+crest*(74+this.tier*12)+accent*35));
      }
      for(const plume of this.plumes){
        // Separate count accents and two final volleys; no endless pasted sparkle.
        const age=this.revealed?resolvedAge-plume.wave*(AWARD_REVEAL_IMPACTS[1]-AWARD_REVEAL_IMPACTS[0])-(plume.side>0?.06:0):this.accentAt<0?-1:this.elapsed-this.accentAt-(plume.side>0?.13:0);
        const life=this.revealed?1.50:1.08;
        const active=age>=0&&age<life&&(this.revealed||plume.wave===0);
        const p=active?age/life:0;
        plume.sprite.fillRange=active?Math.min(1,p/.34):0;
        plume.alpha.opacity=active?Math.round(Math.min(1,p/.10,(1-p)/.42)*(this.revealed?205:125)):0;
      }
      for(const f of this.fireworks){
        const age=this.elapsed-f.at,p=age/f.life;
        if(p<0||p>=1){f.alpha.opacity=0;continue;}
        const expansion=1-Math.pow(1-p,3),size=f.size/512*(.28+.72*expansion);
        // Bright ignition grows into long gold trails, then settles away.
        f.alpha.opacity=Math.round(Math.min(1,p/.10,(1-p)/.65)*f.peak);
        f.node.setScale(size,size,1);f.node.angle=f.angle+p*4;
      }
      for(const c of this.accentCoins){
        const age=this.accentAt<0?-1:this.elapsed-this.accentAt-c.delay;
        const frame=awardCoinFrame(c,age,this.shownTier,this.coinEnvelope);
        c.alpha.opacity=Math.round(frame.alpha*tail);
        c.node.setPosition(frame.x,frame.y);c.node.angle=frame.angle;c.node.setScale(frame.sx,frame.sy,1);
      }
      this.title.setPosition(this.layout.screen.x,Math.round(this.layout.titleY)+light.titleLift);
      this.title.setScale(light.titleScale,light.titleScale,1);
      this.count.node.setPosition(0,-20+light.amountLift);this.digits.node.setPosition(0,-20+light.amountLift);
      if(this.payoutGlow)this.payoutGlow.opacity=Math.round(18+buildup*20+crest*62+accent*40);
      if(this.crownGlow)this.crownGlow.opacity=Math.round(14+buildup*18+crest*96+accent*58);
      this.titles.forEach((title,tier)=>{
        if(title.alpha.opacity===0)return;
        const size=title.sweep.node.parent!.getComponent(UITransform)!,w=size.width;
        const p=(Math.max(0,this.elapsed-.62)%2.4)/2.4;
        title.sweep.node.setPosition(-w*.66+p*w*1.32,0);
        title.sweep.opacity=Math.round(Math.sin(p*Math.PI)*(100+tier*20));
        title.flare.opacity=Math.round(Math.max(crest,accent)*choreography.flare*.64);
        const sweepStart=resolvedAge>=AWARD_REVEAL_IMPACTS[1]-.20?AWARD_REVEAL_IMPACTS[1]-.20:0;
        const resolve=Math.min(1,Math.max(0,(resolvedAge-sweepStart)/.40));
        title.revealSweep.node.setPosition(-w*.8+resolve*w*1.6,0);
        title.revealSweep.opacity=resolvedAge>=0?Math.round(Math.sin(resolve*Math.PI)*155):0;
      });
      this.wealthLights.forEach(g=>{
        g.alpha.opacity=Math.round((g.pool?light.poolOpacity:light.fanOpacity)*roomTail);
        const fanTurn=16+Math.sin(this.elapsed*.85+g.phase)*3+crest*3;
        g.node.angle=g.pool?0:g.side*fanTurn;
        const expand=1+crest*(g.pool?.26:.12);
        g.node.setScale(expand,expand,1);
      });
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
        const resolved=this.revealed&&since>=0?crest*235:0;
        g.alpha.opacity=Math.round(Math.max(ambient,resolved));
        const lift=resolved/235;
        g.node.setScale(1+lift*.38,1+lift*.38,1);
        g.node.angle=lift*22;
      });
      for(const c of this.coins){
        const age=c.burst?(this.revealed?resolvedAge-c.delay:-1):this.elapsed-.65-c.delay;
        const frame=awardCoinFrame(c,age,this.tier,this.coinEnvelope);
        c.alpha.opacity=Math.round(frame.alpha*(c.burst?1:tail));
        if(c.glintAlpha){
          const shine=Math.pow(Math.max(0,Math.sin(frame.progress*Math.PI)),12);
          c.glintAlpha.opacity=Math.round(c.alpha.opacity*shine*.83);
          c.glint!.setPosition(frame.x,frame.y);c.glint!.angle=frame.angle*.30;
          const scale=.7+shine*.65;c.glint!.setScale(scale,scale,1);
        }
        if(frame.alpha===0)continue;
        c.node.setPosition(frame.x,frame.y);c.node.angle=frame.angle;
        c.node.setScale(frame.sx,frame.sy,1);
      }
    }
    const tick=Math.floor(this.elapsed*30);
    if(!this.finished&&tick!==this.lastTick&&!this.revealed&&this.elapsed<this.countDuration){
      this.lastTick=tick;
      const p=awardCountProgress(this.elapsed,this.countDuration,AWARD_COUNT_START);
      const visible=Math.floor(this.amount*p);
      this.digits.set(tr(visible.toLocaleString('en-US')));
      this.showTier(awardVisibleTier(visible,this.amount/this.multiplier,this.tier));
    }
    if(!this.finished&&this.elapsed>=this.countDuration&&!this.revealed)this.reveal();
    if(!this.finished&&this.elapsed>=this.holdUntil)this.advance();
  }
  protected onDestroy():void{
    this.scene?.response?.(0);this.fireworkHost?.destroy();this.restoreScene?.();this.restoreScene=undefined;this.node.off(Node.EventType.TOUCH_END,this.advance,this);
    Tween.stopAllByTarget(this.revealMotion);Tween.stopAllByTarget(this.exitMotion);
    for(const n of [this.title,this.count?.node])if(n)Tween.stopAllByTarget(n);
    for(const a of [this.veil,...this.titles.map(t=>t.alpha),...this.entranceAlphas,...this.gleams.map(g=>g.alpha)])if(a)Tween.stopAllByTarget(a);
    this.done?.();this.done=undefined;
  }
}
