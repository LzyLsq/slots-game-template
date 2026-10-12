import {rewardInk,rewardOutline,rewardTextWidth} from '../ui/RewardArtwork';
import type { WinSoundCue } from '../audio/AudioManager';
import {tierCaption, winTier} from './WinPresentation';
import {tr} from '../ui/Language';
import { _decorator, Color, Component, EventTouch, Graphics, Label, Node, tween, UIOpacity, Vec3 } from 'cc';
import { SalonArt, box, opacity, outlined, text } from '../ui/SalonArt';
import { GAME_CONFIGS, prizeArt } from '../math/GameConfigs';
import { goldTreasureMote, SalonAtmosphere } from './SalonAtmosphere';
const { ccclass } = _decorator;
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});
interface OrbitTreasure {n:Node;phase:number;rx:number;ry:number;}
interface Pulse {n:Node;alpha:UIOpacity;phase:number;}
const fillPolygon=(g:Graphics,points:readonly [number,number][]):void=>{g.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)g.lineTo(points[i][0],points[i][1]);g.close();g.fill();};
const stageColors=(theme:number):{velvet:Color;deep:Color;jewel:Color;gold:Color;light:Color}=>[
  {velvet:new Color(102,18,23,235),deep:new Color(34,8,12,238),jewel:new Color(172,32,39,255),gold:new Color(246,184,61,255),light:new Color(255,238,166,255)},
  {velvet:new Color(81,22,34,235),deep:new Color(28,9,18,238),jewel:new Color(154,42,64,255),gold:new Color(244,191,74,255),light:new Color(255,239,174,255)},
  {velvet:new Color(118,17,20,235),deep:new Color(40,7,10,238),jewel:new Color(191,36,32,255),gold:new Color(250,189,55,255),light:new Color(255,235,150,255)},
  {velvet:new Color(24,28,67,238),deep:new Color(7,10,31,242),jewel:new Color(44,56,126,255),gold:new Color(243,188,66,255),light:new Color(255,237,159,255)}
][Math.max(0,Math.min(3,theme))];
function stageArchitecture(parent:Node,theme:number):Node{
  const n=box(parent,'Integrated gilded jackpot theatre',0,0,1200,1260),g=n.addComponent(Graphics),p=stageColors(theme);
  // Deep side curtains blend the full-bleed illustration into the cabinet instead of framing a square card.
  g.fillColor=new Color(p.deep.r,p.deep.g,p.deep.b,80);g.rect(-600,-620,92,1240);g.fill();g.rect(508,-620,92,1240);g.fill();
  for(const side of [-1,1]){
    const x=side*514;
    g.fillColor=new Color(25,8,9,185);g.roundRect(x-34,-470,68,905,28);g.fill();
    g.fillColor=p.gold;g.roundRect(x-25,-455,50,875,23);g.fill();
    g.fillColor=p.velvet;g.roundRect(x-17,-442,34,849,16);g.fill();
    g.fillColor=p.light;g.rect(x-side*7,-420,side*5,795);g.fill();
    g.fillColor=p.gold;g.circle(x,438,48);g.fill();g.circle(x,-478,54);g.fill();
    g.fillColor=p.jewel;g.circle(x,438,33);g.fill();g.circle(x,-478,38);g.fill();
    g.fillColor=p.light;g.circle(x-side*8,448,8);g.fill();g.circle(x-side*10,-466,9);g.fill();
  }
  // Open arch and footlights read as a stage/cabinet structure, not a rectangular picture border.
  g.strokeColor=new Color(38,9,10,210);g.lineWidth=38;g.moveTo(-516,405);g.bezierCurveTo(-470,650,-260,747,0,747);g.bezierCurveTo(260,747,470,650,516,405);g.stroke();
  g.strokeColor=p.gold;g.lineWidth=22;g.moveTo(-514,407);g.bezierCurveTo(-466,632,-252,726,0,726);g.bezierCurveTo(252,726,466,632,514,407);g.stroke();
  g.strokeColor=p.light;g.lineWidth=4;g.moveTo(-505,414);g.bezierCurveTo(-452,615,-245,706,0,706);g.bezierCurveTo(245,706,452,615,505,414);g.stroke();
  g.fillColor=new Color(24,8,10,205);fillPolygon(g,[[-560,-535],[-490,-470],[490,-470],[560,-535],[470,-604],[-470,-604]]);
  g.fillColor=p.gold;fillPolygon(g,[[-560,-535],[-492,-481],[492,-481],[560,-535],[540,-554],[-540,-554]]);
  g.fillColor=p.velvet;fillPolygon(g,[[-515,-522],[-462,-489],[462,-489],[515,-522],[456,-574],[-456,-574]]);
  g.strokeColor=p.light;g.lineWidth=3;g.moveTo(-430,-550);g.lineTo(430,-550);g.stroke();
  for(let i=-5;i<=5;i++){g.fillColor=i%2?p.gold:p.light;g.circle(i*78,-535,i%2?7:5);g.fill();}
  return n;
}
function crownTitle(art:SalonArt,parent:Node,theme:number,tier:number,name:string):{root:Node;title:Label}{
  const root=art.rewardPanel(parent,0,680,1040,220,theme,'title');
  const title=outlined(text(root,['BIG WIN','MEGA WIN','EPIC WIN'][tier],0,22,rewardTextWidth(1040),92,76,rewardInk(theme),true),rewardOutline(theme),1);title.enableWrapText=false;
  const subtitle=text(root,name,0,-46,rewardTextWidth(1040),42,26,rewardInk(theme));subtitle.enableWrapText=false;return {root,title};
}
function ruleRibbon(art:SalonArt,parent:Node,theme:number,value:string):Node{
  const root=art.rewardPanel(parent,0,493,930,110,theme,'detail');const copy=text(root,value,0,0,rewardTextWidth(930),54,25,rewardInk(theme));copy.enableWrapText=false;return root;
}
function amountMeter(art:SalonArt,parent:Node,theme:number):{root:Node;count:Label;glints:UIOpacity[]}{
  const root=art.rewardPanel(parent,0,-485,980,230,theme,'amount');const count=outlined(text(root,'0',0,0,rewardTextWidth(980),118,88,rewardInk(theme)),rewardOutline(theme),1);count.enableWrapText=false;return {root,count,glints:[]};
}
/** A staged, skippable celebration. Settlement always happens before entry. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private theme=0;private orbit:OrbitTreasure[]=[];private pulses:Pulse[]=[];private finale:UIOpacity[]=[];private shadeAlpha!:UIOpacity;
  private countDuration=3.3;private holdUntil=5.5;private tier=0;private revealed=false;private amount=0;private elapsed=0;private lastTick=-1;private finished=false;private impact=0;
  private count!:Label;private hint!:Label;private group!:Node;private veil!:UIOpacity;private rays!:Node;private halo!:Node;private sweep!:Node;private stage!:Node;private titleRoot!:Node;private ruleRoot!:Node;private meterRoot!:Node;private done?:()=>void;private reduced=false;
  private onSound?:(cue:WinSoundCue,progress:number)=>void;
  public setup(art:SalonArt, amount:number, height:number, reduced:boolean,multiplier=20,theme=0,onSound?:(cue:WinSoundCue,progress:number)=>void):Promise<void> {
    this.onSound=onSound;this.theme=Math.max(0,Math.min(3,theme));this.amount=amount;this.reduced=reduced;this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=[3.3,4.1,4.9][this.tier];this.holdUntil=this.countDuration+2.2;
    const shade=box(this.node,'Warm celebration veil',0,0,1600,height),dim=shade.addComponent(Graphics);dim.fillColor=new Color(37,12,13,180);dim.rect(-800,-height/2,1600,height);dim.fill();this.shadeAlpha=opacity(shade,255);
    this.group=box(this.node,'Celebration choreography',0,0,1080,1920);const scale=Math.min(1,(height-180)/1720);this.group.setScale(scale,scale,1);
    this.rays=art.light(this.group,0,0,150,1510,1510,112);this.halo=art.light(this.group,1,0,120,1320,1320,146);
    for(let i=0;i<this.tier+2;i++){const n=art.light(this.group,1,0,65,810,810,0);n.name='Jackpot expanding gold shockwave';this.pulses.push({n,alpha:n.getComponent(UIOpacity)!,phase:i/(this.tier+2)});}
    const stream=box(this.group,'Layered coin and treasure fountain',0,0,1080,1720).addComponent(SalonAtmosphere);stream.setup(art,1080,1720,true,[52,70,88][this.tier]);stream.reducedMotion=reduced;

    // The square source art is used as a full-bleed environment. Gilded architecture and soft edge shading
    // merge it with the cabinet, instead of presenting it as a floating rectangular card.
    this.stage=box(this.group,'Full bleed jackpot environment',0,20,1200,1320);
    art.image(this.stage,prizeArt(GAME_CONFIGS[this.theme].id),0,0,1200,1200);
    const blend=box(this.stage,'Soft scenic edge blend',0,0,1200,1200).addComponent(Graphics),p=stageColors(this.theme);
    for(let i=0;i<12;i++){
      const a=Math.round(7+i*i*.42),w=18;
      blend.fillColor=new Color(p.deep.r,p.deep.g,p.deep.b,a);blend.rect(-600+i*w,-600,w,1200);blend.fill();blend.rect(582-i*w,-600,w,1200);blend.fill();
      blend.fillColor=new Color(p.deep.r,p.deep.g,p.deep.b,Math.round(a*.78));blend.rect(-600,-600+i*w,1200,w);blend.fill();blend.rect(-600,582-i*w,1200,w);blend.fill();
    }
    stageArchitecture(this.stage,this.theme);
    for(let i=0;i<16;i++){
      const phase=i/16*Math.PI*2,n=goldTreasureMote(this.group,Math.cos(phase)*492,55+Math.sin(phase)*365,44+(i%4)*7,i);
      n.name='Orbiting jackpot treasure';opacity(n,175);this.orbit.push({n,phase,rx:486+(i%3)*14,ry:340+(i%4)*14});
    }
    const heading=crownTitle(art,this.group,this.theme,this.tier,GAME_CONFIGS[this.theme].name);this.titleRoot=heading.root;
    this.ruleRoot=ruleRibbon(art,this.group,this.theme,tierCaption(multiplier));
    const meter=amountMeter(art,this.group,this.theme);this.meterRoot=meter.root;this.count=meter.count;this.finale.push(...meter.glints);
    for(let i=0;i<8;i++){const n=art.light(this.meterRoot,3,(i%2?1:-1)*(280+(i%4)*43),(i<2?1:-1)*(44+(i%4)*11),110,34,0);n.name='Jackpot meter finale glint';this.finale.push(n.getComponent(UIOpacity)!);}
    this.sweep=art.light(this.group,2,-680,674,390,480,0);this.sweep.name='Jackpot crown gold sweep';this.sweep.angle=-18;
    this.hint=outlined(text(this.group,'Tap to reveal the full amount',0,-632,890,72,35,'#FFF2D0'),'#2B0908',3);
    const collect=art.rewardButton(this.group,0,-752,730,118,'Collect treasure',this.theme,()=>this.advance());collect.on(Node.EventType.TOUCH_END,(event:EventTouch)=>{event.propagationStopped=true;});
    this.veil=opacity(this.group,0);
    if(reduced){this.veil.opacity=255;this.reveal();}
    else{
      this.stage.setScale(.82,.82,1);this.stage.setPosition(0,-2);this.titleRoot.setPosition(0,735);this.ruleRoot.setScale(.86,.86,1);this.meterRoot.setScale(.78,.78,1);
      opacity(this.titleRoot,0);opacity(this.ruleRoot,0);opacity(this.meterRoot,0);
      tween(this.veil).to(.34,{opacity:255},{easing:'sineInOut'}).start();
      tween(this.stage).to(.92,{scale:new Vec3(1,1,1),position:new Vec3(0,20,0)},{easing:'backOut'}).start();
      tween(this.titleRoot).delay(.22).to(.5,{position:new Vec3(0,680,0)},{easing:'backOut'}).start();tween(this.titleRoot.getComponent(UIOpacity)!).delay(.18).to(.34,{opacity:255}).start();
      tween(this.ruleRoot.getComponent(UIOpacity)!).delay(.46).to(.28,{opacity:255}).start();tween(this.ruleRoot).delay(.43).to(.42,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
      tween(this.meterRoot.getComponent(UIOpacity)!).delay(.56).to(.3,{opacity:255}).start();tween(this.meterRoot).delay(.52).to(.48,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);return new Promise(resolve=>{this.done=resolve;});
  }
  private reveal(manual=false):void {
    if(!this.revealed&&!this.reduced){this.impact=1;this.finale.forEach((alpha,i)=>tween(alpha).delay(i*.035).to(.1,{opacity:245}).to(.58,{opacity:0},{easing:'sineOut'}).start());tween(this.count.node).to(.08,{scale:new Vec3(.94,.94,1)},{easing:'sineOut'}).to(.25,{scale:new Vec3(1.045,1.045,1)},{easing:'backOut'}).to(.14,{scale:new Vec3(1,1,1)}).start();}
    this.revealed=true;this.onSound?.(manual?'skip':'reveal',1);this.elapsed=Math.max(this.elapsed,this.countDuration);this.count.string=tr(formatWinAmount(this.amount));this.hint.string=tr('Added to your wallet · Tap to continue');
  }
  private advance():void {
    if(this.finished)return;if(this.elapsed<this.countDuration){this.reveal(true);return;}this.onSound?.('collect',1);this.finished=true;
    tween(this.shadeAlpha).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).start();tween(this.veil).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void {
    if(this.finished)return;this.elapsed+=Math.min(dt,.1);this.impact=Math.max(0,this.impact-Math.min(dt,.1)*1.25);
    if(!this.reduced){
      this.rays.angle=this.elapsed*(7+this.tier*1.5);this.halo.angle=-this.elapsed*(4+this.tier);const burst=1+this.impact*.12;this.rays.setScale(burst,burst,1);
      this.pulses.forEach(pulse=>{const p=(this.elapsed*.28+pulse.phase)%1,scale=.42+p*1.2;pulse.n.setScale(scale,scale,1);pulse.alpha.opacity=Math.sin(Math.PI*p)*(70+this.tier*28)+this.impact*80;});
      this.orbit.forEach((coin,i)=>{const t=this.elapsed*(.31+this.tier*.065)+coin.phase,depth=.64+.36*(Math.sin(t)*.5+.5);coin.n.setPosition(Math.cos(t)*coin.rx,55+Math.sin(t)*coin.ry);coin.n.angle=this.elapsed*(48+i%3*11);coin.n.setScale(depth*(.48+.52*Math.abs(Math.cos(t*2.15))),depth,1);});
      const sweepCycle=(this.elapsed+this.tier*.22)%3.6,sweepProgress=Math.min(1,sweepCycle/1.2);this.sweep.setPosition(-680+sweepProgress*1360,674);this.sweep.getComponent(UIOpacity)!.opacity=sweepCycle<1.2?Math.sin(Math.PI*sweepProgress)*(115+this.tier*34):0;
    }
    const tick=Math.floor(this.elapsed*24);if(tick!==this.lastTick&&this.elapsed<this.countDuration){this.lastTick=tick;const p=Math.min(1,Math.max(0,(this.elapsed-.55)/(this.countDuration-.55)));this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));if(!this.reduced&&p>0&&p<1)this.onSound?.('count',p);}
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();if(this.elapsed>=this.holdUntil)this.advance();
  }
  protected onDestroy():void {this.onSound=undefined;this.done?.();this.done=undefined;}
}
