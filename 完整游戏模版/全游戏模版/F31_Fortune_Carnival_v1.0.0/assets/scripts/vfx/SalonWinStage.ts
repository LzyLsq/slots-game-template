import {winTier} from './WinPresentation';
import {tr} from '../ui/Language';
import { _decorator, Color, Component, Label, Node, Sprite, tween, UIOpacity, Vec3 } from 'cc';
import { SalonArt, box, opacity, outlined, text } from '../ui/SalonArt';
import { GAME_CONFIGS, prizeArt } from '../math/GameConfigs';
import { goldTreasureMote, SalonAtmosphere } from './SalonAtmosphere';
const { ccclass } = _decorator;
const formatWinAmount=(amount:number):string=>amount.toLocaleString('en-US',{maximumFractionDigits:3});
interface OrbitTreasure {n:Node;phase:number;rx:number;ry:number;}
interface Pulse {n:Node;alpha:UIOpacity;phase:number;}
interface VaultJet {n:Node;alpha:UIOpacity;side:number;phase:number;lane:number;}
interface FlyingTreasure {n:Node;alpha:UIOpacity;phase:number;angle:number;distance:number;depth:number;}
interface CoinRain {n:Node;alpha:UIOpacity;phase:number;x:number;depth:number;}
function crownTitle(art:SalonArt,parent:Node,tier:number,name:string):Node{
  const root=box(parent,'Raised minted jackpot lettering',0,680,1040,300);
  const asset=['treasury-win-big','treasury-win-mega','treasury-win-epic'][tier];
  // The artwork has a transparent silhouette. A displaced, dark cast gives it
  // depth in the room rather than mounting it on a rectangular UI card.
  const cast=art.image(root,asset,7,13,890,187);
  cast.getComponent(Sprite)!.color=new Color('#2B1009');opacity(cast,165);
  art.light(root,1,0,14,1020,270,52).setSiblingIndex(0);
  art.image(root,asset,0,27,890,187);
  outlined(text(root,name.toUpperCase(),0,-79,750,68,38,'#FFF1C6',true),'#2D160F',4);
  return root;
}
function amountMeter(art:SalonArt,parent:Node):{root:Node;count:Label;glints:UIOpacity[]}{
  const root=box(parent,'Treasure count reflected in the floor',0,-482,980,230);
  art.light(root,1,0,2,910,230,65);
  const shadow=text(root,'0',4,-13,765,145,112,'#3A160D',true);
  shadow.node.name='Inset depth of minted count';opacity(shadow.node,180);
  const count=outlined(text(root,'0',0,0,765,145,112,'#FFE8A3',true),'#612C10',6);
  count.enableWrapText=false;
  // Shadow mirrors the actual tally without a card or separate plaque.
  return {root,count,glints:[]};
}
/** A staged, skippable celebration. Settlement always happens before entry. */
@ccclass('SalonWinStage')
export class SalonWinStage extends Component {
  private theme=0;private orbit:OrbitTreasure[]=[];private jets:VaultJet[]=[];private flight:FlyingTreasure[]=[];private rain:CoinRain[]=[];private edgeLights:Pulse[]=[];private coreLight?:UIOpacity;private pulses:Pulse[]=[];private finale:UIOpacity[]=[];private shadeAlpha!:UIOpacity;
  private countDuration=3.3;private holdUntil=5.5;private tier=0;private revealed=false;private amount=0;private elapsed=0;private lastTick=-1;private finished=false;private impact=0;
  private onReveal?:()=>void;private count!:Label;private countShadow!:Label;private photograph!:Node;private hint!:Label;private group!:Node;private veil!:UIOpacity;private rays!:Node;private halo!:Node;private sweep!:Node;private stage!:Node;private titleRoot!:Node;private meterRoot!:Node;private done?:()=>void;private reduced=false;
  public setup(art:SalonArt, amount:number, height:number, reduced:boolean,multiplier=20,theme=0,onReveal?:()=>void):Promise<void> {
    this.theme=Math.max(0,Math.min(3,theme));this.amount=amount;this.reduced=reduced;this.onReveal=onReveal;this.tier=Math.max(0,winTier(multiplier)-1);
    this.countDuration=[3.3,4.7,5.4][this.tier];this.holdUntil=this.countDuration+(this.tier?2.7:2.2);
    // A darkened, full-bleed photographic treasury replaces the former flat runtime veil.
    const shade=box(this.node,'Photographic celebration room',0,0,1600,height);
    this.photograph=art.cover(shade,'treasury-jackpot-environment-'+GAME_CONFIGS[this.theme].id,0,0,1600,height);
    if(!reduced)this.photograph.setScale(1.14,1.14,1);
    this.shadeAlpha=opacity(shade,255);
    this.group=box(this.node,'Celebration choreography',0,0,1080,1920);const scale=Math.min(1,(height-180)/1720);this.group.setScale(scale,scale,1);
    this.rays=art.light(this.group,0,0,150,1510,1510,42);this.halo=art.light(this.group,1,0,120,1320,1320,48);
    // Asset-backed moving reflections belong to the architecture, not a flat award card.
    this.coreLight=art.light(this.group,1,0,10,1030,910,0).getComponent(UIOpacity)!;
    for(let i=0;i<8;i++){
      const side=i%2?1:-1,level=Math.floor(i/2),n=art.light(this.group,i%3?3:1,side*(310+level*58),235-level*180,145+level*28,180+level*35,0);
      n.name='Gilded vault edge chase';this.edgeLights.push({n,alpha:n.getComponent(UIOpacity)!,phase:level*.21+(side>0?.5:0)});
    }
    for(let i=0;i<this.tier+2;i++){const n=art.light(this.group,1,0,65,810,810,0);n.name='Jackpot expanding gold shockwave';this.pulses.push({n,alpha:n.getComponent(UIOpacity)!,phase:i/(this.tier+2)});}
    // The full-screen photographic backdrop is the one and only scenery layer.
    this.stage=shade;
    const stream=box(this.group,'Photographic coin fountain',0,0,1080,1720).addComponent(SalonAtmosphere);
    stream.setup(art,1080,1720,true,[52,74,84][this.tier]);stream.reducedMotion=reduced;
    if(!reduced)for(let i=0;i<16+this.tier*4;i++){
      const phase=i/(16+this.tier*4)*Math.PI*2,n=goldTreasureMote(art,this.group,Math.cos(phase)*492,55+Math.sin(phase)*365,44+(i%4)*7,i);
      n.name='Orbiting jackpot treasure';opacity(n,175);this.orbit.push({n,phase,rx:486+(i%3)*14,ry:340+(i%4)*14});
    }
    // BIG already has a genuine fountain. SUPER layers a second burst and a
    // photographed coin rain; the payout stays in a clear center lane.
    if(!reduced){
      for(let i=0;i<[14,26,34][this.tier];i++){
        const side=i%2?1:-1,lane=Math.floor(i/2)%5,phase=(Math.floor(i/2)*.173)%1;
        const n=goldTreasureMote(art,this.group,side*(510+lane*15),-370,48+(i%4)*10,i);
        const alpha=opacity(n,0);n.name='Treasury side coin fountain';this.jets.push({n,alpha,side,phase,lane});
      }
      for(let i=0;i<[24,42,54][this.tier];i++){
        const phase=(i%3)*.63+(Math.floor(i/3)%8)*.045;
        const angle=(-.92+(i*13%23)/22*1.84)*Math.PI;
        const depth=.48+(i%7)*.115,n=goldTreasureMote(art,this.group,0,-150,68+depth*58,i);
        n.name='Treasure emerging from open vault';this.flight.push({n,alpha:opacity(n,0),phase,angle,distance:320+(i%9)*53,depth});
      }
      if(this.tier>0)for(let i=0;i<(this.tier===1?22:34);i++){
        const phase=.92+(i%5)*.21,side=i%2?1:-1,x=side*(340+(i*17%170));
        const n=goldTreasureMote(art,this.group,x,900,50+(i%4)*17,i);
        n.name='Super jackpot descending coin curtain';this.rain.push({n,alpha:opacity(n,0),phase,x,depth:.7+(i%5)*.12});
      }
    }
    this.titleRoot=crownTitle(art,this.group,this.tier,GAME_CONFIGS[this.theme].name);
    const meter=amountMeter(art,this.group);this.meterRoot=meter.root;this.count=meter.count;this.countShadow=meter.root.getChildByName('Inset depth of minted count')!.getComponent(Label)!;this.finale.push(...meter.glints);
    for(let i=0;i<8;i++){const n=art.light(this.meterRoot,3,(i%2?1:-1)*(280+(i%4)*43),(i<2?1:-1)*(44+(i%4)*11),110,34,0);n.name='Jackpot meter finale glint';this.finale.push(n.getComponent(UIOpacity)!);}
    this.sweep=art.light(this.group,2,-680,674,390,480,0);this.sweep.name='Jackpot crown gold sweep';this.sweep.angle=-18;
    this.hint=outlined(text(this.group,'Tap to reveal the full amount',0,-632,940,80,44,'#FFF2D0'),'#2B0908',4);
    this.veil=opacity(this.group,0);
    if(reduced){this.veil.opacity=255;this.reveal();}
    else{
      this.shadeAlpha.opacity=0;this.titleRoot.setPosition(0,735);this.meterRoot.setScale(.78,.78,1);
      opacity(this.titleRoot,0);opacity(this.meterRoot,0);
      tween(this.veil).to(.34,{opacity:255},{easing:'sineInOut'}).start();
      tween(this.shadeAlpha).to(.62,{opacity:255},{easing:'sineOut'}).start();
      tween(this.titleRoot).delay(.22).to(.5,{position:new Vec3(0,680,0)},{easing:'backOut'}).start();tween(this.titleRoot.getComponent(UIOpacity)!).delay(.18).to(.34,{opacity:255}).start();
      tween(this.meterRoot.getComponent(UIOpacity)!).delay(.56).to(.3,{opacity:255}).start();tween(this.meterRoot).delay(.52).to(.48,{scale:new Vec3(1,1,1)},{easing:'backOut'}).start();
    }
    this.node.on(Node.EventType.TOUCH_END,this.advance,this);return new Promise(resolve=>{this.done=resolve;});
  }
  private reveal():void {
    if(!this.revealed&&!this.reduced){this.impact=1;this.finale.forEach((alpha,i)=>tween(alpha).delay(i*.035).to(.1,{opacity:245}).to(.58,{opacity:0},{easing:'sineOut'}).start());tween(this.count.node).to(.08,{scale:new Vec3(.94,.94,1)},{easing:'sineOut'}).to(.25,{scale:new Vec3(1.045,1.045,1)},{easing:'backOut'}).to(.14,{scale:new Vec3(1,1,1)}).start();}
    if(!this.revealed)this.onReveal?.();
    this.revealed=true;this.elapsed=Math.max(this.elapsed,this.countDuration);this.count.string=tr(formatWinAmount(this.amount));this.countShadow.string=this.count.string;this.hint.string=tr('Added to your wallet · Tap to continue');
  }
  private advance():void {
    if(this.finished)return;if(this.elapsed<this.countDuration){this.reveal();return;}this.finished=true;
    tween(this.shadeAlpha).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).start();tween(this.veil).to(this.reduced?.01:.36,{opacity:0},{easing:'sineInOut'}).call(()=>{this.done?.();this.done=undefined;}).start();
  }
  protected update(dt:number):void {
    if(this.finished)return;this.elapsed+=Math.min(dt,.1);this.impact=Math.max(0,this.impact-Math.min(dt,.1)*1.25);
    if(!this.reduced){
      const drift=Math.min(1,this.elapsed/this.countDuration);
      this.photograph.setPosition(Math.sin(this.elapsed*.55)*15,Math.sin(this.elapsed*.38)*16);
      const zoom=1.14-.09*drift+this.impact*.018;this.photograph.setScale(zoom,zoom,1);
      if(this.coreLight)this.coreLight.opacity=Math.round(25+Math.max(0,Math.sin(this.elapsed*4.1))*(38+this.tier*13)+this.impact*65);
      this.edgeLights.forEach(edge=>{const cycle=(this.elapsed*.62+edge.phase)%1,flash=Math.pow(Math.max(0,Math.sin(cycle*Math.PI)),7);edge.alpha.opacity=Math.round(24+flash*(122+this.tier*24)+this.impact*46);edge.n.setScale(.9+flash*.28,.9+flash*.28,1);});
      this.rays.angle=this.elapsed*(7+this.tier*1.5);this.halo.angle=-this.elapsed*(4+this.tier);const burst=1+this.impact*.12;this.rays.setScale(burst,burst,1);
      this.pulses.forEach(pulse=>{const p=(this.elapsed*.28+pulse.phase)%1,scale=.42+p*1.2;pulse.n.setScale(scale,scale,1);pulse.alpha.opacity=Math.sin(Math.PI*p)*(70+this.tier*28)+this.impact*80;});
      this.jets.forEach(jet=>{const age=this.elapsed-.30-jet.phase*2.4,cycle=((age/2.65)%1+1)%1,active=age>=0,arc=Math.sin(Math.PI*cycle);jet.n.setPosition(jet.side*(515-135*arc+jet.lane*9),-385+cycle*1040);jet.n.angle=jet.side*(cycle*210+jet.lane*27);const size=.48+arc*.70;jet.n.setScale(size,size,1);jet.alpha.opacity=active?Math.round(228*Math.min(1,cycle*8,(1-cycle)*8)):0;});
      this.flight.forEach(coin=>{
        const age=this.elapsed-.32-coin.phase,cycle=((age/2.65)%1+1)%1,active=age>=0,p=Math.min(1,cycle/.72);
        const rise=Math.sin(Math.PI*p),x=Math.sin(coin.angle)*coin.distance*p;
        coin.n.setPosition(x,-150+rise*(340+coin.depth*260)-p*p*310);
        coin.n.angle=age*(95+coin.depth*70);const size=(.35+rise*.8)*coin.depth;
        coin.n.setScale(size*(.38+.62*Math.abs(Math.cos(age*3.7))),size,1);
        coin.alpha.opacity=active?Math.round(238*Math.min(1,cycle*11,(1-cycle)*8)):0;
      });
      this.rain.forEach(coin=>{
        const age=this.elapsed-coin.phase,cycle=((age/2.4)%1+1)%1,active=age>=0;
        coin.n.setPosition(coin.x+Math.sin(age*2+coin.phase)*34,890-cycle*1670);
        coin.n.angle=age*(90+coin.depth*45);coin.n.setScale((.35+.65*Math.abs(Math.cos(age*3)))*coin.depth,coin.depth,1);
        coin.alpha.opacity=active?Math.round(195*Math.min(1,cycle*9,(1-cycle)*8)):0;
      });
      this.orbit.forEach((coin,i)=>{const t=this.elapsed*(.31+this.tier*.065)+coin.phase,depth=.64+.36*(Math.sin(t)*.5+.5);coin.n.setPosition(Math.cos(t)*coin.rx,55+Math.sin(t)*coin.ry);coin.n.angle=this.elapsed*(48+i%3*11);coin.n.setScale(depth*(.48+.52*Math.abs(Math.cos(t*2.15))),depth,1);});
      const sweepCycle=(this.elapsed+this.tier*.22)%3.6,sweepProgress=Math.min(1,sweepCycle/1.2);this.sweep.setPosition(-680+sweepProgress*1360,674);this.sweep.getComponent(UIOpacity)!.opacity=sweepCycle<1.2?Math.sin(Math.PI*sweepProgress)*(115+this.tier*34):0;
    }
    const tick=Math.floor(this.elapsed*24);if(tick!==this.lastTick&&this.elapsed<this.countDuration){this.lastTick=tick;const p=Math.min(1,Math.max(0,(this.elapsed-.55)/(this.countDuration-.55)));this.count.string=tr(Math.floor(this.amount*(1-Math.pow(1-p,2.4))).toLocaleString('en-US'));this.countShadow.string=this.count.string;}
    if(this.elapsed>=this.countDuration&&!this.revealed)this.reveal();if(this.elapsed>=this.holdUntil)this.advance();
  }
  protected onDestroy():void {this.done?.();this.done=undefined;}
}
