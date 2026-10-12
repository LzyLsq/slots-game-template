import {TextFit} from '../ui/TextFit';
import {celebrationCaption,winTier} from './WinPresentation';
import {language,tr} from '../ui/Language';
import {_decorator,Color,Component,EventTouch,Graphics,Label,Node,UIOpacity} from 'cc';
import {SalonArt,box,opacity,outlined,text} from '../ui/SalonArt';
import {GAME_CONFIGS,prizeArt} from '../math/GameConfigs';
import {AudioManager} from '../audio/AudioManager';
import type {AwardSoundtrack} from '../audio/AwardScore';
import {awardTiming,awardValue,awardPhase,awardFormat,smooth,clamp01,type AwardTiming} from './AwardTimeline';
import {spectacleProfile,spectaclePulse,spectacleQuiet} from './AwardSpectacle';
import {AwardSpectacleField} from './AwardSpectacleField';
import {awardProbe,clearAwardProbe,awardShowcase} from './AwardProbe';
const {ccclass}=_decorator;
interface StageLight{node:Node;alpha:UIOpacity}
/** Treasury reveal → continuous gold fountains → two-wave crescendo → clear coin register. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component{
 private showcase=false;private plan!:AwardTiming;private elapsed=0;private exitElapsed=0;private closing=false;private revealed=false;private reduced=false;private amount=0;
 private audio?:AudioManager;private done?:()=>void;private soundtrack?:AwardSoundtrack;private rear?:AwardSpectacleField;private front?:AwardSpectacleField;private locale='en-US';private lastTick=-1;
 private group!:Node;private groupAlpha!:UIOpacity;private shade!:UIOpacity;private count!:Label;private hint!:Label;
 private treasure!:Node;private title!:Node;private titleAlpha!:UIOpacity;private countPlate!:Node;
 private rays!:StageLight;private halo!:StageLight;private heart!:StageLight;private sweep!:StageLight;private crown?:StageLight;
 private beams:StageLight[]=[];private rings:StageLight[]=[];private shake=0;
 public setup(art:SalonArt,amount:number,height:number,reduced:boolean,multiplier=20,theme=0,welcomeBonus=false,audio?:AudioManager):Promise<void>{
  const tier=Math.max(1,winTier(multiplier)),profile=spectacleProfile(tier,reduced);
  this.plan=awardTiming(tier,reduced);this.amount=amount;this.reduced=reduced;this.audio=audio;this.showcase=awardShowcase();this.shake=profile.shake;
  const lang=language();this.locale=lang==='en'?'en-US':lang;
  const shade=box(this.node,'Warm scene veil',0,0,1600,height),g=shade.addComponent(Graphics);
  g.fillColor=new Color(48,27,15,205);g.rect(-800,-height/2,1600,height);g.fill();this.shade=opacity(shade,reduced?255:0);
  this.group=box(this.node,'Treasury award stage',0,0,1080,1720);const scale=Math.max(.35,Math.min(1,(height-110)/1680));this.group.setScale(scale,scale,1);
  this.groupAlpha=opacity(this.group,reduced?255:0);
  const light=(index:number,x:number,y:number,w:number,h:number,alpha=0,parent=this.group):StageLight=>{
   const node=art.light(parent,index,x,y,w,h,alpha,'award-optics');return {node,alpha:node.getComponent(UIOpacity)!};
  };
  // Existing bitmap optics use a real alpha channel and additive light blending.
  this.rays=light(0,0,100,1620,1620,reduced?68:0);this.halo=light(1,0,20,1260,1260,reduced?100:0);
  this.halo.node.setScale(1,.78,1);this.heart=light(0,0,85,850,850,reduced?52:0);
  if(tier>=2)this.crown=light(0,0,100,1860,1860,reduced?28:0);
  for(let i=0;i<profile.beams;i++)this.beams.push(light(2,0,85,1320,1320));
  // Blast rings are below the treasury and labels, not full-screen flashes.
  if(!reduced)for(let i=0;i<2;i++)this.rings.push(light(1,0,65,1110,1110));
  this.rear=new AwardSpectacleField(this.group,art,profile);
  this.treasure=art.image(this.group,prizeArt(GAME_CONFIGS[Math.max(0,Math.min(3,theme))].id),0,10,910,840);
  this.front=new AwardSpectacleField(this.group,art,profile,true);
  // Every readable surface is drawn last, above all gold and all light.
  this.title=art.image(this.group,'award-title-'+['','big','super','mega','epic'][tier],0,610,990,240);this.title.name='Sculpted bitmap award title';this.titleAlpha=opacity(this.title,reduced?255:0);
  this.sweep=light(2,-355,0,180,100,0,this.title);
  const rule=outlined(text(this.group,(tier===2?tr('SUPER BIG WIN')+' · ':'')+celebrationCaption(multiplier,welcomeBonus),0,450,920,77,44,'#FFF2D2'),'#291C10',3);rule.enableWrapText=false;
  this.countPlate=art.awardPlate(this.group,0,-420,958,344);this.countPlate.name='Award coin register';
  const unit=outlined(text(this.countPlate,'COINS',0,26,500,24,23,'#FFE4A0'),'#29180B',2);unit.enableWrapText=false;unit.node.getComponent(TextFit)!.compactLine=true;
  this.count=outlined(text(this.countPlate,'0',0,-23,500,70,68,'#FFF7E8',true),'#29180B',3);this.count.enableWrapText=false;this.count.node.getComponent(TextFit)!.compactLine=true;
  this.hint=outlined(text(this.group,'Tap to reveal the full amount',0,-632,910,62,38,'#FFF3D8'),'#29180B',3);this.hint.enableWrapText=false;
  const collect=art.button(this.group,'Collect your treasure',0,-726,720,118,'Collect treasure',1,()=>this.advance());
  collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
  this.node.on(Node.EventType.TOUCH_END,this.advance,this);
  this.soundtrack=audio?.beginAward(tier,this.plan.countEnd);
  if(reduced)this.reveal();
  awardProbe(tier,awardPhase(0,this.plan),reduced?amount:0);
  return new Promise<void>(resolve=>this.done=resolve);
 }
 private reveal():void{
  if(this.revealed)return;this.revealed=true;this.elapsed=Math.max(this.elapsed,this.plan.countEnd);this.lastTick=-1;
  this.count.string=tr(awardFormat(this.amount,this.locale));this.hint.string=tr('Added to your wallet · Tap to continue');this.soundtrack?.finish();
  awardProbe(this.plan.tier,'climax',this.amount);
 }
 private advance():void{
  if(this.closing)return;if(!this.revealed){this.reveal();return;}
  this.closing=true;this.exitElapsed=0;this.soundtrack?.stop();this.audio?.play('collect');awardProbe(this.plan.tier,'exit',this.amount);
 }
 protected update(dt:number):void{
  if(!this.plan)return;const delta=Number.isFinite(dt)?Math.max(0,Math.min(.25,dt)):0;
  if(this.closing){
   this.exitElapsed+=delta;const alpha=255*(1-smooth(this.exitElapsed/this.plan.exit));this.groupAlpha.opacity=alpha;this.shade.opacity=alpha;
   if(this.exitElapsed>=this.plan.exit)this.complete();return;
  }
  this.elapsed+=delta;this.soundtrack?.update(this.elapsed);
  if(this.elapsed>=this.plan.countEnd&&!this.revealed)this.reveal();
  // reveal() may have advanced the clock after a first tap; all layers share that new time.
  const t=this.elapsed,value=awardValue(this.amount,t,this.plan),tick=Math.floor(t*24);
  if(tick!==this.lastTick){this.lastTick=tick;this.count.string=tr(awardFormat(value,this.locale));awardProbe(this.plan.tier,this.showcase&&t>=this.plan.climaxEnd?'hold':awardPhase(t,this.plan),value,this.audio?.awardDiagnostics());}
  this.groupAlpha.opacity=this.reduced?255:255*smooth(t/.28);this.shade.opacity=this.groupAlpha.opacity;
  if(!this.reduced){
   const entrance=smooth(t/.78),reveal=smooth((t-.22)/.48),pulse=spectaclePulse(t,this.plan),calm=1-.28*spectacleQuiet(t,this.plan);
   const scale=.87+.13*entrance+.012*Math.sin(t*1.3)*entrance+.052*pulse;
   this.treasure.setScale(scale,scale,1);this.treasure.setPosition(0,10-64*(1-entrance)+Math.sin(t*1.3)*4);
   // The image title lands with a restrained overshoot; its authored width still stays on-screen.
   const titlePop=Math.sin(clamp01((t-.25)/.7)*Math.PI)*.042;
   this.titleAlpha.opacity=255*reveal;this.title.setPosition(0,610+52*(1-reveal));const titleScale=.91+.09*reveal+titlePop+.022*pulse;this.title.setScale(titleScale,titleScale,1);
   this.rays.node.angle=t*9;this.rays.alpha.opacity=78*entrance*calm+55*pulse;
   this.halo.node.angle=-t*5;this.halo.alpha.opacity=130*entrance*calm+70*pulse;
   this.heart.node.angle=-t*12;this.heart.alpha.opacity=48*entrance*calm+48*pulse;
   if(this.crown){this.crown.node.angle=-t*7;this.crown.alpha.opacity=26*entrance*calm+45*pulse;}
   for(let i=0;i<this.beams.length;i++){
    const beam=this.beams[i];beam.node.angle=-66+i*132/Math.max(1,this.beams.length-1)+Math.sin(t*.7+i)*9;
    beam.alpha.opacity=((30+18*Math.sin(t*1.4+i))*calm+50*pulse)*entrance;
   }
   for(let i=0;i<this.rings.length;i++){
    const age=t-this.plan.countEnd-i*.52,p=clamp01(age/1.15),ring=this.rings[i],size=.3+p*1.32;
    ring.node.setScale(size,size*.72,1);ring.node.angle=i*24-t*12;ring.alpha.opacity=age>=0&&age<1.15?165*Math.sin(p*Math.PI):0;
   }
   const sweep=(t%2.3)/2.3;this.sweep.node.setPosition(-355+sweep*710,0);this.sweep.alpha.opacity=65*Math.sin(sweep*Math.PI);
   this.rear?.update(t,this.plan);this.front?.update(t,this.plan);
   const numberPulse=1+.035*pulse;this.countPlate.setScale(numberPulse,numberPulse,1);
   const impactAge=t-this.plan.countEnd,impact=impactAge>=0&&impactAge<.65?Math.sin(impactAge/.65*Math.PI):0;
   // Shake only the treasury scenery: the title, exact amount and collect stay stable.
   this.treasure.setPosition(Math.sin(impactAge*39)*this.shake*impact,this.treasure.position.y+Math.sin(impactAge*31)*this.shake*.6*impact);
  }
  if(t>=this.plan.end&&!this.showcase)this.advance();
 }
 private complete():void{const done=this.done;this.done=undefined;this.soundtrack?.stop();done?.();}
 protected onDestroy():void{this.node.off(Node.EventType.TOUCH_END,this.advance,this);this.rear?.destroy();this.front?.destroy();clearAwardProbe();this.complete();}
}
